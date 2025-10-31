import { NextResponse } from 'next/server'
import { getRequestCount, getErrorCount, getAverageResponseTime, incrementRequestCount } from '@/lib/metrics'

export async function GET() {
  try {
    const metrics = generatePrometheusMetrics()
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    )
  }
}

function generatePrometheusMetrics(): string {
  const memoryUsage = process.memoryUsage()
  
  // Increment request count for this metrics request
  incrementRequestCount()
  
  const metrics = [
    // Help and type declarations
    '# HELP bugrelay_frontend_requests_total Total number of HTTP requests',
    '# TYPE bugrelay_frontend_requests_total counter',
    `bugrelay_frontend_requests_total ${getRequestCount()}`,
    '',
    
    '# HELP bugrelay_frontend_errors_total Total number of errors',
    '# TYPE bugrelay_frontend_errors_total counter',
    `bugrelay_frontend_errors_total ${getErrorCount()}`,
    '',
    
    '# HELP bugrelay_frontend_response_time_seconds Average response time in seconds',
    '# TYPE bugrelay_frontend_response_time_seconds gauge',
    `bugrelay_frontend_response_time_seconds ${getAverageResponseTime()}`,
    '',
    
    '# HELP bugrelay_frontend_memory_usage_bytes Memory usage in bytes',
    '# TYPE bugrelay_frontend_memory_usage_bytes gauge',
    `bugrelay_frontend_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`,
    `bugrelay_frontend_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}`,
    `bugrelay_frontend_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}`,
    `bugrelay_frontend_memory_usage_bytes{type="external"} ${memoryUsage.external}`,
    '',
    
    '# HELP bugrelay_frontend_uptime_seconds Process uptime in seconds',
    '# TYPE bugrelay_frontend_uptime_seconds gauge',
    `bugrelay_frontend_uptime_seconds ${process.uptime()}`,
    '',
    
    '# HELP bugrelay_frontend_build_info Build information',
    '# TYPE bugrelay_frontend_build_info gauge',
    `bugrelay_frontend_build_info{version="${process.env.npm_package_version || '1.0.0'}",node_version="${process.version}",environment="${process.env.NODE_ENV || 'development'}"} 1`,
    '',
    
    // Add timestamp
    `# Generated at ${new Date().toISOString()}`,
    ''
  ]
  
  return metrics.join('\n')
}

