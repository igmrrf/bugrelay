import { MainLayout } from "@/components/layout";
import { LoginForm } from "@/components/auth";

export default function LoginPage() {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold mb-2">Sign in</h1>
            <p className="text-muted-foreground">Welcome back to BugRelay</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  );
}
