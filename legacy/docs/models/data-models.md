# Data Models Documentation

This document provides a comprehensive overview of all data models used in the BugRelay backend system, including their purposes, validation rules, and usage patterns.

## Model Overview

The BugRelay backend uses 10 core data models organized into the following categories:

### Core Entity Models
- **User** - User accounts and authentication
- **Company** - Company information and verification
- **Application** - Applications that receive bug reports
- **BugReport** - Bug reports and their metadata

### Relationship Models
- **CompanyMember** - User-company memberships
- **BugVote** - User votes on bug reports
- **Comment** - Comments on bug reports
- **FileAttachment** - File attachments for bug reports

### Security and Audit Models
- **JWTBlacklist** - Invalidated JWT tokens
- **AuditLog** - Administrative action logging

## Detailed Model Specifications

### User Model

**Purpose**: Manages user accounts, authentication, and profile information.

**Key Features**:
- Supports both email/password and OAuth authentication
- Email verification system
- Password reset functionality
- Administrative privileges

**Validation Rules**:
- Email must be unique and valid format
- Display name is required (1-100 characters)
- Auth provider must be one of: email, google, github
- Password hash is optional (null for OAuth-only users)

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "auth_provider": "email",
  "is_email_verified": true,
  "is_admin": false,
  "created_at": "2024-01-01T00:00:00Z",
  "last_active_at": "2024-01-15T12:30:00Z"
}
```

### Company Model

**Purpose**: Manages company information and domain verification.

**Key Features**:
- Domain-based verification system
- Company ownership of applications
- Team member management

**Validation Rules**:
- Company name is required (1-255 characters)
- Domain must be unique and valid format
- Verification email must be valid email format

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Example Corp",
  "domain": "example.com",
  "is_verified": true,
  "verification_email": "admin@example.com",
  "verified_at": "2024-01-01T10:00:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Application Model

**Purpose**: Represents applications that can receive bug reports.

**Key Features**:
- Optional company ownership
- URL association for web applications
- Bug report aggregation

**Validation Rules**:
- Application name is required (1-255 characters)
- URL must be valid URI format if provided
- Company ID must reference existing company if provided

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "My Web App",
  "url": "https://mywebapp.com",
  "company_id": "550e8400-e29b-41d4-a716-446655440001",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### BugReport Model

**Purpose**: Core model for bug reports with comprehensive metadata.

**Key Features**:
- Anonymous and authenticated reporting
- Status and priority management
- Tag-based categorization
- Technical environment details
- Engagement metrics (votes, comments)
- Soft delete functionality

**Validation Rules**:
- Title is required (1-255 characters)
- Description is required (minimum 1 character)
- Status must be one of: open, reviewing, fixed, wont_fix
- Priority must be one of: low, medium, high, critical
- Application ID is required and must reference existing application
- Tags array limited to 10 items, each max 50 characters

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "title": "Login button not working",
  "description": "When I click the login button, nothing happens...",
  "status": "open",
  "priority": "medium",
  "tags": ["login", "ui", "button"],
  "operating_system": "Windows 11",
  "device_type": "Desktop",
  "app_version": "1.2.3",
  "browser_version": "Chrome 120.0.0.0",
  "application_id": "550e8400-e29b-41d4-a716-446655440002",
  "reporter_id": "550e8400-e29b-41d4-a716-446655440000",
  "assigned_company_id": null,
  "vote_count": 5,
  "comment_count": 2,
  "created_at": "2024-01-15T14:30:00Z",
  "updated_at": "2024-01-15T14:30:00Z",
  "deleted_at": null,
  "resolved_at": null
}
```

### CompanyMember Model

**Purpose**: Manages many-to-many relationships between users and companies.

**Key Features**:
- Role-based permissions (member, admin)
- Membership tracking with timestamps
- Unique constraint prevents duplicate memberships

**Validation Rules**:
- Company ID and User ID are required
- Role must be one of: member, admin
- Unique constraint on (company_id, user_id)

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "company_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin",
  "added_at": "2024-01-01T00:00:00Z"
}
```

### BugVote Model

**Purpose**: Tracks user votes on bug reports for popularity ranking.

**Key Features**:
- One vote per user per bug report
- Vote counting for popularity algorithms
- Timestamp tracking for trending calculations

**Validation Rules**:
- Bug ID and User ID are required
- Unique constraint on (bug_id, user_id) prevents duplicate votes

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "bug_id": "550e8400-e29b-41d4-a716-446655440003",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T15:00:00Z"
}
```

### Comment Model

**Purpose**: Enables discussion and company responses on bug reports.

**Key Features**:
- User-generated comments
- Official company responses
- Update tracking

