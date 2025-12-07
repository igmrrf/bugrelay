"use client";

import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading";
import { ErrorMessage } from "@/components/ui/error-boundary";
import { useCompany } from "@/lib/hooks/use-company-queries";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Settings, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Extended company interface for settings
interface CompanyWithSettings {
  id: string;
  name: string;
  domain: string;
  isVerified: boolean;
  members: Array<{
    id: string;
    role: "admin" | "member";
    user: {
      email: string;
    };
  }>;
  description?: string;
  website?: string;
  supportEmail?: string;
  publicProfile?: boolean;
  autoRespond?: boolean;
  responseTemplate?: string;
}

export default function CompanySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const companyId = params.id as string;

  const { data: company, isLoading, error } = useCompany(companyId);

  // Check if user is an admin of this company
  const userMember = company?.members?.find(
    (member) => member.user.email === user?.email,
  );
  const isCompanyAdmin = userMember?.role === "admin";

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    supportEmail: "",
    publicProfile: true,
    autoRespond: false,
    responseTemplate: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when company loads
  useEffect(() => {
    if (company) {
      const extendedCompany = company as CompanyWithSettings;
      setFormData({
        name: extendedCompany.name || "",
        description: extendedCompany.description || "",
        website: extendedCompany.website || "",
        supportEmail: extendedCompany.supportEmail || "",
        publicProfile: extendedCompany.publicProfile ?? true,
        autoRespond: extendedCompany.autoRespond ?? false,
        responseTemplate: extendedCompany.responseTemplate || "",
      });
    }
  }, [company]);

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!isLoading && company) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=/companies/${companyId}/settings`);
        return;
      }

      if (!isCompanyAdmin) {
        router.push(`/companies/${companyId}`);
        return;
      }
    }
  }, [isLoading, company, isAuthenticated, isCompanyAdmin, router, companyId]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save functionality with API call
      // await companiesAPI.updateSettings(companyId, formData)
      console.info("Saving settings:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show success message or redirect
      router.push(`/companies/${companyId}`);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState message="Loading company settings..." />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Failed to load settings"
            message={typeof error === "string" ? error : "An error occurred"}
            action={{
              label: "Back to company",
              onClick: () => router.push(`/companies/${companyId}`),
            }}
          />
        </div>
      </MainLayout>
    );
  }

  if (!company) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Company not found"
            message="The company settings you're looking for don't exist."
            action={{
              label: "Browse companies",
              onClick: () => router.push("/companies"),
            }}
          />
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated || !isCompanyAdmin) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Access denied"
            message="You don't have permission to manage this company's settings. Only company admins can access settings."
            action={{
              label: "View company profile",
              onClick: () => router.push(`/companies/${companyId}`),
            }}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/companies/${companyId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Company
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Settings className="h-8 w-8" />
              <span>Company Settings</span>
            </h1>
            <p className="text-muted-foreground">
              Manage {company.name}'s profile and bug report settings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your company's basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Company Name
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter company name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Brief description of your company"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium">
                  Website
                </label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="supportEmail" className="text-sm font-medium">
                  Support Email
                </label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) =>
                    handleInputChange("supportEmail", e.target.value)
                  }
                  placeholder="support@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  This email will be shown to users for direct support contact
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Visibility</CardTitle>
              <CardDescription>
                Control how your company appears to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Public Profile</label>
                  <p className="text-xs text-muted-foreground">
                    Allow users to view your company profile and statistics
                  </p>
                </div>
                <Switch
                  checked={formData.publicProfile}
                  onCheckedChange={(checked: boolean) =>
                    handleInputChange("publicProfile", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Bug Report Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Bug Report Management</CardTitle>
              <CardDescription>
                Configure how bug reports are handled for your company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">
                    Auto-respond to new bugs
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Automatically send a response when new bugs are reported
                  </p>
                </div>
                <Switch
                  checked={formData.autoRespond}
                  onCheckedChange={(checked: boolean) =>
                    handleInputChange("autoRespond", checked)
                  }
                />
              </div>

              {formData.autoRespond && (
                <div className="space-y-2">
                  <label
                    htmlFor="responseTemplate"
                    className="text-sm font-medium"
                  >
                    Auto-response Template
                  </label>
                  <Textarea
                    id="responseTemplate"
                    value={formData.responseTemplate}
                    onChange={(e) =>
                      handleInputChange("responseTemplate", e.target.value)
                    }
                    placeholder="Thank you for reporting this bug. We'll investigate and get back to you soon."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be automatically posted as a comment on
                    new bug reports
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" asChild>
              <Link href={`/companies/${companyId}`}>Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

