import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLogin, useRegister, useLogout, useProfile } from '../use-auth-queries'
import { authAPI } from '@/lib/api'
import { useAuthStore, useUIStore } from '@/lib/stores'
import type { User } from '@/lib/stores/auth-store'

// Mock dependencies
jest.mock('@/lib/api')
jest.mock('@/lib/stores')

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>
const mockAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Auth Query Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock store functions
    mockAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn()
    } as any)
    
    mockUIStore.mockReturnValue({
      addToast: jest.fn()
    } as any)
  })

  describe('useLogin', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          isAdmin: false,
          isEmailVerified: true,
          authProvider: 'email' as const,
          companyMemberships: [],
          createdAt: '2023-01-01T00:00:00Z',
          lastActiveAt: '2023-01-01T00:00:00Z'
        },
        token: 'jwt-token'
      }
      mockAuthAPI.login.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper()
      })

      const credentials = { email: 'test@example.com', password: 'password' }
      result.current.mutate(credentials)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockAuthAPI.login).toHaveBeenCalledWith(credentials)
    })

    it('should handle login error', async () => {
      const mockError = new Error('Invalid credentials')
      mockAuthAPI.login.mockRejectedValue(mockError)

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper()
      })

      const credentials = { email: 'test@example.com', password: 'wrong' }
      result.current.mutate(credentials)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useRegister', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          isAdmin: false,
          isEmailVerified: false,
          authProvider: 'email' as const,
          companyMemberships: [],
          createdAt: '2023-01-01T00:00:00Z',
          lastActiveAt: '2023-01-01T00:00:00Z'
        },
        token: 'jwt-token'
      }
      mockAuthAPI.register.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper()
      })

      const registerData = {
        email: 'test@example.com',
        password: 'password',
        displayName: 'Test User'
      }
      result.current.mutate(registerData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockAuthAPI.register).toHaveBeenCalledWith(registerData)
    })
  })

  describe('useLogout', () => {
    it('should logout successfully', async () => {
      mockAuthAPI.logout.mockResolvedValue(undefined)

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper()
      })

      result.current.mutate()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockAuthAPI.logout).toHaveBeenCalled()
    })
  })

  describe('useProfile', () => {
    it('should fetch profile when authenticated', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        isAdmin: false,
        isEmailVerified: true,
        authProvider: 'email',
        companyMemberships: [],
        createdAt: '2023-01-01T00:00:00Z',
        lastActiveAt: '2023-01-01T00:00:00Z'
      }
      mockAuthAPI.getProfile.mockResolvedValue(mockUser)
      
      // Mock authenticated state
      mockAuthStore.mockReturnValue({
        user: mockUser,
        isAuthenticated: true
      } as any)

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockUser)
      expect(mockAuthAPI.getProfile).toHaveBeenCalled()
    })

    it('should not fetch profile when not authenticated', () => {
      mockAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false
      } as any)

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper()
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockAuthAPI.getProfile).not.toHaveBeenCalled()
    })
  })
})