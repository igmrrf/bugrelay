import { render, screen } from '@/test/utils'
import { StatusBadge } from '../status-badge'

describe('StatusBadge', () => {
  it('renders with status variant', () => {
    render(<StatusBadge status="open">Open</StatusBadge>)
    
    const badge = screen.getByText('Open')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('renders with priority variant', () => {
    render(<StatusBadge priority="high">High</StatusBadge>)
    
    const badge = screen.getByText('High')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-orange-100', 'text-orange-800')
  })

  it('renders different status variants correctly', () => {
    const { rerender } = render(<StatusBadge status="open" />)
    expect(screen.getByText('open')).toHaveClass('bg-blue-100', 'text-blue-800')

    rerender(<StatusBadge status="reviewing" />)
    expect(screen.getByText('reviewing')).toHaveClass('bg-yellow-100', 'text-yellow-800')

    rerender(<StatusBadge status="fixed" />)
    expect(screen.getByText('fixed')).toHaveClass('bg-green-100', 'text-green-800')

    rerender(<StatusBadge status="wont_fix" />)
    expect(screen.getByText('wont_fix')).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('renders different priority variants correctly', () => {
    const { rerender } = render(<StatusBadge priority="low" />)
    expect(screen.getByText('low')).toHaveClass('bg-gray-100', 'text-gray-800')

    rerender(<StatusBadge priority="medium" />)
    expect(screen.getByText('medium')).toHaveClass('bg-blue-100', 'text-blue-800')

    rerender(<StatusBadge priority="high" />)
    expect(screen.getByText('high')).toHaveClass('bg-orange-100', 'text-orange-800')

    rerender(<StatusBadge priority="critical" />)
    expect(screen.getByText('critical')).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('uses children as content when provided', () => {
    render(<StatusBadge status="open">Custom Content</StatusBadge>)
    
    expect(screen.getByText('Custom Content')).toBeInTheDocument()
    expect(screen.queryByText('open')).not.toBeInTheDocument()
  })

  it('uses status as content when no children provided', () => {
    render(<StatusBadge status="reviewing" />)
    
    expect(screen.getByText('reviewing')).toBeInTheDocument()
  })

  it('uses priority as content when no children provided', () => {
    render(<StatusBadge priority="critical" />)
    
    expect(screen.getByText('critical')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<StatusBadge status="open" className="custom-class">Open</StatusBadge>)
    
    const badge = screen.getByText('Open')
    expect(badge).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<StatusBadge ref={ref} status="open">Open</StatusBadge>)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<StatusBadge status="open" onClick={handleClick}>Open</StatusBadge>)
    
    const badge = screen.getByText('Open')
    badge.click()
    
    expect(handleClick).toHaveBeenCalled()
  })

  it('renders without any variant', () => {
    render(<StatusBadge>No Variant</StatusBadge>)
    
    const badge = screen.getByText('No Variant')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full')
  })

  it('prioritizes status over priority when both provided', () => {
    render(<StatusBadge status="open" priority="high" />)
    
    const badge = screen.getByText('open')
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800') // status colors
    expect(badge).not.toHaveClass('bg-orange-100', 'text-orange-800') // priority colors
  })
})