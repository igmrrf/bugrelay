// Import for local use
import { apiClient, APIClient } from './client'
import { authAPI } from './auth'
import { bugsAPI } from './bugs'
import { companiesAPI } from './companies'
import { adminAPI } from './admin'

// Re-export API client
export { apiClient, APIClient }

// Re-export API services
export { authAPI, bugsAPI, companiesAPI, adminAPI }

// Export types
export type { APIResponse, APIError, APIErrorResponse } from './client'
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  OAuthCallbackData,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationRequest,
  ProfileUpdateData
} from './auth'
export type {
  CreateBugData,
  UpdateBugData,
  BugListResponse,
  Comment,
  VoteResponse
} from './bugs'
export type {
  CompanyListResponse,
  ClaimCompanyData,
  VerifyCompanyData,
  AddMemberData,
  UpdateMemberData
} from './companies'
export type {
  AuditLog,
  ModerationItem,
  DuplicateBug,
  AdminStats
} from './admin'

// Create a unified API object for easy access
export const api = {
  auth: authAPI,
  bugs: bugsAPI,
  companies: companiesAPI,
  admin: adminAPI,
  client: apiClient,
}