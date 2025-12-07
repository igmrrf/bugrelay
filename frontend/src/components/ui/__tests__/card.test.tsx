import { render, screen } from '@/test/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default styling', () => {
      render(<Card>Card content</Card>)
      
      const card = screen.getByText('Card content')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'shadow-xs')
    })

    it('applies custom className', () => {
      render(<Card className="custom-class">Card content</Card>)
      
      const card = screen.getByText('Card content')
      expect(card).toHaveClass('custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = { current: null }
      render(<Card ref={ref}>Card content</Card>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('passes through HTML attributes', () => {
      render(<Card data-testid="test-card">Card content</Card>)
      
      const card = screen.getByTestId('test-card')
      expect(card).toBeInTheDocument()
    })
  })

  describe('CardHeader', () => {
    it('renders with proper styling', () => {
      render(<CardHeader>Header content</CardHeader>)
      
      const header = screen.getByText('Header content')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Header content</CardHeader>)
      
      const header = screen.getByText('Header content')
      expect(header).toHaveClass('custom-header')
    })

    it('forwards ref correctly', () => {
      const ref = { current: null }
      render(<CardHeader ref={ref}>Header content</CardHeader>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 element with proper styling', () => {
      render(<CardTitle>Card Title</CardTitle>)
      
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Card Title')
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight')
    })

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Card Title</CardTitle>)
      
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveClass('custom-title')
    })

    it('forwards ref correctly', () => {
      const ref = { current: null }
      render(<CardTitle ref={ref}>Card Title</CardTitle>)
      
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('CardDescription', () => {
    it('renders with proper styling', () => {
      render(<CardDescription>Card description</CardDescription>)
      
      const description = screen.getByText('Card description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc">Card description</CardDescription>)
      
      const description = screen.getByText('Card description')
      expect(description).toHaveClass('custom-desc')
    })

    it('forwards ref correctly', () => {
      const ref = { current: null }
      render(<CardDescription ref={ref}>Card description</CardDescription>)
      
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })
  })

  describe('CardContent', () => {
    it('renders with proper styling', () => {
      render(<CardContent>Card content</CardContent>)
      
      const content = screen.getByText('Card content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('p-6', 'pt-0')
    })

    it('applies custom className', () => {
      render(<CardContent className="custom-content">Card content</CardContent>)
      
      const content = screen.getByText('Card content')
      expect(content).toHaveClass('custom-content')
    })

    it('forwards ref correctly', () => {
      const ref = { current: null }
      render(<CardContent ref={ref}>Card content</CardContent>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardFooter', () => {
    it('renders with proper styling', () => {
      render(<CardFooter>Footer content</CardFooter>)
      
      const footer = screen.getByText('Footer content')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer">Footer content</CardFooter>)
      
      const footer = screen.getByText('Footer content')
      expect(footer).toHaveClass('custom-footer')
    })

    it('forwards ref correctly', () => {
      const ref = { current: null }
      render(<CardFooter ref={ref}>Footer content</CardFooter>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>
      )
      
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Card')
      expect(screen.getByText('This is a test card description')).toBeInTheDocument()
      expect(screen.getByText('This is the main content of the card.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
    })

    it('maintains proper semantic structure', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Title</CardTitle>
            <CardDescription data-testid="description">Description</CardDescription>
          </CardHeader>
          <CardContent data-testid="content">Content</CardContent>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      )
      
      const card = screen.getByTestId('card')
      const header = screen.getByTestId('header')
      const content = screen.getByTestId('content')
      const footer = screen.getByTestId('footer')
      
      expect(card).toContainElement(header)
      expect(card).toContainElement(content)
      expect(card).toContainElement(footer)
    })
  })
})