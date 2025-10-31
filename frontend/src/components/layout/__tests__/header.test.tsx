import { render, screen, fireEvent } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { Header } from '../header'
import { mockUser } from '@/test/utils'

describe('Header', () => {
  it('renders brand and navigation', () => {
    render(<Header />)
    
    expect(screen.getByText('BugRelay')).toBeInTheDocument()
    expect(screen.getByText('Browse Bugs')).toBeInTheDocument()
    expect(screen.getByText('Submit Bug')).toBeInTheDocument()
    expect(screen.getByText('Companies')).toBeInTheDocument()
  })

  it('renders search bar', () => {
    render(<Header />)
    
    expect(screen.getByPlaceholderText(/search bugs, companies/i)).toBeInTheDocument()
  })

  it('shows sign in/up buttons when not authenticated', () => {
    render(<Header isAuthenticated={false} />)
    
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('shows user menu when authenticated', () => {
    render(<Header isAuthenticated={true} user={mockUser} />)
    
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign up')).not.toBeInTheDocument()
  })

  it('handles search submission', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<Header onSearch={onSearch} />)
    
    const searchInput = screen.getByPlaceholderText(/search bugs, companies/i)
    await user.type(searchInput, 'test query')
    await user.keyboard('{Enter}')
    
    expect(onSearch).toHaveBeenCalledWith('test query')
  })

  it('toggles mobile menu', async () => {
    const user = userEvent.setup()
    
    // Mock window.innerWidth to simulate mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })
    
    render(<Header />)
    
    const menuButton = screen.getByRole('button', { name: '' }) // Menu icon button
    await user.click(menuButton)
    
    // Mobile navigation should be visible
    const mobileNav = screen.getByRole('navigation')
    expect(mobileNav).toBeInTheDocument()
  })

  it('displays user avatar when available', () => {
    render(<Header isAuthenticated={true} user={mockUser} />)
    
    const avatar = screen.getByAltText(mockUser.name)
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', mockUser.avatar)
  })

  it('displays user initials when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined }
    render(<Header isAuthenticated={true} user={userWithoutAvatar} />)
    
    expect(screen.getByText(mockUser.name.charAt(0).toUpperCase())).toBeInTheDocument()
  })

  it('opens user dropdown menu', async () => {
    const user = userEvent.setup()
    render(<Header isAuthenticated={true} user={mockUser} />)
    
    const userButton = screen.getByRole('button', { name: '' }) // User avatar button
    await user.click(userButton)
    
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('handles empty search', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<Header onSearch={onSearch} />)
    
    const searchInput = screen.getByPlaceholderText(/search bugs, companies/i)
    await user.keyboard('{Enter}')
    
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('trims search query', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<Header onSearch={onSearch} />)
    
    const searchInput = screen.getByPlaceholderText(/search bugs, companies/i)
    await user.type(searchInput, '  test query  ')
    await user.keyboard('{Enter}')
    
    expect(onSearch).toHaveBeenCalledWith('test query')
  })
})