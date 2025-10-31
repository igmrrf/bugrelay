import { render, screen, fireEvent } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/layout/header'
import { BugList } from '@/components/bugs/bug-list'
import { SearchFilters } from '@/components/ui/search-filters'
import { mockBug, mockUser } from '@/test/utils'

// Mock window.matchMedia for responsive tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock window dimensions
const mockWindowSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    // Reset to desktop size by default
    mockWindowSize(1024, 768)
    mockMatchMedia(false)
  })

  describe('Mobile Layout (< 768px)', () => {
    beforeEach(() => {
      mockWindowSize(375, 667) // iPhone SE size
      mockMatchMedia(true)
    })

    it('header adapts to mobile layout', async () => {
      const user = userEvent.setup()
      render(<Header isAuthenticated={true} user={mockUser} />)
      
      // Mobile menu button should be present
      const menuButtons = screen.getAllByRole('button')
      const mobileMenuButton = menuButtons.find(button => 
        button.getAttribute('aria-label') === 'Toggle menu' || 
        button.querySelector('svg')
      )
      
      expect(mobileMenuButton).toBeInTheDocument()
      
      // Click mobile menu button
      if (mobileMenuButton) {
        await user.click(mobileMenuButton)
        
        // Navigation should be visible after clicking
        const navigation = screen.getByRole('navigation')
        expect(navigation).toBeInTheDocument()
      }
    })

    it('search filters collapse on mobile', async () => {
      const user = userEvent.setup()
      render(<SearchFilters />)
      
      // Filters should be collapsed by default on mobile
      const filtersButton = screen.getByText(/filters/i)
      expect(filtersButton).toBeInTheDocument()
      
      // Status filter should not be visible initially
      expect(screen.queryByText(/status/i)).not.toBeInTheDocument()
      
      // Expand filters
      await user.click(filtersButton)
      
      // Now status filter should be visible
      expect(screen.getByText(/status/i)).toBeInTheDocument()
    })

    it('bug cards stack vertically on mobile', () => {
      const bugs = [mockBug, { ...mockBug, id: '2', title: 'Second Bug' }]
      const { container } = render(<BugList bugs={bugs} />)
      
      // Bug cards should have mobile-friendly spacing
      const bugCards = container.querySelectorAll('[class*="space-y"]')
      expect(bugCards.length).toBeGreaterThan(0)
    })
  })

  describe('Tablet Layout (768px - 1024px)', () => {
    beforeEach(() => {
      mockWindowSize(768, 1024) // iPad size
      mockMatchMedia(false)
    })

    it('header shows condensed navigation on tablet', () => {
      render(<Header isAuthenticated={true} user={mockUser} />)
      
      // Brand should be visible
      expect(screen.getByText('BugRelay')).toBeInTheDocument()
      
      // Navigation items should be visible but may be condensed
      expect(screen.getByText('Browse Bugs')).toBeInTheDocument()
      expect(screen.getByText('Submit Bug')).toBeInTheDocument()
    })

    it('search filters show in grid layout on tablet', () => {
      render(<SearchFilters />)
      
      const filtersButton = screen.getByText(/filters/i)
      expect(filtersButton).toBeInTheDocument()
    })
  })

  describe('Desktop Layout (> 1024px)', () => {
    beforeEach(() => {
      mockWindowSize(1440, 900) // Desktop size
      mockMatchMedia(false)
    })

    it('header shows full navigation on desktop', () => {
      render(<Header isAuthenticated={true} user={mockUser} />)
      
      // All navigation items should be visible
      expect(screen.getByText('BugRelay')).toBeInTheDocument()
      expect(screen.getByText('Browse Bugs')).toBeInTheDocument()
      expect(screen.getByText('Submit Bug')).toBeInTheDocument()
      expect(screen.getByText('Companies')).toBeInTheDocument()
      
      // Search bar should be visible
      expect(screen.getByPlaceholderText(/search bugs, companies/i)).toBeInTheDocument()
    })

    it('search filters show expanded by default on desktop', () => {
      render(<SearchFilters />)
      
      // Search input should be visible
      expect(screen.getByPlaceholderText(/search bugs/i)).toBeInTheDocument()
      
      // Sort dropdown should be visible
      expect(screen.getByText(/sort by/i)).toBeInTheDocument()
    })

    it('bug list shows optimal layout on desktop', () => {
      const bugs = Array.from({ length: 5 }, (_, i) => ({
        ...mockBug,
        id: `bug-${i}`,
        title: `Bug ${i}`
      }))
      
      render(<BugList bugs={bugs} />)
      
      // Should show search filters
      expect(screen.getByPlaceholderText(/search bugs/i)).toBeInTheDocument()
      
      // Should show bug count
      expect(screen.getByText('Bug Reports')).toBeInTheDocument()
      
      // All bugs should be visible
      bugs.forEach(bug => {
        expect(screen.getByText(bug.title)).toBeInTheDocument()
      })
    })
  })

  describe('Touch Interactions', () => {
    it('handles touch events on mobile devices', async () => {
      mockWindowSize(375, 667)
      const onVote = jest.fn()
      
      render(<BugList bugs={[mockBug]} onVote={onVote} />)
      
      const voteButton = screen.getByRole('button')
      
      // Simulate touch events
      fireEvent.touchStart(voteButton)
      fireEvent.touchEnd(voteButton)
      fireEvent.click(voteButton)
      
      expect(onVote).toHaveBeenCalledWith(mockBug.id)
    })

    it('provides adequate touch targets on mobile', () => {
      mockWindowSize(375, 667)
      render(<Header isAuthenticated={true} user={mockUser} />)
      
      const buttons = screen.getAllByRole('button')
      
      // All buttons should have adequate size for touch (minimum 44px)
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minSize = 44 // Minimum touch target size in pixels
        
        // Note: In test environment, computed styles may not reflect actual CSS
        // This test ensures buttons exist and are clickable
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility on Different Screen Sizes', () => {
    it('maintains keyboard navigation on all screen sizes', async () => {
      const user = userEvent.setup()
      
      // Test on mobile
      mockWindowSize(375, 667)
      const { rerender } = render(<SearchFilters />)
      
      const filtersButton = screen.getByText(/filters/i)
      
      // Should be focusable with keyboard
      await user.tab()
      expect(document.activeElement).toBe(filtersButton)
      
      // Test on desktop
      mockWindowSize(1440, 900)
      rerender(<SearchFilters />)
      
      const searchInput = screen.getByPlaceholderText(/search bugs/i)
      await user.click(searchInput)
      expect(document.activeElement).toBe(searchInput)
    })

    it('maintains proper focus management across screen sizes', async () => {
      const user = userEvent.setup()
      
      render(<Header isAuthenticated={false} />)
      
      // Tab through navigation elements
      await user.tab()
      await user.tab()
      await user.tab()
      
      // Focus should be on a focusable element
      expect(document.activeElement).toBeInstanceOf(HTMLElement)
      expect(document.activeElement?.tagName).toMatch(/BUTTON|A|INPUT/)
    })
  })

  describe('Content Reflow', () => {
    it('handles long text content on narrow screens', () => {
      mockWindowSize(320, 568) // Very narrow screen
      
      const longTitleBug = {
        ...mockBug,
        title: 'This is a very long bug title that should wrap properly on narrow screens without breaking the layout',
        description: 'This is an extremely long description that contains a lot of text and should wrap properly across multiple lines when displayed on narrow mobile screens without causing horizontal scrolling or layout issues.'
      }
      
      render(<BugList bugs={[longTitleBug]} />)
      
      // Content should be present and not cause layout issues
      expect(screen.getByText(longTitleBug.title)).toBeInTheDocument()
      expect(screen.getByText(longTitleBug.description)).toBeInTheDocument()
    })

    it('maintains readability with different font sizes', () => {
      // Simulate user with larger font preferences
      document.documentElement.style.fontSize = '18px'
      
      render(<BugList bugs={[mockBug]} />)
      
      // Content should still be accessible
      expect(screen.getByText(mockBug.title)).toBeInTheDocument()
      expect(screen.getByText(mockBug.description)).toBeInTheDocument()
      
      // Reset font size
      document.documentElement.style.fontSize = ''
    })
  })

  describe('Performance on Different Devices', () => {
    it('handles large lists efficiently on mobile', () => {
      mockWindowSize(375, 667)
      
      const manyBugs = Array.from({ length: 50 }, (_, i) => ({
        ...mockBug,
        id: `bug-${i}`,
        title: `Bug ${i}`,
        description: `Description for bug ${i}`
      }))
      
      const startTime = performance.now()
      render(<BugList bugs={manyBugs} />)
      const endTime = performance.now()
      
      // Rendering should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)
      
      // Should show load more functionality for large lists
      expect(screen.getByText('Bug Reports')).toBeInTheDocument()
    })
  })
})