# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when working with the BugRelay backend API. Issues are organized by category with step-by-step solutions.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [API Request Problems](#api-request-problems)
- [Rate Limiting](#rate-limiting)
- [File Upload Issues](#file-upload-issues)
- [Database Connection Problems](#database-connection-problems)
- [Performance Issues](#performance-issues)
- [Deployment Problems](#deployment-problems)
- [Integration Issues](#integration-issues)

## Authentication Issues

### Invalid Token Error

**Problem**: Getting `401 Unauthorized` or "Invalid token" errors

**Symptoms**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Solutions**:

1. **Check Token Format**:
   ```bash
   # Correct format
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # Common mistakes
   Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Missing "Bearer "
   Authorization: Bearer: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Extra colon
   ```

2. **Verify Token Expiration**:
   ```javascript
   // Decode JWT to check expiration
   const jwt = require('jsonwebtoken');
   
   try {
     const decoded = jwt.decode(token);
     const now = Math.floor(Date.now() / 1000);
     
     if (decoded.exp < now) {
       console.log('Token expired at:', new Date(decoded.exp * 1000));
       // Use refresh token to get new access token
     }
   } catch (error) {
     console.log('Invalid token format');
   }
   ```

3. **Refresh Expired Token**:
   ```bash
   curl -X POST https://api.bugrelay.com/api/v1/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
   ```

### Login Failures

**Problem**: Cannot authenticate with valid credentials

**Symptoms**:
- `401 Unauthorized` on login
- "Invalid credentials" message
- Account locked messages

**Solutions**:

1. **Verify Credentials**:
   ```bash
   # Test with curl
   curl -X POST https://api.bugrelay.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-email@example.com",
       "password": "your-password"
     }' \
     -v  # Verbose output for debugging
   ```

2. **Check Account Status**:
   - Verify email address is confirmed
   - Check if account is suspended
   - Ensure password meets requirements

3. **Reset Password**:
   ```bash
   curl -X POST https://api.bugrelay.com/api/v1/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "your-email@example.com"}'
   ```

### OAuth Integration Issues

**Problem**: OAuth authentication not working

**Common Issues**:

1. **Incorrect Redirect URI**:
   ```javascript
   // Ensure redirect URI matches exactly
   const redirectUri = 'https://yourapp.com/auth/callback';  // Must match OAuth app config
   ```

2. **Missing Scopes**:
   ```javascript
   // Include required scopes
   const authUrl = `https://api.bugrelay.com/auth/oauth/google?scope=read:profile,write:bugs&redirect_uri=${redirectUri}`;
   ```

3. **State Parameter Mismatch**:
   ```javascript
   // Always verify state parameter
   const state = generateRandomString();
   localStorage.setItem('oauth_state', state);
   
   // In callback handler
   const returnedState = urlParams.get('state');
   const storedState = localStorage.getItem('oauth_state');
   
   if (returnedState !== storedState) {
     throw new Error('Invalid state parameter');
   }
   ```

## API Request Problems

### Network Connection Issues

**Problem**: Requests failing with network errors

**Symptoms**:
- Connection timeout
- DNS resolution failures
- SSL certificate errors

**Solutions**:

1. **Check API Status**:
   ```bash
   # Test basic connectivity
   curl -I https://api.bugrelay.com/health
   
   # Check DNS resolution
   nslookup api.bugrelay.com
   
   # Test SSL certificate
   openssl s_client -connect api.bugrelay.com:443 -servername api.bugrelay.com
   ```

2. **Verify Network Configuration**:
   ```bash
   # Check if behind corporate firewall
   curl -x http://proxy.company.com:8080 https://api.bugrelay.com/health
   
   # Test with different DNS
   curl --dns-servers 8.8.8.8 https://api.bugrelay.com/health
   ```

3. **Configure Timeouts**:
   ```javascript
   const axios = require('axios');
   
   const client = axios.create({
     baseURL: 'https://api.bugrelay.com',
     timeout: 30000,  // 30 seconds
     retry: 3,
     retryDelay: 1000
   });
   ```

### Validation Errors

**Problem**: Getting `400 Bad Request` with validation errors

**Symptoms**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

**Solutions**:

1. **Check Required Fields**:
   ```javascript
   // Bug creation example
   const bugData = {
     title: "Bug title",           // Required, 5-255 characters
     description: "Description",   // Required, min 10 characters
     application_id: "uuid",       // Required, valid UUID
     priority: "medium",           // Optional, enum: low|medium|high|critical
     tags: ["tag1", "tag2"]        // Optional, array of strings
   };
   ```

2. **Validate Data Types**:
   ```javascript
   // Common validation issues
   const validBug = {
     title: "String title",                    // ✓ String
     application_id: "123e4567-e89b-12d3-a456-426614174000",  // ✓ Valid UUID
     priority: "high",                         // ✓ Valid enum value
     tags: ["mobile", "ios"]                   // ✓ Array of strings
   };
   
   const invalidBug = {
     title: 123,                               // ✗ Should be string
     application_id: "invalid-uuid",          // ✗ Invalid UUID format
     priority: "urgent",                       // ✗ Invalid enum value
     tags: "mobile,ios"                        // ✗ Should be array
   };
   ```

3. **Handle Validation Errors**:
   ```javascript
   try {
     const result = await api.createBug(bugData);
   } catch (error) {
     if (error.response?.status === 400) {
       const validationError = error.response.data.error;
       console.log(`Validation failed for field: ${validationError.details.field}`);
       console.log(`Issue: ${validationError.details.issue}`);
       
       // Handle specific validation errors
       switch (validationError.details.field) {
         case 'email':
           showError('Please enter a valid email address');
           break;
         case 'title':
           showError('Title must be between 5 and 255 characters');
           break;
         default:
           showError(validationError.message);
       }
     }
   }
   ```

### CORS Issues

**Problem**: Cross-origin requests blocked by browser

**Symptoms**:
- "CORS policy" errors in browser console
- Preflight request failures
- Missing CORS headers

**Solutions**:

1. **Check Allowed Origins**:
   ```bash
   # Test CORS headers
   curl -H "Origin: https://yourapp.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        -X OPTIONS \
        https://api.bugrelay.com/api/v1/bugs
   ```

2. **Configure Environment Variables**:
   ```bash
   # In your .env file
   CORS_ALLOWED_ORIGINS=https://yourapp.com,https://app.yourcompany.com,http://localhost:3000
   ```

3. **Handle Preflight Requests**:
   ```javascript
   // Ensure your client sends proper headers
   const headers = {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${token}`
   };
   
   // For custom headers, browser will send preflight request
   fetch('https://api.bugrelay.com/api/v1/bugs', {
     method: 'POST',
     headers,
     body: JSON.stringify(bugData)
   });
   ```

## Rate Limiting

### Rate Limit Exceeded

**Problem**: Getting `429 Too Many Requests` errors

**Symptoms**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retry_after": 60
  }
}
```

**Rate Limits**:
- Anonymous users: 10 requests/minute
- Authenticated users: 100 requests/minute
- File uploads: 3 requests/minute
- Bug submissions: 5 requests/minute

**Solutions**:

1. **Implement Exponential Backoff**:
   ```javascript
   async function makeRequestWithRetry(requestFn, maxRetries = 3) {
     for (let attempt = 0; attempt < maxRetries; attempt++) {
       try {
         return await requestFn();
       } catch (error) {
         if (error.response?.status === 429) {
           const retryAfter = error.response.data.error.retry_after || Math.pow(2, attempt);
           console.log(`Rate limited, waiting ${retryAfter} seconds...`);
           await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
         } else {
           throw error;
         }
       }
     }
     throw new Error('Max retries exceeded');
   }
   ```

2. **Implement Request Queuing**:
   ```javascript
   class RateLimitedClient {
     constructor(requestsPerMinute = 90) {  // Leave some buffer
       this.queue = [];
       this.processing = false;
       this.interval = 60000 / requestsPerMinute;  // ms between requests
       this.lastRequest = 0;
     }
   
     async request(requestFn) {
       return new Promise((resolve, reject) => {
         this.queue.push({ requestFn, resolve, reject });
         this.processQueue();
       });
     }
   
     async processQueue() {
       if (this.processing || this.queue.length === 0) return;
       
       this.processing = true;
       
       while (this.queue.length > 0) {
         const now = Date.now();
         const timeSinceLastRequest = now - this.lastRequest;
         
         if (timeSinceLastRequest < this.interval) {
           await new Promise(resolve => 
             setTimeout(resolve, this.interval - timeSinceLastRequest)
           );
         }
         
         const { requestFn, resolve, reject } = this.queue.shift();
         
         try {
           const result = await requestFn();
           resolve(result);
         } catch (error) {
           reject(error);
         }
         
         this.lastRequest = Date.now();
       }
       
       this.processing = false;
     }
   }
   ```

3. **Monitor Rate Limit Headers**:
   ```javascript
   const response = await fetch('/api/v1/bugs', options);
   
   // Check rate limit headers
   const remaining = response.headers.get('X-RateLimit-Remaining');
   const reset = response.headers.get('X-RateLimit-Reset');
   
   console.log(`Requests remaining: ${remaining}`);
   console.log(`Rate limit resets at: ${new Date(reset * 1000)}`);
   
   if (remaining < 10) {
     console.warn('Approaching rate limit, slowing down requests');
   }
   ```

## File Upload Issues

### Upload Failures

**Problem**: File uploads failing or timing out

**Common Issues**:

1. **File Size Limits**:
   ```javascript
   // Check file size before upload (10MB limit)
   const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB
   
   if (file.size > MAX_FILE_SIZE) {
     throw new Error('File too large. Maximum size is 10MB.');
   }
   ```

2. **Unsupported File Types**:
   ```javascript
   // Allowed file types
   const ALLOWED_TYPES = [
     'image/jpeg', 'image/png', 'image/gif', 'image/webp',
     'application/pdf', 'text/plain', 'application/json'
   ];
   
   if (!ALLOWED_TYPES.includes(file.type)) {
     throw new Error('Unsupported file type');
   }
   ```

3. **Upload with Progress Tracking**:
   ```javascript
   async function uploadFile(bugId, file, onProgress) {
     const formData = new FormData();
     formData.append('file', file);
   
     return new Promise((resolve, reject) => {
       const xhr = new XMLHttpRequest();
       
       xhr.upload.addEventListener('progress', (e) => {
         if (e.lengthComputable) {
           const progress = (e.loaded / e.total) * 100;
           onProgress(progress);
         }
       });
       
       xhr.addEventListener('load', () => {
         if (xhr.status === 200) {
           resolve(JSON.parse(xhr.responseText));
         } else {
           reject(new Error(`Upload failed: ${xhr.statusText}`));
         }
       });
       
       xhr.addEventListener('error', () => {
         reject(new Error('Upload failed'));
       });
       
       xhr.open('POST', `/api/v1/bugs/${bugId}/attachments`);
       xhr.setRequestHeader('Authorization', `Bearer ${token}`);
       xhr.send(formData);
     });
   }
   ```

### Image Processing Issues

**Problem**: Images not displaying or processing correctly

**Solutions**:

1. **Validate Image Format**:
   ```javascript
   function validateImage(file) {
     return new Promise((resolve, reject) => {
       const img = new Image();
       
       img.onload = () => {
         // Check dimensions
         if (img.width > 4000 || img.height > 4000) {
           reject(new Error('Image dimensions too large (max 4000x4000)'));
         } else {
           resolve(true);
         }
       };
       
       img.onerror = () => {
         reject(new Error('Invalid image file'));
       };
       
       img.src = URL.createObjectURL(file);
     });
   }
   ```

2. **Compress Large Images**:
   ```javascript
   function compressImage(file, maxWidth = 1920, quality = 0.8) {
     return new Promise((resolve) => {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       const img = new Image();
       
       img.onload = () => {
         const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
         canvas.width = img.width * ratio;
         canvas.height = img.height * ratio;
         
         ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
         
         canvas.toBlob(resolve, 'image/jpeg', quality);
       };
       
       img.src = URL.createObjectURL(file);
     });
   }
   ```

## Database Connection Problems

### Connection Failures

**Problem**: Database connection errors

**Symptoms**:
- "Connection refused" errors
- Timeout errors
- "Too many connections" errors

**Solutions**:

1. **Check Database Status**:
   ```bash
   # Test PostgreSQL connection
   psql -h localhost -U bugrelay -d bugrelay -c "SELECT 1;"
   
   # Check connection limits
   psql -h localhost -U bugrelay -d bugrelay -c "SHOW max_connections;"
   psql -h localhost -U bugrelay -d bugrelay -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **Verify Connection String**:
   ```bash
   # Correct format
   DATABASE_URL=postgres://username:password@host:port/database
   
   # With SSL
   DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
   ```

3. **Connection Pool Configuration**:
   ```go
   // In Go backend
   config := &pgxpool.Config{
       MaxConns:        30,
       MinConns:        5,
       MaxConnLifetime: time.Hour,
       MaxConnIdleTime: time.Minute * 30,
   }
   ```

### Migration Issues

**Problem**: Database migrations failing

**Solutions**:

1. **Check Migration Status**:
   ```bash
   # List applied migrations
   go run cmd/migrate/main.go version
   
   # Check for pending migrations
   go run cmd/migrate/main.go up -dry-run
   ```

2. **Fix Failed Migrations**:
   ```bash
   # Force migration version (use carefully)
   go run cmd/migrate/main.go force 001
   
   # Rollback and retry
   go run cmd/migrate/main.go down 1
   go run cmd/migrate/main.go up
   ```

## Performance Issues

### Slow API Responses

**Problem**: API endpoints responding slowly

**Diagnostic Steps**:

1. **Check Database Performance**:
   ```sql
   -- Find slow queries
   SELECT query, mean_time, calls, total_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   
   -- Check for missing indexes
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public'
   ORDER BY n_distinct DESC;
   ```

2. **Monitor API Metrics**:
   ```bash
   # Check API health endpoint
   curl https://api.bugrelay.com/health
   
   # Monitor response times
   curl -w "@curl-format.txt" -o /dev/null -s https://api.bugrelay.com/api/v1/bugs
   ```

3. **Optimize Queries**:
   ```javascript
   // Use pagination for large datasets
   const bugs = await api.getBugs({
     limit: 20,
     offset: 0,
     sort: 'created_at',
     order: 'desc'
   });
   
   // Use specific fields instead of SELECT *
   const bugs = await api.getBugs({
     fields: 'id,title,status,priority,created_at'
   });
   ```

### Memory Issues

**Problem**: High memory usage or memory leaks

**Solutions**:

1. **Monitor Memory Usage**:
   ```bash
   # Check container memory usage
   docker stats bugrelay-backend
   
   # Monitor Go memory stats
   curl https://api.bugrelay.com/debug/pprof/heap
   ```

2. **Optimize Memory Usage**:
   ```go
   // Use connection pooling
   pool, err := pgxpool.Connect(context.Background(), databaseURL)
   
   // Limit concurrent requests
   semaphore := make(chan struct{}, 100)  // Max 100 concurrent requests
   ```

## Deployment Problems

### Docker Issues

**Problem**: Docker containers not starting or crashing

**Solutions**:

1. **Check Container Logs**:
   ```bash
   # View container logs
   docker-compose logs bugrelay-backend
   
   # Follow logs in real-time
   docker-compose logs -f bugrelay-backend
   
   # Check container status
   docker-compose ps
   ```

2. **Debug Container Issues**:
   ```bash
   # Run container interactively
   docker run -it --rm bugrelay/backend:latest /bin/sh
   
   # Check environment variables
   docker-compose exec bugrelay-backend env
   
   # Test database connection from container
   docker-compose exec bugrelay-backend nc -zv postgres 5432
   ```

3. **Fix Common Docker Issues**:
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     bugrelay:
       image: bugrelay/backend:latest
       restart: unless-stopped  # Auto-restart on failure
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
         interval: 30s
         timeout: 10s
         retries: 3
       depends_on:
         postgres:
           condition: service_healthy
   ```

### SSL/TLS Issues

**Problem**: HTTPS certificate problems

**Solutions**:

1. **Check Certificate Status**:
   ```bash
   # Test SSL certificate
   openssl s_client -connect api.bugrelay.com:443 -servername api.bugrelay.com
   
   # Check certificate expiration
   echo | openssl s_client -connect api.bugrelay.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

2. **Renew Let's Encrypt Certificate**:
   ```bash
   # Renew certificate
   sudo certbot renew --nginx
   
   # Test renewal
   sudo certbot renew --dry-run
   ```

## Integration Issues

### Webhook Problems

**Problem**: Webhooks not being received or processed

**Solutions**:

1. **Test Webhook Endpoint**:
   ```bash
   # Test webhook URL
   curl -X POST https://yourapp.com/webhooks/bugrelay \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

2. **Verify Webhook Signatures**:
   ```javascript
   const crypto = require('crypto');
   
   function verifyWebhookSignature(payload, signature, secret) {
     const expectedSignature = crypto
       .createHmac('sha256', secret)
       .update(payload)
       .digest('hex');
     
     return crypto.timingSafeEqual(
       Buffer.from(signature),
       Buffer.from(expectedSignature)
     );
   }
   ```

3. **Handle Webhook Failures**:
   ```javascript
   app.post('/webhooks/bugrelay', (req, res) => {
     try {
       // Process webhook
       processWebhook(req.body);
       res.status(200).json({ success: true });
     } catch (error) {
       console.error('Webhook processing failed:', error);
       res.status(500).json({ error: error.message });
     }
   });
   ```

## Getting Additional Help

### Debug Information to Collect

When reporting issues, include:

1. **API Request Details**:
   ```bash
   # Full curl command with headers
   curl -X POST https://api.bugrelay.com/api/v1/bugs \
     -H "Authorization: Bearer [REDACTED]" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","description":"Test bug"}' \
     -v
   ```

2. **Error Response**:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid input data",
       "details": {...}
     }
   }
   ```

3. **Environment Information**:
   - API version
   - Client library version
   - Operating system
   - Network configuration

### Support Channels

- **Documentation**: [API Reference](/api/)
- **GitHub Issues**: [Report bugs](https://github.com/your-org/bugrelay/issues)
- **Community Forum**: [Discord Server](https://discord.gg/bugrelay)
- **Email Support**: support@bugrelay.com

### Emergency Contacts

For critical production issues:
- **Status Page**: https://status.bugrelay.com
- **Emergency Email**: emergency@bugrelay.com
- **Phone Support**: +1-555-BUGRELAY (business hours)

Remember to check the [status page](https://status.bugrelay.com) first to see if there are any known service issues.