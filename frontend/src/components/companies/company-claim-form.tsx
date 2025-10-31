"use client"

import * as React from "react"
import { Building2, Mail, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading"

interface CompanyClaimFormProps {
  company?: Company
  onSubmit?: (data: CompanyClaimData) => Promise<void>
  isLoading?: boolean
  error?: string
  success?: boolean
}

export interface Company {
  id: string
  name: string
  domain: string
  isVerified: boolean
  bugCount: number
  createdAt: string
  applications: {
    id: string
    name: string
    bugCount: number
  }[]
}

export interface CompanyClaimData {
  companyId: string
  workEmail: string
  position: string
  reason: string
}

export const CompanyClaimForm: React.FC<CompanyClaimFormProps> = ({
  company,
  onSubmit,
  isLoading = false,
  error,
  success = false
}) => {
  const [formData, setFormData] = React.useState<CompanyClaimData>({
    companyId: company?.id || "",
    workEmail: "",
    position: "",
    reason: ""
  })
  const [fieldErrors, setFieldErrors] = React.useState<Partial<CompanyClaimData>>({})

  React.useEffect(() => {
    if (company) {
      setFormData(prev => ({ ...prev, companyId: company.id }))
    }
  }, [company])

  const validateForm = (): boolean => {
    const errors: Partial<CompanyClaimData> = {}
    
    if (!formData.workEmail) {
      errors.workEmail = "Work email is required"
    } else if (!isValidEmail(formData.workEmail)) {
      errors.workEmail = "Please enter a valid email address"
    } else if (company && !formData.workEmail.endsWith(`@${company.domain}`)) {
      errors.workEmail = `Email must be from ${company.domain} domain`
    }
    
    if (!formData.position.trim()) {
      errors.position = "Position is required"
    }
    
    if (!formData.reason.trim()) {
      errors.reason = "Reason is required"
    } else if (formData.reason.trim().length < 20) {
      errors.reason = "Please provide more details (at least 20 characters)"
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isValidEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !onSubmit) return
    
    try {
      await onSubmit(formData)
    } catch (err) {
      // Error handling is managed by parent component
    }
  }

  const handleInputChange = (field: keyof CompanyClaimData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Claim request submitted!</CardTitle>
          <CardDescription>
            Your company claim request has been submitted successfully.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center space-y-2">
            <p>
              We've sent a verification email to <strong>{formData.workEmail}</strong>
            </p>
            <p>
              Click the link in the email to verify your ownership of {company?.name}.
              The verification link will expire in 24 hours.
            </p>
            <p>
              Once verified, you'll be able to manage bug reports for your company's applications.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="flex-1">
              <a href="/companies">Browse Companies</a>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!company) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Company not found</CardTitle>
          <CardDescription>
            The company you're trying to claim doesn't exist or has been removed.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Button asChild className="w-full">
            <a href="/companies">Browse Companies</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Company Information</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-lg">{company.name}</h3>
              <p className="text-muted-foreground">Domain: {company.domain}</p>
              <p className="text-sm text-muted-foreground">
                {company.bugCount} bug reports • {company.applications.length} applications
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Applications</h4>
              <div className="space-y-1">
                {company.applications.slice(0, 3).map((app) => (
                  <div key={app.id} className="flex justify-between text-sm">
                    <span>{app.name}</span>
                    <span className="text-muted-foreground">{app.bugCount} bugs</span>
                  </div>
                ))}
                {company.applications.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{company.applications.length - 3} more applications
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {company.isVerified && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Already Verified</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                This company has already been claimed and verified by another user.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Form */}
      {!company.isVerified && (
        <Card>
          <CardHeader>
            <CardTitle>Claim Company Ownership</CardTitle>
            <CardDescription>
              To claim ownership of {company.name}, you'll need to verify your email address 
              using your company domain ({company.domain}).
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="workEmail" className="text-sm font-medium">
                  Work Email Address *
                </label>
                <Input
                  id="workEmail"
                  type="email"
                  placeholder={`your.name@${company.domain}`}
                  value={formData.workEmail}
                  onChange={(e) => handleInputChange("workEmail", e.target.value)}
                  disabled={isLoading}
                  className={fieldErrors.workEmail ? "border-destructive" : ""}
                />
                {fieldErrors.workEmail && (
                  <p className="text-sm text-destructive">{fieldErrors.workEmail}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Must be an email address from the {company.domain} domain
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="position" className="text-sm font-medium">
                  Your Position *
                </label>
                <Input
                  id="position"
                  placeholder="e.g. Software Engineer, Product Manager, CTO"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  disabled={isLoading}
                  className={fieldErrors.position ? "border-destructive" : ""}
                />
                {fieldErrors.position && (
                  <p className="text-sm text-destructive">{fieldErrors.position}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium">
                  Reason for Claiming *
                </label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you want to claim this company and how you plan to manage bug reports..."
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  disabled={isLoading}
                  rows={4}
                  className={fieldErrors.reason ? "border-destructive" : ""}
                />
                {fieldErrors.reason && (
                  <p className="text-sm text-destructive">{fieldErrors.reason}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.reason.length}/500 characters
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>1. We'll send a verification email to your work address</li>
                  <li>2. Click the verification link to confirm your identity</li>
                  <li>3. Once verified, you can manage bug reports for {company.name}</li>
                  <li>4. You can add team members and respond to bug reports</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting claim...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Submit Claim Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}