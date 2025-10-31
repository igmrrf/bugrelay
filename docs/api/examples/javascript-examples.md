# JavaScript/Node.js Examples

This document provides comprehensive JavaScript examples for integrating with the BugRelay API using both browser fetch API and Node.js.

## Setup and Configuration

### Browser Setup

```javascript
// BugRelay API Client for Browser
class BugRelayClient {
  constructor(baseURL = 'http://localhost:8080', apiKey = null) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.accessToken = localStorage.getItem('bugrelay_access_token');
    this.refreshToken = localStorage.getItem('bugrelay_refresh_token');
  }

  // Set authentication tokens
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('bugrelay_access_token', accessToken);
    localStorage.setItem('bugrelay_refresh_token', refreshToken);
  }

  // Clear authentication tokens
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('bugrelay_access_token');
    localStorage.removeItem('bugrelay_refresh_token');
  }

  // Make authenticated request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authentication header if token exists
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    // Add API key for logs endpoint
    if (this.apiKey && endpoint.includes('/logs/')) {
      headers['X-API-Key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle token refresh on 401
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token
          headers.Authorization = `Bearer ${this.accessToken}`;
          return await fetch(url, { ...options, headers });
        }
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      } else {
        this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }
}

// Initialize client
const bugRelay = new BugRelayClient('http://localhost:8080');
```

### Node.js Setup

```javascript
// BugRelay API Client for Node.js
const https = require('https');
const http = require('http');
const querystring = require('querystring');

class BugRelayNodeClient {
  constructor(baseURL = 'http://localhost:8080', apiKey = null) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Set authentication tokens
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  // Make HTTP request
  async request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BugRelay-NodeJS-Client/1.0.0',
          ...options.headers
        }
      };

      // Add authentication header
      if (this.accessToken) {
        requestOptions.headers.Authorization = `Bearer ${this.accessToken}`;
      }

      // Add API key for logs endpoint
      if (this.apiKey && endpoint.includes('/logs/')) {
        requestOptions.headers['X-API-Key'] = this.apiKey;
      }

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = {
              status: res.statusCode,
              headers: res.headers,
              data: data ? JSON.parse(data) : null
            };
            resolve(response);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }

      req.end();
    });
  }
}

// Initialize client
const bugRelay = new BugRelayNodeClient('http://localhost:8080');
```

## Authentication Examples

### User Registration

```javascript
// Register a new user
async function registerUser(email, password, displayName) {
  try {
    const response = await bugRelay.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        password: password,
        display_name: displayName
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Store tokens for future requests
      bugRelay.setTokens(data.access_token, data.refresh_token);
      
      console.log('Registration successful:', data.user);
      return data;
    } else {
      const error = await response.json();
      console.error('Registration failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Usage
registerUser('user@example.com', 'securepassword123', 'John Doe')
  .then(data => console.log('User registered:', data.user))
  .catch(error => console.error('Error:', error.message));
```

### User Login

```javascript
// Login user
async function loginUser(email, password) {
  try {
    const response = await bugRelay.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Store tokens
      bugRelay.setTokens(data.access_token, data.refresh_token);
      
      console.log('Login successful:', data.user);
      return data;
    } else {
      const error = await response.json();
      console.error('Login failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Usage
loginUser('user@example.com', 'securepassword123')
  .then(data => console.log('User logged in:', data.user))
  .catch(error => console.error('Error:', error.message));
```

### Get User Profile

```javascript
// Get current user profile
async function getUserProfile() {
  try {
    const response = await bugRelay.request('/api/v1/auth/profile');

    if (response.ok) {
      const data = await response.json();
      console.log('User profile:', data);
      return data;
    } else {
      const error = await response.json();
      console.error('Failed to get profile:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Profile error:', error);
    throw error;
  }
}

// Usage
getUserProfile()
  .then(profile => console.log('Profile:', profile))
  .catch(error => console.error('Error:', error.message));
```

