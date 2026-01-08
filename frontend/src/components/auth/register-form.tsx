"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, X, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { useRegister } from "@/lib/hooks";

interface RegisterFormProps {
  onOAuthLogin?: (provider: "google" | "github") => void;
}

export interface RegisterFormData {
  display_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface RegisterFormErrors {
  display_name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

const passwordRequirements = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[A-Z]/, text: "One uppercase letter" },
  { regex: /[a-z]/, text: "One lowercase letter" },
  { regex: /\d/, text: "One number" },
];

export const RegisterForm: React.FC<RegisterFormProps> = ({ onOAuthLogin }) => {
  const router = useRouter();
  const { mutate: onSubmit, isPending: isLoading, error } = useRegister();
  const [formData, setFormData] = React.useState<RegisterFormData>({
    display_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<RegisterFormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateForm = (): boolean => {
    const errors: RegisterFormErrors = {};

    if (!formData.display_name.trim()) {
      errors.display_name = "Display name is required";
    } else if (formData.display_name.trim().length < 2) {
      errors.display_name = "Display name must be at least 2 characters";
    }

    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (
      !passwordRequirements.every((req) => req.regex.test(formData.password))
    ) {
      errors.password = "Password does not meet requirements";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!formData.acceptTerms) {
      errors.acceptTerms = "You must accept the terms and conditions";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !onSubmit) return;

    try {
      onSubmit(formData, {
        onSuccess: () => {
          router.push("/verify-email");
        },
      });
    } catch (err) {
      // Error handling is managed by parent component
    }
  };

  const handleInputChange = (
    field: keyof RegisterFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getPasswordStrength = () => {
    const metRequirements = passwordRequirements.filter((req) =>
      req.regex.test(formData.password),
    ).length;
    return (metRequirements / passwordRequirements.length) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm border border-foreground/20 bg-foreground/5 rounded">
          {typeof error === "string"
            ? error
            : "An error occurred during registration"}
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="display_name" className="text-sm font-medium">
            Display Name
          </label>
          <Input
            id="display_name"
            type="text"
            placeholder="Your name"
            value={formData.display_name}
            onChange={(e) => handleInputChange("display_name", e.target.value)}
            onBlur={() => handleBlur("display_name")}
            disabled={isLoading}
            className={fieldErrors.display_name ? "border-foreground" : ""}
          />
          {fieldErrors.display_name && touched.display_name && (
            <p className="text-sm text-muted-foreground">
              {fieldErrors.display_name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            disabled={isLoading}
            className={fieldErrors.email ? "border-foreground" : ""}
          />
          {fieldErrors.email && touched.email && (
            <p className="text-sm text-muted-foreground">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              disabled={isLoading}
              className={
                fieldErrors.password ? "border-foreground pr-10" : "pr-10"
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Password Requirements */}
          {formData.password && (
            <div className="space-y-2 p-3 bg-muted/50 rounded text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Password strength</span>
                <span className="font-medium">
                  {Math.round(getPasswordStrength())}%
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-300"
                  style={{ width: `${getPasswordStrength()}%` }}
                />
              </div>
              <ul className="space-y-1 mt-2">
                {passwordRequirements.map((req, index) => {
                  const isMet = req.regex.test(formData.password);
                  return (
                    <li
                      key={index}
                      className={`flex items-center gap-2 ${
                        isMet ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {isMet ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span>{req.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {fieldErrors.password && touched.password && (
            <p className="text-sm text-muted-foreground">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              onBlur={() => handleBlur("confirmPassword")}
              disabled={isLoading}
              className={
                fieldErrors.confirmPassword
                  ? "border-foreground pr-10"
                  : "pr-10"
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {fieldErrors.confirmPassword && touched.confirmPassword && (
            <p className="text-sm text-muted-foreground">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <input
              id="terms"
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) =>
                handleInputChange("acceptTerms", e.target.checked)
              }
              disabled={isLoading}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <label htmlFor="terms" className="text-sm leading-relaxed">
              I agree to the{" "}
              <Link
                href="/terms"
                className="underline hover:text-foreground"
                target="_blank"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline hover:text-foreground"
                target="_blank"
              >
                Privacy Policy
              </Link>
            </label>
          </div>
          {fieldErrors.acceptTerms && (
            <p className="text-sm text-muted-foreground">
              {fieldErrors.acceptTerms}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => onOAuthLogin?.("google")}
          disabled={isLoading}
          className="w-full"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
        <Button
          variant="outline"
          onClick={() => onOAuthLogin?.("github")}
          disabled={isLoading}
          className="w-full"
        >
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
};
