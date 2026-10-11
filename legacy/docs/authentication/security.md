# Security Measures and Rate Limiting

This document provides comprehensive information about the security measures, rate limiting policies, CORS configuration, and middleware implementation in the BugRelay backend server.

## Overview

BugRelay implements multiple layers of security to protect against common web vulnerabilities and attacks:

- **Security Headers**: Protection against XSS, clickjacking, and MIME sniffing
- **Rate Limiting**: IP-based request throttling with Redis backing
- **CORS Configuration**: Strict cross-origin resource sharing policies
- **Input Validation**: Request sanitization and size limits
- **Authentication Security**: JWT token management with blacklisting
- **Admin Protection**: Additional security for administrative endpoints

## Security Headers

### 1. Implemented Security Headers

BugRelay automatically adds the following security headers to all responses:

#### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
**Purpose**: Prevents MIME type sniffing attacks by forcing browsers to respect declared content types.

#### X-Frame-Options
```
X-Frame-Options: DENY
```
**Purpose**: Prevents clickjacking attacks by disallowing the page to be embedded in frames.

#### X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
**Purpose**: Enables browser XSS filtering and blocks pages when XSS attacks are detected.

#### Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
**Purpose**: Controls referrer information sent with requests to protect user privacy.

#### Content-Security-Policy
```
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https:; 
  font-src 'self' https:; 
  connect-src 'self' https:; 
  frame-src https://www.google.com; 
  object-src 'none'; 
  base-uri 'self'
```
**Purpose**: Prevents XSS attacks by controlling resource loading sources.

#### Strict-Transport-Security (HTTPS only)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
**Purpose**: Forces HTTPS connections and prevents protocol downgrade attacks.
**Note**: Only applied when `X-Forwarded-Proto: https` header is present.

### 2. Security Headers Configuration

The security headers are implemented in the `SecurityMiddleware`:

```go
func (s *SecurityMiddleware) SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Security headers implementation
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        
        // CSP and HSTS headers...
        c.Next()
    }
}
```

## CORS Configuration

### 1. CORS Policy

BugRelay implements strict CORS policies that vary by environment:

#### Development Environment
```go
AllowOrigins: []string{
    "http://localhost:3000",
    "http://frontend:3000", 
    "http://127.0.0.1:3000",
}
```

#### Production Environment
```go
AllowOrigins: []string{
    "https://bugrelay.com",
    "https://www.bugrelay.com",
}
```

### 2. CORS Configuration Details

