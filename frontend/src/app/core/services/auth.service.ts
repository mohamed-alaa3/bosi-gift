import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AuthStore } from '../stores/auth.store';
import {
  ApiSuccessResponse,
  AuthResponse,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResetPasswordPayload,
  ResetPasswordResponse,
  UpdateProfilePayload,
  User,
  VerifyEmailPayload,
  VerifyResetOtpPayload,
  VerifyResetOtpResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = inject(API_BASE_URL);
  private authStore = inject(AuthStore);

  private readonly endpoint = `${this.baseUrl}/auth`;

  /**
   * Register — creates an unverified account and sends a verification OTP.
   * No session token is stored yet.
   */
  register(payload: RegisterPayload): Observable<ApiSuccessResponse<RegisterResponse>> {
    return this.http.post<ApiSuccessResponse<RegisterResponse>>(
      `${this.endpoint}/register`,
      payload,
    );
  }

  /**
   * Verify email OTP — on success, stores the session (user + token).
   */
  verifyEmail(payload: VerifyEmailPayload): Observable<ApiSuccessResponse<AuthResponse>> {
    return this.http
      .post<ApiSuccessResponse<AuthResponse>>(`${this.endpoint}/verify-email`, payload)
      .pipe(tap((res) => this.authStore.setSession(res.data.user, res.data.token)));
  }

  /**
   * Resend the email verification OTP.
   */
  resendVerification(
    payload: ResendVerificationPayload,
  ): Observable<ApiSuccessResponse<{ message: string }>> {
    return this.http.post<ApiSuccessResponse<{ message: string }>>(
      `${this.endpoint}/resend-verification`,
      payload,
    );
  }

  login(payload: LoginPayload): Observable<ApiSuccessResponse<AuthResponse>> {
    return this.http
      .post<ApiSuccessResponse<AuthResponse>>(`${this.endpoint}/login`, payload)
      .pipe(tap((res) => this.authStore.setSession(res.data.user, res.data.token)));
  }

  me(): Observable<ApiSuccessResponse<User>> {
    return this.http
      .get<ApiSuccessResponse<User>>(`${this.endpoint}/me`)
      .pipe(tap((res) => this.authStore.updateUser(res.data)));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<ApiSuccessResponse<User>> {
    return this.http
      .patch<ApiSuccessResponse<User>>(`${this.endpoint}/me`, payload)
      .pipe(tap((res) => this.authStore.updateUser(res.data)));
  }

  changePassword(
    payload: ChangePasswordPayload,
  ): Observable<ApiSuccessResponse<{ message: string }>> {
    return this.http.patch<ApiSuccessResponse<{ message: string }>>(
      `${this.endpoint}/change-password`,
      payload,
    );
  }

  // ─── Password reset (OTP flow) ─────────────────────────────

  forgotPassword(
    payload: ForgotPasswordPayload,
  ): Observable<ApiSuccessResponse<ForgotPasswordResponse>> {
    return this.http.post<ApiSuccessResponse<ForgotPasswordResponse>>(
      `${this.endpoint}/forgot-password`,
      payload,
    );
  }

  verifyResetOtp(
    payload: VerifyResetOtpPayload,
  ): Observable<ApiSuccessResponse<VerifyResetOtpResponse>> {
    return this.http.post<ApiSuccessResponse<VerifyResetOtpResponse>>(
      `${this.endpoint}/verify-reset-otp`,
      payload,
    );
  }

  resetPassword(
    payload: ResetPasswordPayload,
  ): Observable<ApiSuccessResponse<ResetPasswordResponse>> {
    return this.http.post<ApiSuccessResponse<ResetPasswordResponse>>(
      `${this.endpoint}/reset-password`,
      payload,
    );
  }

  logout(redirectToLogin: boolean = true): void {
    this.authStore.clear();
    if (redirectToLogin) {
      this.router.navigate(['/auth/login']);
    }
  }
}
