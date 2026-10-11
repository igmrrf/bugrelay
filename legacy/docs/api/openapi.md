# OpenAPI Specification

The BugRelay API is fully documented using the OpenAPI 3.0 specification, providing a machine-readable description of all endpoints, request/response schemas, and authentication methods.

## Interactive API Explorer

Explore and test the API directly in your browser:

<div style="text-align: center; margin: 2rem 0;">
  <a href="./explorer.html" target="_blank" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
    🚀 Open API Explorer
  </a>
</div>

The interactive explorer provides:
- **Swagger UI** - Try out API endpoints directly
- **ReDoc** - Beautiful, responsive API documentation
- **Server Selection** - Switch between development and production
- **Authentication** - Test with your JWT tokens

## Download Specification

- **YAML Format**: [openapi.yaml](./openapi.yaml)
- **JSON Format**: [openapi.json](./openapi.json) *(generated)*

## Using the Specification

### Import into Postman

1. Open Postman
2. Click "Import" → "Link"
3. Enter: `https://docs.bugrelay.com/api/openapi.yaml`
4. Click "Continue" and "Import"

### Generate Client SDKs

Use the OpenAPI Generator to create client libraries:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate JavaScript client
openapi-generator-cli generate \
  -i https://docs.bugrelay.com/api/openapi.yaml \
  -g javascript \
  -o ./bugrelay-js-client

# Generate Python client
openapi-generator-cli generate \
  -i https://docs.bugrelay.com/api/openapi.yaml \
  -g python \
  -o ./bugrelay-python-client

# Generate Go client
openapi-generator-cli generate \
  -i https://docs.bugrelay.com/api/openapi.yaml \
  -g go \
  -o ./bugrelay-go-client
```

### Validate API Responses

Use the specification to validate API responses in your tests:

```javascript
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');

async function validateResponse(endpoint, method, responseData) {
  const api = await SwaggerParser.dereference('./openapi.yaml');
  const schema = api.paths[endpoint][method].responses['200'].content['application/json'].schema;
  
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(responseData);
  
  if (!valid) {
    console.error('Validation errors:', validate.errors);
  }
  
  return valid;
}
```

## API Overview

### Base URLs

- **Development**: `http://localhost:8080`
- **Production**: `https://api.bugrelay.com`

### Authentication

The API uses JWT (JSON Web Tokens) for authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Content Type

All requests and responses use JSON:

```http
Content-Type: application/json
```

### Rate Limiting

Rate limits are enforced per user/IP:

- **Anonymous**: 10 requests/minute
- **Authenticated**: 100 requests/minute
- **File uploads**: 3 requests/minute

## Endpoint Categories

### 🔐 Authentication
- User registration and login
- JWT token management
- OAuth integration (Google, GitHub)
- Profile management

### 🐛 Bug Management
- Create and update bug reports
- Vote and comment on bugs
- File attachments
- Search and filtering

### 🏢 Company Management
- Company verification
- Team member management
- Application association
- Company dashboard

### 👑 Administration
- Content moderation
- User management
- Audit logging
- System statistics

## Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully"
}
```

### Error Response
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

### Paginated Response
```json
{
  "success": true,
  "data": [
    // Array of items
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

## Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Code Examples

### cURL Examples

```bash
# Register a new user
curl -X POST https://api.bugrelay.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "display_name": "John Doe"
  }'

# Login
curl -X POST https://api.bugrelay.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'

# Create a bug report (with authentication)
curl -X POST https://api.bugrelay.com/api/v1/bugs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login button not working",
    "description": "The login button does not respond when clicked",
    "application_id": "123e4567-e89b-12d3-a456-426614174000",
    "priority": "high",
    "tags": ["ui", "authentication"]
  }'
```

### JavaScript/Node.js Examples

```javascript
const axios = require('axios');

class BugRelayAPI {
  constructor(baseURL = 'https://api.bugrelay.com', token = null) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });
  }

  async register(email, password, displayName) {
    const response = await this.client.post('/api/v1/auth/register', {
      email,
      password,
      display_name: displayName
    });
    return response.data;
  }

  async login(email, password) {
    const response = await this.client.post('/api/v1/auth/login', {
      email,
      password
    });
    return response.data;
  }

  async createBug(bugData) {
    const response = await this.client.post('/api/v1/bugs', bugData);
    return response.data;
  }

  async getBugs(params = {}) {
    const response = await this.client.get('/api/v1/bugs', { params });
    return response.data;
  }
}

// Usage
const api = new BugRelayAPI();
const loginResult = await api.login('user@example.com', 'password');
const apiWithAuth = new BugRelayAPI('https://api.bugrelay.com', loginResult.data.access_token);
```

### Python Examples

```python
import requests
from typing import Optional, Dict, Any

class BugRelayAPI:
    def __init__(self, base_url: str = "https://api.bugrelay.com", token: Optional[str] = None):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def register(self, email: str, password: str, display_name: str) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/api/v1/auth/register", json={
            "email": email,
            "password": password,
            "display_name": display_name
        })
        response.raise_for_status()
        return response.json()
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/api/v1/auth/login", json={
            "email": email,
            "password": password
        })
        response.raise_for_status()
        return response.json()
    
    def create_bug(self, bug_data: Dict[str, Any]) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/api/v1/bugs", json=bug_data)
        response.raise_for_status()
        return response.json()
    
    def get_bugs(self, **params) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}/api/v1/bugs", params=params)
        response.raise_for_status()
        return response.json()

# Usage
api = BugRelayAPI()
login_result = api.login("user@example.com", "password")
api_with_auth = BugRelayAPI(token=login_result["data"]["access_token"])
```

## Webhooks

BugRelay supports webhooks for real-time notifications. Configure webhook endpoints to receive events:

```json
{
  "event": "bug.created",
  "data": {
    "bug": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "New bug report",
      "status": "open"
    }
  },
  "timestamp": "2023-01-01T12:00:00Z"
}
```

## Need Help?

- **Issues**: [Report on GitHub](https://github.com/your-org/bugrelay/issues)
- **Questions**: Check our [FAQ](/guides/troubleshooting)
- **Feature Requests**: [Submit a request](https://github.com/your-org/bugrelay/issues/new)