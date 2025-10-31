# API Examples

This section provides comprehensive examples for integrating with the BugRelay API across different programming languages and use cases.

## Quick Start Examples

### Authentication Flow

```javascript
// Complete authentication flow example
const BugRelayAPI = require('./bugrelay-client');

async function authenticateUser() {
  const api = new BugRelayAPI('https://api.bugrelay.com');
  
  try {
    // Register new user
    const registerResult = await api.register({
      email: 'newuser@example.com',
      password: 'securepassword123',
      display_name: 'New User'
    });
    
    console.log('Registration successful:', registerResult.data.user);
    
    // Login to get tokens
    const loginResult = await api.login({
      email: 'newuser@example.com',
      password: 'securepassword123'
    });
    
    console.log('Login successful, token expires in:', loginResult.data.expires_in);
    
    // Create authenticated client
    const authenticatedAPI = new BugRelayAPI('https://api.bugrelay.com', loginResult.data.access_token);
    
    return authenticatedAPI;
    
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}
```

### Bug Report Management

```python
# Complete bug management example
import requests
from datetime import datetime

class BugManager:
    def __init__(self, api_token):
        self.base_url = "https://api.bugrelay.com/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    def create_bug_report(self, title, description, application_id, **kwargs):
        """Create a new bug report with optional metadata"""
        bug_data = {
            "title": title,
            "description": description,
            "application_id": application_id,
            "priority": kwargs.get("priority", "medium"),
            "tags": kwargs.get("tags", []),
            "operating_system": kwargs.get("os"),
            "device_type": kwargs.get("device"),
            "app_version": kwargs.get("version"),
            "browser_version": kwargs.get("browser")
        }
        
        # Remove None values
        bug_data = {k: v for k, v in bug_data.items() if v is not None}
        
        response = requests.post(
            f"{self.base_url}/bugs",
            json=bug_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def add_comment(self, bug_id, content):
        """Add a comment to a bug report"""
        response = requests.post(
            f"{self.base_url}/bugs/{bug_id}/comments",
            json={"content": content},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def vote_on_bug(self, bug_id, vote_type="up"):
        """Vote on a bug report (up/down)"""
        response = requests.post(
            f"{self.base_url}/bugs/{bug_id}/vote",
            json={"type": vote_type},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def search_bugs(self, **filters):
        """Search bugs with various filters"""
        params = {}
        
        if filters.get("status"):
            params["status"] = filters["status"]
        if filters.get("priority"):
            params["priority"] = filters["priority"]
        if filters.get("tags"):
            params["tags"] = ",".join(filters["tags"])
        if filters.get("application_id"):
            params["application_id"] = filters["application_id"]
        if filters.get("search"):
            params["search"] = filters["search"]
        
        response = requests.get(
            f"{self.base_url}/bugs",
            params=params,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage example
bug_manager = BugManager("your_jwt_token_here")

# Create a bug report
new_bug = bug_manager.create_bug_report(
    title="Mobile app crashes on startup",
    description="The app crashes immediately after opening on iOS devices",
    application_id="123e4567-e89b-12d3-a456-426614174000",
    priority="critical",
    tags=["crash", "mobile", "ios"],
    os="iOS 16.0",
    device="iPhone 14",
    version="2.1.0"
)

print(f"Created bug report: {new_bug['data']['id']}")

# Add a comment
comment = bug_manager.add_comment(
    new_bug['data']['id'],
    "This also happens on iPhone 13 with the same iOS version"
)

# Vote on the bug
vote = bug_manager.vote_on_bug(new_bug['data']['id'], "up")
```

## Language-Specific Examples

For detailed examples in specific programming languages, see:

- **[cURL Examples](curl-examples.md)** - Complete command-line examples for all endpoints
- **[JavaScript/Node.js Examples](javascript-examples.md)** - Browser and Node.js integration examples
- **[Python Examples](python-examples.md)** - Python client library and integration examples

