"use client";

import { MainLayout } from "@/components/layout";
import { BugList, type Bug } from "@/components/bugs/bug-list";
import { useInfiniteBugs, useVoteBug } from "@/lib/hooks";
import { useBugStore } from "@/lib/stores";
import { type SearchFilters as SearchFiltersType } from "@/components/ui/search-filters";

export default function BugsPage() {
  const { filters, setFilters } = useBugStore();

  const { data, isLoading, error, fetchNextPage, hasNextPage } =
    useInfiniteBugs(filters);

  const { mutate: voteBug } = useVoteBug();

  const bugs = data?.pages.flatMap((page) => page.bugs) || [];
  console.log({ bugssss: bugs });

  // Map BugReport to Bug interface
  const mappedBugs: Bug[] = bugs.map((bug) => ({
    id: bug.id,
    title: bug.title,
    description: bug.description,
    status: bug.status,
    priority: bug.priority,
    tags: bug.tags,
    voteCount: bug.voteCount,
    commentCount: bug.commentCount,
    createdAt: bug.createdAt,
    application: {
      name: bug.application.name,
      company: bug.application.company
        ? {
            name: bug.application.company.name,
            isVerified: bug.application.company.isVerified,
          }
        : undefined,
    },
    reporter: bug.reporter
      ? {
          name: bug.reporter.displayName,
          avatar: bug.reporter.avatarUrl,
        }
      : undefined,
  }));

  const handleSearch = (searchFilters: SearchFiltersType) => {
    setFilters({
      search: searchFilters.query,
      status: searchFilters.status,
      priority: searchFilters.priority,
      tags: searchFilters.tags,
      sortBy: searchFilters.sortBy,
    });
  };

  const votedBugs = new Set(
    bugs.filter((b) => b.hasUserVoted).map((b) => b.id),
  );

  const totalCount = data?.pages[0]?.totalCount;

  return (
    <MainLayout>
      <div className="container py-8">
        <BugList
          bugs={mappedBugs}
          isLoading={isLoading}
          error={error ? (error as Error).message : undefined}
          onSearch={handleSearch}
          onVote={(id) => voteBug(id)}
          onLoadMore={() => fetchNextPage()}
          hasMore={hasNextPage}
          votedBugs={votedBugs}
          totalCount={totalCount}
        />
      </div>
    </MainLayout>
  );
}
