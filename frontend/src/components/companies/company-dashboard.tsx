"use client"

import * as React from "react"
import Link from "next/link"
import { 
  Building2, 
  Bug, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Plus,
  Settings,
  BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { BugCard } from "@/components/ui/bug-card"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"

interface CompanyDashboardProps {
  company?: CompanyDashboard
  isLoading?: boolean
  error?: string
  onUpdateBugStatus?: (bugId: string, status: string) => Promise<void>
  onAddTeamMember?: (email: string, role: string) => Promise<void>
}

export interface CompanyDashboard {
  id: string
  name: string
  domain: string
  isVerified: boolean
  createdAt: string
  
  // Statistics
  stats: {
    totalBugs: number
    openBugs: number
    fixedBugs: number
    avgResponseTime: number // in hours
    monthlyTrend: number // percentage change
  }
  
  // Applications
  applications: {
    id: string
    name: string
    url?: string
    bugCount: number
    openBugCount: number
    lastBugAt?: string
  }[]
  
  // Team members
  teamMembers: {
    id: string
    name: string
    email: string
    role: "admin" | "member"
    avatar?: string
    joinedAt: string
    lastActiveAt: string
  }[]
  
  // Recent bugs
  recentBugs: {
    id: string
    title: string
    status: "open" | "reviewing" | "fixed" | "wont_fix"
    priority: "low" | "medium" | "high" | "critical"
    createdAt: string
    application: {
      name: string
    }
    reporter?: {
      name: string
    }
  }[]
  
  // User permissions
  userRole: "admin" | "member"
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  company,
  isLoading = false,
  error,
  onUpdateBugStatus,
  onAddTeamMember
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = React.useState<"7d" | "30d" | "90d">("30d")

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getResponseTimeText = (hours: number) => {
    if (hours < 24) return `${Math.round(hours)}h`
    return `${Math.round(hours / 24)}d`
  }

  if (isLoading) {
    return <LoadingState message="Loading company dashboard..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load dashboard"
        message={error}
        action={{
          label: "Try again",
          onClick: () => window.location.reload()
        }}
      />
    )
  }

  if (!company) {
    return (
      <ErrorMessage
        title="Company not found"
        message="The company dashboard you're looking for doesn't exist or you don't have access to it."
        action={{
          label: "Browse companies",
          onClick: () => window.location.href = "/companies"
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{company.name}</h1>
              <p className="text-muted-foreground">{company.domain}</p>
            </div>
            {company.isVerified && (
              <CheckCircle className="h-6 w-6 text-green-600" />
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/companies/${company.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/companies/${company.id}/bugs`}>
              <Bug className="mr-2 h-4 w-4" />
              Manage Bugs
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bugs</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.stats.totalBugs}</div>
            <p className="text-xs text-muted-foreground">
              {company.stats.monthlyTrend > 0 ? "+" : ""}{company.stats.monthlyTrend}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Bugs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.stats.openBugs}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((company.stats.openBugs / company.stats.totalBugs) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fixed Bugs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.stats.fixedBugs}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((company.stats.fixedBugs / company.stats.totalBugs) * 100)}% resolution rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getResponseTimeText(company.stats.avgResponseTime)}</div>
            <p className="text-xs text-muted-foreground">
              Average time to first response
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              Manage your applications and their bug reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.applications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No applications found</p>
                <p className="text-sm">Applications are created automatically when bugs are reported</p>
              </div>
            ) : (
              <div className="space-y-3">
                {company.applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{app.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {app.bugCount} total bugs • {app.openBugCount} open
                      </p>
                      {app.lastBugAt && (
                        <p className="text-xs text-muted-foreground">
                          Last bug: {formatDate(app.lastBugAt)}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/companies/${company.id}/applications/${app.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your team and their permissions
                </CardDescription>
              </div>
              {company.userRole === "admin" && (
                <Button size="sm" asChild>
                  <Link href={`/companies/${company.id}/team`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Member
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.teamMembers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No team members</p>
                {company.userRole === "admin" && (
                  <Button size="sm" className="mt-2" asChild>
                    <Link href={`/companies/${company.id}/team`}>
                      Add Team Member
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {company.teamMembers.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge className="text-xs">
                        {member.role}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
                {company.teamMembers.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/companies/${company.id}/team`}>
                      View all {company.teamMembers.length} members
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bugs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Bug Reports</CardTitle>
              <CardDescription>
                Latest bug reports for your applications
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/companies/${company.id}/bugs`}>
                View All Bugs
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {company.recentBugs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent bug reports</p>
              <p className="text-sm">Bug reports will appear here when users submit them</p>
            </div>
          ) : (
            <div className="space-y-4">
              {company.recentBugs.slice(0, 5).map((bug) => (
                <div key={bug.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <StatusBadge status={bug.status} />
                      <StatusBadge priority={bug.priority} />
                    </div>
                    <h4 className="font-medium truncate">{bug.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{bug.application.name}</span>
                      {bug.reporter && <span>by {bug.reporter.name}</span>}
                      <span>{formatDate(bug.createdAt)}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/bugs/${bug.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}