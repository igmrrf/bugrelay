import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCompanyStore, useUIStore, loadingManager, errorHandler } from '@/lib/stores'
import { queryKeys } from '@/lib/query-keys'
import { companiesAPI } from '@/lib/api'
import type { Company, CompanyFilters, CompanyMember } from '@/lib/stores/company-store'
import type { ClaimCompanyData, VerifyCompanyData, AddMemberData, UpdateMemberData } from '@/lib/api'

export const useCompanies = (filters: CompanyFilters = {}) => {
  const { setCompanies, setPagination } = useCompanyStore()

  const query = useQuery({
    queryKey: queryKeys.companies.list(filters),
    queryFn: () => companiesAPI.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: {
      errorMessage: 'Failed to load companies'
    }
  })

  // Update store when data changes
  React.useEffect(() => {
    if (query.data) {
      setCompanies(query.data.companies)
      setPagination(query.data.totalCount, query.data.hasNextPage)
    }
  }, [query.data, setCompanies, setPagination])

  return query
}

export const useCompany = (id: string) => {
  const { setSelectedCompany } = useCompanyStore()

  const query = useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: () => companiesAPI.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    meta: {
      errorMessage: 'Failed to load company details'
    }
  })

  // Update store when data changes
  React.useEffect(() => {
    if (query.data) {
      setSelectedCompany(query.data)
    }
  }, [query.data, setSelectedCompany])

  return query
}

export const useClaimCompany = () => {
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      companiesAPI.claim(id, { email }),
    onMutate: () => {
      loadingManager.start('companies.claim')
    },
    onSuccess: (data) => {
      addToast({
        title: 'Verification email sent',
        description: data.message || 'Please check your email to verify company ownership.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'claim company')
    },
    onSettled: () => {
      loadingManager.stop('companies.claim')
    }
  })
}

export const useVerifyCompany = () => {
  const queryClient = useQueryClient()
  const { updateCompany } = useCompanyStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) =>
      companiesAPI.verify(id, { token }),
    onMutate: () => {
      loadingManager.start('companies.verify')
    },
    onSuccess: (company) => {
      updateCompany(company.id, company)
      // Update cache
      queryClient.setQueryData(queryKeys.companies.detail(company.id), company)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() })
      addToast({
        title: 'Company verified!',
        description: 'Your company has been successfully verified. You can now manage bug reports.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'verify company')
    },
    onSettled: () => {
      loadingManager.stop('companies.verify')
    }
  })
}

export const useAddCompanyMember = () => {
  const queryClient = useQueryClient()
  const { addMember } = useCompanyStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: ({ companyId, email, role }: { companyId: string; email: string; role: 'admin' | 'member' }) =>
      companiesAPI.addMember(companyId, { email, role }),
    onMutate: () => {
      loadingManager.start('companies.members')
    },
    onSuccess: (member, { companyId }) => {
      addMember(companyId, member)
      // Update cache
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.members(companyId) })
      addToast({
        title: 'Member added',
        description: 'Team member has been added successfully.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'add team member')
    },
    onSettled: () => {
      loadingManager.stop('companies.members')
    }
  })
}

export const useRemoveCompanyMember = () => {
  const queryClient = useQueryClient()
  const { removeMember } = useCompanyStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: ({ companyId, memberId }: { companyId: string; memberId: string }) =>
      companiesAPI.removeMember(companyId, memberId),
    onMutate: () => {
      loadingManager.start('companies.members')
    },
    onSuccess: (_, { companyId, memberId }) => {
      removeMember(companyId, memberId)
      // Update cache
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.members(companyId) })
      addToast({
        title: 'Member removed',
        description: 'Team member has been removed successfully.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'remove team member')
    },
    onSettled: () => {
      loadingManager.stop('companies.members')
    }
  })
}

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient()
  const { updateMemberRole } = useCompanyStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: ({ companyId, memberId, role }: { companyId: string; memberId: string; role: 'admin' | 'member' }) =>
      companiesAPI.updateMemberRole(companyId, memberId, { role }),
    onMutate: () => {
      loadingManager.start('companies.members')
    },
    onSuccess: (member, { companyId, memberId, role }) => {
      updateMemberRole(companyId, memberId, role)
      // Update cache
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.members(companyId) })
      addToast({
        title: 'Role updated',
        description: 'Team member role has been updated successfully.',
        type: 'success'
      })
    },
    onError: (error) => {
      errorHandler.handle(error, 'update member role')
    },
    onSettled: () => {
      loadingManager.stop('companies.members')
    }
  })
}

export const useCompanyMembers = (companyId: string) => {
  return useQuery({
    queryKey: queryKeys.companies.members(companyId),
    queryFn: () => companiesAPI.getMembers(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    meta: {
      errorMessage: 'Failed to load team members'
    }
  })
}