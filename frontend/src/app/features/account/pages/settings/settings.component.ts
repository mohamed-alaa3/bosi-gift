import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, RevealOnScrollDirective],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class AccountSettingsComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private authStore = inject(AuthStore);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly user = this.authStore.user;

  // Profile form
  protected readonly profileForm = this.fb.nonNullable.group({
    name: [this.user()?.name ?? '', [Validators.required, Validators.minLength(2)]],
    phone: [this.user()?.phone ?? ''],
  });
  protected readonly savingProfile = signal(false);

  // Password form
  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });
  protected readonly savingPassword = signal(false);
  protected readonly passwordVisible = signal(false);

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    const { name, phone } = this.profileForm.getRawValue();

    this.authService
      .updateProfile({ name: name.trim(), phone: phone.trim() })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.savingProfile.set(false);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.profileUpdated'));
        }
      });
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.toast.error(this.translate.instant('toast.passwordsDoNotMatch'));
      return;
    }

    this.savingPassword.set(true);

    this.authService
      .changePassword({ currentPassword, newPassword })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.savingPassword.set(false);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.passwordUpdated'));
          this.passwordForm.reset({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
        }
      });
  }

  /**
   * Signs the user out and redirects to the login page.
   * Uses AuthService.logout() so the redirect is handled in one place.
   */
  protected signOut(): void {
    this.authService.logout();
  }

  protected get passwordsMismatch(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (!newPassword || !confirmPassword) return false;
    return newPassword !== confirmPassword;
  }
}
