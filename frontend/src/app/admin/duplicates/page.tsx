import { MainLayout } from "@/components/layout"
import { DuplicateMerger } from "@/components/admin/duplicate-merger"

export default function DuplicatesPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <DuplicateMerger />
      </div>
    </MainLayout>
  )
}