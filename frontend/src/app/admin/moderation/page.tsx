import { MainLayout } from "@/components/layout"
import { ContentModeration } from "@/components/admin/content-moderation"

export default function ModerationPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <ContentModeration />
      </div>
    </MainLayout>
  )
}