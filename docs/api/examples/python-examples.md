# Python Examples

This document provides comprehensive Python examples for integrating with the BugRelay API using the `requests` library.

## Setup and Installation

### Requirements

```bash
pip install requests python-dotenv
```

### Basic Client Setup

```python
import requests
import json
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import time

class BugRelayClient:
    """Python client for BugRelay API"""
    
    def __init__(self, base_url: str = "http://localhost:8080", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'BugRelay-Python-Client/1.0.0'
        })
    
    def set_tokens(self, access_token: str, refresh_token: str):
        """Set authentication tokens"""
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.session.headers['Authorization'] = f'Bearer {access_token}'
    
    def clear_tokens(self):
        """Clear authentication tokens"""
        self.access_token = None
        self.refresh_token = None
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with automatic token refresh"""
        url = f"{self.base_url}{endpoint}"
        
        # Add API key for logs endpoints
        if self.api_key and '/logs/' in endpoint:
            headers = kwargs.get('headers', {})
            headers['X-API-Key'] = self.api_key
            kwargs['headers'] = headers
        
        response = self.session.request(method, url, **kwargs)
        
        # Handle token refresh on 401
        if response.status_code == 401 and self.refresh_token:
            if self._refresh_access_token():
                # Retry original request with new token
                response = self.session.request(method, url, **kwargs)
        
        return response
    
    def _refresh_access_token(self) -> bool:
        """Refresh access token using refresh token"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/refresh",
                json={'refresh_token': self.refresh_token},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.set_tokens(data['access_token'], data['refresh_token'])
                return True
            else:
                self.clear_tokens()
                return False
        except Exception as e:
            print(f"Token refresh failed: {e}")
            self.clear_tokens()
            return False
    
    def request(self, method: str, endpoint: str, **kwargs) -> Dict[Any, Any]:
        """Make API request and return JSON response"""
        response = self._make_request(method, endpoint, **kwargs)
        
        if response.status_code >= 400:
            try:
                error_data = response.json()
                raise BugRelayError(
                    error_data.get('error', {}).get('message', 'Unknown error'),
                    error_data.get('error', {}).get('code', 'UNKNOWN_ERROR'),
                    response.status_code,
                    error_data.get('error', {}).get('details')
                )
            except json.JSONDecodeError:
                raise BugRelayError(
                    f"HTTP {response.status_code}: {response.text}",
                    'HTTP_ERROR',
                    response.status_code
                )
        
        try:
            return response.json()
        except json.JSONDecodeError:
            return {}

class BugRelayError(Exception):
    """Custom exception for BugRelay API errors"""
    
    def __init__(self, message: str, code: str, status_code: int, details: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
    
    def __str__(self):
        return f"BugRelayError({self.code}): {self.message}"

# Initialize client
client = BugRelayClient()
```

### Environment Configuration

```python
# .env file
BUGRELAY_BASE_URL=http://localhost:8080
BUGRELAY_API_KEY=your_api_key_here
BUGRELAY_ACCESS_TOKEN=your_access_token_here
BUGRELAY_REFRESH_TOKEN=your_refresh_token_here

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

client = BugRelayClient(
    base_url=os.getenv('BUGRELAY_BASE_URL', 'http://localhost:8080'),
    api_key=os.getenv('BUGRELAY_API_KEY')
)

# Set tokens if available
access_token = os.getenv('BUGRELAY_ACCESS_TOKEN')
refresh_token = os.getenv('BUGRELAY_REFRESH_TOKEN')
if access_token and refresh_token:
    client.set_tokens(access_token, refresh_token)
```

## Authentication Examples

### User Registration

```python
def register_user(email: str, password: str, display_name: str) -> Dict[str, Any]:
    """Register a new user"""
    try:
        data = client.request('POST', '/api/v1/auth/register', json={
            'email': email,
            'password': password,
            'display_name': display_name
        })
        
        # Store tokens for future requests
        client.set_tokens(data['access_token'], data['refresh_token'])
        
        print(f"Registration successful: {data['user']['email']}")
        return data
    
    except BugRelayError as e:
        print(f"Registration failed: {e}")
        raise

# Usage
try:
    user_data = register_user('user@example.com', 'securepassword123', 'John Doe')
    print(f"User ID: {user_data['user']['id']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### User Login

```python
def login_user(email: str, password: str) -> Dict[str, Any]:
    """Login user with email and password"""
    try:
        data = client.request('POST', '/api/v1/auth/login', json={
            'email': email,
            'password': password
        })
        
        # Store tokens
        client.set_tokens(data['access_token'], data['refresh_token'])
        
        print(f"Login successful: {data['user']['display_name']}")
        return data
    
    except BugRelayError as e:
        print(f"Login failed: {e}")
        raise

