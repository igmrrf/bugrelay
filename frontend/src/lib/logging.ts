// Frontend logging utility for structured logging and monitoring

export interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: string
  metadata?: Record<string, any>
  userId?: string
  sessionId?: string
  requestId?: string
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count'
  timestamp: string
  metadata?: Record<string, any>
}

export interface SecurityEvent {
  event: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  metadata?: Record<string, any>
}

class Logger {
  private sessionId: string
  private userId?: string
  private logBuffer: LogEntry[] = []
  private performanceBuffer: PerformanceMetric[] = []
  private securityBuffer: SecurityEvent[] = []
  private maxBufferSize = 100
  private flushInterval = 30000 // 30 seconds

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startPeriodicFlush()
    this.setupErrorHandlers()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private startPeriodicFlush() {
    setInterval(() => {
      this.flush()
    }, this.flushInterval)

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
    }
  }

  private setupErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Global error handler
      window.addEventListener('error', (event) => {
        this.error('Uncaught error', 'global', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        })
      })

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', 'global', {
          reason: event.reason,
          stack: event.reason?.stack
        })
      })
    }
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('debug', message, context, metadata)
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('info', message, context, metadata)
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('warn', message, context, metadata)
  }

  error(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('error', message, context, metadata)
  }

  private log(level: LogEntry['level'], message: string, context?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.getCurrentRequestId()
    }

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'debug' ? 'log' : level
      console[consoleMethod](`[${level.toUpperCase()}] ${context ? `[${context}] ` : ''}${message}`, metadata || '')
    }

    this.logBuffer.push(entry)
    this.checkBufferSize()

    // Immediate flush for errors in production
    if (level === 'error' && process.env.NODE_ENV === 'production') {
      this.flush()
    }
  }

  performance(name: string, value: number, unit: PerformanceMetric['unit'], metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        userId: this.userId,
        sessionId: this.sessionId
      }
    }

    this.performanceBuffer.push(metric)
    this.checkBufferSize()

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERFORMANCE] ${name}: ${value}${unit}`, metadata || '')
    }
  }

  security(event: string, severity: SecurityEvent['severity'], metadata?: Record<string, any>) {
    const securityEvent: SecurityEvent = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        userId: this.userId,
        sessionId: this.sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    }

    this.securityBuffer.push(securityEvent)
    this.checkBufferSize()

    // Immediate flush for high/critical security events
    if (['high', 'critical'].includes(severity)) {
      this.flush()
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY] ${severity.toUpperCase()}: ${event}`, metadata || '')
    }
  }

  private getCurrentRequestId(): string | undefined {
    // Try to get request ID from current context
    // This would be set by the API client during requests
    return (globalThis as any).__currentRequestId
  }

  private checkBufferSize() {
    if (this.logBuffer.length >= this.maxBufferSize ||
        this.performanceBuffer.length >= this.maxBufferSize ||
        this.securityBuffer.length >= this.maxBufferSize) {
      this.flush()
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0 && 
        this.performanceBuffer.length === 0 && 
        this.securityBuffer.length === 0) {
      return
    }

    const payload = {
      logs: [...this.logBuffer],
      performance: [...this.performanceBuffer],
      security: [...this.securityBuffer],
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId
    }

    // Clear buffers
    this.logBuffer = []
    this.performanceBuffer = []
    this.securityBuffer = []

    try {
      // Send to logging endpoint
      if (typeof fetch !== 'undefined') {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
    } catch (error) {
      // Fallback: store in localStorage for later retry
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('pending_logs') || '[]'
        const pendingLogs = JSON.parse(stored)
        pendingLogs.push(payload)
        
        // Keep only last 10 entries to prevent storage overflow
        if (pendingLogs.length > 10) {
          pendingLogs.splice(0, pendingLogs.length - 10)
        }
        
        localStorage.setItem('pending_logs', JSON.stringify(pendingLogs))
      }
    }
  }

  // Retry sending any pending logs
  async retryPendingLogs() {
    if (typeof localStorage === 'undefined') return

    const stored = localStorage.getItem('pending_logs')
    if (!stored) return

    try {
      const pendingLogs = JSON.parse(stored)
      
      for (const payload of pendingLogs) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }

      // Clear pending logs on success
      localStorage.removeItem('pending_logs')
    } catch (error) {
      // Keep pending logs for next retry
      console.warn('Failed to retry pending logs:', error)
    }
  }
}

// Create singleton instance
export const logger = new Logger()

// Performance monitoring utilities
export const performanceMonitor = {
  // Measure function execution time
  measure: <T extends (...args: any[]) => any>(
    name: string,
    fn: T,
    metadata?: Record<string, any>
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now()
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start
          logger.performance(name, duration, 'ms', metadata)
        })
      } else {
        const duration = performance.now() - start
        logger.performance(name, duration, 'ms', metadata)
        return result
      }
    }) as T
  },

  // Measure page load performance
  measurePageLoad: () => {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        logger.performance('page_load_total', navigation.loadEventEnd - navigation.fetchStart, 'ms')
        logger.performance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms')
        logger.performance('first_paint', navigation.responseEnd - navigation.fetchStart, 'ms')
      }
    })
  },

  // Measure Core Web Vitals
  measureWebVitals: () => {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      logger.performance('lcp', lastEntry.startTime, 'ms')
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        logger.performance('fid', entry.processingStart - entry.startTime, 'ms')
      })
    }).observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      logger.performance('cls', clsValue, 'count')
    }).observe({ entryTypes: ['layout-shift'] })
  }
}

// Security monitoring utilities
export const securityMonitor = {
  // Monitor for potential XSS attempts
  detectXSS: (input: string, context: string) => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ]

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        logger.security('potential_xss_attempt', 'high', {
          context,
          input: input.substring(0, 100), // Log first 100 chars only
          pattern: pattern.source
        })
        return true
      }
    }
    return false
  },

  // Monitor for suspicious navigation
  monitorNavigation: () => {
    if (typeof window === 'undefined') return

    let navigationCount = 0
    const startTime = Date.now()

    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(...args) {
      navigationCount++
      checkSuspiciousNavigation()
      return originalPushState.apply(this, args)
    }

    history.replaceState = function(...args) {
      navigationCount++
      checkSuspiciousNavigation()
      return originalReplaceState.apply(this, args)
    }

    function checkSuspiciousNavigation() {
      const elapsed = Date.now() - startTime
      if (navigationCount > 50 && elapsed < 60000) { // 50 navigations in 1 minute
        logger.security('suspicious_navigation_pattern', 'medium', {
          navigationCount,
          timeElapsed: elapsed
        })
      }
    }
  }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.measurePageLoad()
  performanceMonitor.measureWebVitals()
  securityMonitor.monitorNavigation()
}