# Bug Management API Endpoints

This document provides comprehensive documentation for all bug management endpoints in the BugRelay API.

## Overview

The Bug Management API allows users to create, view, vote on, and comment on bug reports. It supports both authenticated and anonymous submissions, with enhanced features available to authenticated users.

## Base URL

All bug endpoints are prefixed with `/api/v1/bugs`

## Authentication

- **Optional**: Bug creation and viewing
- **Required**: Voting, commenting, file uploads, status updates, company responses
- **Company Members**: Status updates and company responses
- **Admins**: All operations including moderation

## Rate Limiting

- **General API**: 60 requests per minute
- **Bug Submission**: 5 requests per minute (stricter limit)
- **File Uploads**: Included in general rate limit

---

## Endpoints

### 1. Create Bug Report

Creates a new bug report with optional authentication.

**Endpoint:** `POST /api/v1/bugs`

**Authentication:** Optional (enhanced features with authentication)

**Rate Limit:** 5 requests per minute

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

**Request Body:**
```json
{
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
}
```

**Field Validation:**
- `title`: Required, 5-255 characters, sanitized for XSS
- `description`: Required, 10-5000 characters, sanitized for XSS
- `priority`: Optional, one of: `low`, `medium`, `high`, `critical` (default: `medium`)
- `tags`: Optional, max 10 tags, each tag validated and sanitized
- `application_name`: Required, 1-255 characters, sanitized for XSS
- `application_url`: Optional, valid URL format
- `contact_email`: Optional, valid email format
- `recaptcha_token`: Required for anonymous users, optional for authenticated users
- Technical fields: Optional, 1-100 characters each, sanitized

