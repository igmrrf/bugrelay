import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, MessageSquare, Phone, MapPin, Clock, Send } from "lucide-react"

export default function ContactPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions, feedback, or need help? We're here to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Us</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">General Inquiries</p>
                  <p className="text-muted-foreground">hello@bugrelay.com</p>
                </div>
                <div>
                  <p className="font-medium">Support</p>
                  <p className="text-muted-foreground">support@bugrelay.com</p>
                </div>
                <div>
                  <p className="font-medium">Business</p>
                  <p className="text-muted-foreground">business@bugrelay.com</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Community</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">Discord</p>
                  <p className="text-muted-foreground">Join our community chat</p>
                </div>
                <div>
                  <p className="font-medium">GitHub</p>
                  <p className="text-muted-foreground">Contribute to our project</p>
                </div>
                <div>
                  <p className="font-medium">Twitter</p>
                  <p className="text-muted-foreground">Follow for updates</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Response Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We typically respond to inquiries within 24 hours during business days. 
                  For urgent issues, please use our support email.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">
                        First Name *
                      </label>
                      <Input id="firstName" placeholder="John" required />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">
                        Last Name *
                      </label>
                      <Input id="lastName" placeholder="Doe" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address *
                    </label>
                    <Input id="email" type="email" placeholder="john@example.com" required />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="company" className="text-sm font-medium">
                      Company (Optional)
                    </label>
                    <Input id="company" placeholder="Your company name" />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium">
                      Subject *
                    </label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="business">Business Partnership</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      placeholder="Tell us how we can help you..."
                      rows={6}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="newsletter"
                        className="mt-1"
                      />
                      <label htmlFor="newsletter" className="text-sm text-muted-foreground">
                        I'd like to receive updates about BugRelay features and news
                      </label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="privacy"
                        className="mt-1"
                        required
                      />
                      <label htmlFor="privacy" className="text-sm text-muted-foreground">
                        I agree to the{" "}
                        <a href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </a>{" "}
                        and{" "}
                        <a href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </a>
                        *
                      </label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              <CardDescription>
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">How do I report a bug?</h3>
                    <p className="text-muted-foreground text-sm">
                      You can report bugs by visiting our{" "}
                      <a href="/submit" className="text-primary hover:underline">
                        Submit Bug
                      </a>{" "}
                      page. No account required!
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">How do I claim my company?</h3>
                    <p className="text-muted-foreground text-sm">
                      Visit your company's page and click "Claim Company". You'll need to verify 
                      your email address with your company domain.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Is BugRelay free to use?</h3>
                    <p className="text-muted-foreground text-sm">
                      Yes! BugRelay is free for users to report bugs and for companies to 
                      manage their bug reports.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">How do I delete my account?</h3>
                    <p className="text-muted-foreground text-sm">
                      You can delete your account from your profile settings, or contact 
                      our support team for assistance.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Can I integrate BugRelay with my tools?</h3>
                    <p className="text-muted-foreground text-sm">
                      We offer API access for companies to integrate BugRelay with their 
                      existing workflows. Check our{" "}
                      <a href="/api-docs" className="text-primary hover:underline">
                        API documentation
                      </a>.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">How do I report security issues?</h3>
                    <p className="text-muted-foreground text-sm">
                      Please email security@bugrelay.com for any security-related concerns. 
                      We take security very seriously.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}