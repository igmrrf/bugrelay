"use client"

import * as React from "react"
import { BugCard } from "@/components/ui/bug-card"
import { SearchFilters, type SearchFilters as SearchFiltersType } from "@/components/ui/search-filters"
import { LoadingState, LoadingSkeleton } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface BugListProps {
  bugs?: Bug[]
  isLoading?: boolean
  error?: string
  onLoadMore?: () => void
  onVote?: (bugId: string) => void
  onSearch?: (filters: SearchFiltersType) => void
  hasMore?: boolean
  votedBugs?: Set<string>
  totalCount?: number
}

export interface Bug {
  id: string
  title: string
  description: string
  status: "open" | "reviewing" | "fixed" | "wont_fix"
  priority: "low" | "medium" | "high" | "critical"
  tags: string[]
  voteCount: number
  commentCount: number
  createdAt: string
  application?: {
    name: string
    company?: {
      name: string
      isVerified: boolean
    }
  }
  reporter?: {
    name: string
    avatar?: string
  }
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
  totalCount
}) => {
  const [loadingMore, setLoadingMore] = React.useState(false)

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return
    
    setLoadingMore(true)
    try {
      await onLoadMore()
    } finally {
      setLoadingMore(false)
    }
  }

  const handleRetry = () => {
    window.location.reload()
  }

  // Loading state for initial load
  if (isLoading && bugs.length === 0) {
    return (
      <div className="space-y-6">
        <SearchFilters onSearch={onSearch} />
        <LoadingState message="Loading bugs..." />
      </div>
    )
  }

  // Error state
  if (error && bugs.length === 0) {
    return (
      <div className="space-y-6">
        <SearchFilters onSearch={onSearch} />
        <ErrorMessage
          title="Failed to load bugs"
          message={error}
          action={{
            label: "Try again",
            onClick: handleRetry
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <SearchFilters onSearch={onSearch} />

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bug Reports</h2>
          {totalCount !== undefined && (
            <p className="text-muted-foreground">
              {totalCount === 0 ? "No bugs found" : 
               totalCount === 1 ? "1 bug found" : 
               `${totalCount.toLocaleString()} bugs found`}
            </p>
          )}
        </div>
        
        {error && bugs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        )}
      </div>

      {/* Bug List */}
      {bugs.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🐛</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">No bugs found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search filters or be the first to report a bug!
          </p>
          <Button asChild>
            <a href="/submit">Submit a Bug Report</a>
          </Button>
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
          {loadingMore && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-6 space-y-3">
                  <LoadingSkeleton className="h-6 w-3/4" />
                  <LoadingSkeleton className="h-4 w-full" />
                  <LoadingSkeleton className="h-4 w-2/3" />
                  <div className="flex space-x-2">
                    <LoadingSkeleton className="h-6 w-16" />
                    <LoadingSkeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-6">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                variant="outline"
                size="lg"
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
            <div className="text-center py-6 text-muted-foreground">
              <p>You've reached the end of the results</p>
            </div>
          )}
        </div>
      )}

      {/* Error message for load more failures */}
      {error && bugs.length > 0 && (
        <div className="mt-4">
          <ErrorMessage
            title="Failed to load more bugs"
            message={error}
            action={{
              label: "Try again",
              onClick: handleLoadMore
            }}
          />
        </div>
      )}
    </div>
  )
}