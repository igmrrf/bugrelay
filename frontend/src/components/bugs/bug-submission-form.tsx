"use client";

import { AlertCircle, Upload, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface BugSubmissionFormProps {
  onSubmit?: (data: BugSubmissionData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

export interface BugSubmissionData {
  title: string;
  description: string;
  applicationName: string;
  applicationUrl?: string;
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  operatingSystem?: string;
  deviceType?: string;
  appVersion?: string;
  browserVersion?: string;
  screenshots: File[];
  contactEmail?: string;
}

const priorityOptions = [
  {
    value: "low",
    label: "Low",
    description: "Minor issue that doesn't affect core functionality",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Issue affects functionality but has workarounds",
  },
  {
    value: "high",
    label: "High",
    description: "Major issue that significantly impacts functionality",
  },
  {
    value: "critical",
    label: "Critical",
    description: "Severe issue that makes the app unusable",
  },
];

const tagOptions = [
  "UI",
  "Crash",
  "Performance",
  "Security",
  "Accessibility",
  "Mobile",
  "Desktop",
  "Web",
  "Data Loss",
  "Login",
  "Payment",
];

const deviceTypeOptions = [
  "Desktop",
  "Mobile",
  "Tablet",
  "Smart TV",
  "Wearable",
  "Other",
];

export const BugSubmissionForm: React.FC<BugSubmissionFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
  success = false,
}) => {
  const [formData, setFormData] = React.useState<BugSubmissionData>({
    title: "",
    description: "",
    applicationName: "",
    applicationUrl: "",
    priority: "medium",
    tags: [],
    operatingSystem: "",
    deviceType: "",
    appVersion: "",
    browserVersion: "",
    screenshots: [],
    contactEmail: "",
  });
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<keyof BugSubmissionData, string>>
  >({});
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof BugSubmissionData, string>> = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    } else if (formData.title.trim().length < 10) {
      errors.title = "Title must be at least 10 characters";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    } else if (formData.description.trim().length < 20) {
      errors.description = "Description must be at least 20 characters";
    }

    if (!formData.applicationName.trim()) {
      errors.applicationName = "Application name is required";
    }

    if (formData.applicationUrl && !isValidUrl(formData.applicationUrl)) {
      errors.applicationUrl = "Please enter a valid URL";
    }

    if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
      errors.contactEmail = "Please enter a valid email address";
    }

    if (formData.screenshots.length > 5) {
      errors.screenshots = "Maximum 5 screenshots allowed";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isValidEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
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

  const handleInputChange = (field: keyof BugSubmissionData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTagToggle = (tag: string) => {
    const newTags = formData.tags.includes(tag)
      ? formData.tags.filter((t) => t !== tag)
      : [...formData.tags, tag];
    handleInputChange("tags", newTags);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        alert(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    const newScreenshots = [...formData.screenshots, ...validFiles].slice(0, 5);
    handleInputChange("screenshots", newScreenshots);
  };

  const removeScreenshot = (index: number) => {
    const newScreenshots = formData.screenshots.filter((_, i) => i !== index);
    handleInputChange("screenshots", newScreenshots);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <AlertCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Bug report submitted!
          </CardTitle>
          <CardDescription>
            Thank you for helping improve software quality. Your bug report has
            been submitted successfully.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center space-y-2">
            <p>
              Your bug report is now public and can be viewed by other users and
              the application's developers.
            </p>
            <p>
              You'll receive email notifications if there are updates to your
              report.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="flex-1">
              <a href="/bugs">View All Bugs</a>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Submit Another Bug
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Submit a Bug Report
        </CardTitle>
        <CardDescription>
          Help improve software quality by reporting bugs you've encountered.
          Provide as much detail as possible to help developers understand and
          fix the issue.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Bug Title *
              </label>
              <Input
                id="title"
                placeholder="Brief, descriptive title of the bug"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                disabled={isLoading}
                className={fieldErrors.title ? "border-destructive" : ""}
              />
              {fieldErrors.title && (
                <p className="text-sm text-destructive">{fieldErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description *
              </label>
              <Textarea
                id="description"
                placeholder="Detailed description of the bug, including steps to reproduce, expected behavior, and actual behavior"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                disabled={isLoading}
                rows={6}
                className={fieldErrors.description ? "border-destructive" : ""}
              />
              {fieldErrors.description && (
                <p className="text-sm text-destructive">
                  {fieldErrors.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/2000 characters
              </p>
            </div>
          </div>

          {/* Application Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Application Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="applicationName"
                  className="text-sm font-medium"
                >
                  Application Name *
                </label>
                <Input
                  id="applicationName"
                  placeholder="e.g. Gmail, Slack, Instagram"
                  value={formData.applicationName}
                  onChange={(e) =>
                    handleInputChange("applicationName", e.target.value)
                  }
                  disabled={isLoading}
                  className={
                    fieldErrors.applicationName ? "border-destructive" : ""
                  }
                />
                {fieldErrors.applicationName && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.applicationName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="applicationUrl" className="text-sm font-medium">
                  Application URL (optional)
                </label>
                <Input
                  id="applicationUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.applicationUrl}
                  onChange={(e) =>
                    handleInputChange("applicationUrl", e.target.value)
                  }
                  disabled={isLoading}
                  className={
                    fieldErrors.applicationUrl ? "border-destructive" : ""
                  }
                />
                {fieldErrors.applicationUrl && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.applicationUrl}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bug Classification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bug Classification</h3>

            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="handle-tag" className="text-sm font-medium">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    id="handle-tag"
                    variant={
                      formData.tags.includes(tag) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleTagToggle(tag)}
                    disabled={isLoading}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Technical Details (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="operatingSystem"
                  className="text-sm font-medium"
                >
                  Operating System
                </label>
                <Input
                  id="operatingSystem"
                  placeholder="e.g. Windows 11, macOS 14, iOS 17"
                  value={formData.operatingSystem}
                  onChange={(e) =>
                    handleInputChange("operatingSystem", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="deviceType" className="text-sm font-medium">
                  Device Type
                </label>
                <Select
                  value={formData.deviceType}
                  onValueChange={(value) =>
                    handleInputChange("deviceType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="appVersion" className="text-sm font-medium">
                  App Version
                </label>
                <Input
                  id="appVersion"
                  placeholder="e.g. 2.1.4, v1.0.0"
                  value={formData.appVersion}
                  onChange={(e) =>
                    handleInputChange("appVersion", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="browserVersion" className="text-sm font-medium">
                  Browser Version (for web apps)
                </label>
                <Input
                  id="browserVersion"
                  placeholder="e.g. Chrome 119, Safari 17"
                  value={formData.browserVersion}
                  onChange={(e) =>
                    handleInputChange("browserVersion", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Screenshots */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Screenshots (Optional)</h3>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              } ${fieldErrors.screenshots ? "border-destructive" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop screenshots here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF up to 10MB each (max 5 files)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {fieldErrors.screenshots && (
              <p className="text-sm text-destructive">
                {fieldErrors.screenshots}
              </p>
            )}

            {/* Screenshot Preview */}
            {formData.screenshots.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.screenshots.map((file, index) => (
                  <div key={file.name} className="relative group">
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeScreenshot(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Contact Information (Optional)
            </h3>

            <div className="space-y-2">
              <label htmlFor="contactEmail" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="your.email@example.com"
                value={formData.contactEmail}
                onChange={(e) =>
                  handleInputChange("contactEmail", e.target.value)
                }
                disabled={isLoading}
                className={fieldErrors.contactEmail ? "border-destructive" : ""}
              />
              {fieldErrors.contactEmail && (
                <p className="text-sm text-destructive">
                  {fieldErrors.contactEmail}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional: Receive updates about this bug report
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" disabled={isLoading}>
              Save as Draft
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Bug Report"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

