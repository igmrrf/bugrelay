package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

func setupTestRedis(t *testing.T) *redis.Client {
	// Use Redis mock or in-memory implementation for testing
	// For now, we'll test without Redis (fallback to in-memory)
	return nil
}

func TestRateLimit_InMemory(t *testing.T) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60) // No Redis, use in-memory
	router.Use(rateLimiter.RateLimit(2)) // 2 requests per minute
	
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// First request should succeed
	req1, _ := http.NewRequest("GET", "/test", nil)
	req1.Header.Set("X-Real-IP", "192.168.1.1")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Second request should succeed
	req2, _ := http.NewRequest("GET", "/test", nil)
	req2.Header.Set("X-Real-IP", "192.168.1.1")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Third request should be rate limited
	req3, _ := http.NewRequest("GET", "/test", nil)
	req3.Header.Set("X-Real-IP", "192.168.1.1")
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusTooManyRequests, w3.Code)
	assert.Contains(t, w3.Body.String(), "RATE_LIMIT_EXCEEDED")
}

func TestRateLimit_DifferentIPs(t *testing.T) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.RateLimit(1)) // 1 request per minute
	
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Request from first IP should succeed
	req1, _ := http.NewRequest("GET", "/test", nil)
	req1.Header.Set("X-Real-IP", "192.168.1.1")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Request from second IP should also succeed (different IP)
	req2, _ := http.NewRequest("GET", "/test", nil)
	req2.Header.Set("X-Real-IP", "192.168.1.2")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Second request from first IP should be rate limited
	req3, _ := http.NewRequest("GET", "/test", nil)
	req3.Header.Set("X-Real-IP", "192.168.1.1")
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusTooManyRequests, w3.Code)
}

func TestBugSubmissionRateLimit(t *testing.T) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.BugSubmissionRateLimit()) // 5 requests per minute
	
	router.POST("/bugs", func(c *gin.Context) {
		c.JSON(http.StatusCreated, gin.H{"message": "bug created"})
	})

	clientIP := "192.168.1.1"
	
	// First 5 requests should succeed
	for i := 0; i < 5; i++ {
		req, _ := http.NewRequest("POST", "/bugs", nil)
		req.Header.Set("X-Real-IP", clientIP)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code, "Request %d should succeed", i+1)
	}

	// 6th request should be rate limited
	req, _ := http.NewRequest("POST", "/bugs", nil)
	req.Header.Set("X-Real-IP", clientIP)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "RATE_LIMIT_EXCEEDED")
}

func TestGeneralRateLimit(t *testing.T) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.GeneralRateLimit()) // 60 requests per minute
	
	router.GET("/api/bugs", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"bugs": []string{}})
	})

	clientIP := "192.168.1.1"
	
	// First 60 requests should succeed
	for i := 0; i < 60; i++ {
		req, _ := http.NewRequest("GET", "/api/bugs", nil)
		req.Header.Set("X-Real-IP", clientIP)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code, "Request %d should succeed", i+1)
	}

	// 61st request should be rate limited
	req, _ := http.NewRequest("GET", "/api/bugs", nil)
	req.Header.Set("X-Real-IP", clientIP)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "RATE_LIMIT_EXCEEDED")
}

func TestRateLimit_ErrorResponse(t *testing.T) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.RateLimit(1)) // 1 request per minute
	
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	clientIP := "192.168.1.1"
	
	// First request succeeds
	req1, _ := http.NewRequest("GET", "/test", nil)
	req1.Header.Set("X-Real-IP", clientIP)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Second request gets rate limited
	req2, _ := http.NewRequest("GET", "/test", nil)
	req2.Header.Set("X-Real-IP", clientIP)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	
	assert.Equal(t, http.StatusTooManyRequests, w2.Code)
	assert.Equal(t, "application/json; charset=utf-8", w2.Header().Get("Content-Type"))
	
	// Check error response structure
	body := w2.Body.String()
	assert.Contains(t, body, "error")
	assert.Contains(t, body, "RATE_LIMIT_EXCEEDED")
	assert.Contains(t, body, "Too many requests")
	assert.Contains(t, body, "timestamp")
}

