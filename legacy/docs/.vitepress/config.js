import { defineConfig } from "vitepress";

export default defineConfig({
  title: "BugRelay Backend Documentation",
  description: "Comprehensive documentation for the BugRelay backend API",

  // Site optimization
  head: [
    ["meta", { name: "theme-color", content: "#3c82f6" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:locale", content: "en" }],
    ["meta", { name: "og:title", content: "BugRelay Backend Documentation" }],
    ["meta", { name: "og:site_name", content: "BugRelay Docs" }],
    ["meta", { name: "og:image", content: "/og-image.png" }],
    ["meta", { name: "og:url", content: "https://docs.bugrelay.com/" }],
    ["link", { rel: "icon", href: "/favicon.ico" }],
    [
      "link",
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
    ],
  ],

  // Clean URLs
  cleanUrls: true,

  // Last updated timestamp
  lastUpdated: true,

  // Site map generation
  sitemap: {
    hostname: "https://docs.bugrelay.com",
  },

  // Dead link handling configuration
  ignoreDeadLinks: [
    // Allow localhost links in development
    /^http:\/\/localhost/,
    /^https:\/\/localhost/,
    // Allow relative paths to root files that may not exist in docs context
    /^\.\.\/.*CONTRIBUTE/,
    /^\.\.\/.*LICENSE/,
    /^\.\.\/.*README/,
    /^\.\.\/.*CONTRIBUTING/,
    './../../CONTRIBUTE',
    './../CONTRIBUTING',
    // Allow development-specific external links that may be temporarily unavailable
    /github\.com.*\/edit\//,
    // Allow placeholder external links
    /example\.com/,
    // Allow missing guide pages that will be created in subsequent tasks
    '/guides/company-integration',
    '/guides/file-uploads', 
    '/guides/webhooks',
    '/guides/rate-limiting',
    // Allow missing authentication sub-pages that will be created
    '/authentication/jwt',
    './jwt',
    '/authentication/mfa',
    './mfa', 
    '/authentication/sessions',
    './sessions',
    // Allow missing API documentation pages that will be created
    '/api/endpoints/authentication',
    './endpoints/authentication',
    '/api/endpoints/logs',
    '/api/examples/index',
    './examples/index',
    // Allow missing MCP pages that will be created
    '/mcp/index',
    // Allow missing model schema pages that will be created
    '/models/schemas',
    './schemas',
    // Allow missing explorer page reference
    './explorer',
    // Allow missing guide pages that may be referenced but not yet created
    '/guides/security',
    '/guides/error-handling',
    '/guides/performance',
    // Allow relative path to root CONTRIBUTING file
    './../../CONTRIBUTING',
  ],

  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "API Reference", link: "/api/" },
      { text: "Quick Start", link: "/guides/quick-start" },
      { text: "Models", link: "/models/" },
      { text: "Authentication", link: "/authentication/" },
      { text: "Deployment", link: "/deployment/" },
    ],

    sidebar: {
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "OpenAPI Specification", link: "/api/openapi" },
            {
              text: "Interactive Explorer",
              link: "/api/explorer.html",
              target: "_blank",
            },
            {
              text: "Authentication Endpoints",
              link: "/api/endpoints/authentication",
            },
            { text: "Bug Management", link: "/api/endpoints/bugs" },
            { text: "Company Management", link: "/api/endpoints/companies" },
            { text: "Admin Endpoints", link: "/api/endpoints/admin" },
            { text: "Logging Endpoints", link: "/api/endpoints/logs" },
          ],
        },
        {
          text: "Examples",
          items: [
            { text: "Overview", link: "/api/examples/" },
            { text: "cURL Examples", link: "/api/examples/curl-examples" },
            { text: "JavaScript Examples", link: "/api/examples/javascript-examples" },
            { text: "Python Examples", link: "/api/examples/python-examples" },
          ],
        },
      ],

      "/models/": [
        {
          text: "Data Models",
          items: [
            { text: "Overview", link: "/models/" },
            { text: "Model Documentation", link: "/models/data-models" },
            { text: "Relationships", link: "/models/relationships" },
            { text: "JSON Schemas", link: "/models/schemas" },
          ],
        },
      ],

      "/authentication/": [
        {
          text: "Authentication",
          items: [
            { text: "Overview", link: "/authentication/" },
            { text: "Authentication Flows", link: "/authentication/flows" },
            { text: "JWT Implementation", link: "/authentication/jwt" },
            { text: "Multi-Factor Authentication", link: "/authentication/mfa" },
            { text: "Session Management", link: "/authentication/sessions" },
            { text: "OAuth Integration", link: "/authentication/oauth" },
            {
              text: "Security Considerations",
              link: "/authentication/security",
            },
          ],
        },
      ],

      "/deployment/": [
        {
          text: "Deployment",
          items: [
            { text: "Overview", link: "/deployment/" },
            { text: "Configuration", link: "/deployment/configuration" },
            { text: "Development Setup", link: "/deployment/setup-development" },
            { text: "Production Setup", link: "/deployment/setup-production" },
            { text: "Docker Deployment", link: "/deployment/docker" },
            { text: "Monitoring", link: "/deployment/monitoring" },
            { text: "Logging", link: "/deployment/logging" },
          ],
        },
      ],

      "/guides/": [
        {
          text: "Guides",
          items: [
            { text: "Quick Start", link: "/guides/quick-start" },
            { text: "Company Integration", link: "/guides/company-integration" },
            { text: "File Uploads", link: "/guides/file-uploads" },
            { text: "Webhooks", link: "/guides/webhooks" },
            { text: "Rate Limiting", link: "/guides/rate-limiting" },
            {
              text: "Integration Examples",
              link: "/guides/integration-examples",
            },
            { text: "Troubleshooting", link: "/guides/troubleshooting" },
          ],
        },
      ],

      "/mcp/": [
        {
          text: "MCP Integration",
          items: [
            { text: "Overview", link: "/mcp/" },
            { text: "AI Context", link: "/mcp/ai-context" },
            { text: "Server Implementation", link: "/mcp/server" },
            { text: "Configuration", link: "/mcp/config" },
            { text: "Setup", link: "/mcp/setup" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/your-org/bugrelay" },
    ],

    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: "Search docs",
                buttonAriaLabel: "Search docs",
              },
              modal: {
                noResultsText: "No results for",
                resetButtonTitle: "Clear search",
                footer: {
                  selectText: "to select",
                  navigateText: "to navigate",
                  closeText: "to close",
                },
              },
            },
          },
        },
      },
    },

    editLink: {
      pattern: "https://github.com/your-org/bugrelay/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024 BugRelay",
    },

    // Add return to top button
    returnToTopLabel: "Return to top",

    // Add outline configuration
    outline: {
      level: [2, 3],
      label: "On this page",
    },

    // Add dark mode toggle
    appearance: "dark",

    // Add logo
    logo: "/logo.svg",

    // Add custom CSS
    customCss: [".vitepress/theme/custom.css"],
  },

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
    lineNumbers: true,
  },
});

