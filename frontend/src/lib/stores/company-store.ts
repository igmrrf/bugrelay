'use client'

import { create } from 'zustand'
import { loadingManager } from '@/lib/loading-manager'

export interface Company {
  id: string
  name: string
  domain: string
  isVerified: boolean
  verificationToken?: string
  verificationEmail?: string
  verifiedAt?: string
  members: CompanyMember[]
  createdAt: string
  updatedAt: string
}

export interface CompanyMember {
  id: string
  companyId: string
  userId: string
  role: 'admin' | 'member'
  user: {
    id: string
    displayName: string
    email: string
    avatarUrl?: string
  }
  addedAt: string
}

export interface CompanyFilters {
  search?: string
  verified?: boolean
  sortBy?: 'name' | 'created' | 'bugs'
  page?: number
  limit?: number
}

interface CompanyState {
  // Company data
  companies: Company[]
  selectedCompany: Company | null
  
  // Filters and pagination
  filters: CompanyFilters
  totalCount: number
  hasNextPage: boolean
  
  // Actions
  setCompanies: (companies: Company[]) => void
  addCompany: (company: Company) => void
  updateCompany: (id: string, updates: Partial<Company>) => void
  removeCompany: (id: string) => void
  setSelectedCompany: (company: Company | null) => void
  
  // Member management
  addMember: (companyId: string, member: CompanyMember) => void
  removeMember: (companyId: string, memberId: string) => void
  updateMemberRole: (companyId: string, memberId: string, role: 'admin' | 'member') => void
  
  // Filters and pagination
  setFilters: (filters: Partial<CompanyFilters>) => void
  clearFilters: () => void
  setPagination: (totalCount: number, hasNextPage: boolean) => void
  
  // Computed getters
  isLoading: () => boolean
  getCompanyById: (id: string) => Company | undefined
  getUserCompanies: (userId: string) => Company[]
  canManageCompany: (companyId: string, userId: string) => boolean
}

const initialFilters: CompanyFilters = {
  sortBy: 'name',
  page: 1,
  limit: 20
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  // Initial state
  companies: [],
  selectedCompany: null,
  filters: initialFilters,
  totalCount: 0,
  hasNextPage: false,

  // Company management actions
  setCompanies: (companies) => set({ companies }),

  addCompany: (company) => set((state) => ({ 
    companies: [...state.companies, company],
    totalCount: state.totalCount + 1
  })),

  updateCompany: (id, updates) => set((state) => ({
    companies: state.companies.map(company => 
      company.id === id ? { ...company, ...updates } : company
    ),
    selectedCompany: state.selectedCompany?.id === id 
      ? { ...state.selectedCompany, ...updates } 
      : state.selectedCompany
  })),

  removeCompany: (id) => set((state) => ({
    companies: state.companies.filter(company => company.id !== id),
    selectedCompany: state.selectedCompany?.id === id ? null : state.selectedCompany,
    totalCount: Math.max(0, state.totalCount - 1)
  })),

  setSelectedCompany: (selectedCompany) => set({ selectedCompany }),

  // Member management
  addMember: (companyId, member) => set((state) => ({
    companies: state.companies.map(company => 
      company.id === companyId 
        ? { ...company, members: [...company.members, member] }
        : company
    ),
    selectedCompany: state.selectedCompany?.id === companyId
      ? { ...state.selectedCompany, members: [...state.selectedCompany.members, member] }
      : state.selectedCompany
  })),

  removeMember: (companyId, memberId) => set((state) => ({
    companies: state.companies.map(company => 
      company.id === companyId 
        ? { ...company, members: company.members.filter(m => m.id !== memberId) }
        : company
    ),
    selectedCompany: state.selectedCompany?.id === companyId
      ? { ...state.selectedCompany, members: state.selectedCompany.members.filter(m => m.id !== memberId) }
      : state.selectedCompany
  })),

  updateMemberRole: (companyId, memberId, role) => set((state) => ({
    companies: state.companies.map(company => 
      company.id === companyId 
        ? { 
            ...company, 
            members: company.members.map(m => 
              m.id === memberId ? { ...m, role } : m
            )
          }
        : company
    ),
    selectedCompany: state.selectedCompany?.id === companyId
      ? { 
          ...state.selectedCompany, 
          members: state.selectedCompany.members.map(m => 
            m.id === memberId ? { ...m, role } : m
          )
        }
      : state.selectedCompany
  })),

  // Filter actions
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters, page: 1 }
  })),

  clearFilters: () => set({ filters: { ...initialFilters } }),

  // Pagination actions
  setPagination: (totalCount, hasNextPage) => set({ totalCount, hasNextPage }),

  // Computed getters
  isLoading: () => {
    return loadingManager.isLoading('companies.list') || 
           loadingManager.isLoading('companies.claim') || 
           loadingManager.isLoading('companies.verify') ||
           loadingManager.isLoading('companies.members')
  },

  getCompanyById: (id: string) => {
    return get().companies.find(company => company.id === id)
  },

  getUserCompanies: (userId: string) => {
    return get().companies.filter(company => 
      company.members.some(member => member.userId === userId)
    )
  },

  canManageCompany: (companyId: string, userId: string) => {
    const company = get().getCompanyById(companyId)
    if (!company) return false
    
    const member = company.members.find(m => m.userId === userId)
    return member?.role === 'admin' || false
  },
}))