**Validation Rules**:
- Bug ID and User ID are required
- Content is required (1-10000 characters)
- Company response flag defaults to false

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440006",
  "bug_id": "550e8400-e29b-41d4-a716-446655440003",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "I'm experiencing the same issue on Firefox.",
  "is_company_response": false,
  "created_at": "2024-01-15T16:00:00Z",
  "updated_at": "2024-01-15T16:00:00Z"
}
```

### FileAttachment Model

**Purpose**: Manages file uploads associated with bug reports.

**Key Features**:
- File metadata storage
- Size and type validation
- URL-based file access

**Validation Rules**:
- Bug ID is required
- Filename is required (1-255 characters)
- File URL is required and must be valid URI
- File size limited to 10MB (10,485,760 bytes)
- MIME type must be valid format if provided

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440007",
  "bug_id": "550e8400-e29b-41d4-a716-446655440003",
  "filename": "screenshot.png",
  "file_url": "https://storage.example.com/files/screenshot.png",
  "file_size": 245760,
  "mime_type": "image/png",
  "uploaded_at": "2024-01-15T14:35:00Z"
}
```

### JWTBlacklist Model

**Purpose**: Manages invalidated JWT tokens for security.

**Key Features**:
- Token invalidation on logout
- Expiration-based cleanup
- User association for bulk invalidation

**Validation Rules**:
- Token JTI is required and must be unique
- User ID is required
- Expires at timestamp is required

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "token_jti": "abc123def456",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-16T00:00:00Z",
  "created_at": "2024-01-15T12:00:00Z"
}
```

### AuditLog Model

**Purpose**: Tracks administrative actions for security and compliance.

**Key Features**:
- Comprehensive action logging
- Resource tracking with IDs
- IP address and user agent logging
- Structured action and resource types

**Validation Rules**:
- Action must be one of predefined values (bug_flag, bug_remove, etc.)
- Resource must be one of: bug_report, user, company, comment
- User ID is required
- Details limited to 10000 characters

**Usage Patterns**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440009",
  "action": "bug_flag",
  "resource": "bug_report",
  "resource_id": "550e8400-e29b-41d4-a716-446655440003",
  "details": "Flagged for inappropriate content",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "created_at": "2024-01-15T17:00:00Z"
}
```

## Enum Values and Constants

### Bug Report Status
- `open` - Newly reported, awaiting review
- `reviewing` - Under investigation by company
- `fixed` - Issue has been resolved
- `wont_fix` - Issue acknowledged but will not be fixed

### Bug Report Priority
- `low` - Minor issue, low impact
- `medium` - Standard issue, moderate impact
- `high` - Important issue, significant impact
- `critical` - Urgent issue, severe impact

### Authentication Providers
- `email` - Email/password authentication
- `google` - Google OAuth
- `github` - GitHub OAuth

### Company Member Roles
- `member` - Standard company member
- `admin` - Company administrator with full permissions

### Audit Log Actions
- `bug_flag` - Bug report flagged for review
- `bug_remove` - Bug report removed/deleted
- `bug_merge` - Bug reports merged together
- `bug_restore` - Deleted bug report restored
- `user_ban` - User account banned
- `user_unban` - User account unbanned
- `company_verify` - Company domain verified
- `company_unverify` - Company verification removed

### Audit Log Resources
- `bug_report` - Bug report entity
- `user` - User account entity
- `company` - Company entity
- `comment` - Comment entity

## Model Relationships Summary

### One-to-Many Relationships
- User → BugReport (reporter)
- User → BugVote
- User → Comment
- Company → Application
- Application → BugReport
- BugReport → Comment
- BugReport → FileAttachment
- User → JWTBlacklist
- User → AuditLog

### Many-to-Many Relationships
- User ↔ Company (via CompanyMember)
- User ↔ BugReport (via BugVote)

### Optional Relationships
- BugReport → User (reporter can be null for anonymous)
- BugReport → Company (assignment can be null)
- Application → Company (ownership can be null)

## JSON Schema Usage

The complete JSON Schema definitions are available in `schema.json` and can be used for:

1. **API Documentation**: OpenAPI specification generation
2. **Request Validation**: Server-side input validation
3. **Client Generation**: Automatic client library generation
4. **Testing**: Mock data generation and response validation
5. **Documentation**: Interactive API explorers

### Schema Components

The schema includes reusable components for:
- **Base Models**: Core entity definitions
- **Response Models**: API response formats with relationships
- **Request Models**: API request formats with validation
- **Error Models**: Standardized error response formats

### Validation Features

- **Format Validation**: UUID, email, URI, date-time formats
- **Length Constraints**: String length limits
- **Range Constraints**: Numeric ranges and limits
- **Enum Validation**: Predefined value sets
- **Pattern Matching**: Regular expressions for complex formats
- **Required Fields**: Mandatory field enforcement
- **Additional Properties**: Strict schema adherence