"use client"

import * as React from "react"
import { Flag, Eye, Trash2, CheckCircle, X, AlertTriangle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"

interface ContentModerationProps {
  flaggedItems?: FlaggedItem[]
  isLoading?: boolean
  error?: string
  onModerateItem?: (itemId: string, action: ModerationAction, reason?: string) => Promise<void>
  onLoadMore?: () => void
  hasMore?: boolean
}

export interface FlaggedItem {
  id: string
  type: "bug" | "comment"
  title: string
  content: string
  reason: string
  flaggedAt: string
  flaggedBy: {
    id: string
    name: string
    email: string
  }
  status: "pending" | "resolved" | "dismissed"
  
  // For bugs
  bug?: {
    id: string
    application: {
      name: string
    }
    reporter?: {
      name: string
    }
  }
  
  // For comments
  comment?: {
    id: string
    bugId: string
    bugTitle: string
    author: {
      name: string
    }
  }
  
  // Moderation history
  moderationHistory: {
    id: string
    action: "flagged" | "approved" | "removed" | "dismissed"
    reason?: string
    moderatedAt: string
    moderatedBy: {
      name: string
    }
  }[]
}

export interface ModerationAction {
  action: "approve" | "remove" | "dismiss"
  reason?: string
}

const flagReasons = [
  "Spam or promotional content",
  "Inappropriate language",
  "Harassment or abuse",
  "False or misleading information",
  "Copyright violation",
  "Duplicate content",
  "Off-topic or irrelevant",
  "Other"
]

export const ContentModeration: React.FC<ContentModerationProps> = ({
  flaggedItems = [],
  isLoading = false,
  error,
  onModerateItem,
  onLoadMore,
  hasMore = false
}) => {
  const [selectedFilter, setSelectedFilter] = React.useState<"all" | "pending" | "resolved" | "dismissed">("pending")
  const [moderatingItems, setModeratingItems] = React.useState<Set<string>>(new Set())

  const filteredItems = flaggedItems.filter(item => {
    if (selectedFilter === "all") return true
    return item.status === selectedFilter
  })

  const handleModeration = async (itemId: string, action: "approve" | "remove" | "dismiss", reason?: string) => {
    if (!onModerateItem) return
    
    setModeratingItems(prev => new Set(prev).add(itemId))
    
    try {
      await onModerateItem(itemId, { action, reason })
    } catch (err) {
      console.error("Failed to moderate item:", err)
    } finally {
      setModeratingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "resolved": return "bg-green-100 text-green-800"
      case "dismissed": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading && flaggedItems.length === 0) {
    return <LoadingState message="Loading flagged content..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load flagged content"
        message={error}
        action={{
          label: "Try again",
          onClick: () => window.location.reload()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Flag className="h-8 w-8 text-primary" />
            <span>Content Moderation</span>
          </h1>
          <p className="text-muted-foreground">
            Review and moderate flagged content
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedFilter} onValueChange={(value: any) => setSelectedFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">
                  {flaggedItems.filter(item => item.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Resolved</p>
                <p className="text-2xl font-bold">
                  {flaggedItems.filter(item => item.status === "resolved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Dismissed</p>
                <p className="text-2xl font-bold">
                  {flaggedItems.filter(item => item.status === "dismissed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flag className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{flaggedItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Items */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No flagged content</h3>
            <p className="text-muted-foreground">
              {selectedFilter === "pending" 
                ? "No content is currently pending moderation"
                : `No ${selectedFilter} flagged content found`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <ModerationItem
              key={item.id}
              item={item}
              onModerate={handleModeration}
              isLoading={moderatingItems.has(item.id)}
            />
          ))}
          
          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ModerationItemProps {
  item: FlaggedItem
  onModerate: (itemId: string, action: "approve" | "remove" | "dismiss", reason?: string) => Promise<void>
  isLoading: boolean
}

const ModerationItem: React.FC<ModerationItemProps> = ({ item, onModerate, isLoading }) => {
  const [showActions, setShowActions] = React.useState(false)
  const [moderationReason, setModerationReason] = React.useState("")

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "resolved": return "bg-green-100 text-green-800"
      case "dismissed": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <StatusBadge className="text-xs">
                {item.type}
              </StatusBadge>
              <StatusBadge className={`text-xs ${getStatusColor(item.status)}`}>
                {item.status}
              </StatusBadge>
              {item.type === "bug" && item.bug && (
                <span className="text-xs text-muted-foreground">
                  {item.bug.application.name}
                </span>
              )}
            </div>
            
            <CardTitle className="text-lg">{item.title}</CardTitle>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
              <span>Flagged by {item.flaggedBy.name}</span>
              <span>•</span>
              <span>{formatDate(item.flaggedAt)}</span>
              <span>•</span>
              <span>Reason: {item.reason}</span>
            </div>
          </div>
          
          {item.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              disabled={isLoading}
            >
              {showActions ? "Cancel" : "Moderate"}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Content */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm whitespace-pre-wrap">{item.content}</p>
        </div>
        
        {/* Context Information */}
        {item.type === "bug" && item.bug && (
          <div className="text-sm text-muted-foreground">
            <p>Bug report in {item.bug.application.name}</p>
            {item.bug.reporter && <p>Reported by {item.bug.reporter.name}</p>}
          </div>
        )}
        
        {item.type === "comment" && item.comment && (
          <div className="text-sm text-muted-foreground">
            <p>Comment on: {item.comment.bugTitle}</p>
            <p>By {item.comment.author.name}</p>
          </div>
        )}
        
        {/* Moderation Actions */}
        {showActions && item.status === "pending" && (
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Moderation Reason (Optional)</label>
              <Textarea
                placeholder="Add a reason for your moderation decision..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onModerate(item.id, "approve", moderationReason || undefined)}
                disabled={isLoading}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onModerate(item.id, "remove", moderationReason || undefined)}
                disabled={isLoading}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onModerate(item.id, "dismiss", moderationReason || undefined)}
                disabled={isLoading}
                className="text-gray-600 border-gray-600 hover:bg-gray-50"
              >
                <X className="mr-1 h-4 w-4" />
                Dismiss
              </Button>
            </div>
          </div>
        )}
        
        {/* Moderation History */}
        {item.moderationHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2">Moderation History</h4>
            <div className="space-y-2">
              {item.moderationHistory.map((entry) => (
                <div key={entry.id} className="text-sm text-muted-foreground">
                  <span className="font-medium">{entry.action}</span> by {entry.moderatedBy.name}
                  {entry.reason && <span> - {entry.reason}</span>}
                  <span className="ml-2">{formatDate(entry.moderatedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}