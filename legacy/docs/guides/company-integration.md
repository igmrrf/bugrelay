# Company Integration Guide

This guide provides comprehensive documentation for integrating with BugRelay's company management system, including API endpoints, authentication requirements, and example workflows.

## Overview

The BugRelay Company Integration API allows companies to:
- Claim ownership of their applications
- Verify their identity through domain verification
- Manage team members and permissions
- Access company-specific dashboards and analytics
- Manage bug reports for their applications

## Getting Started

### Prerequisites

- A registered BugRelay user account
- Access to your company's domain email (for verification)
- Valid JWT authentication token

### Base URL

All company endpoints are prefixed with:
```
https://api.bugrelay.com/api/v1/companies
```

## Authentication

Company integration uses JWT-based authentication. Include your token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Permission Levels

- **Public**: Company listing and viewing (no authentication required)
- **Authenticated**: Company claiming and verification
- **Company Member**: Dashboard access and bug management
- **Company Admin**: Full team management capabilities

## Company Verification Process

### Step 1: Find Your Company

First, search for your company in the system:

```bash
curl -X GET "https://api.bugrelay.com/api/v1/companies?search=mycompany.com"
```

Companies are automatically created when bug reports are submitted for applications. If your company doesn't exist, it will be created when the first bug report is submitted for your application.

### Step 2: Initiate Company Claim

Start the verification process by providing a company domain email:

```bash
curl -X POST "https://api.bugrelay.com/api/v1/companies/{company-id}/claim" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "email": "admin@yourcompany.com"
  }'
```

**Requirements:**
- Email must be from your company's domain
- Company must not already be verified
- You must not already be a member of the company

### Step 3: Complete Verification

Use the verification token sent to your email to complete the process:

```bash
curl -X POST "https://api.bugrelay.com/api/v1/companies/{company-id}/verify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "token": "verification-token-from-email"
  }'
```

Upon successful verification:
- Your company is marked as verified
- You become a company admin
- All matching applications are associated with your company
- All related bug reports are assigned to your company

## API Endpoints

### List Companies

Retrieve a paginated list of companies with search and filtering:

```http
GET /api/v1/companies?page=1&limit=20&search=myapp&verified=true
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search by company name or domain
- `verified`: Filter by verification status (true/false)

### Get Company Details

Retrieve detailed information about a specific company:

```http
GET /api/v1/companies/{id}
```

### Company Dashboard

Access company dashboard data (requires company membership):

```http
GET /api/v1/companies/{id}/dashboard
```

Returns:
- Company information and applications
- Your role in the company
- Bug statistics by status
- Recent bug reports

### Team Management

#### Add Team Member

Add a new team member (admin only):

```bash
curl -X POST "https://api.bugrelay.com/api/v1/companies/{id}/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "email": "newmember@yourcompany.com",
    "role": "member"
  }'
```

**Roles:**
- `admin`: Can manage team members and all bug reports
- `member`: Can manage bug reports for assigned applications

#### Remove Team Member

Remove a team member (admin only, or self-removal):

```bash
curl -X DELETE "https://api.bugrelay.com/api/v1/companies/{id}/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "user_id": "user-uuid-to-remove"
  }'
```

## Integration Examples

### JavaScript/Node.js Integration

```javascript
class BugRelayCompanyAPI {
  constructor(apiKey, baseUrl = 'https://api.bugrelay.com/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async searchCompanies(query) {
    const response = await fetch(`${this.baseUrl}/companies?search=${encodeURIComponent(query)}`);
    return response.json();
  }

  async claimCompany(companyId, email) {
    const response = await fetch(`${this.baseUrl}/companies/${companyId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ email })
    });
    return response.json();
  }

  async verifyCompany(companyId, token) {
    const response = await fetch(`${this.baseUrl}/companies/${companyId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ token })
    });
    return response.json();
  }

  async getDashboard(companyId) {
    const response = await fetch(`${this.baseUrl}/companies/${companyId}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    return response.json();
  }

  async addTeamMember(companyId, email, role = 'member') {
    const response = await fetch(`${this.baseUrl}/companies/${companyId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ email, role })
    });
    return response.json();
  }
}

// Usage example
const api = new BugRelayCompanyAPI('your-jwt-token');

// Search for your company
const companies = await api.searchCompanies('mycompany.com');
const companyId = companies.companies[0].id;

// Claim the company
await api.claimCompany(companyId, 'admin@mycompany.com');

// Verify with token from email
await api.verifyCompany(companyId, 'verification-token');

// Get dashboard data
const dashboard = await api.getDashboard(companyId);
console.log('Bug statistics:', dashboard.bug_stats);
```

### Python Integration

```python
import requests
import json

