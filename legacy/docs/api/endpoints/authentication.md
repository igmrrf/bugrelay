# Authentication API Endpoints

This document provides comprehensive documentation for all authentication endpoints in the BugRelay API.

## Overview

The Authentication API provides secure user registration, login, profile management, and OAuth integration. It supports both email/password authentication and OAuth providers (Google, GitHub) with JWT token-based authentication.

## Base URL

All authentication endpoints are prefixed with `/api/v1/auth`

## Authentication Flow

1. **Registration/Login** → Receive JWT access and refresh tokens
2. **API Requests** → Include access token in Authorization header
3. **Token Refresh** → Use refresh token to get new access token when expired
4. **Logout** → Invalidate tokens (optional but recommended)

## Token Management

- **Access Token**: Short-lived (1 hour), used for API requests
- **Refresh Token**: Long-lived (30 days), used to obtain new access tokens
- **Token Storage**: Client-side storage (localStorage, secure cookies)
- **Token Rotation**: New refresh token provided on each refresh

## Rate Limiting

- **General Auth**: 60 requests per minute per IP
- **Login/Register**: 10 requests per minute per IP (stricter limit)
- **Password Reset**: 5 requests per minute per IP

---

## Endpoints

### 1. User Registration

Creates a new user account with email and password.

**Endpoint:** `POST /api/v1/auth/register`

**Authentication:** None required

**Rate Limit:** 10 requests per minute per IP

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "display_name": "John Doe"
}
```

**Field Validation:**
- `email`: Required, valid email format, unique, max 255 characters
- `password`: Required, minimum 8 characters, max 255 characters
- `display_name`: Required, 1-100 characters, sanitized for XSS

**Password Requirements:**
- Minimum 8 characters
- No maximum length limit (within reason)
- No complexity requirements (user choice)
- Hashed using bcrypt with salt

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "John Doe",
    "auth_provider": "email",
    "is_email_verified": false,
    "is_admin": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "last_active_at": "2024-01-15T10:30:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Automatic Actions:**
- User is automatically logged in after registration
- Email verification email is sent (if configured)
- User's last activity timestamp is set
- JWT tokens are generated and returned

**Error Responses:**
- `400 Bad Request`: Validation errors, email already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Codes:**
- `EMAIL_ALREADY_EXISTS`: Email address is already registered
- `VALIDATION_ERROR`: Input validation failed
- `WEAK_PASSWORD`: Password doesn't meet requirements

---

### 2. User Login

Authenticates a user with email and password.

**Endpoint:** `POST /api/v1/auth/login`

**Authentication:** None required

**Rate Limit:** 10 requests per minute per IP

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Field Validation:**
- `email`: Required, valid email format
- `password`: Required

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "John Doe",
    "auth_provider": "email",
    "is_email_verified": true,
    "is_admin": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T12:00:00Z",
    "last_active_at": "2024-01-15T12:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Security Features:**
- Password verification using bcrypt
- Account lockout after multiple failed attempts (configurable)
- User's last activity timestamp updated
- Previous refresh tokens invalidated (optional)

**Error Responses:**
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Invalid credentials
- `423 Locked`: Account temporarily locked due to failed attempts
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_CREDENTIALS`: Email or password is incorrect
- `ACCOUNT_LOCKED`: Account temporarily locked due to failed login attempts
- `EMAIL_NOT_VERIFIED`: Email verification required (if enforced)

---

### 3. Refresh Access Token

