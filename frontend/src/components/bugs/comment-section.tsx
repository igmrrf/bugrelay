"use client"

import * as React from "react"
import { MessageCircle, Reply, Flag, Edit, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading"

interface CommentSectionProps {
  comments: Comment[]
  onComment?: (content: string, parentId?: string) => Promise<void>
  onEditComment?: (commentId: string, content: string) => Promise<void>
  onDeleteComment?: (commentId: string) => Promise<void>
  onFlagComment?: (commentId: string) => Promise<void>
  isAuthenticated?: boolean
  bugId: string
  currentUserId?: string
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  isCompanyResponse: boolean
  user: {
    id: string
    name: string
    avatar?: string
    role?: string
  }
  replies?: Comment[]
}

interface CommentItemProps {
  comment: Comment
  onReply?: (content: string) => Promise<void>
  onEdit?: (content: string) => Promise<void>
  onDelete?: () => Promise<void>
  onFlag?: () => Promise<void>
  isAuthenticated?: boolean
  currentUserId?: string
  depth?: number
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onFlag,
  isAuthenticated = false,
  currentUserId,
  depth = 0
}) => {
  const [isReplying, setIsReplying] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [replyContent, setReplyContent] = React.useState("")
  const [editContent, setEditContent] = React.useState(comment.content)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isOwner = currentUserId === comment.user.id
  const canReply = isAuthenticated && depth < 3 // Limit nesting to 3 levels
  const canEdit = isOwner
  const canDelete = isOwner

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const handleReply = async () => {
    if (!onReply || !replyContent.trim()) return
    
    setIsSubmitting(true)
    try {
      await onReply(replyContent.trim())
      setReplyContent("")
      setIsReplying(false)
    } catch (err) {
      console.error("Failed to submit reply:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!onEdit || !editContent.trim()) return
    
    setIsSubmitting(true)
    try {
      await onEdit(editContent.trim())
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to edit comment:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    if (confirm("Are you sure you want to delete this comment?")) {
      setIsSubmitting(true)
      try {
        await onDelete()
      } catch (err) {
        console.error("Failed to delete comment:", err)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className={`space-y-3 ${depth > 0 ? "ml-6 pl-4 border-l-2 border-muted" : ""}`}>
      <div className="space-y-3">
        {/* Comment Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {comment.user.avatar ? (
                <img
                  src={comment.user.avatar}
                  alt={comment.user.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {comment.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{comment.user.name}</span>
                  {comment.isCompanyResponse && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {comment.user.role || "Company"}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{formatDate(comment.createdAt)}</span>
                  {comment.updatedAt !== comment.createdAt && (
                    <span>(edited)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Comment Actions */}
          <div className="flex items-center space-x-1">
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                disabled={isSubmitting}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
            
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isSubmitting}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
            
            {isAuthenticated && !isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFlag}
                disabled={isSubmitting}
              >
                <Flag className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Edit your comment..."
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
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
          <div className={`text-sm whitespace-pre-wrap ${
            comment.isCompanyResponse ? "bg-blue-50 border border-blue-200 rounded-lg p-3" : ""
          }`}>
            {comment.content}
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsReplying(false)
                  setReplyContent("")
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
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
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
    </div>
  )
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  onComment,
  onEditComment,
  onDeleteComment,
  onFlagComment,
  isAuthenticated = false,
  bugId,
  currentUserId
}) => {
  const [newComment, setNewComment] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmitComment = async () => {
    if (!onComment || !newComment.trim()) return
    
    setIsSubmitting(true)
    try {
      await onComment(newComment.trim())
      setNewComment("")
    } catch (err) {
      console.error("Failed to submit comment:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = (parentId: string) => async (content: string) => {
    if (!onComment) return
    await onComment(content, parentId)
  }

  const handleEdit = (commentId: string) => async (content: string) => {
    if (!onEditComment) return
    await onEditComment(commentId, content)
  }

  const handleDelete = (commentId: string) => async () => {
    if (!onDeleteComment) return
    await onDeleteComment(commentId)
  }

  const handleFlag = (commentId: string) => async () => {
    if (!onFlagComment) return
    await onFlagComment(commentId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>Comments ({comments.length})</span>
        </CardTitle>
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
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
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
          <div className="text-center py-6 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground mb-2">
              Sign in to join the discussion
            </p>
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
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
  )
}