"use client"

import * as React from "react"
import Link from "next/link"
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
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"
import { CommentSection } from "./comment-section"

interface BugDetailProps {
  bug?: BugDetail
  comments?: Comment[]
  isLoading?: boolean
  error?: string
  onVote?: (bugId: string) => void
  onComment?: (content: string, parentId?: string) => Promise<void>
  onFlag?: (bugId: string) => void
  isVoted?: boolean
  canEdit?: boolean
  isAuthenticated?: boolean
}

export interface BugDetail {
  id: string
  title: string
  description: string
  status: "open" | "reviewing" | "fixed" | "wont_fix"
  priority: "low" | "medium" | "high" | "critical"
  tags: string[]
  voteCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  
  // Technical details
  operatingSystem?: string
  deviceType?: string
  appVersion?: string
  browserVersion?: string
  
  // Application and company info
  application: {
    id: string
    name: string
    url?: string
    company?: {
      id: string
      name: string
      isVerified: boolean
    }
  }
  
  // Reporter info
  reporter?: {
    id: string
    name: string
    avatar?: string
  }
  
  // Screenshots
  screenshots: {
    id: string
    url: string
    filename: string
  }[]
  
  // Company responses
  companyResponses: {
    id: string
    content: string
    createdAt: string
    user: {
      name: string
      role: string
    }
  }[]
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
  isAuthenticated = false
}) => {
  const handleVote = () => {
    if (onVote && bug) {
      onVote(bug.id)
    }
  }

  const handleShare = async () => {
    if (navigator.share && bug) {
      try {
        await navigator.share({
          title: bug.title,
          text: bug.description,
          url: window.location.href
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600'
      case 'reviewing': return 'text-yellow-600'
      case 'fixed': return 'text-green-600'
      case 'wont_fix': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading bug details..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load bug details"
        message={error}
        action={{
          label: "Try again",
          onClick: () => window.location.reload()
        }}
      />
    )
  }

  if (!bug) {
    return (
      <ErrorMessage
        title="Bug not found"
        message="The bug report you're looking for doesn't exist or has been removed."
        action={{
          label: "Browse all bugs",
          onClick: () => window.location.href = "/bugs"
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Bug Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <StatusBadge status={bug.status} />
                <StatusBadge priority={bug.priority} />
                {bug.application.company?.isVerified && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Verified Company
                  </span>
                )}
              </div>
              
              <CardTitle className="text-2xl mb-2">{bug.title}</CardTitle>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Building2 className="h-4 w-4" />
                  <span>{bug.application.name}</span>
                  {bug.application.url && (
                    <Link 
                      href={bug.application.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                
                {bug.reporter && (
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Reported by {bug.reporter.name}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(bug.createdAt)}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{bug.viewCount} views</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant={isVoted ? "default" : "outline"}
                size="sm"
                onClick={handleVote}
                disabled={!isAuthenticated}
                className="flex flex-col items-center h-auto py-2 px-3"
              >
                <ArrowUp className={`h-4 w-4 ${isVoted ? "fill-current" : ""}`} />
                <span className="text-xs font-medium">{bug.voteCount}</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              
              {canEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/bugs/${bug.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              
              {isAuthenticated && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onFlag?.(bug.id)}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tags */}
          {bug.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {bug.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{bug.description}</p>
          </div>
          
          {/* Screenshots */}
          {bug.screenshots.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Screenshots</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bug.screenshots.map((screenshot) => (
                  <div key={screenshot.id} className="space-y-2">
                    <img
                      src={screenshot.url}
                      alt={screenshot.filename}
                      className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(screenshot.url, '_blank')}
                    />
                    <p className="text-xs text-muted-foreground truncate">
                      {screenshot.filename}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Technical Details */}
          {(bug.operatingSystem || bug.deviceType || bug.appVersion || bug.browserVersion) && (
            <div className="space-y-2">
              <h4 className="font-medium">Technical Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {bug.operatingSystem && (
                  <div>
                    <span className="font-medium">OS:</span>
                    <p className="text-muted-foreground">{bug.operatingSystem}</p>
                  </div>
                )}
                {bug.deviceType && (
                  <div>
                    <span className="font-medium">Device:</span>
                    <p className="text-muted-foreground">{bug.deviceType}</p>
                  </div>
                )}
                {bug.appVersion && (
                  <div>
                    <span className="font-medium">App Version:</span>
                    <p className="text-muted-foreground">{bug.appVersion}</p>
                  </div>
                )}
                {bug.browserVersion && (
                  <div>
                    <span className="font-medium">Browser:</span>
                    <p className="text-muted-foreground">{bug.browserVersion}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Company Responses */}
          {bug.companyResponses.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Company Responses</h4>
              <div className="space-y-3">
                {bug.companyResponses.map((response) => (
                  <div key={response.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{response.user.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {response.user.role}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(response.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{response.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Comments Section */}
      <CommentSection
        comments={comments}
        onComment={onComment}
        isAuthenticated={isAuthenticated}
        bugId={bug.id}
      />
    </div>
  )
}

export default BugDetail