#### Allowed Methods
```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

#### Allowed Headers
```
Origin, Content-Length, Content-Type, Authorization, 
X-Requested-With, X-Request-ID
```

#### Exposed Headers
```
X-Request-ID, X-RateLimit-Remaining, X-RateLimit-Reset
```

#### Additional Settings
- **AllowCredentials**: `true` (enables cookie/auth header sharing)
- **MaxAge**: `12 hours` (preflight cache duration)

### 3. CORS Implementation

```go
corsConfig := cors.Config{
    AllowOrigins: getOriginsByEnvironment(cfg.Server.Environment),
    AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowHeaders: []string{
        "Origin", "Content-Length", "Content-Type", 
        "Authorization", "X-Requested-With", "X-Request-ID",
    },
    ExposeHeaders: []string{
        "X-Request-ID", "X-RateLimit-Remaining", "X-RateLimit-Reset",
    },
    AllowCredentials: true,
    MaxAge: 12 * time.Hour,
}
```

## Rate Limiting

### 1. Rate Limiting Strategy

BugRelay implements distributed rate limiting using Redis with IP-based tracking:

#### General API Rate Limit
- **Limit**: 60 requests per minute per IP
- **Scope**: All API endpoints under `/api/v1`
- **Storage**: Redis with 1-minute expiration

#### Bug Submission Rate Limit
- **Limit**: 5 requests per minute per IP
- **Scope**: Bug creation endpoint (`POST /api/v1/bugs`)
- **Purpose**: Prevents spam and abuse

### 2. Rate Limiting Implementation

#### Redis-Based Rate Limiting
```go
func (rl *RateLimiter) RateLimit(requestsPerMinute int) gin.HandlerFunc {
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        key := fmt.Sprintf("rate_limit:%s", clientIP)
        
        // Check current request count
        current, err := rl.redisClient.Get(ctx, key).Int()
        if current >= requestsPerMinute {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests, please try again later",
                }
            })
            c.Abort()
            return
        }
        
        // Increment counter with expiration
        pipe := rl.redisClient.Pipeline()
        pipe.Incr(ctx, key)
        pipe.Expire(ctx, key, time.Minute)
        pipe.Exec(ctx)
    }
}
```

#### Fallback Rate Limiting
If Redis is unavailable, the system falls back to in-memory rate limiting using Go's `golang.org/x/time/rate` package.

### 3. Rate Limit Response Headers

When rate limiting is active, the following headers are included:

```
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248660
```

### 4. Rate Limit Error Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Input Validation and Sanitization

### 1. Request Size Limits

#### General Request Limit
- **Size**: 1MB for regular API requests
- **Purpose**: Prevents memory exhaustion attacks

#### File Upload Limit
- **Size**: 10MB for file upload endpoints
- **Purpose**: Allows reasonable file attachments while preventing abuse

#### Implementation
```go
func (s *SecurityMiddleware) RequestSizeLimit(maxSize int64) gin.HandlerFunc {
    return func(c *gin.Context) {
        if c.Request.ContentLength > maxSize {
            c.JSON(http.StatusRequestEntityTooLarge, gin.H{
                "error": {
                    "code": "REQUEST_TOO_LARGE",
                    "message": "Request body too large",
                }
            })
            c.Abort()
            return
        }
        c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
    }
}
```

### 2. Input Sanitization

#### String Sanitization
```go
func SanitizeString(input string) string {
    // Remove null bytes
    input = strings.ReplaceAll(input, "\x00", "")
    
    // Remove control characters except newlines and tabs
    var result strings.Builder
    for _, r := range input {
        if r == '\n' || r == '\t' || r >= 32 {
            result.WriteRune(r)
        }
    }
    
    return strings.TrimSpace(result.String())
}
```

#### Email Validation
```go
func ValidateEmail(email string) bool {
    emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
    return emailRegex.MatchString(email) && len(email) <= 254
}
```

#### URL Validation
```go
func ValidateURL(url string) bool {
    urlRegex := regexp.MustCompile(`^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$`)
    return urlRegex.MatchString(url) && len(url) <= 2048
}
```

## User Agent Validation

### 1. Suspicious Pattern Detection

In production, BugRelay validates user agents to block suspicious automated requests:

#### Blocked Patterns
- **Bots and Crawlers**: `bot|crawler|spider|scraper`
- **Security Tools**: `sqlmap|nmap|nikto|dirb|gobuster`
- **Automated Clients**: `python-requests|curl|wget`

#### Implementation
```go
func (s *SecurityMiddleware) ValidateUserAgent() gin.HandlerFunc {
    suspiciousPatterns := []*regexp.Regexp{
        regexp.MustCompile(`(?i)(bot|crawler|spider|scraper)`),
        regexp.MustCompile(`(?i)(sqlmap|nmap|nikto|dirb|gobuster)`),
        regexp.MustCompile(`(?i)(python-requests|curl|wget)`),
    }
    
    return func(c *gin.Context) {
        userAgent := c.GetHeader("User-Agent")
        for _, pattern := range suspiciousPatterns {
            if pattern.MatchString(userAgent) {
                c.JSON(http.StatusForbidden, gin.H{
                    "error": {
                        "code": "SUSPICIOUS_USER_AGENT",
                        "message": "Access denied",
                    }
                })
                c.Abort()
                return
            }
        }
    }
}
```

### 2. Environment-Based Application

- **Development**: User agent validation is disabled
- **Production**: Full user agent validation is enabled

## Admin Endpoint Security

### 1. Multi-Layer Protection

Admin endpoints have additional security measures:

#### Authentication Requirements
1. **Valid JWT Token**: Must be authenticated user
2. **Admin Privileges**: `is_admin` flag must be true
3. **IP Whitelist**: (Production only) Restricted to specific IP addresses

#### Implementation
```go
admin := v1.Group("/admin")
admin.Use(authMiddleware.RequireAdmin())

// IP whitelist in production
if cfg.Server.Environment == "production" {
    adminIPs := []string{} // Configure admin IPs
    admin.Use(securityMiddleware.IPWhitelist(adminIPs))
}
```

### 2. IP Whitelist Configuration

#### Development
- No IP restrictions applied
- All authenticated admin users can access admin endpoints

#### Production
- Configurable IP whitelist
- Only specified IP addresses can access admin endpoints
- Returns 403 Forbidden for non-whitelisted IPs

#### IP Whitelist Implementation
```go
func (s *SecurityMiddleware) IPWhitelist(allowedIPs []string) gin.HandlerFunc {
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        
        for _, allowedIP := range allowedIPs {
            if clientIP == allowedIP || allowedIP == "*" {
                c.Next()
                return
            }
        }
        
        c.JSON(http.StatusForbidden, gin.H{
            "error": {
                "code": "IP_NOT_ALLOWED",
                "message": "Access denied from this IP address",
            }
        })
        c.Abort()
    }
}
```

## JWT Token Security

### 1. Token Security Features

#### Signing Algorithm
- **Algorithm**: HMAC-SHA256
- **Secret**: Configurable via `JWT_SECRET` environment variable
- **Rotation**: Secret should be rotated regularly in production

#### Token Blacklisting
- **Storage**: Redis for fast lookup, database for persistence
- **Triggers**: Logout, token refresh, password reset, security events
- **Cleanup**: Automatic removal of expired blacklisted tokens

#### Token Validation Process
1. Parse JWT and validate signature
2. Check token expiration
3. Verify token type (access vs refresh)
4. Check blacklist status
5. Validate issuer and audience claims

### 2. Token Lifecycle Management

#### Access Tokens
- **Lifetime**: 15 minutes (configurable)
- **Purpose**: API access authentication
- **Refresh**: Via refresh token

#### Refresh Tokens
- **Lifetime**: 7 days (configurable)
- **Purpose**: Generate new access tokens
- **Security**: Blacklisted after use (rotation)

## Logging and Monitoring

### 1. Security Event Logging

BugRelay logs security-relevant events for monitoring and analysis:

#### Logged Events
- Authentication attempts (success/failure)
- Rate limit violations
- Suspicious user agent detections
- Admin access attempts
- Token blacklisting events
- Input validation failures

#### Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "warn",
  "event": "rate_limit_exceeded",
  "client_ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "endpoint": "/api/v1/bugs",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Audit Trail

Admin actions are logged with detailed audit information:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "event": "admin_action",
  "action": "bug_flagged",
  "admin_user_id": "admin-uuid",
  "target_resource": "bug:123",
  "client_ip": "10.0.0.5",
  "details": {
    "reason": "spam_content",
    "previous_status": "open"
  }
}
```

