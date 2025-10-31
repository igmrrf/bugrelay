# Company Management API Endpoints

This document provides comprehensive documentation for all company management endpoints in the BugRelay API.

## Overview

The Company Management API allows companies to claim ownership of their applications, verify their identity, manage team members, and access company-specific dashboards and analytics. It supports a verification process to ensure legitimate company ownership.

## Base URL

All company endpoints are prefixed with `/api/v1/companies`

## Authentication

- **Public**: Company listing and viewing
- **Required**: Company claiming, verification, team management, dashboard access
- **Company Members**: Team management and dashboard access
- **Company Admins**: Full team management capabilities

## Rate Limiting

- **General API**: 60 requests per minute per IP
- All company endpoints use the general rate limit

---

## Endpoints

### 1. List Companies

Retrieves a paginated list of companies with search and filtering capabilities.

**Endpoint:** `GET /api/v1/companies`

**Authentication:** None required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search by company name or domain (partial match)
- `verified`: Filter by verification status (true/false)

**Example Request:**
```
GET /api/v1/companies?page=1&limit=20&search=myapp&verified=true
```

**Response (200 OK):**
```json
{
  "companies": [
    {
      "id": "456e7890-e12b-34c5-d678-901234567890",
      "name": "MyApp Inc",
      "domain": "myapp.com",
      "is_verified": true,
      "verified_at": "2024-01-10T15:30:00Z",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-10T15:30:00Z",
      "applications": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "name": "MyApp",
          "url": "https://myapp.com"
        }
      ],
      "members": [
        {
          "id": "member-uuid",
          "company_id": "456e7890-e12b-34c5-d678-901234567890",
          "user_id": "user-uuid",
          "role": "admin",
          "added_at": "2024-01-10T15:30:00Z",
          "user": {
            "id": "user-uuid",
            "username": "john_doe",
            "email": "john@myapp.com"
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

**Search Features:**
- **Name Search**: Partial matching on company name (case-insensitive)
- **Domain Search**: Partial matching on company domain (case-insensitive)
- **Verification Filter**: Filter by verified/unverified status

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Server error

---

### 2. Get Company Details

Retrieves detailed information about a specific company.

**Endpoint:** `GET /api/v1/companies/{id}`

**Authentication:** None required

**Path Parameters:**
- `id`: Company UUID

**Response (200 OK):**
```json
{
  "company": {
    "id": "456e7890-e12b-34c5-d678-901234567890",
    "name": "MyApp Inc",
    "domain": "myapp.com",
    "is_verified": true,
    "verification_email": "admin@myapp.com",
    "verified_at": "2024-01-10T15:30:00Z",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-10T15:30:00Z",
    "applications": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "MyApp",
        "url": "https://myapp.com",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "members": [
      {
        "id": "member-uuid",
        "company_id": "456e7890-e12b-34c5-d678-901234567890",
        "user_id": "user-uuid",
        "role": "admin",
        "added_at": "2024-01-10T15:30:00Z",
        "user": {
          "id": "user-uuid",
          "username": "john_doe",
          "email": "john@myapp.com"
        }
      }
    ],
    "assigned_bugs": [
      {
        "id": "bug-uuid",
        "title": "Application crashes on startup",
        "status": "open",
        "priority": "high",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid UUID format
- `404 Not Found`: Company not found
- `500 Internal Server Error`: Server error

---

### 3. Initiate Company Claim

Starts the company verification process by sending a verification email to a company domain email address.

**Endpoint:** `POST /api/v1/companies/{id}/claim`

**Authentication:** Required

**Path Parameters:**
- `id`: Company UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "admin@myapp.com"
}
```

**Field Validation:**
- `email`: Required, valid email format, must match company domain

**Domain Validation:**
- Email domain must match the company's registered domain
- Cannot claim companies with placeholder domains (*.app)
- Email format validation

**Response (200 OK):**
```json
{
  "message": "Verification email sent. Please check your email and follow the instructions.",
  "verification_token": "abc123def456..." // Only in development/testing
}
```

**Company Creation Process:**
Companies are automatically created when bug reports are submitted for new applications. The system:
1. Extracts domain from application URL or creates placeholder domain
2. Creates unverified company record
3. Associates application with company
4. Allows claiming through this endpoint

**Error Responses:**
- `400 Bad Request`: Invalid UUID, validation errors, invalid domain, already verified
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Company not found
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_DOMAIN`: Email domain doesn't match company domain
- `ALREADY_VERIFIED`: Company is already verified
- `ALREADY_MEMBER`: User is already a company member

---

### 4. Complete Company Verification

Completes the company verification process using the token sent via email.

**Endpoint:** `POST /api/v1/companies/{id}/verify`

**Authentication:** Required

**Path Parameters:**
- `id`: Company UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "token": "abc123def456789..."
}
```

**Field Validation:**
- `token`: Required, must match the verification token sent via email

**Response (200 OK):**
```json
{
  "message": "Company verification completed successfully",
  "company": {
    "id": "456e7890-e12b-34c5-d678-901234567890",
    "name": "MyApp Inc",
    "domain": "myapp.com",
    "is_verified": true,
    "verified_at": "2024-01-10T15:30:00Z",
    "applications": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "MyApp",
        "url": "https://myapp.com"
      }
    ],
    "members": [
      {
        "id": "member-uuid",
        "user_id": "user-uuid",
        "role": "admin",
        "added_at": "2024-01-10T15:30:00Z",
        "user": {
          "id": "user-uuid",
          "username": "john_doe",
          "email": "john@myapp.com"
        }
      }
    ]
  }
}
```

**Verification Process:**
1. Validates the verification token
2. Marks company as verified with timestamp
3. Adds the claiming user as company admin
4. Associates all matching applications with the company
5. Assigns all related bug reports to the company
6. Clears the verification token

**Automatic Associations:**
- **Applications**: All applications with matching domain or name are associated
- **Bug Reports**: All bug reports for associated applications are assigned to the company
- **User Role**: The verifying user becomes a company admin

**Error Responses:**
- `400 Bad Request`: Invalid UUID, invalid/expired token, already verified
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INVALID_TOKEN`: Invalid or expired verification token
- `ALREADY_VERIFIED`: Company is already verified

