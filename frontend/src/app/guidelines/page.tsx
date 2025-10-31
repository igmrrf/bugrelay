import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Heart, Shield, MessageSquare, Bug, CheckCircle } from "lucide-react"

export default function GuidelinesPage() {
  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Users className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Community Guidelines</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Building a respectful, helpful, and collaborative community for better software
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Our Community Values</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              BugRelay thrives because of our amazing community of users, developers, and companies working together 
              to improve software quality. These guidelines help ensure our platform remains a positive, productive 
              space for everyone.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Heart className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Respectful</h3>
                <p className="text-sm text-muted-foreground">Treat everyone with kindness and respect</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Constructive</h3>
                <p className="text-sm text-muted-foreground">Focus on helpful, actionable feedback</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Collaborative</h3>
                <p className="text-sm text-muted-foreground">Work together toward better software</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bug Reporting Guidelines */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bug className="h-5 w-5" />
              <span>Bug Reporting Best Practices</span>
            </CardTitle>
            <CardDescription>
              Help developers understand and fix issues faster
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 text-green-600">✅ Do</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Be specific:</strong> Use clear, descriptive titles that summarize the issue</li>
                  <li>• <strong>Provide context:</strong> Include your operating system, browser, app version, etc.</li>
                  <li>• <strong>List steps:</strong> Provide clear steps to reproduce the bug</li>
                  <li>• <strong>Include evidence:</strong> Add screenshots, error messages, or logs when helpful</li>
                  <li>• <strong>Search first:</strong> Check if the bug has already been reported</li>
                  <li>• <strong>Stay factual:</strong> Focus on what happened, not why you think it happened</li>
                  <li>• <strong>Be patient:</strong> Give companies time to investigate and respond</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-red-600">❌ Don't</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Be vague:</strong> Avoid titles like "App doesn't work" or "Fix this bug"</li>
                  <li>• <strong>Include personal info:</strong> Don't share passwords, personal data, or sensitive information</li>
                  <li>• <strong>Duplicate reports:</strong> Don't create multiple reports for the same issue</li>
                  <li>• <strong>Demand fixes:</strong> Avoid aggressive language or unrealistic timelines</li>
                  <li>• <strong>Go off-topic:</strong> Keep discussions focused on the specific bug</li>
                  <li>• <strong>Share exploits:</strong> Don't post security vulnerabilities publicly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communication Guidelines */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Communication Guidelines</span>
            </CardTitle>
            <CardDescription>
              Foster positive interactions between users and companies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">For Users</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Be respectful when commenting on bug reports</li>
                  <li>• Provide additional context if you've experienced the same issue</li>
                  <li>• Thank companies when they fix bugs or provide helpful responses</li>
                  <li>• Use constructive language, even when frustrated</li>
                  <li>• Avoid spamming or repeatedly asking for updates</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">For Companies</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Acknowledge bug reports promptly, even if you can't fix them immediately</li>
                  <li>• Provide clear status updates on bug resolution progress</li>
                  <li>• Be transparent about your development priorities and timelines</li>
                  <li>• Thank users for taking the time to report issues</li>
                  <li>• Explain technical decisions when appropriate</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prohibited Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Prohibited Content and Behavior</span>
            </CardTitle>
            <CardDescription>
              Keep our community safe and welcoming for everyone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-red-600">Strictly Prohibited</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Harassment, bullying, or personal attacks</li>
                  <li>Discriminatory language or hate speech</li>
                  <li>Spam, promotional content, or off-topic posts</li>
                  <li>Sharing personal information of others</li>
                  <li>Malicious code, viruses, or security exploits</li>
                  <li>Copyright infringement or intellectual property violations</li>
                  <li>Impersonating others or creating fake accounts</li>
                  <li>Attempting to manipulate voting or gaming the system</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Security Vulnerabilities</h4>
                <p className="text-red-700 text-sm">
                  If you discover a security vulnerability, please report it privately to the company's security team 
                  or email security@bugrelay.com. Do not post security issues publicly until they have been addressed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enforcement */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enforcement and Consequences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                We take these guidelines seriously and will take appropriate action when they are violated:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2 text-yellow-600">Warning</h3>
                  <p className="text-sm text-muted-foreground">
                    First-time minor violations typically result in a warning and guidance on proper behavior.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2 text-orange-600">Temporary Suspension</h3>
                  <p className="text-sm text-muted-foreground">
                    Repeated violations or more serious offenses may result in temporary account suspension.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-600">Permanent Ban</h3>
                  <p className="text-sm text-muted-foreground">
                    Severe violations, harassment, or repeated offenses may result in permanent account termination.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Appeals Process</h4>
                <p className="text-blue-700 text-sm">
                  If you believe your account was suspended or banned in error, you can appeal by emailing 
                  appeals@bugrelay.com with details about your situation. We review all appeals fairly and promptly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reporting */}
        <Card>
          <CardHeader>
            <CardTitle>Reporting Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Help us maintain a positive community by reporting violations of these guidelines:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
              <li>Use the "Report" button on bug reports or comments</li>
              <li>Email community@bugrelay.com for serious violations</li>
              <li>Provide specific details about the violation</li>
              <li>Include links to the problematic content</li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Thank You</h4>
              <p className="text-green-700 text-sm">
                Our community guidelines exist because of feedback from users like you. Together, we can build 
                a platform that makes software better for everyone. Thank you for being part of the BugRelay community!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}