import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useUIStore, loadingManager, errorHandler } from '@/lib/stores'
import { queryKeys } from '@/lib/query-keys'
import { authAPI } from '@/lib/api'
import type { User } from '@/lib/stores/auth-store'
import type { LoginCredentials, RegisterData } from '@/lib/api'

export const useProfile = () => {
  const { user, isAuthenticated } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: authAPI.getProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
    meta: {
      errorMessage: 'Failed to load user profile'
    }
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()
  const { login } = useAuthStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authAPI.login(credentials),
    onMutate: () => {
      loadingManager.start('auth.login')
    },
    onSuccess: (data) => {
      login(data.user)
      queryClient.setQueryData(queryKeys.auth.profile(), data.user)
      addToast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handleAuthError(error)
    },
    onSettled: () => {
      loadingManager.stop('auth.login')
    }
  })
}

export const useRegister = () => {
  const queryClient = useQueryClient()
  const { login } = useAuthStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: (data: RegisterData) => authAPI.register(data),
    onMutate: () => {
      loadingManager.start('auth.register')
    },
    onSuccess: (data) => {
      login(data.user)
      queryClient.setQueryData(queryKeys.auth.profile(), data.user)
      addToast({
        title: 'Account created!',
        description: 'Welcome to BUGRELAY. Please verify your email address.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handleAuthError(error)
    },
    onSettled: () => {
      loadingManager.stop('auth.register')
    }
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  const { logout } = useAuthStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: authAPI.logout,
    onMutate: () => {
      loadingManager.start('auth.logout')
    },
    onSuccess: () => {
      logout()
      queryClient.clear() // Clear all cached data
      addToast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
        type: 'info'
      })
    },
    onError: (error) => {
      // Even if logout fails on server, clear local state
      logout()
      queryClient.clear()
      errorHandler.handle(error, 'logout')
    },
    onSettled: () => {
      loadingManager.stop('auth.logout')
    }
  })
}

export const useRefreshToken = () => {
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()

  return useMutation({
    mutationFn: authAPI.refreshToken,
    onMutate: () => {
      loadingManager.start('auth.refresh')
    },
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.setQueryData(queryKeys.auth.profile(), data.user)
    },
    onError: (error) => {
      // If refresh fails, user needs to log in again
      const { logout } = useAuthStore.getState()
      logout()
      queryClient.clear()
      errorHandler.handleAuthError(error)
    },
    onSettled: () => {
      loadingManager.stop('auth.refresh')
    }
  })
}