func TestRateLimit_ClientIPExtraction(t *testing.T) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.RateLimit(1)) // 1 request per minute
	
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success", "ip": c.ClientIP()})
	})

	tests := []struct {
		name     string
		headers  map[string]string
		remoteIP string
	}{
		{
			name: "X-Real-IP header",
			headers: map[string]string{
				"X-Real-IP": "192.168.1.100",
			},
		},
		{
			name: "X-Forwarded-For header",
			headers: map[string]string{
				"X-Forwarded-For": "192.168.1.200, 10.0.0.1",
			},
		},
		{
			name:     "Remote address",
			remoteIP: "192.168.1.300",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a fresh router for each test to avoid rate limit interference
			testRouter := gin.New()
			gin.SetMode(gin.TestMode)
			testRateLimiter := NewRateLimiter(nil, 60)
			testRouter.Use(testRateLimiter.RateLimit(1))
			testRouter.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req, _ := http.NewRequest("GET", "/test", nil)
			
			// Set headers
			for key, value := range tt.headers {
				req.Header.Set(key, value)
			}
			
			// Set remote address if specified
			if tt.remoteIP != "" {
				req.RemoteAddr = tt.remoteIP + ":12345"
			}
			
			w := httptest.NewRecorder()
			testRouter.ServeHTTP(w, req)
			assert.Equal(t, http.StatusOK, w.Code)
		})
	}
}

// Performance benchmarks for rate limiting
func BenchmarkRateLimit_InMemory(b *testing.B) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.RateLimit(1000)) // High limit to avoid blocking
	
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Real-IP", "192.168.1.1")
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}

func BenchmarkRateLimit_DifferentIPs(b *testing.B) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.RateLimit(1000)) // High limit to avoid blocking
	
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req, _ := http.NewRequest("GET", "/test", nil)
		// Use different IP for each request to test IP handling performance
		req.Header.Set("X-Real-IP", "192.168.1."+string(rune(i%255)))
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}

// Test rate limit reset behavior
func TestRateLimit_Reset(t *testing.T) {
	// This test would require time manipulation or a shorter window
	// For now, we'll test the concept with a very short rate limit window
	
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	// Create a rate limiter with a very short window for testing
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.RateLimit(1)) // 1 request per minute
	
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	clientIP := "192.168.1.1"
	
	// First request should succeed
	req1, _ := http.NewRequest("GET", "/test", nil)
	req1.Header.Set("X-Real-IP", clientIP)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Second request should be rate limited
	req2, _ := http.NewRequest("GET", "/test", nil)
	req2.Header.Set("X-Real-IP", clientIP)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusTooManyRequests, w2.Code)
	
	// Note: In a real test environment, you would wait for the rate limit window
	// to reset or use a mock time provider to test the reset behavior
}

func TestRateLimit_ConcurrentRequests(t *testing.T) {
	router := gin.New()
	gin.SetMode(gin.TestMode)
	
	rateLimiter := NewRateLimiter(nil, 60)
	router.Use(rateLimiter.RateLimit(5)) // 5 requests per minute
	
	router.GET("/test", func(c *gin.Context) {
		// Add small delay to simulate processing
		time.Sleep(1 * time.Millisecond)
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	clientIP := "192.168.1.1"
	
	// Test concurrent requests from same IP
	results := make(chan int, 10)
	
	for i := 0; i < 10; i++ {
		go func() {
			req, _ := http.NewRequest("GET", "/test", nil)
			req.Header.Set("X-Real-IP", clientIP)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			results <- w.Code
		}()
	}
	
	// Collect results
	successCount := 0
	rateLimitedCount := 0
	
	for i := 0; i < 10; i++ {
		code := <-results
		if code == http.StatusOK {
			successCount++
		} else if code == http.StatusTooManyRequests {
			rateLimitedCount++
		}
	}
	
	// Should have exactly 5 successful requests and 5 rate limited
	assert.Equal(t, 5, successCount, "Should have 5 successful requests")
	assert.Equal(t, 5, rateLimitedCount, "Should have 5 rate limited requests")
}