import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { BugSubmissionForm } from '../bug-submission-form'

describe('BugSubmissionForm', () => {
  it('renders form elements', () => {
    render(<BugSubmissionForm />)
    
    expect(screen.getByText(/submit a bug report/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bug title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/application name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit bug report/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    const submitButton = screen.getByRole('button', { name: /submit bug report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      expect(screen.getByText(/application name is required/i)).toBeInTheDocument()
    })
  })

  it('validates minimum field lengths', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    await user.type(screen.getByLabelText(/bug title/i), 'Short')
    await user.type(screen.getByLabelText(/description/i), 'Too short')
    
    const submitButton = screen.getByRole('button', { name: /submit bug report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/title must be at least 10 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/description must be at least 20 characters/i)).toBeInTheDocument()
    })
  })

  it('validates URL format', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    await user.type(screen.getByLabelText(/application url/i), 'invalid-url')
    
    const submitButton = screen.getByRole('button', { name: /submit bug report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument()
    })
  })

  it('handles tag selection', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    const uiTag = screen.getByText('UI')
    await user.click(uiTag)
    
    expect(uiTag).toHaveClass('bg-primary')
    
    // Click again to deselect
    await user.click(uiTag)
    expect(uiTag).not.toHaveClass('bg-primary')
  })

  it('handles priority selection', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    const prioritySelect = screen.getByRole('combobox')
    await user.click(prioritySelect)
    
    const highPriority = screen.getByText('High')
    await user.click(highPriority)
    
    expect(screen.getByDisplayValue('high')).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<BugSubmissionForm onSubmit={onSubmit} />)
    
    await user.type(screen.getByLabelText(/bug title/i), 'This is a test bug title')
    await user.type(screen.getByLabelText(/description/i), 'This is a detailed description of the bug that is long enough')
    await user.type(screen.getByLabelText(/application name/i), 'Test App')
    
    const submitButton = screen.getByRole('button', { name: /submit bug report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'This is a test bug title',
          description: 'This is a detailed description of the bug that is long enough',
          applicationName: 'Test App',
          priority: 'medium'
        })
      )
    })
  })

  it('shows success state', () => {
    render(<BugSubmissionForm success={true} />)
    
    expect(screen.getByText(/bug report submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/thank you for helping improve software quality/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<BugSubmissionForm isLoading={true} />)
    
    expect(screen.getByText(/submitting/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })

  it('displays error message', () => {
    const errorMessage = 'Failed to submit bug report'
    render(<BugSubmissionForm error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('handles file upload', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    const file = new File(['screenshot'], 'screenshot.png', { type: 'image/png' })
    
    // Find the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    if (fileInput) {
      await user.upload(fileInput, file)
      
      // Check if the file name appears in the preview (may take a moment to render)
      await waitFor(() => {
        expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument()
      })
    }
  })

  it('validates email format for contact email', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    await user.type(screen.getByLabelText(/email address/i), 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /submit bug report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('handles multiple tag selection', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    // Select multiple tags
    const uiTag = screen.getByText('UI')
    const crashTag = screen.getByText('Crash')
    
    await user.click(uiTag)
    await user.click(crashTag)
    
    expect(uiTag).toHaveClass('bg-primary')
    expect(crashTag).toHaveClass('bg-primary')
    
    // Deselect one tag
    await user.click(uiTag)
    expect(uiTag).not.toHaveClass('bg-primary')
    expect(crashTag).toHaveClass('bg-primary')
  })

  it('handles technical details input', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    await user.type(screen.getByLabelText(/operating system/i), 'Windows 11')
    await user.type(screen.getByLabelText(/app version/i), '2.1.0')
    
    expect(screen.getByDisplayValue('Windows 11')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2.1.0')).toBeInTheDocument()
  })

  it('shows character count for description', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    const description = 'This is a test description'
    await user.type(screen.getByLabelText(/description/i), description)
    
    expect(screen.getByText(`${description.length}/2000 characters`)).toBeInTheDocument()
  })

  it('handles device type selection', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    const deviceSelect = screen.getByRole('combobox', { name: /device type/i })
    await user.click(deviceSelect)
    
    const mobileOption = screen.getByText('Mobile')
    await user.click(mobileOption)
    
    expect(screen.getByDisplayValue('Mobile')).toBeInTheDocument()
  })

  it('prevents form submission when loading', async () => {
    const onSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<BugSubmissionForm onSubmit={onSubmit} isLoading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /submitting/i })
    expect(submitButton).toBeDisabled()
    
    await user.click(submitButton)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears form errors when user starts typing', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    // Trigger validation errors
    const submitButton = screen.getByRole('button', { name: /submit bug report/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
    
    // Start typing in title field
    const titleInput = screen.getByLabelText(/bug title/i)
    await user.type(titleInput, 'New title')
    
    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
    })
  })

  it('handles file removal from upload', async () => {
    const user = userEvent.setup()
    render(<BugSubmissionForm />)
    
    const file = new File(['screenshot'], 'screenshot.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    if (fileInput) {
      await user.upload(fileInput, file)
      
      // Wait for file to be uploaded and preview to appear
      await waitFor(() => {
        expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument()
      })
      
      // Find and click remove button
      const removeButton = screen.getByRole('button', { name: '' }) // X button
      await user.click(removeButton)
      
      // File should be removed
      await waitFor(() => {
        expect(screen.queryByAltText('Screenshot 1')).not.toBeInTheDocument()
      })
    }
  })
})