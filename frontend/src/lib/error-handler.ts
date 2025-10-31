import { useUIStore } from '@/lib/stores'

export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  requestId: string
}

export interface ErrorResponse {
  error: APIError
}

export class AppError extends Error {
  public readonly code: string
  public readonly details?: Record<string, any>
  public readonly statusCode?: number

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  static fromAPIError(error: APIError, statusCode?: number): AppError {
    return new AppError(error.message, error.code, statusCode, error.details)
  }

  static fromAxiosError(error: any): AppError {
    if (error.response?.data?.error) {
      return AppError.fromAPIError(error.response.data.error, error.response.status)
    }

    if (error.response) {
      return new AppError(
        error.response.data?.message || 'Server error occurred',
        'SERVER_ERROR',
        error.response.status
      )
    }

    if (error.request) {
      return new AppError(
        'Network error - please check your connection',
        'NETWORK_ERROR'
      )
    }

    return new AppError(error.message || 'An unexpected error occurred', 'UNKNOWN_ERROR')
  }
}

export const errorHandler = {
  // Handle errors globally and show appropriate UI feedback
  handle: (error: unknown, context?: string) => {
    const { addToast, setGlobalError } = useUIStore.getState()
    
    let appError: AppError
    
    if (error instanceof AppError) {
      appError = error
    } else if (error && typeof error === 'object' && 'response' in error) {
      appError = AppError.fromAxiosError(error)
    } else if (error instanceof Error) {
      appError = new AppError(error.message, 'UNKNOWN_ERROR')
    } else {
      appError = new AppError('An unexpected error occurred', 'UNKNOWN_ERROR')
    }

    // Log error for debugging
    console.error(`Error in ${context || 'unknown context'}:`, appError)

    // Show user-friendly error message
    const shouldShowGlobalError = appError.statusCode && appError.statusCode >= 500
    
    if (shouldShowGlobalError) {
      setGlobalError(appError.message)
    } else {
      addToast({
        title: 'Error',
        description: appError.message,
        type: 'error',
        duration: 6000
      })
    }

    return appError
  },

  // Handle authentication errors specifically
  handleAuthError: (error: unknown) => {
    const appError = errorHandler.handle(error, 'authentication')
    
    // If it's an auth error, redirect to login
    if (appError.statusCode === 401 || appError.code === 'UNAUTHORIZED') {
      useUIStore.getState()
      // Note: logout function should be imported from auth store
      // This is handled in the API client interceptors
    }

    return appError
  },

  // Clear all errors
  clearAll: () => {
    const { clearAllErrors, clearToasts } = useUIStore.getState()
    clearAllErrors()
    clearToasts()
  },

  // Get user-friendly error messages
  getUserMessage: (error: AppError): string => {
    const errorMessages: Record<string, string> = {
      NETWORK_ERROR: 'Please check your internet connection and try again.',
      UNAUTHORIZED: 'Please log in to continue.',
      FORBIDDEN: 'You do not have permission to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
      SERVER_ERROR: 'A server error occurred. Please try again later.',
    }

    return errorMessages[error.code] || error.message
  }
}

// Error boundary helper
export const withErrorBoundary = <T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): T => {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args)
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorHandler.handle(error, context)
          throw error
        })
      }
      
      return result
    } catch (error) {
      errorHandler.handle(error, context)
      throw error
    }
  }) as T
}