Obtains a new access token using a valid refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`

**Authentication:** None required (uses refresh token)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Field Validation:**
- `refresh_token`: Required, valid JWT format

**Response (200 OK):**
```json
{
  "message": "Token refreshed successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Token Rotation:**
- New access token generated with fresh expiration
- New refresh token generated (optional, for enhanced security)
- Old refresh token is invalidated
- User's last activity timestamp updated

**Error Responses:**
- `400 Bad Request`: Invalid token format
- `401 Unauthorized`: Invalid or expired refresh token
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_REFRESH_TOKEN`: Refresh token is invalid or expired
- `TOKEN_BLACKLISTED`: Token has been revoked

---

### 4. Get User Profile

Retrieves the current user's profile information.

**Endpoint:** `GET /api/v1/auth/profile`

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "auth_provider": "email",
  "is_email_verified": true,
  "is_admin": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:00:00Z",
  "last_active_at": "2024-01-15T12:00:00Z",
  "company_memberships": [
    {
      "id": "member-uuid",
      "company_id": "company-uuid",
      "role": "admin",
      "added_at": "2024-01-10T15:30:00Z",
      "company": {
        "id": "company-uuid",
        "name": "MyApp Inc",
        "domain": "myapp.com",
        "is_verified": true
      }
    }
  ]
}
```

**Profile Information:**
- **Basic Info**: ID, email, display name, avatar
- **Authentication**: Provider, verification status, admin status
- **Timestamps**: Creation, last update, last activity
- **Company Memberships**: Companies user belongs to with roles

**Error Responses:**
- `401 Unauthorized`: Authentication required or invalid token
- `500 Internal Server Error`: Server error

---

### 5. Update User Profile

Updates the current user's profile information.

**Endpoint:** `PUT /api/v1/auth/profile`

**Authentication:** Required

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "display_name": "Jane Doe",
  "avatar_url": "https://example.com/new-avatar.jpg"
}
```

**Field Validation:**
- `display_name`: Optional, 1-100 characters, sanitized for XSS
- `avatar_url`: Optional, valid URL format, max 500 characters

**Updateable Fields:**
- Display name
- Avatar URL
- Email (requires verification process)
- Password (use separate endpoint)

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "Jane Doe",
    "avatar_url": "https://example.com/new-avatar.jpg",
    "auth_provider": "email",
    "is_email_verified": true,
    "is_admin": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T14:00:00Z",
    "last_active_at": "2024-01-15T14:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

**Error Codes:**
- `VALIDATION_ERROR`: Input validation failed
- `INVALID_URL`: Avatar URL is not valid

---

### 6. Change Password

Changes the current user's password.

**Endpoint:** `PUT /api/v1/auth/password`

**Authentication:** Required

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newsecurepassword456"
}
```

**Field Validation:**
- `current_password`: Required, must match existing password
- `new_password`: Required, minimum 8 characters, max 255 characters

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Security Actions:**
- Current password verification required
- New password hashed with bcrypt
- All existing refresh tokens invalidated (force re-login)
- Password change logged for security audit

**Error Responses:**
- `400 Bad Request`: Validation errors, weak password
- `401 Unauthorized`: Authentication required, incorrect current password
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_CURRENT_PASSWORD`: Current password is incorrect
- `WEAK_PASSWORD`: New password doesn't meet requirements
- `SAME_PASSWORD`: New password must be different from current

---

### 7. Email Verification

Verifies a user's email address using a verification token.

**Endpoint:** `GET /api/v1/auth/verify-email`

**Authentication:** None required

**Query Parameters:**
- `token`: Email verification token (sent via email)

**Example Request:**
```
GET /api/v1/auth/verify-email?token=abc123def456789...
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "is_email_verified": true,
    "verified_at": "2024-01-15T15:00:00Z"
  }
}
```

**Verification Process:**
- Token validation and expiration check
- Email verification status updated
- Verification timestamp recorded
- Token is consumed (single-use)

**Error Responses:**
- `400 Bad Request`: Invalid or expired token
- `404 Not Found`: Token not found
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_TOKEN`: Verification token is invalid or expired
- `ALREADY_VERIFIED`: Email is already verified

---

### 8. Resend Verification Email

Sends a new email verification email to the user.

**Endpoint:** `POST /api/v1/auth/resend-verification`

**Authentication:** Required

