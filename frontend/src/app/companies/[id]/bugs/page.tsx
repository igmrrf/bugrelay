"use client"

import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"
import { useCompany } from "@/lib/hooks/use-company-queries"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Bug, ArrowLeft, Filter } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function CompanyBugsPage() {
    const params = useParams()
    const router = useRouter()
    const { user, isAuthenticated } = useAuthStore()
    const companyId = params.id as string

    const { data: company, isLoading, error } = useCompany(companyId)

    // Check if user is a member of this company
    const userMember = company?.members?.find(member => member.user.email === user?.email)
    const isCompanyMember = !!userMember

    // Filter state
    const [filters, setFilters] = useState({
        status: [] as string[],
        priority: [] as string[],
        application: '' as string
    })

    // Redirect if not authenticated or not a company member
    useEffect(() => {
        if (!isLoading && company) {
            if (!isAuthenticated) {
                router.push(`/login?redirect=/companies/${companyId}/bugs`)
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
                <LoadingState message="Loading company bugs..." />
            </MainLayout>
        )
    }

    if (error) {
        return (
            <MainLayout>
                <div className="container py-8">
                    <ErrorMessage
                        title="Failed to load bugs"
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
                        message="The company you're looking for doesn't exist."
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
                        message="You don't have permission to manage this company's bug reports."
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
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/companies/${companyId}`}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Company
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center space-x-2">
                                <Bug className="h-8 w-8" />
                                <span>Bug Reports</span>
                            </h1>
                            <p className="text-muted-foreground">
                                Manage bug reports for {company.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>
                        <Button asChild>
                            <Link href={`/companies/${companyId}/dashboard`}>
                                Dashboard
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bugs</CardTitle>
                            <Bug className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Open</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">In Review</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Fixed</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bug Status Manager */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bug Reports Management</CardTitle>
                        <CardDescription>
                            Review and update the status of bug reports for your applications
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Bug status management will be implemented here.</p>
                            <p className="text-sm">Company ID: {companyId}</p>
                            <p className="text-sm">User Role: {userMember?.role || 'member'}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Applications Filter */}
                {false && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Filter by Application</CardTitle>
                            <CardDescription>
                                View bugs for specific applications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[].map((app: any) => (
                                    <div key={app.id} className="p-4 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold">{app.name}</h4>
                                            <span className="text-sm text-muted-foreground">
                                                {app.bugCount || 0} bugs
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => setFilters(prev => ({ ...prev, application: app.id }))}
                                        >
                                            View Bugs
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty State */}
                {true && (
                    <Card className="mt-6">
                        <CardContent className="text-center py-12">
                            <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Bug Reports Yet</h3>
                            <p className="text-muted-foreground mb-6">
                                When users report bugs for your applications, they'll appear here for you to manage.
                            </p>
                            <Button asChild>
                                <Link href={`/companies/${companyId}`}>
                                    Back to Company Dashboard
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    )
}