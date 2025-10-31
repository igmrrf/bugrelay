# AI Context for BugRelay Backend API

This document provides context and guidance specifically for AI systems interacting with the BugRelay backend API through the MCP server.

## System Overview

BugRelay is a bug tracking and reporting system that allows users to submit bug reports, companies to manage their applications, and administrators to moderate content. The system supports both anonymous and authenticated users with different permission levels.

## Key Concepts for AI Understanding

### Bug Reports
- **Primary Entity**: Bug reports are the core entity in the system
- **Anonymous Submission**: Users can submit bugs without authentication (requires reCAPTCHA)
- **Authenticated Submission**: Logged-in users can submit bugs and engage with existing ones
- **Status Lifecycle**: open → reviewing → fixed/wont_fix
- **Priority Levels**: low, medium, high, critical

### User Authentication
- **Multi-Provider**: Supports email/password and OAuth (Google, GitHub)
- **JWT Tokens**: Uses access tokens (15min) and refresh tokens (7 days)
- **Email Verification**: Required for email-based accounts
- **Role-Based Access**: Regular users vs administrators

### Company Verification
- **Domain-Based**: Companies are verified through email domain ownership
- **Team Management**: Verified companies can manage team members
- **Bug Assignment**: Companies can be assigned bugs related to their applications

## AI Integration Patterns

### 1. Bug Report Creation Assistant

**Use Case**: Help users create comprehensive bug reports

**Required Context**:
- Application information (which app has the bug)
- Technical environment (OS, browser, device)
- User authentication status
- Reproduction steps and expected behavior

**Implementation Pattern**:
```python
# Gather context first
context = {
    "application_id": "uuid-of-application",
    "user_authenticated": True/False,
    "technical_details": {
        "os": "detected or provided",
        "browser": "detected or provided",
        "version": "detected or provided"
    }
}

# Create structured bug report
bug_data = {
    "title": "Clear, descriptive title",
    "description": "Detailed description with steps to reproduce",
    "priority": "assessed priority level",
    "tags": ["relevant", "tags"],
    **context["technical_details"]
}
```

### 2. Bug Triage and Categorization

**Use Case**: Automatically categorize and prioritize incoming bugs

**Analysis Points**:
- Severity keywords in description
- Affected user count (from similar reports)
- Technical complexity indicators
- Business impact assessment

**Decision Matrix**:
- **Critical**: Security issues, data loss, system crashes
- **High**: Major feature broken, affects many users
- **Medium**: Minor feature issues, workarounds available
- **Low**: Cosmetic issues, enhancement requests

### 3. Duplicate Detection

**Use Case**: Identify and merge duplicate bug reports

**Comparison Factors**:
- Title similarity (semantic, not just text)
- Description content overlap
- Same application and technical environment
- Similar reproduction steps
- Error message matching

**Confidence Levels**:
- **High (>90%)**: Automatic merge suggestion
- **Medium (70-90%)**: Flag for human review
- **Low (<70%)**: No action

### 4. User Support Automation

**Use Case**: Provide automated responses and guidance

**Response Categories**:
- **Status Updates**: "Your bug #123 has been marked as fixed"
- **Workarounds**: "While we work on this, try..."
- **Additional Info**: "Can you provide more details about..."
- **Related Issues**: "This might be related to bug #456"

### 5. Company Verification Assistant

**Use Case**: Help companies through the verification process

**Verification Steps**:
1. Domain validation (email domain matches company domain)
2. Email verification token process
3. Team member invitation and role assignment
4. Application association setup

## Error Handling for AI Systems

### Common Error Scenarios

1. **Authentication Errors (401)**
   - Token expired: Attempt refresh token flow
   - Invalid token: Re-authenticate user
   - Missing token: Prompt for login

2. **Rate Limiting (429)**
   - Implement exponential backoff
   - Queue requests for later processing
   - Inform user of temporary delay

3. **Validation Errors (422)**
   - Parse error details for specific field issues
   - Provide user-friendly error messages
   - Suggest corrections based on validation rules

4. **Not Found Errors (404)**
   - Verify resource IDs are correct
   - Check if resource was deleted
   - Provide alternative suggestions

### Error Recovery Patterns

```python
async def robust_api_call(tool_name, args, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = await mcp_client.call_tool(tool_name, args)
            return result
        except RateLimitError:
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
        except AuthenticationError:
            await refresh_authentication()
        except ValidationError as e:
            # Don't retry validation errors
            raise e
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            await asyncio.sleep(1)
```

## Data Privacy and Security Considerations

### Sensitive Data Handling
- **Never log passwords or tokens** in plain text
- **Sanitize user input** before processing
- **Respect user privacy** in bug reports
- **Handle PII carefully** in comments and descriptions

### Permission Awareness
- **Check authentication** before protected operations
- **Validate user permissions** for company operations
- **Respect admin-only functions** 
- **Audit sensitive actions** appropriately

## Performance Optimization

### Caching Strategies
- **User profiles**: Cache for session duration
- **Company information**: Cache with TTL
- **Bug lists**: Cache with invalidation on updates
- **Static data**: Cache application lists, status options

### Batch Operations
- **Bulk bug creation**: Use transaction-like patterns
- **Multiple status updates**: Group related operations
- **Team member management**: Batch add/remove operations

### Pagination Handling
```python
async def get_all_bugs(filters=None):
    all_bugs = []
    page = 1
    
    while True:
        result = await call_tool("list_bug_reports", {
            "page": page,
            "limit": 100,  # Max page size
            **filters
        })
        
        bugs = result.get("bugs", [])
        all_bugs.extend(bugs)
        
        if len(bugs) < 100:  # Last page
            break
            
        page += 1
    
    return all_bugs
```

## Integration Testing Recommendations

### Test Categories

1. **Happy Path Tests**
   - Successful bug creation
   - User authentication flow
   - Company verification process

2. **Error Condition Tests**
   - Invalid input handling
   - Authentication failures
   - Rate limit scenarios

3. **Edge Case Tests**
   - Empty responses
   - Large data sets
   - Concurrent operations

### Mock Data Patterns
```python
# Use realistic test data
test_bug = {
    "title": "Login button not responding on mobile Safari",
    "description": "When using Safari on iOS 15.6, clicking the login button shows loading spinner but never completes. Works fine on Chrome mobile.",
    "application_id": "test-app-uuid",
    "priority": "high",
    "tags": ["mobile", "safari", "login"],
    "operating_system": "iOS 15.6",
    "device_type": "iPhone 12",
    "browser_version": "Safari 15.6"
}
```

## Monitoring and Observability

### Key Metrics to Track
- **API Response Times**: Monitor for performance degradation
- **Error Rates**: Track by error type and endpoint
- **Authentication Success**: Monitor login/registration flows
- **Bug Submission Rates**: Track creation patterns
- **User Engagement**: Monitor voting and commenting activity

### Alerting Thresholds
- **Error Rate > 5%**: Investigate immediately
- **Response Time > 2s**: Performance issue
- **Authentication Failures > 10%**: Potential security issue
- **Rate Limit Hits**: May need quota adjustment

## Best Practices Summary

1. **Always validate input** before making API calls
2. **Handle errors gracefully** with user-friendly messages
3. **Implement proper retry logic** with exponential backoff
4. **Cache appropriately** to reduce API load
5. **Respect rate limits** and implement queuing if needed
6. **Log operations** for debugging and audit purposes
7. **Test edge cases** thoroughly in development
8. **Monitor performance** and error rates in production
9. **Keep authentication tokens secure** and refresh proactively
10. **Provide clear user feedback** for all operations