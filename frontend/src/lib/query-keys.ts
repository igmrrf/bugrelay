/**
 * Query keys factory for type-safe query management
 * Follows TanStack Query best practices for key organization
 */

export const queryKeys = {
  // Auth queries
  auth: {
    all: ['auth'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },

  // Bug queries
  bugs: {
    all: ['bugs'] as const,
    lists: () => [...queryKeys.bugs.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.bugs.lists(), filters] as const,
    details: () => [...queryKeys.bugs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bugs.details(), id] as const,
    comments: (bugId: string) => [...queryKeys.bugs.detail(bugId), 'comments'] as const,
    votes: (bugId: string) => [...queryKeys.bugs.detail(bugId), 'votes'] as const,
  },

  // Company queries
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.companies.lists(), filters || {}] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    members: (companyId: string) => [...queryKeys.companies.detail(companyId), 'members'] as const,
    bugs: (companyId: string, filters?: Record<string, any>) =>
      [...queryKeys.companies.detail(companyId), 'bugs', filters || {}] as const,
  },

  // Application queries
  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.applications.lists(), filters || {}] as const,
    details: () => [...queryKeys.applications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.applications.details(), id] as const,
  },

  // Admin queries
  admin: {
    all: ['admin'] as const,
    auditLogs: (filters?: Record<string, any>) => [...queryKeys.admin.all, 'audit-logs', filters || {}] as const,
    moderationQueue: () => [...queryKeys.admin.all, 'moderation-queue'] as const,
    duplicates: () => [...queryKeys.admin.all, 'duplicates'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
  },

  // User queries
  users: {
    all: ['users'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    activity: (userId: string) => [...queryKeys.users.detail(userId), 'activity'] as const,
  },
} as const

// Type helpers for query keys
export type QueryKey = typeof queryKeys

// Helper type to extract function return types from query key objects
type ExtractFunctionReturnTypes<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? ReturnType<T[K]> : T[K]
}[keyof T]

export type AuthQueryKey = ExtractFunctionReturnTypes<typeof queryKeys.auth>
export type BugQueryKey = ExtractFunctionReturnTypes<typeof queryKeys.bugs>
export type CompanyQueryKey = ExtractFunctionReturnTypes<typeof queryKeys.companies>