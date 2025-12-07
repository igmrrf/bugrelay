import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data generators
export const mockBug = {
  id: '1',
  title: 'Test Bug Title',
  description: 'Test bug description',
  status: 'open' as const,
  priority: 'medium' as const,
  tags: ['ui', 'crash'],
  voteCount: 5,
  commentCount: 3,
  createdAt: '2025-01-01T00:00:00Z',
  application: {
    name: 'Test App',
    company: {
      name: 'Test Company',
      isVerified: true,
    },
  },
  reporter: {
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
  },
}

export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test user bio',
  location: 'Test City',
  website: 'https://example.com',
  githubUsername: 'testuser',
  twitterUsername: 'testuser',
  createdAt: '2025-01-01T00:00:00Z',
  lastActiveAt: '2025-01-01T00:00:00Z',
}

export const mockCompany = {
  id: '1',
  name: 'Test Company',
  domain: 'example.com',
  isVerified: true,
  bugCount: 10,
  createdAt: '2025-01-01T00:00:00Z',
  applications: [
    {
      id: '1',
      name: 'Test App',
      bugCount: 5,
    },
  ],
}
