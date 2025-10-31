import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Users, Heart, Code, Zap, Globe, Coffee } from "lucide-react"
import Link from "next/link"

export default function CareersPage() {
  const openPositions = [
    {
      id: 1,
      title: "Senior Full Stack Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Join our core team to build the future of public bug tracking. Work with React, Node.js, and PostgreSQL.",
      requirements: ["5+ years full-stack experience", "React/Next.js expertise", "Node.js/Express", "PostgreSQL", "TypeScript"],
      posted: "2 days ago"
    },
    {
      id: 2,
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      description: "Shape the user experience of BugRelay. Design intuitive interfaces that make bug tracking accessible to everyone.",
      requirements: ["3+ years product design", "Figma proficiency", "User research experience", "Design systems", "B2B SaaS experience"],
      posted: "1 week ago"
    },
    {
      id: 3,
      title: "DevOps Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Scale our infrastructure to handle millions of bug reports. Work with Docker, Kubernetes, and cloud platforms.",
      requirements: ["4+ years DevOps experience", "Kubernetes", "Docker", "AWS/GCP", "CI/CD pipelines", "Monitoring tools"],
      posted: "3 days ago"
    },
    {
      id: 4,
      title: "Community Manager",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      description: "Build and nurture our developer community. Engage with users, create content, and grow our community.",
      requirements: ["2+ years community management", "Developer community experience", "Content creation", "Social media", "Event planning"],
      posted: "5 days ago"
    }
  ]

  const benefits = [
    {
      icon: Globe,
      title: "Remote First",
      description: "Work from anywhere in the world. We've been remote since day one."
    },
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Comprehensive health insurance, mental health support, and wellness stipend."
    },
    {
      icon: Code,
      title: "Learning Budget",
      description: "$2,000 annual budget for courses, conferences, and professional development."
    },
    {
      icon: Coffee,
      title: "Flexible Schedule",
      description: "Work when you're most productive. Core hours for collaboration, flexible otherwise."
    },
    {
      icon: Zap,
      title: "Equity Package",
      description: "Every team member gets equity. We succeed together."
    },
    {
      icon: Users,
      title: "Team Retreats",
      description: "Annual company retreats and quarterly team meetups around the world."
    }
  ]

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Join Our Mission</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Help us build the future of public bug tracking. We're looking for passionate people 
            who want to make software better for everyone.
          </p>
        </div>

        {/* Company Culture */}
        <Card className="mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Why Work at BugRelay?</CardTitle>
            <CardDescription>
              We're building something meaningful together
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3">Our Mission</h3>
                <p className="text-muted-foreground mb-4">
                  We believe transparent bug tracking makes software better for everyone. 
                  Every day, we work to bridge the gap between users and developers.
                </p>
                <h3 className="font-semibold mb-3">Our Values</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Transparency in everything we do</li>
                  <li>• Community-first approach</li>
                  <li>• Quality over quantity</li>
                  <li>• Continuous learning and growth</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Our Team</h3>
                <p className="text-muted-foreground mb-4">
                  We're a diverse, remote-first team of developers, designers, and product people 
                  from around the world. We value different perspectives and experiences.
                </p>
                <h3 className="font-semibold mb-3">Our Growth</h3>
                <p className="text-muted-foreground">
                  We're growing fast but sustainably. Join us at an exciting time as we scale 
                  our platform and expand our impact on the software development community.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Benefits & Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Open Positions</h2>
          <div className="space-y-6">
            {openPositions.map((position) => (
              <Card key={position.id}>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
                    <div>
                      <CardTitle className="text-xl">{position.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{position.department}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{position.location}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{position.type}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{position.posted}</Badge>
                      <Button>Apply Now</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{position.description}</p>
                  <div>
                    <h4 className="font-semibold mb-2">Requirements:</h4>
                    <div className="flex flex-wrap gap-2">
                      {position.requirements.map((req, index) => (
                        <Badge key={index} variant="outline">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Application Process */}
        <Card className="mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Our Hiring Process</CardTitle>
            <CardDescription>
              We believe in a fair, transparent hiring process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Application</h3>
                <p className="text-sm text-muted-foreground">
                  Submit your application with resume and cover letter
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Phone Screen</h3>
                <p className="text-sm text-muted-foreground">
                  30-minute call to discuss your background and interests
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Technical Interview</h3>
                <p className="text-sm text-muted-foreground">
                  Role-specific technical discussion and problem solving
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">4</span>
                </div>
                <h3 className="font-semibold mb-2">Team Interview</h3>
                <p className="text-sm text-muted-foreground">
                  Meet the team and discuss culture fit and collaboration
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Don't See a Perfect Fit?</CardTitle>
            <CardDescription>
              We're always looking for talented people
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              If you're passionate about our mission but don't see a role that matches your skills, 
              we'd still love to hear from you. Send us your resume and tell us how you'd like to contribute.
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link href="/contact">
                  Get in Touch
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/about">
                  Learn More About Us
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}