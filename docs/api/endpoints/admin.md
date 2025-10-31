# Administrative API Endpoints

This document provides comprehensive documentation for all administrative endpoints in the BugRelay API.

## Overview

The Administrative API provides system administrators with tools to moderate content, manage users and companies, view system statistics, and access audit logs. All administrative endpoints require admin-level authentication and are subject to additional security measures.

## Base URL

All administrative endpoints are prefixed with `/api/v1/admin`

## Authentication & Authorization

- **Authentication**: Required (JWT token)
- **Authorization**: Admin role required
- **Additional Security**: IP whitelist in production environments
- **Audit Logging**: All administrative actions are logged

## Rate Limiting

- **General API**: 60 requests per minute per IP
- All admin endpoints use the general rate limit

## Security Features

### IP Whitelist (Production)
In production environments, administrative endpoints are protected by IP whitelisting to ensure only authorized locations can access admin functions.

### Comprehensive Audit Logging
All administrative actions are automatically logged with:
- Action performed
- Resource affected
- User who performed the action
- IP address and user agent
- Detailed description of the action
- Timestamp

---

## Endpoints

### 1. Admin Dashboard

Retrieves comprehensive system statistics and recent activity for the administrative dashboard.

**Endpoint:** `GET /api/v1/admin/dashboard`

