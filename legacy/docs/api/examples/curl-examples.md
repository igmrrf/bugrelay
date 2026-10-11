# cURL Examples

This document provides comprehensive cURL examples for all BugRelay API endpoints.

## Base Configuration

```bash
# Set base URL (adjust for your environment)
export BASE_URL="http://localhost:8080"
# or for production:
# export BASE_URL="https://api.bugrelay.com"

# Set authentication token (after login)
export AUTH_TOKEN="your_jwt_token_here"
```

## System Endpoints

### Health Check

```bash
# Check API health
curl -X GET "$BASE_URL/health"
```

**Response:**
```json
{
  "status": "ok",
  "service": "bugrelay-backend"
}
```

### API Status

```bash
# Get API version and status
curl -X GET "$BASE_URL/api/v1/status"
```

**Response:**
```json
{
  "message": "BugRelay API v1 is running",
  "version": "1.0.0"
}
```

## Authentication Endpoints

### User Registration

```bash
# Register a new user
curl -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "display_name": "John Doe"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "John Doe",
    "auth_provider": "email",
    "is_email_verified": false,
    "is_admin": false,
    "created_at": "2024-01-15T10:30:00Z",
    "last_active_at": "2024-01-15T10:30:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

### User Login

```bash
# Login with email and password
curl -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "John Doe",
    "auth_provider": "email",
    "is_email_verified": true,
    "is_admin": false,
    "created_at": "2024-01-15T10:30:00Z",
    "last_active_at": "2024-01-15T12:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

### Refresh Token

```bash
# Refresh access token
curl -X POST "$BASE_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Email Verification

```bash
# Verify email with token from email
curl -X GET "$BASE_URL/api/v1/auth/verify-email?token=verification_token_here"
```

### Password Reset Request

```bash
# Request password reset
curl -X POST "$BASE_URL/api/v1/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### Password Reset Confirmation

```bash
# Reset password with token
curl -X POST "$BASE_URL/api/v1/auth/password-reset/confirm" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_here",
    "new_password": "newsecurepassword123"
  }'
```

### Get User Profile

```bash
# Get current user profile (requires authentication)
curl -X GET "$BASE_URL/api/v1/auth/profile" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Update User Profile

```bash
# Update user profile (requires authentication)
curl -X PUT "$BASE_URL/api/v1/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "display_name": "Jane Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

### Logout

```bash
# Logout current session (requires authentication)
curl -X POST "$BASE_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Logout All Sessions

```bash
# Logout all sessions (requires authentication)
curl -X POST "$BASE_URL/api/v1/auth/logout-all" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## OAuth Endpoints

### Initiate OAuth (Google)

```bash
# Initiate Google OAuth (redirects to Google)
curl -X GET "$BASE_URL/api/v1/auth/oauth/google"
```

### Initiate OAuth (GitHub)

```bash
# Initiate GitHub OAuth (redirects to GitHub)
curl -X GET "$BASE_URL/api/v1/auth/oauth/github"
```

### Link OAuth Account

```bash
# Link Google account to existing user (requires authentication)
curl -X POST "$BASE_URL/api/v1/auth/oauth/link/google" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "oauth_authorization_code"
  }'
```

## Bug Management Endpoints

### Create Bug Report (Anonymous)

```bash
# Create bug report without authentication
curl -X POST "$BASE_URL/api/v1/bugs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Application crashes on startup",
    "description": "The application crashes immediately when launched on iOS 15.0. Error occurs during initialization phase.",
    "priority": "high",
    "tags": ["crash", "ios", "startup"],
    "operating_system": "iOS 15.0",
    "device_type": "iPhone 12",
    "app_version": "2.1.0",
    "browser_version": "Safari 15.0",
    "application_name": "MyApp",
    "application_url": "https://myapp.com",
    "contact_email": "user@example.com",
    "recaptcha_token": "03AGdBq25..."
  }'
```

### Create Bug Report (Authenticated)

```bash
# Create bug report with authentication (no reCAPTCHA required)
curl -X POST "$BASE_URL/api/v1/bugs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "title": "Login form validation error",
    "description": "Email validation fails for valid email addresses containing plus signs.",
    "priority": "medium",
    "tags": ["validation", "login", "email"],
    "operating_system": "Windows 11",
    "device_type": "Desktop",
    "app_version": "3.2.1",
    "browser_version": "Chrome 120.0",
    "application_name": "MyApp",
    "application_url": "https://myapp.com"
  }'
```

### List Bug Reports

