"use client"

import * as React from "react"
import { Check, Clock, X, AlertCircle, MessageSquare, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingSpinner } from "@/components/ui/loading"

interface BugStatusManagerProps {
  bug?: BugForManagement
  onUpdateStatus?: (data: StatusUpdateData) => Promise<void>
  onAddResponse?: (response: string) => Promise<void>
  isLoading?: boolean
  error?: string
  canManage?: boolean
}

export interface BugForManagement {
  id: string
  title: string
  description: string
  status: "open" | "reviewing" | "fixed" | "wont_fix"
  priority: "low" | "medium" | "high" | "critical"
  createdAt: string
  updatedAt: string
  
  application: {
    id: string
    name: string
  }
  
  reporter?: {
    name: string
    email?: string
  }
  
  statusHistory: {
    id: string
    status: "open" | "reviewing" | "fixed" | "wont_fix"
    changedAt: string
    changedBy: {
      name: string
      role: string
    }
    comment?: string
  }[]
  
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

export interface StatusUpdateData {
  bugId: string
  status: "open" | "reviewing" | "fixed" | "wont_fix"
  comment?: string
}

const statusOptions = [
  {
    value: "open",
    label: "Open",
    description: "Bug is confirmed and needs to be addressed",
    icon: AlertCircle,
    color: "text-blue-600"
  },
  {
    value: "reviewing",
    label: "Reviewing",
    description: "Bug is being investigated by the team",
    icon: Clock,
    color: "text-yellow-600"
  },
  {
    value: "fixed",
    label: "Fixed",
    description: "Bug has been resolved and deployed",
    icon: Check,
    color: "text-green-600"
  },
  {
    value: "wont_fix",
    label: "Won't Fix",
    description: "Bug will not be addressed (by design, duplicate, etc.)",
    icon: X,
    color: "text-gray-600"
  }
]

export const BugStatusManager: React.FC<BugStatusManagerProps> = ({
  bug,
  onUpdateStatus,
  onAddResponse,
  isLoading = false,
  error,
  canManage = false
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState<string>("")
  const [statusComment, setStatusComment] = React.useState("")
  const [response, setResponse] = React.useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)
  const [isAddingResponse, setIsAddingResponse] = React.useState(false)

  React.useEffect(() => {
    if (bug) {
      setSelectedStatus(bug.status)
    }
  }, [bug])

  const handleStatusUpdate = async () => {
    if (!onUpdateStatus || !bug || selectedStatus === bug.status) return
    
    setIsUpdatingStatus(true)
    try {
      await onUpdateStatus({
        bugId: bug.id,
        status: selectedStatus as any,
        comment: statusComment.trim() || undefined
      })
      setStatusComment("")
    } catch (err) {
      console.error("Failed to update status:", err)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleAddResponse = async () => {
    if (!onAddResponse || !response.trim()) return
    
    setIsAddingResponse(true)
    try {
      await onAddResponse(response.trim())
      setResponse("")
    } catch (err) {
      console.error("Failed to add response:", err)
    } finally {
      setIsAddingResponse(false)
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

  const getStatusOption = (status: string) => {
    return statusOptions.find(option => option.value === status)
  }

  if (!bug) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Bug not found</p>
        </CardContent>
      </Card>
    )
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bug Status</CardTitle>
          <CardDescription>
            You don't have permission to manage this bug report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <StatusBadge status={bug.status} />
            <span className="text-sm text-muted-foreground">
              Last updated {formatDate(bug.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Update */}
      <Card>
        <CardHeader>
          <CardTitle>Update Bug Status</CardTitle>
          <CardDescription>
            Change the status of this bug report and add a comment for the reporter
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comment (Optional)
            </label>
            <Textarea
              placeholder="Add a comment about this status change..."
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This comment will be visible to the bug reporter and other users
            </p>
          </div>

          <Button
            onClick={handleStatusUpdate}
            disabled={isUpdatingStatus || selectedStatus === bug.status}
            className="w-full"
          >
            {isUpdatingStatus ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Updating status...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Add Response */}
      <Card>
        <CardHeader>
          <CardTitle>Add Company Response</CardTitle>
          <CardDescription>
            Respond to the bug reporter with additional information or updates
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Response</label>
            <Textarea
              placeholder="Write a response to the bug reporter..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={isLoading}
              rows={4}
            />
          </div>

          <Button
            onClick={handleAddResponse}
            disabled={isAddingResponse || !response.trim()}
            className="w-full"
          >
            {isAddingResponse ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Adding response...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Response
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Status History</span>
          </CardTitle>
          <CardDescription>
            Track all status changes and comments for this bug
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {bug.statusHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No status changes yet
            </p>
          ) : (
            <div className="space-y-4">
              {bug.statusHistory.map((entry, index) => {
                const statusOption = getStatusOption(entry.status)
                const Icon = statusOption?.icon || AlertCircle
                
                return (
                  <div key={entry.id} className="flex space-x-3">
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full bg-muted ${statusOption?.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {index < bug.statusHistory.length - 1 && (
                        <div className="w-px h-8 bg-border mt-2" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={entry.status} />
                        <span className="text-sm font-medium">{entry.changedBy.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.changedBy.role}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.changedAt)}
                      </p>
                      
                      {entry.comment && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          {entry.comment}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Responses */}
      {bug.companyResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Responses</CardTitle>
            <CardDescription>
              All responses from your team to this bug report
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {bug.companyResponses.map((response) => (
              <div key={response.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{response.user.name}</span>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}