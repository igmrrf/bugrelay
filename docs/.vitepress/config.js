import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'BugRelay Backend Documentation',
  description: 'Comprehensive documentation for the BugRelay backend API',
  
  // Site optimization
  head: [
    ['meta', { name: 'theme-color', content: '#3c82f6' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:title', content: 'BugRelay Backend Documentation' }],
    ['meta', { name: 'og:site_name', content: 'BugRelay Docs' }],
    ['meta', { name: 'og:image', content: '/og-image.png' }],
    ['meta', { name: 'og:url', content: 'https://docs.bugrelay.com/' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }]
  ],

  // Clean URLs
  cleanUrls: true,
  
  // Last updated timestamp
  lastUpdated: true,
  
  // Site map generation
  sitemap: {
    hostname: 'https://docs.bugrelay.com'
  },
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Quick Start', link: '/guides/quick-start' },
      { text: 'Models', link: '/models/' },
      { text: 'Authentication', link: '/authentication/' },
      { text: 'Deployment', link: '/deployment/' }
    ],

    sidebar: {
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'OpenAPI Specification', link: '/api/openapi' },
            { text: 'Interactive Explorer', link: '/api/explorer.html', target: '_blank' },
            { text: 'Authentication Endpoints', link: '/api/endpoints/authentication' },
            { text: 'Bug Management', link: '/api/endpoints/bugs' },
            { text: 'Company Management', link: '/api/endpoints/companies' },
            { text: 'Admin Endpoints', link: '/api/endpoints/admin' },
            { text: 'Logging Endpoints', link: '/api/endpoints/logs' }
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'Request Examples', link: '/api/examples/' },
            { text: 'Response Examples', link: '/api/examples/responses' }
          ]
        }
      ],
      
      '/models/': [
        {
          text: 'Data Models',
          items: [
            { text: 'Overview', link: '/models/' },
            { text: 'Model Documentation', link: '/models/data-models' },
            { text: 'Relationships', link: '/models/relationships' },
            { text: 'JSON Schemas', link: '/models/schemas' }
          ]
        }
      ],
      
      '/authentication/': [
        {
          text: 'Authentication',
          items: [
            { text: 'Overview', link: '/authentication/' },
            { text: 'Authentication Flows', link: '/authentication/flows' },
            { text: 'JWT Implementation', link: '/authentication/jwt' },
            { text: 'OAuth Integration', link: '/authentication/oauth' },
            { text: 'Security Considerations', link: '/authentication/security' }
          ]
        }
      ],
      
      '/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Overview', link: '/deployment/' },
            { text: 'Configuration', link: '/deployment/configuration' },
            { text: 'Setup Guide', link: '/deployment/setup' },
            { text: 'Docker Deployment', link: '/deployment/docker' },
            { text: 'Monitoring', link: '/deployment/monitoring' }
          ]
        }
      ],
      
      '/guides/': [
        {
          text: 'Guides',
          items: [
            { text: 'Quick Start', link: '/guides/quick-start' },
            { text: 'Integration Examples', link: '/guides/integration-examples' },
            { text: 'Troubleshooting', link: '/guides/troubleshooting' }
          ]
        }
      ],
      
      '/mcp/': [
        {
          text: 'MCP Integration',
          items: [
            { text: 'Overview', link: '/mcp/' },
            { text: 'Tool Definitions', link: '/mcp/tools' },
            { text: 'Server Implementation', link: '/mcp/server' },
            { text: 'Schemas', link: '/mcp/schemas' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/bugrelay' }
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Search docs',
                buttonAriaLabel: 'Search docs'
              },
              modal: {
                noResultsText: 'No results for',
                resetButtonTitle: 'Clear search',
                footer: {
                  selectText: 'to select',
                  navigateText: 'to navigate',
                  closeText: 'to close'
                }
              }
            }
          }
        }
      }
    },

    editLink: {
      pattern: 'https://github.com/your-org/bugrelay/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 BugRelay'
    },

    // Add return to top button
    returnToTopLabel: 'Return to top',

    // Add outline configuration
    outline: {
      level: [2, 3],
      label: 'On this page'
    },

    // Add dark mode toggle
    appearance: 'dark',

    // Add logo
    logo: '/logo.svg',

    // Add custom CSS
    customCss: [
      '.vitepress/theme/custom.css'
    ]
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  }
})