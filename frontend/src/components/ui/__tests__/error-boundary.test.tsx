import { render, screen, fireEvent } from '@/test/utils'
import { ErrorBoundary, ErrorMessage } from '../error-boundary'

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test error')).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })

  it('resets error when try again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('uses custom fallback component', () => {
    const CustomFallback = ({ error, resetError }: any) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={resetError}>Reset</button>
      </div>
    )
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })
})

describe('ErrorMessage', () => {
  it('renders error message with title and description', () => {
    render(
      <ErrorMessage
        title="Custom Error Title"
        message="This is a custom error message"
      />
    )
    
    expect(screen.getByText('Custom Error Title')).toBeInTheDocument()
    expect(screen.getByText('This is a custom error message')).toBeInTheDocument()
  })

  it('renders with default title', () => {
    render(<ErrorMessage message="Error message" />)
    
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const action = {
      label: 'Retry',
      onClick: jest.fn()
    }
    
    render(<ErrorMessage message="Error message" action={action} />)
    
    const button = screen.getByRole('button', { name: /retry/i })
    expect(button).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(action.onClick).toHaveBeenCalled()
  })

  it('does not render action button when not provided', () => {
    render(<ErrorMessage message="Error message" />)
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})