**Response (201 Created):**
```json
{
  "message": "Bug report created successfully",
  "bug": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Application crashes on startup",
    "description": "The application crashes immediately when launched on iOS 15.0...",
    "status": "open",
    "priority": "high",
    "tags": ["crash", "ios", "startup"],
    "operating_system": "iOS 15.0",
    "device_type": "iPhone 12",
    "app_version": "2.1.0",
    "browser_version": "Safari 15.0",
    "application_id": "123e4567-e89b-12d3-a456-426614174000",
    "reporter_id": "789e0123-e45b-67c8-d901-234567890123",
    "assigned_company_id": "456e7890-e12b-34c5-d678-901234567890",
    "vote_count": 0,
    "comment_count": 0,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "resolved_at": null,
    "application": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "MyApp",
      "url": "https://myapp.com"
    },
    "reporter": {
      "id": "789e0123-e45b-67c8-d901-234567890123",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "assigned_company": {
      "id": "456e7890-e12b-34c5-d678-901234567890",
      "name": "MyApp Inc",
      "verified": true
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data, validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

### 2. List Bug Reports

Retrieves a paginated list of bug reports with search, filtering, and sorting capabilities.

**Endpoint:** `GET /api/v1/bugs`

**Authentication:** None required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Full-text search across title, description, and application name
- `status`: Filter by status (`open`, `reviewing`, `fixed`, `wont_fix`)
- `priority`: Filter by priority (`low`, `medium`, `high`, `critical`)
- `tags`: Comma-separated list of tags to filter by
- `application`: Filter by application name (partial match)
- `company`: Filter by company name (partial match)
- `sort`: Sort order (`recent`, `popular`, `trending`, `oldest`) (default: `recent`)

**Example Request:**
```
GET /api/v1/bugs?page=1&limit=20&search=crash&status=open&priority=high&tags=ios,crash&sort=popular
```

**Response (200 OK):**
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

**Search Features:**
- **Full-text search**: Uses PostgreSQL's full-text search across title, description, and application name
- **Relevance ranking**: Search results are ranked by relevance when search term is provided
- **Tag filtering**: Multiple tags can be specified (AND operation)
- **Application/Company filtering**: Partial name matching (case-insensitive)

**Sorting Options:**
- `recent`: Most recently created (default)
- `popular`: Highest vote count, then most recent
- `trending`: High vote count within last 30 days
- `oldest`: Oldest first

**Caching:**
- First page of common queries (no search) are cached for performance
- Cache invalidated when new bugs are created

---

### 3. Get Bug Report Details

Retrieves detailed information about a specific bug report.

**Endpoint:** `GET /api/v1/bugs/{id}`

**Authentication:** None required

**Path Parameters:**
- `id`: Bug report UUID

**Response (200 OK):**
```json
{
  "bug": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Application crashes on startup",
    "description": "The application crashes immediately when launched on iOS 15.0...",
    "status": "open",
    "priority": "high",
    "tags": ["crash", "ios", "startup"],
    "operating_system": "iOS 15.0",
    "device_type": "iPhone 12",
    "app_version": "2.1.0",
    "browser_version": "Safari 15.0",
    "vote_count": 15,
    "comment_count": 3,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "resolved_at": null,
    "application": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "MyApp",
      "url": "https://myapp.com"
    },
    "reporter": {
      "id": "789e0123-e45b-67c8-d901-234567890123",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "assigned_company": {
      "id": "456e7890-e12b-34c5-d678-901234567890",
      "name": "MyApp Inc",
      "verified": true
    },
    "attachments": [
      {
        "id": "attachment-uuid",
        "filename": "screenshot.png",
        "file_url": "/uploads/bugs/bug-uuid_timestamp.png",
        "file_size": 1024000,
        "mime_type": "image/png",
        "uploaded_at": "2024-01-15T10:35:00Z"
      }
    ],
    "comments": [
      {
        "id": "comment-uuid",
        "content": "I'm experiencing the same issue on iPhone 13.",
        "is_company_response": false,
        "created_at": "2024-01-15T11:00:00Z",
        "user": {
          "id": "user-uuid",
          "username": "jane_smith"
        }
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid UUID format
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

**Caching:**
- Individual bug details are cached for performance
- Cache invalidated when bug is updated

---

### 4. Vote on Bug Report

Allows authenticated users to vote on bug reports (toggle vote).

**Endpoint:** `POST /api/v1/bugs/{id}/vote`

**Authentication:** Required

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (201 Created - Vote Added):**
```json
{
  "message": "Vote added successfully",
  "voted": true
}
```

**Response (200 OK - Vote Removed):**
```json
{
  "message": "Vote removed successfully",
  "voted": false
}
```

**Behavior:**
- If user hasn't voted: Creates a new vote
- If user has already voted: Removes the existing vote (toggle behavior)
- Vote count is automatically updated
- User's last activity timestamp is updated

**Error Responses:**
- `400 Bad Request`: Invalid UUID format
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

---

### 5. Add Comment to Bug Report

Allows authenticated users to add comments to bug reports.

**Endpoint:** `POST /api/v1/bugs/{id}/comments`

**Authentication:** Required

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "I'm experiencing the same issue on my device. Here are additional details..."
}
```

**Field Validation:**
- `content`: Required, 1-2000 characters, sanitized for XSS

**Response (201 Created):**
```json
{
  "message": "Comment created successfully",
  "comment": {
    "id": "comment-uuid",
    "bug_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "content": "I'm experiencing the same issue on my device...",
    "is_company_response": false,
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z",
    "user": {
      "id": "user-uuid",
      "username": "jane_smith",
      "email": "jane@example.com"
    }
  }
}
```

**Company Response Detection:**
- If the user is a member of the company assigned to the bug, `is_company_response` is automatically set to `true`
- Company responses are visually distinguished in the UI

**Error Responses:**
- `400 Bad Request`: Invalid UUID format or validation errors
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

---

### 6. Upload File Attachment

Allows authenticated users to upload file attachments to bug reports.

**Endpoint:** `POST /api/v1/bugs/{id}/attachments`

**Authentication:** Required

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `file`: File to upload (required)

**File Restrictions:**
- **Size Limit**: 10MB maximum
- **Allowed Types**: Images only (JPEG, PNG, GIF, WebP)
- **Security**: Content type validation, filename sanitization

**Permissions:**
- Bug reporter can upload to their own bugs
- Admins can upload to any bug
- Anonymous users cannot upload files to existing bugs

**Response (201 Created):**
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

**Error Responses:**
- `400 Bad Request`: Invalid UUID, no file, file too large, invalid file type
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Not authorized to upload to this bug
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

**File Storage:**
- Currently stored locally in `uploads/bugs/` directory
- Production should use cloud storage (S3, etc.)
- Unique filenames generated to prevent conflicts

---

### 7. Update Bug Status

Allows company members and admins to update bug report status.

**Endpoint:** `PATCH /api/v1/bugs/{id}/status`

**Authentication:** Required (Company member or Admin)

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "fixed"
}
```

**Valid Status Values:**
- `open`: Bug is open and needs attention
- `reviewing`: Bug is being reviewed by the company
- `fixed`: Bug has been resolved
- `wont_fix`: Bug will not be fixed

**Permissions:**
- Company members of the assigned company
- System administrators
- Regular users cannot update status

**Response (200 OK):**
```json
{
  "message": "Bug status updated successfully",
  "bug": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "fixed",
    "resolved_at": "2024-01-15T13:00:00Z",
    "updated_at": "2024-01-15T13:00:00Z",
    "application": {
      "name": "MyApp"
    },
    "assigned_company": {
      "name": "MyApp Inc"
    }
  }
}
```

**Automatic Timestamps:**
- `resolved_at` is set when status changes to `fixed` or `wont_fix`
- `resolved_at` is cleared when status changes back to `open` or `reviewing`
- `updated_at` is always updated

**Error Responses:**
- `400 Bad Request`: Invalid UUID or status value
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

---

### 8. Add Company Response

Allows company members to add official company responses to bug reports.

**Endpoint:** `POST /api/v1/bugs/{id}/company-response`

**Authentication:** Required (Company member or Admin)

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Thank you for reporting this issue. We have identified the root cause and will include a fix in version 2.1.1, expected to be released next week."
}
```

**Field Validation:**
- `content`: Required, 1-2000 characters, sanitized for XSS

**Permissions:**
- Company members of the assigned company
- System administrators
- Regular users cannot add company responses

**Response (201 Created):**
```json
{
  "message": "Company response added successfully",
  "comment": {
    "id": "comment-uuid",
    "bug_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "company-user-uuid",
    "content": "Thank you for reporting this issue. We have identified...",
    "is_company_response": true,
    "created_at": "2024-01-15T14:00:00Z",
    "updated_at": "2024-01-15T14:00:00Z",
    "user": {
      "id": "company-user-uuid",
      "username": "myapp_support",
      "email": "support@myapp.com"
    }
  }
}
```

**Behavior:**
- Creates a comment with `is_company_response: true`
- Increments the bug's comment count
- Updates user's last activity timestamp
- Company responses are visually distinguished in the UI

**Error Responses:**
- `400 Bad Request`: Invalid UUID or validation errors
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions (not a company member)
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

---

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
- `INVALID_ID`: Invalid UUID format
- `AUTH_REQUIRED`: Authentication required
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `BUG_NOT_FOUND`: Bug report not found
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `INVALID_FILE_TYPE`: Unsupported file type
- `RECAPTCHA_FAILED`: reCAPTCHA validation failed

## Security Considerations

### Input Validation
- All text inputs are sanitized to prevent XSS attacks
- File uploads are validated for type and size
- URL validation for application URLs
- Email validation for contact emails

### Rate Limiting
- General API: 60 requests per minute per IP
- Bug submission: 5 requests per minute per IP
- Stricter limits prevent spam and abuse

### Authentication
- JWT tokens for authenticated requests
- Optional authentication for bug creation (anonymous allowed)
- Company membership verification for privileged operations

### File Upload Security
- Content type validation
- File size limits (10MB)
- Restricted file types (images only)
- Unique filename generation
- Virus scanning recommended for production

### reCAPTCHA Integration
- Required for anonymous bug submissions
- Optional for authenticated users
- Supports both v2 and v3 reCAPTCHA
- Configurable score threshold for v3

## Performance Optimizations

### Caching Strategy
- Bug list caching for first page of common queries
- Individual bug detail caching
- Cache invalidation on updates
- Redis-based caching system

### Database Optimizations
- Full-text search indexes for search functionality
- Composite indexes for filtering and sorting
- Pagination to limit result sets
- Efficient JOIN queries with proper preloading

### Search Performance
- PostgreSQL full-text search with ranking
- Optimized queries for different sort orders
- Separate count queries for pagination
- Search result caching for popular terms