import { MainLayout } from "@/components/layout"
import { ResetPasswordForm } from "@/components/auth"

export default function ResetPasswordPage() {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <ResetPasswordForm />
      </div>
    </MainLayout>
  )
}