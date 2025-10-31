import { useUIStore } from '@/lib/stores'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: any) => boolean
}

export interface RetryState {
  attempt: number
  lastError: Error | null
  isRetrying: boolean
  nextRetryAt: Date | null
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors and 5xx server errors
    if (!error.response) return true // Network error
    const status = error.response?.status
    return status >= 500 || status === 408 || status === 429
  }
}

export class RetryManager {
  private retryStates = new Map<string, RetryState>()
  private retryTimeouts = new Map<string, NodeJS.Timeout>()

  async executeWithRetry<T>(
    key: string,
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...defaultRetryConfig, ...config }
    const state = this.getRetryState(key)

    try {
      const result = await operation()
      this.clearRetryState(key)
      return result
    } catch (error) {
      return this.handleRetry(key, operation, error, finalConfig)
    }
  }

  private async handleRetry<T>(
    key: string,
    operation: () => Promise<T>,
    error: any,
    config: RetryConfig
  ): Promise<T> {
    const state = this.getRetryState(key)
    
    // Check if we should retry
    if (
      state.attempt >= config.maxAttempts ||
      !config.retryCondition?.(error)
    ) {
      this.clearRetryState(key)
      throw error
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, state.attempt),
      config.maxDelay
    )

    // Update retry state
    state.attempt++
    state.lastError = error
    state.isRetrying = true
    state.nextRetryAt = new Date(Date.now() + delay)

    // Show retry notification
    this.showRetryNotification(key, state, delay)

    // Schedule retry
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        this.retryTimeouts.delete(key)
        state.isRetrying = false
        
        try {
          const result = await this.executeWithRetry(key, operation, config)
          resolve(result)
        } catch (retryError) {
          reject(retryError)
        }
      }, delay)

      this.retryTimeouts.set(key, timeout)
    })
  }

  private getRetryState(key: string): RetryState {
    if (!this.retryStates.has(key)) {
      this.retryStates.set(key, {
        attempt: 0,
        lastError: null,
        isRetrying: false,
        nextRetryAt: null
      })
    }
    return this.retryStates.get(key)!
  }

  private clearRetryState(key: string) {
    this.retryStates.delete(key)
    
    const timeout = this.retryTimeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      this.retryTimeouts.delete(key)
    }
  }

  private showRetryNotification(key: string, state: RetryState, delay: number) {
    const { addToast } = useUIStore.getState()
    
    addToast({
      title: 'Retrying Request',
      description: `Attempt ${state.attempt} failed. Retrying in ${Math.round(delay / 1000)}s...`,
      type: 'warning',
      duration: delay
    })
  }

  // Public methods for managing retry states
  getRetryInfo(key: string): RetryState | null {
    return this.retryStates.get(key) || null
  }

  cancelRetry(key: string) {
    this.clearRetryState(key)
  }

  isRetrying(key: string): boolean {
    return this.retryStates.get(key)?.isRetrying || false
  }

  // Clear all retry states (useful for logout)
  clearAll() {
    this.retryStates.clear()
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
  }
}

// Create singleton instance
export const retryManager = new RetryManager()

// React hook for retry management
export const useRetryManager = () => {
  return {
    executeWithRetry: retryManager.executeWithRetry.bind(retryManager),
    getRetryInfo: retryManager.getRetryInfo.bind(retryManager),
    cancelRetry: retryManager.cancelRetry.bind(retryManager),
    isRetrying: retryManager.isRetrying.bind(retryManager),
    clearAll: retryManager.clearAll.bind(retryManager)
  }
}