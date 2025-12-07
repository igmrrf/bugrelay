import { render, screen, fireEvent } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { Textarea } from '../textarea'

describe('Textarea', () => {
  it('renders with default props', () => {
    render(<Textarea placeholder="Enter text" />)
    
    const textarea = screen.getByPlaceholderText('Enter text')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('applies default styling classes', () => {
    render(<Textarea placeholder="Test textarea" />)
    
    const textarea = screen.getByPlaceholderText('Test textarea')
    expect(textarea).toHaveClass(
      'flex',
      'min-h-[80px]',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-sm'
    )
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Textarea placeholder="Enter text" />)
    
    const textarea = screen.getByPlaceholderText('Enter text')
    await user.type(textarea, 'Hello World\nMultiple lines')
    
    expect(textarea).toHaveValue('Hello World\nMultiple lines')
  })

  it('can be disabled', () => {
    render(<Textarea disabled placeholder="Disabled textarea" />)
    
    const textarea = screen.getByPlaceholderText('Disabled textarea')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Textarea className="custom-class" placeholder="Custom textarea" />)
    
    const textarea = screen.getByPlaceholderText('Custom textarea')
    expect(textarea).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Textarea ref={ref} placeholder="Ref textarea" />)
    
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('handles onChange events', async () => {
    const handleChange = jest.fn()
    const user = userEvent.setup()
    
    render(<Textarea onChange={handleChange} placeholder="Change textarea" />)
    
    const textarea = screen.getByPlaceholderText('Change textarea')
    await user.type(textarea, 'test')
    
    expect(handleChange).toHaveBeenCalledTimes(4) // One for each character
  })

  it('handles focus and blur-sm events', async () => {
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    const user = userEvent.setup()
    
    render(
      <Textarea 
        onFocus={handleFocus} 
        onBlur={handleBlur} 
        placeholder="Focus textarea" 
      />
    )
    
    const textarea = screen.getByPlaceholderText('Focus textarea')
    
    await user.click(textarea)
    expect(handleFocus).toHaveBeenCalled()
    
    await user.tab()
    expect(handleBlur).toHaveBeenCalled()
  })

  it('supports required attribute', () => {
    render(<Textarea required placeholder="Required textarea" />)
    
    const textarea = screen.getByPlaceholderText('Required textarea')
    expect(textarea).toBeRequired()
  })

  it('supports maxLength attribute', async () => {
    const user = userEvent.setup()
    render(<Textarea maxLength={10} placeholder="Max length textarea" />)
    
    const textarea = screen.getByPlaceholderText('Max length textarea')
    await user.type(textarea, 'This is a very long text that exceeds the limit')
    
    expect(textarea).toHaveValue('This is a ')
  })

  it('supports rows attribute', () => {
    render(<Textarea rows={5} placeholder="Rows textarea" />)
    
    const textarea = screen.getByPlaceholderText('Rows textarea')
    expect(textarea).toHaveAttribute('rows', '5')
  })

  it('supports cols attribute', () => {
    render(<Textarea cols={50} placeholder="Cols textarea" />)
    
    const textarea = screen.getByPlaceholderText('Cols textarea')
    expect(textarea).toHaveAttribute('cols', '50')
  })

  it('handles multiline text correctly', async () => {
    const user = userEvent.setup()
    render(<Textarea placeholder="Multiline textarea" />)
    
    const textarea = screen.getByPlaceholderText('Multiline textarea')
    const multilineText = 'Line 1\nLine 2\nLine 3'
    
    await user.type(textarea, multilineText)
    expect(textarea).toHaveValue(multilineText)
  })

  it('supports defaultValue', () => {
    render(<Textarea defaultValue="Default content" placeholder="Default textarea" />)
    
    const textarea = screen.getByPlaceholderText('Default textarea')
    expect(textarea).toHaveValue('Default content')
  })

  it('supports controlled value', () => {
    const { rerender } = render(<Textarea value="Initial value" onChange={() => {}} />)
    
    const textarea = screen.getByDisplayValue('Initial value')
    expect(textarea).toHaveValue('Initial value')
    
    rerender(<Textarea value="Updated value" onChange={() => {}} />)
    expect(textarea).toHaveValue('Updated value')
  })

  it('has proper focus styling', () => {
    render(<Textarea placeholder="Focus styling" />)
    
    const textarea = screen.getByPlaceholderText('Focus styling')
    expect(textarea).toHaveClass(
      'focus-visible:outline-hidden',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    )
  })

  it('has proper placeholder styling', () => {
    render(<Textarea placeholder="Placeholder styling" />)
    
    const textarea = screen.getByPlaceholderText('Placeholder styling')
    expect(textarea).toHaveClass('placeholder:text-muted-foreground')
  })

  it('handles resize behavior', () => {
    render(<Textarea placeholder="Resize textarea" style={{ resize: 'vertical' }} />)
    
    const textarea = screen.getByPlaceholderText('Resize textarea')
    expect(textarea).toHaveStyle({ resize: 'vertical' })
  })

  it('supports readOnly attribute', () => {
    render(<Textarea readOnly value="Read only content" />)
    
    const textarea = screen.getByDisplayValue('Read only content')
    expect(textarea).toHaveAttribute('readOnly')
  })

  it('handles form validation attributes', () => {
    render(
      <Textarea 
        required 
        minLength={5} 
        maxLength={100}
        placeholder="Validation textarea" 
      />
    )
    
    const textarea = screen.getByPlaceholderText('Validation textarea')
    expect(textarea).toBeRequired()
    expect(textarea).toHaveAttribute('minLength', '5')
    expect(textarea).toHaveAttribute('maxLength', '100')
  })

  it('passes through custom HTML attributes', () => {
    render(
      <Textarea 
        data-testid="custom-textarea"
        aria-label="Custom textarea"
        placeholder="Custom attributes"
      />
    )
    
    const textarea = screen.getByTestId('custom-textarea')
    expect(textarea).toHaveAttribute('aria-label', 'Custom textarea')
  })
})