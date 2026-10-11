# Data Models Documentation

This document provides comprehensive documentation of the BugRelay backend database schema, including all tables, fields, constraints, and performance considerations.

## Overview

The BugRelay backend uses PostgreSQL as its primary database with the following key features:
- UUID primary keys for all entities
- Full-text search capabilities using PostgreSQL's GIN indexes
- Comprehensive indexing strategy for performance optimization
- Soft deletes for bug reports
- Audit logging for administrative actions

## Database Tables

### Core Entity Tables

#### users
**Purpose**: Stores user account information and authentication data

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | - | User's email address |
| display_name | VARCHAR(100) | NOT NULL | - | User's display name |
| avatar_url | TEXT | - | NULL | URL to user's avatar image |
| password_hash | VARCHAR(255) | - | NULL | bcrypt hash of password (null for OAuth-only users) |
| auth_provider | VARCHAR(20) | NOT NULL | 'email' | Authentication provider (email, google, github) |
| auth_provider_id | VARCHAR(255) | - | NULL | OAuth provider user ID |
| is_email_verified | BOOLEAN | - | FALSE | Email verification status |
| email_verification_token | VARCHAR(255) | - | NULL | Token for email verification |
| password_reset_token | VARCHAR(255) | - | NULL | Token for password reset |
| password_reset_expires | TIMESTAMP | - | NULL | Password reset token expiration |
| is_admin | BOOLEAN | - | FALSE | Administrative privileges flag |
| created_at | TIMESTAMP | - | NOW() | Account creation timestamp |
| last_active_at | TIMESTAMP | - | NOW() | Last activity timestamp |

**Indexes**:
- `idx_users_email` - Unique email lookup
- `idx_users_auth_provider` - OAuth provider lookup
- `idx_users_last_active` - Activity-based queries
- `idx_users_email_verified` - Verified user queries

#### companies
**Purpose**: Stores company information and verification status

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique company identifier |
| name | VARCHAR(255) | NOT NULL | - | Company name |
| domain | VARCHAR(255) | UNIQUE, NOT NULL | - | Company domain for verification |
| is_verified | BOOLEAN | - | FALSE | Verification status |
| verification_token | VARCHAR(255) | - | NULL | Token for domain verification |
| verification_email | VARCHAR(255) | - | NULL | Email used for verification |
| verified_at | TIMESTAMP | - | NULL | Verification completion timestamp |
| created_at | TIMESTAMP | - | NOW() | Company registration timestamp |
| updated_at | TIMESTAMP | - | NOW() | Last update timestamp |

**Indexes**:
- `idx_companies_name_trgm` - Fuzzy name search using trigrams
- `idx_companies_verified` - Verified company queries

#### applications
**Purpose**: Stores application information that can receive bug reports

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique application identifier |
| name | VARCHAR(255) | NOT NULL | - | Application name |
| url | TEXT | - | NULL | Application URL |
| company_id | UUID | FOREIGN KEY → companies(id) | NULL | Associated company |
| created_at | TIMESTAMP | - | NOW() | Application creation timestamp |

**Indexes**:
- `idx_applications_name_trgm` - Fuzzy name search using trigrams

#### bug_reports
**Purpose**: Core table storing bug report information and metadata

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique bug report identifier |
| title | VARCHAR(255) | NOT NULL | - | Bug report title |
| description | TEXT | NOT NULL | - | Detailed bug description |
| status | VARCHAR(20) | - | 'open' | Bug status (open, reviewing, fixed, wont_fix) |
| priority | VARCHAR(20) | - | 'medium' | Bug priority (low, medium, high, critical) |
| tags | TEXT[] | - | NULL | Array of tags for categorization |
| operating_system | VARCHAR(100) | - | NULL | OS where bug occurred |
| device_type | VARCHAR(100) | - | NULL | Device type information |
| app_version | VARCHAR(50) | - | NULL | Application version |
| browser_version | VARCHAR(100) | - | NULL | Browser version information |
| application_id | UUID | FOREIGN KEY → applications(id), NOT NULL | - | Associated application |
| reporter_id | UUID | FOREIGN KEY → users(id) | NULL | Bug reporter (null for anonymous) |
| assigned_company_id | UUID | FOREIGN KEY → companies(id) | NULL | Company assigned to handle bug |
| vote_count | INTEGER | - | 0 | Number of upvotes |
| comment_count | INTEGER | - | 0 | Number of comments |
| created_at | TIMESTAMP | - | NOW() | Bug report creation timestamp |
| updated_at | TIMESTAMP | - | NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | - | NULL | Soft delete timestamp |
| resolved_at | TIMESTAMP | - | NULL | Resolution timestamp |

**Indexes**:
- `idx_bug_reports_status` - Status-based filtering
- `idx_bug_reports_created_at` - Chronological sorting
- `idx_bug_reports_vote_count` - Popularity sorting
- `idx_bug_reports_application_id` - Application-specific queries
- `idx_bug_reports_company_id` - Company-assigned bugs
- `idx_bug_reports_fulltext_search` - Full-text search on title and description
- `idx_bug_reports_tags_gin` - Tag-based filtering
- `idx_bug_reports_trending` - Trending bugs (recent + high votes)
- `idx_bug_reports_open_recent` - Recent open bugs
- `idx_bug_reports_high_priority` - High priority bugs

### Relationship Tables

#### company_members
**Purpose**: Many-to-many relationship between users and companies

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique membership identifier |
| company_id | UUID | FOREIGN KEY → companies(id), NOT NULL | - | Company reference |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | - | User reference |
| role | VARCHAR(20) | - | 'member' | User role in company (member, admin) |
| added_at | TIMESTAMP | - | NOW() | Membership creation timestamp |

**Constraints**:
- UNIQUE(company_id, user_id) - Prevents duplicate memberships