# Usage
try:
    user_data = login_user('user@example.com', 'securepassword123')
    print(f"Welcome back, {user_data['user']['display_name']}!")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Get User Profile

```python
def get_user_profile() -> Dict[str, Any]:
    """Get current user profile"""
    try:
        data = client.request('GET', '/api/v1/auth/profile')
        print(f"Profile: {data['display_name']} ({data['email']})")
        return data
    
    except BugRelayError as e:
        print(f"Failed to get profile: {e}")
        raise

# Usage
try:
    profile = get_user_profile()
    print(f"User since: {profile['created_at']}")
    print(f"Email verified: {profile['is_email_verified']}")
    print(f"Admin: {profile['is_admin']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Update User Profile

```python
def update_user_profile(display_name: Optional[str] = None, 
                       avatar_url: Optional[str] = None) -> Dict[str, Any]:
    """Update user profile"""
    updates = {}
    if display_name:
        updates['display_name'] = display_name
    if avatar_url:
        updates['avatar_url'] = avatar_url
    
    if not updates:
        raise ValueError("No updates provided")
    
    try:
        data = client.request('PUT', '/api/v1/auth/profile', json=updates)
        print(f"Profile updated: {data['display_name']}")
        return data
    
    except BugRelayError as e:
        print(f"Profile update failed: {e}")
        raise

