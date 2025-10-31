import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Eye, Lock, Users, Database } from "lucide-react"

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: January 1, 2024
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Our Commitment to Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              At BugRelay, we believe in transparency not just for bug tracking, but also for how we handle your personal information. 
              This Privacy Policy explains how we collect, use, and protect your data when you use our platform.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Information We Collect</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Account Information</h3>
              <p className="text-muted-foreground mb-2">When you create an account, we collect:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Email address</li>
                <li>Display name</li>
                <li>Profile picture (optional)</li>
                <li>Company affiliation (if claiming a company)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Bug Reports and Content</h3>
              <p className="text-muted-foreground mb-2">When you submit bug reports or interact with our platform:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Bug report details (title, description, steps to reproduce)</li>
                <li>Comments and responses</li>
                <li>Votes and reactions</li>
                <li>Screenshots or attachments (if provided)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Usage Information</h3>
              <p className="text-muted-foreground mb-2">We automatically collect certain information about your use of our service:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>IP address and location data</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent</li>
                <li>Device information</li>
                <li>Referral sources</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>How We Use Your Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">To Provide Our Service</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Create and manage your account</li>
                  <li>Display your bug reports and comments publicly</li>
                  <li>Enable communication between users and companies</li>
                  <li>Send notifications about bug status updates</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">To Improve Our Platform</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Analyze usage patterns to improve user experience</li>
                  <li>Identify and fix technical issues</li>
                  <li>Develop new features based on user needs</li>
                  <li>Prevent spam and abuse</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">To Communicate With You</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Send important service updates</li>
                  <li>Respond to your support requests</li>
                  <li>Send marketing communications (with your consent)</li>
                  <li>Notify you of changes to our terms or policies</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Public Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Public Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium mb-2">Important: BugRelay is a public platform</p>
              <p className="text-yellow-700 text-sm">
                Bug reports, comments, and certain profile information are publicly visible by design. 
                This transparency is core to our mission of improving software quality.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Always Public</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Bug report titles and descriptions</li>
                  <li>Comments and responses</li>
                  <li>Your display name and profile picture</li>
                  <li>Vote counts and reactions</li>
                  <li>Company affiliations (for verified members)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Never Public</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Your email address</li>
                  <li>Private messages between users and companies</li>
                  <li>Account settings and preferences</li>
                  <li>Usage analytics and behavioral data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Data Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Encryption in transit and at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication</li>
              <li>Secure data centers with physical security</li>
              <li>Regular backups and disaster recovery procedures</li>
              <li>Employee training on data protection</li>
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Rights and Choices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Access and Portability</h3>
                <p className="text-muted-foreground">
                  You can access and download your personal data at any time through your account settings.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Correction and Updates</h3>
                <p className="text-muted-foreground">
                  You can update your profile information, display name, and other account details at any time.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Deletion</h3>
                <p className="text-muted-foreground">
                  You can delete your account at any time. Note that public bug reports and comments may remain 
                  visible but will be anonymized.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Marketing Communications</h3>
                <p className="text-muted-foreground">
                  You can opt out of marketing emails at any time using the unsubscribe link or your account settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third Parties */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We use certain third-party services to operate our platform:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Analytics:</strong> Google Analytics (anonymized data)</li>
              <li><strong>Email:</strong> SendGrid for transactional emails</li>
              <li><strong>Authentication:</strong> OAuth providers (Google, GitHub)</li>
              <li><strong>Infrastructure:</strong> Cloud hosting providers</li>
              <li><strong>Monitoring:</strong> Error tracking and performance monitoring</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Contact Us</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you have questions about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <ul className="text-muted-foreground space-y-1">
              <li><strong>Email:</strong> privacy@bugrelay.com</li>
              <li><strong>Address:</strong> BugRelay Privacy Team, [Address]</li>
            </ul>
            <p className="text-muted-foreground mt-4 text-sm">
              We will respond to privacy-related inquiries within 30 days.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}