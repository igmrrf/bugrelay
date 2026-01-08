"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUp,
  MessageCircle,
  Calendar,
  User,
  Building2,
  ExternalLink,
  Flag,
  Share2,
  Edit,
  Eye,
  ChevronLeft,
  Copy,
  Check,
  X as CloseIcon,
  ChevronRight,
  ChevronLeft as PrevIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading";
import { ErrorMessage } from "@/components/ui/error-boundary";
import { CommentSection } from "./comment-section";
import { cn } from "@/lib/utils";
import { companyResponseColors } from "@/lib/design-tokens";

interface BugDetailProps {
  bug?: BugDetail;
  comments?: Comment[];
  isLoading?: boolean;
  error?: string;
  onVote?: (bugId: string) => void;
  onComment?: (content: string, parentId?: string) => Promise<void>;
  onFlag?: (bugId: string) => void;
  isVoted?: boolean;
  canEdit?: boolean;
  isAuthenticated?: boolean;
}

export interface BugDetail {
  id: string;
  title: string;
  description: string;
  status: "open" | "reviewing" | "fixed" | "wont_fix";
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  voteCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;

  // Technical details
  operatingSystem?: string;
  deviceType?: string;
  appVersion?: string;
  browserVersion?: string;

  // Application and company info
  application: {
    id: string;
    name: string;
    url?: string;
    company?: {
      id: string;
      name: string;
      isVerified: boolean;
    };
  };

  // Reporter info
  reporter?: {
    id: string;
    name: string;
    avatar?: string;
  };

  // Screenshots
  screenshots: {
    id: string;
    url: string;
    filename: string;
  }[];

  // Company responses
  companyResponses: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      name: string;
      role: string;
    };
  }[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isCompanyResponse: boolean;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  replies?: Comment[];
}

