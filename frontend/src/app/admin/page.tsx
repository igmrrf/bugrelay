import { MainLayout } from "@/components/layout"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <AdminDashboard />
      </div>
    </MainLayout>
  )
}