import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/stores'
import { wsClient } from './websocket-client'

/**
 * Hook to manage WebSocket connection lifecycle
 */
export const useWebSocketConnection = () => {
  const { isAuthenticated, user } = useAuthStore()
  const wasAuthenticated = useRef(false)

  useEffect(() => {
    // Connect when user becomes authenticated
    if (isAuthenticated && user && !wasAuthenticated.current) {
      wsClient.connect()
      wasAuthenticated.current = true
    }
    
    // Disconnect when user logs out
    if (!isAuthenticated && wasAuthenticated.current) {
      wsClient.disconnect()
      wasAuthenticated.current = false
    }

    // Cleanup on unmount
    return () => {
      if (wasAuthenticated.current) {
        wsClient.disconnect()
      }
    }
  }, [isAuthenticated, user])

  return {
    isConnected: wsClient.isConnected(),
    connect: () => wsClient.connect(),
    disconnect: () => wsClient.disconnect()
  }
}

/**
 * Hook to subscribe to real-time bug updates
 */
export const useBugRealtime = (bugId: string | null) => {
  const { isAuthenticated } = useAuthStore()
  const subscribedBugId = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !bugId || !wsClient.isConnected()) {
      return
    }

    // Unsubscribe from previous bug if different
    if (subscribedBugId.current && subscribedBugId.current !== bugId) {
      wsClient.unsubscribeFromBug(subscribedBugId.current)
    }

    // Subscribe to new bug
    if (bugId !== subscribedBugId.current) {
      wsClient.subscribeToBug(bugId)
      subscribedBugId.current = bugId
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (subscribedBugId.current) {
        wsClient.unsubscribeFromBug(subscribedBugId.current)
        subscribedBugId.current = null
      }
    }
  }, [bugId, isAuthenticated])

  return {
    isSubscribed: subscribedBugId.current === bugId,
    subscribe: (id: string) => wsClient.subscribeToBug(id),
    unsubscribe: (id: string) => wsClient.unsubscribeFromBug(id)
  }
}

/**
 * Hook to subscribe to real-time company updates
 */
export const useCompanyRealtime = (companyId: string | null) => {
  const { isAuthenticated } = useAuthStore()
  const subscribedCompanyId = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !companyId || !wsClient.isConnected()) {
      return
    }

    // Unsubscribe from previous company if different
    if (subscribedCompanyId.current && subscribedCompanyId.current !== companyId) {
      wsClient.unsubscribeFromCompany(subscribedCompanyId.current)
    }

    // Subscribe to new company
    if (companyId !== subscribedCompanyId.current) {
      wsClient.subscribeToCompany(companyId)
      subscribedCompanyId.current = companyId
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (subscribedCompanyId.current) {
        wsClient.unsubscribeFromCompany(subscribedCompanyId.current)
        subscribedCompanyId.current = null
      }
    }
  }, [companyId, isAuthenticated])

  return {
    isSubscribed: subscribedCompanyId.current === companyId,
    subscribe: (id: string) => wsClient.subscribeToCompany(id),
    unsubscribe: (id: string) => wsClient.unsubscribeFromCompany(id)
  }
}