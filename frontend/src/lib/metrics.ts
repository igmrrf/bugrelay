// Metrics collection utilities for Prometheus integration

// Simple in-memory metrics storage
let requestCount = 0
let errorCount = 0
let responseTimeSum = 0
let responseTimeCount = 0

// Helper functions to update metrics (called from middleware)
export function incrementRequestCount() {
  requestCount++
}

export function incrementErrorCount() {
  errorCount++
}

export function recordResponseTime(timeMs: number) {
  responseTimeSum += timeMs
  responseTimeCount++
}

// Getter functions for metrics route
export function getRequestCount() {
  return requestCount
}

export function getErrorCount() {
  return errorCount
}

export function getAverageResponseTime() {
  return responseTimeCount > 0 ? (responseTimeSum / responseTimeCount / 1000) : 0
}

export function resetMetrics() {
  requestCount = 0
  errorCount = 0
  responseTimeSum = 0
  responseTimeCount = 0
}