### Update User Profile

```javascript
// Update user profile
async function updateUserProfile(updates) {
  try {
    const response = await bugRelay.request('/api/v1/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Profile updated:', data);
      return data;
    } else {
      const error = await response.json();
      console.error('Profile update failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Profile update error:', error);
    throw error;
  }
}

// Usage
updateUserProfile({
  display_name: 'Jane Doe',
  avatar_url: 'https://example.com/avatar.jpg'
})
  .then(profile => console.log('Updated profile:', profile))
  .catch(error => console.error('Error:', error.message));
```

### Logout

```javascript
// Logout user
async function logoutUser() {
  try {
    const response = await bugRelay.request('/api/v1/auth/logout', {
      method: 'POST'
    });

    if (response.ok) {
      bugRelay.clearTokens();
      console.log('Logout successful');
      return true;
    } else {
      const error = await response.json();
      console.error('Logout failed:', error);
      return false;
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Clear tokens anyway on error
    bugRelay.clearTokens();
    return false;
  }
}

// Usage
logoutUser()
  .then(success => console.log('Logged out:', success))
  .catch(error => console.error('Error:', error.message));
```

## Bug Management Examples

### Create Bug Report

```javascript
// Create a new bug report
async function createBugReport(bugData) {
  try {
    const response = await bugRelay.request('/api/v1/bugs', {
      method: 'POST',
      body: JSON.stringify(bugData)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Bug report created:', data.bug);
      return data;
    } else {
      const error = await response.json();
      console.error('Bug creation failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Bug creation error:', error);
    throw error;
  }
}

// Usage - Authenticated user
createBugReport({
  title: 'Login form validation error',
  description: 'Email validation fails for valid email addresses containing plus signs.',
  priority: 'medium',
  tags: ['validation', 'login', 'email'],
  operating_system: 'Windows 11',
  device_type: 'Desktop',
  app_version: '3.2.1',
  browser_version: 'Chrome 120.0',
  application_name: 'MyApp',
  application_url: 'https://myapp.com'
})
  .then(data => console.log('Bug created:', data.bug))
  .catch(error => console.error('Error:', error.message));

// Usage - Anonymous user (requires reCAPTCHA)
createBugReport({
  title: 'Application crashes on startup',
  description: 'The application crashes immediately when launched on iOS 15.0.',
  priority: 'high',
  tags: ['crash', 'ios', 'startup'],
  operating_system: 'iOS 15.0',
  device_type: 'iPhone 12',
  app_version: '2.1.0',
  browser_version: 'Safari 15.0',
  application_name: 'MyApp',
  application_url: 'https://myapp.com',
  contact_email: 'user@example.com',
  recaptcha_token: 'your_recaptcha_token_here'
})
  .then(data => console.log('Anonymous bug created:', data.bug))
  .catch(error => console.error('Error:', error.message));
```

### List Bug Reports

```javascript
// Get bug reports with filtering and pagination
async function getBugReports(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters to query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    const endpoint = `/api/v1/bugs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await bugRelay.request(endpoint);

    if (response.ok) {
      const data = await response.json();
      console.log(`Found ${data.pagination.total} bugs`);
      return data;
    } else {
      const error = await response.json();
      console.error('Failed to get bugs:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Get bugs error:', error);
    throw error;
  }
}

// Usage examples
getBugReports()
  .then(data => console.log('All bugs:', data.bugs))
  .catch(error => console.error('Error:', error.message));

getBugReports({
  page: 1,
  limit: 20,
  search: 'crash',
  status: 'open',
  priority: 'high',
  tags: 'ios,crash',
  sort: 'popular'
})
  .then(data => console.log('Filtered bugs:', data.bugs))
  .catch(error => console.error('Error:', error.message));
