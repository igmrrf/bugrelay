import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useBugStore, useCompanyStore } from '@/lib/stores'
import { queryKeys } from '@/lib/query-keys'
import type { User } from '@/lib/stores/auth-store'
import type { BugReport } from '@/lib/stores/bug-store'
import type { Company } from '@/lib/stores/company-store'

/**
 * Synchronization manager to keep Zustand stores in sync with TanStack Query cache
 * This ensures consistent state across the application
 */
export class SyncManager {
  private queryClient: any

  constructor(queryClient: any) {
    this.queryClient = queryClient
  }

  // Sync auth state with query cache
  syncAuthState = (user: User | null) => {
    if (user) {
      this.queryClient.setQueryData(queryKeys.auth.profile(), user)
    } else {
      this.queryClient.removeQueries({ queryKey: queryKeys.auth.all })
    }
  }

  // Sync bug state with query cache
  syncBugState = (bugs: BugReport[]) => {
    // Update individual bug caches
    bugs.forEach(bug => {
      this.queryClient.setQueryData(queryKeys.bugs.detail(bug.id), bug)
    })
  }

  // Sync single bug with cache
  syncBug = (bug: BugReport) => {
    this.queryClient.setQueryData(queryKeys.bugs.detail(bug.id), bug)
    
    // Update bug in list queries
    this.queryClient.setQueriesData(
      { queryKey: queryKeys.bugs.lists() },
      (oldData: any) => {
        if (!oldData?.bugs) return oldData
        
        const updatedBugs = oldData.bugs.map((b: BugReport) => 
          b.id === bug.id ? bug : b
        )
        
        return { ...oldData, bugs: updatedBugs }
      }
    )
  }

  // Sync company state with query cache
  syncCompanyState = (companies: Company[]) => {
    companies.forEach(company => {
      this.queryClient.setQueryData(queryKeys.companies.detail(company.id), company)
    })
  }

  // Sync single company with cache
  syncCompany = (company: Company) => {
    this.queryClient.setQueryData(queryKeys.companies.detail(company.id), company)
    
    // Update company in list queries
    this.queryClient.setQueriesData(
      { queryKey: queryKeys.companies.lists() },
      (oldData: any) => {
        if (!oldData?.companies) return oldData
        
        const updatedCompanies = oldData.companies.map((c: Company) => 
          c.id === company.id ? company : c
        )
        
        return { ...oldData, companies: updatedCompanies }
      }
    )
  }

  // Invalidate related queries when data changes
  invalidateRelatedQueries = (type: 'bug' | 'company' | 'user', id?: string) => {
    switch (type) {
      case 'bug':
        this.queryClient.invalidateQueries({ queryKey: queryKeys.bugs.lists() })
        if (id) {
          this.queryClient.invalidateQueries({ queryKey: queryKeys.bugs.detail(id) })
          this.queryClient.invalidateQueries({ queryKey: queryKeys.bugs.comments(id) })
        }
        break
      
      case 'company':
        this.queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() })
        if (id) {
          this.queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(id) })
          this.queryClient.invalidateQueries({ queryKey: queryKeys.companies.members(id) })
        }
        break
      
      case 'user':
        this.queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
        break
    }
  }

  // Clear all caches (useful for logout)
  clearAll = () => {
    this.queryClient.clear()
  }

  // Prefetch related data
  prefetchRelatedData = async (type: 'bug' | 'company', id: string) => {
    switch (type) {
      case 'bug':
        // Prefetch bug comments when viewing a bug
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.bugs.comments(id),
          staleTime: 2 * 60 * 1000 // 2 minutes
        })
        break
      
      case 'company':
        // Prefetch company members when viewing a company
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.companies.members(id),
          staleTime: 5 * 60 * 1000 // 5 minutes
        })
        break
    }
  }
}

/**
 * React hook to use the sync manager
 */
export const useSyncManager = () => {
  const queryClient = useQueryClient()
  const syncManager = new SyncManager(queryClient)

  return syncManager
}

/**
 * Hook to set up automatic synchronization between stores and query cache
 */
export const useAutoSync = () => {
  const syncManager = useSyncManager()
  const authStore = useAuthStore()
  const bugStore = useBugStore()
  const companyStore = useCompanyStore()

  // Set up store subscriptions for automatic sync
  React.useEffect(() => {
    // Sync auth changes
    const unsubscribeAuth = useAuthStore.subscribe(
      (state) => {
        syncManager.syncAuthState(state.user)
      }
    )

    // Sync bug changes
    const unsubscribeBugs = useBugStore.subscribe(
      (state) => {
        syncManager.syncBugState(state.bugs)
      }
    )

    // Sync company changes
    const unsubscribeCompanies = useCompanyStore.subscribe(
      (state) => {
        syncManager.syncCompanyState(state.companies)
      }
    )

    return () => {
      unsubscribeAuth()
      unsubscribeBugs()
      unsubscribeCompanies()
    }
  }, [syncManager])

  return syncManager
}