### JavaScript/Node.js

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class BugRelayClient {
  constructor(baseURL = 'https://api.bugrelay.com', token = null) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BugRelay-JS-Client/1.0.0'
      }
    });

    // Add auth token if provided
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          console.error('Authentication failed - token may be expired');
        } else if (error.response?.status === 429) {
          console.error('Rate limit exceeded - please wait before retrying');
        }
        throw error;
      }
    );
  }

  // Authentication methods
  async register(userData) {
    const response = await this.client.post('/api/v1/auth/register', userData);
    return response.data;
  }

  async login(credentials) {
    const response = await this.client.post('/api/v1/auth/login', credentials);
    return response.data;
  }

  async refreshToken(refreshToken) {
    const response = await this.client.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken
    });
    return response.data;
  }

  // Bug management methods
  async createBug(bugData) {
    const response = await this.client.post('/api/v1/bugs', bugData);
    return response.data;
  }

  async getBug(bugId) {
    const response = await this.client.get(`/api/v1/bugs/${bugId}`);
    return response.data;
  }

  async updateBugStatus(bugId, status) {
    const response = await this.client.patch(`/api/v1/bugs/${bugId}`, { status });
    return response.data;
  }

  async uploadAttachment(bugId, filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await this.client.post(
      `/api/v1/bugs/${bugId}/attachments`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }

  // Company management methods
  async claimCompany(companyId, email) {
    const response = await this.client.post(`/api/v1/companies/${companyId}/claim`, {
      email
    });
    return response.data;
  }

  async getCompanyDashboard(companyId) {
    const response = await this.client.get(`/api/v1/companies/${companyId}/dashboard`);
    return response.data;
  }
}

module.exports = BugRelayClient;
```

### Python

```python
import requests
import json
from typing import Optional, Dict, Any, List
from pathlib import Path

