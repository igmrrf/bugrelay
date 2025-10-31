package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"golang.org/x/time/rate"
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	redisClient *redis.Client
	limiter     *rate.Limiter
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redisClient *redis.Client, requestsPerMinute int) *RateLimiter {
	return &RateLimiter{
		redisClient: redisClient,
		limiter:     rate.NewLimiter(rate.Every(time.Minute/time.Duration(requestsPerMinute)), requestsPerMinute),
	}
}

// RateLimit middleware that limits requests per IP
func (rl *RateLimiter) RateLimit(requestsPerMinute int) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", clientIP)
		
		// Use Redis for distributed rate limiting if available
		if rl.redisClient != nil {
			ctx := c.Request.Context()
			
			// Get current count
			current, err := rl.redisClient.Get(ctx, key).Int()
			if err != nil && err.Error() != "redis: nil" {
				// Redis error, fall back to in-memory limiter
				if !rl.limiter.Allow() {
					c.JSON(http.StatusTooManyRequests, gin.H{
						"error": gin.H{
							"code":      "RATE_LIMIT_EXCEEDED",
							"message":   "Too many requests, please try again later",
							"timestamp": time.Now().UTC(),
						},
					})
					c.Abort()
					return
				}
				c.Next()
				return
			}
			
			if current >= requestsPerMinute {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error": gin.H{
						"code":      "RATE_LIMIT_EXCEEDED",
						"message":   "Too many requests, please try again later",
						"timestamp": time.Now().UTC(),
					},
				})
				c.Abort()
				return
			}
			
			// Increment counter
			pipe := rl.redisClient.Pipeline()
			pipe.Incr(ctx, key)
			pipe.Expire(ctx, key, time.Minute)
			_, err = pipe.Exec(ctx)
			if err != nil {
				// Redis error, but allow the request
				c.Next()
				return
			}
		} else {
			// Use in-memory rate limiter
			if !rl.limiter.Allow() {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error": gin.H{
						"code":      "RATE_LIMIT_EXCEEDED",
						"message":   "Too many requests, please try again later",
						"timestamp": time.Now().UTC(),
					},
				})
				c.Abort()
				return
			}
		}
		
		c.Next()
	}
}

// BugSubmissionRateLimit provides stricter rate limiting for bug submissions
func (rl *RateLimiter) BugSubmissionRateLimit() gin.HandlerFunc {
	return rl.RateLimit(5) // 5 bug submissions per minute per IP
}

// GeneralRateLimit provides general rate limiting
func (rl *RateLimiter) GeneralRateLimit() gin.HandlerFunc {
	return rl.RateLimit(60) // 60 requests per minute per IP
}