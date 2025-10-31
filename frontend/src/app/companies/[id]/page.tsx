"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout"
import { CompanyDashboard } from "@/components/companies/company-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"
import { useCompany } from "@/lib/hooks/use-company-queries"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Building2, CheckCircle, Bug, Users, Calendar, ExternalLink, Shield } from "lucide-react"
import Link from "next/link"

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const companyId = params.id as string

  const { data: company, isLoading, error } = useCompany(companyId)

  // Check if user is a member of this company
  const isCompanyMember = company?.teamMembers?.some(member => member.email === user?.email)
  const userRole = company?.teamMembers?.find(member => member.email === user?.email)?.role

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState message="Loading company details..." />
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Failed to load company"
            message={error}
            action={{
              label: "Back to companies",
              onClick: () => router.push("/companies")
            }}
          />
        </div>
      </MainLayout>
    )
  }

  if (!company) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Company not found"
            message="The company you're looking for doesn't exist or has been removed."
            action={{
              label: "Browse companies",
              onClick: () => router.push("/companies")
            }}
          />
        </div>
      </MainLayout>
    )
  }

  // If user is a company member, show the dashboard
  if (isAuthenticated && isCompanyMember) {
    return (
      <MainLayout>
        <div className="container py-8">
          <CompanyDashboard 
            company={{
              ...company,
              userRole: userRole || 'member'
            }}
          />
        </div>
      </MainLayout>
    )
  }

  // Otherwise, show public company profile
  return (
    <MainLayout>
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Company Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-3xl">{company.name}</CardTitle>
                      {company.isVerified && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Verified</span>
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-lg mt-1">
                      {company.domain}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">
                      Company since {formatDate(company.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  {!company.isVerified && (
                    <Button asChild>
                      <Link href={`/companies/${company.id}/claim`}>
                        <Shield className="mr-2 h-4 w-4" />
                        Claim Company
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link href={`/bugs?company=${company.id}`}>
                      <Bug className="mr-2 h-4 w-4" />
                      View Bug Reports
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Company Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.stats?.totalBugs || company.bugCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {company.stats?.openBugs || 0} currently open
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.applications?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active applications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.teamMembers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {company.isVerified ? 'Team members' : 'Not verified'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Applications */}
          {company.applications && company.applications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  Applications developed by {company.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.applications.map((app) => (
                    <div key={app.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{app.name}</h4>
                        {app.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={app.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{app.bugCount || 0} bug reports</span>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/bugs?application=${app.id}`}>
                            View Bugs
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Bug Reports */}
          {company.recentBugs && company.recentBugs.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Bug Reports</CardTitle>
                    <CardDescription>
                      Latest bug reports for {company.name}'s applications
                    </CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/bugs?company=${company.id}`}>
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {company.recentBugs.slice(0, 5).map((bug) => (
                    <div key={bug.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{bug.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span>{bug.application.name}</span>
                          <span>{formatDate(bug.createdAt)}</span>
                          {bug.reporter && <span>by {bug.reporter.name}</span>}
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
              </CardContent>
            </Card>
          )}

          {/* Company Not Verified Notice */}
          {!company.isVerified && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Company Not Verified</CardTitle>
                <CardDescription className="text-orange-700">
                  This company hasn't been claimed by its owners yet. If you work for {company.name}, 
                  you can claim it to manage bug reports and respond to users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <Link href={`/companies/${company.id}/claim`}>
                      <Shield className="mr-2 h-4 w-4" />
                      Claim This Company
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
          )}

          {/* Empty State */}
          {(!company.applications || company.applications.length === 0) && 
           (!company.recentBugs || company.recentBugs.length === 0) && (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
                <p className="text-muted-foreground mb-6">
                  This company doesn't have any applications or bug reports yet.
                </p>
                <Button asChild>
                  <Link href="/submit">
                    <Bug className="mr-2 h-4 w-4" />
                    Submit First Bug Report
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}