class BugRelayClient:
    def __init__(self, base_url: str = "https://api.bugrelay.com", token: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "BugRelay-Python-Client/1.0.0"
        })
        
        # Set auth token if provided
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Handle API response and raise appropriate exceptions"""
        try:
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            if response.status_code == 401:
                raise Exception("Authentication failed - token may be expired")
            elif response.status_code == 429:
                raise Exception("Rate limit exceeded - please wait before retrying")
            else:
                error_data = response.json() if response.content else {}
                raise Exception(f"API Error: {error_data.get('error', {}).get('message', str(e))}")
    
    # Authentication methods
    def register(self, email: str, password: str, display_name: str) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/api/v1/auth/register", json={
            "email": email,
            "password": password,
            "display_name": display_name
        })
        return self._handle_response(response)
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/api/v1/auth/login", json={
            "email": email,
            "password": password
        })
        return self._handle_response(response)
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })
        return self._handle_response(response)
    
    # Bug management methods
    def create_bug(self, title: str, description: str, application_id: str, **kwargs) -> Dict[str, Any]:
        bug_data = {
            "title": title,
            "description": description,
            "application_id": application_id,
            **kwargs
        }
        response = self.session.post(f"{self.base_url}/api/v1/bugs", json=bug_data)
        return self._handle_response(response)
    
    def get_bug(self, bug_id: str) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}/api/v1/bugs/{bug_id}")
        return self._handle_response(response)
    
    def search_bugs(self, **filters) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}/api/v1/bugs", params=filters)
        return self._handle_response(response)
    
    def upload_attachment(self, bug_id: str, file_path: str) -> Dict[str, Any]:
        file_path = Path(file_path)
        
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/octet-stream')}
            # Remove Content-Type header for multipart upload
            headers = {k: v for k, v in self.session.headers.items() if k != 'Content-Type'}
            
            response = self.session.post(
                f"{self.base_url}/api/v1/bugs/{bug_id}/attachments",
                files=files,
                headers=headers
            )
        
        return self._handle_response(response)
    
    # Company management methods
    def claim_company(self, company_id: str, email: str) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/api/v1/companies/{company_id}/claim", json={
            "email": email
        })
        return self._handle_response(response)
    
    def get_company_dashboard(self, company_id: str) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}/api/v1/companies/{company_id}/dashboard")
        return self._handle_response(response)

# Usage example
if __name__ == "__main__":
    # Initialize client
    client = BugRelayClient()
    
    # Login
    login_result = client.login("user@example.com", "password")
    token = login_result["data"]["access_token"]
    
    # Create authenticated client
    auth_client = BugRelayClient(token=token)
    
    # Create a bug report
    bug = auth_client.create_bug(
        title="App crashes on login",
        description="The mobile app crashes when trying to log in",
        application_id="123e4567-e89b-12d3-a456-426614174000",
        priority="high",
        tags=["crash", "login", "mobile"]
    )
    
    print(f"Created bug: {bug['data']['id']}")
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
    "path/filepath"
    "time"
)

type BugRelayClient struct {
    BaseURL    string
    HTTPClient *http.Client
    Token      string
}

type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
    Message string      `json:"message,omitempty"`
}

type APIError struct {
    Code    string      `json:"code"`
    Message string      `json:"message"`
    Details interface{} `json:"details,omitempty"`
}

func NewBugRelayClient(baseURL string, token string) *BugRelayClient {
    return &BugRelayClient{
        BaseURL: baseURL,
        HTTPClient: &http.Client{
            Timeout: 30 * time.Second,
        },
        Token: token,
    }
}

func (c *BugRelayClient) makeRequest(method, endpoint string, body interface{}) (*APIResponse, error) {
    var reqBody io.Reader
    
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, fmt.Errorf("failed to marshal request body: %w", err)
        }
        reqBody = bytes.NewBuffer(jsonBody)
    }
    
    req, err := http.NewRequest(method, c.BaseURL+endpoint, reqBody)
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }
    
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("User-Agent", "BugRelay-Go-Client/1.0.0")
    
    if c.Token != "" {
        req.Header.Set("Authorization", "Bearer "+c.Token)
    }
    
    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()
    
    var apiResp APIResponse
    if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }
    
    if resp.StatusCode >= 400 {
        return &apiResp, fmt.Errorf("API error: %s", apiResp.Error.Message)
    }
    
    return &apiResp, nil
}

// Authentication methods
func (c *BugRelayClient) Register(email, password, displayName string) (*APIResponse, error) {
    body := map[string]string{
        "email":        email,
        "password":     password,
        "display_name": displayName,
    }
    return c.makeRequest("POST", "/api/v1/auth/register", body)
}

func (c *BugRelayClient) Login(email, password string) (*APIResponse, error) {
    body := map[string]string{
        "email":    email,
        "password": password,
    }
    return c.makeRequest("POST", "/api/v1/auth/login", body)
}

// Bug management methods
func (c *BugRelayClient) CreateBug(title, description, applicationID string, options map[string]interface{}) (*APIResponse, error) {
    body := map[string]interface{}{
        "title":          title,
        "description":    description,
        "application_id": applicationID,
    }
    
    // Add optional fields
    for k, v := range options {
        body[k] = v
    }
    
    return c.makeRequest("POST", "/api/v1/bugs", body)
}

func (c *BugRelayClient) GetBug(bugID string) (*APIResponse, error) {
    return c.makeRequest("GET", "/api/v1/bugs/"+bugID, nil)
}

func (c *BugRelayClient) UploadAttachment(bugID, filePath string) (*APIResponse, error) {
    file, err := os.Open(filePath)
    if err != nil {
        return nil, fmt.Errorf("failed to open file: %w", err)
    }
    defer file.Close()
    
    var body bytes.Buffer
    writer := multipart.NewWriter(&body)
    
    part, err := writer.CreateFormFile("file", filepath.Base(filePath))
    if err != nil {
        return nil, fmt.Errorf("failed to create form file: %w", err)
    }
    
    _, err = io.Copy(part, file)
    if err != nil {
        return nil, fmt.Errorf("failed to copy file: %w", err)
    }
    
    writer.Close()
    
    req, err := http.NewRequest("POST", c.BaseURL+"/api/v1/bugs/"+bugID+"/attachments", &body)
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }
    
    req.Header.Set("Content-Type", writer.FormDataContentType())
    req.Header.Set("Authorization", "Bearer "+c.Token)
    
    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()
    
    var apiResp APIResponse
    if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }
    
    return &apiResp, nil
}

func main() {
    // Initialize client
    client := NewBugRelayClient("https://api.bugrelay.com", "")
    
    // Login
    loginResp, err := client.Login("user@example.com", "password")
    if err != nil {
        fmt.Printf("Login failed: %v\n", err)
        return
    }
    
    // Extract token (you'd need to parse the response properly)
    fmt.Printf("Login successful: %+v\n", loginResp)
    
    // Create authenticated client
    authClient := NewBugRelayClient("https://api.bugrelay.com", "your_token_here")
    
    // Create a bug report
    bugResp, err := authClient.CreateBug(
        "App crashes on startup",
        "The application crashes immediately when opened",
        "123e4567-e89b-12d3-a456-426614174000",
        map[string]interface{}{
            "priority": "critical",
            "tags":     []string{"crash", "startup"},
        },
    )
    
    if err != nil {
        fmt.Printf("Failed to create bug: %v\n", err)
        return
    }
    
    fmt.Printf("Bug created: %+v\n", bugResp)
}
```

## Error Handling Examples

### Comprehensive Error Handling

```javascript
class BugRelayError extends Error {
  constructor(message, code, statusCode, details) {
    super(message);
    this.name = 'BugRelayError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class RobustBugRelayClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  async makeRequest(method, endpoint, data, options = {}) {
    const { retries = this.retryAttempts } = options;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            ...options.headers
          },
          body: data ? JSON.stringify(data) : undefined
        });

        const result = await response.json();

        if (!response.ok) {
          throw new BugRelayError(
            result.error?.message || 'Request failed',
            result.error?.code || 'UNKNOWN_ERROR',
            response.status,
            result.error?.details
          );
        }

        return result;

      } catch (error) {
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === retries) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
      }
    }
  }

  async createBugWithRetry(bugData) {
    try {
      return await this.makeRequest('POST', '/api/v1/bugs', bugData);
    } catch (error) {
      if (error instanceof BugRelayError) {
        switch (error.code) {
          case 'VALIDATION_ERROR':
            console.error('Validation failed:', error.details);
            // Handle validation errors
            break;
          case 'RATE_LIMIT_EXCEEDED':
            console.error('Rate limit exceeded, waiting...');
            // Handle rate limiting
            break;
          case 'UNAUTHORIZED':
            console.error('Token expired, refreshing...');
            // Handle token refresh
            break;
          default:
            console.error('Unexpected error:', error.message);
        }
      }
      throw error;
    }
  }
}
```

## Integration Patterns

### React Hook Example

```javascript
import { useState, useEffect, useCallback } from 'react';
import BugRelayClient from './bugrelay-client';

export function useBugRelay(token) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      setClient(new BugRelayClient('https://api.bugrelay.com', token));
    }
  }, [token]);

  const createBug = useCallback(async (bugData) => {
    if (!client) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.createBug(bugData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const searchBugs = useCallback(async (filters) => {
    if (!client) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.searchBugs(filters);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return {
    client,
    createBug,
    searchBugs,
    loading,
    error
  };
}

// Usage in component
function BugReportForm({ token }) {
  const { createBug, loading, error } = useBugRelay(token);
  
  const handleSubmit = async (formData) => {
    try {
      const bug = await createBug(formData);
      console.log('Bug created:', bug);
    } catch (error) {
      console.error('Failed to create bug:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {loading && <p>Creating bug report...</p>}
      {error && <p>Error: {error}</p>}
    </form>
  );
}
```

## Testing Examples

### Unit Testing with Jest

```javascript
const BugRelayClient = require('./bugrelay-client');
const nock = require('nock');

describe('BugRelayClient', () => {
  let client;
  const baseURL = 'https://api.bugrelay.com';
  const token = 'test-token';

  beforeEach(() => {
    client = new BugRelayClient(baseURL, token);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createBug', () => {
    it('should create a bug report successfully', async () => {
      const bugData = {
        title: 'Test bug',
        description: 'Test description',
        application_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const expectedResponse = {
        success: true,
        data: {
          id: 'bug-id',
          ...bugData,
          status: 'open'
        }
      };

      nock(baseURL)
        .post('/api/v1/bugs', bugData)
        .matchHeader('authorization', `Bearer ${token}`)
        .reply(201, expectedResponse);

      const result = await client.createBug(bugData);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle validation errors', async () => {
      const bugData = {
        title: '', // Invalid: empty title
        description: 'Test description',
        application_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title is required',
          details: { field: 'title' }
        }
      };

      nock(baseURL)
        .post('/api/v1/bugs')
        .reply(400, errorResponse);

      await expect(client.createBug(bugData)).rejects.toThrow('Title is required');
    });
  });
});
```

## Performance Optimization

### Caching and Batching

```javascript
class OptimizedBugRelayClient extends BugRelayClient {
  constructor(baseURL, token) {
    super(baseURL, token);
    this.cache = new Map();
    this.batchQueue = [];
    this.batchTimeout = null;
  }

  // Cache GET requests
  async getCachedBug(bugId, ttl = 300000) { // 5 minutes TTL
    const cacheKey = `bug:${bugId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const result = await this.getBug(bugId);
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  // Batch multiple requests
  batchRequest(request) {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ request, resolve, reject });
      
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, 100); // Batch requests for 100ms
    });
  }

  async processBatch() {
    const batch = this.batchQueue.splice(0);
    
    try {
      const results = await Promise.allSettled(
        batch.map(({ request }) => this.makeRequest(request.method, request.endpoint, request.data))
      );
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batch[index].resolve(result.value);
        } else {
          batch[index].reject(result.reason);
        }
      });
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }
}
```

These examples provide comprehensive coverage of common integration patterns, error handling, testing, and optimization techniques for working with the BugRelay API.