import { render, screen, fireEvent } from '@/test/utils'
import { BugCard } from '../bug-card'
import { mockBug } from '@/test/utils'

describe('BugCard', () => {
  it('renders bug information correctly', () => {
    render(<BugCard bug={mockBug} />)
    
    expect(screen.getByText(mockBug.title)).toBeInTheDocument()
    expect(screen.getByText(mockBug.description)).toBeInTheDocument()
    expect(screen.getByText(mockBug.voteCount.toString())).toBeInTheDocument()
    expect(screen.getByText(mockBug.application!.name)).toBeInTheDocument()
    expect(screen.getByText(mockBug.reporter!.name)).toBeInTheDocument()
  })

  it('displays tags correctly', () => {
    render(<BugCard bug={mockBug} />)
    
    mockBug.tags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument()
    })
  })

  it('shows verification badge for verified companies', () => {
    render(<BugCard bug={mockBug} />)
    
    // Check for verification checkmark
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('handles vote button click', () => {
    const onVote = jest.fn()
    render(<BugCard bug={mockBug} onVote={onVote} />)
    
    const voteButton = screen.getByRole('button')
    fireEvent.click(voteButton)
    
    expect(onVote).toHaveBeenCalledWith(mockBug.id)
  })

  it('shows voted state correctly', () => {
    render(<BugCard bug={mockBug} isVoted={true} />)
    
    const voteButton = screen.getByRole('button')
    expect(voteButton).toHaveClass('bg-primary')
  })

  it('limits displayed tags to 3', () => {
    const bugWithManyTags = {
      ...mockBug,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
    }
    
    render(<BugCard bug={bugWithManyTags} />)
    
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('renders without optional fields', () => {
    const minimalBug = {
      ...mockBug,
      application: undefined,
      reporter: undefined,
    }
    
    render(<BugCard bug={minimalBug} />)
    
    expect(screen.getByText(minimalBug.title)).toBeInTheDocument()
    expect(screen.getByText(minimalBug.description)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<BugCard bug={mockBug} className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})