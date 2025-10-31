"use client"

import * as React from "react"
import { Header } from "./header"
import { Footer } from "./footer"
import { ErrorBoundary } from "@/components/ui/error-boundary"

interface MainLayoutProps {
  children: React.ReactNode
  isAuthenticated?: boolean
  user?: {
    name: string
    email: string
    avatar?: string
  }
  onSearch?: (query: string) => void
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  isAuthenticated = false,
  user,
  onSearch
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        isAuthenticated={isAuthenticated}
        user={user}
        onSearch={onSearch}
      />
      
      <main className="flex-1">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      
      <Footer />
    </div>
  )
}