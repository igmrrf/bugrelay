import { MainLayout } from "@/components/layout";
import { RegisterForm } from "@/components/auth";

export default function RegisterPage() {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold mb-2">Create account</h1>
            <p className="text-muted-foreground">Join BugRelay today</p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </MainLayout>
  );
}
