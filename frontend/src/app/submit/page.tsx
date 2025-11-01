"use client";

import { MainLayout } from "@/components/layout"
import { BugSubmissionForm } from "@/components/bugs/bug-submission-form"
import { useCreateBug } from "@/lib/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { BugSubmissionData } from "@/components/bugs/bug-submission-form"

export default function SubmitBugPage() {
  const router = useRouter()
  const createBugMutation = useCreateBug()
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (data: BugSubmissionData) => {
    try {
      const bugData = {
        title: data.title,
        description: data.description,
        applicationName: data.applicationName,
        applicationUrl: data.applicationUrl || undefined,
        priority: data.priority,
        tags: data.tags,
        operatingSystem: data.operatingSystem || undefined,
        deviceType: data.deviceType || undefined,
        appVersion: data.appVersion || undefined,
        browserVersion: data.browserVersion || undefined,
        contactEmail: data.contactEmail || undefined,
        screenshots: data.screenshots
      }

      await createBugMutation.mutateAsync(bugData)
      setIsSuccess(true)
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to submit bug:', error)
    }
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <BugSubmissionForm 
          onSubmit={handleSubmit}
          isLoading={createBugMutation.isPending}
          error={createBugMutation.error?.message}
          success={isSuccess}
        />
      </div>
    </MainLayout>
  )
}