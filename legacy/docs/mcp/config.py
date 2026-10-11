"""
Configuration module for BugRelay MCP Server.
"""

import os
from typing import Optional
from pydantic import BaseSettings, Field


class MCPServerConfig(BaseSettings):
    """Configuration for the BugRelay MCP Server."""
    
    # BugRelay API configuration
    base_url: str = Field(
        default="http://localhost:8080",
        env="BUGRELAY_BASE_URL",
        description="Base URL of the BugRelay API"
    )
    
    api_key: Optional[str] = Field(
        default=None,
        env="BUGRELAY_API_KEY",
        description="API key for BugRelay authentication"
    )
    
    # Server configuration
    server_name: str = Field(
        default="bugrelay-mcp-server",
        env="MCP_SERVER_NAME",
        description="Name of the MCP server"
    )
    
    server_version: str = Field(
        default="1.0.0",
        env="MCP_SERVER_VERSION",
        description="Version of the MCP server"
    )
    
    # Logging configuration
    log_level: str = Field(
        default="INFO",
        env="LOG_LEVEL",
        description="Logging level (DEBUG, INFO, WARNING, ERROR)"
    )
    
    # Request configuration
    request_timeout: int = Field(
        default=30,
        env="REQUEST_TIMEOUT",
        description="HTTP request timeout in seconds"
    )
    
    max_retries: int = Field(
        default=3,
        env="MAX_RETRIES",
        description="Maximum number of request retries"
    )
    
    # Authentication configuration
    default_auth_token: Optional[str] = Field(
        default=None,
        env="DEFAULT_AUTH_TOKEN",
        description="Default authentication token for requests"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def get_config() -> MCPServerConfig:
    """Get the server configuration."""
    return MCPServerConfig()


# Default configuration instance
config = get_config()