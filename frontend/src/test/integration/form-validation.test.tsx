import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/login-form'
import { BugSubmissionForm } from '@/components/bugs/bug-submission-form'
import { CompanyClaimForm } from '@/components/companies/company-claim-form'
import { mockCompany } from '@/test/utils'

describe('Form Validation Integration Tests', () => {
  describe('Cross-form validation consistency', () => {
    it('validates email format consistently across forms', async () => {
      const user = userEvent.setup()
      
      // Test login form
      const { rerender } = render(<LoginForm />)
      
      const loginEmailInput = screen.getByLabelText(/email/i)
      await user.type(loginEmailInput, 'invalid-email')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
      
      // Test bug submission form
      rerender(<BugSubmissionForm />)
      
      const bugEmailInput = screen.getByLabelText(/email address/i)
      await user.type(bugEmailInput, 'invalid-email')
      await user.click(screen.getByRole('button', { name: /submit bug report/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('handles required field validation consistently', async () => {
      const user = userEvent.setup()
      
      // Test login form required fields
      const { rerender } = render(<LoginForm />)
      
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
      
      // Test bug submission form required fields
      rerender(<BugSubmissionForm />)
      
      await user.click(screen.getByRole('button', { name: /submit bug report/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
        expect(screen.getByText(/application name is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Real-time validation feedback', () => {
    it('provides immediate feedback as user types', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      // Type invalid email
      await user.type(emailInput, 'invalid')
      await user.tab() // Trigger blur event
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
      
      // Fix email
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
      })
      
      // Type short password
      await user.type(passwordInput, '123')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })

    it('validates field length requirements in real-time', async () => {
      const user = userEvent.setup()
      render(<BugSubmissionForm />)
      
      const titleInput = screen.getByLabelText(/bug title/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      
      // Type short title
      await user.type(titleInput, 'Short')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByText(/title must be at least 10 characters/i)).toBeInTheDocument()
      })
      
      // Type short description
      await user.type(descriptionInput, 'Too short')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByText(/description must be at least 20 characters/i)).toBeInTheDocument()
      })
      
      // Fix title
      await user.clear(titleInput)
      await user.type(titleInput, 'This is a proper bug title')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.queryByText(/title must be at least 10 characters/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Complex validation scenarios', () => {
    it('handles domain-specific validation for company claims', async () => {
      const unverifiedCompany = { ...mockCompany, isVerified: false }
      const user = userEvent.setup()
      
      render(<CompanyClaimForm company={unverifiedCompany} />)
      
      const emailInput = screen.getByLabelText(/work email address/i)
      
      // Test wrong domain
      await user.type(emailInput, 'test@wrongdomain.com')
      await user.click(screen.getByRole('button', { name: /submit claim request/i }))
      
      await waitFor(() => {
        expect(screen.getByText(`Email must be from ${mockCompany.domain} domain`)).toBeInTheDocument()
      })
      
      // Test correct domain
      await user.clear(emailInput)
      await user.type(emailInput, `test@${mockCompany.domain}`)
      
      await waitFor(() => {
        expect(screen.queryByText(`Email must be from ${mockCompany.domain} domain`)).not.toBeInTheDocument()
      })
    })

    it('validates URL format in bug submission', async () => {
      const user = userEvent.setup()
      render(<BugSubmissionForm />)
      
      const urlInput = screen.getByLabelText(/application url/i)
      
      // Test invalid URL
      await user.type(urlInput, 'not-a-url')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument()
      })
      
      // Test valid URL
      await user.clear(urlInput)
      await user.type(urlInput, 'https://example.com')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid url/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error recovery and user guidance', () => {
    it('provides helpful error messages and recovery suggestions', async () => {
      const user = userEvent.setup()
      render(<BugSubmissionForm />)
      
      // Submit empty form to trigger all validation errors
      await user.click(screen.getByRole('button', { name: /submit bug report/i }))
      
      await waitFor(() => {
        // Should show specific, actionable error messages
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
        expect(screen.getByText(/application name is required/i)).toBeInTheDocument()
      })
      
      // Fix one error at a time and verify others remain
      const titleInput = screen.getByLabelText(/bug title/i)
      await user.type(titleInput, 'This is a valid bug title')
      
      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
        // Other errors should still be present
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
        expect(screen.getByText(/application name is required/i)).toBeInTheDocument()
      })
    })

    it('handles server-side validation errors gracefully', async () => {
      const onSubmit = jest.fn().mockRejectedValue(new Error('Server validation failed'))
      const user = userEvent.setup()
      
      render(<LoginForm onSubmit={onSubmit} />)
      
      // Fill form with valid data
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      // Should handle the error gracefully
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility in validation', () => {
    it('associates error messages with form fields for screen readers', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      
      // Trigger validation error
      await user.type(emailInput, 'invalid-email')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/please enter a valid email address/i)
        expect(errorMessage).toBeInTheDocument()
        
        // Error should be associated with the input for accessibility
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('provides keyboard navigation through validation errors', async () => {
      const user = userEvent.setup()
      render(<BugSubmissionForm />)
      
      // Submit empty form to trigger validation errors
      await user.click(screen.getByRole('button', { name: /submit bug report/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })
      
      // Should be able to navigate to first invalid field with keyboard
      const titleInput = screen.getByLabelText(/bug title/i)
      await user.tab()
      
      // Focus should move to the first invalid field
      expect(document.activeElement).toBe(titleInput)
    })
  })

  describe('Form state management', () => {
    it('preserves form data during validation', async () => {
      const user = userEvent.setup()
      render(<BugSubmissionForm />)
      
      const titleInput = screen.getByLabelText(/bug title/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      
      // Fill some fields
      await user.type(titleInput, 'Test Bug Title')
      await user.type(descriptionInput, 'This is a test description that is long enough')
      
      // Submit form (will fail due to missing required fields)
      await user.click(screen.getByRole('button', { name: /submit bug report/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/application name is required/i)).toBeInTheDocument()
      })
      
      // Previously entered data should be preserved
      expect(titleInput).toHaveValue('Test Bug Title')
      expect(descriptionInput).toHaveValue('This is a test description that is long enough')
    })

    it('handles form reset after successful submission', async () => {
      const onSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<BugSubmissionForm onSubmit={onSubmit} success={true} />)
      
      // Should show success state
      expect(screen.getByText(/bug report submitted/i)).toBeInTheDocument()
      expect(screen.getByText(/thank you for helping improve software quality/i)).toBeInTheDocument()
    })
  })
})