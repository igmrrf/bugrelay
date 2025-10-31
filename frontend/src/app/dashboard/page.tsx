import { MainLayout } from "@/components/layout"
import { CompanyDashboard } from "@/components/companies/company-dashboard"

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <CompanyDashboard />
      </div>
    </MainLayout>
  )
}