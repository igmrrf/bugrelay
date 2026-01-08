"use client";

import * as React from "react";
import { BugCard } from "@/components/ui/bug-card";
import {
  SearchFilters,
  type SearchFilters as SearchFiltersType,
} from "@/components/ui/search-filters";
import { LoadingState } from "@/components/ui/loading";
import { BugCardSkeletonList } from "@/components/ui/bug-card-skeleton";
import { ErrorMessage } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { RefreshCw, Filter, X } from "lucide-react";

interface BugListProps {
  bugs?: Bug[];
  isLoading?: boolean;
  error?: string;
  onLoadMore?: () => void;
  onVote?: (bugId: string) => void;
  onSearch?: (filters: SearchFiltersType) => void;
  hasMore?: boolean;
  votedBugs?: Set<string>;
  totalCount?: number;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  status: "open" | "reviewing" | "fixed" | "wont_fix";
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  voteCount: number;
  commentCount: number;
  createdAt: string;
  viewCount?: number;
  application?: {
    name: string;
    company?: {
      name: string;
      isVerified: boolean;
    };
  };
  reporter?: {
    name: string;
    avatar?: string;
  };
}

export const BugList: React.FC<BugListProps> = ({
  bugs = [],
  isLoading = false,
  error,
  onLoadMore,
  onVote,
  onSearch,
  hasMore = false,
  votedBugs = new Set(),
  totalCount,
}) => {
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(true);
  const [activeFilters, setActiveFilters] = React.useState<
    Partial<SearchFiltersType>
  >({});

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return;

    setLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleSearch = (filters: SearchFiltersType) => {
    setActiveFilters(filters);
    if (onSearch) {
      onSearch(filters);
    }
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    if (onSearch) {
      onSearch({
        query: "",
        status: [],
        priority: [],
        tags: [],
        sortBy: "recent",
        application: "",
        company: "",
      });
    }
  };

  // Count active filters
  const activeFilterCount = [
    activeFilters.query,
    activeFilters.status?.length,
    activeFilters.priority?.length,
    activeFilters.tags?.length,
  ].filter(Boolean).length;

  // Loading state for initial load
  if (isLoading && bugs.length === 0) {
    return (
      <div className="space-y-6">
        <SearchFilters onSearch={handleSearch} />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
              <div className="h-5 w-32 bg-muted animate-pulse rounded-md" />
            </div>
          </div>
          <BugCardSkeletonList count={5} />
        </div>
      </div>
    );
  }

  // Error state
  if (error && bugs.length === 0) {
    return (
      <div className="space-y-6">
        <SearchFilters onSearch={handleSearch} />
        <ErrorMessage
          title="Failed to load bugs"
          message={error}
          action={{
            label: "Try again",
            onClick: handleRetry,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Bug Reports</h1>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">
              {showFilters ? "Hide" : "Show"} Filters
            </span>
          </Button>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <SearchFilters onSearch={handleSearch} />
          </div>
        )}

        {/* Active Filter Pills */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {activeFilters.status && activeFilters.status.length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-secondary border border-border">
                Status: {activeFilters.status.join(", ")}
                <button
                  onClick={() =>
                    handleSearch({
                      ...(activeFilters as SearchFiltersType),
                      status: [],
                    })
                  }
                  className="hover:text-destructive transition-colors"
                  aria-label="Remove status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {activeFilters.priority && activeFilters.priority.length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-secondary border border-border">
                Priority: {activeFilters.priority.join(", ")}
                <button
                  onClick={() =>
                    handleSearch({
                      ...(activeFilters as SearchFiltersType),
                      priority: [],
                    })
                  }
                  className="hover:text-destructive transition-colors"
                  aria-label="Remove priority filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {activeFilters.tags && activeFilters.tags.length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-secondary border border-border">
                Tags: {activeFilters.tags.join(", ")}
                <button
                  onClick={() =>
                    handleSearch({
                      ...(activeFilters as SearchFiltersType),
                      tags: [],
                    })
                  }
                  className="hover:text-destructive transition-colors"
                  aria-label="Remove tags filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {totalCount !== undefined && (
            <p className="text-sm text-muted-foreground">
              {totalCount === 0
                ? "No bugs found"
                : totalCount === 1
                  ? "1 bug found"
                  : `${totalCount.toLocaleString()} bugs found`}
            </p>
          )}
        </div>

        {error && bugs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        )}
      </div>

      {/* Bug List */}
      {bugs.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl" role="img" aria-label="Bug emoji">
              🐛
            </span>
          </div>
          <h3 className="text-xl font-semibold mb-3">No bugs found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {activeFilterCount > 0
              ? "No bugs match your current filters. Try adjusting your search criteria."
              : "Be the first to report a bug and help make this application better!"}
          </p>
          <div className="flex items-center justify-center gap-3">
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
            <Button asChild>
              <a href="/submit">Report a Bug</a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bugs.map((bug) => (
            <BugCard
              key={bug.id}
              bug={bug}
              onVote={onVote}
              isVoted={votedBugs.has(bug.id)}
            />
          ))}

          {/* Loading skeletons for load more */}
          {loadingMore && <BugCardSkeletonList count={3} />}

          {/* Load More Button */}
          {hasMore && !loadingMore && (
            <div className="text-center pt-8">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  "Load more bugs"
                )}
              </Button>
            </div>
          )}

          {/* End of results */}
          {!hasMore && bugs.length > 10 && (
            <div className="text-center py-8 border-t">
              <p className="text-sm text-muted-foreground">
                You've reached the end of the results
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Showing {bugs.length} of {totalCount || bugs.length} bugs
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error message for load more failures */}
      {error && bugs.length > 0 && (
        <div className="mt-6">
          <ErrorMessage
            title="Failed to load more bugs"
            message={error}
            action={{
              label: "Try again",
              onClick: handleLoadMore,
            }}
          />
        </div>
      )}
    </div>
  );
};