```bash
# Get all bug reports (basic)
curl -X GET "$BASE_URL/api/v1/bugs"

# Get bug reports with pagination
curl -X GET "$BASE_URL/api/v1/bugs?page=1&limit=20"

# Search and filter bug reports
curl -X GET "$BASE_URL/api/v1/bugs?search=crash&status=open&priority=high&tags=ios,crash&sort=popular"

# Filter by application
curl -X GET "$BASE_URL/api/v1/bugs?application=MyApp&company=MyApp%20Inc"
```

**Response:**
```json
{
  "bugs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Application crashes on startup",
      "description": "The application crashes immediately when launched...",
      "status": "open",
      "priority": "high",
      "tags": ["crash", "ios", "startup"],
      "vote_count": 15,
      "comment_count": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "application": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "MyApp"
      },
      "reporter": {
        "id": "789e0123-e45b-67c8-d901-234567890123",
        "username": "john_doe"
      },
      "assigned_company": {
        "id": "456e7890-e12b-34c5-d678-901234567890",
        "name": "MyApp Inc",
        "verified": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### Get Bug Report Details

```bash
# Get specific bug report
curl -X GET "$BASE_URL/api/v1/bugs/550e8400-e29b-41d4-a716-446655440000"
```

### Vote on Bug Report

```bash
# Vote on bug report (toggle vote)
curl -X POST "$BASE_URL/api/v1/bugs/550e8400-e29b-41d4-a716-446655440000/vote" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Response (Vote Added):**
```json
{
  "message": "Vote added successfully",
  "voted": true
}
```

**Response (Vote Removed):**
```json
{
  "message": "Vote removed successfully",
  "voted": false
}
```

### Add Comment to Bug Report

```bash
# Add comment to bug report
curl -X POST "$BASE_URL/api/v1/bugs/550e8400-e29b-41d4-a716-446655440000/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "content": "I am experiencing the same issue on my device. Here are additional details about the crash..."
  }'
```

### Upload File Attachment

```bash
# Upload file attachment to bug report
curl -X POST "$BASE_URL/api/v1/bugs/550e8400-e29b-41d4-a716-446655440000/attachments" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "file=@screenshot.png"
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "attachment": {
    "id": "attachment-uuid",
    "bug_id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "screenshot.png",
    "file_url": "/uploads/bugs/bug-uuid_timestamp.png",
    "file_size": 1024000,
    "mime_type": "image/png",
    "uploaded_at": "2024-01-15T12:30:00Z"
  }
}
```

### Update Bug Status (Company Members)

```bash
# Update bug status (requires company membership)
curl -X PATCH "$BASE_URL/api/v1/bugs/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "status": "fixed"
  }'
```

### Add Company Response

```bash
# Add official company response
curl -X POST "$BASE_URL/api/v1/bugs/550e8400-e29b-41d4-a716-446655440000/company-response" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "content": "Thank you for reporting this issue. We have identified the root cause and will include a fix in version 2.1.1, expected to be released next week."
  }'
```

## Company Management Endpoints

### List Companies

```bash
# Get all companies
curl -X GET "$BASE_URL/api/v1/companies"

# Search and filter companies
curl -X GET "$BASE_URL/api/v1/companies?search=myapp&verified=true&page=1&limit=20"
```

### Get Company Details

```bash
# Get specific company details
curl -X GET "$BASE_URL/api/v1/companies/456e7890-e12b-34c5-d678-901234567890"
```

### Initiate Company Claim

```bash
# Claim company ownership (requires authentication)
curl -X POST "$BASE_URL/api/v1/companies/456e7890-e12b-34c5-d678-901234567890/claim" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "email": "admin@myapp.com"
  }'
```

**Response:**
```json
{
  "message": "Verification email sent. Please check your email and follow the instructions."
}
```

### Complete Company Verification

```bash
# Complete company verification with token from email
curl -X POST "$BASE_URL/api/v1/companies/456e7890-e12b-34c5-d678-901234567890/verify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "token": "abc123def456789..."
  }'
```

### Get Company Dashboard

```bash
# Get company dashboard (requires company membership)
curl -X GET "$BASE_URL/api/v1/companies/456e7890-e12b-34c5-d678-901234567890/dashboard" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Add Team Member

```bash
# Add team member (requires company admin)
curl -X POST "$BASE_URL/api/v1/companies/456e7890-e12b-34c5-d678-901234567890/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "email": "newmember@myapp.com",
    "role": "member"
  }'
```

### Remove Team Member

```bash
# Remove team member (requires company admin or self-removal)
curl -X DELETE "$BASE_URL/api/v1/companies/456e7890-e12b-34c5-d678-901234567890/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "user_id": "user-uuid-to-remove"
  }'
