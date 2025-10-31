import { retryManager, RetryManager } from '../retry-manager'
import { useUIStore } from '@/lib/stores'

// Mock dependencies
jest.mock('@/lib/stores')

const mockUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>

describe('RetryManager', () => {
  let manager: RetryManager
  let mockStoreState: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    mockStoreState = {
      addToast: jest.fn()
    }

    mockUIStore.getState = jest.fn().mockReturnValue(mockStoreState)
    manager = new RetryManager()
  })

  afterEach(() => {
    jest.useRealTimers()
    manager.clearAll()
  })

  describe('Successful Operations', () => {
    it('should execute operation successfully on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await manager.executeWithRetry('test-key', operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should clear retry state after success', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      await manager.executeWithRetry('test-key', operation)

      expect(manager.getRetryInfo('test-key')).toBeNull()
    })
  })

  describe('Failed Operations', () => {
    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      const resultPromise = manager.executeWithRetry('test-key', operation, {
        maxAttempts: 2,
        baseDelay: 1000
      })

      // Fast-forward time to trigger retry
      jest.advanceTimersByTime(1000)

      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable errors', async () => {
      const error = {
        response: { status: 400 },
        message: 'Bad Request'
      }
      const operation = jest.fn().mockRejectedValue(error)

      await expect(
        manager.executeWithRetry('test-key', operation)
      ).rejects.toEqual(error)

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should respect max retry attempts', async () => {
      const error = new Error('Network error')
      const operation = jest.fn().mockRejectedValue(error)

      const resultPromise = manager.executeWithRetry('test-key', operation, {
        maxAttempts: 2,
        baseDelay: 100
      })

      // Fast-forward through all retry attempts
      jest.advanceTimersByTime(300) // Initial + 1 retry

      await expect(resultPromise).rejects.toEqual(error)
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should use exponential backoff', async () => {
      const error = new Error('Network error')
      const operation = jest.fn().mockRejectedValue(error)

      const resultPromise = manager.executeWithRetry('test-key', operation, {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffFactor: 2
      })

      // Check retry state after first failure
      jest.advanceTimersByTime(500)
      const retryInfo = manager.getRetryInfo('test-key')
      expect(retryInfo?.attempt).toBe(1)

      // Complete all retries
      jest.advanceTimersByTime(5000)

      await expect(resultPromise).rejects.toEqual(error)
      expect(operation).toHaveBeenCalledTimes(3)
    })
  })

  describe('Retry State Management', () => {
    it('should track retry state', async () => {
      const error = new Error('Network error')
      const operation = jest.fn().mockRejectedValue(error)

      const resultPromise = manager.executeWithRetry('test-key', operation, {
        maxAttempts: 2,
        baseDelay: 1000
      })

      // Check state during retry
      jest.advanceTimersByTime(500)
      const retryInfo = manager.getRetryInfo('test-key')
      
      expect(retryInfo).toBeTruthy()
      expect(retryInfo!.attempt).toBe(1)
      expect(retryInfo!.lastError).toEqual(error)
      expect(retryInfo!.isRetrying).toBe(true)

      jest.advanceTimersByTime(2000)
      await expect(resultPromise).rejects.toEqual(error)
    })

    it('should cancel retry', async () => {
      const error = new Error('Network error')
      const operation = jest.fn().mockRejectedValue(error)

      const resultPromise = manager.executeWithRetry('test-key', operation, {
        maxAttempts: 3,
        baseDelay: 1000
      })

      // Cancel retry before it executes
      jest.advanceTimersByTime(500)
      manager.cancelRetry('test-key')

      expect(manager.getRetryInfo('test-key')).toBeNull()
      
      // The original promise should still reject
      jest.advanceTimersByTime(2000)
      await expect(resultPromise).rejects.toEqual(error)
    })

    it('should check if operation is retrying', async () => {
      const error = new Error('Network error')
      const operation = jest.fn().mockRejectedValue(error)

      const resultPromise = manager.executeWithRetry('test-key', operation, {
        maxAttempts: 2,
        baseDelay: 1000
      })

      expect(manager.isRetrying('test-key')).toBe(false)

      jest.advanceTimersByTime(500)
      expect(manager.isRetrying('test-key')).toBe(true)

      jest.advanceTimersByTime(2000)
      await expect(resultPromise).rejects.toEqual(error)
      expect(manager.isRetrying('test-key')).toBe(false)
    })

    it('should clear all retry states', async () => {
      const error = new Error('Network error')
      const operation1 = jest.fn().mockRejectedValue(error)
      const operation2 = jest.fn().mockRejectedValue(error)

      const promise1 = manager.executeWithRetry('key1', operation1, { baseDelay: 1000 })
      const promise2 = manager.executeWithRetry('key2', operation2, { baseDelay: 1000 })

      jest.advanceTimersByTime(500)
      expect(manager.getRetryInfo('key1')).toBeTruthy()
      expect(manager.getRetryInfo('key2')).toBeTruthy()

      manager.clearAll()

      expect(manager.getRetryInfo('key1')).toBeNull()
      expect(manager.getRetryInfo('key2')).toBeNull()

      jest.advanceTimersByTime(2000)
      await expect(promise1).rejects.toEqual(error)
      await expect(promise2).rejects.toEqual(error)
    })
  })

  describe('Notifications', () => {
    it('should show retry notifications', async () => {
      const error = new Error('Network error')
      const operation = jest.fn().mockRejectedValue(error)

      const resultPromise = manager.executeWithRetry('test-key', operation, {
        maxAttempts: 2,
        baseDelay: 1000
      })

      jest.advanceTimersByTime(500)

      expect(mockStoreState.addToast).toHaveBeenCalledWith({
        title: 'Retrying Request',
        description: 'Attempt 1 failed. Retrying in 1s...',
        type: 'warning',
        duration: 1000
      })

      jest.advanceTimersByTime(2000)
      await expect(resultPromise).rejects.toEqual(error)
    })
  })
})