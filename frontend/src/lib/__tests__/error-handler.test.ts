import { errorHandler, AppError, withErrorBoundary } from '../error-handler'
import { useUIStore } from '@/lib/stores'

// Mock dependencies
jest.mock('@/lib/stores')

const mockUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>

describe('Error Handler', () => {
  let mockStoreState: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockStoreState = {
      addToast: jest.fn(),
      setGlobalError: jest.fn(),
      clearAllErrors: jest.fn(),
      clearToasts: jest.fn()
    }

    mockUIStore.getState = jest.fn().mockReturnValue(mockStoreState)
  })

  describe('AppError', () => {
    it('should create AppError from API error', () => {
      const apiError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' },
        timestamp: '2023-01-01T00:00:00Z',
        requestId: 'req-123'
      }

      const appError = AppError.fromAPIError(apiError, 400)

      expect(appError.message).toBe('Invalid input')
      expect(appError.code).toBe('VALIDATION_ERROR')
      expect(appError.statusCode).toBe(400)
      expect(appError.details).toEqual({ field: 'email' })
    })

    it('should create AppError from Axios error', () => {
      const axiosError = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found'
            }
          }
        }
      }

      const appError = AppError.fromAxiosError(axiosError)

      expect(appError.message).toBe('Resource not found')
      expect(appError.code).toBe('NOT_FOUND')
      expect(appError.statusCode).toBe(404)
    })

    it('should handle network errors', () => {
      const networkError = {
        request: {},
        message: 'Network Error'
      }

      const appError = AppError.fromAxiosError(networkError)

      expect(appError.message).toBe('Network error - please check your connection')
      expect(appError.code).toBe('NETWORK_ERROR')
    })
  })

  describe('Error Handler', () => {
    it('should handle AppError and show toast', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400)

      errorHandler.handle(error, 'test context')

      expect(mockStoreState.addToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Test error',
        type: 'error',
        duration: 6000
      })
    })

    it('should handle server errors with global error', () => {
      const error = new AppError('Server error', 'SERVER_ERROR', 500)

      errorHandler.handle(error, 'test context')

      expect(mockStoreState.setGlobalError).toHaveBeenCalledWith('Server error')
    })

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error')

      errorHandler.handle(error, 'test context')

      expect(mockStoreState.addToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Unknown error',
        type: 'error',
        duration: 6000
      })
    })

    it('should clear all errors', () => {
      errorHandler.clearAll()

      expect(mockStoreState.clearAllErrors).toHaveBeenCalled()
      expect(mockStoreState.clearToasts).toHaveBeenCalled()
    })

    it('should get user-friendly error messages', () => {
      const networkError = new AppError('Network failed', 'NETWORK_ERROR')
      const authError = new AppError('Not authorized', 'UNAUTHORIZED')
      const unknownError = new AppError('Something went wrong', 'UNKNOWN')

      expect(errorHandler.getUserMessage(networkError)).toBe(
        'Please check your internet connection and try again.'
      )
      expect(errorHandler.getUserMessage(authError)).toBe(
        'Please log in to continue.'
      )
      expect(errorHandler.getUserMessage(unknownError)).toBe(
        'Something went wrong'
      )
    })
  })

  describe('withErrorBoundary', () => {
    it('should wrap synchronous functions', () => {
      const fn = jest.fn().mockReturnValue('success')
      const wrappedFn = withErrorBoundary(fn, 'test')

      const result = wrappedFn('arg1', 'arg2')

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should handle synchronous errors', () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('Sync error')
      })
      const wrappedFn = withErrorBoundary(fn, 'test')

      expect(() => wrappedFn()).toThrow('Sync error')
      expect(mockStoreState.addToast).toHaveBeenCalled()
    })

    it('should wrap asynchronous functions', async () => {
      const fn = jest.fn().mockResolvedValue('async success')
      const wrappedFn = withErrorBoundary(fn, 'test')

      const result = await wrappedFn('arg1')

      expect(result).toBe('async success')
      expect(fn).toHaveBeenCalledWith('arg1')
    })

    it('should handle asynchronous errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Async error'))
      const wrappedFn = withErrorBoundary(fn, 'test')

      await expect(wrappedFn()).rejects.toThrow('Async error')
      expect(mockStoreState.addToast).toHaveBeenCalled()
    })
  })
})