#!/usr/bin/env python3
"""
BugRelay MCP Server

A Model Context Protocol server that provides AI systems with structured access
to the BugRelay backend API. This server implements the MCP specification and
handles tool execution for bug management, user authentication, and company operations.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Sequence
from urllib.parse import urljoin
import httpx
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    TextContent,
    Tool,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BugRelayMCPServer:
    """MCP Server for BugRelay API integration."""
    
    def __init__(self, base_url: str = "http://localhost:8080", api_key: Optional[str] = None):
        """
        Initialize the BugRelay MCP Server.
        
        Args:
            base_url: Base URL of the BugRelay API
            api_key: Optional API key for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.server = Server("bugrelay-mcp-server")
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Load tool definitions
        self.tools = self._load_tools()
        
        # Register handlers
        self._register_handlers()
    
    def _load_tools(self) -> List[Tool]:
        """Load tool definitions from JSON files."""
        tools = []
        
        # Load main tools
        try:
            with open('tools.json', 'r') as f:
                main_tools = json.load(f)
                for tool_def in main_tools.get('tools', []):
                    tools.append(Tool(
                        name=tool_def['name'],
                        description=tool_def['description'],
                        inputSchema=tool_def['inputSchema']
                    ))
        except FileNotFoundError:
            logger.warning("tools.json not found")
        
        # Load admin tools
        try:
            with open('admin-tools.json', 'r') as f:
                admin_tools = json.load(f)
                for tool_def in admin_tools.get('tools', []):
                    tools.append(Tool(
                        name=tool_def['name'],
                        description=tool_def['description'],
                        inputSchema=tool_def['inputSchema']
                    ))
        except FileNotFoundError:
            logger.warning("admin-tools.json not found")
        
        # Load OAuth tools
        try:
            with open('oauth-tools.json', 'r') as f:
                oauth_tools = json.load(f)
                for tool_def in oauth_tools.get('tools', []):
                    tools.append(Tool(
                        name=tool_def['name'],
                        description=tool_def['description'],
                        inputSchema=tool_def['inputSchema']
                    ))
        except FileNotFoundError:
            logger.warning("oauth-tools.json not found")
        
        return tools
    
    def _register_handlers(self):
        """Register MCP server handlers."""
        
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            """Handle list tools request."""
            return self.tools
        
        @self.server.call_tool()
        async def handle_call_tool(
            name: str, arguments: Optional[Dict[str, Any]]
        ) -> List[TextContent]:
            """Handle tool execution request."""
            try:
                result = await self._execute_tool(name, arguments or {})
                return [TextContent(type="text", text=json.dumps(result, indent=2))]
            except Exception as e:
                logger.error(f"Error executing tool {name}: {e}")
                return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    async def _execute_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific tool with given arguments."""
        
        # Bug management tools
        if name == "create_bug_report":
            return await self._create_bug_report(arguments)
        elif name == "get_bug_report":
            return await self._get_bug_report(arguments)
        elif name == "list_bug_reports":
            return await self._list_bug_reports(arguments)
        elif name == "vote_on_bug":
            return await self._vote_on_bug(arguments)
        elif name == "add_bug_comment":
            return await self._add_bug_comment(arguments)
        elif name == "update_bug_status":
            return await self._update_bug_status(arguments)
        
        # User authentication tools
        elif name == "register_user":
            return await self._register_user(arguments)
        elif name == "login_user":
            return await self._login_user(arguments)
        elif name == "get_user_profile":
            return await self._get_user_profile(arguments)
        elif name == "update_user_profile":
            return await self._update_user_profile(arguments)
        elif name == "request_password_reset":
            return await self._request_password_reset(arguments)
        elif name == "verify_email":
            return await self._verify_email(arguments)
        
        # Company management tools
        elif name == "list_companies":
            return await self._list_companies(arguments)
        elif name == "get_company":
            return await self._get_company(arguments)
        elif name == "claim_company":
            return await self._claim_company(arguments)
        elif name == "verify_company_claim":
            return await self._verify_company_claim(arguments)
        elif name == "get_company_dashboard":
            return await self._get_company_dashboard(arguments)
        elif name == "add_team_member":
            return await self._add_team_member(arguments)
        elif name == "remove_team_member":
            return await self._remove_team_member(arguments)
        
        # Admin tools
        elif name == "get_admin_dashboard":
            return await self._get_admin_dashboard(arguments)
        elif name == "list_bugs_for_moderation":
            return await self._list_bugs_for_moderation(arguments)
        elif name == "flag_bug":
            return await self._flag_bug(arguments)
        elif name == "remove_bug":
            return await self._remove_bug(arguments)
        elif name == "restore_bug":
            return await self._restore_bug(arguments)
        elif name == "merge_bugs":
            return await self._merge_bugs(arguments)
        elif name == "get_audit_logs":
            return await self._get_audit_logs(arguments)
        
        # OAuth tools
        elif name == "initiate_oauth_login":
            return await self._initiate_oauth_login(arguments)
        elif name == "handle_oauth_callback":
            return await self._handle_oauth_callback(arguments)
        elif name == "link_oauth_account":
            return await self._link_oauth_account(arguments)
        
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to BugRelay API."""
        url = urljoin(f"{self.base_url}/", endpoint.lstrip('/'))
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "BugRelay-MCP-Server/1.0"
        }
        
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        elif self.api_key:
            headers["X-API-Key"] = self.api_key
        
        try:
            response = await self.client.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = f"HTTP {e.response.status_code}"
            try:
                error_body = e.response.json()
                error_detail += f": {error_body.get('error', 'Unknown error')}"
            except:
                error_detail += f": {e.response.text}"
            raise Exception(error_detail)
        except Exception as e:
            raise Exception(f"Request failed: {str(e)}")
    
    # Bug management tool implementations
    async def _create_bug_report(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new bug report."""
        return await self._make_request("POST", "/api/v1/bugs", data=args)
    
    async def _get_bug_report(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get a specific bug report."""
        bug_id = args["bug_id"]
        return await self._make_request("GET", f"/api/v1/bugs/{bug_id}")
    
    async def _list_bug_reports(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """List bug reports with filtering."""
        return await self._make_request("GET", "/api/v1/bugs", params=args)
    
    async def _vote_on_bug(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Vote on a bug report."""
        bug_id = args["bug_id"]
        vote_data = {"vote_type": args["vote_type"]}
        return await self._make_request("POST", f"/api/v1/bugs/{bug_id}/vote", data=vote_data)
    
    async def _add_bug_comment(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Add a comment to a bug report."""
        bug_id = args["bug_id"]
        comment_data = {"content": args["content"]}
        return await self._make_request("POST", f"/api/v1/bugs/{bug_id}/comments", data=comment_data)
    
    async def _update_bug_status(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Update bug status."""
        bug_id = args["bug_id"]
        status_data = {
            "status": args["status"],
            "resolution_notes": args.get("resolution_notes")
        }
        return await self._make_request("PATCH", f"/api/v1/bugs/{bug_id}/status", data=status_data)
    
    # User authentication tool implementations
    async def _register_user(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new user."""
        return await self._make_request("POST", "/api/v1/auth/register", data=args)
    
    async def _login_user(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Login a user."""
        return await self._make_request("POST", "/api/v1/auth/login", data=args)
    
    async def _get_user_profile(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get user profile."""
        return await self._make_request("GET", "/api/v1/auth/profile")
    
    async def _update_user_profile(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile."""
        return await self._make_request("PUT", "/api/v1/auth/profile", data=args)
    
    async def _request_password_reset(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Request password reset."""
        return await self._make_request("POST", "/api/v1/auth/password-reset", data=args)
    
    async def _verify_email(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Verify email address."""
        return await self._make_request("GET", "/api/v1/auth/verify-email", params=args)
    
    # Company management tool implementations
    async def _list_companies(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """List companies."""
        return await self._make_request("GET", "/api/v1/companies", params=args)
    
    async def _get_company(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get company details."""
        company_id = args["company_id"]
        return await self._make_request("GET", f"/api/v1/companies/{company_id}")
    
    async def _claim_company(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Claim a company."""
        company_id = args["company_id"]
        claim_data = {"verification_email": args["verification_email"]}
        return await self._make_request("POST", f"/api/v1/companies/{company_id}/claim", data=claim_data)
    
    async def _verify_company_claim(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Verify company claim."""
        company_id = args["company_id"]
        verify_data = {"verification_token": args["verification_token"]}
        return await self._make_request("POST", f"/api/v1/companies/{company_id}/verify", data=verify_data)
    
    async def _get_company_dashboard(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get company dashboard."""
        company_id = args["company_id"]
        return await self._make_request("GET", f"/api/v1/companies/{company_id}/dashboard")
    
    async def _add_team_member(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Add team member."""
        company_id = args["company_id"]
        member_data = {
            "user_email": args["user_email"],
            "role": args.get("role", "member")
        }
        return await self._make_request("POST", f"/api/v1/companies/{company_id}/members", data=member_data)
    
    async def _remove_team_member(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Remove team member."""
        company_id = args["company_id"]
        member_data = {"user_id": args["user_id"]}
        return await self._make_request("DELETE", f"/api/v1/companies/{company_id}/members", data=member_data)
    
    # Admin tool implementations
    async def _get_admin_dashboard(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get admin dashboard."""
        return await self._make_request("GET", "/api/v1/admin/dashboard", params=args)
    
    async def _list_bugs_for_moderation(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """List bugs for moderation."""
        return await self._make_request("GET", "/api/v1/admin/bugs", params=args)
    
    async def _flag_bug(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Flag a bug."""
        bug_id = args["bug_id"]
        flag_data = {
            "reason": args["reason"],
            "notes": args.get("notes")
        }
        return await self._make_request("POST", f"/api/v1/admin/bugs/{bug_id}/flag", data=flag_data)
    
    async def _remove_bug(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Remove a bug."""
        bug_id = args["bug_id"]
        return await self._make_request("DELETE", f"/api/v1/admin/bugs/{bug_id}")
    
    async def _restore_bug(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Restore a bug."""
        bug_id = args["bug_id"]
        return await self._make_request("POST", f"/api/v1/admin/bugs/{bug_id}/restore")
    
    async def _merge_bugs(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Merge bugs."""
        return await self._make_request("POST", "/api/v1/admin/bugs/merge", data=args)
    
    async def _get_audit_logs(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get audit logs."""
        return await self._make_request("GET", "/api/v1/admin/audit-logs", params=args)
    
    # OAuth tool implementations
    async def _initiate_oauth_login(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Initiate OAuth login."""
        provider = args["provider"]
        params = {}
        if "redirect_uri" in args:
            params["redirect_uri"] = args["redirect_uri"]
        if "state" in args:
            params["state"] = args["state"]
        return await self._make_request("GET", f"/api/v1/auth/oauth/{provider}", params=params)
    
    async def _handle_oauth_callback(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Handle OAuth callback."""
        provider = args["provider"]
        callback_data = {
            "code": args["code"],
            "state": args.get("state")
        }
        return await self._make_request("GET", f"/api/v1/auth/oauth/callback/{provider}", params=callback_data)
    
    async def _link_oauth_account(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Link OAuth account."""
        provider = args["provider"]
        link_data = {"code": args["code"]}
        return await self._make_request("POST", f"/api/v1/auth/oauth/link/{provider}", data=link_data)
    
    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="bugrelay-mcp-server",
                    server_version="1.0.0",
                    capabilities=self.server.get_capabilities(
                        notification_options=None,
                        experimental_capabilities=None,
                    ),
                ),
            )

async def main():
    """Main entry point."""
    import os
    
    # Get configuration from environment variables
    base_url = os.getenv("BUGRELAY_BASE_URL", "http://localhost:8080")
    api_key = os.getenv("BUGRELAY_API_KEY")
    
    server = BugRelayMCPServer(base_url=base_url, api_key=api_key)
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())