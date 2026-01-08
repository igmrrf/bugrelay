"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUp,
  MessageCircle,
  Calendar,
  User,
  Building2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "./card";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface BugCardProps {
  bug: {
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
  };
  onVote?: (bugId: string) => void;
  isVoted?: boolean;
  className?: string;
}

export const BugCard: React.FC<BugCardProps> = ({
  bug,
  onVote,
  isVoted = false,
  className,
}) => {
  const [isVoting, setIsVoting] = React.useState(false);
  const [localVoteCount, setLocalVoteCount] = React.useState(bug.voteCount);
  const [localIsVoted, setLocalIsVoted] = React.useState(isVoted);

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onVote || isVoting) return;

    // Optimistic update
    setIsVoting(true);
    setLocalIsVoted(!localIsVoted);
    setLocalVoteCount(localIsVoted ? localVoteCount - 1 : localVoteCount + 1);

    try {
      await onVote(bug.id);
    } catch (error) {
      // Revert on error
      setLocalIsVoted(localIsVoted);
      setLocalVoteCount(bug.voteCount);
    } finally {
      setIsVoting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      className={cn(
        "group relative transition-all duration-200 hover:shadow-md hover:border-muted-foreground/20",
        className,
      )}
    >
      <Link
        href={`/bugs/${bug.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View bug: ${bug.title}`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Status and Priority Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={bug.status} showIcon />
              <StatusBadge priority={bug.priority} showIcon />
              {bug.application?.company?.isVerified && (
                <span
                  className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                  title="Verified Company"
                >
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {bug.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {bug.description}
            </p>

            {/* Tags */}
            {bug.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {bug.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border hover:bg-accent transition-colors"
                  >
                    {tag}
                  </span>
                ))}
                {bug.tags.length > 3 && (
                  <span className="inline-flex items-center px-2.5 py-1 text-xs text-muted-foreground">
                    +{bug.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Vote Button */}
          <div className="flex flex-col items-center space-y-1 relative z-10">
            <Button
              variant={localIsVoted ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 w-9 p-0 transition-all",
                localIsVoted && "shadow-sm",
                isVoting && "animate-pulse",
              )}
              onClick={handleVote}
              disabled={isVoting}
              aria-label={localIsVoted ? "Remove upvote" : "Upvote bug"}
              aria-pressed={localIsVoted}
            >
              <ArrowUp
                className={cn(
                  "h-4 w-4 transition-all",
                  localIsVoted && "fill-current scale-110",
                )}
              />
            </Button>
            <span
              className={cn(
                "text-xs font-medium transition-all",
                localIsVoted && "font-semibold scale-110",
              )}
              aria-label={`${localVoteCount} votes`}
            >
              {localVoteCount}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {/* Application and Company */}
            {bug.application && (
              <div className="flex items-center space-x-1.5">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate max-w-[150px]">
                  {bug.application.name}
                </span>
              </div>
            )}

            {/* Reporter */}
            {bug.reporter && (
              <div className="flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate max-w-[120px]">
                  {bug.reporter.name}
                </span>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center space-x-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <time dateTime={bug.createdAt}>{formatDate(bug.createdAt)}</time>
            </div>

            {/* View Count */}
            {bug.viewCount !== undefined && (
              <div className="flex items-center space-x-1.5">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{bug.viewCount}</span>
              </div>
            )}

            {/* Comments */}
            <div className="flex items-center space-x-1.5">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{bug.commentCount}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
