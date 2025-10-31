import { MainLayout } from "@/components/layout"
import { ForgotPasswordForm } from "@/components/auth"

export default function ForgotPasswordPage() {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <ForgotPasswordForm />
      </div>
    </MainLayout>
  )
}