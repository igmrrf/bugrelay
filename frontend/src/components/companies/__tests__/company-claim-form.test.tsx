import { render, screen, fireEvent, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { CompanyClaimForm } from '../company-claim-form'
import { mockCompany } from '@/test/utils'

describe('CompanyClaimForm', () => {
  it('renders company information', () => {
    render(<CompanyClaimForm company={mockCompany} />)
    
    expect(screen.getByText(mockCompany.name)).toBeInTheDocument()
    expect(screen.getByText(`Domain: ${mockCompany.domain}`)).toBeInTheDocument()
  })

  it('shows verification status for verified companies', () => {
    const verifiedCompany = { ...mockCompany, isVerified: true }
    render(<CompanyClaimForm company={verifiedCompany} />)
    
    expect(screen.getByText(/already verified/i)).toBeInTheDocument()
    expect(screen.getByText(/already been claimed and verified/i)).toBeInTheDocument()
  })

  it('renders claim form for unverified companies', () => {
    const unverifiedCompany = { ...mockCompany, isVerified: false }
    render(<CompanyClaimForm company={unverifiedCompany} />)
    
    expect(screen.getByText(/claim company ownership/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/work email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your position/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reason for claiming/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const unverifiedCompany = { ...mockCompany, isVerified: false }
    const user = userEvent.setup()
    
    render(<CompanyClaimForm company={unverifiedCompany} />)
    
    const submitButton = screen.getByRole('button', { name: /submit claim request/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/work email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/position is required/i)).toBeInTheDocument()
      expect(screen.getByText(/reason is required/i)).toBeInTheDocument()
    })
  })

  it('validates email domain', async () => {
    const unverifiedCompany = { ...mockCompany, isVerified: false }
    const user = userEvent.setup()
    
    render(<CompanyClaimForm company={unverifiedCompany} />)
    
    await user.type(screen.getByLabelText(/work email address/i), 'test@wrongdomain.com')
    
    const submitButton = screen.getByRole('button', { name: /submit claim request/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(`Email must be from ${mockCompany.domain} domain`)).toBeInTheDocument()
    })
  })

  it('validates minimum reason length', async () => {
    const unverifiedCompany = { ...mockCompany, isVerified: false }
    const user = userEvent.setup()
    
    render(<CompanyClaimForm company={unverifiedCompany} />)
    
    await user.type(screen.getByLabelText(/reason for claiming/i), 'Short reason')
    
    const submitButton = screen.getByRole('button', { name: /submit claim request/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please provide more details/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn()
    const unverifiedCompany = { ...mockCompany, isVerified: false }
    const user = userEvent.setup()
    
    render(<CompanyClaimForm company={unverifiedCompany} onSubmit={onSubmit} />)
    
    await user.type(screen.getByLabelText(/work email address/i), `test@${mockCompany.domain}`)
    await user.type(screen.getByLabelText(/your position/i), 'Software Engineer')
    await user.type(screen.getByLabelText(/reason for claiming/i), 'I work at this company and want to manage bug reports for our applications')
    
    const submitButton = screen.getByRole('button', { name: /submit claim request/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        companyId: mockCompany.id,
        workEmail: `test@${mockCompany.domain}`,
        position: 'Software Engineer',
        reason: 'I work at this company and want to manage bug reports for our applications'
      })
    })
  })

  it('shows success state', () => {
    render(<CompanyClaimForm company={mockCompany} success={true} />)
    
    expect(screen.getByText(/claim request submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/verification email/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const unverifiedCompany = { ...mockCompany, isVerified: false }
    render(<CompanyClaimForm company={unverifiedCompany} isLoading={true} />)
    
    expect(screen.getByText(/submitting claim/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submitting claim/i })).toBeDisabled()
  })

  it('displays error message', () => {
    const errorMessage = 'Failed to submit claim'
    const unverifiedCompany = { ...mockCompany, isVerified: false }
    
    render(<CompanyClaimForm company={unverifiedCompany} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows company not found state', () => {
    render(<CompanyClaimForm />)
    
    expect(screen.getByText(/company not found/i)).toBeInTheDocument()
  })

  it('displays company applications', () => {
    render(<CompanyClaimForm company={mockCompany} />)
    
    mockCompany.applications.forEach(app => {
      expect(screen.getByText(app.name)).toBeInTheDocument()
    })
  })
})