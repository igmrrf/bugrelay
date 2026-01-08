"use client";

import { MainLayout } from "@/components/layout";
import { SmartBugSubmissionFlow } from "@/components/bugs/smart-bug-submission-flow";
import {
  useCreateBug,
  useSearchDuplicates,
  useVoteBug,
  useSearchCompanies,
} from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  BugReportData,
  DuplicateBug,
} from "@/components/bugs/smart-bug-submission-flow";

export default function SubmitBugPage() {
  const router = useRouter();
  const createBugMutation = useCreateBug();
  const searchDuplicatesMutation = useSearchDuplicates();
  const voteBugMutation = useVoteBug();
  const searchCompaniesMutation = useSearchCompanies();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (data: BugReportData) => {
    try {
      const bugData = {
        title: data.title,
        description: `${data.title}\n\n## Steps to Reproduce\n${data.stepsToReproduce
          .filter((s) => s.trim())
          .map((step, i) => `${i + 1}. ${step}`)
          .join(
            "\n",
          )}\n\n## Expected Result\n${data.expectedResult}\n\n## Actual Result\n${data.actualResult}`,
        applicationName: data.companyName,
        applicationUrl: undefined,
        priority: data.severity,
        tags:
          data.category === "security"
            ? ["Security", ...data.tags]
            : data.tags || [],
        operatingSystem: data.context.osVersion,
        deviceType: data.context.deviceModel,
        appVersion: data.context.appVersion,
        browserVersion: data.context.browserVersion,
        contactEmail: undefined,
        screenshots: data.screenshots,
      };

      const result = await createBugMutation.mutateAsync(bugData);
      setIsSuccess(true);

      // Redirect to the bug detail page after a short delay
      setTimeout(() => {
        router.push(`/bugs/${result.id}`);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit bug:", error);
    }
  };

  const handleSearchDuplicates = async (
    query: string,
  ): Promise<DuplicateBug[]> => {
    try {
      const results = await searchDuplicatesMutation.mutateAsync(query);
      return results || [];
    } catch (error) {
      console.error("Failed to search duplicates:", error);
      return [];
    }
  };

  const handleVoteExisting = async (bugId: string): Promise<void> => {
    try {
      await voteBugMutation.mutateAsync(bugId);
      // Redirect to the bug detail page
      router.push(`/bugs/${bugId}`);
    } catch (error) {
      console.error("Failed to vote on bug:", error);
      throw error;
    }
  };

  const handleSearchCompanies = async (
    query: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      isVerified: boolean;
      logoUrl?: string;
    }>
  > => {
    if (!query.trim()) return [];

    try {
      const results = await searchCompaniesMutation.mutateAsync(query);
      return results || [];
    } catch (error) {
      console.error("Failed to search companies:", error);
      // Return mock data as fallback for demo
      return [
        { id: "1", name: "Spotify", isVerified: true },
        { id: "2", name: "Netflix", isVerified: true },
        { id: "3", name: "Amazon", isVerified: true },
      ].filter((company) =>
        company.name.toLowerCase().includes(query.toLowerCase()),
      );
    }
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Report an Issue</h1>
          <p className="text-muted-foreground">
            Help us improve by reporting bugs and issues you encounter. We'll
            check for similar reports to avoid duplicates.
          </p>
        </div>

        <SmartBugSubmissionFlow
          onSubmit={handleSubmit}
          onSearchDuplicates={handleSearchDuplicates}
          onVoteExisting={handleVoteExisting}
          onSearchCompanies={handleSearchCompanies}
          isLoading={createBugMutation.isPending}
          error={createBugMutation.error?.message}
          success={isSuccess}
        />
      </div>
    </MainLayout>
  );
}
