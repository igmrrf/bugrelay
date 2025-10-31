import { MainLayout } from "@/components/layout"
import { AuditLog } from "@/components/admin/audit-log"

export default function AuditPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <AuditLog />
      </div>
    </MainLayout>
  )
}