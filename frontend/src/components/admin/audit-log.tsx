"use client"

import * as React from "react"
import { History, Filter, Download, Search, Eye, User, Building2, Flag, GitMerge, Bug, MessageSquare } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingState } from "@/components/ui/loading"
import { ErrorMessage } from "@/components/ui/error-boundary"

interface AuditLogProps {
  logs?: AuditLogEntry[]
  isLoading?: boolean
  error?: string
  onLoadMore?: () => void
  onExport?: (filters: AuditFilters) => Promise<void>
  onFilter?: (filters: AuditFilters) => void
  hasMore?: boolean
  totalCount?: number
}

export interface AuditLogEntry {
  id: string
  action: string
  resource: string
  resourceId: string
  timestamp: string
  
  user: {
    id: string
    name: string
    email: string
    role: "admin" | "user" | "company_member"
  }
  
  details: {
    before?: Record<string, any>
    after?: Record<string, any>
    metadata?: Record<string, any>
  }
  
  ipAddress: string
  userAgent: string
}

export interface AuditFilters {
  action?: string
  resource?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

const actionTypes = [
  "bug_created",
  "bug_updated", 
  "bug_deleted",
  "bug_merged",
  "comment_created",
  "comment_updated",
  "comment_deleted",
  "company_claimed",
  "company_verified",
  "user_registered",
  "user_updated",
  "content_moderated",
  "admin_action"
]

const resourceTypes = [
  "bug",
  "comment", 
  "company",
  "user",
  "application"
]

export const AuditLog: React.FC<AuditLogProps> = ({
  logs = [],
  isLoading = false,
  error,
  onLoadMore,
  onExport,
  onFilter,
  hasMore = false,
  totalCount
}) => {
  const [filters, setFilters] = React.useState<AuditFilters>({})
  const [isExporting, setIsExporting] = React.useState(false)

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    if (onFilter) {
      onFilter(newFilters)
    }
  }

  const handleExport = async () => {
    if (!onExport) return
    
    setIsExporting(true)
    try {
      await onExport(filters)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const clearFilters = () => {
    setFilters({})
    if (onFilter) {
      onFilter({})
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    if (action.includes("bug")) return <Bug className="h-4 w-4" />
    if (action.includes("comment")) return <MessageSquare className="h-4 w-4" />
    if (action.includes("company")) return <Building2 className="h-4 w-4" />
    if (action.includes("user")) return <User className="h-4 w-4" />
    if (action.includes("moderated")) return <Flag className="h-4 w-4" />
    if (action.includes("merged")) return <GitMerge className="h-4 w-4" />
    return <History className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes("created")) return "text-green-600"
    if (action.includes("updated")) return "text-blue-600"
    if (action.includes("deleted")) return "text-red-600"
    if (action.includes("merged")) return "text-purple-600"
    return "text-gray-600"
  }

  if (isLoading && logs.length === 0) {
    return <LoadingState message="Loading audit logs..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load audit logs"
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
            <History className="h-8 w-8 text-primary" />
            <span>Audit Log</span>
          </h1>
          <p className="text-muted-foreground">
            Track all administrative actions and system changes
            {totalCount !== undefined && ` (${totalCount.toLocaleString()} entries)`}
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search logs..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filters.action || ""}
                onValueChange={(value) => handleFilterChange("action", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource</label>
              <Select
                value={filters.resource || ""}
                onValueChange={(value) => handleFilterChange("resource", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All resources</SelectItem>
                  {resourceTypes.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      {logs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
            <p className="text-muted-foreground">
              No audit log entries match your current filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((entry) => (
            <AuditLogItem key={entry.id} entry={entry} />
          ))}
          
          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
                Load More Entries
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface AuditLogItemProps {
  entry: AuditLogEntry
}

const AuditLogItem: React.FC<AuditLogItemProps> = ({ entry }) => {
  const [showDetails, setShowDetails] = React.useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    if (action.includes("bug")) return Bug
    if (action.includes("comment")) return MessageSquare
    if (action.includes("company")) return Building2
    if (action.includes("user")) return User
    if (action.includes("moderated")) return Flag
    if (action.includes("merged")) return GitMerge
    return History
  }

  const getActionColor = (action: string) => {
    if (action.includes("created")) return "text-green-600"
    if (action.includes("updated")) return "text-blue-600"
    if (action.includes("deleted")) return "text-red-600"
    if (action.includes("merged")) return "text-purple-600"
    return "text-gray-600"
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800"
      case "company_member": return "bg-blue-100 text-blue-800"
      case "user": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const Icon = getActionIcon(entry.action)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`p-2 rounded-full bg-muted ${getActionColor(entry.action)}`}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium">{entry.action.replace(/_/g, " ")}</span>
                <StatusBadge className="text-xs">
                  {entry.resource}
                </StatusBadge>
                <StatusBadge className={`text-xs ${getRoleColor(entry.user.role)}`}>
                  {entry.user.role.replace(/_/g, " ")}
                </StatusBadge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                By {entry.user.name} ({entry.user.email})
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{formatDate(entry.timestamp)}</span>
                <span>Resource ID: {entry.resourceId}</span>
                <span>IP: {entry.ipAddress}</span>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        
        {showDetails && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* User Agent */}
            <div>
              <h4 className="font-medium text-sm mb-1">User Agent</h4>
              <p className="text-xs text-muted-foreground font-mono">{entry.userAgent}</p>
            </div>
            
            {/* Before/After Changes */}
            {(entry.details.before || entry.details.after) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entry.details.before && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Before</h4>
                    <pre className="text-xs bg-red-50 border border-red-200 rounded p-2 overflow-auto">
                      {JSON.stringify(entry.details.before, null, 2)}
                    </pre>
                  </div>
                )}
                
                {entry.details.after && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">After</h4>
                    <pre className="text-xs bg-green-50 border border-green-200 rounded p-2 overflow-auto">
                      {JSON.stringify(entry.details.after, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Metadata */}
            {entry.details.metadata && Object.keys(entry.details.metadata).length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Metadata</h4>
                <pre className="text-xs bg-muted rounded p-2 overflow-auto">
                  {JSON.stringify(entry.details.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}