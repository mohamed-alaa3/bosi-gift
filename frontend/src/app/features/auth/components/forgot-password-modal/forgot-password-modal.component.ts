import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of, timeout } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

const FETCH_TIMEOUT_MS = 10000;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

type Step = 'email' | 'otp' | 'password';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (!password || !confirm) return null;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, ModalComponent],
  templateUrl: './forgot-password-modal.component.html',
  styleUrl: './forgot-password-modal.component.scss',
})
export class ForgotPasswordModalComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ─── Public API ────────────────────────────────────────────
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();

  // ─── State ─────────────────────────────────────────────────
  protected readonly step = signal<Step>('email');
  protected readonly submitting = signal(false);
  protected readonly otpLength = OTP_LENGTH;

  // Track email across steps
  protected readonly emailForReset = signal('');

  // Reset token obtained after OTP verification
  private resetToken = '';

  // Resend countdown
  protected readonly resendIn = signal(0);
  private resendTimer: number | null = null;

  // OTP digits as a signal array for the input boxes
  protected readonly otpDigits = signal<string[]>(Array(OTP_LENGTH).fill(''));

  // Password visibility toggles
  protected readonly newPasswordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);

  // ─── Forms ─────────────────────────────────────────────────
  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  // ─── Derived ───────────────────────────────────────────────
  protected readonly otpValue = computed(() => this.otpDigits().join(''));
  protected readonly isOtpComplete = computed(() => this.otpDigits().every((d) => d.length === 1));
  protected readonly canResend = computed(() => this.resendIn() === 0);

  constructor() {
    // Reset everything when the modal closes
    effect(() => {
      if (!this.isOpen()) {
        this.resetAll();
      }
    });
  }

  // ─── Step 1: Email ─────────────────────────────────────────
  protected submitEmail(): void {
    if (this.emailForm.invalid || this.submitting()) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { email } = this.emailForm.getRawValue();

    this.authService
      .forgotPassword({ email })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) return;

        this.emailForReset.set(email);
        this.toast.success(this.translate.instant('toast.codeSent'));
        this.step.set('otp');
        this.startResendCountdown();
      });
  }

  // ─── Step 2: OTP ───────────────────────────────────────────
  protected onOtpInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);

    this.otpDigits.update((digits) => {
      const next = [...digits];
      next[index] = value;
      return next;
    });

    // Auto-advance
    if (value && index < OTP_LENGTH - 1) {
      const next = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      next?.focus();
    }

    // Auto-submit when complete
    if (this.isOtpComplete()) {
      this.submitOtp();
    }
  }

  protected onOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits()[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prev?.focus();
    }
  }

  protected onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    if (!digits.length) return;

    const padded = [...digits, ...Array(OTP_LENGTH - digits.length).fill('')];
    this.otpDigits.set(padded);

    const lastIndex = Math.min(digits.length, OTP_LENGTH) - 1;
    const next = document.getElementById(`otp-${lastIndex}`) as HTMLInputElement | null;
    next?.focus();

    if (this.isOtpComplete()) this.submitOtp();
  }

  protected submitOtp(): void {
    if (!this.isOtpComplete() || this.submitting()) return;

    this.submitting.set(true);
    const email = this.emailForReset();
    const otp = this.otpValue();

    this.authService
      .verifyResetOtp({ email, otp })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) {
          // Wrong code — clear digits, keep focus on first box
          this.otpDigits.set(Array(OTP_LENGTH).fill(''));
          document.getElementById('otp-0')?.focus();
          return;
        }

        this.resetToken = res.data.resetToken;
        this.step.set('password');
      });
  }

  protected resendOtp(): void {
    if (!this.canResend() || this.submitting()) return;

    const email = this.emailForReset();
    this.submitting.set(true);

    this.authService
      .forgotPassword({ email })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) return;
        this.toast.success(this.translate.instant('toast.newCodeSent'));
        this.otpDigits.set(Array(OTP_LENGTH).fill(''));
        this.startResendCountdown();
        document.getElementById('otp-0')?.focus();
      });
  }

  // ─── Step 3: New password ──────────────────────────────────
  protected submitPassword(): void {
    if (this.passwordForm.invalid || this.submitting()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { newPassword } = this.passwordForm.getRawValue();

    this.authService
      .resetPassword({ resetToken: this.resetToken, newPassword })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) return;

        this.toast.success(this.translate.instant('toast.passwordUpdatedSignIn'));
        this.close();
      });
  }

  // ─── Password toggles ──────────────────────────────────────
  protected toggleNewPassword(): void {
    this.newPasswordVisible.update((v) => !v);
  }

  protected toggleConfirmPassword(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  // ─── Resend countdown ──────────────────────────────────────
  private startResendCountdown(): void {
    this.clearResendTimer();
    this.resendIn.set(RESEND_COOLDOWN_S);
    this.resendTimer = window.setInterval(() => {
      const next = this.resendIn() - 1;
      this.resendIn.set(next);
      if (next <= 0) this.clearResendTimer();
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer !== null) {
      window.clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────
  protected close(): void {
    this.closed.emit();
  }

  protected goBackToEmail(): void {
    this.step.set('email');
  }

  private resetAll(): void {
    this.step.set('email');
    this.submitting.set(false);
    this.emailForReset.set('');
    this.resetToken = '';
    this.otpDigits.set(Array(OTP_LENGTH).fill(''));
    this.emailForm.reset();
    this.passwordForm.reset();
    this.newPasswordVisible.set(false);
    this.confirmPasswordVisible.set(false);
    this.clearResendTimer();
    this.resendIn.set(0);
  }
}
