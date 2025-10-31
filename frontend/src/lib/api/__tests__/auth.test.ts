import { authAPI } from '../auth'
import { apiClient } from '../client'

// Mock the API client
jest.mock('../client')
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should login with credentials', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        token: 'jwt-token'
      }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const credentials = { email: 'test@example.com', password: 'password' }
      const result = await authAPI.login(credentials)

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', credentials)
      expect(result).toEqual(mockResponse)
    })

    it('should register new user', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', displayName: 'Test User' },
        token: 'jwt-token'
      }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const registerData = {
        email: 'test@example.com',
        password: 'password',
        displayName: 'Test User'
      }
      const result = await authAPI.register(registerData)

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', registerData)
      expect(result).toEqual(mockResponse)
    })

    it('should logout user', async () => {
      mockApiClient.post.mockResolvedValue(undefined)

      await authAPI.logout()

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout')
    })

    it('should refresh token', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        token: 'new-jwt-token'
      }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authAPI.refreshToken()

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Profile Management', () => {
    it('should get user profile', async () => {
      const mockUser = { id: '1', email: 'test@example.com', displayName: 'Test User' }
      mockApiClient.get.mockResolvedValue(mockUser)

      const result = await authAPI.getProfile()

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/profile')
      expect(result).toEqual(mockUser)
    })

    it('should update user profile', async () => {
      const mockUser = { id: '1', email: 'test@example.com', displayName: 'Updated Name' }
      const updateData = { displayName: 'Updated Name' }
      mockApiClient.patch.mockResolvedValue(mockUser)

      const result = await authAPI.updateProfile(updateData)

      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/profile', updateData)
      expect(result).toEqual(mockUser)
    })
  })

  describe('Password Reset', () => {
    it('should request password reset', async () => {
      const mockResponse = { message: 'Reset email sent' }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authAPI.requestPasswordReset({ email: 'test@example.com' })

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com'
      })
      expect(result).toEqual(mockResponse)
    })

    it('should confirm password reset', async () => {
      const mockResponse = { message: 'Password reset successful' }
      const resetData = { token: 'reset-token', newPassword: 'newpassword' }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authAPI.confirmPasswordReset(resetData)

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/reset-password', resetData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('OAuth', () => {
    it('should get OAuth URL', async () => {
      const mockResponse = { url: 'https://oauth.provider.com', state: 'random-state' }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await authAPI.getOAuthURL('google')

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/oauth/google')
      expect(result).toEqual(mockResponse)
    })

    it('should handle OAuth callback', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        token: 'jwt-token'
      }
      const callbackData = { code: 'auth-code', provider: 'google' as const }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await authAPI.handleOAuthCallback(callbackData)

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/oauth/callback', callbackData)
      expect(result).toEqual(mockResponse)
    })
  })
})