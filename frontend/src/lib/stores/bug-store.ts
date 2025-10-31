'use client'

import { create } from 'zustand'
import { loadingManager } from '@/lib/loading-manager'

export interface BugReport {
  id: string
  title: string
  description: string
  status: 'open' | 'reviewing' | 'fixed' | 'wont_fix'
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  
  // Technical details
  operatingSystem?: string
  deviceType?: string
  appVersion?: string
  browserVersion?: string
  
  // Associations
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
  reporter?: {
    id: string
    displayName: string
    avatarUrl?: string
  }
  
  // Engagement
  voteCount: number
  commentCount: number
  hasUserVoted?: boolean
  
  // Media
  screenshots: FileAttachment[]
  
  // Timestamps
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface FileAttachment {
  id: string
  filename: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}

export interface BugFilters {
  search?: string
  status?: string[]
  priority?: string[]
  tags?: string[]
  applicationId?: string
  companyId?: string
  sortBy?: 'recent' | 'popular' | 'trending'
  page?: number
  limit?: number
}

interface BugState {
  // Bug lists
  bugs: BugReport[]
  selectedBug: BugReport | null
  
  // Filters and pagination
  filters: BugFilters
  totalCount: number
  hasNextPage: boolean
  
  // Actions
  setBugs: (bugs: BugReport[]) => void
  addBug: (bug: BugReport) => void
  updateBug: (id: string, updates: Partial<BugReport>) => void
  removeBug: (id: string) => void
  setSelectedBug: (bug: BugReport | null) => void
  
  setFilters: (filters: Partial<BugFilters>) => void
  clearFilters: () => void
  resetFilters: () => void
  
  setPagination: (totalCount: number, hasNextPage: boolean) => void
  
  // Vote actions
  toggleVote: (bugId: string) => void
  updateVoteCount: (bugId: string, count: number, hasUserVoted: boolean) => void
  
  // Optimistic updates
  optimisticVote: (bugId: string) => void
  optimisticComment: (bugId: string) => void
  
  // Computed getters
  isLoading: () => boolean
  getFilteredBugs: () => BugReport[]
  getBugById: (id: string) => BugReport | undefined
}

const initialFilters: BugFilters = {
  sortBy: 'recent',
  page: 1,
  limit: 20
}

export const useBugStore = create<BugState>((set, get) => ({
  // Initial state
  bugs: [],
  selectedBug: null,
  filters: initialFilters,
  totalCount: 0,
  hasNextPage: false,

  // Bug management actions
  setBugs: (bugs) => set({ bugs }),

  addBug: (bug) => set((state) => ({ 
    bugs: [bug, ...state.bugs],
    totalCount: state.totalCount + 1
  })),

  updateBug: (id, updates) => set((state) => ({
    bugs: state.bugs.map(bug => 
      bug.id === id ? { ...bug, ...updates } : bug
    ),
    selectedBug: state.selectedBug?.id === id 
      ? { ...state.selectedBug, ...updates } 
      : state.selectedBug
  })),

  removeBug: (id) => set((state) => ({
    bugs: state.bugs.filter(bug => bug.id !== id),
    selectedBug: state.selectedBug?.id === id ? null : state.selectedBug,
    totalCount: Math.max(0, state.totalCount - 1)
  })),

  setSelectedBug: (selectedBug) => set({ selectedBug }),

  // Filter actions
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters, page: 1 } // Reset to first page when filters change
  })),

  clearFilters: () => set({ filters: { ...initialFilters } }),

  resetFilters: () => set({ 
    filters: initialFilters,
    bugs: [],
    totalCount: 0,
    hasNextPage: false
  }),

  // Pagination actions
  setPagination: (totalCount, hasNextPage) => set({ totalCount, hasNextPage }),

  // Vote actions with optimistic updates
  toggleVote: (bugId) => {
    const state = get()
    const bug = state.bugs.find(b => b.id === bugId)
    if (!bug) return

    const hasUserVoted = !bug.hasUserVoted
    const voteCount = hasUserVoted ? bug.voteCount + 1 : bug.voteCount - 1

    state.updateBug(bugId, { hasUserVoted, voteCount })
  },

  updateVoteCount: (bugId, voteCount, hasUserVoted) => {
    get().updateBug(bugId, { voteCount, hasUserVoted })
  },

  // Optimistic updates
  optimisticVote: (bugId) => {
    get().toggleVote(bugId)
  },

  optimisticComment: (bugId) => {
    const state = get()
    const bug = state.bugs.find(b => b.id === bugId)
    if (bug) {
      state.updateBug(bugId, { commentCount: bug.commentCount + 1 })
    }
  },

  // Computed getters
  isLoading: () => {
    return loadingManager.isLoading('bugs.list') || 
           loadingManager.isLoading('bugs.create') || 
           loadingManager.isLoading('bugs.update')
  },

  getFilteredBugs: () => {
    const { bugs, filters } = get()
    let filtered = [...bugs]

    // Apply client-side filtering if needed
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(bug => 
        bug.title.toLowerCase().includes(searchLower) ||
        bug.description.toLowerCase().includes(searchLower) ||
        bug.application.name.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  },

  getBugById: (id: string) => {
    return get().bugs.find(bug => bug.id === id)
  },
}))