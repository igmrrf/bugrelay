import { render, screen, fireEvent, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { SearchFilters } from '../search-filters'

describe('SearchFilters', () => {
  it('renders search input and sort dropdown', () => {
    render(<SearchFilters />)
    
    expect(screen.getByPlaceholderText(/search bugs/i)).toBeInTheDocument()
    expect(screen.getByText(/sort by/i)).toBeInTheDocument()
  })

  it('calls onSearch when filters change', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<SearchFilters onSearch={onSearch} />)
    
    const searchInput = screen.getByPlaceholderText(/search bugs/i)
    await user.type(searchInput, 'test query')
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query'
        })
      )
    })
  })

  it('expands and collapses filters', async () => {
    const user = userEvent.setup()
    render(<SearchFilters />)
    
    const filtersButton = screen.getByText(/filters/i)
    await user.click(filtersButton)
    
    expect(screen.getByText(/status/i)).toBeInTheDocument()
    expect(screen.getByText(/priority/i)).toBeInTheDocument()
    expect(screen.getByText(/tags/i)).toBeInTheDocument()
  })

  it('handles status filter selection', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<SearchFilters onSearch={onSearch} />)
    
    // Expand filters
    await user.click(screen.getByText(/filters/i))
    
    // Click on Open status
    await user.click(screen.getByText('Open'))
    
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['open']
      })
    )
  })

  it('handles priority filter selection', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<SearchFilters onSearch={onSearch} />)
    
    // Expand filters
    await user.click(screen.getByText(/filters/i))
    
    // Click on High priority
    await user.click(screen.getByText('High'))
    
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: ['high']
      })
    )
  })

  it('handles tag filter selection', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<SearchFilters onSearch={onSearch} />)
    
    // Expand filters
    await user.click(screen.getByText(/filters/i))
    
    // Click on UI tag
    await user.click(screen.getByText('UI'))
    
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['ui']
      })
    )
  })

  it('clears all filters', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<SearchFilters onSearch={onSearch} />)
    
    // Add some filters first
    await user.click(screen.getByText(/filters/i))
    await user.click(screen.getByText('Open'))
    
    // Clear filters
    await user.click(screen.getByText(/clear/i))
    
    expect(onSearch).toHaveBeenCalledWith({
      query: "",
      status: [],
      priority: [],
      tags: [],
      sortBy: "recent",
      application: "",
      company: ""
    })
  })

  it('shows active filters summary', async () => {
    const user = userEvent.setup()
    
    render(<SearchFilters />)
    
    // Expand filters and select some
    await user.click(screen.getByText(/filters/i))
    await user.click(screen.getByText('Open'))
    await user.click(screen.getByText('High'))
    
    // Should show active filters
    expect(screen.getByText(/status: open/i)).toBeInTheDocument()
    expect(screen.getByText(/priority: high/i)).toBeInTheDocument()
  })

  it('removes individual active filters', async () => {
    const onSearch = jest.fn()
    const user = userEvent.setup()
    
    render(<SearchFilters onSearch={onSearch} />)
    
    // Add filters
    await user.click(screen.getByText(/filters/i))
    await user.click(screen.getByText('Open'))
    
    // Remove the status filter
    const removeButton = screen.getByRole('button', { name: '' }) // X button
    await user.click(removeButton)
    
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        status: []
      })
    )
  })
})