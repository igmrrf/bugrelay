import { apiClient } from './client'
import type { Company, CompanyFilters, CompanyMember } from '@/lib/stores/company-store'

export interface CompanyListResponse {
  companies: Company[]
  totalCount: number
  hasNextPage: boolean
}

export interface ClaimCompanyData {
  email: string
  message?: string
}

export interface VerifyCompanyData {
  token: string
}

export interface AddMemberData {
  email: string
  role: 'admin' | 'member'
}

export interface UpdateMemberData {
  role: 'admin' | 'member'
}

export const companiesAPI = {
  // Company CRUD operations
  list: async (filters: CompanyFilters = {}): Promise<CompanyListResponse> => {
    const params = new URLSearchParams()
    
    if (filters.search) params.append('search', filters.search)
    if (filters.verified !== undefined) params.append('verified', filters.verified.toString())
    // Note: sortBy is not supported by the backend yet
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())

    const response = await apiClient.get<{companies: Company[], pagination: any}>(`/companies/?${params.toString()}`)
    return {
      companies: response.companies,
      totalCount: response.pagination.total,
      hasNextPage: response.pagination.has_next
    }
  },

  get: async (id: string): Promise<Company> => {
    return apiClient.get(`/companies/${id}`)
  },

  // Company claiming and verification
  claim: async (id: string, data: ClaimCompanyData): Promise<{ message: string }> => {
    return apiClient.post(`/companies/${id}/claim`, data)
  },

  verify: async (id: string, data: VerifyCompanyData): Promise<Company> => {
    return apiClient.post(`/companies/${id}/verify`, data)
  },

  // Member management
  getMembers: async (companyId: string): Promise<CompanyMember[]> => {
    return apiClient.get(`/companies/${companyId}/members`)
  },

  addMember: async (companyId: string, data: AddMemberData): Promise<CompanyMember> => {
    return apiClient.post(`/companies/${companyId}/members`, data)
  },

  removeMember: async (companyId: string, memberId: string): Promise<void> => {
    return apiClient.delete(`/companies/${companyId}/members/${memberId}`)
  },

  updateMemberRole: async (
    companyId: string, 
    memberId: string, 
    data: UpdateMemberData
  ): Promise<CompanyMember> => {
    return apiClient.patch(`/companies/${companyId}/members/${memberId}`, data)
  },

  // Company bug management
  getBugs: async (companyId: string, filters: {
    status?: string[]
    priority?: string[]
    page?: number
    limit?: number
  } = {}): Promise<{
    bugs: Array<{
      id: string
      title: string
      status: string
      priority: string
      voteCount: number
      commentCount: number
      createdAt: string
      application: {
        id: string
        name: string
      }
    }>
    totalCount: number
    hasNextPage: boolean
  }> => {
    const params = new URLSearchParams()
    
    if (filters.status?.length) params.append('status', filters.status.join(','))
    if (filters.priority?.length) params.append('priority', filters.priority.join(','))
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())

    return apiClient.get(`/companies/${companyId}/bugs?${params.toString()}`)
  },

  updateBugStatus: async (
    companyId: string, 
    bugId: string, 
    status: 'open' | 'reviewing' | 'fixed' | 'wont_fix',
    response?: string
  ): Promise<{
    bug: {
      id: string
      status: string
    }
    message: string
  }> => {
    return apiClient.patch(`/companies/${companyId}/bugs/${bugId}/status`, {
      status,
      response
    })
  },

  // Company applications
  getApplications: async (companyId: string): Promise<Array<{
    id: string
    name: string
    url?: string
    bugCount: number
    openBugCount: number
    createdAt: string
  }>> => {
    return apiClient.get(`/companies/${companyId}/applications`)
  },

  claimApplication: async (companyId: string, applicationId: string): Promise<{
    message: string
  }> => {
    return apiClient.post(`/companies/${companyId}/applications/${applicationId}/claim`)
  },

  // Company settings
  updateSettings: async (companyId: string, settings: {
    name?: string
    description?: string
    website?: string
    supportEmail?: string
    publicProfile?: boolean
    autoRespond?: boolean
    responseTemplate?: string
  }): Promise<Company> => {
    return apiClient.patch(`/companies/${companyId}/settings`, settings)
  },

  // Company analytics
  getAnalytics: async (companyId: string, timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<{
    totalBugs: number
    openBugs: number
    resolvedBugs: number
    avgResolutionTime: number
    bugTrends: Array<{
      date: string
      opened: number
      resolved: number
    }>
    topApplications: Array<{
      id: string
      name: string
      bugCount: number
    }>
    responseMetrics: {
      avgResponseTime: number
      responseRate: number
    }
  }> => {
    return apiClient.get(`/companies/${companyId}/analytics?timeRange=${timeRange}`)
  },

  // Search companies
  search: async (query: string, limit = 10): Promise<Array<{
    id: string
    name: string
    domain: string
    isVerified: boolean
    bugCount: number
  }>> => {
    return apiClient.get(`/companies/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  // Company verification status
  getVerificationStatus: async (companyId: string): Promise<{
    isVerified: boolean
    verificationMethod: string
    verifiedAt?: string
    pendingVerification: boolean
    verificationEmail?: string
  }> => {
    return apiClient.get(`/companies/${companyId}/verification-status`)
  },

  // Resend verification email
  resendVerification: async (companyId: string): Promise<{ message: string }> => {
    return apiClient.post(`/companies/${companyId}/resend-verification`)
  },
}