#!/usr/bin/env node

/**
 * OpenAPI Specification Generator
 *
 * This script analyzes the Go backend codebase to generate a comprehensive
 * OpenAPI 3.0 specification file.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dump } from "js-yaml";

class OpenAPIGenerator {
  constructor() {
    this.spec = {
      openapi: "3.0.3",
      info: {
        title: "BugRelay Backend API",
        description:
          "Comprehensive API for bug reporting and management platform",
        version: "1.0.0",
        contact: {
          name: "BugRelay API Support",
          email: "api-support@bugrelay.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: "http://localhost:8080",
          description: "Development server",
        },
        {
          url: "https://api.bugrelay.com",
          description: "Production server",
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          OAuth2: {
            type: "oauth2",
            flows: {
              authorizationCode: {
                authorizationUrl: "/auth/oauth/google",
                tokenUrl: "/auth/oauth/callback",
                scopes: {
                  "read:profile": "Read user profile",
                  "write:bugs": "Create and update bug reports",
                },
              },
            },
          },
        },
      },
      tags: [
        {
          name: "System",
          description: "System health and status endpoints",
        },
        {
          name: "Authentication",
          description: "User authentication and profile management",
        },
        {
          name: "OAuth",
          description: "OAuth authentication with external providers",
        },
        {
          name: "Bugs",
          description: "Bug report management and interaction",
        },
        {
          name: "Companies",
          description: "Company verification and management",
        },
        {
          name: "Admin",
          description: "Administrative functions and moderation",
        },
      ],
      security: [{ BearerAuth: [] }],
    };
    // Add bug management endpoints
    this.addBugEndpoints();

    // Add company management endpoints
    this.addCompanyEndpoints();

    // Add admin endpoints
    this.addAdminEndpoints();

    // Add OAuth endpoints
    this.addOAuthEndpoints();
  }

  async generate() {
    console.log("Generating OpenAPI specification...");

    // This will be implemented to analyze the Go codebase
    // For now, create a basic structure
    await this.analyzeRoutes();
    await this.generateSchemas();
    await this.writeSpecification();

    console.log("OpenAPI specification generated successfully!");
  }

  async analyzeRoutes() {
    console.log("Analyzing routes from Go codebase...");

    this.spec.paths = {
      // Health check endpoint
      "/health": {
        get: {
          summary: "Health check endpoint",
          description: "Returns the health status of the API",
          tags: ["System"],
          responses: {
            200: {
              description: "API is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      service: { type: "string", example: "bugrelay-backend" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // API status endpoint
      "/api/v1/status": {
        get: {
          summary: "API status endpoint",
          description: "Returns the API version and status",
          tags: ["System"],
          responses: {
            200: {
              description: "API status information",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "BugRelay API v1 is running",
                      },
                      version: { type: "string", example: "1.0.0" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Authentication endpoints
      "/api/v1/auth/register": {
        post: {
          summary: "Register a new user",
          description: "Create a new user account with email and password",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "User registered successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: {
              description: "Invalid request data",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            409: {
              description: "Email already exists",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/api/v1/auth/login": {
        post: {
          summary: "User login",
          description: "Authenticate user with email and password",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            401: {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            429: {
              description: "Rate limit exceeded",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RateLimitError" },
                },
              },
            },
          },
        },
      },

      "/api/v1/auth/refresh": {
        post: {
          summary: "Refresh access token",
          description: "Get a new access token using refresh token",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Token refreshed successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            401: {
              description: "Invalid refresh token",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/api/v1/auth/logout": {
        post: {
          summary: "User logout",
          description: "Logout user and invalidate current token",
          tags: ["Authentication"],
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "Logout successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "Logged out successfully",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/api/v1/auth/profile": {
        get: {
          summary: "Get user profile",
          description: "Retrieve current user profile information",
          tags: ["Authentication"],
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "User profile retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserResponse" },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        put: {
          summary: "Update user profile",
          description: "Update current user profile information",
          tags: ["Authentication"],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Profile updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserResponse" },
                },
              },
            },
            400: {
              description: "Invalid request data",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
    };
  }

  async generateSchemas() {
    console.log("Generating schemas from Go models...");

    this.spec.components.schemas = {
      // Error schemas
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "string" },
            },
          },
        },
        required: ["error"],
      },

      RateLimitError: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "RATE_LIMIT_EXCEEDED" },
              message: { type: "string", example: "Rate limit exceeded" },
              retry_after: {
                type: "integer",
                description: "Seconds until retry allowed",
              },
            },
          },
        },
      },

      // Pagination schema
      PaginationInfo: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 150 },
          total_pages: { type: "integer", example: 8 },
          has_next: { type: "boolean", example: true },
          has_prev: { type: "boolean", example: false },
        },
      },

      // Authentication request/response schemas
      RegisterRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: {
            type: "string",
            minLength: 8,
            example: "securepassword123",
          },
          display_name: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            example: "John Doe",
          },
        },
        required: ["email", "password", "display_name"],
      },

      LoginRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: {
            type: "string",
            example: "securepassword123",
          },
        },
        required: ["email", "password"],
      },

      RefreshTokenRequest: {
        type: "object",
        properties: {
          refresh_token: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
        required: ["refresh_token"],
      },

      UpdateProfileRequest: {
        type: "object",
        properties: {
          display_name: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            example: "Jane Doe",
          },
          avatar_url: {
            type: "string",
            format: "uri",
            nullable: true,
            example: "https://example.com/avatar.jpg",
          },
        },
      },

      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserResponse" },
          access_token: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          refresh_token: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          expires_in: {
            type: "integer",
            example: 3600,
            description: "Access token expiration time in seconds",
          },
        },
        required: ["user", "access_token", "refresh_token", "expires_in"],
      },

      UserResponse: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          display_name: {
            type: "string",
            example: "John Doe",
          },
          avatar_url: {
            type: "string",
            format: "uri",
            nullable: true,
            example: "https://example.com/avatar.jpg",
          },
          auth_provider: {
            type: "string",
            example: "email",
            enum: ["email", "google", "github"],
          },
          is_email_verified: {
            type: "boolean",
            example: true,
          },
          is_admin: {
            type: "boolean",
            example: false,
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          last_active_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T12:00:00Z",
          },
        },
        required: [
          "id",
          "email",
          "display_name",
          "auth_provider",
          "is_email_verified",
          "is_admin",
          "created_at",
          "last_active_at",
        ],
      },

      // Bug report schemas
      CreateBugRequest: {
        type: "object",
        properties: {
          title: {
            type: "string",
            minLength: 5,
            maxLength: 255,
            example: "Login button not working on mobile",
          },
          description: {
            type: "string",
            minLength: 10,
            example:
              "When I try to click the login button on my mobile device, nothing happens. This issue occurs on both iOS and Android.",
          },
          application_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
            example: "high",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            example: ["mobile", "login", "ui"],
          },
          operating_system: {
            type: "string",
            example: "iOS 16.0",
          },
          device_type: {
            type: "string",
            example: "iPhone 14",
          },
          app_version: {
            type: "string",
            example: "2.1.0",
          },
          browser_version: {
            type: "string",
            example: "Safari 16.0",
          },
          recaptcha_token: {
            type: "string",
            description: "Required for anonymous users",
            example: "03AGdBq25...",
          },
        },
        required: ["title", "description", "application_id"],
      },

      BugReport: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          title: {
            type: "string",
            example: "Login button not working on mobile",
          },
          description: {
            type: "string",
            example:
              "When I try to click the login button on my mobile device, nothing happens.",
          },
          status: {
            type: "string",
            enum: ["open", "reviewing", "fixed", "wont_fix"],
            example: "open",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            example: "high",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            example: ["mobile", "login", "ui"],
          },
          operating_system: {
            type: "string",
            nullable: true,
            example: "iOS 16.0",
          },
          device_type: {
            type: "string",
            nullable: true,
            example: "iPhone 14",
          },
          app_version: {
            type: "string",
            nullable: true,
            example: "2.1.0",
          },
          browser_version: {
            type: "string",
            nullable: true,
            example: "Safari 16.0",
          },
          application_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          reporter_id: {
            type: "string",
            format: "uuid",
            nullable: true,
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          assigned_company_id: {
            type: "string",
            format: "uuid",
            nullable: true,
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          vote_count: {
            type: "integer",
            example: 15,
          },
          comment_count: {
            type: "integer",
            example: 3,
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T12:00:00Z",
          },
          resolved_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: "2023-01-02T10:00:00Z",
          },
        },
        required: [
          "id",
          "title",
          "description",
          "status",
          "priority",
          "application_id",
          "vote_count",
          "comment_count",
          "created_at",
          "updated_at",
        ],
      },

      BugReportDetailed: {
        allOf: [
          { $ref: "#/components/schemas/BugReport" },
          {
            type: "object",
            properties: {
              application: { $ref: "#/components/schemas/Application" },
              reporter: {
                allOf: [
                  { $ref: "#/components/schemas/UserResponse" },
                  { nullable: true },
                ],
              },
              assigned_company: {
                allOf: [
                  { $ref: "#/components/schemas/Company" },
                  { nullable: true },
                ],
              },
              comments: {
                type: "array",
                items: { $ref: "#/components/schemas/Comment" },
              },
              attachments: {
                type: "array",
                items: { $ref: "#/components/schemas/FileAttachment" },
              },
            },
          },
        ],
      },

      CreateCommentRequest: {
        type: "object",
        properties: {
          content: {
            type: "string",
            minLength: 1,
            maxLength: 2000,
            example: "I have the same issue on Android devices.",
          },
        },
        required: ["content"],
      },

      Comment: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          bug_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          user_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          content: {
            type: "string",
            example: "I have the same issue on Android devices.",
          },
          is_company_response: {
            type: "boolean",
            example: false,
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          user: { $ref: "#/components/schemas/UserResponse" },
        },
        required: [
          "id",
          "bug_id",
          "user_id",
          "content",
          "is_company_response",
          "created_at",
          "updated_at",
        ],
      },

      // Company schemas
      Company: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          name: {
            type: "string",
            example: "Acme Corporation",
          },
          domain: {
            type: "string",
            example: "acme.com",
          },
          is_verified: {
            type: "boolean",
            example: true,
          },
          verified_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: "2023-01-01T00:00:00Z",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
        },
        required: [
          "id",
          "name",
          "domain",
          "is_verified",
          "created_at",
          "updated_at",
        ],
      },

      CompanyDetailed: {
        allOf: [
          { $ref: "#/components/schemas/Company" },
          {
            type: "object",
            properties: {
              applications: {
                type: "array",
                items: { $ref: "#/components/schemas/Application" },
              },
              members: {
                type: "array",
                items: { $ref: "#/components/schemas/CompanyMember" },
              },
            },
          },
        ],
      },

      ClaimCompanyRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "admin@acme.com",
          },
        },
        required: ["email"],
      },

      VerifyCompanyRequest: {
        type: "object",
        properties: {
          token: {
            type: "string",
            example: "abc123def456",
          },
        },
        required: ["token"],
      },

      CompanyMember: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          company_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          user_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          role: {
            type: "string",
            example: "admin",
            enum: ["member", "admin", "owner"],
          },
          added_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          user: { $ref: "#/components/schemas/UserResponse" },
        },
        required: ["id", "company_id", "user_id", "role", "added_at"],
      },

      CompanyDashboard: {
        type: "object",
        properties: {
          company: { $ref: "#/components/schemas/Company" },
          statistics: {
            type: "object",
            properties: {
              total_bugs: { type: "integer", example: 45 },
              open_bugs: { type: "integer", example: 12 },
              fixed_bugs: { type: "integer", example: 30 },
              critical_bugs: { type: "integer", example: 2 },
            },
          },
          recent_bugs: {
            type: "array",
            items: { $ref: "#/components/schemas/BugReport" },
          },
        },
      },

      // Application schema
      Application: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          name: {
            type: "string",
            example: "My Mobile App",
          },
          url: {
            type: "string",
            format: "uri",
            nullable: true,
            example: "https://myapp.com",
          },
          company_id: {
            type: "string",
            format: "uuid",
            nullable: true,
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
        },
        required: ["id", "name", "created_at"],
      },

      FileAttachment: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          bug_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          filename: {
            type: "string",
            example: "screenshot.png",
          },
          file_url: {
            type: "string",
            format: "uri",
            example: "https://storage.example.com/files/screenshot.png",
          },
          file_size: {
            type: "integer",
            nullable: true,
            example: 1024000,
          },
          mime_type: {
            type: "string",
            nullable: true,
            example: "image/png",
          },
          uploaded_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
        },
        required: ["id", "bug_id", "filename", "file_url", "uploaded_at"],
      },

      // Admin schemas
      AdminDashboard: {
        type: "object",
        properties: {
          statistics: {
            type: "object",
            properties: {
              total_users: { type: "integer", example: 1250 },
              total_bugs: { type: "integer", example: 450 },
              total_companies: { type: "integer", example: 75 },
              flagged_bugs: { type: "integer", example: 5 },
              pending_verifications: { type: "integer", example: 3 },
            },
          },
          recent_activity: {
            type: "array",
            items: { $ref: "#/components/schemas/AuditLog" },
          },
        },
      },

      FlagBugRequest: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            example: "Inappropriate content",
          },
        },
        required: ["reason"],
      },

      AuditLog: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          action: {
            type: "string",
            example: "bug_flag",
          },
          resource: {
            type: "string",
            example: "bug_report",
          },
          resource_id: {
            type: "string",
            format: "uuid",
            nullable: true,
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          details: {
            type: "string",
            example: "Bug flagged for inappropriate content",
          },
          user_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          ip_address: {
            type: "string",
            nullable: true,
            example: "192.168.1.1",
          },
          user_agent: {
            type: "string",
            nullable: true,
            example:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          user: { $ref: "#/components/schemas/UserResponse" },
        },
        required: [
          "id",
          "action",
          "resource",
          "details",
          "user_id",
          "created_at",
        ],
      },

      // Missing models identified by completeness checker
      BugVote: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          bug_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          user_id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          vote_type: {
            type: "string",
            enum: ["up", "down"],
            example: "up",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          user: { $ref: "#/components/schemas/UserResponse" },
        },
        required: ["id", "bug_id", "user_id", "vote_type", "created_at"],
      },

      JWTBlacklist: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          token_hash: {
            type: "string",
            example: "sha256_hash_of_token",
          },
          expires_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
        },
        required: ["id", "token_hash", "expires_at", "created_at"],
      },

      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password_hash: {
            type: "string",
            description: "Hashed password (never returned in API responses)",
          },
          display_name: {
            type: "string",
            example: "John Doe",
          },
          avatar_url: {
            type: "string",
            format: "uri",
            nullable: true,
            example: "https://example.com/avatar.jpg",
          },
          auth_provider: {
            type: "string",
            example: "email",
            enum: ["email", "google", "github"],
          },
          provider_id: {
            type: "string",
            nullable: true,
            example: "google_user_id_123",
          },
          is_email_verified: {
            type: "boolean",
            example: true,
          },
          email_verification_token: {
            type: "string",
            nullable: true,
            description: "Token for email verification (internal use only)",
          },
          password_reset_token: {
            type: "string",
            nullable: true,
            description: "Token for password reset (internal use only)",
          },
          password_reset_expires: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Password reset token expiration (internal use only)",
          },
          is_admin: {
            type: "boolean",
            example: false,
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00Z",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T12:00:00Z",
          },
          last_active_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: "2023-01-01T12:00:00Z",
          },
        },
        required: [
          "id",
          "email",
          "display_name",
          "auth_provider",
          "is_email_verified",
          "is_admin",
          "created_at",
          "updated_at",
        ],
      },
    };
  }

  async writeSpecification() {
    const outputDir = join(__dirname, "../api");
    const outputPath = join(outputDir, "openapi.yaml");

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const yamlContent = dump(this.spec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    writeFileSync(outputPath, yamlContent);
    console.log(`OpenAPI specification written to ${outputPath}`);
  }

  addBugEndpoints() {
    // Bug listing endpoint
    this.spec.paths["/api/v1/bugs"] = {
      get: {
        summary: "List bug reports",
        description:
          "Retrieve a paginated list of bug reports with optional filtering",
        tags: ["Bugs"],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number for pagination",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Number of items per page",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "status",
            in: "query",
            description: "Filter by bug status",
            schema: {
              type: "string",
              enum: ["open", "reviewing", "fixed", "wont_fix"],
            },
          },
          {
            name: "priority",
            in: "query",
            description: "Filter by bug priority",
            schema: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
          },
          {
            name: "search",
            in: "query",
            description: "Search in bug title and description",
            schema: { type: "string" },
          },
          {
            name: "application_id",
            in: "query",
            description: "Filter by application ID",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "sort",
            in: "query",
            description: "Sort order",
            schema: {
              type: "string",
              enum: ["created_at", "vote_count", "updated_at"],
              default: "created_at",
            },
          },
          {
            name: "order",
            in: "query",
            description: "Sort direction",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
        ],
        responses: {
          200: {
            description: "Bug reports retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    bugs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BugReport" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationInfo" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid query parameters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a new bug report",
        description:
          "Submit a new bug report. Authentication is optional but recommended.",
        tags: ["Bugs"],
        security: [{ BearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBugRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Bug report created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BugReport" },
              },
            },
          },
          400: {
            description: "Invalid request data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          429: {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RateLimitError" },
              },
            },
          },
        },
      },
    };

    // Individual bug endpoint
    this.spec.paths["/api/v1/bugs/{id}"] = {
      get: {
        summary: "Get bug report details",
        description:
          "Retrieve detailed information about a specific bug report",
        tags: ["Bugs"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Bug report ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Bug report retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BugReportDetailed" },
              },
            },
          },
          404: {
            description: "Bug report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Bug voting endpoint
    this.spec.paths["/api/v1/bugs/{id}/vote"] = {
      post: {
        summary: "Vote on a bug report",
        description: "Add or remove vote for a bug report",
        tags: ["Bugs"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Bug report ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Vote recorded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    vote_count: { type: "integer" },
                    user_voted: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Bug report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Bug comments endpoint
    this.spec.paths["/api/v1/bugs/{id}/comments"] = {
      post: {
        summary: "Add comment to bug report",
        description: "Add a new comment to a bug report",
        tags: ["Bugs"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Bug report ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCommentRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Comment added successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Comment" },
              },
            },
          },
          400: {
            description: "Invalid request data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Bug report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Bug status update endpoint
    this.spec.paths["/api/v1/bugs/{id}/status"] = {
      patch: {
        summary: "Update bug status",
        description: "Update the status of a bug report (company members only)",
        tags: ["Bugs"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Bug report ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["open", "reviewing", "fixed", "wont_fix"],
                    description: "New status for the bug report",
                  },
                },
                required: ["status"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bug status updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BugReport" },
              },
            },
          },
          400: {
            description: "Invalid status value",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          403: {
            description: "Insufficient permissions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Bug report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };
  }

  addCompanyEndpoints() {
    // Company listing endpoint
    this.spec.paths["/api/v1/companies"] = {
      get: {
        summary: "List companies",
        description: "Retrieve a paginated list of companies",
        tags: ["Companies"],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number for pagination",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Number of items per page",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "search",
            in: "query",
            description: "Search in company name",
            schema: { type: "string" },
          },
          {
            name: "verified",
            in: "query",
            description: "Filter by verification status",
            schema: { type: "boolean" },
          },
        ],
        responses: {
          200: {
            description: "Companies retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    companies: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Company" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationInfo" },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Individual company endpoint
    this.spec.paths["/api/v1/companies/{id}"] = {
      get: {
        summary: "Get company details",
        description: "Retrieve detailed information about a specific company",
        tags: ["Companies"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Company ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Company retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompanyDetailed" },
              },
            },
          },
          404: {
            description: "Company not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Company claim endpoint
    this.spec.paths["/api/v1/companies/{id}/claim"] = {
      post: {
        summary: "Initiate company claim",
        description: "Start the process to claim ownership of a company",
        tags: ["Companies"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Company ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClaimCompanyRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Verification email sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    verification_email: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid request or company already claimed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Company not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Company verification endpoint
    this.spec.paths["/api/v1/companies/{id}/verify"] = {
      post: {
        summary: "Complete company verification",
        description:
          "Complete the company verification process using the token from email",
        tags: ["Companies"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Company ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyCompanyRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Company verified successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Company" },
              },
            },
          },
          400: {
            description: "Invalid or expired token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Company not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Company dashboard endpoint
    this.spec.paths["/api/v1/companies/{id}/dashboard"] = {
      get: {
        summary: "Get company dashboard",
        description: "Retrieve dashboard data for company members",
        tags: ["Companies"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Company ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Dashboard data retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompanyDashboard" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          403: {
            description: "Access denied - not a company member",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Company not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };
  }

  addAdminEndpoints() {
    // Admin dashboard endpoint
    this.spec.paths["/api/v1/admin/dashboard"] = {
      get: {
        summary: "Get admin dashboard",
        description: "Retrieve administrative dashboard data and statistics",
        tags: ["Admin"],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Dashboard data retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminDashboard" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          403: {
            description: "Admin access required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Admin bug moderation endpoint
    this.spec.paths["/api/v1/admin/bugs"] = {
      get: {
        summary: "List bugs for moderation",
        description: "Retrieve bugs that require administrative review",
        tags: ["Admin"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number for pagination",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Number of items per page",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "flagged",
            in: "query",
            description: "Show only flagged bugs",
            schema: { type: "boolean" },
          },
        ],
        responses: {
          200: {
            description: "Bugs retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    bugs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BugReport" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationInfo" },
                  },
                },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          403: {
            description: "Admin access required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Flag bug endpoint
    this.spec.paths["/api/v1/admin/bugs/{id}/flag"] = {
      post: {
        summary: "Flag a bug report",
        description: "Flag a bug report for administrative review",
        tags: ["Admin"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Bug report ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/FlagBugRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Bug flagged successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid request data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          403: {
            description: "Admin access required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Bug report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // Audit logs endpoint
    this.spec.paths["/api/v1/admin/audit-logs"] = {
      get: {
        summary: "Get audit logs",
        description: "Retrieve administrative audit logs",
        tags: ["Admin"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number for pagination",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Number of items per page",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "action",
            in: "query",
            description: "Filter by action type",
            schema: { type: "string" },
          },
          {
            name: "resource",
            in: "query",
            description: "Filter by resource type",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Audit logs retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    logs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AuditLog" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationInfo" },
                  },
                },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          403: {
            description: "Admin access required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };
  }

  addOAuthEndpoints() {
    // OAuth initiation endpoint
    this.spec.paths["/api/v1/auth/oauth/{provider}"] = {
      get: {
        summary: "Initiate OAuth flow",
        description: "Start OAuth authentication with the specified provider",
        tags: ["OAuth"],
        parameters: [
          {
            name: "provider",
            in: "path",
            required: true,
            description: "OAuth provider",
            schema: { type: "string", enum: ["google", "github"] },
          },
          {
            name: "redirect_url",
            in: "query",
            description: "URL to redirect after authentication",
            schema: { type: "string", format: "uri" },
          },
        ],
        responses: {
          302: {
            description: "Redirect to OAuth provider",
            headers: {
              Location: {
                description: "OAuth provider authorization URL",
                schema: { type: "string", format: "uri" },
              },
            },
          },
          400: {
            description: "Invalid provider or parameters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };

    // OAuth callback endpoint
    this.spec.paths["/api/v1/auth/oauth/callback/{provider}"] = {
      get: {
        summary: "Handle OAuth callback",
        description: "Process OAuth callback from provider",
        tags: ["OAuth"],
        parameters: [
          {
            name: "provider",
            in: "path",
            required: true,
            description: "OAuth provider",
            schema: { type: "string", enum: ["google", "github"] },
          },
          {
            name: "code",
            in: "query",
            required: true,
            description: "Authorization code from OAuth provider",
            schema: { type: "string" },
          },
          {
            name: "state",
            in: "query",
            required: true,
            description: "State parameter for CSRF protection",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "OAuth authentication successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: {
            description: "Invalid callback parameters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "OAuth authentication failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    };
  }
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  const generator = new OpenAPIGenerator();
  generator.generate().catch(console.error);
}

export default OpenAPIGenerator;
