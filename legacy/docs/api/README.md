# API Reference

The BugRelay backend provides a comprehensive REST API for managing bug reports, user authentication, company verification, and administrative functions.

## Base URL

```
https://api.bugrelay.com/api/v1
```

For development:
```
http://localhost:8080/api/v1
```

## Authentication

Most endpoints require authentication using JWT tokens. See the [Authentication Guide](/authentication/) for detailed information.

### Quick Authentication Example

```bash
# Login to get a token
curl -X POST https://api.bugrelay.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use the token in subsequent requests
curl -X GET https://api.bugrelay.com/api/v1/bugs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Anonymous users**: 10 requests per minute
- **Authenticated users**: 100 requests per minute
- **Bug submission**: 5 requests per minute
- **File uploads**: 3 requests per minute

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Response Format

All API responses follow a consistent format:

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

## Status Codes

The API uses standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## API Endpoints

### Authentication
- [Authentication Endpoints](/api/endpoints/bugs) - User registration, login, and token management

### Bug Management
- [Bug Endpoints](/api/endpoints/bugs) - Create, read, update, and manage bug reports

### Company Management
- [Company Endpoints](/api/endpoints/companies) - Company verification and team management

### Administration
- [Admin Endpoints](/api/endpoints/admin) - Administrative functions and moderation

### Logging
- [Logging Endpoints](/api/endpoints/logs) - System logs and audit trails

## Interactive API Explorer

Explore the API interactively using our OpenAPI specification:

- [OpenAPI Specification](/api/openapi.yaml)
- [Swagger UI](https://petstore.swagger.io/?url=https://docs.bugrelay.com/api/openapi.yaml)

## Code Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.bugrelay.com/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create a bug report
const createBug = async (bugData) => {
  try {
    const response = await api.post('/bugs', bugData);
    return response.data;
  } catch (error) {
    console.error('Error creating bug:', error.response.data);
    throw error;
  }
};
```

### Python
```python
import requests

class BugRelayAPI:
    def __init__(self, base_url="https://api.bugrelay.com/api/v1", token=None):
        self.base_url = base_url
        self.session = requests.Session()
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def create_bug(self, bug_data):
        response = self.session.post(f"{self.base_url}/bugs", json=bug_data)
        response.raise_for_status()
        return response.json()
    
    def get_bugs(self, **params):
        response = self.session.get(f"{self.base_url}/bugs", params=params)
        response.raise_for_status()
        return response.json()

# Usage
api = BugRelayAPI(token="your_jwt_token")
bugs = api.get_bugs(status="open", limit=10)
```

### cURL
```bash
# Set your token as an environment variable
export BUGRELAY_TOKEN="your_jwt_token_here"

# Create a bug report
curl -X POST https://api.bugrelay.com/api/v1/bugs \
  -H "Authorization: Bearer $BUGRELAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login button not working",
    "description": "The login button does not respond when clicked",
    "application_id": "123e4567-e89b-12d3-a456-426614174000",
    "priority": "high",
    "tags": ["ui", "authentication"]
  }'

# Get all bugs
curl -X GET "https://api.bugrelay.com/api/v1/bugs?status=open&limit=10" \
  -H "Authorization: Bearer $BUGRELAY_TOKEN"
```

## SDKs and Libraries

Official and community SDKs are available for popular programming languages:

- **JavaScript/TypeScript**: `npm install @bugrelay/sdk`
- **Python**: `pip install bugrelay-python`
- **Go**: `go get github.com/bugrelay/go-sdk`
- **PHP**: `composer require bugrelay/php-sdk`

## Webhooks

BugRelay supports webhooks for real-time notifications. See the [Webhooks Guide](/guides/webhooks) for setup instructions.

## Need Help?

- Check the [Troubleshooting Guide](/guides/troubleshooting)
- Review [Integration Examples](/guides/integration-examples)
- [Report issues on GitHub](https://github.com/your-org/bugrelay/issues)