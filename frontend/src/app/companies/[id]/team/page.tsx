import { MainLayout } from "@/components/layout"
import { TeamManagement } from "@/components/companies/team-management"

interface TeamManagementPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TeamManagementPage({ params }: TeamManagementPageProps) {
  const { id } = await params
  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and their permissions
          </p>
        </div>
        <TeamManagement />
      </div>
    </MainLayout>
  )
}