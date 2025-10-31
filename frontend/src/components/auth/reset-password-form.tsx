"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff, Check, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading"

interface ResetPasswordFormProps {
  onSubmit?: (data: ResetPasswordData) => Promise<void>
  isLoading?: boolean
  error?: string
  success?: boolean
  token?: string
}

export interface ResetPasswordData {
  token: string
  password: string
  confirmPassword: string
}

const passwordRequirements = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[A-Z]/, text: "One uppercase letter" },
  { regex: /[a-z]/, text: "One lowercase letter" },
  { regex: /\d/, text: "One number" },
  { regex: /[^A-Za-z0-9]/, text: "One special character" }
]

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
  success = false,
  token = ""
}) => {
  const [formData, setFormData] = React.useState({
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [fieldErrors, setFieldErrors] = React.useState<{
    password?: string
    confirmPassword?: string
  }>({})

  const validateForm = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {}
    
    if (!formData.password) {
      errors.password = "Password is required"
    } else if (!passwordRequirements.every(req => req.regex.test(formData.password))) {
      errors.password = "Password does not meet requirements"
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !onSubmit) return
    
    try {
      await onSubmit({
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      })
    } catch (err) {
      // Error handling is managed by parent component
    }
  }

  const handleInputChange = (field: "password" | "confirmPassword", value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const getPasswordStrength = (password: string): number => {
    return passwordRequirements.filter(req => req.regex.test(password)).length
  }

  const passwordStrength = getPasswordStrength(formData.password)

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Password reset successful</CardTitle>
          <CardDescription>
            Your password has been successfully reset. You can now sign in with your new password.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">
              Continue to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Set new password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                disabled={isLoading}
                className={fieldErrors.password ? "border-destructive pr-10" : "pr-10"}
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
                  Password strength: {
                    passwordStrength <= 2 ? "Weak" :
                    passwordStrength <= 3 ? "Fair" :
                    passwordStrength <= 4 ? "Good" : "Strong"
                  }
                </p>
              </div>
            )}

            {/* Password Requirements */}
            {formData.password && (
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => {
                  const isValid = req.regex.test(formData.password)
                  return (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      {isValid ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-gray-400" />
                      )}
                      <span className={isValid ? "text-green-600" : "text-gray-500"}>
                        {req.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            
            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                disabled={isLoading}
                className={fieldErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
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
              <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Resetting password...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}