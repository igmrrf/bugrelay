"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"
import { useCompanies } from "@/lib/hooks/use-company-queries"
import { Building2, CheckCircle, Bug, Search, Filter } from "lucide-react"
import Link from "next/link"

export default function CompaniesPage() {
  const [filters, setFilters] = useState({
    search: '',
    verified: undefined as boolean | undefined,
    sortBy: 'name' as 'name' | 'bugs' | 'created',
    page: 1,
    limit: 12
  })

  const { data: companiesData, isLoading, error } = useCompanies(filters)

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }))
  }

  const handleVerifiedFilter = (verified: boolean | undefined) => {
    setFilters(prev => ({ ...prev, verified, page: 1 }))
  }

  const handleSortChange = (sortBy: 'name' | 'bugs' | 'created') => {
    setFilters(prev => ({ ...prev, sortBy, page: 1 }))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Companies</h1>
          <p className="text-muted-foreground">
            Browse companies and their applications, or claim your company to manage bug reports
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search companies..."
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filters.verified === undefined ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVerifiedFilter(undefined)}
                >
                  All
                </Button>
                <Button
                  variant={filters.verified === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVerifiedFilter(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verified
                </Button>
                <Button
                  variant={filters.verified === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVerifiedFilter(false)}
                >
                  Unverified
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filters.sortBy === 'name' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSortChange('name')}
                >
                  Name
                </Button>
                <Button
                  variant={filters.sortBy === 'bugs' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSortChange('bugs')}
                >
                  Bug Count
                </Button>
                <Button
                  variant={filters.sortBy === 'created' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSortChange('created')}
                >
                  Newest
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <LoadingState message="Loading companies..." />
        )}

        {/* Error State */}
        {error && (
          <ErrorMessage
            title="Failed to load companies"
            message={error.message || 'An error occurred while loading companies'}
            action={{
              label: "Try again",
              onClick: () => window.location.reload()
            }}
          />
        )}

        {/* Companies Grid */}
        {companiesData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companiesData.companies.map((company) => (
                <Card key={company.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                      </div>
                      {company.isVerified && <CheckCircle className="h-5 w-5 text-green-600" />}
                    </div>
                    <CardDescription>
                      {company.domain}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Team Members</span>
                      <span className="font-medium">{company.members?.length || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">{company.isVerified ? 'Verified' : 'Unverified'}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Since</span>
                      <span className="font-medium">{formatDate(company.createdAt)}</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/companies/${company.id}`}>
                          View Details
                        </Link>
                      </Button>
                      {!company.isVerified && (
                        <Button size="sm" className="flex-1" asChild>
                          <Link href={`/companies/${company.id}/claim`}>
                            Claim Company
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {companiesData.hasNextPage && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Load More Companies
                </Button>
              </div>
            )}

            {/* Results Info */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Showing {companiesData.companies.length} of {companiesData.totalCount} companies
            </div>
          </>
        )}

        {/* Empty State */}
        {companiesData && companiesData.companies.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No companies found</h3>
              <p className="text-muted-foreground mb-6">
                {filters.search 
                  ? `No companies match "${filters.search}"`
                  : "No companies have been created yet"
                }
              </p>
              {filters.search && (
                <Button variant="outline" onClick={() => handleSearchChange('')}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Don't see your company?</CardTitle>
              <CardDescription>
                Companies are created automatically when users submit bug reports for their applications.
                Submit a bug report to get started!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/submit">
                  <Bug className="mr-2 h-4 w-4" />
                  Submit Bug Report
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}