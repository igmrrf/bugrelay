import { render, screen, fireEvent, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { BugList, type Bug } from '../bug-list'
import { mockBug } from '@/test/utils'

const mockBugs: Bug[] = [
  mockBug,
  {
    ...mockBug,
    id: '2',
    title: 'Second Bug',
    description: 'Another test bug',
    voteCount: 3,
    commentCount: 1,
  }
]

describe('BugList', () => {
  it('renders loading state initially', () => {
    render(<BugList isLoading={true} />)
    
    expect(screen.getByText('Loading bugs...')).toBeInTheDocument()
  })

  it('renders error state when no bugs and error exists', () => {
    render(<BugList error="Failed to load" bugs={[]} />)
    
    expect(screen.getByText('Failed to load bugs')).toBeInTheDocument()
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('renders bug list with bugs', () => {
    render(<BugList bugs={mockBugs} />)
    
    expect(screen.getByText('Bug Reports')).toBeInTheDocument()
    expect(screen.getByText(mockBugs[0].title)).toBeInTheDocument()
    expect(screen.getByText(mockBugs[1].title)).toBeInTheDocument()
  })

  it('displays total count correctly', () => {
    render(<BugList bugs={mockBugs} totalCount={2} />)
    
    expect(screen.getByText('2 bugs found')).toBeInTheDocument()
  })

  it('displays singular count correctly', () => {
    render(<BugList bugs={[mockBug]} totalCount={1} />)
    
    expect(screen.getByText('1 bug found')).toBeInTheDocument()
  })

  it('displays no bugs message when empty', () => {
    render(<BugList bugs={[]} totalCount={0} />)
    
    expect(screen.getByText('No bugs found')).toBeInTheDocument()
    expect(screen.getByText(/try adjusting your search filters/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /submit a bug report/i })).toBeInTheDocument()
  })

  it('handles vote button clicks', async () => {
    const onVote = jest.fn()
    const user = userEvent.setup()
    
    render(<BugList bugs={[mockBug]} onVote={onVote} />)
    
    const voteButton = screen.getByRole('button')
    await user.click(voteButton)
    
    expect(onVote).toHaveBeenCalledWith(mockBug.id)
  })

  it('shows voted state for voted bugs', () => {
    const votedBugs = new Set([mockBug.id])
    render(<BugList bugs={[mockBug]} votedBugs={votedBugs} />)
    
    const voteButton = screen.getByRole('button')
    expect(voteButton).toHaveClass('bg-primary')
  })

  it('handles search filter changes', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<BugList bugs={mockBugs} onSearch={onSearch} />)
    
    const searchInput = screen.getByPlaceholderText(/search bugs/i)
    await user.type(searchInput, 'test query')
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query'
        })
      )
    })
  })

  it('shows load more button when hasMore is true', () => {
    render(<BugList bugs={mockBugs} hasMore={true} />)
    
    expect(screen.getByRole('button', { name: /load more bugs/i })).toBeInTheDocument()
  })

  it('handles load more button click', async () => {
    const onLoadMore = jest.fn()
    const user = userEvent.setup()
    
    render(<BugList bugs={mockBugs} hasMore={true} onLoadMore={onLoadMore} />)
    
    const loadMoreButton = screen.getByRole('button', { name: /load more bugs/i })
    await user.click(loadMoreButton)
    
    expect(onLoadMore).toHaveBeenCalled()
  })

  it('shows loading state for load more', async () => {
    const onLoadMore = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    const user = userEvent.setup()
    
    render(<BugList bugs={mockBugs} hasMore={true} onLoadMore={onLoadMore} />)
    
    const loadMoreButton = screen.getByRole('button', { name: /load more bugs/i })
    await user.click(loadMoreButton)
    
    expect(screen.getByText(/loading more/i)).toBeInTheDocument()
    expect(loadMoreButton).toBeDisabled()
  })

  it('shows end of results message when no more bugs', () => {
    const manyBugs = Array.from({ length: 15 }, (_, i) => ({
      ...mockBug,
      id: `bug-${i}`,
      title: `Bug ${i}`
    }))
    
    render(<BugList bugs={manyBugs} hasMore={false} />)
    
    expect(screen.getByText(/you've reached the end of the results/i)).toBeInTheDocument()
  })

  it('shows refresh button when there is an error with existing bugs', () => {
    render(<BugList bugs={mockBugs} error="Network error" />)
    
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('handles retry on error', async () => {
    // Mock window.location.reload
    const mockReload = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    })
    
    const user = userEvent.setup()
    render(<BugList error="Failed to load" bugs={[]} />)
    
    const retryButton = screen.getByRole('button', { name: /try again/i })
    await user.click(retryButton)
    
    expect(mockReload).toHaveBeenCalled()
  })

  it('shows loading skeletons during load more', async () => {
    const onLoadMore = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    const user = userEvent.setup()
    
    render(<BugList bugs={mockBugs} hasMore={true} onLoadMore={onLoadMore} />)
    
    const loadMoreButton = screen.getByRole('button', { name: /load more bugs/i })
    await user.click(loadMoreButton)
    
    // Should show loading skeletons
    const skeletons = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-pulse')
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('prevents multiple load more requests', async () => {
    const onLoadMore = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    const user = userEvent.setup()
    
    render(<BugList bugs={mockBugs} hasMore={true} onLoadMore={onLoadMore} />)
    
    const loadMoreButton = screen.getByRole('button', { name: /load more bugs/i })
    
    // Click multiple times quickly
    await user.click(loadMoreButton)
    await user.click(loadMoreButton)
    await user.click(loadMoreButton)
    
    // Should only call once
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('shows error message for load more failures', () => {
    render(<BugList bugs={mockBugs} error="Failed to load more" />)
    
    expect(screen.getByText('Failed to load more bugs')).toBeInTheDocument()
  })
})