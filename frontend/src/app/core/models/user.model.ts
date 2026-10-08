import { ObjectId } from './api-response.model';

export type UserRole = 'customer' | 'admin';

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── Email verification ───────────────────────────────────────

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ResendVerificationPayload {
  email: string;
}

// ─── Password reset (OTP flow) ────────────────────────────────

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  resetToken: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}
