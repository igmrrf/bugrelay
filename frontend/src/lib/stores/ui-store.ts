'use client'

import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface UIState {
  // Loading states
  isGlobalLoading: boolean
  loadingStates: Record<string, boolean>
  
  // Error handling
  globalError: string | null
  errors: Record<string, string>
  
  // Toast notifications
  toasts: Toast[]
  
  // Modal states
  modals: Record<string, boolean>
  
  // Actions
  setGlobalLoading: (loading: boolean) => void
  setLoading: (key: string, loading: boolean) => void
  clearLoading: (key: string) => void
  
  setGlobalError: (error: string | null) => void
  setError: (key: string, error: string) => void
  clearError: (key: string) => void
  clearAllErrors: () => void
  
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  
  openModal: (key: string) => void
  closeModal: (key: string) => void
  toggleModal: (key: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isGlobalLoading: false,
  loadingStates: {},
  globalError: null,
  errors: {},
  toasts: [],
  modals: {},

  // Loading actions
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),

  setLoading: (key, loading) => set((state) => ({
    loadingStates: { ...state.loadingStates, [key]: loading }
  })),

  clearLoading: (key) => set((state) => {
    const { [key]: _, ...rest } = state.loadingStates
    return { loadingStates: rest }
  }),

  // Error actions
  setGlobalError: (globalError) => set({ globalError }),

  setError: (key, error) => set((state) => ({
    errors: { ...state.errors, [key]: error }
  })),

  clearError: (key) => set((state) => {
    const { [key]: _, ...rest } = state.errors
    return { errors: rest }
  }),

  clearAllErrors: () => set({ errors: {}, globalError: null }),

  // Toast actions
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    set((state) => ({ toasts: [...state.toasts, newToast] }))
    
    // Auto-remove toast after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      get().removeToast(id)
    }, duration)
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(toast => toast.id !== id)
  })),

  clearToasts: () => set({ toasts: [] }),

  // Modal actions
  openModal: (key) => set((state) => ({
    modals: { ...state.modals, [key]: true }
  })),

  closeModal: (key) => set((state) => ({
    modals: { ...state.modals, [key]: false }
  })),

  toggleModal: (key) => set((state) => ({
    modals: { ...state.modals, [key]: !state.modals[key] }
  })),
}))