---

### 5. Get Company Dashboard

Retrieves company dashboard data including statistics and recent activity.

**Endpoint:** `GET /api/v1/companies/{id}/dashboard`

**Authentication:** Required (Company member)

**Path Parameters:**
- `id`: Company UUID

**Request Headers:**
```
Authorization: Bearer <token>
```

**Permissions:**
- User must be a member of the company (admin or member role)

**Response (200 OK):**
```json
{
  "company": {
    "id": "456e7890-e12b-34c5-d678-901234567890",
    "name": "MyApp Inc",
    "domain": "myapp.com",
    "is_verified": true,
    "verified_at": "2024-01-10T15:30:00Z",
    "applications": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "MyApp",
        "url": "https://myapp.com"
      }
    ],
    "members": [
      {
        "id": "member-uuid",
        "role": "admin",
        "added_at": "2024-01-10T15:30:00Z",
        "user": {
          "id": "user-uuid",
          "username": "john_doe",
          "email": "john@myapp.com"
        }
      }
    ]
  },
  "user_role": "admin",
  "bug_stats": {
    "total": 45,
    "open": 12,
    "reviewing": 8,
    "fixed": 20,
    "wont_fix": 5
  },
  "recent_bugs": [
    {
      "id": "bug-uuid",
      "title": "Application crashes on startup",
      "status": "open",
      "priority": "high",
      "vote_count": 15,
      "comment_count": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "application": {
        "id": "app-uuid",
        "name": "MyApp"
      },
      "reporter": {
        "id": "reporter-uuid",
        "username": "jane_smith"
      }
    }
  ]
}
```

**Dashboard Data:**
- **Company Info**: Complete company details with applications and members
- **User Role**: Current user's role in the company (admin/member)
- **Bug Statistics**: Count of bugs by status
- **Recent Bugs**: Last 10 bug reports assigned to the company

**Error Responses:**
- `400 Bad Request`: Invalid UUID format
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User is not a company member
- `404 Not Found`: Company not found
- `500 Internal Server Error`: Server error

**Error Codes:**
- `NOT_MEMBER`: User is not a member of this company

---

### 6. Add Team Member

Adds a new team member to the company.

**Endpoint:** `POST /api/v1/companies/{id}/members`

**Authentication:** Required (Company admin)

**Path Parameters:**
- `id`: Company UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newmember@myapp.com",
  "role": "member"
}
```

**Field Validation:**
- `email`: Required, valid email format, must be from company domain (for verified companies)
- `role`: Optional, one of: `admin`, `member` (default: `member`)

**Permissions:**
- Only company admins can add team members
- For verified companies, email must be from the company domain
- User must already be registered in the system

**Response (201 Created):**
```json
{
  "message": "Team member added successfully",
  "member": {
    "id": "member-uuid",
    "company_id": "456e7890-e12b-34c5-d678-901234567890",
    "user_id": "new-user-uuid",
    "role": "member",
    "added_at": "2024-01-16T10:00:00Z",
    "user": {
      "id": "new-user-uuid",
      "username": "new_member",
      "email": "newmember@myapp.com"
    }
  }
}
```

**Team Member Roles:**
- **Admin**: Can manage team members, update bug status, add company responses
- **Member**: Can update bug status and add company responses for assigned bugs

**Error Responses:**
- `400 Bad Request`: Invalid UUID, validation errors, invalid domain, already member
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions (not admin)
- `404 Not Found`: Company not found, user not found
- `500 Internal Server Error`: Server error

**Error Codes:**
- `INSUFFICIENT_PERMISSIONS`: Only company admins can add team members
- `INVALID_DOMAIN`: Email must be from company domain
- `USER_NOT_FOUND`: User with this email not found (must register first)
- `ALREADY_MEMBER`: User is already a company member
- `INVALID_ROLE`: Role must be 'admin' or 'member'

---

### 7. Remove Team Member

Removes a team member from the company.

**Endpoint:** `DELETE /api/v1/companies/{id}/members`

**Authentication:** Required (Company admin or self-removal)

**Path Parameters:**
- `id`: Company UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "user_id": "user-uuid-to-remove"
}
```

