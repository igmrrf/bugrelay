import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, AlertTriangle, Shield, Users, Gavel, Mail } from "lucide-react"

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: January 1, 2025
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Welcome to BugRelay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              These Terms of Service ("Terms") govern your use of BugRelay, a public bug tracking platform operated by BugRelay Inc. 
              By using our service, you agree to these terms. Please read them carefully.
            </p>
          </CardContent>
        </Card>

        {/* Acceptance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              By accessing or using BugRelay, you agree to be bound by these Terms and our Privacy Policy. 
              If you don't agree to these terms, you may not use our service.
            </p>
            <p className="text-muted-foreground">
              We may modify these Terms at any time. We'll notify you of significant changes via email or through our platform. 
              Your continued use of BugRelay after changes become effective constitutes acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                BugRelay is a public platform that allows users to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Report bugs and issues in software applications</li>
                <li>View and search existing bug reports</li>
                <li>Comment on and vote for bug reports</li>
                <li>Track the status of bug reports</li>
                <li>Claim and manage company profiles (for verified company representatives)</li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium mb-2">Public Platform Notice</p>
                <p className="text-blue-700 text-sm">
                  BugRelay is designed as a public platform. Bug reports, comments, and certain profile information 
                  are publicly visible. Do not include sensitive, confidential, or personal information in bug reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>3. User Accounts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Creation</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>You must provide accurate and complete information when creating an account</li>
                  <li>You are responsible for maintaining the security of your account credentials</li>
                  <li>You must be at least 13 years old to create an account</li>
                  <li>One person may not maintain multiple accounts</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Company Verification</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Company representatives may claim and verify their company profiles</li>
                  <li>Verification requires a valid email address from the company domain</li>
                  <li>Verified companies can respond to bug reports and manage their public profile</li>
                  <li>False claims of company affiliation may result in account suspension</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Conduct */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>4. User Conduct</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Acceptable Use</h3>
                <p className="text-muted-foreground mb-2">You agree to use BugRelay only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Submit false, misleading, or spam bug reports</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use automated tools to scrape or abuse our service</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Content Guidelines</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Keep bug reports factual and constructive</li>
                  <li>Do not include personal, confidential, or sensitive information</li>
                  <li>Respect intellectual property and trade secrets</li>
                  <li>Use appropriate language and maintain professionalism</li>
                  <li>Do not post malicious code or security exploits</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content and Intellectual Property */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>5. Content and Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Your Content</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>You retain ownership of content you submit to BugRelay</li>
                  <li>By submitting content, you grant us a license to display, distribute, and use it on our platform</li>
                  <li>You represent that you have the right to submit the content</li>
                  <li>You are responsible for the accuracy and legality of your content</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Our Content</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>BugRelay's platform, design, and functionality are our intellectual property</li>
                  <li>You may not copy, modify, or distribute our platform without permission</li>
                  <li>Our trademarks and logos are protected and may not be used without authorization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy and Data */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>6. Privacy and Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. 
              Key points include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Bug reports and comments are publicly visible</li>
              <li>We collect minimal personal information</li>
              <li>We use industry-standard security measures</li>
              <li>You can delete your account at any time</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Please review our full <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for complete details.
            </p>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>7. Disclaimers and Limitations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Service Availability</h3>
                <p className="text-muted-foreground">
                  We strive to maintain high availability but cannot guarantee uninterrupted service. 
                  We may temporarily suspend service for maintenance or updates.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Content Accuracy</h3>
                <p className="text-muted-foreground">
                  Bug reports and comments are submitted by users. We do not verify the accuracy of user-generated content 
                  and are not responsible for any damages resulting from inaccurate information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Third-Party Links</h3>
                <p className="text-muted-foreground">
                  Our platform may contain links to third-party websites or services. We are not responsible for 
                  the content or practices of these external sites.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gavel className="h-5 w-5" />
              <span>8. Termination</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">By You</h3>
                <p className="text-muted-foreground">
                  You may terminate your account at any time through your account settings. 
                  Upon termination, your personal information will be deleted, but public content may remain anonymized.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">By Us</h3>
                <p className="text-muted-foreground">
                  We may suspend or terminate accounts that violate these Terms, engage in abusive behavior, 
                  or pose a security risk. We will provide notice when possible, except in cases of severe violations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>9. Governing Law</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of [Jurisdiction]. Any disputes will be resolved in the courts of [Jurisdiction]. 
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in effect.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>10. Contact Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <ul className="text-muted-foreground space-y-1">
              <li><strong>Email:</strong> legal@bugrelay.com</li>
              <li><strong>Address:</strong> BugRelay Inc., [Address]</li>
            </ul>
            <p className="text-muted-foreground mt-4 text-sm">
              We will respond to legal inquiries within 30 days.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
