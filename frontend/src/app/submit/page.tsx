import { MainLayout } from "@/components/layout"
import { BugSubmissionForm } from "@/components/bugs/bug-submission-form"

export default function SubmitBugPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <BugSubmissionForm />
      </div>
    </MainLayout>
  )
}