import { MainLayout } from "@/components/layout"
import { ProfileForm } from "@/components/auth"

export default function ProfilePage() {
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        <ProfileForm />
      </div>
    </MainLayout>
  )
}