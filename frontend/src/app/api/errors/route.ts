import { NextRequest, NextResponse } from 'next/server'

interface ErrorReport {
  message: string
  stack?: string
  name: string
  context: string
  metadata?: Record<string, any>
  userId?: string
  sessionId: string
  url?: string
  userAgent?: string
  timestamp: string
}

interface ErrorPayload {
  errors: ErrorReport[]
}

export async function POST(request: NextRequest) {
  try {
    const payload: ErrorPayload = await request.json()
    
    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Enhance error reports with request metadata
    const enhancedErrors = payload.errors.map(error => ({
      ...error,
      clientIP,
      receivedAt: new Date().toISOString(),
      severity: determineSeverity(error)
    }))

    // Log errors to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Frontend errors received:', enhancedErrors)
    }

    // Send to backend error tracking service if configured
    const backendErrorsUrl = process.env.BACKEND_LOGS_URL
    if (backendErrorsUrl) {
      try {
        await fetch(`${backendErrorsUrl}/api/v1/logs/errors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.BACKEND_API_KEY || ''
          },
          body: JSON.stringify({
            errors: enhancedErrors,
            source: 'frontend-nextjs'
          })
        })
      } catch (error) {
        console.error('Failed to forward errors to backend:', error)
      }
    }

    // In production, you might want to send to external services like:
    // - Sentry
    // - Rollbar  
    // - Bugsnag
    // - Custom error tracking service

    // Check for critical errors that need immediate attention
    const criticalErrors = enhancedErrors.filter(error => 
      error.severity === 'critical' || 
      error.context === 'auth' ||
      error.context === 'payment'
    )

    if (criticalErrors.length > 0) {
      // In production, trigger alerts for critical errors
      console.error('Critical errors detected:', criticalErrors)
    }

    return NextResponse.json({ 
      success: true,
      processed: payload.errors.length,
      critical: criticalErrors.length
    })
  } catch (error) {
    console.error('Error processing error reports:', error)
    return NextResponse.json(
      { error: 'Failed to process error reports' },
      { status: 500 }
    )
  }
}

function determineSeverity(error: ErrorReport): 'low' | 'medium' | 'high' | 'critical' {
  // Determine severity based on error characteristics
  
  // Critical contexts
  if (['auth', 'payment', 'data-loss'].includes(error.context)) {
    return 'critical'
  }
  
  // High severity for certain error types
  if (error.name === 'ChunkLoadError' || 
      error.message.includes('Network Error') ||
      error.message.includes('Failed to fetch')) {
    return 'high'
  }
  
  // Medium severity for API errors
  if (error.context === 'api-client') {
    return 'medium'
  }
  
  // Low severity for UI errors
  if (error.context.includes('ui') || error.context.includes('component')) {
    return 'low'
  }
  
  // Default to medium
  return 'medium'
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'frontend-error-reporting',
    timestamp: new Date().toISOString()
  })
}