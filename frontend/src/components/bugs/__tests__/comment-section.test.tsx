import { render, screen, fireEvent, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { CommentSection, type Comment } from '../comment-section'

const mockComments: Comment[] = [
  {
    id: '1',
    content: 'This is a test comment',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isCompanyResponse: false,
    user: {
      id: 'user1',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg'
    },
    replies: []
  },
  {
    id: '2',
    content: 'This is a company response',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    isCompanyResponse: true,
    user: {
      id: 'company1',
      name: 'Company Rep',
      role: 'Support Team'
    },
    replies: []
  }
]

describe('CommentSection', () => {
  it('renders comment section header', () => {
    render(<CommentSection comments={mockComments} bugId="bug1" />)
    
    expect(screen.getByText('Comments (2)')).toBeInTheDocument()
  })

  it('renders sign in prompt when not authenticated', () => {
    render(<CommentSection comments={[]} bugId="bug1" isAuthenticated={false} />)
    
    expect(screen.getByText('Sign in to join the discussion')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders comment form when authenticated', () => {
    render(<CommentSection comments={[]} bugId="bug1" isAuthenticated={true} />)
    
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /post comment/i })).toBeInTheDocument()
  })

  it('displays empty state when no comments', () => {
    render(<CommentSection comments={[]} bugId="bug1" />)
    
    expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument()
  })

  it('renders comments correctly', () => {
    render(<CommentSection comments={mockComments} bugId="bug1" />)
    
    expect(screen.getByText('This is a test comment')).toBeInTheDocument()
    expect(screen.getByText('This is a company response')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Company Rep')).toBeInTheDocument()
  })

  it('shows company badge for company responses', () => {
    render(<CommentSection comments={mockComments} bugId="bug1" />)
    
    expect(screen.getByText('Support Team')).toBeInTheDocument()
  })

  it('handles new comment submission', async () => {
    const onComment = jest.fn()
    const user = userEvent.setup()
    
    render(
      <CommentSection 
        comments={[]} 
        bugId="bug1" 
        isAuthenticated={true}
        onComment={onComment}
      />
    )
    
    const textarea = screen.getByPlaceholderText('Add a comment...')
    const submitButton = screen.getByRole('button', { name: /post comment/i })
    
    await user.type(textarea, 'This is a new comment')
    await user.click(submitButton)
    
    expect(onComment).toHaveBeenCalledWith('This is a new comment', undefined)
  })

  it('disables submit when comment is empty', () => {
    render(
      <CommentSection 
        comments={[]} 
        bugId="bug1" 
        isAuthenticated={true}
      />
    )
    
    const submitButton = screen.getByRole('button', { name: /post comment/i })
    expect(submitButton).toBeDisabled()
  })

  it('shows loading state during comment submission', async () => {
    const onComment = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    const user = userEvent.setup()
    
    render(
      <CommentSection 
        comments={[]} 
        bugId="bug1" 
        isAuthenticated={true}
        onComment={onComment}
      />
    )
    
    const textarea = screen.getByPlaceholderText('Add a comment...')
    await user.type(textarea, 'Test comment')
    await user.click(screen.getByRole('button', { name: /post comment/i }))
    
    expect(screen.getByText(/posting/i)).toBeInTheDocument()
  })

  it('shows reply button for authenticated users', () => {
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user2"
      />
    )
    
    const replyButtons = screen.getAllByRole('button', { name: /reply/i })
    expect(replyButtons.length).toBeGreaterThan(0)
  })

  it('shows edit and delete buttons for comment owner', () => {
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user1"
      />
    )
    
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('handles reply to comment', async () => {
    const onComment = jest.fn()
    const user = userEvent.setup()
    
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user2"
        onComment={onComment}
      />
    )
    
    // Click reply button
    const replyButton = screen.getAllByRole('button', { name: /reply/i })[0]
    await user.click(replyButton)
    
    // Fill reply form
    const replyTextarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(replyTextarea, 'This is a reply')
    
    // Submit reply
    const submitReplyButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitReplyButton)
    
    expect(onComment).toHaveBeenCalledWith('This is a reply', mockComments[0].id)
  })

  it('handles comment editing', async () => {
    const onEditComment = jest.fn()
    const user = userEvent.setup()
    
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user1"
        onEditComment={onEditComment}
      />
    )
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    
    // Edit comment
    const editTextarea = screen.getByDisplayValue('This is a test comment')
    await user.clear(editTextarea)
    await user.type(editTextarea, 'This is an edited comment')
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    expect(onEditComment).toHaveBeenCalledWith(mockComments[0].id, 'This is an edited comment')
  })

  it('handles comment deletion with confirmation', async () => {
    const onDeleteComment = jest.fn()
    const user = userEvent.setup()
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true)
    
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user1"
        onDeleteComment={onDeleteComment}
      />
    )
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?')
    expect(onDeleteComment).toHaveBeenCalledWith(mockComments[0].id)
  })

  it('cancels deletion when user declines confirmation', async () => {
    const onDeleteComment = jest.fn()
    const user = userEvent.setup()
    
    // Mock window.confirm to return false
    window.confirm = jest.fn(() => false)
    
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user1"
        onDeleteComment={onDeleteComment}
      />
    )
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    expect(onDeleteComment).not.toHaveBeenCalled()
  })

  it('shows flag button for other users comments', () => {
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user2"
      />
    )
    
    const flagButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-flag')
    )
    expect(flagButtons.length).toBeGreaterThan(0)
  })

  it('handles comment flagging', async () => {
    const onFlagComment = jest.fn()
    const user = userEvent.setup()
    
    render(
      <CommentSection 
        comments={mockComments} 
        bugId="bug1" 
        isAuthenticated={true}
        currentUserId="user2"
        onFlagComment={onFlagComment}
      />
    )
    
    // Find and click flag button
    const flagButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-flag')
    )
    await user.click(flagButtons[0])
    
    expect(onFlagComment).toHaveBeenCalledWith(mockComments[0].id)
  })

  it('displays user avatar when available', () => {
    render(<CommentSection comments={mockComments} bugId="bug1" />)
    
    const avatar = screen.getByAltText('John Doe')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('displays user initials when no avatar', () => {
    const commentsWithoutAvatar = [{
      ...mockComments[1],
      user: { ...mockComments[1].user, avatar: undefined }
    }]
    
    render(<CommentSection comments={commentsWithoutAvatar} bugId="bug1" />)
    
    expect(screen.getByText('C')).toBeInTheDocument() // First letter of "Company Rep"
  })

  it('formats dates correctly', () => {
    const recentComment = {
      ...mockComments[0],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    }
    
    render(<CommentSection comments={[recentComment]} bugId="bug1" />)
    
    expect(screen.getByText('2h ago')).toBeInTheDocument()
  })

  it('shows edited indicator when comment is edited', () => {
    const editedComment = {
      ...mockComments[0],
      updatedAt: '2024-01-01T01:00:00Z' // Different from createdAt
    }
    
    render(<CommentSection comments={[editedComment]} bugId="bug1" />)
    
    expect(screen.getByText('(edited)')).toBeInTheDocument()
  })
})