## Environment-Specific Security

### 1. Development Environment

#### Relaxed Policies
- CORS allows localhost origins
- User agent validation disabled
- No IP whitelist for admin endpoints
- Detailed error messages for debugging

#### Security Measures Still Applied
- All security headers
- Rate limiting (with lower thresholds)
- Input validation and sanitization
- JWT token security

### 2. Production Environment

#### Strict Policies
- CORS limited to specific domains
- User agent validation enabled
- IP whitelist for admin endpoints
- Generic error messages

#### Enhanced Security
- HSTS headers for HTTPS
- Stricter rate limiting
- Enhanced logging and monitoring
- Regular security token rotation

## Configuration

### 1. Environment Variables

#### Security Configuration
```bash
# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-key
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=168h

# Environment
ENVIRONMENT=production

# Rate Limiting (Redis required)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Admin Security
ADMIN_ALLOWED_IPS=10.0.0.1,10.0.0.2

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

#### CORS Configuration
```bash
# Production domains
CORS_ALLOWED_ORIGINS=https://bugrelay.com,https://www.bugrelay.com

# Development (automatic)
# CORS allows localhost origins in development
```

### 2. Security Checklist

#### Pre-Production Security Review
- [ ] Change default JWT secret
- [ ] Configure production CORS origins
- [ ] Set up Redis for rate limiting
- [ ] Configure admin IP whitelist
- [ ] Enable HTTPS and HSTS
- [ ] Set up security monitoring
- [ ] Review and test rate limits
- [ ] Validate input sanitization
- [ ] Test authentication flows
- [ ] Verify error handling

## Security Best Practices

### 1. Token Management
- Use strong, unique JWT secrets
- Rotate secrets regularly
- Implement proper token blacklisting
- Use short access token lifetimes
- Secure refresh token storage

### 2. Rate Limiting
- Monitor rate limit violations
- Adjust limits based on usage patterns
- Implement progressive penalties for repeat offenders
- Use distributed rate limiting for scalability

### 3. Input Validation
- Validate all user inputs
- Sanitize data before processing
- Use parameterized queries for database operations
- Implement file type and size restrictions

### 4. Monitoring and Alerting
- Log security events
- Monitor for suspicious patterns
- Set up alerts for security violations
- Regular security audit reviews

### 5. CORS and Headers
- Use strict CORS policies in production
- Implement all recommended security headers
- Regular review of CSP policies
- Test cross-origin functionality

## Troubleshooting Security Issues

### 1. CORS Errors

#### Problem: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solution**: Verify the requesting origin is in the allowed origins list

#### Problem: "CORS policy: Request header field authorization is not allowed"
**Solution**: Ensure "Authorization" is in the `AllowHeaders` configuration

### 2. Rate Limiting Issues

#### Problem: Legitimate users hitting rate limits
**Solution**: Review and adjust rate limit thresholds, implement user-based rate limiting

#### Problem: Rate limiting not working
**Solution**: Verify Redis connection and rate limiter configuration

### 3. Authentication Problems

#### Problem: Valid tokens being rejected
**Solution**: Check token blacklist status and JWT secret configuration

#### Problem: Admin endpoints returning 403
**Solution**: Verify user has admin privileges and IP is whitelisted (production)

### 4. Security Header Issues

#### Problem: CSP violations in browser console
**Solution**: Review and update Content-Security-Policy to allow necessary resources

#### Problem: Mixed content warnings
**Solution**: Ensure all resources are loaded over HTTPS in production

## Security Updates and Maintenance

### 1. Regular Security Tasks
- Review and rotate JWT secrets
- Update rate limiting thresholds based on usage
- Review and update CORS policies
- Monitor security logs for anomalies
- Update IP whitelists as needed

### 2. Security Monitoring
- Set up alerts for repeated rate limit violations
- Monitor for suspicious user agent patterns
- Track authentication failure rates
- Review admin access logs regularly

### 3. Incident Response
- Document security incident procedures
- Implement token revocation capabilities
- Prepare IP blocking mechanisms
- Establish communication protocols for security events