**Indexes**:
- `idx_company_members_company_user` - Membership lookup
- `idx_company_members_user_role` - User role queries

#### bug_votes
**Purpose**: Tracks user votes on bug reports

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique vote identifier |
| bug_id | UUID | FOREIGN KEY → bug_reports(id), NOT NULL | - | Bug report reference |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | - | User reference |
| created_at | TIMESTAMP | - | NOW() | Vote timestamp |

**Constraints**:
- UNIQUE(bug_id, user_id) - Prevents duplicate votes

**Indexes**:
- `idx_bug_votes_bug_user` - Vote lookup and duplicate prevention
- `idx_bug_votes_user_created` - User voting history

#### comments
**Purpose**: Stores comments on bug reports

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique comment identifier |
| bug_id | UUID | FOREIGN KEY → bug_reports(id), NOT NULL | - | Bug report reference |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | - | Comment author |
| content | TEXT | NOT NULL | - | Comment content |
| is_company_response | BOOLEAN | - | FALSE | Flag for official company responses |
| created_at | TIMESTAMP | - | NOW() | Comment creation timestamp |
| updated_at | TIMESTAMP | - | NOW() | Last update timestamp |

**Indexes**:
- `idx_comments_bug_created` - Bug-specific comment listing
- `idx_comments_user_created` - User comment history
- `idx_comments_company_response` - Company response filtering

#### file_attachments
**Purpose**: Stores file attachments for bug reports

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique attachment identifier |
| bug_id | UUID | FOREIGN KEY → bug_reports(id), NOT NULL | - | Bug report reference |
| filename | VARCHAR(255) | NOT NULL | - | Original filename |
| file_url | TEXT | NOT NULL | - | URL to stored file |
| file_size | INTEGER | - | NULL | File size in bytes |
| mime_type | VARCHAR(100) | - | NULL | File MIME type |
| uploaded_at | TIMESTAMP | - | NOW() | Upload timestamp |

**Indexes**:
- `idx_file_attachments_bug` - Bug-specific attachment listing

### Security and Audit Tables

#### jwt_blacklist
**Purpose**: Tracks invalidated JWT tokens for security

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique blacklist entry identifier |
| token_jti | VARCHAR(255) | UNIQUE, NOT NULL | - | JWT ID claim |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | - | Token owner |
| expires_at | TIMESTAMP | NOT NULL | - | Token expiration time |
| created_at | TIMESTAMP | - | NOW() | Blacklist entry timestamp |

**Indexes**:
- `idx_jwt_blacklist_token` - Token validation lookup
- `idx_jwt_blacklist_expires` - Expired token cleanup
- `idx_jwt_blacklist_expires_token` - Active token validation

#### audit_logs
**Purpose**: Tracks administrative actions for security and compliance

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | Unique audit log identifier |
| action | VARCHAR(100) | NOT NULL | - | Action performed |
| resource | VARCHAR(100) | NOT NULL | - | Resource type affected |
| resource_id | UUID | - | NULL | Specific resource identifier |
| details | TEXT | - | NULL | Additional action details |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | - | User who performed action |
| ip_address | VARCHAR(45) | - | NULL | IP address of user |
| user_agent | VARCHAR(500) | - | NULL | User agent string |
| created_at | TIMESTAMP | - | NOW() | Action timestamp |

**Indexes**:
- `idx_audit_logs_action` - Action-based filtering
- `idx_audit_logs_resource` - Resource-based filtering
- `idx_audit_logs_user_id` - User action history
- `idx_audit_logs_created_at` - Chronological queries

## Performance Considerations

### Indexing Strategy

1. **Primary Indexes**: All tables use UUID primary keys with automatic generation
2. **Unique Indexes**: Email addresses, company domains, and composite keys for preventing duplicates
3. **Foreign Key Indexes**: All foreign key relationships are indexed for join performance
4. **Full-Text Search**: GIN indexes on bug report titles and descriptions for search functionality
5. **Composite Indexes**: Multi-column indexes for common query patterns
6. **Partial Indexes**: Conditional indexes for frequently filtered subsets

### Query Optimization

1. **Trending Bugs**: Composite index on creation date and vote count for trending algorithms
2. **Tag Filtering**: GIN index on tag arrays for efficient tag-based queries
3. **Fuzzy Search**: Trigram indexes for approximate string matching on names
4. **Time-Based Queries**: Optimized indexes for date range filtering
5. **Status Filtering**: Partial indexes for common status-based queries

### Maintenance Operations

1. **Token Cleanup**: Regular cleanup of expired JWT blacklist entries
2. **Soft Delete Cleanup**: Periodic cleanup of soft-deleted bug reports
3. **Index Maintenance**: Regular VACUUM and ANALYZE operations for optimal performance
4. **Statistics Updates**: Automatic statistics updates for query planner optimization

## Data Integrity

### Foreign Key Constraints

All relationships are enforced through foreign key constraints with appropriate cascading rules:
- User deletions cascade to related votes, comments, and audit logs
- Bug report deletions cascade to votes, comments, and attachments
- Company deletions cascade to applications and memberships

### Validation Rules

1. **Email Format**: Email addresses are validated at the application level
2. **Status Values**: Bug status and priority values are validated using enums
3. **UUID Format**: All UUID fields are validated for proper format
4. **Required Fields**: NOT NULL constraints enforce required data
5. **Unique Constraints**: Prevent duplicate emails, domains, and votes

### Data Consistency

1. **Vote Counting**: Vote counts are maintained through triggers or application logic
2. **Comment Counting**: Comment counts are updated when comments are added/removed
3. **Timestamp Management**: Created/updated timestamps are automatically managed
4. **Soft Deletes**: Deleted records are marked with timestamps rather than physically removed