**Authentication:** Required (Admin)

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "stats": {
    "total_bugs": 1250,
    "open_bugs": 320,
    "flagged_bugs": 15,
    "total_users": 5420,
    "total_companies": 180,
    "verified_companies": 95,
    "recent_activity": [
      {
        "id": "audit-log-uuid",
        "action": "bug_remove",
        "resource": "bug_report",
        "resource_id": "bug-uuid",
        "details": "Bug removed. Reason: Spam content. Title: Fake bug report",
        "user_id": "admin-user-uuid",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2024-01-15T14:30:00Z",
        "user": {
          "id": "admin-user-uuid",
          "username": "admin_user",
          "email": "admin@bugrelay.com"
        }
      }
    ]
  }
}
```

**Dashboard Statistics:**
- **Bug Metrics**: Total bugs, open bugs, flagged bugs requiring attention
- **User Metrics**: Total registered users
- **Company Metrics**: Total companies and verified companies
- **Recent Activity**: Last 50 audit log entries with full details

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

---

### 2. List Bugs for Moderation

Retrieves bugs that require moderation attention with filtering and pagination.

**Endpoint:** `GET /api/v1/admin/bugs`

**Authentication:** Required (Admin)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by bug status (`open`, `reviewing`, `fixed`, `wont_fix`)
- `flagged`: Show only flagged bugs (`true`/`false`)

**Example Request:**
```
GET /api/v1/admin/bugs?page=1&limit=20&status=open&flagged=true
```

**Response (200 OK):**
```json
{
  "bugs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Suspicious bug report with many votes",
      "description": "This bug report has received an unusual amount of activity...",
      "status": "open",
      "priority": "high",
      "tags": ["suspicious", "high-activity"],
      "vote_count": 150,
      "comment_count": 75,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T12:00:00Z",
      "application": {
        "id": "app-uuid",
        "name": "SuspiciousApp",
        "url": "https://suspicious-app.com"
      },
      "reporter": {
        "id": "reporter-uuid",
        "username": "suspicious_user",
        "email": "user@example.com"
      },
      "assigned_company": {
        "id": "company-uuid",
        "name": "SuspiciousApp Inc",
        "is_verified": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

**Flagged Bug Criteria:**
- Bugs with unusually high vote counts (>100 votes)
- Bugs with excessive comments (>50 comments)
- Additional criteria can be configured based on moderation needs

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

---

### 3. Flag Bug for Review

Flags a bug report for administrative review and attention.

**Endpoint:** `POST /api/v1/admin/bugs/{id}/flag`

**Authentication:** Required (Admin)

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "reason": "Potential spam content with suspicious voting patterns"
}
```

**Field Validation:**
- `reason`: Required, 1-500 characters, explanation for flagging

**Response (200 OK):**
```json
{
  "message": "Bug flagged successfully",
  "bug_id": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Potential spam content with suspicious voting patterns"
}
```

**Audit Logging:**
- Action: `bug_flag`
- Resource: `bug_report`
- Details: Includes flagging reason and bug title
- User, IP, and timestamp automatically recorded

**Error Responses:**
- `400 Bad Request`: Invalid UUID format or validation errors
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

---

### 4. Remove Bug Report

Removes a bug report from public view (soft delete) with audit logging.

**Endpoint:** `DELETE /api/v1/admin/bugs/{id}`

**Authentication:** Required (Admin)

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "reason": "Spam content violating community guidelines"
}
```

**Field Validation:**
- `reason`: Required, 1-500 characters, explanation for removal

**Response (200 OK):**
```json
{
  "message": "Bug report removed successfully",
  "bug_id": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Spam content violating community guidelines"
}
```

**Soft Delete Behavior:**
- Bug is marked as deleted but not permanently removed
- Bug no longer appears in public listings
- Data is preserved for audit purposes
- Can be restored using the restore endpoint

**Audit Logging:**
- Action: `bug_remove`
- Resource: `bug_report`
- Details: Includes removal reason and original bug title
- Full audit trail maintained

**Error Responses:**
- `400 Bad Request`: Invalid UUID format or validation errors
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

---

### 5. Restore Bug Report

Restores a previously removed bug report back to public view.

**Endpoint:** `POST /api/v1/admin/bugs/{id}/restore`

**Authentication:** Required (Admin)

**Path Parameters:**
- `id`: Bug report UUID

**Request Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "message": "Bug report restored successfully",
  "bug_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Restore Behavior:**
- Removes the soft delete flag
- Bug becomes visible in public listings again
- All associated data (votes, comments, attachments) are restored
- Audit trail is maintained

**Audit Logging:**
- Action: `bug_restore`
- Resource: `bug_report`
- Details: Includes bug title
- Full restoration logged for accountability

**Error Responses:**
- `400 Bad Request`: Invalid UUID format, bug not deleted
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `404 Not Found`: Bug report not found
- `500 Internal Server Error`: Server error

**Error Codes:**
- `BUG_NOT_DELETED`: Bug report is not currently deleted

---

### 6. Merge Duplicate Bugs

Merges duplicate bug reports by consolidating all data into a target bug and removing the source bug.

**Endpoint:** `POST /api/v1/admin/bugs/merge`

**Authentication:** Required (Admin)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "source_bug_id": "source-bug-uuid",
  "target_bug_id": "target-bug-uuid",
  "reason": "Duplicate reports for the same iOS crash issue"
}
```

**Field Validation:**
- `source_bug_id`: Required, valid UUID, bug to be merged (will be removed)
- `target_bug_id`: Required, valid UUID, bug to merge into (will be kept)
- `reason`: Required, 1-500 characters, explanation for merge
- Source and target must be different bugs

**Response (200 OK):**
```json
{
  "message": "Bugs merged successfully",
  "source_bug_id": "source-bug-uuid",
  "target_bug_id": "target-bug-uuid",
  "reason": "Duplicate reports for the same iOS crash issue"
}
```

**Merge Process:**
1. **Vote Consolidation**: All votes from source bug are moved to target bug (avoiding duplicates)
2. **Comment Migration**: All comments are moved to target bug
3. **Attachment Transfer**: All file attachments are moved to target bug
4. **Count Updates**: Target bug's vote and comment counts are recalculated
5. **Merge Comment**: Automatic comment added to target bug explaining the merge
6. **Source Removal**: Source bug is soft-deleted
7. **Audit Logging**: Complete merge operation is logged

**Transaction Safety:**
- Entire merge operation is performed in a database transaction
- If any step fails, all changes are rolled back
- Data integrity is maintained throughout the process

**Audit Logging:**
- Action: `bug_merge`
- Resource: `bug_report` (target bug)
- Details: Includes both bug titles, IDs, and merge reason
- Complete merge operation documented

**Error Responses:**
- `400 Bad Request`: Invalid UUIDs, same source/target, validation errors
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `404 Not Found`: Source or target bug not found
- `500 Internal Server Error`: Server error, transaction rollback

**Error Codes:**
- `INVALID_MERGE`: Source and target bugs must be different
- `SOURCE_BUG_NOT_FOUND`: Source bug report not found
- `TARGET_BUG_NOT_FOUND`: Target bug report not found

---

### 7. Get Audit Logs

Retrieves audit log entries with filtering and pagination for administrative oversight.

**Endpoint:** `GET /api/v1/admin/audit-logs`

**Authentication:** Required (Admin)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `action`: Filter by action type (see Action Types below)
- `resource`: Filter by resource type (see Resource Types below)
- `user_id`: Filter by user UUID who performed the action

**Example Request:**
```
GET /api/v1/admin/audit-logs?page=1&limit=50&action=bug_remove&resource=bug_report
```

**Response (200 OK):**
```json
{
  "logs": [
    {
      "id": "audit-log-uuid",
      "action": "bug_remove",
      "resource": "bug_report",
      "resource_id": "bug-uuid",
      "details": "Bug removed. Reason: Spam content violating community guidelines. Title: Fake bug report",
      "user_id": "admin-user-uuid",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "created_at": "2024-01-15T14:30:00Z",
      "user": {
        "id": "admin-user-uuid",
        "username": "admin_user",
        "email": "admin@bugrelay.com"
      }
    },
    {
      "id": "audit-log-uuid-2",
      "action": "bug_merge",
      "resource": "bug_report",
      "resource_id": "target-bug-uuid",
      "details": "Merged bug 'iOS crash on startup' (ID: source-uuid) into 'Application crashes on iOS' (ID: target-uuid). Reason: Duplicate reports",
      "user_id": "admin-user-uuid",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "created_at": "2024-01-15T13:15:00Z",
      "user": {
        "id": "admin-user-uuid",
        "username": "admin_user",
        "email": "admin@bugrelay.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

**Action Types:**
- `bug_flag`: Bug flagged for review
- `bug_remove`: Bug report removed
- `bug_merge`: Duplicate bugs merged
- `bug_restore`: Deleted bug restored
- `user_ban`: User account banned
- `user_unban`: User account unbanned
- `company_verify`: Company manually verified
- `company_unverify`: Company verification revoked

**Resource Types:**
- `bug_report`: Bug report related actions
- `user`: User account related actions
- `company`: Company related actions
- `comment`: Comment related actions

**Audit Log Fields:**
- **Action**: Type of administrative action performed
- **Resource**: Type of resource affected
- **Resource ID**: UUID of the specific resource (if applicable)
- **Details**: Human-readable description of the action
- **User**: Administrator who performed the action
- **IP Address**: Source IP address of the action
- **User Agent**: Browser/client information
- **Timestamp**: When the action was performed

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

---

## Security & Compliance

### Authentication & Authorization

**Multi-Layer Security:**
1. **JWT Authentication**: Valid admin token required
2. **Role Verification**: Admin role checked on every request
3. **IP Whitelisting**: Production environments restrict access by IP
4. **Audit Logging**: All actions logged for accountability

### Audit Trail Requirements

**Comprehensive Logging:**
- Every administrative action is logged
- Logs include user identity, IP address, and user agent
- Detailed descriptions of actions performed
- Immutable audit trail for compliance

**Log Retention:**
- Audit logs are preserved for compliance requirements
- No automatic deletion of audit records
- Searchable and filterable for investigations

### Data Protection

**Soft Delete Policy:**
- Bug reports are soft-deleted, not permanently removed
- Data can be restored if removal was in error
- Maintains data integrity for audit purposes

**Transaction Safety:**
- Complex operations (like merging) use database transactions
- Rollback capability if operations fail
- Data consistency maintained at all times

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
- `FORBIDDEN`: Admin role required
- `BUG_NOT_FOUND`: Bug report not found
- `USER_NOT_FOUND`: User not found
- `INVALID_MERGE`: Invalid merge operation
- `BUG_NOT_DELETED`: Bug is not currently deleted
- `AUDIT_LOG_FAILED`: Failed to log audit action

### HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Best Practices

### Administrative Actions

**Documentation Requirements:**
- Always provide clear, detailed reasons for actions
- Use descriptive language in audit logs
- Document the business justification for actions

**Verification Steps:**
- Verify bug/user/company details before taking action
- Double-check merge operations to avoid data loss
- Review audit logs regularly for unusual patterns

### Security Considerations

**Access Control:**
- Limit admin access to necessary personnel only
- Use strong authentication mechanisms
- Monitor admin activity through audit logs
- Implement IP restrictions in production

**Data Handling:**
- Prefer soft deletes over permanent removal
- Maintain audit trails for all actions
- Ensure transaction safety for complex operations
- Regular backup of audit logs

### Monitoring & Alerting

**Recommended Monitoring:**
- Track admin login patterns
- Monitor bulk operations (multiple deletions/merges)
- Alert on unusual admin activity
- Regular audit log reviews

**Performance Considerations:**
- Audit log queries may be expensive with large datasets
- Consider archiving old audit logs
- Index audit logs appropriately for search performance
- Monitor database performance during bulk operations