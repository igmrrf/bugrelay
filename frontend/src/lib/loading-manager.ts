import { useUIStore } from '@/lib/stores'

export type LoadingKey = 
  | 'auth.login'
  | 'auth.register'
  | 'auth.logout'
  | 'auth.refresh'
  | 'bugs.list'
  | 'bugs.create'
  | 'bugs.update'
  | 'bugs.delete'
  | 'bugs.vote'
  | 'bugs.comments'
  | 'companies.list'
  | 'companies.claim'
  | 'companies.verify'
  | 'companies.members'
  | 'admin.moderate'
  | 'admin.merge'
  | 'file.upload'
  | string // Allow custom keys

export const loadingManager = {
  // Start loading for a specific operation
  start: (key: LoadingKey) => {
    const { setLoading } = useUIStore.getState()
    setLoading(key, true)
  },

  // Stop loading for a specific operation
  stop: (key: LoadingKey) => {
    const { setLoading } = useUIStore.getState()
    setLoading(key, false)
  },

  // Check if a specific operation is loading
  isLoading: (key: LoadingKey): boolean => {
    const { loadingStates } = useUIStore.getState()
    return loadingStates[key] || false
  },

  // Check if any operation is loading
  isAnyLoading: (): boolean => {
    const { loadingStates } = useUIStore.getState()
    return Object.values(loadingStates).some(Boolean)
  },

  // Clear all loading states
  clearAll: () => {
    const { loadingStates } = useUIStore.getState()
    Object.keys(loadingStates).forEach(key => {
      loadingManager.stop(key)
    })
  },

  // Wrap an async function with loading state management
  withLoading: <T extends (...args: any[]) => Promise<any>>(
    key: LoadingKey,
    fn: T
  ): T => {
    return (async (...args: Parameters<T>) => {
      loadingManager.start(key)
      try {
        const result = await fn(...args)
        return result
      } finally {
        loadingManager.stop(key)
      }
    }) as T
  },

  // Create a loading hook for React components
  useLoading: (key: LoadingKey) => {
    const { loadingStates } = useUIStore()
    return loadingStates[key] || false
  },

  // Create multiple loading states hook
  useLoadingStates: (keys: LoadingKey[]) => {
    const { loadingStates } = useUIStore()
    return keys.reduce((acc, key) => {
      acc[key] = loadingStates[key] || false
      return acc
    }, {} as Record<LoadingKey, boolean>)
  },

  // Get loading state for a category (e.g., all 'bugs.*' operations)
  getCategoryLoading: (category: string): boolean => {
    const { loadingStates } = useUIStore.getState()
    return Object.keys(loadingStates).some(key => 
      key.startsWith(category + '.') && loadingStates[key]
    )
  }
}

// React hook for loading states
export const useLoadingManager = () => {
  const { loadingStates, setLoading } = useUIStore()

  return {
    loadingStates,
    isLoading: (key: LoadingKey) => loadingStates[key] || false,
    isAnyLoading: () => Object.values(loadingStates).some(Boolean),
    start: (key: LoadingKey) => setLoading(key, true),
    stop: (key: LoadingKey) => setLoading(key, false),
    withLoading: loadingManager.withLoading,
  }
}