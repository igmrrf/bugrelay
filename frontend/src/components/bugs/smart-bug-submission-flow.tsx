"use client";

import * as React from "react";
import {
  Search,
  AlertCircle,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Info,
  Shield,
  FileText,
  ThumbsUp,
  Eye,
  Building2,
  Loader2,
  Plus,
  Minus,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

// Types
interface SmartBugSubmissionFlowProps {
  onSubmit?: (data: BugReportData) => Promise<void>;
  onSearchDuplicates?: (query: string) => Promise<DuplicateBug[]>;
  onVoteExisting?: (bugId: string) => Promise<void>;
  onSearchCompanies?: (query: string) => Promise<
    Array<{
      id: string;
      name: string;
      isVerified: boolean;
      logoUrl?: string;
    }>
  >;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

export interface BugReportData {
  companyId: string;
  companyName: string;
  category: "functional" | "security";
  title: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: "low" | "medium" | "critical";
  tags: string[];
  screenshots: File[];
  context: EnvironmentContext;
  agreeToCodeOfConduct: boolean;
}

export interface EnvironmentContext {
  osVersion?: string;
  browserVersion?: string;
  deviceModel?: string;
  screenResolution?: string;
  appVersion?: string;
  autoDetected: boolean;
}

export interface DuplicateBug {
  id: string;
  title: string;
  description: string;
  status: "open" | "reviewing" | "fixed" | "wont_fix";
  voteCount: number;
  matchScore: number;
  createdAt: string;
}

// Stages
type FlowStage =
  | "company-selection"
  | "duplicate-search"
  | "category-selection"
  | "report-form"
  | "review-submit";

export const SmartBugSubmissionFlow: React.FC<SmartBugSubmissionFlowProps> = ({
  onSubmit,
  onSearchDuplicates,
  onVoteExisting,
  onSearchCompanies,
  isLoading = false,
  error,
  success = false,
}) => {
  // Stage management
  const [stage, setStage] = React.useState<FlowStage>("company-selection");

  // Company selection
  const [companySearch, setCompanySearch] = React.useState("");
  const [selectedCompany, setSelectedCompany] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [companyResults, setCompanyResults] = React.useState<
    Array<{
      id: string;
      name: string;
      isVerified: boolean;
      logoUrl?: string;
    }>
  >([]);
  const [searchingCompanies, setSearchingCompanies] = React.useState(false);

  // Duplicate search
  const [duplicateQuery, setDuplicateQuery] = React.useState("");
  const [duplicates, setDuplicates] = React.useState<DuplicateBug[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = React.useState(false);
  const [showDuplicates, setShowDuplicates] = React.useState(false);

  // Form data
  const [category, setCategory] = React.useState<"functional" | "security">(
    "functional",
  );
  const [formData, setFormData] = React.useState<BugReportData>({
    companyId: "",
    companyName: "",
    category: "functional",
    title: "",
    stepsToReproduce: [""],
    expectedResult: "",
    actualResult: "",
    severity: "medium",
    tags: [],
    screenshots: [],
    context: {
      autoDetected: false,
    },
    agreeToCodeOfConduct: false,
  });

  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<keyof BugReportData, string>>
  >({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  // Auto-detect environment on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const context = detectEnvironment();
      setFormData((prev) => ({ ...prev, context }));
    }
  }, []);

  const detectEnvironment = (): EnvironmentContext => {
    const userAgent = window.navigator.userAgent;
    const screenRes = `${window.screen.width}x${window.screen.height}`;

    let os = "";
    if (userAgent.indexOf("Win") !== -1) os = "Windows";
    else if (userAgent.indexOf("Mac") !== -1) os = "macOS";
    else if (userAgent.indexOf("Linux") !== -1) os = "Linux";
    else if (userAgent.indexOf("Android") !== -1) os = "Android";
    else if (userAgent.indexOf("iOS") !== -1) os = "iOS";

    let browser = "";
    if (userAgent.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (userAgent.indexOf("Safari") !== -1) browser = "Safari";
    else if (userAgent.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (userAgent.indexOf("Edge") !== -1) browser = "Edge";

    return {
      osVersion: os,
      browserVersion: browser,
      deviceModel: navigator.platform,
      screenResolution: screenRes,
      autoDetected: true,
    };
  };

  // Search for duplicates
  const handleSearchDuplicates = async () => {
    if (!duplicateQuery.trim() || !onSearchDuplicates) return;

    setSearchingDuplicates(true);
    try {
      const results = await onSearchDuplicates(duplicateQuery);
      setDuplicates(results);
      setShowDuplicates(results.length > 0);
    } catch (err) {
      console.error("Failed to search duplicates:", err);
    } finally {
      setSearchingDuplicates(false);
    }
  };

  // Search for companies
  const handleSearchCompanies = async (query: string) => {
    if (!query.trim() || !onSearchCompanies) {
      setCompanyResults([]);
      return;
    }

    setSearchingCompanies(true);
    try {
      const results = await onSearchCompanies(query);
      setCompanyResults(results);
    } catch (err) {
      console.error("Failed to search companies:", err);
      setCompanyResults([]);
    } finally {
      setSearchingCompanies(false);
    }
  };

  // Debounce company search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchCompanies(companySearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [companySearch]);

  // Vote on existing bug
  const handleVoteExisting = async (bugId: string) => {
    if (!onVoteExisting) return;
    try {
      await onVoteExisting(bugId);
      // Show success message
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  // Form handlers
  const handleAddStep = () => {
    setFormData((prev) => ({
      ...prev,
      stepsToReproduce: [...prev.stepsToReproduce, ""],
    }));
  };

  const handleRemoveStep = (index: number) => {
    if (formData.stepsToReproduce.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      stepsToReproduce: prev.stepsToReproduce.filter((_, i) => i !== index),
    }));
  };

  const handleStepChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      stepsToReproduce: prev.stepsToReproduce.map((step, i) =>
        i === index ? value : step,
      ),
    }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        return false;
      }
      return true;
    });

    const newScreenshots = [...formData.screenshots, ...validFiles].slice(0, 5);
    setFormData((prev) => ({ ...prev, screenshots: newScreenshots }));
  };

  const removeScreenshot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
    }));
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

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof BugReportData, string>> = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (formData.stepsToReproduce.filter((s) => s.trim()).length === 0) {
      errors.stepsToReproduce = "At least one step is required";
    }

    if (!formData.expectedResult.trim()) {
      errors.expectedResult = "Expected result is required";
    }

    if (!formData.actualResult.trim()) {
      errors.actualResult = "Actual result is required";
    }

    if (!formData.agreeToCodeOfConduct) {
      errors.agreeToCodeOfConduct = "You must agree to the Code of Conduct";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !onSubmit) return;

    try {
      await onSubmit(formData);
    } catch (err) {
      // Error handled by parent
    }
  };

  // Success state
  if (success) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="text-2xl font-bold">Bug Report Submitted!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for your detailed report. We'll notify you of any
              updates.
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              stage === "company-selection" ? "bg-primary" : "bg-muted",
            )}
          />
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              stage === "duplicate-search" ? "bg-primary" : "bg-muted",
            )}
          />
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              stage === "category-selection" ? "bg-primary" : "bg-muted",
            )}
          />
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              stage === "report-form" ? "bg-primary" : "bg-muted",
            )}
          />
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              stage === "review-submit" ? "bg-primary" : "bg-muted",
            )}
          />
        </div>
      </div>

      {/* Stage 1: Company Selection */}
      {stage === "company-selection" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Company or Product</CardTitle>
            <CardDescription>
              Which company's product are you reporting an issue for?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search for company</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="e.g., Spotify, Netflix, Amazon..."
                  className="pl-10"
                />
                {searchingCompanies && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Company search results */}
            {companySearch && companyResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Select a company:
                </p>
                <div className="space-y-2">
                  {companyResults.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => {
                        setSelectedCompany({
                          id: company.id,
                          name: company.name,
                        });
                        setFormData((prev) => ({
                          ...prev,
                          companyId: company.id,
                          companyName: company.name,
                        }));
                      }}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all hover:border-primary",
                        selectedCompany?.id === company.id &&
                          "border-primary bg-accent",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5" />
                        <div className="flex-1">
                          <span className="font-medium">{company.name}</span>
                          {company.isVerified && (
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {companySearch &&
              !searchingCompanies &&
              companyResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No companies found. Try a different search term.
                </p>
              )}

            <Button
              className="w-full"
              disabled={!selectedCompany}
              onClick={() => setStage("duplicate-search")}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stage 2: Duplicate Search (The Gatekeeper) */}
      {stage === "duplicate-search" && (
        <Card>
          <CardHeader>
            <CardTitle>Describe the Issue</CardTitle>
            <CardDescription>
              Let's check if this issue has already been reported
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">What's the problem?</label>
              <Textarea
                value={duplicateQuery}
                onChange={(e) => setDuplicateQuery(e.target.value)}
                placeholder="e.g., Login fails on iOS after update..."
                rows={3}
                className="resize-none"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSearchDuplicates}
              disabled={!duplicateQuery.trim() || searchingDuplicates}
            >
              {searchingDuplicates ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search for Similar Issues
                </>
              )}
            </Button>

            {/* Duplicate Results */}
            {showDuplicates && duplicates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    We found {duplicates.length} similar issue
                    {duplicates.length !== 1 && "s"}. Is one of these your
                    issue?
                  </p>
                </div>

                <div className="space-y-2">
                  {duplicates.map((bug) => (
                    <Card
                      key={bug.id}
                      className="hover:border-primary/50 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <StatusBadge status={bug.status} showIcon />
                              <span className="text-xs text-muted-foreground">
                                {Math.round(bug.matchScore * 100)}% match
                              </span>
                            </div>
                            <h4 className="font-semibold mb-1">{bug.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {bug.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                {bug.voteCount} votes
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleVoteExisting(bug.id)}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />I have this too
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* No duplicates or user wants to continue */}
            {showDuplicates && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStage("company-selection")}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      title: duplicateQuery,
                    }));
                    setStage("category-selection");
                  }}
                  className="flex-1"
                >
                  Create New Report
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stage 3: Category Selection */}
      {stage === "category-selection" && (
        <Card>
          <CardHeader>
            <CardTitle>What Type of Issue Is This?</CardTitle>
            <CardDescription>
              This helps us route your report to the right team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <button
                onClick={() => {
                  setCategory("functional");
                  setFormData((prev) => ({ ...prev, category: "functional" }));
                }}
                className={cn(
                  "p-6 rounded-lg border-2 text-left transition-all hover:shadow-md",
                  category === "functional"
                    ? "border-primary bg-accent"
                    : "border-border",
                )}
              >
                <div className="flex items-start gap-4">
                  <FileText className="h-8 w-8 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      Functional / UI Issue
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Features not working, visual bugs, performance issues, or
                      general functionality problems. This will be publicly
                      visible.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Public report
                      </span>
                    </div>
                  </div>
                  {category === "functional" && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setCategory("security");
                  setFormData((prev) => ({ ...prev, category: "security" }));
                }}
                className={cn(
                  "p-6 rounded-lg border-2 text-left transition-all hover:shadow-md",
                  category === "security"
                    ? "border-primary bg-accent"
                    : "border-border",
                )}
              >
                <div className="flex items-start gap-4">
                  <Shield className="h-8 w-8 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      Security Vulnerability
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Security issues, data leaks, or exploitable
                      vulnerabilities. This will be kept private and encrypted.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Private & encrypted
                      </span>
                    </div>
                  </div>
                  {category === "security" && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStage("duplicate-search")}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStage("report-form")}
                className="flex-1"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage 4: Report Form */}
      {stage === "report-form" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {category === "security" ? "Security Report" : "Bug Report"}{" "}
              Details
            </CardTitle>
            <CardDescription>
              Provide detailed information to help us reproduce and fix the
              issue
            </CardDescription>
            {formData.context.autoDetected && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg mt-4">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Auto-detected context:</p>
                  <p>
                    {formData.context.osVersion} ·{" "}
                    {formData.context.browserVersion} ·{" "}
                    {formData.context.screenResolution}
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Issue Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Brief, descriptive title..."
                className={cn(fieldErrors.title && "border-destructive")}
              />
              {fieldErrors.title && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.title}
                </p>
              )}
            </div>

            {/* Steps to Reproduce */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Steps to Reproduce <span className="text-destructive">*</span>
              </label>
              {formData.stepsToReproduce.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center font-medium text-sm text-muted-foreground">
                    {index + 1}.
                  </div>
                  <Input
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    placeholder={`Step ${index + 1}...`}
                    className="flex-1"
                  />
                  {formData.stepsToReproduce.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStep(index)}
                      className="flex-shrink-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddStep}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
              {fieldErrors.stepsToReproduce && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.stepsToReproduce}
                </p>
              )}
            </div>

            {/* Expected vs Actual */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Expected Result <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.expectedResult}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expectedResult: e.target.value,
                    }))
                  }
                  placeholder="What should happen..."
                  rows={4}
                  className={cn(
                    "resize-none",
                    fieldErrors.expectedResult && "border-destructive",
                  )}
                />
                {fieldErrors.expectedResult && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.expectedResult}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Actual Result <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.actualResult}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      actualResult: e.target.value,
                    }))
                  }
                  placeholder="What actually happens..."
                  rows={4}
                  className={cn(
                    "resize-none",
                    fieldErrors.actualResult && "border-destructive",
                  )}
                />
                {fieldErrors.actualResult && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.actualResult}
                  </p>
                )}
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Severity <span className="text-destructive">*</span>
              </label>
              <div className="grid gap-3">
                {[
                  {
                    value: "low" as const,
                    label: "Low",
                    desc: "Minor inconvenience",
                  },
                  {
                    value: "medium" as const,
                    label: "Medium",
                    desc: "Noticeable impact",
                  },
                  {
                    value: "critical" as const,
                    label: "Critical",
                    desc: "Severe or blocking",
                  },
                ].map((sev) => (
                  <button
                    key={sev.value}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, severity: sev.value }))
                    }
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      formData.severity === sev.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{sev.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {sev.desc}
                        </div>
                      </div>
                      {formData.severity === sev.value && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Screenshots or Videos (Optional)
              </label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-accent/50",
                  dragActive && "border-primary bg-accent",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Drag & drop evidence here
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Images or videos up to 10MB each (max 5 files)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>

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

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStage("category-selection")}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStage("review-submit")}
                className="flex-1"
              >
                Review & Submit
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage 5: Review & Submit */}
      {stage === "review-submit" && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Report</CardTitle>
            <CardDescription>
              Please review and agree to our Code of Conduct before submitting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <span className="text-xs text-muted-foreground">Company</span>
                <p className="font-medium">{formData.companyName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Category</span>
                <p className="font-medium capitalize">{formData.category}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Title</span>
                <p className="font-medium">{formData.title}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Severity</span>
                <p className="font-medium capitalize">{formData.severity}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Steps to Reproduce
                </span>
                <ol className="list-decimal list-inside space-y-1">
                  {formData.stepsToReproduce
                    .filter((s) => s.trim())
                    .map((step, i) => (
                      <li key={i} className="text-sm">
                        {step}
                      </li>
                    ))}
                </ol>
              </div>
              {formData.screenshots.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Evidence
                  </span>
                  <p className="text-sm">
                    {formData.screenshots.length} file
                    {formData.screenshots.length !== 1 && "s"} attached
                  </p>
                </div>
              )}
            </div>

            {/* Code of Conduct */}
            <div className="space-y-3 p-4 border-2 rounded-lg">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Code of Conduct
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>I will provide accurate and honest information</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>I will not use abusive or offensive language</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>I will respect the company and other users</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    I understand this is a public report and will not include
                    sensitive personal information
                  </span>
                </li>
              </ul>
              <label className="flex items-start gap-3 p-3 bg-muted/50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToCodeOfConduct}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      agreeToCodeOfConduct: e.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                <span className="text-sm">
                  I agree to the Code of Conduct and certify that my report is
                  accurate
                </span>
              </label>
              {fieldErrors.agreeToCodeOfConduct && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.agreeToCodeOfConduct}
                </p>
              )}
            </div>

            {/* Global Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStage("report-form")}
                disabled={isLoading}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !formData.agreeToCodeOfConduct}
                className="flex-1"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Report
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
