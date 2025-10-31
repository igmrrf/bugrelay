import { render, screen } from '@/test/utils'
import { Footer } from '../footer'

describe('Footer', () => {
  it('renders brand section with logo and description', () => {
    render(<Footer />)
    
    expect(screen.getByText('BugRelay')).toBeInTheDocument()
    expect(screen.getByText(/public, user-driven bug tracking hub/i)).toBeInTheDocument()
  })

  it('renders product navigation links', () => {
    render(<Footer />)
    
    expect(screen.getByRole('link', { name: /browse bugs/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /submit bug/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /api documentation/i })).toBeInTheDocument()
  })

  it('renders company navigation links', () => {
    render(<Footer />)
    
    expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /careers/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /blog/i })).toBeInTheDocument()
  })

  it('renders legal navigation links', () => {
    render(<Footer />)
    
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /community guidelines/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /security/i })).toBeInTheDocument()
  })

  it('renders social media links', () => {
    render(<Footer />)
    
    const githubLink = screen.getByRole('link', { name: '' }).closest('a[href="https://github.com"]')
    const twitterLink = screen.getByRole('link', { name: '' }).closest('a[href="https://twitter.com"]')
    
    expect(githubLink).toBeInTheDocument()
    expect(twitterLink).toBeInTheDocument()
  })

  it('has correct link attributes for external links', () => {
    render(<Footer />)
    
    const githubLink = screen.getByRole('link').closest('a[href="https://github.com"]')
    const twitterLink = screen.getByRole('link').closest('a[href="https://twitter.com"]')
    
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(twitterLink).toHaveAttribute('target', '_blank')
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders copyright notice', () => {
    render(<Footer />)
    
    expect(screen.getByText(/© 2024 BugRelay. All rights reserved./)).toBeInTheDocument()
  })

  it('renders developer community message', () => {
    render(<Footer />)
    
    expect(screen.getByText(/made with ❤️ for the developer community/i)).toBeInTheDocument()
  })

  it('has proper section headings', () => {
    render(<Footer />)
    
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
  })

  it('has correct link destinations', () => {
    render(<Footer />)
    
    expect(screen.getByRole('link', { name: /browse bugs/i })).toHaveAttribute('href', '/bugs')
    expect(screen.getByRole('link', { name: /submit bug/i })).toHaveAttribute('href', '/submit')
    expect(screen.getByRole('link', { name: /companies/i })).toHaveAttribute('href', '/companies')
    expect(screen.getByRole('link', { name: /about us/i })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms')
  })

  it('renders bug icon in brand section', () => {
    render(<Footer />)
    
    const brandSection = screen.getByText('BugRelay').parentElement
    expect(brandSection?.querySelector('svg')).toBeInTheDocument()
  })

  it('renders social media icons', () => {
    render(<Footer />)
    
    // Check for GitHub and Twitter icons (lucide icons)
    const socialSection = screen.getByText('BugRelay').parentElement?.parentElement
    const icons = socialSection?.querySelectorAll('svg')
    expect(icons?.length).toBeGreaterThanOrEqual(3) // Bug icon + GitHub + Twitter
  })

  it('has responsive grid layout classes', () => {
    const { container } = render(<Footer />)
    
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-4')
  })

  it('has proper spacing and padding classes', () => {
    const { container } = render(<Footer />)
    
    const footer = container.querySelector('footer')
    expect(footer).toHaveClass('border-t', 'bg-background')
    
    const mainContainer = footer?.querySelector('.container')
    expect(mainContainer).toHaveClass('py-8', 'md:py-12')
  })

  it('renders all navigation sections with proper structure', () => {
    render(<Footer />)
    
    // Check that each section has a heading and list of links
    const productSection = screen.getByText('Product').parentElement
    const companySection = screen.getByText('Company').parentElement
    const legalSection = screen.getByText('Legal').parentElement
    
    expect(productSection?.querySelector('ul')).toBeInTheDocument()
    expect(companySection?.querySelector('ul')).toBeInTheDocument()
    expect(legalSection?.querySelector('ul')).toBeInTheDocument()
  })
})