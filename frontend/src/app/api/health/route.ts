import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check - you can add more sophisticated checks here
    const healthData = {
      status: 'ok',
      service: 'bugrelay-frontend',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        api: await checkAPIConnection(),
        // Add more health checks as needed
      }
    }

    // Determine overall health status
    const allChecksHealthy = Object.values(healthData.checks).every(check => check.status === 'ok')
    
    return NextResponse.json(
      {
        ...healthData,
        status: allChecksHealthy ? 'ok' : 'degraded'
      },
      { 
        status: allChecksHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'bugrelay-frontend',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function checkAPIConnection() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
    const response = await fetch(`${apiUrl.replace('/api/v1', '')}/health`, {
      method: 'GET',
    })
    
    if (response.ok) {
      return { status: 'ok', message: 'API connection healthy' }
    } else {
      return { status: 'error', message: `API returned status ${response.status}` }
    }
  } catch (error) {
    return { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'API connection failed' 
    }
  }
}