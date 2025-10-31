import { render, screen } from '@/test/utils'
import { LoadingSpinner, LoadingState, LoadingSkeleton } from '../loading'

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('generic')
    expect(spinner).toBeInTheDocument()
    expect(spinner.querySelector('svg')).toHaveClass('h-6', 'w-6', 'animate-spin')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    expect(screen.getByRole('generic').querySelector('svg')).toHaveClass('h-4', 'w-4')

    rerender(<LoadingSpinner size="md" />)
    expect(screen.getByRole('generic').querySelector('svg')).toHaveClass('h-6', 'w-6')

    rerender(<LoadingSpinner size="lg" />)
    expect(screen.getByRole('generic').querySelector('svg')).toHaveClass('h-8', 'w-8')
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    
    const spinner = screen.getByRole('generic')
    expect(spinner).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<LoadingSpinner ref={ref} />)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner aria-label="Loading content" />)
    
    const spinner = screen.getByLabelText('Loading content')
    expect(spinner).toBeInTheDocument()
  })
})

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<LoadingState message="Loading bugs..." />)
    
    expect(screen.getByText('Loading bugs...')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingState size="sm" />)
    expect(screen.getByRole('generic').querySelector('svg')).toHaveClass('h-4', 'w-4')

    rerender(<LoadingState size="lg" />)
    expect(screen.getByRole('generic').querySelector('svg')).toHaveClass('h-8', 'w-8')
  })

  it('has proper layout structure', () => {
    render(<LoadingState message="Test loading" />)
    
    const container = screen.getByText('Test loading').parentElement
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
  })

  it('displays spinner and message together', () => {
    render(<LoadingState message="Please wait..." />)
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })
})

describe('LoadingSkeleton', () => {
  it('renders with default styling', () => {
    render(<LoadingSkeleton />)
    
    const skeleton = screen.getByRole('generic')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted')
  })

  it('applies custom className', () => {
    render(<LoadingSkeleton className="h-4 w-full" />)
    
    const skeleton = screen.getByRole('generic')
    expect(skeleton).toHaveClass('h-4', 'w-full', 'animate-pulse')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<LoadingSkeleton ref={ref} />)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('supports custom dimensions', () => {
    render(<LoadingSkeleton className="h-8 w-32" />)
    
    const skeleton = screen.getByRole('generic')
    expect(skeleton).toHaveClass('h-8', 'w-32')
  })

  it('can be used for different content types', () => {
    render(
      <div>
        <LoadingSkeleton className="h-6 w-3/4 mb-2" />
        <LoadingSkeleton className="h-4 w-full mb-1" />
        <LoadingSkeleton className="h-4 w-2/3" />
      </div>
    )
    
    const skeletons = screen.getAllByRole('generic')
    expect(skeletons).toHaveLength(3)
    expect(skeletons[0]).toHaveClass('h-6', 'w-3/4')
    expect(skeletons[1]).toHaveClass('h-4', 'w-full')
    expect(skeletons[2]).toHaveClass('h-4', 'w-2/3')
  })
})