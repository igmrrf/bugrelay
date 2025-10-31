"use client"

import * as React from "react"
import Link from "next/link"
import { 
  Shield, 
  Bug, 
  Building2, 
  Users, 
  Flag, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"

interface AdminDashboardProps {
  data?: AdminDashboardData
  isLoading?: boolean
  error?: string
}

export interface AdminDashboardData {
  stats: {
    totalBugs: number
    totalCompanies: number
    totalUsers: number
    flaggedContent: number
    pendingVerifications: number
    monthlyGrowth: {
      bugs: number
      companies: number
      users: number
    }
  }
  
  recentActivity: {
    id: string
    type: "bug_submitted" | "company_claimed" | "content_flagged" | "user_registered"
    title: string
    description: string
    timestamp: string
    user?: {
      name: string
      email: string
    }
    metadata?: Record<string, any>
  }[]
  
  flaggedContent: {
    id: string
    type: "bug" | "comment"
    title: string
    reason: string
    flaggedAt: string
    flaggedBy: {
      name: string
    }
    status: "pending" | "resolved" | "dismissed"
  }[]
  
  pendingVerifications: {
    id: string
    companyName: string
    domain: string
    requestedBy: {
      name: string
      email: string
    }
    requestedAt: string
  }[]
  
  systemHealth: {
    status: "healthy" | "warning" | "critical"
    uptime: number
    responseTime: number
    errorRate: number
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  data,
  isLoading = false,
  error
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "bug_submitted": return Bug
      case "company_claimed": return Building2
      case "content_flagged": return Flag
      case "user_registered": return Users
      default: return AlertTriangle
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600"
      case "warning": return "text-yellow-600"
      case "critical": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading admin dashboard..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load admin dashboard"
        message={error}
        action={{
          label: "Try again",
          onClick: () => window.location.reload()
        }}
      />
    )
  }

  if (!data) {
    return (
      <ErrorMessage
        title="No data available"
        message="Unable to load admin dashboard data."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage the BugRelay platform
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link href="/admin/reports">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/moderation">
              <Flag className="mr-2 h-4 w-4" />
              Moderation Queue
            </Link>
          </Button>
        </div>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              data.systemHealth.status === "healthy" ? "bg-green-500" :
              data.systemHealth.status === "warning" ? "bg-yellow-500" : "bg-red-500"
            }`} />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className={`text-lg font-bold capitalize ${getHealthColor(data.systemHealth.status)}`}>
                {data.systemHealth.status}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Uptime</p>
              <p className="text-lg font-bold">{data.systemHealth.uptime.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm font-medium">Response Time</p>
              <p className="text-lg font-bold">{data.systemHealth.responseTime}ms</p>
            </div>
            <div>
              <p className="text-sm font-medium">Error Rate</p>
              <p className="text-lg font-bold">{data.systemHealth.errorRate.toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bugs</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalBugs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.monthlyGrowth.bugs > 0 ? "+" : ""}{data.stats.monthlyGrowth.bugs}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalCompanies.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.monthlyGrowth.companies > 0 ? "+" : ""}{data.stats.monthlyGrowth.companies}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.monthlyGrowth.users > 0 ? "+" : ""}{data.stats.monthlyGrowth.users}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.flaggedContent}</div>
            <p className="text-xs text-muted-foreground">
              Requires moderation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">
              Company claims
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest platform activity and events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {data.recentActivity.slice(0, 8).map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="p-2 rounded-full bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flagged Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Flagged Content</CardTitle>
                <CardDescription>
                  Content that requires moderation
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/moderation">
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.flaggedContent.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No flagged content
              </p>
            ) : (
              <div className="space-y-3">
                {data.flaggedContent.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <StatusBadge className="text-xs">
                          {item.type}
                        </StatusBadge>
                        <StatusBadge 
                          className={`text-xs ${
                            item.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            item.status === "resolved" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.status}
                        </StatusBadge>
                      </div>
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Flagged by {item.flaggedBy.name} • {formatDate(item.flaggedAt)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/moderation/${item.id}`}>
                        Review
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Verifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Company Verifications</CardTitle>
              <CardDescription>
                Company ownership claims awaiting verification
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/verifications">
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.pendingVerifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No pending verifications
            </p>
          ) : (
            <div className="space-y-3">
              {data.pendingVerifications.slice(0, 5).map((verification) => (
                <div key={verification.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{verification.companyName}</p>
                    <p className="text-sm text-muted-foreground">{verification.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested by {verification.requestedBy.name} • {formatDate(verification.requestedAt)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/verifications/${verification.id}`}>
                      Review
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