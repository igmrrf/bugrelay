import { useEffect } from 'react'
import { useAuthStore, loadingManager, errorHandler } from '@/lib/stores'
import { useRefreshToken } from './use-auth-queries'

/**
 * Hook to initialize authentication state on app startup
 * Handles token validation and refresh
 */
export const useAuthInit = () => {
  const { user, isAuthenticated, isInitialized, initialize } = useAuthStore()
  const refreshTokenMutation = useRefreshToken()

  useEffect(() => {
    const initAuth = async () => {
      // If already initialized, skip
      if (isInitialized) return

      loadingManager.start('auth.refresh')

      try {
        // Check if we have a stored user but need to validate the token
        if (user && isAuthenticated) {
          // Try to refresh the token to validate it's still valid
          await refreshTokenMutation.mutateAsync()
        }
      } catch (error) {
        // If refresh fails, the user will be logged out in the mutation handler
        console.log('Token refresh failed during initialization')
      } finally {
        // Mark as initialized regardless of success/failure
        initialize()
        loadingManager.stop('auth.refresh')
      }
    }

    initAuth()
  }, [isInitialized, user, isAuthenticated, initialize, refreshTokenMutation])

  return {
    isInitialized,
    isLoading: loadingManager.isLoading('auth.refresh') && !isInitialized
  }
}

/**
 * Hook to check if user has required permissions
 */
export const usePermissions = () => {
  const { hasPermission, isCompanyMember, isCompanyAdmin } = useAuthStore()

  return {
    hasPermission,
    isCompanyMember,
    isCompanyAdmin,
    canVote: () => hasPermission('bug.vote'),
    canComment: () => hasPermission('bug.comment'),
    canManageCompany: (companyId: string) => isCompanyAdmin(companyId),
    canModerate: () => hasPermission('admin'),
  }
}

/**
 * Hook for protected routes - redirects to login if not authenticated
 */
export const useRequireAuth = (redirectTo: string = '/login') => {
  const { isAuthenticated, isInitialized } = useAuthStore()
  const { isLoading } = useAuthInit()

  useEffect(() => {
    if (isInitialized && !isAuthenticated && !isLoading) {
      // In a real app, you'd use Next.js router here
      console.log(`Would redirect to ${redirectTo}`)
      // router.push(redirectTo)
    }
  }, [isAuthenticated, isInitialized, isLoading, redirectTo])

  return {
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    shouldRedirect: isInitialized && !isAuthenticated && !isLoading
  }
}

/**
 * Hook for admin-only routes
 */
export const useRequireAdmin = (redirectTo: string = '/') => {
  const { user, isAuthenticated, isInitialized } = useAuthStore()
  const { isLoading } = useAuthInit()

  const isAdmin = user?.isAdmin || false
  const shouldRedirect = isInitialized && (!isAuthenticated || !isAdmin) && !isLoading

  useEffect(() => {
    if (shouldRedirect) {
      console.log(`Would redirect to ${redirectTo} - admin access required`)
      // router.push(redirectTo)
    }
  }, [shouldRedirect, redirectTo])

  return {
    isAuthenticated,
    isAdmin,
    isLoading: isLoading || !isInitialized,
    shouldRedirect
  }
}