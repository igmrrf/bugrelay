import { MainLayout } from "@/components/layout"
import { BugList } from "@/components/bugs/bug-list"

export default function BugsPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <BugList />
      </div>
    </MainLayout>
  )
}