# Model Schemas

This document provides comprehensive information about the JSON schemas used throughout the BugRelay system, including validation rules, structure definitions, and usage examples.

## Overview

BugRelay uses JSON Schema (Draft 7) to define and validate data structures across the API, MCP integration, and client applications. These schemas ensure data consistency, enable automatic validation, and support code generation tools.

## Schema Organization

### Core Schema Files

- [`schema.json`](./schema.json) - Main model definitions for all core entities
- [`../mcp/schemas/api-responses.json`](../mcp/schemas/api-responses.json) - MCP-specific response schemas
- [`../api/openapi.json`](../api/openapi.json) - OpenAPI specification with embedded schemas

### Schema Categories

1. **Entity Schemas** - Core business objects (User, BugReport, Company)
2. **Request Schemas** - API request validation schemas
3. **Response Schemas** - API response format schemas
4. **MCP Schemas** - Model Context Protocol tool schemas

## Core Entity Schemas

### User Schema

The User schema defines the structure for user accounts and authentication data.

**Schema Reference**: `#/definitions/User`

**Key Properties**:
- `id` (UUID) - Unique user identifier
- `email` (email format) - User email address (unique)
- `username` (string, 3-50 chars) - Display username (unique)
- `first_name` (string, max 100 chars) - User's first name
- `last_name` (string, max 100 chars) - User's last name
- `is_verified` (boolean) - Email verification status
- `role` (enum) - User role: `user`, `admin`, `company_admin`

**Validation Rules**:
```json
{
  "type": "object",
  "required": ["id", "email", "username", "role", "created_at"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 50
    },
    "role": {
      "type": "string",
      "enum": ["user", "admin", "company_admin"]
    }
  }
}
```

**Usage Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "is_verified": true,
  "role": "user",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### BugReport Schema

The BugReport schema defines the structure for bug reports with comprehensive metadata.

**Schema Reference**: `#/definitions/BugReport`

**Key Properties**:
- `id` (UUID) - Unique bug report identifier
- `title` (string, max 255 chars) - Bug report title
- `description` (string) - Detailed bug description
- `status` (enum) - Current status: `open`, `reviewing`, `fixed`, `wont_fix`
- `priority` (enum) - Priority level: `low`, `medium`, `high`, `critical`
- `vote_count` (integer, min 0) - Number of user votes
- `application_id` (UUID) - Associated application ID

**Validation Rules**:
```json
{
  "type": "object",
  "required": ["id", "title", "description", "status", "application_id", "created_at"],
  "properties": {
    "title": {
      "type": "string",
      "maxLength": 255
    },
    "status": {
      "type": "string",
      "enum": ["open", "reviewing", "fixed", "wont_fix"]
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"]
    },
    "vote_count": {
      "type": "integer",
      "minimum": 0
    }
  }
}
```

**Usage Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "title": "Login button not responsive",
  "description": "The login button doesn't respond when clicked on mobile devices",
  "status": "open",
  "priority": "high",
  "vote_count": 5,
  "reporter_id": "550e8400-e29b-41d4-a716-446655440000",
  "application_id": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2024-01-15T14:30:00Z",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

## Request Schemas

### Bug Report Creation Schema

Used for validating bug report creation requests.

**Schema Properties**:
```json
{
  "type": "object",
  "required": ["title", "description", "application_id"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "description": "Bug report title"
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "description": "Detailed description of the bug"
    },
    "application_id": {
      "type": "string",
      "format": "uuid",
      "description": "UUID of the application"
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"],
      "default": "medium"
    },
    "operating_system": {
      "type": "string",
      "maxLength": 100
    },
    "device_type": {
      "type": "string",
      "maxLength": 50
    },
    "app_version": {
      "type": "string",
      "maxLength": 50
    },
    "browser_version": {
      "type": "string",
      "maxLength": 100
    }
  }
}
```

### User Registration Schema

Used for validating user registration requests.

**Schema Properties**:
```json
{
  "type": "object",
  "required": ["email", "username", "password"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "description": "User email address"
    },
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 50,
      "pattern": "^[a-zA-Z0-9_-]+$",
      "description": "Unique username"
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "description": "User password"
    },
    "first_name": {
      "type": "string",
      "maxLength": 100
    },
    "last_name": {
      "type": "string",
      "maxLength": 100
    }
  }
}
```

## Response Schemas

### API Response Wrapper

All API responses follow a consistent wrapper format.

**Schema Structure**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Indicates if the request was successful"
    },
    "data": {
      "description": "Response data (varies by endpoint)"
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "description": "Error code"
        },
        "message": {
          "type": "string",
          "description": "Human-readable error message"
        },
        "details": {
          "type": "object",
          "description": "Additional error details"
        }
      }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "total": {
          "type": "integer",
          "minimum": 0
        },
        "pages": {
          "type": "integer",
          "minimum": 0
        }
      }
    }
  },
  "required": ["success"]
}
```

### Paginated List Response

Used for endpoints that return lists of items.

**Schema Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "title": "Login button not working",
      "status": "open",
      "priority": "high"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

## MCP Tool Schemas

### Bug Report Creation Tool

Schema for the MCP `create_bug_report` tool.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Bug report title (max 255 characters)",
      "maxLength": 255
    },
    "description": {
      "type": "string",
      "description": "Detailed description of the bug"
    },
    "application_id": {
      "type": "string",
      "format": "uuid",
      "description": "UUID of the application where the bug was found"
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"],
      "description": "Priority level of the bug",
      "default": "medium"
    },
    "operating_system": {
      "type": "string",
      "description": "Operating system where the bug occurred"
    },
    "device_type": {
      "type": "string",
      "description": "Type of device (desktop, mobile, tablet)"
    },
    "app_version": {
      "type": "string",
      "description": "Version of the application"
    },
    "browser_version": {
      "type": "string",
      "description": "Browser version (if web application)"
    }
  },
  "required": ["title", "description", "application_id"]
}
```

