import { apiClient } from './client'

export interface AuditLog {
  id: string
  action: string
  entityType: 'bug' | 'company' | 'user' | 'comment'
  entityId: string
  userId: string
  user: {
    id: string
    displayName: string
    email: string
  }
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  createdAt: string
}

export interface ModerationItem {
  id: string
  type: 'bug' | 'comment'
  entityId: string
  reason: string
  reportedBy: {
    id: string
    displayName: string
  }
  status: 'pending' | 'approved' | 'rejected'
  content: {
    title?: string
    description?: string
    content?: string
  }
  createdAt: string
}

export interface DuplicateBug {
  id: string
  title: string
  description: string
  voteCount: number
  commentCount: number
  createdAt: string
  application: {
    id: string
    name: string
  }
  similarity: number
  potentialDuplicates: Array<{
    id: string
    title: string
    similarity: number
  }>
}

export interface AdminStats {
  totalUsers: number
  totalBugs: number
  totalCompanies: number
  verifiedCompanies: number
  pendingModerations: number
  recentActivity: Array<{
    date: string
    users: number
    bugs: number
    companies: number
  }>
  topApplications: Array<{
    id: string
    name: string
    bugCount: number
  }>
  userGrowth: Array<{
    date: string
    count: number
  }>
}

export const adminAPI = {
  // Dashboard and analytics
  getStats: async (timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<AdminStats> => {
    return apiClient.get(`/admin/stats?timeRange=${timeRange}`)
  },

  // Audit logs
  getAuditLogs: async (filters: {
    action?: string
    entityType?: string
    userId?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  } = {}): Promise<{
    logs: AuditLog[]
    totalCount: number
    hasNextPage: boolean
  }> => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    return apiClient.get(`/admin/audit-logs?${params.toString()}`)
  },

  // Content moderation
  getModerationQueue: async (filters: {
    type?: 'bug' | 'comment'
    status?: 'pending' | 'approved' | 'rejected'
    page?: number
    limit?: number
  } = {}): Promise<{
    items: ModerationItem[]
    totalCount: number
    hasNextPage: boolean
  }> => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    return apiClient.get(`/admin/moderation?${params.toString()}`)
  },

  moderateContent: async (
    itemId: string, 
    action: 'approve' | 'reject' | 'delete',
    reason?: string
  ): Promise<{ message: string }> => {
    return apiClient.post(`/admin/moderation/${itemId}`, { action, reason })
  },

  // Bug management
  flagBug: async (bugId: string, reason: string): Promise<{ message: string }> => {
    return apiClient.post(`/admin/bugs/${bugId}/flag`, { reason })
  },

  deleteBug: async (bugId: string, reason: string): Promise<{ message: string }> => {
    return apiClient.delete(`/admin/bugs/${bugId}`, { data: { reason } })
  },

  // Duplicate management
  getDuplicateBugs: async (threshold = 0.8): Promise<DuplicateBug[]> => {
    return apiClient.get(`/admin/duplicates?threshold=${threshold}`)
  },

  mergeBugs: async (
    primaryBugId: string, 
    duplicateBugIds: string[],
    mergeComments = true,
    mergeVotes = true
  ): Promise<{
    mergedBug: {
      id: string
      title: string
      voteCount: number
      commentCount: number
    }
    message: string
  }> => {
    return apiClient.post(`/admin/bugs/merge`, {
      primaryBugId,
      duplicateBugIds,
      mergeComments,
      mergeVotes
    })
  },

  // User management
  getUsers: async (filters: {
    search?: string
    isAdmin?: boolean
    isEmailVerified?: boolean
    authProvider?: string
    page?: number
    limit?: number
  } = {}): Promise<{
    users: Array<{
      id: string
      email: string
      displayName: string
      isAdmin: boolean
      isEmailVerified: boolean
      authProvider: string
      createdAt: string
      lastActiveAt: string
      bugCount: number
      commentCount: number
    }>
    totalCount: number
    hasNextPage: boolean
  }> => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    return apiClient.get(`/admin/users?${params.toString()}`)
  },

  updateUserRole: async (userId: string, isAdmin: boolean): Promise<{ message: string }> => {
    return apiClient.patch(`/admin/users/${userId}/role`, { isAdmin })
  },

  suspendUser: async (userId: string, reason: string, duration?: string): Promise<{ message: string }> => {
    return apiClient.post(`/admin/users/${userId}/suspend`, { reason, duration })
  },

  unsuspendUser: async (userId: string): Promise<{ message: string }> => {
    return apiClient.post(`/admin/users/${userId}/unsuspend`)
  },

  // Company management
  getCompanies: async (filters: {
    search?: string
    isVerified?: boolean
    page?: number
    limit?: number
  } = {}): Promise<{
    companies: Array<{
      id: string
      name: string
      domain: string
      isVerified: boolean
      memberCount: number
      bugCount: number
      createdAt: string
    }>
    totalCount: number
    hasNextPage: boolean
  }> => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    return apiClient.get(`/admin/companies?${params.toString()}`)
  },

  verifyCompany: async (companyId: string, verified: boolean): Promise<{ message: string }> => {
    return apiClient.patch(`/admin/companies/${companyId}/verify`, { verified })
  },

  // System management
  getSystemHealth: async (): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    services: Record<string, {
      status: 'up' | 'down'
      responseTime?: number
      lastCheck: string
    }>
    metrics: {
      activeUsers: number
      requestsPerMinute: number
      errorRate: number
      memoryUsage: number
      cpuUsage: number
    }
  }> => {
    return apiClient.get('/admin/system/health')
  },

  // Bulk operations
  bulkDeleteBugs: async (bugIds: string[], reason: string): Promise<{
    deleted: number
    failed: number
    errors: string[]
  }> => {
    return apiClient.delete('/admin/bugs/bulk', { data: { bugIds, reason } })
  },

  bulkUpdateBugStatus: async (
    bugIds: string[], 
    status: string,
    reason?: string
  ): Promise<{
    updated: number
    failed: number
    errors: string[]
  }> => {
    return apiClient.patch('/admin/bugs/bulk/status', { bugIds, status, reason })
  },

  // Export data
  exportAuditLogs: async (filters: {
    startDate?: string
    endDate?: string
    format?: 'csv' | 'json'
  } = {}): Promise<Blob> => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    const response = await apiClient.getClient().get(`/admin/export/audit-logs?${params.toString()}`, {
      responseType: 'blob'
    })
    
    return response.data
  },
}