"use client"

import * as React from "react"
import { useCompany, useClaimCompany } from "@/lib/hooks/use-company-queries"
import { CompanyClaimForm, type CompanyClaimData, type Company } from "./company-claim-form"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"

interface CompanyClaimContainerProps {
  companyId: string
}

export function CompanyClaimContainer({ companyId }: CompanyClaimContainerProps) {
  const { data: company, isLoading, error: loadError } = useCompany(companyId)
  const { mutate: claimCompany, isPending: isClaiming, isSuccess, error: claimError } = useClaimCompany()

  const handleSubmit = async (data: CompanyClaimData) => {
    // Note: The current useClaimCompany hook only accepts id and email.
    // Position and reason are collected by the form but not currently sent to the API
    // due to hook limitations.
    claimCompany({ id: data.companyId, email: data.workEmail })
  }

  if (isLoading) {
    return <LoadingState message="Loading company details..." />
  }

  if (loadError || !company) {
    return (
      <ErrorMessage
        title="Company not found"
        message={loadError ? (loadError as Error).message : "The company you requested could not be found."}
        action={{
          label: "Browse Companies",
          onClick: () => window.location.href = "/companies"
        }}
      />
    )
  }

  // Helper to safely access properties that might be snake_case from API
  const safeGet = (obj: any, camelKey: string, snakeKey: string) => {
    return obj[camelKey] !== undefined ? obj[camelKey] : obj[snakeKey]
  }

  // Map API response to UI component props
  const mappedCompany: Company = {
    id: company.id,
    name: company.name,
    domain: company.domain,
    isVerified: safeGet(company, 'isVerified', 'is_verified'),
    bugCount: safeGet(company, 'bugCount', 'bug_count') || 0,
    createdAt: safeGet(company, 'createdAt', 'created_at'),
    applications: (company.applications || []).map((app: any) => ({
      id: app.id,
      name: app.name,
      bugCount: safeGet(app, 'bugCount', 'bug_count') || 0
    }))
  }

  return (
    <CompanyClaimForm
      company={mappedCompany}
      onSubmit={handleSubmit}
      isLoading={isClaiming}
      error={claimError ? (claimError as Error).message : undefined}
      success={isSuccess}
    />
  )
}
