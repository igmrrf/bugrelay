"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUp, MessageCircle, Calendar, User, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "./card"
import { StatusBadge } from "./status-badge"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface BugCardProps {
  bug: {
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
  onVote?: (bugId: string) => void
  isVoted?: boolean
  className?: string
}

export const BugCard: React.FC<BugCardProps> = ({
  bug,
  onVote,
  isVoted = false,
  className
}) => {
  const handleVote = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onVote) {
      onVote(bug.id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <Link href={`/bugs/${bug.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
                {bug.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {bug.description}
              </p>
              
              {/* Tags */}
              {bug.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {bug.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  {bug.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{bug.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Vote Button */}
            <div className="flex flex-col items-center space-y-1">
              <Button
                variant={isVoted ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleVote}
              >
                <ArrowUp className={cn("h-4 w-4", isVoted && "fill-current")} />
              </Button>
              <span className="text-xs font-medium">{bug.voteCount}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {/* Application and Company */}
              {bug.application && (
                <div className="flex items-center space-x-1">
                  <Building2 className="h-3 w-3" />
                  <span>{bug.application.name}</span>
                  {bug.application.company?.isVerified && (
                    <span className="text-xs text-green-600">✓</span>
                  )}
                </div>
              )}
              
              {/* Reporter */}
              {bug.reporter && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{bug.reporter.name}</span>
                </div>
              )}
              
              {/* Date */}
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(bug.createdAt)}</span>
              </div>
              
              {/* Comments */}
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-3 w-3" />
                <span>{bug.commentCount}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <StatusBadge priority={bug.priority} />
              <StatusBadge status={bug.status} />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
