"use client";

import * as React from "react";
import {
  AlertCircle,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Info,
} from "lucide-react";
import Image from "next/image";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface BugSubmissionWizardProps {
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

const STEPS = [
  { id: 1, name: "Basic Info", description: "What's the bug?" },
  {
    id: 2,
    name: "Priority & Tags",
    description: "How severe is it?",
  },
  {
    id: 3,
    name: "Environment",
    description: "Where did it happen?",
  },
  {
    id: 4,
    name: "Screenshots",
    description: "Visual evidence",
  },
];

const priorityOptions = [
  {
    value: "low" as const,
    label: "Low",
    icon: "○",
    description: "Minor issue that doesn't affect core functionality",
    color: "bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300",
    selectedColor: "border-gray-500 bg-gray-50 dark:border-gray-400 dark:bg-gray-900",
  },
  {
    value: "medium" as const,
    label: "Medium",
    icon: "◐",
    description: "Issue affects functionality but has workarounds",
    color: "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950 dark:border-orange-600 dark:text-orange-300",
    selectedColor: "border-orange-500 bg-orange-100 dark:border-orange-400 dark:bg-orange-900",
  },
  {
    value: "high" as const,
    label: "High",
    icon: "●",
    description: "Major issue that significantly impacts functionality",
    color: "bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-600 dark:text-red-300",
    selectedColor: "border-red-500 bg-red-100 dark:border-red-400 dark:bg-red-900",
  },
  {
    value: "critical" as const,
    label: "Critical",
    icon: "⚠️",
    description: "Severe issue that makes the app unusable or causes data loss",
    color: "bg-red-100 border-red-400 text-red-800 dark:bg-red-900 dark:border-red-500 dark:text-red-200",
    selectedColor: "border-red-600 bg-red-200 dark:border-red-300 dark:bg-red-800",
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
  "Network",
];

const deviceTypeOptions = [
  "Desktop",
  "Mobile",
  "Tablet",
  "Smart TV",
  "Wearable",
  "Other",
];

export const BugSubmissionWizard: React.FC<BugSubmissionWizardProps> = ({
  onSubmit,
  isLoading = false,
  error,
  success = false,
}) => {
  const [currentStep, setCurrentStep] = React.useState(1);
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

  // Auto-detect environment on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const detectedOS = detectOS();
      const detectedBrowser = detectBrowser();
      setFormData((prev) => ({
        ...prev,
        operatingSystem: detectedOS,
        browserVersion: detectedBrowser,
      }));
    }
  }, []);

  const detectOS = (): string => {
    const userAgent = window.navigator.userAgent;
    if (userAgent.indexOf("Win") !== -1) return "Windows";
    if (userAgent.indexOf("Mac") !== -1) return "macOS";
    if (userAgent.indexOf("Linux") !== -1) return "Linux";
    if (userAgent.indexOf("Android") !== -1) return "Android";
    if (userAgent.indexOf("iOS") !== -1) return "iOS";
    return "";
  };

  const detectBrowser = (): string => {
    const userAgent = window.navigator.userAgent;
    if (userAgent.indexOf("Chrome") !== -1) return "Chrome";
    if (userAgent.indexOf("Safari") !== -1) return "Safari";
    if (userAgent.indexOf("Firefox") !== -1) return "Firefox";
    if (userAgent.indexOf("Edge") !== -1) return "Edge";
    return "";
  };

  const validateStep = (step: number): boolean => {
    const errors: Partial<Record<keyof BugSubmissionData, string>> = {};

    if (step === 1) {
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
    }

    if (step === 4) {
      if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
        errors.contactEmail = "Please enter a valid email address";
      }

      if (formData.screenshots.length > 5) {
        errors.screenshots = "Maximum 5 screenshots allowed";
      }
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

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !onSubmit) return;

    try {
      await onSubmit(formData);
    } catch (err) {
      // Error handling managed by parent
    }
  };

  const handleInputChange = (field: keyof BugSubmissionData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="text-2xl font-bold">Bug Report Submitted!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for your report. We'll review it and get back to you if
              we need more information.
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Submit Another
              </Button>
              <Button asChild>
                <a href="/bugs">View All Bugs</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <button
                onClick={() => {
                  if (step.id < currentStep) {
                    setCurrentStep(step.id);
                  }
                }}
                disabled={step.id > currentStep}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  step.id === currentStep &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  step.id < currentStep &&
                    "bg-primary text-primary-foreground cursor-pointer hover:ring-4 hover:ring-primary/20",
                  step.id > currentStep &&
                    "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                {step.id < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </button>
              <div className="mt-2 text-center hidden sm:block">
                <p className="text-xs font-medium">{step.name}</p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 transition-colors",
                  step.id < currentStep ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {STEPS[currentStep - 1].name}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Step {currentStep} of {STEPS.length})
            </span>
          </CardTitle>
          <CardDescription>
            {STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Bug Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Brief, descriptive title..."
                  className={cn(fieldErrors.title && "border-destructive")}
                />
                {fieldErrors.title && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.title.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Detailed description of what happened and what you expected to happen..."
                  rows={6}
                  className={cn(
                    "resize-none",
                    fieldErrors.description && "border-destructive",
                  )}
                />
                {fieldErrors.description && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.description.length} characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Application Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.applicationName}
                  onChange={(e) =>
                    handleInputChange("applicationName", e.target.value)
                  }
                  placeholder="e.g., MyApp, Example Software"
                  className={cn(
                    fieldErrors.applicationName && "border-destructive",
                  )}
                />
                {fieldErrors.applicationName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.applicationName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Application URL (Optional)
                </label>
                <Input
                  value={formData.applicationUrl}
                  onChange={(e) =>
                    handleInputChange("applicationUrl", e.target.value)
                  }
                  placeholder="https://example.com"
                  type="url"
                  className={cn(
                    fieldErrors.applicationUrl && "border-destructive",
                  )}
                />
                {fieldErrors.applicationUrl && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.applicationUrl}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Priority & Tags */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  How severe is this issue?{" "}
                  <span className="text-destructive">*</span>
                </label>
                <div className="grid gap-3">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange("priority", option.value)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all hover:shadow-md",
                        option.color,
                        formData.priority === option.value
                          ? option.selectedColor
                          : "hover:border-border",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl" aria-hidden="true">
                          {option.icon}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-90 mt-1">
                            {option.description}
                          </div>
                        </div>
                        {formData.priority === option.value && (
                          <Check className="h-5 w-5 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Tags (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2",
                        formData.tags.includes(tag)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50",
                      )}
                    >
                      {tag}
                      {formData.tags.includes(tag) && (
                        <Check className="inline-block h-3 w-3 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.tags.length} tag{formData.tags.length !== 1 && "s"}{" "}
                  selected
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Environment Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We've auto-detected some values for you. Feel free to adjust
                  them if needed.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Operating System</label>
                <Input
                  value={formData.operatingSystem}
                  onChange={(e) =>
                    handleInputChange("operatingSystem", e.target.value)
                  }
                  placeholder="e.g., Windows 11, macOS 14"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Device Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {deviceTypeOptions.map((device) => (
                    <button
                      key={device}
                      type="button"
                      onClick={() => handleInputChange("deviceType", device)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                        formData.deviceType === device
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50",
                      )}
                    >
                      {device}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">App Version</label>
                <Input
                  value={formData.appVersion}
                  onChange={(e) =>
                    handleInputChange("appVersion", e.target.value)
                  }
                  placeholder="e.g., 2.3.1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Browser (if web app)
                </label>
                <Input
                  value={formData.browserVersion}
                  onChange={(e) =>
                    handleInputChange("browserVersion", e.target.value)
                  }
                  placeholder="e.g., Chrome 120"
                />
              </div>
            </div>
          )}

          {/* Step 4: Screenshots & Contact */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Screenshots (Optional, max 5)
                </label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-accent/50",
                    dragActive && "border-primary bg-accent",
                    fieldErrors.screenshots && "border-destructive",
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Drag & drop images here
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 5MB each
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
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.screenshots}
                  </p>
                )}

                {formData.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formData.screenshots.map((file, index) => (
                      <div
                        key={index}
                        className="relative group aspect-video rounded-lg border overflow-hidden"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-xs text-white truncate">
                            {file.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Contact Email (Optional)
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    handleInputChange("contactEmail", e.target.value)
                  }
                  placeholder="your@email.com"
                  className={cn(fieldErrors.contactEmail && "border-destructive")}
                />
                {fieldErrors.contactEmail && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.contactEmail}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Allow companies to contact you about this bug
                </p>
              </div>
            </div>
          )}

          {/* Global Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>

        {/* Navigation */}
        <div className="border-t p-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={isLoading}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Report
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
