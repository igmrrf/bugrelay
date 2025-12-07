"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { errorHandler } from "@/lib/error-handler";
import { loadingManager } from "@/lib/loading-manager";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  authProvider: "google" | "github" | "email";
  companyMemberships: CompanyMember[];
  createdAt: string;
  lastActiveAt: string;

  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  twitterUsername?: string;
}

export interface CompanyMember {
  id: string;
  companyId: string;
  role: "admin" | "member";
  company: {
    id: string;
    name: string;
    domain: string;
    isVerified: boolean;
  };
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  initialize: () => void;

  // Computed getters
  isLoading: () => boolean;
  hasPermission: (permission: string) => boolean;
  isCompanyMember: (companyId: string) => boolean;
  isCompanyAdmin: (companyId: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isInitialized: false,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isInitialized: true,
        }),

      login: (user) => {
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
        loadingManager.stop("auth.login");
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        loadingManager.stop("auth.logout");
        // Clear any auth-related errors
        errorHandler.clearAll();
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      initialize: () => {
        set({ isInitialized: true });
      },

      // Computed getters
      isLoading: () => {
        return (
          loadingManager.isLoading("auth.login") ||
          loadingManager.isLoading("auth.register") ||
          loadingManager.isLoading("auth.logout") ||
          loadingManager.isLoading("auth.refresh")
        );
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;

        // Admin users have all permissions
        if (user.isAdmin) return true;

        // Add specific permission logic here
        switch (permission) {
          case "admin":
            return user.isAdmin;
          case "company.manage":
            return user.companyMemberships.length > 0;
          case "bug.vote":
          case "bug.comment":
            return user.isEmailVerified;
          default:
            return false;
        }
      },

      isCompanyMember: (companyId: string) => {
        const { user } = get();
        return (
          user?.companyMemberships.some((m) => m.companyId === companyId) ||
          false
        );
      },

      isCompanyAdmin: (companyId: string) => {
        const { user } = get();
        return (
          user?.companyMemberships.some(
            (m) => m.companyId === companyId && m.role === "admin",
          ) || false
        );
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);
