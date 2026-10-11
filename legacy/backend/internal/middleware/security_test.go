package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

func TestSecurityHeaders(t *testing.T) {
	router := setupTestRouter()
	security := NewSecurityMiddleware([]string{})
	
	router.Use(security.SecurityHeaders())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	
	// Check security headers
	assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
	assert.Equal(t, "1; mode=block", w.Header().Get("X-XSS-Protection"))
	assert.Equal(t, "strict-origin-when-cross-origin", w.Header().Get("Referrer-Policy"))
	assert.Contains(t, w.Header().Get("Content-Security-Policy"), "default-src 'self'")
}

func TestSecurityHeaders_HSTS(t *testing.T) {
	router := setupTestRouter()
	security := NewSecurityMiddleware([]string{})
	
	router.Use(security.SecurityHeaders())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	// Test with HTTPS
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Strict-Transport-Security"), "max-age=31536000")

	// Test without HTTPS
	req2, _ := http.NewRequest("GET", "/test", nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)
	assert.Empty(t, w2.Header().Get("Strict-Transport-Security"))
}

func TestValidateUserAgent(t *testing.T) {
	router := setupTestRouter()
	security := NewSecurityMiddleware([]string{})
	
	router.Use(security.ValidateUserAgent())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	tests := []struct {
		name           string
		userAgent      string
		expectedStatus int
	}{
		{
			name:           "normal browser",
			userAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "empty user agent",
			userAgent:      "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "suspicious bot",
			userAgent:      "Googlebot/2.1",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "sqlmap scanner",
			userAgent:      "sqlmap/1.0",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "python requests",
			userAgent:      "python-requests/2.25.1",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "curl",
			userAgent:      "curl/7.68.0",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "nmap scanner",
			userAgent:      "Nmap Scripting Engine",
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/test", nil)
			if tt.userAgent != "" {
				req.Header.Set("User-Agent", tt.userAgent)
			}
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			if tt.expectedStatus == http.StatusForbidden {
				assert.Contains(t, w.Body.String(), "SUSPICIOUS_USER_AGENT")
			}
		})
	}
}

func TestIPWhitelist(t *testing.T) {
	security := NewSecurityMiddleware([]string{})

	tests := []struct {
		name           string
		allowedIPs     []string
		clientIP       string
		expectedStatus int
	}{
		{
			name:           "no whitelist - allow all",
			allowedIPs:     []string{},
			clientIP:       "192.168.1.1",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "IP in whitelist",
			allowedIPs:     []string{"192.168.1.1", "10.0.0.1"},
			clientIP:       "192.168.1.1",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "IP not in whitelist",
			allowedIPs:     []string{"192.168.1.1", "10.0.0.1"},
			clientIP:       "192.168.1.2",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "wildcard allows all",
			allowedIPs:     []string{"*"},
			clientIP:       "192.168.1.100",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testRouter := setupTestRouter()
			testRouter.Use(security.IPWhitelist(tt.allowedIPs))
			testRouter.GET("/admin", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "admin"})
			})

			req, _ := http.NewRequest("GET", "/admin", nil)
			req.Header.Set("X-Real-IP", tt.clientIP)
			
			w := httptest.NewRecorder()
			testRouter.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			if tt.expectedStatus == http.StatusForbidden {
				assert.Contains(t, w.Body.String(), "IP_NOT_ALLOWED")
			}
		})
	}
}

func TestRequestSizeLimit(t *testing.T) {
	router := setupTestRouter()
	security := NewSecurityMiddleware([]string{})
	
	maxSize := int64(100) // 100 bytes limit
	router.Use(security.RequestSizeLimit(maxSize))
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	tests := []struct {
		name           string
		bodySize       int
		expectedStatus int
	}{
		{
			name:           "small request",
			bodySize:       50,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "request at limit",
			bodySize:       100,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "request over limit",
			bodySize:       150,
			expectedStatus: http.StatusRequestEntityTooLarge,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := strings.Repeat("a", tt.bodySize)
			req, _ := http.NewRequest("POST", "/test", strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			if tt.expectedStatus == http.StatusRequestEntityTooLarge {
				assert.Contains(t, w.Body.String(), "REQUEST_TOO_LARGE")
			}
		})
	}
}

func TestInputSanitization(t *testing.T) {
	testRouter := setupTestRouter()
	security := NewSecurityMiddleware([]string{})
	
	testRouter.Use(security.InputSanitization())
	testRouter.POST("/test", func(c *gin.Context) {
		// Check if sanitization flag is set
		if sanitize, exists := c.Get("sanitize_input"); exists && sanitize.(bool) {
			c.JSON(http.StatusOK, gin.H{"sanitize": true})
		} else {
			c.JSON(http.StatusOK, gin.H{"sanitize": false})
		}
	})

	tests := []struct {
		name        string
		contentType string
		expectFlag  bool
	}{
		{
			name:        "JSON request",
			contentType: "application/json",
			expectFlag:  true,
		},
		{
			name:        "form data request",
			contentType: "application/x-www-form-urlencoded",
			expectFlag:  false,
		},
		{
			name:        "multipart form request",
			contentType: "multipart/form-data",
			expectFlag:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/test", strings.NewReader("{}"))
			req.Header.Set("Content-Type", tt.contentType)
			
			w := httptest.NewRecorder()
			testRouter.ServeHTTP(w, req)
			
			assert.Equal(t, http.StatusOK, w.Code)
			
			expectedValue := "false"
			if tt.expectFlag {
				expectedValue = "true"
			}
			assert.Contains(t, w.Body.String(), `"sanitize":`+expectedValue)
		})
	}
}

func TestSanitizeString(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "normal string",
			input:    "Hello World",
			expected: "Hello World",
		},
		{
			name:     "string with null bytes",
			input:    "Hello\x00World",
			expected: "HelloWorld",
		},
		{
			name:     "string with control characters",
			input:    "Hello\x01\x02World\x03",
			expected: "HelloWorld",
		},
		{
			name:     "string with tabs and newlines",
			input:    "Hello\tWorld\n",
			expected: "Hello\tWorld",
		},
		{
			name:     "string with leading/trailing spaces",
			input:    "  Hello World  ",
			expected: "Hello World",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SanitizeString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{
			name:     "valid email",
			email:    "test@example.com",
			expected: true,
		},
		{
			name:     "invalid email - no @",
			email:    "testexample.com",
			expected: false,
		},
		{
			name:     "invalid email - no domain",
			email:    "test@",
			expected: false,
		},
		{
			name:     "too long email",
			email:    strings.Repeat("a", 250) + "@example.com",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateEmail(tt.email)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected bool
	}{
		{
			name:     "valid HTTP URL",
			url:      "http://example.com",
			expected: true,
		},
		{
			name:     "valid HTTPS URL",
			url:      "https://example.com",
			expected: true,
		},
		{
			name:     "invalid URL - no protocol",
			url:      "example.com",
			expected: false,
		},
		{
			name:     "too long URL",
			url:      "https://example.com/" + strings.Repeat("a", 2050),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateURL(tt.url)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Benchmark tests for security middleware performance
func BenchmarkSecurityHeaders(b *testing.B) {
	router := setupTestRouter()
	security := NewSecurityMiddleware([]string{})
	
	router.Use(security.SecurityHeaders())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}

func BenchmarkValidateUserAgent(b *testing.B) {
	router := setupTestRouter()
	security := NewSecurityMiddleware([]string{})
	
	router.Use(security.ValidateUserAgent())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}

func BenchmarkSanitizeString(b *testing.B) {
	input := "Hello World with some text and control characters\x01\x02"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		SanitizeString(input)
	}
}