class BugRelayCompanyAPI:
    def __init__(self, api_key, base_url='https://api.bugrelay.com/api/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def search_companies(self, query):
        response = requests.get(f'{self.base_url}/companies', params={'search': query})
        return response.json()

    def claim_company(self, company_id, email):
        data = {'email': email}
        response = requests.post(
            f'{self.base_url}/companies/{company_id}/claim',
            headers=self.headers,
            json=data
        )
        return response.json()

    def verify_company(self, company_id, token):
        data = {'token': token}
        response = requests.post(
            f'{self.base_url}/companies/{company_id}/verify',
            headers=self.headers,
            json=data
        )
        return response.json()

    def get_dashboard(self, company_id):
        response = requests.get(
            f'{self.base_url}/companies/{company_id}/dashboard',
            headers=self.headers
        )
        return response.json()

    def add_team_member(self, company_id, email, role='member'):
        data = {'email': email, 'role': role}
        response = requests.post(
            f'{self.base_url}/companies/{company_id}/members',
            headers=self.headers,
            json=data
        )
        return response.json()

# Usage example
api = BugRelayCompanyAPI('your-jwt-token')

# Search for your company
companies = api.search_companies('mycompany.com')
company_id = companies['companies'][0]['id']

# Claim the company
api.claim_company(company_id, 'admin@mycompany.com')

# Verify with token from email
api.verify_company(company_id, 'verification-token')

# Get dashboard data
dashboard = api.get_dashboard(company_id)
print(f"Total bugs: {dashboard['bug_stats']['total']}")
```

## Workflow Examples

### Complete Company Setup Workflow

1. **Search and Identify Company**
   ```bash
   # Search for your company
   curl "https://api.bugrelay.com/api/v1/companies?search=mycompany.com"
   ```

2. **Initiate Claim Process**
   ```bash
   # Start verification
   curl -X POST "https://api.bugrelay.com/api/v1/companies/{id}/claim" \
     -H "Authorization: Bearer <token>" \
     -d '{"email": "admin@mycompany.com"}'
   ```

3. **Complete Verification**
   ```bash
   # Verify with email token
   curl -X POST "https://api.bugrelay.com/api/v1/companies/{id}/verify" \
     -H "Authorization: Bearer <token>" \
     -d '{"token": "email-verification-token"}'
   ```

4. **Set Up Team**
   ```bash
   # Add team members
   curl -X POST "https://api.bugrelay.com/api/v1/companies/{id}/members" \
     -H "Authorization: Bearer <token>" \
     -d '{"email": "developer@mycompany.com", "role": "member"}'
   ```

### Bug Management Workflow

1. **Access Dashboard**
   ```bash
   curl "https://api.bugrelay.com/api/v1/companies/{id}/dashboard" \
     -H "Authorization: Bearer <token>"
   ```

2. **Review Bug Statistics**
   - Total bugs assigned to your company
   - Bugs by status (open, reviewing, fixed, won't fix)
   - Recent bug reports

3. **Manage Bug Reports**
   - Update bug status through the bugs API
   - Add company responses to bug reports
   - Assign bugs to team members

## Domain Matching Rules

### Automatic Company Creation

Companies are automatically created when bug reports are submitted:
- Domain extracted from application URL (e.g., `https://myapp.com` → `myapp.com`)
- Placeholder domains for apps without URLs (e.g., `MyApp` → `myapp.app`)

### Verification Requirements

- Email domain must exactly match company domain
- www prefix is automatically stripped for matching
- Placeholder domains (*.app) cannot be verified through email

### Application Association

Upon verification, the system automatically:
- Associates all applications with matching domains
- Assigns all related bug reports to the company
- Links historical data to the verified company

## Error Handling

### Common Error Codes

- `INVALID_DOMAIN`: Email domain doesn't match company domain
- `ALREADY_VERIFIED`: Company is already verified
- `ALREADY_MEMBER`: User is already a company member
- `USER_NOT_FOUND`: User must register before being added as team member
- `INSUFFICIENT_PERMISSIONS`: Only admins can perform this action
- `LAST_ADMIN`: Cannot remove the last admin from a company

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Rate Limiting

- **General API**: 60 requests per minute per IP
- **Verification emails**: Limited to prevent abuse
- **Team management**: Standard rate limits apply

## Security Considerations

### Domain Verification

- Only domain owners can claim companies
- Secure random tokens prevent unauthorized claims
- Tokens expire after reasonable time periods

### Access Control

- Role-based permissions (admin vs member)
- Company membership required for sensitive operations
- Last admin protection prevents lockout

### Best Practices

1. **Secure Token Storage**: Never expose JWT tokens in client-side code
2. **Domain Validation**: Ensure email domains match your company domain
3. **Team Management**: Regularly review team member access
4. **Monitoring**: Monitor API usage and error rates

## Support and Troubleshooting

### Common Issues

1. **Email Domain Mismatch**
   - Ensure verification email is from your company domain
   - Check for typos in domain names
   - Contact support for domain changes

2. **Verification Token Issues**
   - Check email spam/junk folders
   - Tokens may expire after 24 hours
   - Request new verification if needed

3. **Permission Errors**
   - Verify your role in the company
   - Ensure you're authenticated with correct token
   - Contact company admin for role changes

### Getting Help

- API Documentation: [https://docs.bugrelay.com/api](https://docs.bugrelay.com/api)
- Support Email: support@bugrelay.com
- Status Page: [https://status.bugrelay.com](https://status.bugrelay.com)

## Next Steps

After completing company integration:

1. **Configure Bug Management**: Set up workflows for handling bug reports
2. **Team Training**: Ensure team members understand the bug triage process
3. **API Integration**: Integrate with your existing development tools
4. **Monitoring Setup**: Configure notifications for new bug reports
5. **Analytics Review**: Regularly review bug statistics and trends

For more detailed API documentation, see the [API Reference](/api/) section.