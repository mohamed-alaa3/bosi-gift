import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

import { AuthPanelComponent } from './components/auth-panel/auth-panel.component';
import { VerifyEmailModalComponent } from './components/verify-email-modal/verify-email-modal.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

const FETCH_TIMEOUT_MS = 10000;

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (!password || !confirm) return null;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    AuthPanelComponent,
    VerifyEmailModalComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './register.page.html',
  styleUrl: './auth.page.scss',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  protected readonly submitting = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmVisible = signal(false);

  /** Whether the user has focused the password field at least once.
   *  Controls whether the checklist is visible. */
  protected readonly passwordFocused = signal(false);

  /** Whether the verify-email modal is open. */
  protected readonly verifyModalOpen = signal(false);

  /** The email that we just registered (for the verification modal). */
  protected readonly pendingEmail = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  // ─── Password strength checks ──────────────────────────────
  private readonly passwordValue = signal('');

  protected readonly checks = computed(() => {
    const value = this.passwordValue();
    return {
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      digit: /\d/.test(value),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(value),
    };
  });

  /** Number of passed checks (0-5). */
  protected readonly passedCount = computed(() => {
    const c = this.checks();
    return [c.length, c.uppercase, c.lowercase, c.digit, c.special].filter(Boolean).length;
  });

  /** Score 0-4 mapping to Weak / Fair / Good / Strong. */
  protected readonly strengthScore = computed(() => {
    const count = this.passedCount();
    if (count === 0) return 0;
    if (count === 1) return 1; // Weak
    if (count === 2 || count === 3) return 2; // Fair
    if (count === 4) return 3; // Good
    return 4; // Strong
  });

  protected readonly strengthLabelKey = computed(() => {
    const score = this.strengthScore();
    switch (score) {
      case 1:
        return 'auth.passwordStrength.weak';
      case 2:
        return 'auth.passwordStrength.fair';
      case 3:
        return 'auth.passwordStrength.good';
      case 4:
        return 'auth.passwordStrength.strong';
      default:
        return 'auth.passwordStrength.empty';
    }
  });

  protected readonly strengthClass = computed(() => {
    const score = this.strengthScore();
    if (score === 0) return '';
    if (score === 1) return 'is-weak';
    if (score === 2) return 'is-fair';
    if (score === 3) return 'is-good';
    return 'is-strong';
  });

  /** Whether the password meets all requirements (valid for submit). */
  protected readonly passwordIsStrong = computed(() => this.passedCount() === 5);

  constructor() {
    // Keep the local signal in sync with the form control.
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.passwordValue.set(v));
  }

  // ─── UI handlers ───────────────────────────────────────────
  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  protected toggleConfirmVisibility(): void {
    this.confirmVisible.update((v) => !v);
  }

  protected onPasswordFocus(): void {
    this.passwordFocused.set(true);
  }

  protected onPasswordBlur(): void {
    // Keep the checklist visible if the field has content.
    if (!this.passwordValue()) {
      this.passwordFocused.set(false);
    }
  }

  protected closeVerifyModal(): void {
    this.verifyModalOpen.set(false);
  }

  // ─── Submit ────────────────────────────────────────────────
  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    // Extra guard: password must pass all checks (frontend UX).
    if (!this.passwordIsStrong()) {
      this.passwordFocused.set(true);
      this.toast.error(this.translate.instant('toast.passwordRequirementsNotMet'));
      return;
    }

    this.submitting.set(true);
    const { name, email, password } = this.form.getRawValue();

    this.authService
      .register({ name, email, password })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) return;

        // Show the verify-email modal. Login happens after verification.
        this.pendingEmail.set(email);
        this.verifyModalOpen.set(true);
        this.toast.success(this.translate.instant('toast.accountCreated'));
      });
  }

  // ─── Check messages (for the checklist) ────────────────────
  protected readonly checkList = computed(() => {
    const c = this.checks();
    return [
      { key: 'length', passed: c.length, labelKey: 'auth.passwordStrength.checkLength' },
      { key: 'uppercase', passed: c.uppercase, labelKey: 'auth.passwordStrength.checkUppercase' },
      { key: 'lowercase', passed: c.lowercase, labelKey: 'auth.passwordStrength.checkLowercase' },
      { key: 'digit', passed: c.digit, labelKey: 'auth.passwordStrength.checkDigit' },
      { key: 'special', passed: c.special, labelKey: 'auth.passwordStrength.checkSpecial' },
    ];
  });
}
