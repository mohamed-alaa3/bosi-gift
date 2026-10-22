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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of, timeout } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CartService } from '../../../../core/services/cart.service';
import { WishlistService } from '../../../../core/services/wishlist.service';

const FETCH_TIMEOUT_MS = 10000;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

@Component({
  selector: 'app-verify-email-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ModalComponent],
  templateUrl: './verify-email-modal.component.html',
  styleUrl: './verify-email-modal.component.scss',
})
export class VerifyEmailModalComponent {
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ─── Public API ────────────────────────────────────────────
  readonly isOpen = input<boolean>(false);
  readonly email = input<string>('');

  readonly closed = output<void>();
  readonly verified = output<void>();

  // ─── State ─────────────────────────────────────────────────
  protected readonly otpLength = OTP_LENGTH;
  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly resendIn = signal(0);

  protected readonly otpDigits = signal<string[]>(Array(OTP_LENGTH).fill(''));

  private resendTimer: number | null = null;

  protected readonly otpValue = computed(() => this.otpDigits().join(''));
  protected readonly isOtpComplete = computed(() => this.otpDigits().every((d) => d.length === 1));
  protected readonly canResend = computed(() => this.resendIn() === 0);

  constructor() {
    effect(() => {
      // When the modal opens, start the cooldown timer.
      if (this.isOpen()) {
        this.startResendCountdown();
        // Focus first OTP box after a tick so the modal is rendered.
        setTimeout(() => {
          document.getElementById('verify-otp-0')?.focus();
        }, 100);
      } else {
        this.resetAll();
      }
    });
  }

  // ─── OTP input handling ────────────────────────────────────
  protected onOtpInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);

    this.otpDigits.update((digits) => {
      const next = [...digits];
      next[index] = value;
      return next;
    });

    if (value && index < OTP_LENGTH - 1) {
      const next = document.getElementById(`verify-otp-${index + 1}`) as HTMLInputElement | null;
      next?.focus();
    }

    if (this.isOtpComplete()) {
      this.submit();
    }
  }

  protected onOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits()[index] && index > 0) {
      const prev = document.getElementById(`verify-otp-${index - 1}`) as HTMLInputElement | null;
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
    const next = document.getElementById(`verify-otp-${lastIndex}`) as HTMLInputElement | null;
    next?.focus();

    if (this.isOtpComplete()) this.submit();
  }

  // ─── Actions ───────────────────────────────────────────────
  protected submit(): void {
    if (!this.isOtpComplete() || this.submitting()) return;

    const email = this.email();
    if (!email) return;

    this.submitting.set(true);

    this.authService
      .verifyEmail({ email, otp: this.otpValue() })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);

        if (!res?.success) {
          this.otpDigits.set(Array(OTP_LENGTH).fill(''));
          setTimeout(() => {
            document.getElementById('verify-otp-0')?.focus();
          }, 50);
          return;
        }

        this.toast.success(this.translate.instant('toast.emailVerified'));
        this.prefetchUserData();
        this.verified.emit();
        this.close();

        // Navigate home after a short delay so the toast is visible.
        setTimeout(() => this.router.navigateByUrl(this.safeRedirect()), 300);
      });
  }

  protected resend(): void {
    if (!this.canResend() || this.resending()) return;

    const email = this.email();
    if (!email) return;

    this.resending.set(true);

    this.authService
      .resendVerification({ email })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.resending.set(false);
        if (!res?.success) return;

       this.toast.success(this.translate.instant('toast.newCodeSent'));
        this.otpDigits.set(Array(OTP_LENGTH).fill(''));
        this.startResendCountdown();
        setTimeout(() => {
          document.getElementById('verify-otp-0')?.focus();
        }, 50);
      });
  }

  protected close(): void {
    this.closed.emit();
  }

  // ─── Helpers ───────────────────────────────────────────────
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

  private resetAll(): void {
    this.submitting.set(false);
    this.resending.set(false);
    this.otpDigits.set(Array(OTP_LENGTH).fill(''));
    this.clearResendTimer();
    this.resendIn.set(0);
  }

  /** Return URL from `?redirect=` — internal paths only (no open redirects). */
  private safeRedirect(): string {
    const r = new URLSearchParams(window.location.search).get('redirect');
    return r && r.startsWith('/') && !r.startsWith('//') ? r : '/';
  }

  private prefetchUserData(): void {
    this.cartService.get().subscribe({ error: () => {} });
    this.wishlistService.get().subscribe({ error: () => {} });
  }
}