```

### Get Bug Report Details

```javascript
// Get specific bug report
async function getBugReport(bugId) {
  try {
    const response = await bugRelay.request(`/api/v1/bugs/${bugId}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Bug details:', data.bug);
      return data.bug;
    } else {
      const error = await response.json();
      console.error('Failed to get bug:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Get bug error:', error);
    throw error;
  }
}

// Usage
getBugReport('550e8400-e29b-41d4-a716-446655440000')
  .then(bug => console.log('Bug:', bug))
  .catch(error => console.error('Error:', error.message));
```

### Vote on Bug Report

```javascript
// Vote on a bug report (toggle vote)
async function voteBugReport(bugId) {
  try {
    const response = await bugRelay.request(`/api/v1/bugs/${bugId}/vote`, {
      method: 'POST'
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Vote result:', data.message);
      return data.voted;
    } else {
      const error = await response.json();
      console.error('Vote failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
}

// Usage
voteBugReport('550e8400-e29b-41d4-a716-446655440000')
  .then(voted => console.log('Voted:', voted))
  .catch(error => console.error('Error:', error.message));
```

### Add Comment to Bug Report

```javascript
// Add comment to bug report
async function addBugComment(bugId, content) {
  try {
    const response = await bugRelay.request(`/api/v1/bugs/${bugId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Comment added:', data.comment);
      return data.comment;
    } else {
      const error = await response.json();
      console.error('Comment failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Comment error:', error);
    throw error;
  }
}

// Usage
addBugComment(
  '550e8400-e29b-41d4-a716-446655440000',
  'I am experiencing the same issue on my device. Here are additional details...'
)
  .then(comment => console.log('Comment:', comment))
  .catch(error => console.error('Error:', error.message));
```

### Upload File Attachment (Browser)

```javascript
// Upload file attachment to bug report (Browser)
async function uploadBugAttachment(bugId, file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await bugRelay.request(`/api/v1/bugs/${bugId}/attachments`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      console.log('File uploaded:', data.attachment);
      return data.attachment;
    } else {
      const error = await response.json();
      console.error('Upload failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Usage with file input
document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const attachment = await uploadBugAttachment('bug-id-here', file);
      console.log('Uploaded:', attachment);
    } catch (error) {
      console.error('Upload failed:', error.message);
    }
  }
});
```

### Update Bug Status (Company Members)

```javascript
// Update bug status (requires company membership)
async function updateBugStatus(bugId, status) {
  try {
    const response = await bugRelay.request(`/api/v1/bugs/${bugId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Status updated:', data.bug);
      return data.bug;
    } else {
      const error = await response.json();
      console.error('Status update failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Status update error:', error);
    throw error;
  }
}

// Usage
updateBugStatus('550e8400-e29b-41d4-a716-446655440000', 'fixed')
  .then(bug => console.log('Bug updated:', bug))
  .catch(error => console.error('Error:', error.message));
```

## Company Management Examples

### List Companies

```javascript
// Get companies with filtering
async function getCompanies(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    const endpoint = `/api/v1/companies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await bugRelay.request(endpoint);

    if (response.ok) {
      const data = await response.json();
      console.log(`Found ${data.pagination.total} companies`);
      return data;
    } else {
      const error = await response.json();
      console.error('Failed to get companies:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Get companies error:', error);
    throw error;
  }
}

// Usage
getCompanies({ search: 'myapp', verified: true })
  .then(data => console.log('Companies:', data.companies))
  .catch(error => console.error('Error:', error.message));
```

### Claim Company

```javascript
// Initiate company claim
async function claimCompany(companyId, email) {
  try {
    const response = await bugRelay.request(`/api/v1/companies/${companyId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Claim initiated:', data.message);
      return data;
    } else {
      const error = await response.json();
      console.error('Claim failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Claim error:', error);
    throw error;
  }
}

// Usage
claimCompany('456e7890-e12b-34c5-d678-901234567890', 'admin@myapp.com')
  .then(data => console.log('Claim result:', data))
  .catch(error => console.error('Error:', error.message));
```

### Verify Company

```javascript
// Complete company verification
async function verifyCompany(companyId, token) {
  try {
    const response = await bugRelay.request(`/api/v1/companies/${companyId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ token })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Company verified:', data.company);
      return data.company;
    } else {
      const error = await response.json();
      console.error('Verification failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}

// Usage
verifyCompany('456e7890-e12b-34c5-d678-901234567890', 'verification-token-here')
  .then(company => console.log('Verified company:', company))
  .catch(error => console.error('Error:', error.message));
```

### Get Company Dashboard

```javascript
// Get company dashboard
async function getCompanyDashboard(companyId) {
  try {
    const response = await bugRelay.request(`/api/v1/companies/${companyId}/dashboard`);

    if (response.ok) {
      const data = await response.json();
      console.log('Dashboard data:', data);
      return data;
    } else {
      const error = await response.json();
      console.error('Dashboard failed:', error);
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    throw error;
  }
}

// Usage
getCompanyDashboard('456e7890-e12b-34c5-d678-901234567890')
  .then(dashboard => console.log('Dashboard:', dashboard))
  .catch(error => console.error('Error:', error.message));
```

## Error Handling and Retry Logic

### Advanced Error Handling

```javascript
// Enhanced error handling with retry logic
class BugRelayError extends Error {
  constructor(message, code, status, details) {
    super(message);
    this.name = 'BugRelayError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Retry wrapper for API calls
async function withRetry(apiCall, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Enhanced request method with better error handling
async function enhancedRequest(endpoint, options = {}) {
  try {
    const response = await bugRelay.request(endpoint, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new BugRelayError(
        errorData.error.message,
        errorData.error.code,
        response.status,
        errorData.error.details
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof BugRelayError) {
      throw error;
    }
    
    // Network or other errors
    throw new BugRelayError(
      'Network error occurred',
      'NETWORK_ERROR',
      0,
      error.message
    );
  }
}

// Usage with retry
withRetry(() => enhancedRequest('/api/v1/bugs'))
  .then(data => console.log('Bugs:', data))
  .catch(error => {
    console.error('Final error:', error.message);
    console.error('Error code:', error.code);
    console.error('Status:', error.status);
  });
```

### Rate Limit Handling

```javascript
// Rate limit aware request wrapper
class RateLimitAwareClient extends BugRelayClient {
  constructor(baseURL, apiKey) {
    super(baseURL, apiKey);
    this.rateLimitReset = null;
    this.rateLimitRemaining = null;
  }

  async request(endpoint, options = {}) {
    // Check if we're rate limited
    if (this.rateLimitReset && Date.now() < this.rateLimitReset) {
      const waitTime = this.rateLimitReset - Date.now();
      console.log(`Rate limited, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const response = await super.request(endpoint, options);

    // Update rate limit info from headers
    if (response.headers.get('x-ratelimit-remaining')) {
      this.rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining'));
    }
    if (response.headers.get('x-ratelimit-reset')) {
      this.rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset')) * 1000;
    }

    // Handle rate limit exceeded
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        this.rateLimitReset = Date.now() + (parseInt(retryAfter) * 1000);
      }
    }

    return response;
  }
}
```

## Complete Integration Example

### Bug Tracker Widget

```javascript
// Complete bug tracker widget implementation
class BugTrackerWidget {
  constructor(containerId, apiConfig) {
    this.container = document.getElementById(containerId);
    this.client = new BugRelayClient(apiConfig.baseURL, apiConfig.apiKey);
    this.currentUser = null;
    this.init();
  }

  async init() {
    await this.checkAuthStatus();
    this.render();
    this.attachEventListeners();
    await this.loadBugs();
  }

  async checkAuthStatus() {
    try {
      const profile = await this.client.request('/api/v1/auth/profile');
      if (profile.ok) {
        this.currentUser = await profile.json();
      }
    } catch (error) {
      console.log('User not authenticated');
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="bug-tracker">
        <div class="header">
          <h2>Bug Reports</h2>
          ${this.currentUser ? `
            <div class="user-info">
              Welcome, ${this.currentUser.display_name}
              <button id="logout-btn">Logout</button>
            </div>
          ` : `
            <div class="auth-buttons">
              <button id="login-btn">Login</button>
              <button id="register-btn">Register</button>
            </div>
          `}
        </div>
        
        <div class="bug-form" ${!this.currentUser ? 'style="display:none"' : ''}>
          <h3>Report a Bug</h3>
          <form id="bug-form">
            <input type="text" id="bug-title" placeholder="Bug title" required>
            <textarea id="bug-description" placeholder="Bug description" required></textarea>
            <select id="bug-priority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input type="text" id="bug-tags" placeholder="Tags (comma-separated)">
            <button type="submit">Submit Bug</button>
          </form>
        </div>
        
        <div class="filters">
          <input type="text" id="search-input" placeholder="Search bugs...">
          <select id="status-filter">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="fixed">Fixed</option>
            <option value="wont_fix">Won't Fix</option>
          </select>
          <select id="priority-filter">
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        
        <div id="bugs-list" class="bugs-list">
          Loading bugs...
        </div>
        
        <div id="pagination" class="pagination"></div>
      </div>
    `;
  }

  attachEventListeners() {
    // Bug form submission
    const bugForm = document.getElementById('bug-form');
    if (bugForm) {
      bugForm.addEventListener('submit', (e) => this.handleBugSubmission(e));
    }

    // Search and filters
    document.getElementById('search-input').addEventListener('input', 
      this.debounce(() => this.loadBugs(), 500));
    document.getElementById('status-filter').addEventListener('change', () => this.loadBugs());
    document.getElementById('priority-filter').addEventListener('change', () => this.loadBugs());

    // Auth buttons
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) loginBtn.addEventListener('click', () => this.showLoginForm());
    if (registerBtn) registerBtn.addEventListener('click', () => this.showRegisterForm());
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
  }

  async handleBugSubmission(event) {
    event.preventDefault();
    
    const title = document.getElementById('bug-title').value;
    const description = document.getElementById('bug-description').value;
    const priority = document.getElementById('bug-priority').value;
    const tags = document.getElementById('bug-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);

    try {
      const bugData = {
        title,
        description,
        priority,
        tags,
        application_name: 'Widget App',
        application_url: window.location.origin
      };

      const response = await this.client.request('/api/v1/bugs', {
        method: 'POST',
        body: JSON.stringify(bugData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Bug created:', data.bug);
        
        // Reset form and reload bugs
        document.getElementById('bug-form').reset();
        await this.loadBugs();
        
        this.showMessage('Bug report submitted successfully!', 'success');
      } else {
        const error = await response.json();
        this.showMessage(`Error: ${error.error.message}`, 'error');
      }
    } catch (error) {
      console.error('Bug submission error:', error);
      this.showMessage('Failed to submit bug report', 'error');
    }
  }

  async loadBugs() {
    try {
      const search = document.getElementById('search-input').value;
      const status = document.getElementById('status-filter').value;
      const priority = document.getElementById('priority-filter').value;

      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;

      const queryParams = new URLSearchParams(filters);
      const endpoint = `/api/v1/bugs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await this.client.request(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        this.renderBugs(data.bugs);
        this.renderPagination(data.pagination);
      } else {
        this.showMessage('Failed to load bugs', 'error');
      }
    } catch (error) {
      console.error('Load bugs error:', error);
      this.showMessage('Failed to load bugs', 'error');
    }
  }

  renderBugs(bugs) {
    const bugsList = document.getElementById('bugs-list');
    
    if (bugs.length === 0) {
      bugsList.innerHTML = '<p>No bugs found.</p>';
      return;
    }

    bugsList.innerHTML = bugs.map(bug => `
      <div class="bug-item" data-bug-id="${bug.id}">
        <div class="bug-header">
          <h4>${this.escapeHtml(bug.title)}</h4>
          <span class="bug-status status-${bug.status}">${bug.status}</span>
          <span class="bug-priority priority-${bug.priority}">${bug.priority}</span>
        </div>
        <p class="bug-description">${this.escapeHtml(bug.description.substring(0, 200))}...</p>
        <div class="bug-meta">
          <span class="bug-votes">👍 ${bug.vote_count}</span>
          <span class="bug-comments">💬 ${bug.comment_count}</span>
          <span class="bug-date">${new Date(bug.created_at).toLocaleDateString()}</span>
          ${this.currentUser ? `
            <button class="vote-btn" onclick="bugTracker.voteBug('${bug.id}')">
              Vote
            </button>
          ` : ''}
        </div>
        <div class="bug-tags">
          ${bug.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  async voteBug(bugId) {
    if (!this.currentUser) {
      this.showMessage('Please login to vote', 'error');
      return;
    }

    try {
      const response = await this.client.request(`/api/v1/bugs/${bugId}/vote`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        this.showMessage(data.message, 'success');
        await this.loadBugs(); // Reload to update vote count
      } else {
        const error = await response.json();
        this.showMessage(`Error: ${error.error.message}`, 'error');
      }
    } catch (error) {
      console.error('Vote error:', error);
      this.showMessage('Failed to vote', 'error');
    }
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    this.container.insertBefore(messageDiv, this.container.firstChild);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize the widget
const bugTracker = new BugTrackerWidget('bug-tracker-container', {
  baseURL: 'http://localhost:8080',
  apiKey: 'your-api-key'
});
```

## Testing Utilities

### API Testing Helper

```javascript
// API testing utilities
class BugRelayTester {
  constructor(baseURL = 'http://localhost:8080') {
    this.client = new BugRelayClient(baseURL);
    this.testResults = [];
  }

  async runTest(name, testFn) {
    console.log(`Running test: ${name}`);
    try {
      await testFn();
      this.testResults.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - PASS`);
    } catch (error) {
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name} - FAIL: ${error.message}`);
    }
  }

  async runAllTests() {
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('User Registration', () => this.testUserRegistration());
    await this.runTest('User Login', () => this.testUserLogin());
    await this.runTest('Bug Creation', () => this.testBugCreation());
    await this.runTest('Bug Listing', () => this.testBugListing());
    
    console.log('\n=== Test Results ===');
    this.testResults.forEach(result => {
      console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.name}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    });
  }

  async testHealthCheck() {
    const response = await this.client.request('/health');
    if (!response.ok) throw new Error('Health check failed');
    
    const data = await response.json();
    if (data.status !== 'ok') throw new Error('Invalid health status');
  }

  async testUserRegistration() {
    const testEmail = `test-${Date.now()}@example.com`;
    const response = await this.client.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'testpassword123',
        display_name: 'Test User'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data = await response.json();
    if (!data.access_token) throw new Error('No access token received');
    
    // Store token for subsequent tests
    this.client.setTokens(data.access_token, data.refresh_token);
  }

  async testUserLogin() {
    // This would need a known test user
    // Implementation depends on your test setup
  }

  async testBugCreation() {
    const response = await this.client.request('/api/v1/bugs', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Bug Report',
        description: 'This is a test bug report created by automated testing.',
        priority: 'medium',
        tags: ['test', 'automated'],
        application_name: 'Test App',
        application_url: 'https://testapp.com'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data = await response.json();
    if (!data.bug || !data.bug.id) throw new Error('Invalid bug response');
  }

  async testBugListing() {
    const response = await this.client.request('/api/v1/bugs');
    if (!response.ok) throw new Error('Bug listing failed');

    const data = await response.json();
    if (!Array.isArray(data.bugs)) throw new Error('Invalid bugs response');
  }
}

// Run tests
const tester = new BugRelayTester();
tester.runAllTests();
```