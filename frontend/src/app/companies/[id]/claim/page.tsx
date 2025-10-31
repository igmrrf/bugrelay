import { MainLayout } from "@/components/layout"
import { CompanyClaimForm } from "@/components/companies/company-claim-form"

interface CompanyClaimPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CompanyClaimPage({ params }: CompanyClaimPageProps) {
  const { id } = await params
  
  return (
    <MainLayout>
      <div className="container py-8">
        <CompanyClaimForm />
      </div>
    </MainLayout>
  )
}