# Usage
try:
    updated_profile = update_user_profile(
        display_name='Jane Doe',
        avatar_url='https://example.com/avatar.jpg'
    )
    print(f"Updated: {updated_profile}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Logout

```python
def logout_user() -> bool:
    """Logout current user"""
    try:
        client.request('POST', '/api/v1/auth/logout')
        client.clear_tokens()
        print("Logout successful")
        return True
    
    except BugRelayError as e:
        print(f"Logout failed: {e}")
        # Clear tokens anyway
        client.clear_tokens()
        return False

# Usage
success = logout_user()
print(f"Logged out: {success}")
```

## Bug Management Examples

### Create Bug Report

```python
def create_bug_report(title: str, description: str, 
                     application_name: str, application_url: Optional[str] = None,
                     priority: str = 'medium', tags: Optional[List[str]] = None,
                     **kwargs) -> Dict[str, Any]:
    """Create a new bug report"""
    
    bug_data = {
        'title': title,
        'description': description,
        'application_name': application_name,
        'priority': priority
    }
    
    if application_url:
        bug_data['application_url'] = application_url
    
    if tags:
        bug_data['tags'] = tags
    
    # Add optional technical details
    optional_fields = [
        'operating_system', 'device_type', 'app_version', 
        'browser_version', 'contact_email', 'recaptcha_token'
    ]
    
    for field in optional_fields:
        if field in kwargs:
            bug_data[field] = kwargs[field]
    
    try:
        data = client.request('POST', '/api/v1/bugs', json=bug_data)
        print(f"Bug report created: {data['bug']['id']}")
        return data
    
    except BugRelayError as e:
        print(f"Bug creation failed: {e}")
        raise

# Usage - Authenticated user
try:
    bug = create_bug_report(
        title='Login form validation error',
        description='Email validation fails for valid email addresses containing plus signs.',
        application_name='MyApp',
        application_url='https://myapp.com',
        priority='medium',
        tags=['validation', 'login', 'email'],
        operating_system='Windows 11',
        device_type='Desktop',
        app_version='3.2.1',
        browser_version='Chrome 120.0'
    )
    print(f"Created bug: {bug['bug']['title']}")
except BugRelayError as e:
    print(f"Error: {e}")

# Usage - Anonymous user (requires reCAPTCHA)
try:
    anonymous_bug = create_bug_report(
        title='Application crashes on startup',
        description='The application crashes immediately when launched on iOS 15.0.',
        application_name='MyApp',
        application_url='https://myapp.com',
        priority='high',
        tags=['crash', 'ios', 'startup'],
        operating_system='iOS 15.0',
        device_type='iPhone 12',
        app_version='2.1.0',
        browser_version='Safari 15.0',
        contact_email='user@example.com',
        recaptcha_token='your_recaptcha_token_here'
    )
    print(f"Anonymous bug created: {anonymous_bug['bug']['id']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### List Bug Reports

```python
def get_bug_reports(page: int = 1, limit: int = 20, 
                   search: Optional[str] = None, status: Optional[str] = None,
                   priority: Optional[str] = None, tags: Optional[str] = None,
                   application: Optional[str] = None, company: Optional[str] = None,
                   sort: str = 'recent') -> Dict[str, Any]:
    """Get bug reports with filtering and pagination"""
    
    params = {
        'page': page,
        'limit': limit,
        'sort': sort
    }
    
    # Add optional filters
    if search:
        params['search'] = search
    if status:
        params['status'] = status
    if priority:
        params['priority'] = priority
    if tags:
        params['tags'] = tags
    if application:
        params['application'] = application
    if company:
        params['company'] = company
    
    try:
        data = client.request('GET', '/api/v1/bugs', params=params)
        print(f"Found {data['pagination']['total']} bugs")
        return data
    
    except BugRelayError as e:
        print(f"Failed to get bugs: {e}")
        raise

# Usage examples
try:
    # Get all bugs
    all_bugs = get_bug_reports()
    print(f"Total bugs: {len(all_bugs['bugs'])}")
    
    # Search and filter
    filtered_bugs = get_bug_reports(
        search='crash',
        status='open',
        priority='high',
        tags='ios,crash',
        sort='popular'
    )
    
    for bug in filtered_bugs['bugs']:
        print(f"- {bug['title']} (Priority: {bug['priority']}, Votes: {bug['vote_count']})")
        
except BugRelayError as e:
    print(f"Error: {e}")
```

### Get Bug Report Details

```python
def get_bug_report(bug_id: str) -> Dict[str, Any]:
    """Get specific bug report details"""
    try:
        data = client.request('GET', f'/api/v1/bugs/{bug_id}')
        bug = data['bug']
        
        print(f"Bug: {bug['title']}")
        print(f"Status: {bug['status']}")
        print(f"Priority: {bug['priority']}")
        print(f"Votes: {bug['vote_count']}")
        print(f"Comments: {bug['comment_count']}")
        
        if 'comments' in bug:
            print(f"Recent comments: {len(bug['comments'])}")
        
        if 'attachments' in bug:
            print(f"Attachments: {len(bug['attachments'])}")
        
        return bug
    
    except BugRelayError as e:
        print(f"Failed to get bug: {e}")
        raise

# Usage
try:
    bug = get_bug_report('550e8400-e29b-41d4-a716-446655440000')
    print(f"Bug description: {bug['description'][:100]}...")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Vote on Bug Report

```python
def vote_bug_report(bug_id: str) -> bool:
    """Vote on a bug report (toggle vote)"""
    try:
        data = client.request('POST', f'/api/v1/bugs/{bug_id}/vote')
        print(f"Vote result: {data['message']}")
        return data['voted']
    
    except BugRelayError as e:
        print(f"Vote failed: {e}")
        raise

# Usage
try:
    voted = vote_bug_report('550e8400-e29b-41d4-a716-446655440000')
    print(f"Currently voted: {voted}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Add Comment to Bug Report

```python
def add_bug_comment(bug_id: str, content: str) -> Dict[str, Any]:
    """Add comment to bug report"""
    try:
        data = client.request('POST', f'/api/v1/bugs/{bug_id}/comments', json={
            'content': content
        })
        
        comment = data['comment']
        print(f"Comment added by {comment['user']['username']}")
        return comment
    
    except BugRelayError as e:
        print(f"Comment failed: {e}")
        raise

# Usage
try:
    comment = add_bug_comment(
        '550e8400-e29b-41d4-a716-446655440000',
        'I am experiencing the same issue on my device. Here are additional details...'
    )
    print(f"Comment ID: {comment['id']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Upload File Attachment

```python
def upload_bug_attachment(bug_id: str, file_path: str) -> Dict[str, Any]:
    """Upload file attachment to bug report"""
    try:
        with open(file_path, 'rb') as file:
            files = {'file': file}
            
            # Make request without JSON content-type for file upload
            response = client._make_request(
                'POST', 
                f'/api/v1/bugs/{bug_id}/attachments',
                files=files
            )
            
            if response.status_code >= 400:
                error_data = response.json()
                raise BugRelayError(
                    error_data.get('error', {}).get('message', 'Upload failed'),
                    error_data.get('error', {}).get('code', 'UPLOAD_ERROR'),
                    response.status_code
                )
            
            data = response.json()
            attachment = data['attachment']
            print(f"File uploaded: {attachment['filename']} ({attachment['file_size']} bytes)")
            return attachment
    
    except FileNotFoundError:
        print(f"File not found: {file_path}")
        raise
    except BugRelayError as e:
        print(f"Upload failed: {e}")
        raise

# Usage
try:
    attachment = upload_bug_attachment(
        '550e8400-e29b-41d4-a716-446655440000',
        'screenshot.png'
    )
    print(f"Attachment URL: {attachment['file_url']}")
except (FileNotFoundError, BugRelayError) as e:
    print(f"Error: {e}")
```

### Update Bug Status (Company Members)

```python
def update_bug_status(bug_id: str, status: str) -> Dict[str, Any]:
    """Update bug status (requires company membership)"""
    valid_statuses = ['open', 'reviewing', 'fixed', 'wont_fix']
    if status not in valid_statuses:
        raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
    
    try:
        data = client.request('PATCH', f'/api/v1/bugs/{bug_id}/status', json={
            'status': status
        })
        
        bug = data['bug']
        print(f"Bug status updated to: {bug['status']}")
        return bug
    
    except BugRelayError as e:
        print(f"Status update failed: {e}")
        raise

# Usage
try:
    updated_bug = update_bug_status('550e8400-e29b-41d4-a716-446655440000', 'fixed')
    print(f"Bug resolved at: {updated_bug.get('resolved_at')}")
except BugRelayError as e:
    print(f"Error: {e}")
```

## Company Management Examples

### List Companies

```python
def get_companies(page: int = 1, limit: int = 20, 
                 search: Optional[str] = None, verified: Optional[bool] = None) -> Dict[str, Any]:
    """Get companies with filtering"""
    params = {
        'page': page,
        'limit': limit
    }
    
    if search:
        params['search'] = search
    if verified is not None:
        params['verified'] = str(verified).lower()
    
    try:
        data = client.request('GET', '/api/v1/companies', params=params)
        print(f"Found {data['pagination']['total']} companies")
        return data
    
    except BugRelayError as e:
        print(f"Failed to get companies: {e}")
        raise

# Usage
try:
    companies = get_companies(search='myapp', verified=True)
    for company in companies['companies']:
        print(f"- {company['name']} ({company['domain']}) - Verified: {company['is_verified']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Get Company Details

```python
def get_company_details(company_id: str) -> Dict[str, Any]:
    """Get specific company details"""
    try:
        data = client.request('GET', f'/api/v1/companies/{company_id}')
        company = data['company']
        
        print(f"Company: {company['name']}")
        print(f"Domain: {company['domain']}")
        print(f"Verified: {company['is_verified']}")
        print(f"Applications: {len(company.get('applications', []))}")
        print(f"Members: {len(company.get('members', []))}")
        
        return company
    
    except BugRelayError as e:
        print(f"Failed to get company: {e}")
        raise

# Usage
try:
    company = get_company_details('456e7890-e12b-34c5-d678-901234567890')
    print(f"Created: {company['created_at']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Claim Company

```python
def claim_company(company_id: str, email: str) -> Dict[str, Any]:
    """Initiate company claim process"""
    try:
        data = client.request('POST', f'/api/v1/companies/{company_id}/claim', json={
            'email': email
        })
        
        print(f"Claim initiated: {data['message']}")
        return data
    
    except BugRelayError as e:
        print(f"Claim failed: {e}")
        raise

# Usage
try:
    result = claim_company('456e7890-e12b-34c5-d678-901234567890', 'admin@myapp.com')
    print("Check your email for verification instructions")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Verify Company

```python
def verify_company(company_id: str, token: str) -> Dict[str, Any]:
    """Complete company verification"""
    try:
        data = client.request('POST', f'/api/v1/companies/{company_id}/verify', json={
            'token': token
        })
        
        company = data['company']
        print(f"Company verified: {company['name']}")
        print(f"Verified at: {company['verified_at']}")
        return company
    
    except BugRelayError as e:
        print(f"Verification failed: {e}")
        raise

# Usage
try:
    verified_company = verify_company(
        '456e7890-e12b-34c5-d678-901234567890',
        'verification-token-from-email'
    )
    print(f"Company is now verified: {verified_company['is_verified']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Get Company Dashboard

```python
def get_company_dashboard(company_id: str) -> Dict[str, Any]:
    """Get company dashboard data"""
    try:
        data = client.request('GET', f'/api/v1/companies/{company_id}/dashboard')
        
        print(f"Company: {data['company']['name']}")
        print(f"Your role: {data['user_role']}")
        
        stats = data['bug_stats']
        print(f"Bug Statistics:")
        print(f"  Total: {stats['total']}")
        print(f"  Open: {stats['open']}")
        print(f"  Fixed: {stats['fixed']}")
        print(f"  Critical: {stats.get('critical', 0)}")
        
        print(f"Recent bugs: {len(data['recent_bugs'])}")
        
        return data
    
    except BugRelayError as e:
        print(f"Dashboard failed: {e}")
        raise

# Usage
try:
    dashboard = get_company_dashboard('456e7890-e12b-34c5-d678-901234567890')
    for bug in dashboard['recent_bugs'][:5]:  # Show first 5
        print(f"- {bug['title']} ({bug['status']})")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Add Team Member

```python
def add_team_member(company_id: str, email: str, role: str = 'member') -> Dict[str, Any]:
    """Add team member to company"""
    valid_roles = ['admin', 'member']
    if role not in valid_roles:
        raise ValueError(f"Invalid role. Must be one of: {valid_roles}")
    
    try:
        data = client.request('POST', f'/api/v1/companies/{company_id}/members', json={
            'email': email,
            'role': role
        })
        
        member = data['member']
        print(f"Team member added: {member['user']['email']} as {member['role']}")
        return member
    
    except BugRelayError as e:
        print(f"Add member failed: {e}")
        raise

# Usage
try:
    member = add_team_member(
        '456e7890-e12b-34c5-d678-901234567890',
        'newmember@myapp.com',
        'member'
    )
    print(f"Member ID: {member['id']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

## Administrative Examples

### Admin Dashboard

```python
def get_admin_dashboard() -> Dict[str, Any]:
    """Get admin dashboard (requires admin role)"""
    try:
        data = client.request('GET', '/api/v1/admin/dashboard')
        
        stats = data['stats']
        print("System Statistics:")
        print(f"  Total bugs: {stats['total_bugs']}")
        print(f"  Open bugs: {stats['open_bugs']}")
        print(f"  Flagged bugs: {stats['flagged_bugs']}")
        print(f"  Total users: {stats['total_users']}")
        print(f"  Total companies: {stats['total_companies']}")
        print(f"  Verified companies: {stats['verified_companies']}")
        
        print(f"Recent activity: {len(stats['recent_activity'])} entries")
        
        return data
    
    except BugRelayError as e:
        print(f"Admin dashboard failed: {e}")
        raise

# Usage
try:
    dashboard = get_admin_dashboard()
    for activity in dashboard['stats']['recent_activity'][:3]:
        print(f"- {activity['action']}: {activity['details']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Flag Bug for Review

```python
def flag_bug(bug_id: str, reason: str) -> Dict[str, Any]:
    """Flag bug for administrative review"""
    try:
        data = client.request('POST', f'/api/v1/admin/bugs/{bug_id}/flag', json={
            'reason': reason
        })
        
        print(f"Bug flagged: {data['message']}")
        return data
    
    except BugRelayError as e:
        print(f"Flag failed: {e}")
        raise

# Usage
try:
    result = flag_bug(
        '550e8400-e29b-41d4-a716-446655440000',
        'Potential spam content with suspicious voting patterns'
    )
    print(f"Flagged bug: {result['bug_id']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Remove Bug Report

```python
def remove_bug(bug_id: str, reason: str) -> Dict[str, Any]:
    """Remove bug report (soft delete)"""
    try:
        data = client.request('DELETE', f'/api/v1/admin/bugs/{bug_id}', json={
            'reason': reason
        })
        
        print(f"Bug removed: {data['message']}")
        return data
    
    except BugRelayError as e:
        print(f"Remove failed: {e}")
        raise

# Usage
try:
    result = remove_bug(
        '550e8400-e29b-41d4-a716-446655440000',
        'Spam content violating community guidelines'
    )
    print(f"Removed bug: {result['bug_id']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

### Merge Duplicate Bugs

```python
def merge_bugs(source_bug_id: str, target_bug_id: str, reason: str) -> Dict[str, Any]:
    """Merge duplicate bug reports"""
    try:
        data = client.request('POST', '/api/v1/admin/bugs/merge', json={
            'source_bug_id': source_bug_id,
            'target_bug_id': target_bug_id,
            'reason': reason
        })
        
        print(f"Bugs merged: {data['message']}")
        return data
    
    except BugRelayError as e:
        print(f"Merge failed: {e}")
        raise

# Usage
try:
    result = merge_bugs(
        'source-bug-uuid',
        'target-bug-uuid',
        'Duplicate reports for the same iOS crash issue'
    )
    print(f"Merged {result['source_bug_id']} into {result['target_bug_id']}")
except BugRelayError as e:
    print(f"Error: {e}")
```

## Utility Functions and Helpers

### Retry Decorator

```python
import functools
import time
import random

def retry_on_failure(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """Decorator to retry API calls on failure"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            current_delay = delay
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except BugRelayError as e:
                    # Don't retry on client errors (4xx)
                    if 400 <= e.status_code < 500:
                        raise
                    
                    retries += 1
                    if retries >= max_retries:
                        raise
                    
                    # Add jitter to prevent thundering herd
                    jitter = random.uniform(0, 0.1) * current_delay
                    sleep_time = current_delay + jitter
                    
                    print(f"Attempt {retries} failed, retrying in {sleep_time:.2f}s...")
                    time.sleep(sleep_time)
                    current_delay *= backoff
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@retry_on_failure(max_retries=3, delay=1.0, backoff=2.0)
def reliable_get_bugs():
    return get_bug_reports()

try:
    bugs = reliable_get_bugs()
    print(f"Got {len(bugs['bugs'])} bugs")
except BugRelayError as e:
    print(f"Final error: {e}")
```

### Rate Limit Handler

```python
class RateLimitHandler:
    """Handle rate limiting with automatic backoff"""
    
    def __init__(self, client: BugRelayClient):
        self.client = client
        self.rate_limit_reset = None
        self.rate_limit_remaining = None
    
    def make_request(self, method: str, endpoint: str, **kwargs):
        """Make request with rate limit handling"""
        # Check if we're rate limited
        if self.rate_limit_reset and time.time() < self.rate_limit_reset:
            wait_time = self.rate_limit_reset - time.time()
            print(f"Rate limited, waiting {wait_time:.2f}s...")
            time.sleep(wait_time)
        
        response = self.client._make_request(method, endpoint, **kwargs)
        
        # Update rate limit info from headers
        if 'x-ratelimit-remaining' in response.headers:
            self.rate_limit_remaining = int(response.headers['x-ratelimit-remaining'])
        
        if 'x-ratelimit-reset' in response.headers:
            self.rate_limit_reset = int(response.headers['x-ratelimit-reset'])
        
        # Handle rate limit exceeded
        if response.status_code == 429:
            retry_after = response.headers.get('retry-after')
            if retry_after:
                self.rate_limit_reset = time.time() + int(retry_after)
        
        return response

# Usage
rate_limited_client = RateLimitHandler(client)
```

### Bulk Operations

```python
def bulk_create_bugs(bug_data_list: List[Dict[str, Any]], 
                    delay_between_requests: float = 1.0) -> List[Dict[str, Any]]:
    """Create multiple bug reports with rate limiting"""
    created_bugs = []
    
    for i, bug_data in enumerate(bug_data_list):
        try:
            print(f"Creating bug {i+1}/{len(bug_data_list)}: {bug_data['title']}")
            bug = create_bug_report(**bug_data)
            created_bugs.append(bug['bug'])
            
            # Delay between requests to respect rate limits
            if i < len(bug_data_list) - 1:
                time.sleep(delay_between_requests)
                
        except BugRelayError as e:
            print(f"Failed to create bug {i+1}: {e}")
            # Continue with next bug
            continue
    
    print(f"Successfully created {len(created_bugs)} out of {len(bug_data_list)} bugs")
    return created_bugs

# Usage
bugs_to_create = [
    {
        'title': 'Bug 1',
        'description': 'Description 1',
        'application_name': 'Test App',
        'priority': 'medium'
    },
    {
        'title': 'Bug 2', 
        'description': 'Description 2',
        'application_name': 'Test App',
        'priority': 'high'
    }
]

created = bulk_create_bugs(bugs_to_create, delay_between_requests=2.0)
print(f"Created {len(created)} bugs")
```

### Data Export

```python
import csv
from datetime import datetime

def export_bugs_to_csv(filename: str, filters: Optional[Dict[str, Any]] = None):
    """Export bug reports to CSV file"""
    all_bugs = []
    page = 1
    
    while True:
        try:
            data = get_bug_reports(page=page, limit=100, **(filters or {}))
            bugs = data['bugs']
            
            if not bugs:
                break
            
            all_bugs.extend(bugs)
            
            if not data['pagination']['has_next']:
                break
            
            page += 1
            
        except BugRelayError as e:
            print(f"Error fetching page {page}: {e}")
            break
    
    # Write to CSV
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'id', 'title', 'description', 'status', 'priority', 
            'vote_count', 'comment_count', 'created_at', 'updated_at',
            'application_name', 'reporter_username', 'company_name'
        ]
        
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for bug in all_bugs:
            writer.writerow({
                'id': bug['id'],
                'title': bug['title'],
                'description': bug['description'][:500],  # Truncate long descriptions
                'status': bug['status'],
                'priority': bug['priority'],
                'vote_count': bug['vote_count'],
                'comment_count': bug['comment_count'],
                'created_at': bug['created_at'],
                'updated_at': bug['updated_at'],
                'application_name': bug.get('application', {}).get('name', ''),
                'reporter_username': bug.get('reporter', {}).get('username', ''),
                'company_name': bug.get('assigned_company', {}).get('name', '')
            })
    
    print(f"Exported {len(all_bugs)} bugs to {filename}")

# Usage
export_bugs_to_csv('bugs_export.csv', {'status': 'open', 'priority': 'high'})
```

## Testing Framework

### API Test Suite

```python
import unittest
from typing import Dict, Any

class BugRelayAPITest(unittest.TestCase):
    """Test suite for BugRelay API"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test client"""
        cls.client = BugRelayClient('http://localhost:8080')
        cls.test_user_email = f'test-{int(time.time())}@example.com'
        cls.test_user_password = 'testpassword123'
        cls.test_bug_id = None
    
    def test_01_health_check(self):
        """Test API health check"""
        try:
            response = self.client._make_request('GET', '/health')
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            self.assertEqual(data['status'], 'ok')
            self.assertEqual(data['service'], 'bugrelay-backend')
        except Exception as e:
            self.fail(f"Health check failed: {e}")
    
    def test_02_user_registration(self):
        """Test user registration"""
        try:
            data = register_user(
                self.test_user_email,
                self.test_user_password,
                'Test User'
            )
            
            self.assertIn('user', data)
            self.assertIn('access_token', data)
            self.assertIn('refresh_token', data)
            self.assertEqual(data['user']['email'], self.test_user_email)
            
        except BugRelayError as e:
            self.fail(f"Registration failed: {e}")
    
    def test_03_user_login(self):
        """Test user login"""
        try:
            data = login_user(self.test_user_email, self.test_user_password)
            
            self.assertIn('user', data)
            self.assertIn('access_token', data)
            self.assertEqual(data['user']['email'], self.test_user_email)
            
        except BugRelayError as e:
            self.fail(f"Login failed: {e}")
    
    def test_04_get_profile(self):
        """Test get user profile"""
        try:
            profile = get_user_profile()
            
            self.assertEqual(profile['email'], self.test_user_email)
            self.assertIn('id', profile)
            self.assertIn('display_name', profile)
            
        except BugRelayError as e:
            self.fail(f"Get profile failed: {e}")
    
    def test_05_create_bug(self):
        """Test bug creation"""
        try:
            data = create_bug_report(
                title='Test Bug Report',
                description='This is a test bug report created by automated testing.',
                application_name='Test App',
                application_url='https://testapp.com',
                priority='medium',
                tags=['test', 'automated']
            )
            
            self.assertIn('bug', data)
            bug = data['bug']
            self.assertEqual(bug['title'], 'Test Bug Report')
            self.assertEqual(bug['priority'], 'medium')
            self.assertIn('test', bug['tags'])
            
            # Store bug ID for later tests
            self.__class__.test_bug_id = bug['id']
            
        except BugRelayError as e:
            self.fail(f"Bug creation failed: {e}")
    
    def test_06_get_bugs(self):
        """Test bug listing"""
        try:
            data = get_bug_reports(limit=10)
            
            self.assertIn('bugs', data)
            self.assertIn('pagination', data)
            self.assertIsInstance(data['bugs'], list)
            
        except BugRelayError as e:
            self.fail(f"Get bugs failed: {e}")
    
    def test_07_vote_bug(self):
        """Test bug voting"""
        if not self.test_bug_id:
            self.skipTest("No test bug available")
        
        try:
            voted = vote_bug_report(self.test_bug_id)
            self.assertIsInstance(voted, bool)
            
        except BugRelayError as e:
            self.fail(f"Bug voting failed: {e}")
    
    def test_08_add_comment(self):
        """Test adding comment"""
        if not self.test_bug_id:
            self.skipTest("No test bug available")
        
        try:
            comment = add_bug_comment(
                self.test_bug_id,
                'This is a test comment added by automated testing.'
            )
            
            self.assertIn('id', comment)
            self.assertIn('content', comment)
            self.assertIn('user', comment)
            
        except BugRelayError as e:
            self.fail(f"Add comment failed: {e}")
    
    def test_09_logout(self):
        """Test user logout"""
        try:
            success = logout_user()
            self.assertTrue(success)
            
        except BugRelayError as e:
            self.fail(f"Logout failed: {e}")

if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2)
```

### Performance Testing

```python
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed

def performance_test_api_endpoints():
    """Performance test for API endpoints"""
    
    def time_request(func, *args, **kwargs):
        """Time a single API request"""
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            end_time = time.time()
            return {
                'success': True,
                'duration': end_time - start_time,
                'result': result
            }
        except Exception as e:
            end_time = time.time()
            return {
                'success': False,
                'duration': end_time - start_time,
                'error': str(e)
            }
    
    # Test different endpoints
    tests = [
        ('Health Check', lambda: client._make_request('GET', '/health')),
        ('List Bugs', lambda: get_bug_reports(limit=20)),
        ('API Status', lambda: client._make_request('GET', '/api/v1/status')),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\nTesting {test_name}...")
        
        # Run test multiple times
        durations = []
        successes = 0
        
        for i in range(10):
            result = time_request(test_func)
            durations.append(result['duration'])
            if result['success']:
                successes += 1
            
            time.sleep(0.1)  # Small delay between requests
        
        # Calculate statistics
        results[test_name] = {
            'success_rate': successes / len(durations),
            'avg_duration': statistics.mean(durations),
            'min_duration': min(durations),
            'max_duration': max(durations),
            'median_duration': statistics.median(durations)
        }
        
        print(f"  Success rate: {results[test_name]['success_rate']:.1%}")
        print(f"  Average: {results[test_name]['avg_duration']:.3f}s")
        print(f"  Min: {results[test_name]['min_duration']:.3f}s")
        print(f"  Max: {results[test_name]['max_duration']:.3f}s")
        print(f"  Median: {results[test_name]['median_duration']:.3f}s")
    
    return results

# Run performance tests
if __name__ == '__main__':
    perf_results = performance_test_api_endpoints()
```

This comprehensive Python examples document provides:

1. **Complete client setup** with authentication handling
2. **All authentication flows** (register, login, profile management)
3. **Full bug management** (create, list, vote, comment, upload files)
4. **Company management** (list, claim, verify, dashboard, team management)
5. **Administrative functions** (dashboard, moderation, audit logs)
6. **Utility functions** (retry logic, rate limiting, bulk operations)
7. **Data export capabilities**
8. **Testing framework** with unit tests and performance testing
9. **Error handling** with custom exceptions
10. **Real-world examples** with proper error handling and logging

The examples are production-ready and include best practices for API integration, error handling, and testing.