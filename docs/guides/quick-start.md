# Quick Start Guide

Get up and running with the BugRelay backend API in just a few minutes. This guide will walk you through setting up your development environment, making your first API calls, and implementing basic functionality.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 16+ or **Python** 3.8+ or **Go** 1.19+ (depending on your preferred language)
- **curl** or **Postman** for testing API endpoints
- A text editor or IDE
- Basic knowledge of REST APIs and JSON

## Step 1: Set Up Your Environment

### Option A: Using Docker (Recommended)

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/your-org/bugrelay.git
cd bugrelay

# Start the development environment
docker-compose up -d

# Verify the API is running
curl http://localhost:8080/health
```

### Option B: Local Development

If you prefer to run the backend locally:

```bash
# Install dependencies
cd backend
go mod download

# Set up environment variables
cp .env.example .env
nano .env  # Edit configuration

# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Run database migrations
go run cmd/migrate/main.go up

# Start the server
go run main.go
```

## Step 2: Verify Installation

Test that the API is running correctly:

```bash
# Health check
curl http://localhost:8080/health

# API status
curl http://localhost:8080/api/v1/status
```

You should see responses like:

```json
{
  "status": "ok",
  "service": "bugrelay-backend"
}
```

## Step 3: Create Your First User

### Register a New User

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "securepassword123",
    "display_name": "Developer User"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "developer@example.com",
      "display_name": "Developer User",
      "is_email_verified": false,
      "is_admin": false
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

### Login (Alternative)

If you already have an account:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "securepassword123"
  }'
```

::: tip Save Your Token
Copy the `access_token` from the response - you'll need it for authenticated requests.
:::

## Step 4: Create Your First Bug Report

Now let's create a bug report using your authentication token:

```bash
# Replace YOUR_TOKEN with the access_token from step 3
curl -X POST http://localhost:8080/api/v1/bugs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login button not responsive on mobile",
    "description": "When using the mobile app on iOS, the login button does not respond to taps. This happens consistently on iPhone 12 and 13.",
    "application_id": "123e4567-e89b-12d3-a456-426614174000",
    "priority": "high",
    "tags": ["mobile", "ios", "login", "ui"],
    "operating_system": "iOS 16.0",
    "device_type": "iPhone 13",
    "app_version": "2.1.0"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174000",
    "title": "Login button not responsive on mobile",
    "description": "When using the mobile app on iOS...",
    "status": "open",
    "priority": "high",
    "tags": ["mobile", "ios", "login", "ui"],
    "vote_count": 0,
    "comment_count": 0,
    "created_at": "2023-01-01T12:00:00Z"
  }
}
```

## Step 5: Explore the API

### Get All Bug Reports

```bash
curl -X GET "http://localhost:8080/api/v1/bugs?limit=10&status=open" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get a Specific Bug Report

```bash
curl -X GET http://localhost:8080/api/v1/bugs/456e7890-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add a Comment

```bash
curl -X POST http://localhost:8080/api/v1/bugs/456e7890-e89b-12d3-a456-426614174000/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I can confirm this issue also happens on iPhone 14 Pro."
  }'
```

### Vote on a Bug

```bash
curl -X POST http://localhost:8080/api/v1/bugs/456e7890-e89b-12d3-a456-426614174000/vote \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "up"
  }'
```

## Step 6: Using Client Libraries

Instead of making raw HTTP requests, you can use our client libraries:

### JavaScript/Node.js

```bash
npm install @bugrelay/sdk
```

```javascript
const { BugRelayClient } = require('@bugrelay/sdk');

const client = new BugRelayClient('http://localhost:8080');

async function quickStart() {
  // Login
  const auth = await client.login('developer@example.com', 'securepassword123');
  console.log('Logged in:', auth.data.user.display_name);

  // Create authenticated client
  const authClient = new BugRelayClient('http://localhost:8080', auth.data.access_token);

  // Create a bug report
  const bug = await authClient.createBug({
    title: 'API Integration Test',
    description: 'Testing the API integration from Node.js',
    application_id: '123e4567-e89b-12d3-a456-426614174000',
    priority: 'medium',
    tags: ['api', 'test']
  });

  console.log('Created bug:', bug.data.id);

  // Get all bugs
  const bugs = await authClient.getBugs({ limit: 5 });
  console.log('Total bugs:', bugs.data.length);
}

quickStart().catch(console.error);
```

### Python

```bash
pip install bugrelay-python
```

```python
from bugrelay import BugRelayClient

def quick_start():
    # Initialize client
    client = BugRelayClient('http://localhost:8080')
    
    # Login
    auth = client.login('developer@example.com', 'securepassword123')
    print(f"Logged in: {auth['data']['user']['display_name']}")
    
    # Create authenticated client
    auth_client = BugRelayClient('http://localhost:8080', auth['data']['access_token'])
    
    # Create a bug report
    bug = auth_client.create_bug(
        title='Python API Integration Test',
        description='Testing the API integration from Python',
        application_id='123e4567-e89b-12d3-a456-426614174000',
        priority='medium',
        tags=['api', 'test', 'python']
    )
    
    print(f"Created bug: {bug['data']['id']}")
    
    # Get all bugs
    bugs = auth_client.get_bugs(limit=5)
    print(f"Total bugs: {len(bugs['data'])}")

if __name__ == '__main__':
    quick_start()
```