```

## Administrative Endpoints

### Admin Dashboard

```bash
# Get admin dashboard (requires admin role)
curl -X GET "$BASE_URL/api/v1/admin/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### List Bugs for Moderation

```bash
# Get bugs requiring moderation
curl -X GET "$BASE_URL/api/v1/admin/bugs" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Filter flagged bugs
curl -X GET "$BASE_URL/api/v1/admin/bugs?flagged=true&status=open" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Flag Bug for Review

```bash
# Flag bug for administrative review
curl -X POST "$BASE_URL/api/v1/admin/bugs/550e8400-e29b-41d4-a716-446655440000/flag" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "reason": "Potential spam content with suspicious voting patterns"
  }'
```

### Remove Bug Report

```bash
# Remove bug report (soft delete)
curl -X DELETE "$BASE_URL/api/v1/admin/bugs/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "reason": "Spam content violating community guidelines"
  }'
```

### Restore Bug Report

```bash
# Restore previously removed bug report
curl -X POST "$BASE_URL/api/v1/admin/bugs/550e8400-e29b-41d4-a716-446655440000/restore" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Merge Duplicate Bugs

```bash
# Merge duplicate bug reports
curl -X POST "$BASE_URL/api/v1/admin/bugs/merge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "source_bug_id": "source-bug-uuid",
    "target_bug_id": "target-bug-uuid",
    "reason": "Duplicate reports for the same iOS crash issue"
  }'
```

### Get Audit Logs

```bash
# Get audit logs
curl -X GET "$BASE_URL/api/v1/admin/audit-logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Filter audit logs
curl -X GET "$BASE_URL/api/v1/admin/audit-logs?action=bug_remove&resource=bug_report&page=1&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Logging Endpoints

### Logs Health Check

```bash
# Check logging system health
curl -X GET "$BASE_URL/api/v1/logs/health"
```

### Submit Frontend Logs

```bash
# Submit frontend logs (requires API key)
curl -X POST "$BASE_URL/api/v1/logs/frontend" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_logs_api_key" \
  -d '{
    "level": "error",
    "message": "JavaScript error occurred",
    "timestamp": "2024-01-15T10:30:00Z",
    "url": "https://myapp.com/dashboard",
    "user_agent": "Mozilla/5.0...",
    "stack_trace": "Error: Something went wrong..."
  }'
```

## Error Handling Examples

### Rate Limit Exceeded

```bash
# When rate limit is exceeded
curl -X POST "$BASE_URL/api/v1/bugs" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "description": "Test bug"}'
```

**Response (429 Too Many Requests):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retry_after": 60
  }
}
```

### Authentication Required

```bash
# Accessing protected endpoint without token
curl -X GET "$BASE_URL/api/v1/auth/profile"
```

**Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

### Validation Error

```bash
# Invalid request data
curl -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "123"
  }'
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": "Email must be valid, Password must be at least 8 characters"
  }
}
```

## Testing Scripts

### Complete Authentication Flow

```bash
#!/bin/bash
# Complete authentication flow test

BASE_URL="http://localhost:8080"

echo "1. Register new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "display_name": "Test User"
  }')

echo "Register Response: $REGISTER_RESPONSE"

# Extract access token
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.access_token')
echo "Access Token: $ACCESS_TOKEN"

echo "2. Get user profile..."
curl -s -X GET "$BASE_URL/api/v1/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo "3. Update profile..."
curl -s -X PUT "$BASE_URL/api/v1/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "display_name": "Updated Test User"
  }' | jq

echo "4. Logout..."
curl -s -X POST "$BASE_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

### Bug Submission and Interaction Flow

```bash
#!/bin/bash
# Bug submission and interaction flow test

BASE_URL="http://localhost:8080"
ACCESS_TOKEN="your_token_here"

echo "1. Create bug report..."
BUG_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/bugs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Test Bug Report",
    "description": "This is a test bug report for API testing purposes.",
    "priority": "medium",
    "tags": ["test", "api"],
    "application_name": "Test App",
    "application_url": "https://testapp.com"
  }')

echo "Bug Response: $BUG_RESPONSE"

# Extract bug ID
BUG_ID=$(echo $BUG_RESPONSE | jq -r '.bug.id')
echo "Bug ID: $BUG_ID"

echo "2. Vote on bug..."
curl -s -X POST "$BASE_URL/api/v1/bugs/$BUG_ID/vote" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo "3. Add comment..."
curl -s -X POST "$BASE_URL/api/v1/bugs/$BUG_ID/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "content": "This is a test comment on the bug report."
  }' | jq

echo "4. Get bug details..."
curl -s -X GET "$BASE_URL/api/v1/bugs/$BUG_ID" | jq
```