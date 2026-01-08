import { apiClient } from "./client";
import type {
  BugReport,
  BugFilters,
  FileAttachment,
} from "@/lib/stores/bug-store";

export interface CreateBugData {
  title: string;
  description: string;
  applicationName: string;
  applicationUrl?: string;
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  operatingSystem?: string;
  deviceType?: string;
  appVersion?: string;
  browserVersion?: string;
  contactEmail?: string;
  screenshots?: File[];
}

export interface UpdateBugData {
  title?: string;
  description?: string;
  status?: "open" | "reviewing" | "fixed" | "wont_fix";
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string[];
}

export interface BugListResponse {
  bugs: BugReport[];
  totalCount: number;
  hasNextPage: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  isCompanyResponse: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoteResponse {
  voteCount: number;
  hasUserVoted: boolean;
}

export const bugsAPI = {
  // Bug CRUD operations
  list: async (filters: BugFilters = {}): Promise<BugListResponse> => {
    const params = new URLSearchParams();

    if (filters.search) params.append("search", filters.search);
    if (filters.status?.length)
      params.append("status", filters.status.join(","));
    if (filters.priority?.length)
      params.append("priority", filters.priority.join(","));
    if (filters.tags?.length) params.append("tags", filters.tags.join(","));
    if (filters.applicationId)
      params.append("applicationId", filters.applicationId);
    if (filters.companyId) params.append("companyId", filters.companyId);
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    const response = await apiClient.get<{
      bugs: BugReport[];
      pagination: any;
    }>(`/bugs/?${params.toString()}`);
    return {
      bugs: response.bugs,
      totalCount: response.pagination.total,
      hasNextPage: response.pagination.has_next,
    };
  },

  get: async (id: string): Promise<BugReport> => {
    const response = await apiClient.get<{ bug: BugReport }>(`/bugs/${id}/`);
    return response.bug;
  },

  create: async (data: CreateBugData): Promise<BugReport> => {
    // Handle file uploads separately if screenshots are provided
    if (data.screenshots && data.screenshots.length > 0) {
      const formData = new FormData();

      // Add bug data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "screenshots" && value !== undefined) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Add screenshots
      data.screenshots.forEach((file, index) => {
        formData.append(`screenshots`, file);
      });

      // For now, create bug without screenshots since backend doesn't support multipart
      const response = await apiClient.post<{
        bug: BugReport;
        message: string;
      }>("/bugs/", data);
      console.warn(
        "File uploads not yet implemented - bug created without screenshots",
      );
      return response.bug;
    }

    const response = await apiClient.post<{ bug: BugReport; message: string }>(
      "/bugs/",
      data,
    );
    return response.bug;
  },

  update: async (id: string, data: UpdateBugData): Promise<BugReport> => {
    return apiClient.patch(`/bugs/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/bugs/${id}`);
  },

  // Voting
  vote: async (id: string): Promise<VoteResponse> => {
    return apiClient.post(`/bugs/${id}/vote`);
  },

  unvote: async (id: string): Promise<VoteResponse> => {
    return apiClient.delete(`/bugs/${id}/vote`);
  },

  // Comments
  getComments: async (
    bugId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    comments: Comment[];
    totalCount: number;
    hasNextPage: boolean;
  }> => {
    return apiClient.get(`/bugs/${bugId}/comments?page=${page}&limit=${limit}`);
  },

  addComment: async (bugId: string, content: string): Promise<Comment> => {
    return apiClient.post(`/bugs/${bugId}/comments`, { content });
  },

  updateComment: async (
    bugId: string,
    commentId: string,
    content: string,
  ): Promise<Comment> => {
    return apiClient.patch(`/bugs/${bugId}/comments/${commentId}`, { content });
  },

  deleteComment: async (bugId: string, commentId: string): Promise<void> => {
    return apiClient.delete(`/bugs/${bugId}/comments/${commentId}`);
  },

  // File attachments
  uploadScreenshot: async (
    bugId: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<FileAttachment> => {
    return apiClient.upload(`/bugs/${bugId}/screenshots`, file, onProgress);
  },

  deleteScreenshot: async (
    bugId: string,
    attachmentId: string,
  ): Promise<void> => {
    return apiClient.delete(`/bugs/${bugId}/screenshots/${attachmentId}`);
  },

  // Bulk operations
  bulkUpdateStatus: async (
    bugIds: string[],
    status: string,
  ): Promise<{ updated: number }> => {
    return apiClient.patch("/bugs/bulk/status", { bugIds, status });
  },

  bulkDelete: async (bugIds: string[]): Promise<{ deleted: number }> => {
    return apiClient.delete("/bugs/bulk", { data: { bugIds } });
  },

  // Search and filtering
  searchSuggestions: async (
    query: string,
  ): Promise<{
    applications: Array<{ id: string; name: string }>;
    companies: Array<{ id: string; name: string }>;
    tags: string[];
  }> => {
    return apiClient.get(
      `/bugs/search/suggestions?q=${encodeURIComponent(query)}`,
    );
  },

  // Duplicate detection
  searchDuplicates: async (
    query: string,
  ): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      status: "open" | "reviewing" | "fixed" | "wont_fix";
      voteCount: number;
      matchScore: number;
      createdAt: string;
    }>
  > => {
    const response = await apiClient.post<{
      duplicates: Array<{
        id: string;
        title: string;
        description: string;
        status: "open" | "reviewing" | "fixed" | "wont_fix";
        voteCount: number;
        matchScore: number;
        createdAt: string;
      }>;
    }>("/bugs/search/duplicates", { query });
    return response.duplicates;
  },

  // Flag/Report
  flag: async (
    bugId: string,
    reason: string,
  ): Promise<{ success: boolean }> => {
    return apiClient.post(`/bugs/${bugId}/flag`, { reason });
  },

  // Enhanced comments
  replyToComment: async (
    bugId: string,
    parentCommentId: string,
    content: string,
  ): Promise<Comment> => {
    return apiClient.post(
      `/bugs/${bugId}/comments/${parentCommentId}/replies`,
      { content },
    );
  },

  flagComment: async (
    bugId: string,
    commentId: string,
    reason: string,
  ): Promise<{ success: boolean }> => {
    return apiClient.post(`/bugs/${bugId}/comments/${commentId}/flag`, {
      reason,
    });
  },

  // Company search for submission flow
  searchCompanies: async (
    query: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      isVerified: boolean;
      logoUrl?: string;
    }>
  > => {
    const response = await apiClient.get<{
      companies: Array<{
        id: string;
        name: string;
        isVerified: boolean;
        logoUrl?: string;
      }>;
    }>(`/companies/search?q=${encodeURIComponent(query)}`);
    return response.companies;
  },

  // Analytics
  getStats: async (
    filters?: Partial<BugFilters>,
  ): Promise<{
    totalBugs: number;
    openBugs: number;
    resolvedBugs: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    recentActivity: Array<{
      date: string;
      count: number;
    }>;
  }> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(
            key,
            Array.isArray(value) ? value.join(",") : value.toString(),
          );
        }
      });
    }

    return apiClient.get(`/bugs/stats?${params.toString()}`);
  },
};
