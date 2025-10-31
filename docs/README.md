---
layout: home

hero:
  name: "BugRelay Backend"
  text: "API Documentation"
  tagline: "Comprehensive documentation for the BugRelay backend server"
  image:
    src: /logo.svg
    alt: BugRelay Logo
  actions:
    - theme: brand
      text: Quick Start
      link: /guides/quick-start
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: View on GitHub
      link: https://github.com/your-org/bugrelay

features:
  - icon: 🚀
    title: Quick Start
    details: Get up and running with BugRelay in minutes. Complete setup guides for development and production environments.
    link: /guides/quick-start
  
  - icon: 📚
    title: API Reference
    details: Complete REST API documentation with interactive examples, request/response schemas, and authentication details.
    link: /api/
  
  - icon: 🔐
    title: Authentication
    details: Comprehensive guides for JWT authentication, OAuth integration, and security best practices.
    link: /authentication/
  
  - icon: 🗄️
    title: Data Models
    details: Detailed documentation of database schemas, relationships, and JSON schema definitions.
    link: /models/
  
  - icon: 🚀
    title: Deployment
    details: Step-by-step deployment guides for Docker, environment configuration, and monitoring setup.
    link: /deployment/
  
  - icon: 🤖
    title: AI Integration
    details: Model Context Protocol (MCP) documentation for AI systems and automated integrations.
    link: /mcp/
---

## What is BugRelay?

BugRelay is a comprehensive bug tracking and reporting platform that enables users to submit bug reports, companies to manage their applications, and administrators to moderate content. The backend provides a robust REST API with authentication, file uploads, real-time features, and comprehensive admin tools.

## 🚀 Quick Start

**Documentation Server:** http://localhost:3001 (when running locally)

```bash
# Start the documentation server
cd docs
npm install
npm run dev
```

The documentation includes interactive examples, complete API references, and step-by-step guides for integration and deployment.

## Key Features

- **User Management**: Registration, authentication, and profile management
- **Bug Reporting**: Submit, vote on, and comment on bug reports
- **Company Integration**: Company verification and team management
- **File Attachments**: Support for screenshots and other file uploads
- **Real-time Updates**: WebSocket support for live notifications
- **Admin Tools**: Content moderation and system administration
- **Rate Limiting**: Built-in protection against abuse
- **OAuth Support**: Integration with Google and GitHub

## Getting Started

::: tip New to BugRelay?
Start with our [Quick Start Guide](/guides/quick-start) to get your development environment set up in minutes.
:::

### For Developers

1. **[Quick Start](/guides/quick-start)** - Set up your development environment
2. **[API Reference](/api/)** - Explore all available endpoints
3. **[Authentication](/authentication/)** - Implement user authentication
4. **[Integration Examples](/guides/integration-examples)** - Common use cases

### For System Administrators

1. **[Deployment Guide](/deployment/)** - Production deployment instructions
2. **[Configuration](/deployment/configuration)** - Environment variables and settings
3. **[Monitoring](/deployment/monitoring)** - Logging and health checks

### For AI Systems

1. **[MCP Documentation](/mcp/)** - Model Context Protocol integration
2. **[OpenAPI Specification](/api/openapi.yaml)** - Machine-readable API definition
3. **[JSON Schemas](/models/schema.json)** - Data model definitions

## Architecture Overview

```mermaid
graph TB
    Client[Client Applications] --> API[BugRelay API]
    API --> Auth[Authentication Service]
    API --> DB[(PostgreSQL Database)]
    API --> Redis[(Redis Cache)]
    API --> Files[File Storage]
    
    Auth --> JWT[JWT Tokens]
    Auth --> OAuth[OAuth Providers]
    
    API --> WS[WebSocket Server]
    WS --> Notifications[Real-time Notifications]
```

## Support

- **Documentation Issues**: [Report on GitHub](https://github.com/your-org/bugrelay/issues)
- **API Questions**: Check our [Troubleshooting Guide](/guides/troubleshooting)
- **Feature Requests**: [Submit an issue](https://github.com/your-org/bugrelay/issues/new)