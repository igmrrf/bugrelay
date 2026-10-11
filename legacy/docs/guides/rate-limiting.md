# Rate Limiting Guide

This guide provides comprehensive documentation for understanding and working with BugRelay's rate limiting system, including limits, headers, handling strategies, and best practices for API integration.

## Overview

BugRelay implements rate limiting to ensure fair usage of the API and protect against abuse. The rate limiting system uses a combination of Redis-based distributed limiting and in-memory fallback to provide reliable protection while maintaining high performance.

## Rate Limiting Strategy

### IP-Based Limiting

Rate limits are applied per client IP address, ensuring that:
- Individual users or applications don't overwhelm the system
- Fair access is maintained for all users
- Malicious actors are automatically throttled

### Distributed Architecture

- **Primary**: Redis-based distributed rate limiting for multi-server deployments
- **Fallback**: In-memory rate limiting when Redis is unavailable
- **Graceful Degradation**: System continues operating even if rate limiting fails

## Rate Limits

### General API Limits

**Endpoint:** All API endpoints under `/api/v1/`

**Limit:** 60 requests per minute per IP address

**Applies to:**
- Bug report listing and retrieval
- Company information queries
- User authentication and profile operations
- Dashboard and analytics endpoints

### Bug Submission Limits

**Endpoint:** `POST /api/v1/bugs`

**Limit:** 5 submissions per minute per IP address

**Purpose:** Prevent spam and abuse of bug reporting system

**Additional Protection:**
- Stricter limit for anonymous users
- Content validation and duplicate detection
- File upload size restrictions

### File Upload Limits

**Endpoint:** `POST /api/v1/bugs/{id}/attachments`

**Limit:** Inherits general API limit (60 requests per minute)

**Additional Restrictions:**
- 10 MB maximum file size per upload
- Image files only (JPEG, PNG, GIF, WebP)
- Authentication required

### Authentication Limits

**Endpoints:** 
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/forgot-password`

**Limit:** Inherits general API limit (60 requests per minute)

**Security Features:**
- Failed login attempt tracking
- Account lockout after repeated failures
- CAPTCHA integration for suspicious activity

## Rate Limit Headers

### Response Headers

BugRelay includes rate limiting information in response headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995260
X-RateLimit-Window: 60
```

#### Header Descriptions

- `X-RateLimit-Limit`: Maximum requests allowed in the current window
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets
- `X-RateLimit-Window`: Duration of the rate limit window in seconds

### Rate Limit Exceeded Response

When rate limits are exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response Body:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Headers:**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995320
Retry-After: 60
```

## Client Implementation Strategies

### Basic Rate Limit Handling

#### JavaScript/Node.js Example

```javascript
class BugRelayAPIClient {
    constructor(apiKey, baseUrl = 'https://api.bugrelay.com/api/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.rateLimitInfo = {
            limit: null,
            remaining: null,
            reset: null
        };
    }

    async makeRequest(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            // Update rate limit info from headers
            this.updateRateLimitInfo(response.headers);
            
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new RateLimitError(`Rate limit exceeded. Retry after ${retryAfter} seconds.`, retryAfter);
            }
            
            if (!response.ok) {
                const error = await response.json();
                throw new APIError(error.error.message, response.status);
            }
            
            return response.json();
        } catch (error) {
            if (error instanceof RateLimitError) {
                throw error;
            }
            throw new APIError(`Network error: ${error.message}`, 0);
        }
    }

    updateRateLimitInfo(headers) {
        this.rateLimitInfo = {
            limit: parseInt(headers.get('X-RateLimit-Limit')) || null,
            remaining: parseInt(headers.get('X-RateLimit-Remaining')) || null,
            reset: parseInt(headers.get('X-RateLimit-Reset')) || null
        };
    }

    getRateLimitInfo() {
        return { ...this.rateLimitInfo };
    }

    getTimeUntilReset() {
        if (!this.rateLimitInfo.reset) return null;
        return Math.max(0, this.rateLimitInfo.reset - Math.floor(Date.now() / 1000));
    }

    shouldWaitBeforeRequest() {
        return this.rateLimitInfo.remaining === 0 && this.getTimeUntilReset() > 0;
    }
}

