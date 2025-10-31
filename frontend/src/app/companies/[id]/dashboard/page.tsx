"use client"

import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout"
import { CompanyDashboard } from "@/components/companies/company-dashboard"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"
import { useCompany } from "@/lib/hooks/use-company-queries"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useEffect } from "react"

export default function CompanyDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const companyId = params.id as string

  const { data: company, isLoading, error } = useCompany(companyId)

  // Check if user is a member of this company
  const isCompanyMember = company?.members?.some(member => member.user.email === user?.email)
  const userRole = company?.members?.find(member => member.user.email === user?.email)?.role

  // Redirect if not authenticated or not a company member
  useEffect(() => {
    if (!isLoading && company) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=/companies/${companyId}/dashboard`)
        return
      }
      
      if (!isCompanyMember) {
        router.push(`/companies/${companyId}`)
        return
      }
    }
  }, [isLoading, company, isAuthenticated, isCompanyMember, router, companyId])

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState message="Loading company dashboard..." />
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Failed to load dashboard"
            message={typeof error === 'string' ? error : 'An error occurred'}
            action={{
              label: "Back to company",
              onClick: () => router.push(`/companies/${companyId}`)
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
            message="The company dashboard you're looking for doesn't exist."
            action={{
              label: "Browse companies",
              onClick: () => router.push("/companies")
            }}
          />
        </div>
      </MainLayout>
    )
  }

  if (!isAuthenticated || !isCompanyMember) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Access denied"
            message="You don't have permission to view this company's dashboard."
            action={{
              label: "View company profile",
              onClick: () => router.push(`/companies/${companyId}`)
            }}
          />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <CompanyDashboard 
          company={{
            id: company.id,
            name: company.name,
            domain: company.domain,
            isVerified: company.isVerified,
            createdAt: company.createdAt,
            stats: {
              totalBugs: 0,
              openBugs: 0,
              fixedBugs: 0,
              avgResponseTime: 0,
              monthlyTrend: 0
            },
            applications: [],
            teamMembers: company.members.map(member => ({
              id: member.id,
              name: member.user.displayName || member.user.email,
              email: member.user.email,
              role: member.role,
              avatar: member.user.avatarUrl,
              joinedAt: member.addedAt,
              lastActiveAt: member.addedAt
            })),
            recentBugs: [],
            userRole: userRole || 'member'
          }}
        />
      </div>
    </MainLayout>
  )
}