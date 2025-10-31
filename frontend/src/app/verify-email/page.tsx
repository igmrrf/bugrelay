import { MainLayout } from "@/components/layout"
import { EmailVerification } from "@/components/auth"

export default function VerifyEmailPage() {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <EmailVerification />
      </div>
    </MainLayout>
  )
}