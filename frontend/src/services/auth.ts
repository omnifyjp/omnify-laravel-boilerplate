/**
 * Auth Service - Laravel Sanctum
 *
 * Handles authentication: login, logout, register, password reset
 */

import api, { csrf } from "@/lib/api";
import type { User } from "@/types/model";

// =============================================================================
// Types - Input/Request types only (Model types come from Omnify)
// =============================================================================

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ResetPasswordInput {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// =============================================================================
// Service
// =============================================================================

export const authService = {
  /**
   * Get current authenticated user
   * GET /api/user
   */
  me: async (): Promise<User> => {
    const { data } = await api.get<User>("/api/user");
    return data;
  },

  /**
   * Login with email/password
   * POST /login
   */
  login: async (input: LoginInput): Promise<void> => {
    await csrf();
    await api.post("/login", input);
  },

  /**
   * Register new user
   * POST /register
   */
  register: async (input: RegisterInput): Promise<void> => {
    await csrf();
    await api.post("/register", input);
  },

  /**
   * Logout current user
   * POST /logout
   */
  logout: async (): Promise<void> => {
    await api.post("/logout");
  },

  /**
   * Send password reset email
   * POST /forgot-password
   */
  forgotPassword: async (email: string): Promise<void> => {
    await csrf();
    await api.post("/forgot-password", { email });
  },

  /**
   * Reset password with token
   * POST /reset-password
   */
  resetPassword: async (input: ResetPasswordInput): Promise<void> => {
    await csrf();
    await api.post("/reset-password", input);
  },

  /**
   * Resend email verification
   * POST /email/verification-notification
   */
  resendVerification: async (): Promise<void> => {
    await api.post("/email/verification-notification");
  },
};
