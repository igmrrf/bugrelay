import { render, screen } from '@/test/utils'
import { Badge } from '../badge'

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary', 'text-secondary-foreground')

    rerender(<Badge variant="destructive">Destructive</Badge>)
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive', 'text-destructive-foreground')

    rerender(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toHaveClass('text-foreground')

    rerender(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success')).toHaveClass('bg-green-100', 'text-green-800')

    rerender(<Badge variant="warning">Warning</Badge>)
    expect(screen.getByText('Warning')).toHaveClass('bg-yellow-100', 'text-yellow-800')

    rerender(<Badge variant="info">Info</Badge>)
    expect(screen.getByText('Info')).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('applies base styling classes', () => {
    render(<Badge>Test Badge</Badge>)
    
    const badge = screen.getByText('Test Badge')
    expect(badge).toHaveClass(
      'inline-flex',
      'items-center',
      'rounded-full',
      'border',
      'px-2.5',
      'py-0.5',
      'text-xs',
      'font-semibold'
    )
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>)
    
    const badge = screen.getByText('Custom Badge')
    expect(badge).toHaveClass('custom-class')
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Badge onClick={handleClick}>Clickable Badge</Badge>)
    
    const badge = screen.getByText('Clickable Badge')
    badge.click()
    
    expect(handleClick).toHaveBeenCalled()
  })

  it('passes through HTML attributes', () => {
    render(<Badge data-testid="test-badge" title="Test Title">Badge</Badge>)
    
    const badge = screen.getByTestId('test-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('title', 'Test Title')
  })

  it('supports different content types', () => {
    render(
      <Badge>
        <span>Icon</span>
        Text Content
      </Badge>
    )
    
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Text Content')).toBeInTheDocument()
  })

  it('has proper focus styling', () => {
    render(<Badge>Focusable Badge</Badge>)
    
    const badge = screen.getByText('Focusable Badge')
    expect(badge).toHaveClass('focus:outline-hidden', 'focus:ring-2', 'focus:ring-ring', 'focus:ring-offset-2')
  })

  it('has hover effects for interactive variants', () => {
    const { rerender } = render(<Badge variant="default">Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('hover:bg-primary/80')

    rerender(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('hover:bg-secondary/80')

    rerender(<Badge variant="destructive">Destructive</Badge>)
    expect(screen.getByText('Destructive')).toHaveClass('hover:bg-destructive/80')

    rerender(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success')).toHaveClass('hover:bg-green-200')

    rerender(<Badge variant="warning">Warning</Badge>)
    expect(screen.getByText('Warning')).toHaveClass('hover:bg-yellow-200')

    rerender(<Badge variant="info">Info</Badge>)
    expect(screen.getByText('Info')).toHaveClass('hover:bg-blue-200')
  })

  it('renders as div element', () => {
    const { container } = render(<Badge>Test</Badge>)
    
    const badge = container.firstChild
    expect(badge?.nodeName).toBe('DIV')
  })

  it('handles empty content', () => {
    render(<Badge></Badge>)
    
    const badge = document.querySelector('.inline-flex')
    expect(badge).toBeInTheDocument()
  })

  it('combines variant and custom classes correctly', () => {
    render(<Badge variant="success" className="ml-2 custom-badge">Success Badge</Badge>)
    
    const badge = screen.getByText('Success Badge')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800', 'ml-2', 'custom-badge')
  })
})