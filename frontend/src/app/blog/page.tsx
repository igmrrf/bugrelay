import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, ArrowRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function BlogPage() {
  const featuredPost = {
    id: 1,
    title: "The Future of Public Bug Tracking: Why Transparency Matters",
    excerpt: "Exploring how transparent bug tracking can revolutionize the relationship between users and software companies, leading to better products for everyone.",
    author: "Sarah Chen",
    date: "2024-01-15",
    readTime: "8 min read",
    category: "Product",
    image: "/api/placeholder/800/400",
    featured: true
  }

  const blogPosts = [
    {
      id: 2,
      title: "Building a Community-Driven Bug Tracking Platform",
      excerpt: "The technical challenges and design decisions behind BugRelay's architecture, and how we built for scale from day one.",
      author: "Alex Rodriguez",
      date: "2024-01-10",
      readTime: "12 min read",
      category: "Engineering",
      image: "/api/placeholder/400/250"
    },
    {
      id: 3,
      title: "How to Write Effective Bug Reports That Get Fixed",
      excerpt: "A comprehensive guide for users on how to write bug reports that provide developers with the information they need to fix issues quickly.",
      author: "Maya Patel",
      date: "2024-01-08",
      readTime: "6 min read",
      category: "Guide",
      image: "/api/placeholder/400/250"
    },
    {
      id: 4,
      title: "Company Verification: Building Trust in Public Bug Tracking",
      excerpt: "How our company verification system works and why it's crucial for maintaining trust between users and companies on our platform.",
      author: "David Kim",
      date: "2024-01-05",
      readTime: "5 min read",
      category: "Product",
      image: "/api/placeholder/400/250"
    },
    {
      id: 5,
      title: "The Psychology of Bug Reporting: User Behavior Insights",
      excerpt: "What we've learned about user behavior from analyzing thousands of bug reports, and how it shapes our product decisions.",
      author: "Lisa Wang",
      date: "2024-01-03",
      readTime: "10 min read",
      category: "Research",
      image: "/api/placeholder/400/250"
    },
    {
      id: 6,
      title: "Open Source and BugRelay: Our Commitment to Transparency",
      excerpt: "Why we're open-sourcing parts of BugRelay and how the community can contribute to making bug tracking better for everyone.",
      author: "Michael Brown",
      date: "2023-12-28",
      readTime: "7 min read",
      category: "Open Source",
      image: "/api/placeholder/400/250"
    },
    {
      id: 7,
      title: "API Design for Developer-Friendly Bug Tracking",
      excerpt: "The principles and decisions behind BugRelay's API design, making it easy for companies to integrate with their existing workflows.",
      author: "Jennifer Liu",
      date: "2023-12-25",
      readTime: "9 min read",
      category: "Engineering",
      image: "/api/placeholder/400/250"
    }
  ]

  const categories = ["All", "Product", "Engineering", "Guide", "Research", "Open Source"]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">BugRelay Blog</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Insights, updates, and stories from the team building the future of public bug tracking.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === "All" ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Post */}
        <Card className="mb-12 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2">
              <div className="h-64 md:h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">Featured Image</span>
              </div>
            </div>
            <div className="md:w-1/2 p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-3">
                <Badge>{featuredPost.category}</Badge>
                <Badge variant="secondary">Featured</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                {featuredPost.title}
              </h2>
              <p className="text-muted-foreground mb-6">
                {featuredPost.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{featuredPost.author}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(featuredPost.date)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{featuredPost.readTime}</span>
                  </span>
                </div>
                <Button>
                  Read More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {blogPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">Article Image</span>
              </div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{post.category}</Badge>
                  <span className="text-xs text-muted-foreground">{post.readTime}</span>
                </div>
                <CardTitle className="text-lg line-clamp-2">
                  {post.title}
                </CardTitle>
                <CardDescription className="line-clamp-3">
                  {post.excerpt}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                </div>
                <Button variant="ghost" className="w-full mt-4 justify-between">
                  Read Article
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mb-12">
          <Button variant="outline" size="lg">
            Load More Articles
          </Button>
        </div>

        {/* Newsletter Signup */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Stay Updated</CardTitle>
            <CardDescription>
              Get the latest articles and updates delivered to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md mx-auto">
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1"
                />
                <Button>Subscribe</Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}