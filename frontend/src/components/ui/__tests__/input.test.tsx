import { render, screen, fireEvent } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" placeholder="Password" />)
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" placeholder="Number" />)
    expect(screen.getByPlaceholderText('Number')).toHaveAttribute('type', 'number')
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText('Enter text')
    await user.type(input, 'Hello World')
    
    expect(input).toHaveValue('Hello World')
  })

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled input" />)
    
    const input = screen.getByPlaceholderText('Disabled input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" placeholder="Custom input" />)
    
    const input = screen.getByPlaceholderText('Custom input')
    expect(input).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Input ref={ref} placeholder="Ref input" />)
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('handles onChange events', async () => {
    const handleChange = jest.fn()
    const user = userEvent.setup()
    
    render(<Input onChange={handleChange} placeholder="Change input" />)
    
    const input = screen.getByPlaceholderText('Change input')
    await user.type(input, 'test')
    
    expect(handleChange).toHaveBeenCalledTimes(4) // One for each character
  })

  it('handles focus and blur events', async () => {
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    const user = userEvent.setup()
    
    render(
      <Input 
        onFocus={handleFocus} 
        onBlur={handleBlur} 
        placeholder="Focus input" 
      />
    )
    
    const input = screen.getByPlaceholderText('Focus input')
    
    await user.click(input)
    expect(handleFocus).toHaveBeenCalled()
    
    await user.tab()
    expect(handleBlur).toHaveBeenCalled()
  })

  it('supports required attribute', () => {
    render(<Input required placeholder="Required input" />)
    
    const input = screen.getByPlaceholderText('Required input')
    expect(input).toBeRequired()
  })

  it('supports maxLength attribute', async () => {
    const user = userEvent.setup()
    render(<Input maxLength={5} placeholder="Max length input" />)
    
    const input = screen.getByPlaceholderText('Max length input')
    await user.type(input, '123456789')
    
    expect(input).toHaveValue('12345')
  })
})