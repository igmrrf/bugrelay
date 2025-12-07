"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Github, Mail, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { useRegister } from "@/lib/hooks";

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  onOAuthLogin?: (provider: "google" | "github") => void;
  isLoading?: boolean;
  error?: string;
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
  { regex: /[^A-Za-z0-9]/, text: "One special character" },
];

export const RegisterForm = () => {
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
  const [showPasswordRequirements, setShowPasswordRequirements] =
    React.useState(false);

  const onOAuthLogin = (oauth: "google" | "github") => {};

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
      await onSubmit(formData);
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

  const getPasswordStrength = (password: string): number => {
    return passwordRequirements.filter((req) => req.regex.test(password))
      .length;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Create account
        </CardTitle>
        <CardDescription className="text-center">
          Enter your information to create your BugRelay account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => onOAuthLogin("google")}
            disabled={isLoading}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Google
          </Button>
          <Button
            variant="outline"
            onClick={() => onOAuthLogin("github")}
            disabled={isLoading}
            className="w-full"
          >
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error.message}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Display Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your Display name"
              value={formData.display_name}
              onChange={(e) =>
                handleInputChange("display_name", e.target.value)
              }
              disabled={isLoading}
              className={fieldErrors.display_name ? "border-destructive" : ""}
            />
            {fieldErrors.display_name && (
              <p className="text-sm text-destructive">
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
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isLoading}
              className={fieldErrors.email ? "border-destructive" : ""}
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
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
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                onFocus={() => setShowPasswordRequirements(true)}
                onBlur={() => setShowPasswordRequirements(false)}
                disabled={isLoading}
                className={
                  fieldErrors.password ? "border-destructive pr-10" : "pr-10"
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        passwordStrength >= level
                          ? passwordStrength <= 2
                            ? "bg-red-500"
                            : passwordStrength <= 3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength:{" "}
                  {passwordStrength <= 2
                    ? "Weak"
                    : passwordStrength <= 3
                      ? "Fair"
                      : passwordStrength <= 4
                        ? "Good"
                        : "Strong"}
                </p>
              </div>
            )}

            {/* Password Requirements */}
            {(showPasswordRequirements || fieldErrors.password) && (
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => {
                  const isValid = req.regex.test(formData.password);
                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-xs"
                    >
                      {isValid ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-gray-400" />
                      )}
                      <span
                        className={isValid ? "text-green-600" : "text-gray-500"}
                      >
                        {req.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
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
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                disabled={isLoading}
                className={
                  fieldErrors.confirmPassword
                    ? "border-destructive pr-10"
                    : "pr-10"
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex items-start space-x-2">
            <input
              id="terms"
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) =>
                handleInputChange("acceptTerms", e.target.checked)
              }
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300 mt-0.5"
            />
            <label htmlFor="terms" className="text-sm">
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>
          {fieldErrors.acceptTerms && (
            <p className="text-sm text-destructive">
              {fieldErrors.acceptTerms}
            </p>
          )}

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

        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