**Rate Limit:** 5 requests per minute per user

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Verification email sent successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Email already verified
- `401 Unauthorized`: Authentication required
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Codes:**
- `ALREADY_VERIFIED`: Email is already verified
- `EMAIL_SEND_FAILED`: Failed to send verification email

---

### 9. Password Reset Request

Initiates the password reset process by sending a reset email.

**Endpoint:** `POST /api/v1/auth/password-reset`

**Authentication:** None required

**Rate Limit:** 5 requests per minute per IP

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Field Validation:**
- `email`: Required, valid email format

**Response (200 OK):**
```json
{
  "message": "If an account with this email exists, a password reset link has been sent."
}
```

**Security Features:**
- Generic response message (doesn't reveal if email exists)
- Rate limiting to prevent abuse
- Reset tokens expire after reasonable time (1 hour)
- Previous reset tokens invalidated

**Error Responses:**
- `400 Bad Request`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

### 10. Password Reset Confirmation

Completes the password reset process using the reset token.

**Endpoint:** `POST /api/v1/auth/password-reset/confirm`

**Authentication:** None required

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "newsecurepassword123"
}
```

**Field Validation:**
- `token`: Required, valid reset token from email
- `new_password`: Required, minimum 8 characters, max 255 characters

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Security Actions:**
- Token validation and expiration check
- Password hashed with bcrypt
- All existing refresh tokens invalidated
- Reset token consumed (single-use)
- Password reset logged for security audit

**Error Responses:**
- `400 Bad Request`: Invalid token, validation errors
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_TOKEN`: Reset token is invalid or expired
- `WEAK_PASSWORD`: New password doesn't meet requirements

---

### 11. Logout

Invalidates the current user's tokens and logs them out.

**Endpoint:** `POST /api/v1/auth/logout`

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Logout Actions:**
- Current refresh token is blacklisted
- Access token is added to blacklist (optional)
- User's session is terminated
- Client should clear stored tokens

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

---

### 12. Logout All Sessions

Invalidates all of the user's tokens across all devices/sessions.

**Endpoint:** `POST /api/v1/auth/logout-all`

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out from all sessions successfully"
}
```

**Global Logout Actions:**
- All user's refresh tokens are blacklisted
- All active sessions terminated
- User must re-login on all devices
- Security audit log entry created

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

---

## OAuth Integration

### 13. Initiate OAuth (Google)

Redirects user to Google OAuth authorization page.

**Endpoint:** `GET /api/v1/auth/oauth/google`

**Authentication:** None required

**Query Parameters:**
- `redirect_uri`: Optional, where to redirect after OAuth (default: frontend URL)

**Response:** HTTP 302 Redirect to Google OAuth

**OAuth Flow:**
1. User clicks "Login with Google"
2. Redirected to Google OAuth consent page
3. User grants permissions
4. Google redirects back with authorization code
5. Backend exchanges code for user info
6. User is created/logged in automatically

---

### 14. Initiate OAuth (GitHub)

Redirects user to GitHub OAuth authorization page.

**Endpoint:** `GET /api/v1/auth/oauth/github`

**Authentication:** None required

**Query Parameters:**
- `redirect_uri`: Optional, where to redirect after OAuth (default: frontend URL)

**Response:** HTTP 302 Redirect to GitHub OAuth

**OAuth Flow:**
Similar to Google OAuth but using GitHub as the provider.

---

### 15. OAuth Callback

Handles OAuth callback from providers (internal endpoint).

**Endpoint:** `GET /api/v1/auth/oauth/callback/{provider}`

**Authentication:** None required (internal use)

**Path Parameters:**
- `provider`: OAuth provider (`google`, `github`)

**Query Parameters:**
- `code`: Authorization code from OAuth provider
- `state`: CSRF protection state parameter

**Response:** HTTP 302 Redirect to frontend with tokens

**Callback Processing:**
1. Validates state parameter (CSRF protection)
2. Exchanges authorization code for access token
3. Fetches user profile from OAuth provider
4. Creates or updates user account
5. Generates JWT tokens
6. Redirects to frontend with tokens

---

### 16. Link OAuth Account

Links an OAuth account to an existing authenticated user.

**Endpoint:** `POST /api/v1/auth/oauth/link/{provider}`

**Authentication:** Required

**Path Parameters:**
- `provider`: OAuth provider (`google`, `github`)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "code": "oauth_authorization_code"
}
```