## Step 7: File Uploads

To upload files (screenshots, logs, etc.) with bug reports:

```bash
# Upload a file attachment
curl -X POST http://localhost:8080/api/v1/bugs/456e7890-e89b-12d3-a456-426614174000/attachments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@screenshot.png"
```

## Step 8: Company Integration

If you're integrating BugRelay for a company:

### Claim Your Company

```bash
curl -X POST http://localhost:8080/api/v1/companies/123e4567-e89b-12d3-a456-426614174000/claim \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com"
  }'
```

### Get Company Dashboard

```bash
curl -X GET http://localhost:8080/api/v1/companies/123e4567-e89b-12d3-a456-426614174000/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Use Cases

### 1. Bug Reporting Widget

Create a simple bug reporting widget for your website:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Bug Report Widget</title>
    <style>
        .bug-widget { 
            max-width: 400px; 
            margin: 20px; 
            padding: 20px; 
            border: 1px solid #ccc; 
            border-radius: 8px; 
        }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea, select { 
            width: 100%; 
            padding: 8px; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
        }
        button { 
            background: #007bff; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
        }
    </style>
</head>
<body>
    <div class="bug-widget">
        <h3>Report a Bug</h3>
        <form id="bugForm">
            <div class="form-group">
                <label for="title">Title:</label>
                <input type="text" id="title" required>
            </div>
            
            <div class="form-group">
                <label for="description">Description:</label>
                <textarea id="description" rows="4" required></textarea>
            </div>
            
            <div class="form-group">
                <label for="priority">Priority:</label>
                <select id="priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            </div>
            
            <button type="submit">Submit Bug Report</button>
        </form>
        
        <div id="result" style="margin-top: 15px;"></div>
    </div>

    <script>
        document.getElementById('bugForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                priority: document.getElementById('priority').value,
                application_id: '123e4567-e89b-12d3-a456-426614174000', // Your app ID
                tags: ['web', 'user-report']
            };
            
            try {
                const response = await fetch('http://localhost:8080/api/v1/bugs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Note: For anonymous reporting, you might need reCAPTCHA
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('result').innerHTML = 
                        '<p style="color: green;">Bug report submitted successfully!</p>';
                    document.getElementById('bugForm').reset();
                } else {
                    document.getElementById('result').innerHTML = 
                        '<p style="color: red;">Error: ' + result.error.message + '</p>';
                }
            } catch (error) {
                document.getElementById('result').innerHTML = 
                    '<p style="color: red;">Network error: ' + error.message + '</p>';
            }
        });
    </script>
</body>
</html>
```

### 2. Automated Bug Reporting

Integrate automatic bug reporting in your application:

```javascript
// Error boundary for React applications
class BugReportingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.bugRelay = new BugRelayClient('https://api.bugrelay.com', 'your-token');
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    // Automatically report the error
    try {
      await this.bugRelay.createBug({
        title: `Unhandled Error: ${error.message}`,
        description: `
          Error: ${error.message}
          Stack: ${error.stack}
          Component Stack: ${errorInfo.componentStack}
          User Agent: ${navigator.userAgent}
          URL: ${window.location.href}
        `,
        application_id: 'your-app-id',
        priority: 'high',
        tags: ['automatic', 'error', 'frontend']
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. The error has been reported.</h1>;
    }

    return this.props.children;
  }
}
```

## Next Steps

Now that you have the basics working, explore these advanced features:

1. **[Authentication Guide](/authentication/)** - Implement OAuth, JWT refresh, and user management
2. **[API Reference](/api/)** - Explore all available endpoints
3. **[Company Integration](/guides/company-integration)** - Set up company verification and team management
4. **[File Uploads](/guides/file-uploads)** - Handle screenshots and attachments
5. **[Webhooks](/guides/webhooks)** - Set up real-time notifications
6. **[Rate Limiting](/guides/rate-limiting)** - Understand and handle API limits

## Troubleshooting

### Common Issues

**1. "Connection refused" error**
```bash
# Check if the server is running
curl http://localhost:8080/health

# Check Docker containers
docker-compose ps
```

**2. "Invalid token" error**
- Ensure you're using the correct `access_token`
- Check if the token has expired (default: 1 hour)
- Use the refresh token to get a new access token

**3. "Validation error" responses**
- Check that all required fields are provided
- Verify field formats (email, UUID, etc.)
- Review the API documentation for field constraints

**4. Rate limiting**
- Authenticated users: 100 requests/minute
- Anonymous users: 10 requests/minute
- File uploads: 3 requests/minute

### Getting Help

- **Documentation**: [Full API Reference](/api/)
- **Issues**: [GitHub Issues](https://github.com/your-org/bugrelay/issues)
- **Examples**: [Integration Examples](/guides/integration-examples)
- **Community**: [Discord Server](https://discord.gg/bugrelay)

## Summary

You've successfully:

✅ Set up the BugRelay backend API  
✅ Created your first user account  
✅ Made authenticated API requests  
✅ Created and managed bug reports  
✅ Explored basic functionality  

You're now ready to integrate BugRelay into your applications! Check out our [Integration Examples](/guides/integration-examples) for more advanced use cases.