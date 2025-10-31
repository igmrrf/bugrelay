import { MainLayout } from "@/components/layout"
import { LoginForm } from "@/components/auth"

export default function LoginPage() {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <LoginForm />
      </div>
    </MainLayout>
  )
}