**Field Validation:**
- `user_id`: Required, valid UUID format

**Permissions:**
- Company admins can remove any team member
- Any member can remove themselves
- Cannot remove the last admin from the company

**Response (200 OK):**
```json
{
  "message": "Team member removed successfully"
}
```

**Protection Rules:**
- **Last Admin Protection**: Cannot remove the last admin from a company
- **Self-Removal**: Users can always remove themselves
- **Admin Authority**: Admins can remove any member

**Error Responses:**
- `400 Bad Request`: Invalid UUID format, last admin removal
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions, not a member
- `404 Not Found`: Company not found, member not found
- `500 Internal Server Error`: Server error

**Error Codes:**
- `NOT_MEMBER`: User is not a member of this company
- `INSUFFICIENT_PERMISSIONS`: Only admins can remove other members
- `MEMBER_NOT_FOUND`: Team member not found
- `LAST_ADMIN`: Cannot remove the last admin from the company

---

## Company Verification Process

### Overview

The company verification process ensures that only legitimate company representatives can claim ownership of their applications and manage bug reports.

### Process Flow

1. **Automatic Company Creation**
   - Companies are created automatically when bug reports are submitted
   - Domain is extracted from application URL or generated from application name
   - Initial status is unverified

2. **Claim Initiation**
   - User initiates claim with company domain email
   - System validates email domain matches company domain
   - Verification token is generated and sent via email

3. **Verification Completion**
   - User provides verification token from email
   - System verifies token and marks company as verified
   - User becomes company admin
   - All matching applications and bug reports are associated

4. **Team Management**
   - Verified company admins can add/remove team members
   - Team members can manage bug reports for their applications

### Domain Matching Rules

- **URL Domains**: Extracted from application URLs (e.g., `https://myapp.com` → `myapp.com`)
- **Placeholder Domains**: Generated for applications without URLs (e.g., `MyApp` → `myapp.app`)
- **Email Validation**: Email domain must exactly match company domain
- **www Prefix**: Automatically stripped from domains for matching

### Security Considerations

- **Email Domain Verification**: Ensures only domain owners can claim companies
- **Token-Based Verification**: Secure random tokens prevent unauthorized claims
- **Role-Based Access**: Different permissions for admins vs members
- **Last Admin Protection**: Prevents companies from losing all administrative access

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
- `UNAUTHORIZED`: Authentication required
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `COMPANY_NOT_FOUND`: Company not found
- `USER_NOT_FOUND`: User not found
- `ALREADY_VERIFIED`: Company is already verified
- `ALREADY_MEMBER`: User is already a company member
- `NOT_MEMBER`: User is not a company member
- `INVALID_DOMAIN`: Email domain doesn't match company domain
- `INVALID_TOKEN`: Invalid or expired verification token
- `LAST_ADMIN`: Cannot remove the last admin

## Data Models

### Company Model

```json
{
  "id": "uuid",
  "name": "string (1-255 chars)",
  "domain": "string (1-255 chars, unique)",
  "is_verified": "boolean",
  "verification_email": "string (optional)",
  "verified_at": "timestamp (optional)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Company Member Model

```json
{
  "id": "uuid",
  "company_id": "uuid",
  "user_id": "uuid",
  "role": "string (admin|member)",
  "added_at": "timestamp"
}
```

### Relationships

- **Company → Applications**: One-to-many (company can have multiple applications)
- **Company → Members**: One-to-many through CompanyMember
- **Company → Bug Reports**: One-to-many (assigned bugs)
- **User → Companies**: Many-to-many through CompanyMember

## Performance Considerations

### Database Optimizations

- **Unique Index**: Company domain has unique index for fast lookups
- **Foreign Key Indexes**: Proper indexing on relationship fields
- **Pagination**: All list endpoints support pagination
- **Preloading**: Efficient loading of related data

### Caching Strategy

- Company data is relatively static and could benefit from caching
- Dashboard statistics could be cached with periodic refresh
- Member lists cached until team changes occur

### Security Optimizations

- **Token Expiration**: Verification tokens should expire after reasonable time
- **Rate Limiting**: Prevent abuse of verification email sending
- **Input Validation**: All inputs sanitized and validated
- **Domain Validation**: Strict domain matching rules