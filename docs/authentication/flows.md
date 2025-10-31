# Authentication Flows

This document describes the complete authentication flows supported by the BugRelay backend server, including user registration, login, JWT token management, and password recovery processes.

## Overview

BugRelay supports multiple authentication methods:
- **Email/Password Authentication**: Traditional registration and login with email verification
- **OAuth Authentication**: Login via Google and GitHub
- **JWT Token-based Authentication**: Stateless authentication using access and refresh tokens

## User Registration Flow

### 1. Registration Process

The user registration process involves email verification to ensure account security.

#### Endpoint
```
POST /api/v1/auth/register
```

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "display_name": "John Doe"
}
```

#### Validation Rules
- **Email**: Must be valid email format, case-insensitive, unique in system
- **Password**: Minimum 8 characters, validated for strength
- **Display Name**: 1-100 characters, required

#### Response (Success - 201 Created)
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "display_name": "John Doe",
      "avatar_url": null,
      "is_admin": false,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid request data or weak password
- **409 Conflict**: User with email already exists
- **500 Internal Server Error**: Server processing error

### 2. Email Verification

Currently, email verification is auto-completed for development purposes. In production, this would involve:

1. Generate secure verification token (32 bytes)
2. Send verification email with token
3. User clicks verification link
4. Token validated and email marked as verified

#### Verification Endpoint
```
GET /api/v1/auth/verify-email?token={verification_token}
```

## User Login Flow

### 1. Email/Password Login

#### Endpoint
```
POST /api/v1/auth/login
```

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Authentication Process
1. Validate request format
2. Find user by email (case-insensitive)
3. Verify user uses email authentication
4. Validate password against bcrypt hash
5. Check email verification status
6. Update last active timestamp
7. Generate JWT token pair

#### Response (Success - 200 OK)
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "display_name": "John Doe",
      "avatar_url": null,
      "is_admin": false,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

#### Error Responses
- **401 Unauthorized**: Invalid credentials, unverified email, or wrong auth method
- **400 Bad Request**: Invalid request format

## JWT Token Management

### 1. Token Structure

BugRelay uses JWT tokens with the following structure:

#### Access Token Claims
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "is_admin": false,
  "token_type": "access",
  "jti": "unique-token-id",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1642248600,
  "exp": 1642252200,
  "nbf": 1642248600,
  "iss": "bugrelay",
  "aud": ["bugrelay-users"]
}
```