// Image Lightbox Component
const ImageLightbox: React.FC<{
  images: { id: string; url: string; filename: string }[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}> = ({ images, currentIndex, onClose, onNext, onPrev }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrev]);

  const current = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
        aria-label="Close lightbox"
      >
        <CloseIcon className="h-8 w-8" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Previous image"
          >
            <PrevIcon className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div
        className="max-w-7xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt={current.filename}
          className="max-w-full max-h-full object-contain"
        />
        <div className="text-center mt-4 text-white">
          <p className="text-sm">{current.filename}</p>
          {images.length > 1 && (
            <p className="text-xs text-gray-400 mt-1">
              {currentIndex + 1} of {images.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const BugDetail: React.FC<BugDetailProps> = ({
  bug,
  comments = [],
  isLoading = false,
  error,
  onVote,
  onComment,
  onFlag,
  isVoted = false,
  canEdit = false,
  isAuthenticated = false,
}) => {
  const [isVoting, setIsVoting] = React.useState(false);
  const [localVoteCount, setLocalVoteCount] = React.useState(
    bug?.voteCount || 0,
  );
  const [localIsVoted, setLocalIsVoted] = React.useState(isVoted);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (bug) {
      setLocalVoteCount(bug.voteCount);
      setLocalIsVoted(isVoted);
    }
  }, [bug, isVoted]);

  const handleVote = async () => {
    if (!onVote || !bug || isVoting) return;

    setIsVoting(true);
    setLocalIsVoted(!localIsVoted);
    setLocalVoteCount(localIsVoted ? localVoteCount - 1 : localVoteCount + 1);

    try {
      await onVote(bug.id);
    } catch (error) {
      setLocalIsVoted(localIsVoted);
      setLocalVoteCount(bug.voteCount);
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share && bug) {
      try {
        await navigator.share({
          title: bug.title,
          text: bug.description,
          url: url,
        });
      } catch (err) {
        navigator.clipboard.writeText(url);
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleCopyField = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return <LoadingState message="Loading bug details..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load bug details"
        message={error}
        action={{
          label: "Try again",
          onClick: () => window.location.reload(),
        }}
      />
    );
  }

  if (!bug) {
    return (
      <ErrorMessage
        title="Bug not found"
        message="The bug report you're looking for doesn't exist or has been removed."
        action={{
          label: "Browse all bugs",
          onClick: () => (window.location.href = "/bugs"),
        }}
      />
    );
  }

  const hasTechnicalDetails =
    bug.operatingSystem ||
    bug.deviceType ||
    bug.appVersion ||
    bug.browserVersion;

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/bugs"
            className="hover:text-foreground transition-colors"
          >
            Bug Reports
          </Link>
          <ChevronLeft className="h-4 w-4 rotate-180" />
          <span className="text-foreground truncate max-w-[300px]">
            {bug.title}
          </span>
        </nav>

        {/* Main Content Card */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          {/* Left: Bug Details */}
          <Card>
            <CardHeader className="space-y-4">
              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={bug.status} showIcon />
                <StatusBadge priority={bug.priority} showIcon />
                {bug.application.company?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800">
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
                    Verified Company
                  </span>
                )}
              </div>

              {/* Title */}
              <CardTitle className="text-2xl lg:text-3xl leading-tight">
                {bug.title}
              </CardTitle>

              {/* Metadata */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  <span>{bug.application.name}</span>
                  {bug.application.url && (
                    <a
                      href={bug.application.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      aria-label="Visit application website"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {bug.reporter && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span>Reported by {bug.reporter.name}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <time
                    dateTime={bug.createdAt}
                    title={formatDate(bug.createdAt)}
                  >
                    {formatRelativeTime(bug.createdAt)}
                  </time>
                </div>

                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>{bug.viewCount} views</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Tags */}
              {bug.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {bug.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border hover:bg-accent transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap leading-relaxed text-base">
                  {bug.description}
                </p>
              </div>

              {/* Screenshots */}
              {bug.screenshots.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Screenshots</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bug.screenshots.map((screenshot, index) => (
                      <div
                        key={screenshot.id}
                        className="group relative aspect-video rounded-lg border border-border overflow-hidden cursor-pointer hover:border-muted-foreground/50 transition-all hover:shadow-md"
                        onClick={() => setLightboxIndex(index)}
                      >
                        <img
                          src={screenshot.url}
                          alt={screenshot.filename}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                          <p className="text-xs text-white truncate">
                            {screenshot.filename}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {hasTechnicalDetails && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Technical Details</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {bug.operatingSystem && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Operating System
                          </span>
                          <button
                            onClick={() =>
                              handleCopyField("os", bug.operatingSystem!)
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Copy OS"
                          >
                            {copiedField === "os" ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm font-medium">
                          {bug.operatingSystem}
                        </p>
                      </div>
                    )}
                    {bug.deviceType && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Device Type
                          </span>
                          <button
                            onClick={() =>
                              handleCopyField("device", bug.deviceType!)
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Copy device"
                          >
                            {copiedField === "device" ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm font-medium">{bug.deviceType}</p>
                      </div>
                    )}
                    {bug.appVersion && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            App Version
                          </span>
                          <button
                            onClick={() =>
                              handleCopyField("version", bug.appVersion!)
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Copy version"
                          >
                            {copiedField === "version" ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm font-medium">{bug.appVersion}</p>
                      </div>
                    )}
                    {bug.browserVersion && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Browser
                          </span>
                          <button
                            onClick={() =>
                              handleCopyField("browser", bug.browserVersion!)
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Copy browser"
                          >
                            {copiedField === "browser" ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm font-medium">
                          {bug.browserVersion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Company Responses */}
              {bug.companyResponses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company Responses
                  </h4>
                  <div className="space-y-3">
                    {bug.companyResponses.map((response) => (
                      <div
                        key={response.id}
                        className="bg-[hsl(220_100%_98%)] dark:bg-[hsl(220_100%_10%)] border border-[hsl(220_100%_85%)] dark:border-[hsl(220_100%_25%)] rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[hsl(220_100%_20%)] dark:text-[hsl(220_100%_90%)]">
                              {response.user.name}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(220_100%_90%)] dark:bg-[hsl(220_100%_20%)] text-[hsl(220_100%_40%)] dark:text-[hsl(220_100%_80%)]">
                              {response.user.role}
                            </span>
                          </div>
                          <time
                            className="text-xs text-[hsl(220_100%_30%)] dark:text-[hsl(220_100%_70%)]"
                            dateTime={response.createdAt}
                          >
                            {formatRelativeTime(response.createdAt)}
                          </time>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-[hsl(220_100%_20%)] dark:text-[hsl(220_100%_90%)]">
                          {response.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Action Sidebar */}
          <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
            <div className="flex lg:flex-col gap-2">
              {/* Vote Button */}
              <Button
                variant={localIsVoted ? "default" : "outline"}
                size="lg"
                className={cn(
                  "flex-1 lg:w-20 lg:h-20 flex flex-col items-center justify-center gap-1 transition-all",
                  localIsVoted && "shadow-md",
                  isVoting && "animate-pulse",
                )}
                onClick={handleVote}
                disabled={!isAuthenticated || isVoting}
                aria-label={localIsVoted ? "Remove upvote" : "Upvote bug"}
                aria-pressed={localIsVoted}
              >
                <ArrowUp
                  className={cn(
                    "h-5 w-5 transition-all",
                    localIsVoted && "fill-current scale-110",
                  )}
                />
                <span className="text-sm font-semibold">{localVoteCount}</span>
              </Button>

              {/* Share Button */}
              <Button
                variant="outline"
                size="lg"
                className="flex-1 lg:w-20 lg:h-20 flex flex-col items-center justify-center gap-1"
                onClick={handleShare}
                aria-label="Share bug"
              >
                <Share2 className="h-5 w-5" />
                <span className="text-xs">Share</span>
              </Button>

              {/* Edit Button */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 lg:w-20 lg:h-20 flex flex-col items-center justify-center gap-1"
                  asChild
                >
                  <Link href={`/bugs/${bug.id}/edit`}>
                    <Edit className="h-5 w-5" />
                    <span className="text-xs">Edit</span>
                  </Link>
                </Button>
              )}

              {/* Flag Button */}
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 lg:w-20 lg:h-20 flex flex-col items-center justify-center gap-1"
                  onClick={() => onFlag?.(bug.id)}
                  aria-label="Flag bug"
                >
                  <Flag className="h-5 w-5" />
                  <span className="text-xs">Flag</span>
                </Button>
              )}
            </div>

            {/* Stats */}
            <Card className="p-4 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>{bug.commentCount} comments</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <CommentSection
          comments={comments}
          onComment={onComment}
          isAuthenticated={isAuthenticated}
          bugId={bug.id}
        />
      </div>

      {/* Image Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={bug.screenshots}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNext={() =>
            setLightboxIndex((lightboxIndex + 1) % bug.screenshots.length)
          }
          onPrev={() =>
            setLightboxIndex(
              (lightboxIndex - 1 + bug.screenshots.length) %
                bug.screenshots.length,
            )
          }
        />
      )}
    </>
  );
};

export default BugDetail;
