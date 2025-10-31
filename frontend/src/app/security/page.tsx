import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Eye, AlertTriangle, Mail, Award, Users, Database } from "lucide-react"
import Link from "next/link"

export default function SecurityPage() {
  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Security at BugRelay</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Protecting your data and maintaining the security of our platform is our top priority
          </p>
        </div>

        {/* Security Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Our Security Commitment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              At BugRelay, we understand that security is fundamental to building trust with our community. 
              We implement industry-leading security practices to protect your data and ensure the integrity 
              of our platform.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Our Approach</h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Security by design</li>
                  <li>• Regular security audits</li>
                  <li>• Continuous monitoring</li>
                  <li>• Rapid incident response</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Your Protection</h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Data encryption at rest and in transit</li>
                  <li>• Secure authentication systems</li>
                  <li>• Privacy-focused design</li>
                  <li>• Transparent security practices</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Measures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Data Protection</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Encryption:</strong> AES-256 encryption for data at rest</li>
                <li>• <strong>Transit Security:</strong> TLS 1.3 for all data in transit</li>
                <li>• <strong>Database Security:</strong> Encrypted backups and secure access controls</li>
                <li>• <strong>Key Management:</strong> Hardware security modules for key storage</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Access Control</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Authentication:</strong> Multi-factor authentication support</li>
                <li>• <strong>Authorization:</strong> Role-based access controls</li>
                <li>• <strong>Session Management:</strong> Secure session handling</li>
                <li>• <strong>Account Security:</strong> Password strength requirements</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Infrastructure Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Cloud Security:</strong> SOC 2 compliant hosting</li>
                <li>• <strong>Network Security:</strong> Firewalls and intrusion detection</li>
                <li>• <strong>Monitoring:</strong> 24/7 security monitoring</li>
                <li>• <strong>Backups:</strong> Encrypted, geographically distributed backups</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Application Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Code Security:</strong> Static and dynamic analysis</li>
                <li>• <strong>Dependency Management:</strong> Regular security updates</li>
                <li>• <strong>Input Validation:</strong> Comprehensive input sanitization</li>
                <li>• <strong>API Security:</strong> Rate limiting and authentication</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Security Practices */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Security Practices and Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3">Regular Audits</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Quarterly penetration testing</li>
                  <li>• Annual third-party security audits</li>
                  <li>• Continuous vulnerability scanning</li>
                  <li>• Code security reviews</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Compliance Standards</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• SOC 2 Type II compliance</li>
                  <li>• GDPR compliance for EU users</li>
                  <li>• CCPA compliance for California users</li>
                  <li>• ISO 27001 security framework</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsible Disclosure */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Responsible Security Disclosure</span>
            </CardTitle>
            <CardDescription>
              Help us keep BugRelay secure by reporting vulnerabilities responsibly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">How to Report Security Issues</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium mb-2">⚠️ Important: Do Not Report Security Issues Publicly</p>
                  <p className="text-red-700 text-sm">
                    Please do not create public bug reports for security vulnerabilities. This could put our users at risk.
                  </p>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Email:</strong> security@bugrelay.com (PGP key available)</li>
                  <li>• <strong>Response Time:</strong> We acknowledge reports within 24 hours</li>
                  <li>• <strong>Investigation:</strong> Initial assessment within 72 hours</li>
                  <li>• <strong>Updates:</strong> Regular status updates throughout the process</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">What to Include</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Detailed description of the vulnerability</li>
                  <li>• Steps to reproduce the issue</li>
                  <li>• Potential impact assessment</li>
                  <li>• Screenshots or proof-of-concept (if applicable)</li>
                  <li>• Your contact information for follow-up</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Our Commitment to Researchers</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• We will not pursue legal action for good-faith security research</li>
                  <li>• We provide credit to researchers (with permission)</li>
                  <li>• We maintain a public security acknowledgments page</li>
                  <li>• We may offer rewards for significant vulnerabilities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bug Bounty Program */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Bug Bounty Program</span>
            </CardTitle>
            <CardDescription>
              We reward security researchers who help us improve our security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Reward Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600 mb-2">$500-$2000</div>
                    <h4 className="font-semibold mb-1">Critical</h4>
                    <p className="text-sm text-muted-foreground">Remote code execution, SQL injection, authentication bypass</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-2">$200-$500</div>
                    <h4 className="font-semibold mb-1">High</h4>
                    <p className="text-sm text-muted-foreground">XSS, CSRF, privilege escalation</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-2">$50-$200</div>
                    <h4 className="font-semibold mb-1">Medium</h4>
                    <p className="text-sm text-muted-foreground">Information disclosure, business logic flaws</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Scope</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">✅ In Scope</h4>
                    <ul className="space-y-1 text-muted-foreground text-sm">
                      <li>• bugrelay.com and subdomains</li>
                      <li>• Mobile applications</li>
                      <li>• API endpoints</li>
                      <li>• Authentication systems</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">❌ Out of Scope</h4>
                    <ul className="space-y-1 text-muted-foreground text-sm">
                      <li>• Social engineering attacks</li>
                      <li>• Physical security issues</li>
                      <li>• Third-party services</li>
                      <li>• Denial of service attacks</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Resources */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Security Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">For Users</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <a href="#" className="text-primary hover:underline">Account Security Guide</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Two-Factor Authentication Setup</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Privacy Settings Guide</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Recognizing Phishing Attempts</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">For Developers</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <a href="#" className="text-primary hover:underline">API Security Documentation</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Security Headers Guide</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">OAuth Implementation</a></li>
                  <li>• <a href="#" className="text-primary hover:underline">Rate Limiting Best Practices</a></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Security Contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                For security-related inquiries, vulnerability reports, or general security questions:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Security Team</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>Email:</strong> security@bugrelay.com</li>
                    <li><strong>PGP Key:</strong> Available on request</li>
                    <li><strong>Response Time:</strong> Within 24 hours</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Emergency Contact</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>Critical Issues:</strong> security-urgent@bugrelay.com</li>
                    <li><strong>Response Time:</strong> Within 4 hours</li>
                    <li><strong>24/7 Monitoring:</strong> Active incident response</li>
                  </ul>
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <Button asChild>
                  <Link href="/contact">
                    General Contact
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/guidelines">
                    Community Guidelines
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}