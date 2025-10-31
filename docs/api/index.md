# API Reference

Welcome to the BugRelay Backend API documentation. This comprehensive reference covers all available endpoints, authentication methods, and data models.

## Overview

The BugRelay API is a RESTful service that provides:

- **Bug Management**: Create, read, update, and delete bug reports
- **User Authentication**: JWT-based authentication with refresh tokens
- **Company Management**: Multi-tenant support for organizations
- **File Uploads**: Attachment support for screenshots and logs
- **Real-time Updates**: WebSocket support for live notifications

## Base URL

```
Production: https://api.bugrelay.com
Development: http://localhost:8080
```

## Quick Links

- [OpenAPI Specification](./openapi) - Complete API specification
- [Interactive Explorer](./explorer.html) - Test endpoints in your browser
- [Authentication Endpoints](./endpoints/authentication) - Login, register, refresh tokens
- [Bug Management](./endpoints/bugs) - Bug CRUD operations
- [Company Management](./endpoints/companies) - Organization management
- [Request Examples](./examples/) - Sample requests and responses

## Authentication

All API requests require authentication using JWT tokens:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.bugrelay.com/api/v1/bugs
```

See the [Authentication Guide](/authentication/) for detailed implementation.

## Rate Limits

- **Authenticated users**: 100 requests per minute
- **Anonymous users**: 10 requests per minute  
- **File uploads**: 3 requests per minute

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

Error responses:

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

## Getting Started

1. [Register for an account](./endpoints/authentication#register)
2. [Obtain an access token](./endpoints/authentication#login)
3. [Create your first bug report](./endpoints/bugs#create-bug)
4. [Explore the interactive API explorer](./explorer.html)

For a complete walkthrough, see our [Quick Start Guide](/guides/quick-start).