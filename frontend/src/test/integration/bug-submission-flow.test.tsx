import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { BugSubmissionForm } from '@/components/bugs/bug-submission-form'

describe('Bug Submission Flow', () => {
  it('completes full bug submission workflow', async () => {
    const onSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<BugSubmissionForm onSubmit={onSubmit} />)
    
    // Fill out basic information
    await user.type(screen.getByLabelText(/bug title/i), 'Application crashes on startup')
    await user.type(
      screen.getByLabelText(/description/i), 
      'The application crashes immediately when I try to start it. This happens every time I launch the app.'
    )
    await user.type(screen.getByLabelText(/application name/i), 'MyApp')
    await user.type(screen.getByLabelText(/application url/i), 'https://myapp.com')
    
    // Select priority
    const prioritySelect = screen.getByRole('combobox')
    await user.click(prioritySelect)
    await user.click(screen.getByText('High'))
    
    // Select tags
    await user.click(screen.getByText('Crash'))
    await user.click(screen.getByText('Desktop'))
    
    // Fill technical details
    await user.type(screen.getByLabelText(/operating system/i), 'Windows 11')
    await user.type(screen.getByLabelText(/app version/i), '2.1.0')
    
    // Add contact email
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /submit bug report/i }))
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Application crashes on startup',
        description: 'The application crashes immediately when I try to start it. This happens every time I launch the app.',
        applicationName: 'MyApp',
        applicationUrl: 'https://myapp.com',
        priority: 'high',
        tags: ['crash', 'desktop'],
        operatingSystem: 'Windows 11',
        deviceType: '',
        appVersion: '2.1.0',
        browserVersion: '',
        screenshots: [],
        contactEmail: 'user@example.com'
      })
    })
  })

  it('handles form validation errors gracefully', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /submit bug report/i }))
    
    // Check that validation errors appear
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      expect(screen.getByText(/application name is required/i)).toBeInTheDocument()
    })
    
    // Fill in title but make it too short
    await user.type(screen.getByLabelText(/bug title/i), 'Short')
    await user.click(screen.getByRole('button', { name: /submit bug report/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/title must be at least 10 characters/i)).toBeInTheDocument()
    })
    
    // Fix the title
    await user.clear(screen.getByLabelText(/bug title/i))
    await user.type(screen.getByLabelText(/bug title/i), 'This is a proper bug title')
    
    // Verify error is cleared
    await waitFor(() => {
      expect(screen.queryByText(/title must be at least 10 characters/i)).not.toBeInTheDocument()
    })
  })

  it('handles file upload workflow', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    // Create mock files
    const file1 = new File(['screenshot1'], 'screenshot1.png', { type: 'image/png' })
    const file2 = new File(['screenshot2'], 'screenshot2.jpg', { type: 'image/jpeg' })
    
    const fileInput = screen.getByRole('button', { name: /browse files/i }).parentElement?.querySelector('input[type="file"]')
    
    if (fileInput) {
      // Upload files
      await user.upload(fileInput, [file1, file2])
      
      // Verify files are displayed
      expect(screen.getByText('screenshot1.png')).toBeInTheDocument()
      expect(screen.getByText('screenshot2.jpg')).toBeInTheDocument()
      
      // Remove a file
      const removeButtons = screen.getAllByRole('button', { name: '' }) // X buttons
      await user.click(removeButtons[0])
      
      // Verify file is removed
      expect(screen.queryByText('screenshot1.png')).not.toBeInTheDocument()
      expect(screen.getByText('screenshot2.jpg')).toBeInTheDocument()
    }
  })

  it('shows success state after submission', async () => {
    const { rerender } = render(<BugSubmissionForm />)
    
    // Simulate successful submission
    rerender(<BugSubmissionForm success={true} />)
    
    expect(screen.getByText(/bug report submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/thank you for helping improve software quality/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view all bugs/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit another bug/i })).toBeInTheDocument()
  })
})