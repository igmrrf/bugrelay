import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Code, Book, Key, Zap, Shield, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function ApiDocsPage() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/bugs",
      description: "List all bug reports with filtering and pagination",
      auth: false,
      params: ["page", "limit", "status", "priority", "company", "application"]
    },
    {
      method: "GET",
      path: "/api/v1/bugs/{id}",
      description: "Get detailed information about a specific bug report",
      auth: false,
      params: ["id"]
    },
    {
      method: "POST",
      path: "/api/v1/bugs",
      description: "Create a new bug report",
      auth: false,
      params: ["title", "description", "application", "steps", "expected", "actual"]
    },
    {
      method: "GET",
      path: "/api/v1/companies",
      description: "List all companies with their verification status",
      auth: false,
      params: ["page", "limit", "verified", "search"]
    },
    {
      method: "GET",
      path: "/api/v1/companies/{id}",
      description: "Get company details and public information",
      auth: false,
      params: ["id"]
    },
    {
      method: "POST",
      path: "/api/v1/companies/{id}/claim",
      description: "Claim ownership of a company (requires verification)",
      auth: true,
      params: ["id", "email", "message"]
    },
    {
      method: "PATCH",
      path: "/api/v1/companies/{id}/bugs/{bugId}/status",
      description: "Update bug status (company members only)",
      auth: true,
      params: ["id", "bugId", "status", "response"]
    }
  ]

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-800"
      case "POST": return "bg-blue-100 text-blue-800"
      case "PATCH": return "bg-yellow-100 text-yellow-800"
      case "DELETE": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Code className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Integrate BugRelay into your applications and workflows with our RESTful API
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Quick Start</span>
            </CardTitle>
            <CardDescription>
              Get started with the BugRelay API in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3">Base URL</h3>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  https://api.bugrelay.com/v1
                </div>
                
                <h3 className="font-semibold mb-3 mt-6">Example Request</h3>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <div className="text-green-600">GET</div>
                  <div>https://api.bugrelay.com/v1/bugs</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Response Format</h3>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <pre>{`{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasNext": true
  }
}`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Authentication</span>
            </CardTitle>
            <CardDescription>
              Secure your API requests with proper authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">API Keys</h3>
                <p className="text-muted-foreground mb-4">
                  For company-specific operations, you'll need an API key. Get yours from your company dashboard.
                </p>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  Authorization: Bearer your-api-key-here
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Public Endpoints</h3>
                <p className="text-muted-foreground">
                  Many endpoints are public and don't require authentication:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>Viewing bug reports and comments</li>
                  <li>Searching companies and applications</li>
                  <li>Creating new bug reports</li>
                  <li>Voting on bug reports</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Protected Endpoints</h3>
                <p className="text-muted-foreground">
                  These operations require authentication:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>Claiming company ownership</li>
                  <li>Updating bug status</li>
                  <li>Managing team members</li>
                  <li>Accessing company analytics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Book className="h-5 w-5" />
              <span>API Endpoints</span>
            </CardTitle>
            <CardDescription>
              Complete reference for all available endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className={getMethodColor(endpoint.method)}>
                        {endpoint.method}
                      </Badge>
                      <code className="font-mono text-sm">{endpoint.path}</code>
                    </div>
                    <div className="flex items-center space-x-2">
                      {endpoint.auth && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Auth Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-3">{endpoint.description}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Parameters:</h4>
                    <div className="flex flex-wrap gap-2">
                      {endpoint.params.map((param, paramIndex) => (
                        <Badge key={paramIndex} variant="secondary" className="text-xs">
                          {param}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rate Limits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
            <CardDescription>
              API usage limits to ensure fair access for all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">1000</div>
                <h3 className="font-semibold mb-1">Requests/Hour</h3>
                <p className="text-sm text-muted-foreground">For unauthenticated requests</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">5000</div>
                <h3 className="font-semibold mb-1">Requests/Hour</h3>
                <p className="text-sm text-muted-foreground">For authenticated requests</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">10</div>
                <h3 className="font-semibold mb-1">Requests/Second</h3>
                <p className="text-sm text-muted-foreground">Burst limit for all requests</p>
              </div>
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Rate Limit Headers</h4>
              <p className="text-blue-700 text-sm mb-2">
                All API responses include rate limit information in headers:
              </p>
              <div className="font-mono text-sm text-blue-800">
                <div>X-RateLimit-Limit: 1000</div>
                <div>X-RateLimit-Remaining: 999</div>
                <div>X-RateLimit-Reset: 1640995200</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Handling */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Error Handling</CardTitle>
            <CardDescription>
              Understanding API error responses and status codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">HTTP Status Codes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <code>200</code>
                      <span className="text-muted-foreground">Success</span>
                    </div>
                    <div className="flex justify-between">
                      <code>201</code>
                      <span className="text-muted-foreground">Created</span>
                    </div>
                    <div className="flex justify-between">
                      <code>400</code>
                      <span className="text-muted-foreground">Bad Request</span>
                    </div>
                    <div className="flex justify-between">
                      <code>401</code>
                      <span className="text-muted-foreground">Unauthorized</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <code>403</code>
                      <span className="text-muted-foreground">Forbidden</span>
                    </div>
                    <div className="flex justify-between">
                      <code>404</code>
                      <span className="text-muted-foreground">Not Found</span>
                    </div>
                    <div className="flex justify-between">
                      <code>429</code>
                      <span className="text-muted-foreground">Rate Limited</span>
                    </div>
                    <div className="flex justify-between">
                      <code>500</code>
                      <span className="text-muted-foreground">Server Error</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Error Response Format</h3>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  <pre>{`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "title",
      "issue": "Title is required"
    }
  }
}`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDKs and Tools */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>SDKs and Tools</CardTitle>
            <CardDescription>
              Official and community-maintained tools for easier integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">JavaScript/Node.js</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Official SDK for JavaScript and Node.js applications
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on npm
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Python</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Python SDK with async support and type hints
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on PyPI
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Postman Collection</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Complete API collection for testing and development
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Import Collection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>API Support</CardTitle>
            <CardDescription>
              Get help with API integration and troubleshooting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3">Documentation</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <a href="#" className="text-primary hover:underline">Interactive API Explorer</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">OpenAPI Specification</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Code Examples</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Changelog</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Support Channels</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <a href="/contact" className="text-primary hover:underline">Email Support</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Developer Discord</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">GitHub Issues</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Stack Overflow</a></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-4">
              <Button asChild>
                <Link href="/contact">
                  Get API Support
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Try API Explorer
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}