class RateLimitError extends Error {
    constructor(message, retryAfter) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = parseInt(retryAfter);
    }
}

class APIError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

// Usage example
const client = new BugRelayAPIClient('your-api-key');

async function createBugWithRetry(bugData) {
    try {
        return await client.makeRequest('POST', '/bugs', bugData);
    } catch (error) {
        if (error instanceof RateLimitError) {
            console.log(`Rate limited. Waiting ${error.retryAfter} seconds...`);
            await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
            return client.makeRequest('POST', '/bugs', bugData);
        }
        throw error;
    }
}
```

#### Python Example with Exponential Backoff

```python
import time
import requests
from typing import Optional, Dict, Any
import logging

class RateLimitError(Exception):
    def __init__(self, message: str, retry_after: int):
        super().__init__(message)
        self.retry_after = retry_after

class BugRelayAPIClient:
    def __init__(self, api_key: str, base_url: str = 'https://api.bugrelay.com/api/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
        self.rate_limit_info = {
            'limit': None,
            'remaining': None,
            'reset': None
        }
        self.logger = logging.getLogger(__name__)

    def _update_rate_limit_info(self, response: requests.Response):
        """Update rate limit information from response headers"""
        headers = response.headers
        self.rate_limit_info = {
            'limit': int(headers.get('X-RateLimit-Limit', 0)) or None,
            'remaining': int(headers.get('X-RateLimit-Remaining', 0)) or None,
            'reset': int(headers.get('X-RateLimit-Reset', 0)) or None
        }

    def _should_wait_before_request(self) -> bool:
        """Check if we should wait before making a request"""
        if self.rate_limit_info['remaining'] == 0 and self.rate_limit_info['reset']:
            time_until_reset = self.rate_limit_info['reset'] - int(time.time())
            return time_until_reset > 0
        return False

    def _wait_for_rate_limit_reset(self):
        """Wait until rate limit resets"""
        if self.rate_limit_info['reset']:
            wait_time = self.rate_limit_info['reset'] - int(time.time())
            if wait_time > 0:
                self.logger.info(f"Waiting {wait_time} seconds for rate limit reset")
                time.sleep(wait_time + 1)  # Add 1 second buffer

    def make_request(self, method: str, endpoint: str, data: Optional[Dict[Any, Any]] = None, 
                    max_retries: int = 3) -> Dict[Any, Any]:
        """Make API request with rate limiting and retry logic"""
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(max_retries + 1):
            # Check if we should wait before making request
            if self._should_wait_before_request():
                self._wait_for_rate_limit_reset()
            
            try:
                if method.upper() in ['POST', 'PUT', 'PATCH'] and data:
                    response = self.session.request(method, url, json=data)
                else:
                    response = self.session.request(method, url)
                
                # Update rate limit info
                self._update_rate_limit_info(response)
                
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    
                    if attempt < max_retries:
                        wait_time = min(retry_after, 2 ** attempt)  # Exponential backoff with cap
                        self.logger.warning(f"Rate limited. Waiting {wait_time} seconds (attempt {attempt + 1})")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise RateLimitError(f"Rate limit exceeded after {max_retries} retries", retry_after)
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.RequestException as e:
                if attempt < max_retries:
                    wait_time = 2 ** attempt  # Exponential backoff
                    self.logger.warning(f"Request failed: {e}. Retrying in {wait_time} seconds")
                    time.sleep(wait_time)
                    continue
                raise
        
        raise Exception(f"Request failed after {max_retries} retries")

    def get_rate_limit_info(self) -> Dict[str, Optional[int]]:
        """Get current rate limit information"""
        return self.rate_limit_info.copy()

    def create_bug(self, bug_data: Dict[Any, Any]) -> Dict[Any, Any]:
        """Create a bug report with automatic retry"""
        return self.make_request('POST', '/bugs', bug_data)

    def list_bugs(self, params: Optional[Dict[str, Any]] = None) -> Dict[Any, Any]:
        """List bugs with optional parameters"""
        endpoint = '/bugs'
        if params:
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            endpoint += f"?{query_string}"
        return self.make_request('GET', endpoint)

# Usage example
client = BugRelayAPIClient('your-api-key')

try:
    # Create bug with automatic retry on rate limit
    bug = client.create_bug({
        'title': 'Application crash on startup',
        'description': 'The app crashes when launched',
        'priority': 'high',
        'application_name': 'MyApp'
    })
    print(f"Bug created: {bug['bug']['id']}")
    
    # Check rate limit status
    rate_info = client.get_rate_limit_info()
    print(f"Rate limit: {rate_info['remaining']}/{rate_info['limit']} remaining")
    
except RateLimitError as e:
    print(f"Rate limit exceeded: {e}")
except Exception as e:
    print(f"API error: {e}")
```

### Advanced Rate Limiting Strategies

#### Request Queue with Rate Limiting

```javascript
class RateLimitedQueue {
    constructor(apiClient, requestsPerMinute = 60) {
        this.apiClient = apiClient;
        this.requestsPerMinute = requestsPerMinute;
        this.queue = [];
        this.processing = false;
        this.requestTimes = [];
    }

    async enqueue(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            this.queue.push({ method, endpoint, data, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            // Clean old request times (older than 1 minute)
            const now = Date.now();
            this.requestTimes = this.requestTimes.filter(time => now - time < 60000);
            
            // Check if we can make a request
            if (this.requestTimes.length >= this.requestsPerMinute) {
                const oldestRequest = Math.min(...this.requestTimes);
                const waitTime = 60000 - (now - oldestRequest);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            
            const request = this.queue.shift();
            this.requestTimes.push(now);
            
            try {
                const result = await this.apiClient.makeRequest(
                    request.method, 
                    request.endpoint, 
                    request.data
                );
                request.resolve(result);
            } catch (error) {
                if (error instanceof RateLimitError) {
                    // Put request back in queue and wait
                    this.queue.unshift(request);
                    await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
                } else {
                    request.reject(error);
                }
            }
        }
        
        this.processing = false;
    }
}

// Usage
const client = new BugRelayAPIClient('your-api-key');
const queue = new RateLimitedQueue(client, 60);

// All requests go through the queue
const bug1 = await queue.enqueue('POST', '/bugs', bugData1);
const bug2 = await queue.enqueue('POST', '/bugs', bugData2);
const bugs = await queue.enqueue('GET', '/bugs');
```

#### Batch Processing with Rate Limiting

```python
import asyncio
import aiohttp
from typing import List, Dict, Any

class BatchProcessor:
    def __init__(self, api_client, batch_size: int = 5, delay_between_batches: float = 1.0):
        self.api_client = api_client
        self.batch_size = batch_size
        self.delay_between_batches = delay_between_batches

    async def process_bugs_batch(self, bugs_data: List[Dict[Any, Any]]) -> List[Dict[Any, Any]]:
        """Process multiple bug reports in batches to respect rate limits"""
        results = []
        
        for i in range(0, len(bugs_data), self.batch_size):
            batch = bugs_data[i:i + self.batch_size]
            batch_results = []
            
            # Process batch concurrently
            tasks = []
            for bug_data in batch:
                task = asyncio.create_task(self._create_bug_with_retry(bug_data))
                tasks.append(task)
            
            # Wait for all tasks in batch to complete
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle results and exceptions
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    print(f"Failed to create bug {i + j}: {result}")
                    results.append({'error': str(result), 'index': i + j})
                else:
                    results.append(result)
            
            # Wait between batches to avoid rate limiting
            if i + self.batch_size < len(bugs_data):
                await asyncio.sleep(self.delay_between_batches)
        
        return results

    async def _create_bug_with_retry(self, bug_data: Dict[Any, Any], max_retries: int = 3) -> Dict[Any, Any]:
        """Create bug with exponential backoff retry"""
        for attempt in range(max_retries + 1):
            try:
                return self.api_client.create_bug(bug_data)
            except RateLimitError as e:
                if attempt < max_retries:
                    wait_time = min(e.retry_after, 2 ** attempt)
                    await asyncio.sleep(wait_time)
                else:
                    raise
            except Exception as e:
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

# Usage
processor = BatchProcessor(client, batch_size=5, delay_between_batches=2.0)
results = await processor.process_bugs_batch(large_bug_list)
```

## Monitoring and Optimization

### Rate Limit Monitoring

#### Track Rate Limit Usage

```javascript
class RateLimitMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            rateLimited: 0,
            averageRemaining: 0,
            peakUsage: 0
        };
        this.history = [];
    }

    recordRequest(rateLimitInfo) {
        this.metrics.requests++;
        
        if (rateLimitInfo.remaining !== null) {
            const usage = rateLimitInfo.limit - rateLimitInfo.remaining;
            this.metrics.peakUsage = Math.max(this.metrics.peakUsage, usage);
            
            // Calculate rolling average
            this.history.push(rateLimitInfo.remaining);
            if (this.history.length > 100) {
                this.history.shift();
            }
            
            this.metrics.averageRemaining = this.history.reduce((a, b) => a + b, 0) / this.history.length;
        }
    }

    recordRateLimit() {
        this.metrics.rateLimited++;
    }

    getMetrics() {
        return {
            ...this.metrics,
            rateLimitPercentage: (this.metrics.rateLimited / this.metrics.requests) * 100
        };
    }

    shouldReduceRequestRate() {
        return this.metrics.averageRemaining < 10 || 
               (this.metrics.rateLimited / this.metrics.requests) > 0.05;
    }
}
```

### Performance Optimization

#### Adaptive Rate Limiting

```python
class AdaptiveRateLimiter:
    def __init__(self, initial_rate: float = 1.0, max_rate: float = 60.0, min_rate: float = 0.1):
        self.current_rate = initial_rate  # requests per second
        self.max_rate = max_rate
        self.min_rate = min_rate
        self.success_count = 0
        self.failure_count = 0
        self.last_adjustment = time.time()

    def record_success(self):
        self.success_count += 1
        self._adjust_rate()

    def record_failure(self):
        self.failure_count += 1
        self._adjust_rate()

    def _adjust_rate(self):
        now = time.time()
        if now - self.last_adjustment < 10:  # Adjust every 10 seconds
            return
        
        total_requests = self.success_count + self.failure_count
        if total_requests == 0:
            return
        
        failure_rate = self.failure_count / total_requests
        
        if failure_rate > 0.1:  # More than 10% failures
            # Reduce rate
            self.current_rate = max(self.min_rate, self.current_rate * 0.8)
        elif failure_rate < 0.01:  # Less than 1% failures
            # Increase rate
            self.current_rate = min(self.max_rate, self.current_rate * 1.1)
        
        # Reset counters
        self.success_count = 0
        self.failure_count = 0
        self.last_adjustment = now

    def get_delay(self) -> float:
        """Get delay between requests in seconds"""
        return 1.0 / self.current_rate

    async def wait(self):
        """Wait appropriate time before next request"""
        await asyncio.sleep(self.get_delay())
