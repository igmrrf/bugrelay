import { MainLayout } from "@/components/layout"
import { RegisterForm } from "@/components/auth"

export default function RegisterPage() {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <RegisterForm />
      </div>
    </MainLayout>
  )
}