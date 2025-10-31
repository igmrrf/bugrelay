import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bug, Users, Target, Heart, Github, Mail } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Bug className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">About BugRelay</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're building a public, user-driven bug tracking hub that connects users and companies 
            to improve software quality together.
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-12">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
            <CardDescription className="text-lg">
              Making software better through transparent collaboration
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground max-w-2xl mx-auto">
              BugRelay bridges the gap between users who discover bugs and companies who fix them. 
              We believe that transparent, public bug tracking leads to better software for everyone. 
              By making bug reports visible and actionable, we help create a more collaborative 
              relationship between users and developers.
            </p>
          </CardContent>
        </Card>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader className="text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Community First</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                We put the developer and user community at the heart of everything we do. 
                Every feature is designed to foster collaboration and mutual respect.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Bug className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Transparency</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Public bug tracking means everyone can see the status of issues, 
                creating accountability and trust between users and companies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Quality Focus</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                We're passionate about improving software quality. Every bug report 
                is an opportunity to make applications better for everyone.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Story Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Our Story</CardTitle>
            <CardDescription>
              How BugRelay came to be
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              BugRelay was born from a simple frustration: the disconnect between users who find bugs 
              and the companies who need to fix them. Too often, bug reports disappear into private 
              support systems, leaving users wondering if their issues will ever be addressed.
            </p>
            <p className="text-muted-foreground">
              We envisioned a world where bug tracking is transparent, collaborative, and beneficial 
              for everyone involved. Users get visibility into the status of their reports, companies 
              get better organized feedback, and the entire software ecosystem improves through 
              shared knowledge.
            </p>
            <p className="text-muted-foreground">
              Today, BugRelay serves as a bridge between users and companies, fostering a more 
              collaborative approach to software quality. We're proud to be part of the movement 
              toward more transparent and user-centric software development.
            </p>
          </CardContent>
        </Card>

        {/* Team Section */}
        <Card className="mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Built by Developers, for Developers</CardTitle>
            <CardDescription>
              We understand the challenges because we've lived them
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Our team consists of experienced developers, designers, and product managers who have 
              worked at companies of all sizes. We've seen firsthand how better bug tracking can 
              transform the relationship between users and development teams.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" asChild>
                <Link href="/careers">
                  <Users className="mr-2 h-4 w-4" />
                  Join Our Team
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  Open Source
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Get in Touch</CardTitle>
            <CardDescription>
              We'd love to hear from you
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Have questions, feedback, or ideas? We're always excited to connect with our community.
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link href="/contact">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Us
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/submit">
                  <Bug className="mr-2 h-4 w-4" />
                  Report a Bug
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}