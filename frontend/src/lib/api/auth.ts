import { apiClient } from './client'
import type { User } from '@/lib/stores/auth-store'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  displayName: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface OAuthCallbackData {
  code: string
  state?: string
  provider: 'google' | 'github'
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
}

export interface EmailVerificationRequest {
  token: string
}

export interface ProfileUpdateData {
  displayName?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

export const authAPI = {
  // Authentication
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', credentials)
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    return apiClient.post('/auth/register', data)
  },

  logout: async (): Promise<void> => {
    return apiClient.post('/auth/logout')
  },

  refreshToken: async (): Promise<AuthResponse> => {
    return apiClient.post('/auth/refresh')
  },

  // OAuth
  getOAuthURL: async (provider: 'google' | 'github'): Promise<{ url: string; state: string }> => {
    return apiClient.get(`/auth/oauth/${provider}`)
  },

  handleOAuthCallback: async (data: OAuthCallbackData): Promise<AuthResponse> => {
    return apiClient.post('/auth/oauth/callback', data)
  },

  // Profile management
  getProfile: async (): Promise<User> => {
    return apiClient.get('/auth/profile')
  },

  updateProfile: async (data: ProfileUpdateData): Promise<User> => {
    return apiClient.patch('/auth/profile', data)
  },

  // Password reset
  requestPasswordReset: async (data: PasswordResetRequest): Promise<{ message: string }> => {
    return apiClient.post('/auth/forgot-password', data)
  },

  confirmPasswordReset: async (data: PasswordResetConfirm): Promise<{ message: string }> => {
    return apiClient.post('/auth/reset-password', data)
  },

  // Email verification
  requestEmailVerification: async (): Promise<{ message: string }> => {
    return apiClient.post('/auth/verify-email/request')
  },

  confirmEmailVerification: async (data: EmailVerificationRequest): Promise<{ message: string }> => {
    return apiClient.post('/auth/verify-email/confirm', data)
  },

  // Session management
  getSessions: async (): Promise<Array<{
    id: string
    deviceInfo: string
    ipAddress: string
    lastActive: string
    isCurrent: boolean
  }>> => {
    return apiClient.get('/auth/sessions')
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    return apiClient.delete(`/auth/sessions/${sessionId}`)
  },

  revokeAllSessions: async (): Promise<void> => {
    return apiClient.delete('/auth/sessions')
  },
}