"use client"

import * as React from "react"
import { GitMerge, Search, ArrowRight, Check, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { BugCard } from "@/components/ui/bug-card"
import { LoadingState, LoadingSpinner } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"

interface DuplicateMergerProps {
  potentialDuplicates?: DuplicateGroup[]
  isLoading?: boolean
  error?: string
  onMergeBugs?: (data: MergeData) => Promise<void>
  onSearchBugs?: (query: string) => Promise<Bug[]>
  onMarkNotDuplicate?: (groupId: string) => Promise<void>
}

export interface DuplicateGroup {
  id: string
  primaryBug: Bug
  duplicateBugs: Bug[]
  similarity: number
  detectedAt: string
  status: "pending" | "merged" | "dismissed"
  mergedBy?: {
    name: string
    mergedAt: string
  }
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

export interface MergeData {
  primaryBugId: string
  duplicateBugIds: string[]
  mergeReason: string
  redirectComments: boolean
  notifyUsers: boolean
}

export const DuplicateMerger: React.FC<DuplicateMergerProps> = ({
  potentialDuplicates = [],
  isLoading = false,
  error,
  onMergeBugs,
  onSearchBugs,
  onMarkNotDuplicate
}) => {
  const [selectedGroup, setSelectedGroup] = React.useState<DuplicateGroup | null>(null)
  const [mergeReason, setMergeReason] = React.useState("")
  const [redirectComments, setRedirectComments] = React.useState(true)
  const [notifyUsers, setNotifyUsers] = React.useState(true)
  const [isMerging, setIsMerging] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<Bug[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSearch = async () => {
    if (!onSearchBugs || !searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      const results = await onSearchBugs(searchQuery.trim())
      setSearchResults(results)
    } catch (err) {
      console.error("Search failed:", err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleMerge = async () => {
    if (!onMergeBugs || !selectedGroup || !mergeReason.trim()) return
    
    setIsMerging(true)
    try {
      await onMergeBugs({
        primaryBugId: selectedGroup.primaryBug.id,
        duplicateBugIds: selectedGroup.duplicateBugs.map(bug => bug.id),
        mergeReason: mergeReason.trim(),
        redirectComments,
        notifyUsers
      })
      setSelectedGroup(null)
      setMergeReason("")
    } catch (err) {
      console.error("Merge failed:", err)
    } finally {
      setIsMerging(false)
    }
  }

  const handleMarkNotDuplicate = async (groupId: string) => {
    if (!onMarkNotDuplicate) return
    
    try {
      await onMarkNotDuplicate(groupId)
    } catch (err) {
      console.error("Failed to mark as not duplicate:", err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 90) return "text-red-600"
    if (similarity >= 70) return "text-orange-600"
    if (similarity >= 50) return "text-yellow-600"
    return "text-gray-600"
  }

  if (isLoading && potentialDuplicates.length === 0) {
    return <LoadingState message="Loading potential duplicates..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load duplicate detection"
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
            <GitMerge className="h-8 w-8 text-primary" />
            <span>Duplicate Bug Merger</span>
          </h1>
          <p className="text-muted-foreground">
            Review and merge duplicate bug reports
          </p>
        </div>
      </div>

      {/* Manual Search */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Duplicate Search</CardTitle>
          <CardDescription>
            Search for potential duplicates manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search for bugs by title, description, or application..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Search Results</h4>
              <div className="grid gap-4">
                {searchResults.slice(0, 5).map((bug) => (
                  <BugCard key={bug.id} bug={bug} className="cursor-pointer hover:shadow-md" />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Potential Duplicates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duplicate Groups List */}
        <Card>
          <CardHeader>
            <CardTitle>Potential Duplicates ({potentialDuplicates.length})</CardTitle>
            <CardDescription>
              Automatically detected duplicate bug reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {potentialDuplicates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GitMerge className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No potential duplicates detected</p>
                <p className="text-sm">The system will automatically detect similar bug reports</p>
              </div>
            ) : (
              <div className="space-y-3">
                {potentialDuplicates.map((group) => (
                  <div
                    key={group.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedGroup?.id === group.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <StatusBadge className={`text-xs ${getSimilarityColor(group.similarity)}`}>
                          {group.similarity}% similar
                        </StatusBadge>
                        <StatusBadge className="text-xs">
                          {group.duplicateBugs.length + 1} bugs
                        </StatusBadge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(group.detectedAt)}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-1">{group.primaryBug.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Primary bug • {group.primaryBug.application?.name}
                    </p>
                    
                    <div className="mt-2 space-y-1">
                      {group.duplicateBugs.slice(0, 2).map((bug) => (
                        <p key={bug.id} className="text-xs text-muted-foreground truncate">
                          → {bug.title}
                        </p>
                      ))}
                      {group.duplicateBugs.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{group.duplicateBugs.length - 2} more duplicates
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Merge Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Merge Duplicates</CardTitle>
            <CardDescription>
              Review and merge the selected duplicate group
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedGroup ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a duplicate group to review</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Primary Bug */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center space-x-2">
                    <span>Primary Bug</span>
                    <StatusBadge className="text-xs">Keep</StatusBadge>
                  </h4>
                  <BugCard bug={selectedGroup.primaryBug} />
                </div>

                {/* Duplicate Bugs */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center space-x-2">
                    <span>Duplicate Bugs</span>
                    <StatusBadge className="text-xs bg-red-100 text-red-800">Merge</StatusBadge>
                  </h4>
                  <div className="space-y-2">
                    {selectedGroup.duplicateBugs.map((bug) => (
                      <BugCard key={bug.id} bug={bug} />
                    ))}
                  </div>
                </div>

                {/* Merge Options */}
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Merge Reason *</label>
                    <Textarea
                      placeholder="Explain why these bugs are duplicates..."
                      value={mergeReason}
                      onChange={(e) => setMergeReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        id="redirectComments"
                        type="checkbox"
                        checked={redirectComments}
                        onChange={(e) => setRedirectComments(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="redirectComments" className="text-sm">
                        Redirect comments to primary bug
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        id="notifyUsers"
                        type="checkbox"
                        checked={notifyUsers}
                        onChange={(e) => setNotifyUsers(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="notifyUsers" className="text-sm">
                        Notify affected users about the merge
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleMerge}
                      disabled={isMerging || !mergeReason.trim()}
                      className="flex-1"
                    >
                      {isMerging ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Merging...
                        </>
                      ) : (
                        <>
                          <GitMerge className="mr-2 h-4 w-4" />
                          Merge Duplicates
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleMarkNotDuplicate(selectedGroup.id)}
                      disabled={isMerging}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Not Duplicates
                    </Button>
                  </div>
                </div>

                {/* Merge Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Merge Preview</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Primary bug will remain active with all its data</p>
                    <p>• Duplicate bugs will be marked as merged and redirected</p>
                    {redirectComments && <p>• Comments from duplicates will be moved to primary</p>}
                    <p>• Vote counts will be combined</p>
                    {notifyUsers && <p>• Users will be notified about the merge</p>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}