#### Refresh Token Claims
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "is_admin": false,
  "token_type": "refresh",
  "jti": "unique-token-id",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1642248600,
  "exp": 1642335000,
  "nbf": 1642248600,
  "iss": "bugrelay",
  "aud": ["bugrelay-users"]
}
```

### 2. Token Lifecycle

#### Token Expiration
- **Access Token**: 1 hour (3600 seconds)
- **Refresh Token**: 24 hours (86400 seconds)

#### Token Validation Process
1. Parse JWT token and validate signature
2. Check token expiration
3. Verify token type (access vs refresh)
4. Check token blacklist status
5. Validate issuer and audience claims

### 3. Token Refresh

#### Endpoint
```
POST /api/v1/auth/refresh
```

#### Request Body
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Refresh Process
1. Validate refresh token format and signature
2. Check token type is "refresh"
3. Verify token is not blacklisted
4. Blacklist the old refresh token
5. Generate new access and refresh token pair

#### Response (Success - 200 OK)
```json
{
  "message": "Tokens refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

### 4. Token Blacklisting

BugRelay implements token blacklisting for security:

#### Blacklist Triggers
- User logout
- Token refresh (old refresh token)
- Password reset
- Account security changes

#### Blacklist Storage
- Redis for fast lookup
- Database for persistence
- Automatic cleanup of expired tokens

## Password Reset Flow

### 1. Request Password Reset

#### Endpoint
```
POST /api/v1/auth/request-password-reset
```

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Process
1. Validate email format
2. Find user by email (don't reveal if user exists)
3. Check user uses email authentication
4. Generate secure reset token (32 bytes)
5. Set token expiration (1 hour)
6. Send reset email (currently logged for development)

#### Response (Always 200 OK for security)
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

### 2. Reset Password

#### Endpoint
```
POST /api/v1/auth/reset-password
```

#### Request Body
```json
{
  "token": "secure-reset-token",
  "new_password": "newSecurePassword123"
}
```

#### Process
1. Validate new password strength
2. Find user by reset token
3. Check token expiration
4. Hash new password with bcrypt
5. Update password and clear reset token
6. Revoke all existing user tokens for security

#### Response (Success - 200 OK)
```json
{
  "message": "Password reset successful"
}
```

## Logout Flow

### 1. Single Device Logout

#### Endpoint
```
POST /api/v1/auth/logout
```

#### Headers
```
Authorization: Bearer {access_token}
```

#### Process
1. Extract token from Authorization header
2. Validate token format
3. Add token to blacklist
4. Token becomes invalid immediately

#### Response (Success - 200 OK)
```json
{
  "message": "Logout successful"
}
```

### 2. All Devices Logout

#### Endpoint
```
POST /api/v1/auth/logout-all
```

#### Headers
```
Authorization: Bearer {access_token}
```

#### Process
1. Authenticate user from access token
2. Blacklist all tokens for the user
3. All user sessions become invalid

#### Response (Success - 200 OK)
```json
{
  "message": "Logged out from all devices successfully"
}
```

## Authentication Middleware

### 1. Required Authentication

Protected endpoints use the `RequireAuth` middleware:

```go
// Validates access token and sets user context
func RequireAuth() gin.HandlerFunc
```

#### Process
1. Extract token from Authorization header or cookie
2. Validate JWT token signature and claims
3. Check token blacklist status
4. Verify token type is "access"
5. Set user context variables

#### Context Variables Set
- `user_id`: User UUID
- `user_email`: User email address
- `is_admin`: Admin status boolean
- `token_id`: JWT token ID (jti)

### 2. Optional Authentication

Some endpoints use `OptionalAuth` middleware:

```go
// Extracts user info if token present, doesn't require it
func OptionalAuth() gin.HandlerFunc
```

### 3. Admin Authentication

Admin endpoints use `RequireAdmin` middleware:

```go
// Requires valid authentication AND admin privileges
func RequireAdmin() gin.HandlerFunc
```

## Security Considerations

### 1. Password Security
- Minimum 8 character requirement
- Bcrypt hashing with cost factor 12
- Password strength validation

### 2. Token Security
- HMAC-SHA256 signing
- Unique JWT ID (jti) for each token
- Token blacklisting for revocation
- Short access token lifetime (1 hour)

### 3. Rate Limiting
- Login attempts limited by IP
- Password reset requests limited
- General API rate limiting applied

### 4. Input Validation
- Email format validation
- Password strength requirements
- Request size limits
- Input sanitization

## Error Handling

### Common Error Codes
- `INVALID_REQUEST`: Malformed request data
- `INVALID_CREDENTIALS`: Wrong email/password
- `EMAIL_NOT_VERIFIED`: Account not verified
- `INVALID_AUTH_METHOD`: Wrong authentication method
- `MISSING_TOKEN`: No authentication token provided
- `INVALID_TOKEN`: Invalid or expired token
- `TOKEN_REVOKED`: Token has been blacklisted
- `INSUFFICIENT_PRIVILEGES`: Admin access required

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Integration Examples

### 1. Complete Login Flow (JavaScript)
```javascript
// Login
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const loginData = await loginResponse.json();
const { access_token, refresh_token } = loginData.data;

// Store tokens securely
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);

// Make authenticated request
const response = await fetch('/api/v1/profile', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

// Handle token refresh
if (response.status === 401) {
  const refreshResponse = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      refresh_token: refresh_token
    })
  });
  
  if (refreshResponse.ok) {
    const refreshData = await refreshResponse.json();
    localStorage.setItem('access_token', refreshData.data.access_token);
    localStorage.setItem('refresh_token', refreshData.data.refresh_token);
  }
}
```

### 2. Password Reset Flow (JavaScript)
```javascript
// Request password reset
await fetch('/api/v1/auth/request-password-reset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

// Reset password with token from email
await fetch('/api/v1/auth/reset-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: 'reset-token-from-email',
    new_password: 'newPassword123'
  })
});
```