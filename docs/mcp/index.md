# MCP Integration

The BugRelay Model Context Protocol (MCP) integration provides AI systems with structured access to the BugRelay backend API. This integration enables AI assistants to interact with bug reports, user accounts, and company data through a standardized protocol.

## Overview

The BugRelay MCP server implements the [Model Context Protocol specification](https://modelcontextprotocol.io/) and provides a comprehensive set of tools for:

- **Bug Management**: Create, retrieve, and search bug reports
- **User Authentication**: Handle user registration, login, and profile management
- **Company Operations**: Manage company claims, teams, and dashboards
- **Administrative Functions**: Content moderation, user management, and audit logs
- **OAuth Integration**: Support for Google and GitHub authentication flows

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Access to a running BugRelay backend server
- MCP-compatible AI client or development environment

### Installation

1. Install the required dependencies:

```bash
pip install -r docs/mcp/requirements.txt
```

2. Configure the server using environment variables:

```bash
# BugRelay API Configuration
BUGRELAY_BASE_URL=http://localhost:8080
BUGRELAY_API_KEY=your_api_key_here

# Server Configuration
MCP_SERVER_NAME=bugrelay-mcp-server
MCP_SERVER_VERSION=1.0.0
```

3. Run the MCP server:

```bash
python docs/mcp/server.py
```

## Available Tools

The MCP server provides several categories of tools:

### Core Bug Management

- `create_bug_report` - Create new bug reports with full metadata
- `get_bug_report` - Retrieve specific bug reports by ID
- `search_bug_reports` - Search and filter bug reports
- `vote_on_bug` - Vote on bug reports to indicate priority
- `add_bug_comment` - Add comments to existing bug reports

### User Management

- `authenticate_user` - Login and obtain access tokens
- `register_user` - Create new user accounts
- `get_user_profile` - Retrieve user profile information
- `update_user_profile` - Modify user profile data
- `verify_email` - Handle email verification workflows

### Company Operations

- `list_companies` - Browse available companies
- `get_company` - Get detailed company information
- `claim_company` - Initiate company ownership claims
- `get_company_dashboard` - Access company-specific dashboards
- `manage_team_members` - Add or remove team members

### Administrative Tools

- `get_admin_dashboard` - Access administrative overview
- `moderate_content` - Flag, remove, or restore content
- `merge_duplicate_bugs` - Combine duplicate bug reports
- `get_audit_logs` - Retrieve system audit trails

## Tool Schemas

All tools use JSON Schema for input validation. The complete tool definitions are available in:

- [`tools.json`](./tools.json) - Core API tools
- [`admin-tools.json`](./admin-tools.json) - Administrative functions
- [`oauth-tools.json`](./oauth-tools.json) - OAuth authentication tools

## Authentication

The MCP server supports multiple authentication methods:

### API Key Authentication

Set your API key in the environment:

```bash
export BUGRELAY_API_KEY=your_api_key_here
```

### JWT Token Authentication

Authenticate using the `authenticate_user` tool:

```json
{
  "name": "authenticate_user",
  "arguments": {
    "email": "user@example.com",
    "password": "secure_password"
  }
}
```

### OAuth Integration

For OAuth flows, use the dedicated OAuth tools:

- `initiate_oauth_login` - Start OAuth authentication
- `handle_oauth_callback` - Process OAuth callbacks
- `link_oauth_account` - Connect OAuth accounts to existing users

## Error Handling

The MCP server provides comprehensive error handling:

- **HTTP Errors**: Proper handling of API response errors with detailed messages
- **Validation Errors**: Input validation using JSON Schema with clear error descriptions
- **Network Errors**: Automatic retry logic and timeout handling
- **Authentication Errors**: Clear error messages for authentication failures

## Security Considerations

- **API Keys**: Store API keys securely using environment variables
- **Token Management**: JWT tokens are handled securely with proper expiration
- **Input Validation**: All inputs are validated against JSON schemas
- **Rate Limiting**: Respects API rate limits with automatic backoff

## Integration Examples

### Basic Bug Report Creation

```python
import asyncio
from mcp.client import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def create_bug_example():
    server_params = StdioServerParameters(
        command="python",
        args=["docs/mcp/server.py"]
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # Create a bug report
            result = await session.call_tool(
                "create_bug_report",
                {
                    "title": "Login button not responsive",
                    "description": "The login button doesn't respond when clicked on mobile devices",
                    "application_id": "123e4567-e89b-12d3-a456-426614174000",
                    "priority": "high",
                    "device_type": "mobile",
                    "operating_system": "iOS 17.0"
                }
            )
            
            print("Bug created:", result.content[0].text)

asyncio.run(create_bug_example())
```

### Search and Filter Bugs

```python
async def search_bugs_example():
    # ... session setup ...
    
    # Search for high priority bugs
    result = await session.call_tool(
        "search_bug_reports",
        {
            "priority": "high",
            "status": "open",
            "limit": 10
        }
    )
    
    bugs = json.loads(result.content[0].text)
    for bug in bugs.get("data", []):
        print(f"Bug: {bug['title']} - Priority: {bug['priority']}")
```

## Configuration Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BUGRELAY_BASE_URL` | BugRelay API base URL | `http://localhost:8080` |
| `BUGRELAY_API_KEY` | API key for authentication | None |
| `MCP_SERVER_NAME` | Server identifier | `bugrelay-mcp-server` |
| `MCP_SERVER_VERSION` | Server version | `1.0.0` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `REQUEST_TIMEOUT` | HTTP request timeout (seconds) | `30` |
| `MAX_RETRIES` | Maximum retry attempts | `3` |

### Server Configuration

The server can be configured programmatically:

```python
from docs.mcp.server import BugRelayMCPServer

server = BugRelayMCPServer(
    base_url="https://api.bugrelay.com",
    timeout=60,
    max_retries=5
)
```

## Development and Testing

### Running Tests

```bash
# Install development dependencies
pip install -e .[dev]

# Run the test suite
pytest docs/mcp/tests/

# Run with coverage
pytest --cov=docs/mcp docs/mcp/tests/
```

### Code Quality

```bash
# Format code
black docs/mcp/server.py docs/mcp/config.py

# Type checking
mypy docs/mcp/server.py

# Linting
flake8 docs/mcp/
```

## API Compatibility

This MCP server is compatible with:

- **BugRelay Backend API**: v1.0+
- **Model Context Protocol**: Latest specification
- **Python**: 3.8+
- **MCP Clients**: Claude Desktop, Continue, and other MCP-compatible tools

## Support and Resources

- **Documentation**: [BugRelay API Documentation](../api/)
- **GitHub Issues**: [Report bugs and request features](https://github.com/bugrelay/bugrelay/issues)
- **Community**: [Join our Discord server](https://discord.gg/bugrelay)
- **Email Support**: support@bugrelay.com

## Related Documentation

- [API Reference](../api/) - Complete API documentation
- [Authentication Guide](../authentication/) - Authentication methods and flows
- [Company Integration](../guides/company-integration) - Company management features