import { MainLayout } from "@/components/layout"
import { Button } from "@/components/ui"
import { Bug, Search, Users, Shield } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
        <div className="container max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <Bug className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to <span className="text-primary">BugRelay</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A public, user-driven bug tracking hub that connects users and companies 
            to improve software quality together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/bugs">Browse Bugs</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/submit">Submit a Bug</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How BugRelay Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Discover & Report</h3>
              <p className="text-muted-foreground">
                Find bugs in any application and report them with detailed descriptions, 
                screenshots, and technical information.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Community Engagement</h3>
              <p className="text-muted-foreground">
                Vote on bugs, add comments, and help prioritize issues that matter 
                most to the community.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Company Response</h3>
              <p className="text-muted-foreground">
                Companies can claim their applications, verify ownership, and 
                respond to bug reports with status updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Improve Software Quality?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users and companies working together to create better software experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/companies">For Companies</Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}