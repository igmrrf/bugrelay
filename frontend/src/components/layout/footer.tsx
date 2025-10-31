import * as React from "react"
import Link from "next/link"
import { Bug, Github, Twitter } from "lucide-react"

export const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Bug className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">BugRelay</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              A public, user-driven bug tracking hub that connects users and companies 
              to improve software quality together.
            </p>
            <div className="flex space-x-4">
              <Link 
                href="https://github.com" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link 
                href="https://twitter.com" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/bugs" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse Bugs
                </Link>
              </li>
              <li>
                <Link 
                  href="/submit" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Submit Bug
                </Link>
              </li>
              <li>
                <Link 
                  href="/companies" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Companies
                </Link>
              </li>
              <li>
                <Link 
                  href="/api-docs" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  API Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/about" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link 
                  href="/careers" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/privacy" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/guidelines" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link 
                  href="/security" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2024 BugRelay. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Made with ❤️ for the developer community</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}