```

## Best Practices

### Client-Side Best Practices

1. **Respect Rate Limits**: Always check rate limit headers and adjust request frequency
2. **Implement Exponential Backoff**: Use exponential backoff for retry logic
3. **Cache Responses**: Cache API responses to reduce unnecessary requests
4. **Batch Operations**: Group related operations when possible
5. **Monitor Usage**: Track your rate limit usage and optimize accordingly

### Error Handling

```javascript
class RobustAPIClient {
    async makeRequestWithFullErrorHandling(method, endpoint, data = null) {
        const maxRetries = 3;
        let attempt = 0;
        
        while (attempt <= maxRetries) {
            try {
                // Check if we should wait before request
                if (this.shouldWaitBeforeRequest()) {
                    const waitTime = this.getTimeUntilReset();
                    console.log(`Waiting ${waitTime}s for rate limit reset`);
                    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                }
                
                const response = await this.makeRequest(method, endpoint, data);
                return response;
                
            } catch (error) {
                attempt++;
                
                if (error instanceof RateLimitError) {
                    if (attempt <= maxRetries) {
                        const waitTime = Math.min(error.retryAfter, 2 ** attempt);
                        console.log(`Rate limited. Waiting ${waitTime}s (attempt ${attempt})`);
                        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                        continue;
                    }
                } else if (error.status >= 500 && attempt <= maxRetries) {
                    // Server error, retry with exponential backoff
                    const waitTime = 2 ** attempt;
                    console.log(`Server error. Retrying in ${waitTime}s (attempt ${attempt})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                    continue;
                }
                
                throw error;
            }
        }
    }
}
```

### Request Optimization

1. **Use Pagination**: Request data in smaller chunks using pagination
2. **Filter Results**: Use query parameters to filter results server-side
3. **Compress Requests**: Use gzip compression for large payloads
4. **Connection Pooling**: Reuse HTTP connections when possible

### Monitoring and Alerting

```python
class RateLimitAlerts:
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url
        self.alert_thresholds = {
            'high_usage': 0.8,  # Alert when using 80% of rate limit
            'frequent_limits': 0.1,  # Alert when 10% of requests are rate limited
            'consecutive_failures': 5  # Alert after 5 consecutive rate limit errors
        }
        self.consecutive_failures = 0

    def check_usage_alert(self, rate_limit_info: Dict[str, int]):
        if rate_limit_info['remaining'] and rate_limit_info['limit']:
            usage_percentage = 1 - (rate_limit_info['remaining'] / rate_limit_info['limit'])
            
            if usage_percentage >= self.alert_thresholds['high_usage']:
                self.send_alert(f"High rate limit usage: {usage_percentage:.1%}")

    def record_rate_limit_error(self):
        self.consecutive_failures += 1
        
        if self.consecutive_failures >= self.alert_thresholds['consecutive_failures']:
            self.send_alert(f"Consecutive rate limit errors: {self.consecutive_failures}")

    def record_success(self):
        self.consecutive_failures = 0

    def send_alert(self, message: str):
        if self.webhook_url:
            # Send to Slack, Discord, or other notification service
            print(f"ALERT: {message}")
```

## Troubleshooting

### Common Issues

1. **Unexpected Rate Limiting**
   - Check if multiple clients are using the same IP
   - Verify request frequency is within limits
   - Monitor for background processes making requests

2. **Inconsistent Rate Limit Headers**
   - Headers may be missing during server errors
   - Implement fallback logic for missing headers
   - Don't rely solely on headers for rate limiting

3. **Redis Connection Issues**
   - System falls back to in-memory limiting
   - May cause inconsistent limits across servers
   - Monitor Redis connectivity and performance

### Debug Tools

#### Rate Limit Testing Script

```bash
#!/bin/bash

# Test rate limiting behavior
API_KEY="your-api-key"
BASE_URL="https://api.bugrelay.com/api/v1"

echo "Testing rate limits..."

for i in {1..70}; do
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$BASE_URL/bugs")
    status_code="${response: -3}"
    
    if [ "$status_code" = "429" ]; then
        echo "Request $i: Rate limited (429)"
        break
    else
        echo "Request $i: Success ($status_code)"
    fi
    
    sleep 0.5
done
```

#### Rate Limit Header Inspector

```javascript
function inspectRateLimitHeaders(response) {
    const headers = {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset'),
        window: response.headers.get('X-RateLimit-Window'),
        retryAfter: response.headers.get('Retry-After')
    };
    
    console.log('Rate Limit Headers:', headers);
    
    if (headers.reset) {
        const resetTime = new Date(parseInt(headers.reset) * 1000);
        console.log('Reset Time:', resetTime.toISOString());
        console.log('Time Until Reset:', Math.max(0, resetTime.getTime() - Date.now()) / 1000, 'seconds');
    }
    
    return headers;
}
```

## Support and Resources

### Getting Help

- **Documentation**: [https://docs.bugrelay.com/guides/rate-limiting](https://docs.bugrelay.com/guides/rate-limiting)
- **API Reference**: [https://docs.bugrelay.com/api/](https://docs.bugrelay.com/api/)
- **Support Email**: support@bugrelay.com
- **Status Page**: [https://status.bugrelay.com](https://status.bugrelay.com)

### Rate Limit Increase Requests

If you need higher rate limits for your application:

1. **Contact Support**: Email support@bugrelay.com with your use case
2. **Provide Details**: Include expected request volume and usage patterns
3. **Business Justification**: Explain why higher limits are needed
4. **Implementation Plan**: Show how you'll handle the increased capacity

### Related Documentation

- [API Authentication](/authentication/) - JWT token setup and management
- [Error Handling](/guides/error-handling) - Comprehensive error handling strategies
- [Performance Optimization](/guides/performance) - API performance best practices
- [Webhooks](/guides/webhooks) - Real-time notifications to reduce polling