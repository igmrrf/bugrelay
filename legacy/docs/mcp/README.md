# BugRelay MCP Server

A Model Context Protocol (MCP) server that provides AI systems with structured access to the BugRelay backend API. This server implements the MCP specification and handles tool execution for bug management, user authentication, and company operations.

## Features

- **Bug Management**: Create, read, update, and manage bug reports
- **User Authentication**: Register, login, and manage user profiles
- **Company Operations**: Claim companies, manage teams, and access dashboards
- **Admin Functions**: Moderate content, manage users, and access audit logs
- **OAuth Integration**: Support for Google and GitHub OAuth flows
- **Error Handling**: Comprehensive error handling and validation
- **Async Support**: Full asynchronous operation for better performance

## Installation

### Prerequisites

- Python 3.8 or higher
- Access to a running BugRelay backend server

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Development Installation

```bash
pip install -e .
```

## Configuration

The server can be configured using environment variables or a `.env` file:

```bash
# BugRelay API Configuration
BUGRELAY_BASE_URL=http://localhost:8080
BUGRELAY_API_KEY=your_api_key_here

# Server Configuration
MCP_SERVER_NAME=bugrelay-mcp-server
MCP_SERVER_VERSION=1.0.0

# Logging
LOG_LEVEL=INFO

# Request Configuration
REQUEST_TIMEOUT=30
MAX_RETRIES=3

# Authentication
DEFAULT_AUTH_TOKEN=your_default_token_here
```

## Usage

### Running the Server

```bash
python server.py
```

Or using the console script:

```bash
bugrelay-mcp-server
```

### Available Tools

The server provides the following categories of tools:

#### Bug Management Tools

- `create_bug_report`: Create a new bug report
- `get_bug_report`: Retrieve a specific bug report
- `list_bug_reports`: List bug reports with filtering
- `vote_on_bug`: Vote on a bug report
- `add_bug_comment`: Add a comment to a bug
- `update_bug_status`: Update bug status

#### User Authentication Tools

- `register_user`: Register a new user account
- `login_user`: Authenticate and get tokens
- `get_user_profile`: Get user profile information
- `update_user_profile`: Update user profile
- `request_password_reset`: Request password reset
- `verify_email`: Verify email address

#### Company Management Tools

- `list_companies`: List companies
- `get_company`: Get company details
- `claim_company`: Claim a company
- `verify_company_claim`: Verify company claim
- `get_company_dashboard`: Get company dashboard
- `add_team_member`: Add team member
- `remove_team_member`: Remove team member

#### Admin Tools

- `get_admin_dashboard`: Get admin dashboard
- `list_bugs_for_moderation`: List bugs for moderation
- `flag_bug`: Flag a bug for review
- `remove_bug`: Remove a bug report
- `restore_bug`: Restore a removed bug
- `merge_bugs`: Merge duplicate bugs
- `get_audit_logs`: Get system audit logs

#### OAuth Tools

- `initiate_oauth_login`: Start OAuth flow
- `handle_oauth_callback`: Handle OAuth callback
- `link_oauth_account`: Link OAuth account

### Example Usage with MCP Client

```python
import asyncio
from mcp.client import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="python",
        args=["server.py"]
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the session
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            print("Available tools:", [tool.name for tool in tools.tools])
            
            # Create a bug report
            result = await session.call_tool(
                "create_bug_report",
                {
                    "title": "Login button not working",
                    "description": "The login button doesn't respond when clicked",
                    "application_id": "123e4567-e89b-12d3-a456-426614174000",
                    "priority": "high"
                }
            )
            print("Bug created:", result.content[0].text)

if __name__ == "__main__":
    asyncio.run(main())
```

## Tool Schemas

All tools follow JSON Schema specifications for input validation. The schemas are defined in:

- `tools.json`: Main API tools
- `admin-tools.json`: Administrative tools
- `oauth-tools.json`: OAuth-related tools

## Error Handling

The server provides comprehensive error handling:

- **HTTP Errors**: Proper handling of API response errors
- **Validation Errors**: Input validation using JSON Schema
- **Network Errors**: Retry logic and timeout handling
- **Authentication Errors**: Clear error messages for auth failures

## Security Considerations

- **API Keys**: Store API keys securely using environment variables
- **Authentication**: Use proper JWT tokens for authenticated requests
- **Input Validation**: All inputs are validated against JSON schemas
- **Rate Limiting**: Respect API rate limits and implement backoff

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black server.py config.py
```

### Type Checking

```bash
mypy server.py config.py
```

## API Compatibility

This MCP server is compatible with:

- BugRelay Backend API v1
- Model Context Protocol specification
- Python 3.8+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- GitHub Issues: [bugrelay/bugrelay-mcp-server](https://github.com/bugrelay/bugrelay-mcp-server/issues)
- Email: support@bugrelay.com
- Documentation: [docs.bugrelay.com](https://docs.bugrelay.com)