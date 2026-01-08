"use client"

import * as React from "react"
import { useBug, useVoteBug, useCommentOnBug } from "@/lib/hooks"
import BugDetail, { type BugDetail as BugDetailType, type Comment } from "./bug-detail"
import { useAuthStore } from "@/lib/stores"

interface BugDetailContainerProps {
  bugId: string
}

export function BugDetailContainer({ bugId }: BugDetailContainerProps) {
  const { data: bug, isLoading, error } = useBug(bugId)
  const { mutate: voteBug } = useVoteBug()
  const { mutateAsync: addComment } = useCommentOnBug()
  const { user } = useAuthStore()

  if (isLoading) {
    return <BugDetail isLoading={true} />
  }

  if (error || !bug) {
    return <BugDetail error={error ? (error as Error).message : "Bug not found"} />
  }

  // Helper to safely access properties that might be snake_case from API
  // despite TypeScript interface defining them as camelCase
  const safeGet = (obj: any, camelKey: string, snakeKey: string) => {
    return obj[camelKey] !== undefined ? obj[camelKey] : obj[snakeKey]
  }

  // Map API response to UI component props
  const mappedBug: BugDetailType = {
    id: bug.id,
    title: bug.title,
    description: bug.description,
    status: bug.status,
    priority: bug.priority,
    tags: bug.tags || [],
    voteCount: safeGet(bug, 'voteCount', 'vote_count') || 0,
    commentCount: safeGet(bug, 'commentCount', 'comment_count') || 0,
    viewCount: safeGet(bug, 'viewCount', 'view_count') || 0,
    createdAt: safeGet(bug, 'createdAt', 'created_at'),
    updatedAt: safeGet(bug, 'updatedAt', 'updated_at'),
    resolvedAt: safeGet(bug, 'resolvedAt', 'resolved_at'),

    operatingSystem: safeGet(bug, 'operatingSystem', 'operating_system'),
    deviceType: safeGet(bug, 'deviceType', 'device_type'),
    appVersion: safeGet(bug, 'appVersion', 'app_version'),
    browserVersion: safeGet(bug, 'browserVersion', 'browser_version'),

    application: {
      id: bug.application.id,
      name: bug.application.name,
      url: bug.application.url,
      company: bug.application.company ? {
        id: bug.application.company.id,
        name: bug.application.company.name,
        isVerified: safeGet(bug.application.company, 'isVerified', 'is_verified')
      } : undefined
    },

    reporter: bug.reporter ? {
      id: bug.reporter.id,
      name: safeGet(bug.reporter, 'displayName', 'display_name'),
      avatar: safeGet(bug.reporter, 'avatarUrl', 'avatar_url')
    } : undefined,

    screenshots: (bug.screenshots || []).map(s => ({
      id: s.id,
      url: safeGet(s, 'fileUrl', 'file_url'),
      filename: s.filename
    })),

    // Filter comments to find company responses
    // Using any cast for comments as they might not be in the TS definition of BugReport
    companyResponses: ((bug as any).comments || [])
      .filter((c: any) => safeGet(c, 'isCompanyResponse', 'is_company_response'))
      .map((c: any) => ({
        id: c.id,
        content: c.content,
        createdAt: c.created_at || c.createdAt,
        user: {
          name: c.user?.display_name || c.user?.displayName || 'Company Representative',
          role: 'Team'
        }
      }))
  }

  // Map regular comments
  const comments: Comment[] = ((bug as any).comments || []).map((c: any) => ({
    id: c.id,
    content: c.content,
    createdAt: c.created_at || c.createdAt,
    updatedAt: c.updated_at || c.updatedAt,
    isCompanyResponse: safeGet(c, 'isCompanyResponse', 'is_company_response'),
    user: {
      id: c.user?.id,
      name: c.user?.display_name || c.user?.displayName || 'Unknown',
      avatar: c.user?.avatar_url || c.user?.avatarUrl,
      role: safeGet(c, 'isCompanyResponse', 'is_company_response') ? 'Company Team' : 'User'
    }
  }));

  const handleComment = async (content: string) => {
    await addComment({ bugId, content })
  }

  return (
    <BugDetail
      bug={mappedBug}
      comments={comments}
      onVote={() => voteBug(bugId)}
      onComment={handleComment}
      isVoted={safeGet(bug, 'hasUserVoted', 'has_user_voted')}
      isAuthenticated={!!user}
    />
  )
}
