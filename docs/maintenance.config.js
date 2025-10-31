/**
 * Documentation Maintenance Configuration
 * 
 * This file contains configuration for automated documentation maintenance.
 */

module.exports = {
  // Version synchronization settings
  version: {
    // Sources to check for version information (in priority order)
    sources: ['git', 'package', 'openapi', 'backend', 'changelog'],
    
    // Files to update with synchronized version
    targets: [
      'package.json',
      'api/openapi.yaml',
      'mcp/metadata.json',
      '.vitepress/config.js'
    ],
    
    // Version format validation
    format: /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/
  },

  // Documentation completeness checks
  completeness: {
    // Required documentation files
    requiredFiles: [
      'api/openapi.yaml',
      'models/schema.json',
      'models/data-models.md',
      'api/examples/curl-examples.md',
      'api/examples/javascript-examples.md',
      'api/examples/python-examples.md',
      'mcp/tools.json'
    ],
    
    // Endpoints that must be documented
    requiredEndpoints: [
      'GET /health',
      'GET /api/v1/status',
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/login',
      'GET /api/v1/bugs',
      'POST /api/v1/bugs',
      'GET /api/v1/companies'
    ],
    
    // Models that must be documented
    requiredModels: [
      'User',
      'BugReport',
      'Company',
      'Comment',
      'Application'
    ],
    
    // MCP tools that should be available
    requiredMCPTools: [
      'create_bug_report',
      'get_bug_report',
      'list_bug_reports',
      'vote_on_bug',
      'add_comment'
    ]
  },

  // API accuracy testing settings
  testing: {
    // Base URL for testing (can be overridden by environment variable)
    baseURL: process.env.API_BASE_URL || 'http://localhost:8080',
    
    // Timeout for API requests (milliseconds)
    timeout: 10000,
    
    // Test user credentials
    testUser: {
      email: 'test@example.com',
      password: 'testpassword123',
      displayName: 'Test User'
    },
    
    // Endpoints to skip during testing
    skipEndpoints: [
      'DELETE /api/v1/auth/logout', // Requires specific token state
      'POST /api/v1/auth/oauth/{provider}', // Requires OAuth setup
    ],
    
    // Expected error responses for validation testing
    validationTests: [
      {
        endpoint: '/api/v1/bugs',
        method: 'post',
        data: { title: '' }, // Invalid: empty title
        expectedStatus: 400
      },
      {
        endpoint: '/api/v1/auth/login',
        method: 'post',
        data: { email: 'invalid-email' }, // Invalid: bad email format
        expectedStatus: 400
      }
    ]
  },

  // Code examples testing settings
  examples: {
    // Languages to test
    languages: ['curl', 'javascript', 'python'],
    
    // Timeout for example execution (milliseconds)
    timeout: 15000,
    
    // Placeholder replacements
    placeholders: {
      'YOUR_API_TOKEN': 'test-token',
      'API_TOKEN': 'test-token',
      'https://api.bugrelay.com': '${baseURL}',
      'https://localhost:8080': '${baseURL}'
    },
    
    // Required dependencies for testing
    dependencies: {
      javascript: ['axios'],
      python: ['requests']
    }
  },

  // CI/CD integration settings
  cicd: {
    // Triggers for documentation regeneration
    triggers: {
      // File patterns that should trigger doc updates
      codeChanges: [
        'backend/**/*.go',
        'backend/go.mod',
        'backend/go.sum'
      ],
      
      // File patterns that should trigger validation
      docChanges: [
        'docs/**',
        '.github/workflows/documentation.yml'
      ]
    },
    
    // Notification settings
    notifications: {
      slack: {
        enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#dev-notifications'
      },
      
      email: {
        enabled: false,
        recipients: ['dev-team@bugrelay.com']
      }
    },
    
    // Deployment settings
    deployment: {
      // GitHub Pages configuration
      githubPages: {
        enabled: true,
        branch: 'gh-pages',
        domain: 'docs.bugrelay.com'
      },
      
      // S3 deployment (alternative)
      s3: {
        enabled: false,
        bucket: 'bugrelay-docs',
        region: 'us-east-1'
      }
    }
  },

  // Quality thresholds
  quality: {
    // Minimum documentation coverage percentage
    minCoverage: 90,
    
    // Maximum allowed errors in tests
    maxErrors: 0,
    
    // Maximum allowed warnings in tests
    maxWarnings: 5,
    
    // Performance thresholds
    performance: {
      // Maximum API response time (milliseconds)
      maxResponseTime: 2000,
      
      // Maximum documentation build time (seconds)
      maxBuildTime: 300
    }
  },

  // Reporting settings
  reporting: {
    // Output directory for test reports
    outputDir: 'test-reports',
    
    // Report formats to generate
    formats: ['json', 'html'],
    
    // Report retention (days)
    retention: 30,
    
    // Include detailed logs in reports
    includeDetails: true
  }
};