// Comprehensive error reporting and monitoring for the frontend

import { logger } from './logging'
import { useAuthStore, useUIStore } from './stores'

export interface ErrorReport {
  error: Error
  context: string
  metadata?: Record<string, any>
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
  timestamp: string
}

export class ErrorReporter {
  private static instance: ErrorReporter
  private errorQueue: ErrorReport[] = []
  private isOnline = true

  private constructor() {
    this.setupNetworkMonitoring()
    this.setupPerformanceMonitoring()
    this.setupUnhandledErrorCapture()
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter()
    }
    return ErrorReporter.instance
  }

  private setupNetworkMonitoring() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushErrorQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      logger.warn('Network connection lost', 'error-reporter')
    })
  }

  private setupPerformanceMonitoring() {
    if (typeof window === 'undefined') return

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              logger.performance('long_task', entry.duration, 'ms', {
                name: entry.name,
                startTime: entry.startTime
              })
            }
          })
        })
        observer.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // PerformanceObserver not supported or failed
      }
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        if (memory) {
          logger.performance('memory_usage', memory.usedJSHeapSize, 'bytes', {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          })

          // Warn if memory usage is high
          const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
          if (usagePercent > 80) {
            logger.warn('High memory usage detected', 'performance', {
              usagePercent,
              usedJSHeapSize: memory.usedJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit
            })
          }
        }
      }, 60000) // Check every minute
    }
  }

  private setupUnhandledErrorCapture() {
    if (typeof window === 'undefined') return

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        'unhandled-promise',
        {
          reason: event.reason,
          promise: event.promise
        }
      )
    })

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.reportError(
        event.error || new Error(event.message),
        'global-error',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      )
    })
  }

  reportError(error: Error, context: string, metadata?: Record<string, any>) {
    const report: ErrorReport = {
      error,
      context,
      metadata,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString()
    }

    // Log the error
    logger.error(error.message, context, {
      ...metadata,
      stack: error.stack,
      name: error.name
    })

    // Add to queue for batch reporting
    this.errorQueue.push(report)

    // Show user notification for critical errors
    this.showUserNotification(error, context)

    // Flush queue if online
    if (this.isOnline) {
      this.flushErrorQueue()
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      const { user } = useAuthStore.getState()
      return user?.id
    } catch {
      return undefined
    }
  }

  private getSessionId(): string {
    // Get or create session ID
    if (typeof window === 'undefined') return 'server-side'

    let sessionId = sessionStorage.getItem('error-reporter-session-id')
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      sessionStorage.setItem('error-reporter-session-id', sessionId)
    }
    return sessionId
  }

  private showUserNotification(error: Error, context: string) {
    // Only show notifications for certain types of errors
    const criticalContexts = ['api-client', 'auth', 'payment', 'data-loss']

    if (criticalContexts.includes(context)) {
      try {
        const { addToast } = useUIStore.getState()
        addToast({
          title: 'Something went wrong',
          description: 'We\'ve been notified and are working on a fix.',
          type: 'error',
          duration: 5000
        })
      } catch {
        // Fallback to console if store is not available
        console.error('Critical error occurred:', error.message)
      }
    }
  }

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0) return

    const errors = [...this.errorQueue]
    this.errorQueue = []

    try {
      // Send errors to backend
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errors: errors.map(report => ({
            message: report.error.message,
            stack: report.error.stack,
            name: report.error.name,
            context: report.context,
            metadata: report.metadata,
            userId: report.userId,
            sessionId: report.sessionId,
            url: report.url,
            userAgent: report.userAgent,
            timestamp: report.timestamp
          }))
        })
      })
    } catch (error) {
      // If sending fails, put errors back in queue
      this.errorQueue.unshift(...errors)
      logger.warn('Failed to send error reports', 'error-reporter', {
        errorCount: errors.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Manual error reporting for caught errors
  captureException(error: Error, context?: string, metadata?: Record<string, any>) {
    this.reportError(error, context || 'manual', metadata)
  }

  // Breadcrumb tracking for debugging
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    logger.debug(message, `breadcrumb:${category}`, data)
  }

  // Performance tracking
  trackPerformance(name: string, startTime: number, metadata?: Record<string, any>) {
    const duration = performance.now() - startTime
    logger.performance(name, duration, 'ms', metadata)

    // Report slow operations
    if (duration > 1000) { // Slower than 1 second
      this.reportError(
        new Error(`Slow operation: ${name} took ${duration}ms`),
        'performance',
        { ...metadata, duration }
      )
    }
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance()

// Convenience functions
export const captureException = (error: Error, context?: string, metadata?: Record<string, any>) => {
  errorReporter.captureException(error, context, metadata)
}

export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  errorReporter.addBreadcrumb(message, category, data)
}

export const trackPerformance = (name: string, startTime: number, metadata?: Record<string, any>) => {
  errorReporter.trackPerformance(name, startTime, metadata)
}

// React hook for error reporting
export const useErrorReporter = () => {
  return {
    captureException,
    addBreadcrumb,
    trackPerformance,
    reportError: (error: Error, context: string, metadata?: Record<string, any>) => {
      errorReporter.reportError(error, context, metadata)
    }
  }
}