### Search Bug Reports Tool

Schema for the MCP `search_bug_reports` tool.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query for bug title and description"
    },
    "status": {
      "type": "string",
      "enum": ["open", "reviewing", "fixed", "wont_fix"],
      "description": "Filter by bug status"
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"],
      "description": "Filter by priority level"
    },
    "application_id": {
      "type": "string",
      "format": "uuid",
      "description": "Filter by application ID"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Maximum number of results to return"
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Number of results to skip for pagination"
    }
  }
}
```

## Validation Rules

### Common Validation Patterns

#### UUID Format
```json
{
  "type": "string",
  "format": "uuid",
  "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
}
```

#### Email Format
```json
{
  "type": "string",
  "format": "email",
  "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
}
```

#### Date-Time Format
```json
{
  "type": "string",
  "format": "date-time",
  "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$"
}
```

### Field Length Constraints

| Field Type | Minimum | Maximum | Notes |
|------------|---------|---------|-------|
| Username | 3 | 50 | Alphanumeric, underscore, hyphen only |
| Email | - | 254 | Must be valid email format |
| Bug Title | 1 | 255 | Required, non-empty |
| Bug Description | 1 | - | Required, no maximum length |
| Company Name | 1 | 255 | Required for company creation |
| Comment Content | 1 | 10000 | Required for comments |
| File Name | 1 | 255 | Required for file attachments |

### Enum Value Constraints

#### Bug Status Values
- `open` - Newly reported, awaiting review
- `reviewing` - Under investigation
- `fixed` - Issue resolved
- `wont_fix` - Acknowledged but won't be fixed

#### Priority Levels
- `low` - Minor issue
- `medium` - Standard issue (default)
- `high` - Important issue
- `critical` - Urgent issue

#### User Roles
- `user` - Standard user account
- `admin` - System administrator
- `company_admin` - Company administrator

## Schema Usage Examples

### Client-Side Validation

```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

// Load schema
const bugReportSchema = {
  "type": "object",
  "required": ["title", "description", "application_id"],
  // ... schema definition
};

const validate = ajv.compile(bugReportSchema);

// Validate data
const bugData = {
  title: "Login issue",
  description: "Cannot log in with valid credentials",
  application_id: "550e8400-e29b-41d4-a716-446655440002"
};

if (validate(bugData)) {
  console.log('Valid bug report data');
} else {
  console.log('Validation errors:', validate.errors);
}
```

### Server-Side Validation (Go)

```go
package validation

import (
    "github.com/go-playground/validator/v10"
)

type BugReportRequest struct {
    Title         string `json:"title" validate:"required,min=1,max=255"`
    Description   string `json:"description" validate:"required,min=1"`
    ApplicationID string `json:"application_id" validate:"required,uuid"`
    Priority      string `json:"priority" validate:"omitempty,oneof=low medium high critical"`
}

func ValidateBugReport(req BugReportRequest) error {
    validate := validator.New()
    return validate.Struct(req)
}
```

### MCP Tool Integration

```python
from mcp.types import Tool

def create_bug_report_tool():
    return Tool(
        name="create_bug_report",
        description="Create a new bug report",
        inputSchema={
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "maxLength": 255,
                    "description": "Bug report title"
                },
                "description": {
                    "type": "string",
                    "description": "Bug description"
                },
                "application_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "Application UUID"
                }
            },
            "required": ["title", "description", "application_id"]
        }
    )
```

## Schema Evolution and Versioning

### Backward Compatibility

When updating schemas, follow these guidelines:

1. **Additive Changes**: New optional fields can be added
2. **Field Deprecation**: Mark fields as deprecated before removal
3. **Enum Extensions**: New enum values can be added at the end
4. **Validation Relaxation**: Constraints can be made less strict

### Breaking Changes

Breaking changes require API version updates:

1. **Required Field Addition**: Making optional fields required
2. **Field Removal**: Removing existing fields
3. **Type Changes**: Changing field data types
4. **Validation Tightening**: Making constraints more strict

### Version Management

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://api.bugrelay.com/schemas/v1/bug-report.json",
  "version": "1.2.0",
  "title": "BugReport",
  "description": "Bug report schema v1.2.0"
}
```

## Related Documentation

- [Data Models](./data-models) - Detailed model documentation
- [API Reference](../api/) - Complete API documentation
- [MCP Integration](../mcp/) - Model Context Protocol integration
- [Authentication](../authentication/) - Authentication schemas and flows

## Tools and Resources

- **JSON Schema Validator**: [jsonschemavalidator.net](https://www.jsonschemavalidator.net/)
- **Schema Generator**: [quicktype.io](https://quicktype.io/)
- **OpenAPI Editor**: [editor.swagger.io](https://editor.swagger.io/)
- **AJV Validator**: [ajv.js.org](https://ajv.js.org/) - JavaScript validation library