**Response (200 OK):**
```json
{
  "message": "OAuth account linked successfully",
  "provider": "google",
  "provider_email": "user@gmail.com"
}
```

**Account Linking:**
- Links OAuth account to existing user
- Allows login via OAuth or email/password
- Prevents duplicate accounts
- Updates user profile with OAuth info

**Error Responses:**
- `400 Bad Request`: Invalid code, account already linked
- `401 Unauthorized`: Authentication required
- `409 Conflict`: OAuth account linked to different user
- `500 Internal Server Error`: Server error

---

## Security Features

### JWT Token Security

**Token Structure:**
- **Header**: Algorithm and token type
- **Payload**: User ID, email, roles, expiration
- **Signature**: HMAC SHA256 with secret key

**Security Measures:**
- Tokens signed with secure secret key
- Short expiration times (1 hour for access tokens)
- Refresh token rotation (optional)
- Token blacklisting for logout

### Password Security

**Hashing:**
- bcrypt with salt rounds (configurable, default: 12)
- Passwords never stored in plain text
- Salt automatically generated per password

**Requirements:**
- Minimum 8 characters
- No maximum length (within reason)
- No complexity requirements (user choice)

### Rate Limiting

**Authentication Endpoints:**
- Login/Register: 10 requests per minute per IP
- Password Reset: 5 requests per minute per IP
- General Auth: 60 requests per minute per IP

**Protection Against:**
- Brute force attacks
- Account enumeration
- Spam registrations

### Account Security

**Failed Login Protection:**
- Account lockout after multiple failed attempts
- Exponential backoff for repeated failures
- IP-based rate limiting

**Session Management:**
- Secure token storage recommendations
- Token expiration and refresh
- Global logout capability

## Error Handling

### Standard Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `EMAIL_ALREADY_EXISTS`: Email address already registered
- `INVALID_CREDENTIALS`: Login credentials are incorrect
- `ACCOUNT_LOCKED`: Account temporarily locked
- `INVALID_TOKEN`: Token is invalid or expired
- `TOKEN_BLACKLISTED`: Token has been revoked
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `EMAIL_NOT_VERIFIED`: Email verification required
- `ALREADY_VERIFIED`: Email already verified
- `RATE_LIMIT_EXCEEDED`: Too many requests

### HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: User created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: Access denied
- `409 Conflict`: Resource conflict (duplicate email)
- `423 Locked`: Account locked
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Best Practices

### Client Implementation

**Token Storage:**
- Use secure storage (httpOnly cookies or secure localStorage)
- Never store tokens in plain text
- Clear tokens on logout

**Token Refresh:**
- Implement automatic token refresh
- Handle refresh failures gracefully
- Retry failed requests after token refresh

**Error Handling:**
- Handle all authentication errors appropriately
- Provide clear user feedback
- Implement proper loading states

### Security Considerations

**HTTPS Only:**
- All authentication endpoints require HTTPS in production
- Tokens should never be transmitted over HTTP
- Secure cookie flags for token storage

**CSRF Protection:**
- Use CSRF tokens for state-changing operations
- Validate origin headers
- Implement proper CORS policies

**Input Validation:**
- Sanitize all user inputs
- Validate email formats
- Enforce password requirements

### Performance Optimization

**Caching:**
- Cache user profile data appropriately
- Use Redis for token blacklisting
- Implement efficient session storage

**Database Optimization:**
- Index email fields for fast lookups
- Optimize user queries
- Use connection pooling