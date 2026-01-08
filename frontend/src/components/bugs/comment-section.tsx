"use client";

import * as React from "react";
import {
  MessageCircle,
  Reply,
  Flag,
  Edit,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentSectionProps {
  comments: Comment[];
  onComment?: (content: string, parentId?: string) => Promise<void>;
  onEditComment?: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onFlagComment?: (commentId: string) => Promise<void>;
  isAuthenticated?: boolean;
  bugId: string;
  currentUserId?: string;
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

interface CommentItemProps {
  comment: Comment;
  onReply?: (content: string) => Promise<void>;
  onEdit?: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onFlag?: () => Promise<void>;
  isAuthenticated?: boolean;
  currentUserId?: string;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onFlag,
  isAuthenticated = false,
  currentUserId,
  depth = 0,
}) => {
  const [isReplying, setIsReplying] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [replyContent, setReplyContent] = React.useState("");
  const [editContent, setEditContent] = React.useState(comment.content);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const isOwner = currentUserId === comment.user.id;
  const canReply = isAuthenticated && depth < 3;
  const canEdit = isOwner;
  const canDelete = isOwner;
  const hasReplies = comment.replies && comment.replies.length > 0;

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

  const handleReply = async () => {
    if (!onReply || !replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onReply(replyContent.trim());
      setReplyContent("");
      setIsReplying(false);
    } catch (err) {
      console.error("Failed to submit reply:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!onEdit || !editContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onEdit(editContent.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (confirm("Are you sure you want to delete this comment?")) {
      setIsSubmitting(true);
      try {
        await onDelete();
      } catch (err) {
        console.error("Failed to delete comment:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getBorderColor = () => {
    if (depth === 0) return "border-l-muted";
    if (depth === 1) return "border-l-muted/80";
    if (depth === 2) return "border-l-muted/60";
    return "border-l-muted/40";
  };

  return (
    <div
      className={cn(
        "space-y-3 transition-all",
        depth > 0 && "ml-6 pl-4 border-l-2",
        depth > 0 && getBorderColor(),
      )}
    >
      <div
        className={cn(
          "space-y-3 rounded-lg transition-all",
          comment.isCompanyResponse &&
            "bg-[hsl(220_100%_98%)] dark:bg-[hsl(220_100%_10%)] border border-[hsl(220_100%_85%)] dark:border-[hsl(220_100%_25%)] p-4",
        )}
      >
        {/* Comment Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            {comment.user.avatar ? (
              <img
                src={comment.user.avatar}
                alt={comment.user.name}
                className="h-10 w-10 rounded-full flex-shrink-0 border-2 border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 border-2 border-border">
                <span className="text-sm font-semibold">
                  {comment.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {comment.user.name}
                </span>
                {comment.isCompanyResponse && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(220_100%_90%)] dark:bg-[hsl(220_100%_20%)] text-[hsl(220_100%_40%)] dark:text-[hsl(220_100%_80%)]">
                    {comment.user.role || "Company"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <time dateTime={comment.createdAt}>
                  {formatDate(comment.createdAt)}
                </time>
                {comment.updatedAt !== comment.createdAt && (
                  <span>(edited)</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isSubmitting}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canReply && (
                <DropdownMenuItem
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-2"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
              {isAuthenticated && !isOwner && (
                <DropdownMenuItem
                  onClick={onFlag}
                  className="flex items-center gap-2"
                >
                  <Flag className="h-4 w-4" />
                  Flag
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="space-y-2 animate-in slide-in-from-top-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Edit your comment..."
              rows={3}
              disabled={isSubmitting}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEdit}
                disabled={isSubmitting || !editContent.trim()}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-1" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "text-sm whitespace-pre-wrap leading-relaxed",
              comment.isCompanyResponse &&
                "text-[hsl(220_100%_20%)] dark:text-[hsl(220_100%_90%)]",
            )}
          >
            {comment.content}
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="space-y-2 animate-in slide-in-from-top-2 pt-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              disabled={isSubmitting}
              className="resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReply}
                disabled={isSubmitting || !replyContent.trim()}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-1" />
                    Replying...
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {hasReplies && !isCollapsed && (
        <div className="space-y-3 animate-in slide-in-from-top-2">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onFlag={onFlag}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Collapse/Expand Replies */}
      {hasReplies && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-14"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="h-3 w-3" />
              Show {comment.replies!.length}{" "}
              {comment.replies!.length === 1 ? "reply" : "replies"}
            </>
          ) : (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide {comment.replies!.length}{" "}
              {comment.replies!.length === 1 ? "reply" : "replies"}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  onComment,
  onEditComment,
  onDeleteComment,
  onFlagComment,
  isAuthenticated = false,
  bugId,
  currentUserId,
}) => {
  const [newComment, setNewComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest">("newest");

  const handleSubmitComment = async () => {
    if (!onComment || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onComment(newComment.trim());
      setNewComment("");
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (parentId: string) => async (content: string) => {
    if (!onComment) return;
    await onComment(content, parentId);
  };

  const handleEdit = (commentId: string) => async (content: string) => {
    if (!onEditComment) return;
    await onEditComment(commentId, content);
  };

  const handleDelete = (commentId: string) => async () => {
    if (!onDeleteComment) return;
    await onDeleteComment(commentId);
  };

  const handleFlag = (commentId: string) => async () => {
    if (!onFlagComment) return;
    await onFlagComment(commentId);
  };

  // Sort comments
  const sortedComments = React.useMemo(() => {
    const sorted = [...comments];
    if (sortBy === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return sorted;
  }, [comments, sortBy]);

  const companyResponseCount = React.useMemo(() => {
    return comments.filter((c) => c.isCompanyResponse).length;
  }, [comments]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span>
              Comments ({comments.length})
              {companyResponseCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  · {companyResponseCount} company{" "}
                  {companyResponseCount === 1 ? "response" : "responses"}
                </span>
              )}
            </span>
          </CardTitle>

          {comments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <div className="flex gap-1">
                <Button
                  variant={sortBy === "newest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("newest")}
                  className="h-7 text-xs"
                >
                  Newest
                </Button>
                <Button
                  variant={sortBy === "oldest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("oldest")}
                  className="h-7 text-xs"
                >
                  Oldest
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* New Comment Form */}
        {isAuthenticated ? (
          <div className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={4}
              disabled={isSubmitting}
              className="resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {newComment.length} characters
              </span>
              <Button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/20 rounded-lg border-2 border-dashed border-border">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-3">
              Sign in to join the discussion
            </p>
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-16 w-16 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-1">No comments yet</p>
            <p className="text-sm">Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply(comment.id)}
                onEdit={handleEdit(comment.id)}
                onDelete={handleDelete(comment.id)}
                onFlag={handleFlag(comment.id)}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
                depth={0}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
