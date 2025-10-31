import React from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useBugStore, useUIStore, loadingManager, errorHandler } from '@/lib/stores'
import { queryKeys } from '@/lib/query-keys'
import { bugsAPI } from '@/lib/api'
import type { BugReport, BugFilters } from '@/lib/stores/bug-store'
import type { CreateBugData, UpdateBugData, Comment, BugListResponse } from '@/lib/api'

export const useBugs = (filters: BugFilters = {}) => {
  const { setBugs, setPagination } = useBugStore()

  const query = useQuery({
    queryKey: queryKeys.bugs.list(filters),
    queryFn: () => bugsAPI.list(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    meta: {
      errorMessage: 'Failed to load bugs'
    }
  })

  // Update store when data changes
  React.useEffect(() => {
    if (query.data) {
      setBugs(query.data.bugs)
      setPagination(query.data.totalCount, query.data.hasNextPage)
    }
  }, [query.data, setBugs, setPagination])

  return query
}

export const useInfiniteBugs = (filters: BugFilters = {}) => {
  const { setBugs } = useBugStore()

  const query = useInfiniteQuery({
    queryKey: queryKeys.bugs.list(filters),
    queryFn: ({ pageParam = 1 }: { pageParam?: number }) => 
      bugsAPI.list({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage: BugListResponse, pages: BugListResponse[]) => 
      lastPage.hasNextPage ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    meta: {
      errorMessage: 'Failed to load bugs'
    }
  })

  // Update store when data changes
  React.useEffect(() => {
    if (query.data) {
      const allBugs = query.data.pages.flatMap(page => page.bugs)
      setBugs(allBugs)
    }
  }, [query.data, setBugs])

  return query
}

export const useBug = (id: string) => {
  const { setSelectedBug } = useBugStore()

  const query = useQuery({
    queryKey: queryKeys.bugs.detail(id),
    queryFn: () => bugsAPI.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: {
      errorMessage: 'Failed to load bug details'
    }
  })

  // Update store when data changes
  React.useEffect(() => {
    if (query.data) {
      setSelectedBug(query.data)
    }
  }, [query.data, setSelectedBug])

  return query
}

export const useCreateBug = () => {
  const queryClient = useQueryClient()
  const { addBug } = useBugStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: (data: CreateBugData) => bugsAPI.create(data),
    onMutate: () => {
      loadingManager.start('bugs.create')
    },
    onSuccess: (newBug) => {
      addBug(newBug)
      // Invalidate bug lists to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.bugs.lists() })
      addToast({
        title: 'Bug reported!',
        description: 'Your bug report has been submitted successfully.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'create bug')
    },
    onSettled: () => {
      loadingManager.stop('bugs.create')
    }
  })
}

export const useUpdateBug = () => {
  const queryClient = useQueryClient()
  const { updateBug } = useBugStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBugData }) =>
      bugsAPI.update(id, data),
    onMutate: () => {
      loadingManager.start('bugs.update')
    },
    onSuccess: (updatedBug) => {
      updateBug(updatedBug.id, updatedBug)
      // Update specific bug query cache
      queryClient.setQueryData(queryKeys.bugs.detail(updatedBug.id), updatedBug)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.bugs.lists() })
      addToast({
        title: 'Bug updated',
        description: 'Bug report has been updated successfully.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'update bug')
    },
    onSettled: () => {
      loadingManager.stop('bugs.update')
    }
  })
}

export const useDeleteBug = () => {
  const queryClient = useQueryClient()
  const { removeBug } = useBugStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: (id: string) => bugsAPI.delete(id),
    onMutate: () => {
      loadingManager.start('bugs.delete')
    },
    onSuccess: (_, bugId) => {
      removeBug(bugId)
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.bugs.detail(bugId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.bugs.lists() })
      addToast({
        title: 'Bug deleted',
        description: 'Bug report has been deleted successfully.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'delete bug')
    },
    onSettled: () => {
      loadingManager.stop('bugs.delete')
    }
  })
}

export const useVoteBug = () => {
  const queryClient = useQueryClient()
  const { optimisticVote, updateVoteCount } = useBugStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: (bugId: string) => bugsAPI.vote(bugId),
    onMutate: async (bugId: string) => {
      loadingManager.start('bugs.vote')
      
      // Optimistic update
      optimisticVote(bugId)
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.bugs.detail(bugId) })
      
      // Snapshot previous value
      const previousBug = queryClient.getQueryData(queryKeys.bugs.detail(bugId))
      
      return { previousBug, bugId }
    },
    onSuccess: (data, bugId) => {
      updateVoteCount(bugId, data.voteCount, data.hasUserVoted)
      // Update cache with server data
      queryClient.setQueryData(queryKeys.bugs.detail(bugId), (old: any) => 
        old ? { ...old, voteCount: data.voteCount, hasUserVoted: data.hasUserVoted } : old
      )
    },
    onError: (error, bugId, context) => {
      // Revert optimistic update
      if (context?.previousBug) {
        queryClient.setQueryData(queryKeys.bugs.detail(bugId), context.previousBug)
        optimisticVote(bugId) // Revert the optimistic update
      }
      errorHandler.handle(error, 'vote on bug')
    },
    onSettled: () => {
      loadingManager.stop('bugs.vote')
    }
  })
}

export const useCommentOnBug = () => {
  const queryClient = useQueryClient()
  const { optimisticComment } = useBugStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: ({ bugId, content }: { bugId: string; content: string }) =>
      bugsAPI.addComment(bugId, content),
    onMutate: ({ bugId }) => {
      loadingManager.start('bugs.comments')
      // Optimistic update for comment count
      optimisticComment(bugId)
    },
    onSuccess: (comment, { bugId }) => {
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.bugs.comments(bugId) })
      // Invalidate bug detail to update comment count
      queryClient.invalidateQueries({ queryKey: queryKeys.bugs.detail(bugId) })
      addToast({
        title: 'Comment added',
        description: 'Your comment has been posted successfully.',
        type: 'success'
      })
    },
    onError: (error, { bugId }) => {
      // Revert optimistic update by decrementing comment count
      const { updateBug, getBugById } = useBugStore.getState()
      const bug = getBugById(bugId)
      if (bug) {
        updateBug(bugId, { commentCount: Math.max(0, bug.commentCount - 1) })
      }
      errorHandler.handle(error, 'comment on bug')
    },
    onSettled: () => {
      loadingManager.stop('bugs.comments')
    }
  })
}