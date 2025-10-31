"use client"

import * as React from "react"
import Link from "next/link"
import { Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading"

interface EmailVerificationProps {
  email?: string
  onResendVerification?: () => Promise<void>
  onVerifyToken?: (token: string) => Promise<void>
  isLoading?: boolean
  error?: string
  success?: boolean
  token?: string
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  onResendVerification,
  onVerifyToken,
  isLoading = false,
  error,
  success = false,
  token
}) => {
  const [resendCooldown, setResendCooldown] = React.useState(0)

  React.useEffect(() => {
    if (token && onVerifyToken) {
      onVerifyToken(token)
    }
  }, [token, onVerifyToken])

  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCooldown])

  const handleResend = async () => {
    if (!onResendVerification || resendCooldown > 0) return
    
    try {
      await onResendVerification()
      setResendCooldown(60) // 60 second cooldown
    } catch (err) {
      // Error handling is managed by parent component
    }
  }

  // Success state - email verified
  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Email verified!</CardTitle>
          <CardDescription>
            Your email address has been successfully verified. You can now access all features of BugRelay.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Continue to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Error state - verification failed
  if (error && token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Verification failed</CardTitle>
          <CardDescription>
            The verification link is invalid or has expired. Please request a new verification email.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
          
          <Button
            onClick={handleResend}
            disabled={isLoading || resendCooldown > 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Send new verification email
              </>
            )}
          </Button>
          
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

  // Loading state - verifying token
  if (isLoading && token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verifying email...</CardTitle>
          <CardDescription>
            Please wait while we verify your email address.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  // Default state - waiting for verification
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
        <CardDescription>
          We've sent a verification link to {email ? <strong>{email}</strong> : "your email address"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground text-center space-y-2">
          <p>
            Click the link in the email to verify your account. 
            If you don't see the email, check your spam folder.
          </p>
          <p>
            The verification link will expire in 24 hours for security reasons.
          </p>
        </div>

        {/* Error Message */}
        {error && !token && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        
        <Button
          onClick={handleResend}
          disabled={isLoading || resendCooldown > 0}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend verification email
            </>
          )}
        </Button>
        
        <div className="text-center space-y-2">
          <Link
            href="/login"
            className="block text-sm text-primary hover:underline"
          >
            Back to sign in
          </Link>
          <p className="text-xs text-muted-foreground">
            Wrong email address?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up again
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}