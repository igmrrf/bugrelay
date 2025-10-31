#!/usr/bin/env python3
"""
BugRelay MCP Server

This server implements the Model Context Protocol for AI integration
with the BugRelay backend API.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import httpx
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    Tool,
    TextContent,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BugRelayMCPServer:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
        self.access_token: Optional[str] = None
        
    async def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate with the BugRelay API"""
        response = await self.client.post(
            urljoin(self.base_url, "/auth/login"),
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        self.access_token = data.get("access_token")
        return data
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication if available"""
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    async def create_bug_report(self, **kwargs) -> Dict[str, Any]:
        """Create a new bug report"""
        response = await self.client.post(
            urljoin(self.base_url, "/bugs"),
            json=kwargs,
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    async def get_bug_report(self, bug_id: str) -> Dict[str, Any]:
        """Get a bug report by ID"""
        response = await self.client.get(
            urljoin(self.base_url, f"/bugs/{bug_id}"),
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    async def search_bug_reports(self, **kwargs) -> Dict[str, Any]:
        """Search for bug reports"""
        params = {k: v for k, v in kwargs.items() if v is not None}
        response = await self.client.get(
            urljoin(self.base_url, "/bugs"),
            params=params,
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    async def get_user_profile(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get user profile information"""
        endpoint = f"/users/{user_id}" if user_id else "/auth/me"
        response = await self.client.get(
            urljoin(self.base_url, endpoint),
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()

# Initialize the MCP server
server = Server("bugrelay-mcp-server")
bugrelay = BugRelayMCPServer()

@server.list_tools()
async def handle_list_tools() -> ListToolsResult:
    """List available tools"""
    tools = [
        Tool(
            name="create_bug_report",
            description="Create a new bug report in the BugRelay system",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Bug report title"},
                    "description": {"type": "string", "description": "Bug description"},
                    "application_id": {"type": "string", "format": "uuid"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                },
                "required": ["title", "description", "application_id"]
            }
        ),
        Tool(
            name="get_bug_report",
            description="Retrieve a bug report by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "bug_id": {"type": "string", "format": "uuid"}
                },
                "required": ["bug_id"]
            }
        ),
        Tool(
            name="search_bug_reports",
            description="Search for bug reports with filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "status": {"type": "string", "enum": ["open", "reviewing", "fixed", "wont_fix"]},
                    "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}
                }
            }
        ),
        Tool(
            name="authenticate_user",
            description="Authenticate a user and obtain access token",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {"type": "string", "format": "email"},
                    "password": {"type": "string"}
                },
                "required": ["email", "password"]
            }
        ),
        Tool(
            name="get_user_profile",
            description="Get user profile information",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "format": "uuid"}
                }
            }
        )
    ]
    return ListToolsResult(tools=tools)

@server.call_tool()
async def handle_call_tool(request: CallToolRequest) -> CallToolResult:
    """Handle tool execution requests"""
    try:
        if request.name == "create_bug_report":
            result = await bugrelay.create_bug_report(**request.arguments)
        elif request.name == "get_bug_report":
            result = await bugrelay.get_bug_report(**request.arguments)
        elif request.name == "search_bug_reports":
            result = await bugrelay.search_bug_reports(**request.arguments)
        elif request.name == "authenticate_user":
            result = await bugrelay.authenticate(**request.arguments)
        elif request.name == "get_user_profile":
            result = await bugrelay.get_user_profile(**request.arguments)
        else:
            raise ValueError(f"Unknown tool: {request.name}")
        
        return CallToolResult(
            content=[TextContent(type="text", text=json.dumps(result, indent=2))]
        )
    
    except Exception as e:
        logger.error(f"Error executing tool {request.name}: {e}")
        return CallToolResult(
            content=[TextContent(type="text", text=f"Error: {str(e)}")]
        )

async def main():
    """Run the MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="bugrelay-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None,
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
