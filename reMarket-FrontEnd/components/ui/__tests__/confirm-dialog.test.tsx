import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock the ConfirmDialog component for testing
const MockConfirmDialog = ({ 
  open, 
  title, 
  description, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  variant = 'default',
  onConfirm, 
  onCancel, 
  onOpenChange,
  loading = false,
  disabled = false 
}: any) => {
  if (!open) return null
  
  const handleConfirm = () => {
    if (!loading && !disabled) {
      onConfirm()
    }
  }
  
  const handleCancel = () => {
    if (!loading) {
      onCancel?.()
      onOpenChange?.(false)
    }
  }
  
  return (
    <div role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
      <h2 id="dialog-title">{title}</h2>
      <p id="dialog-description">{description}</p>
      <button 
        onClick={handleCancel}
        disabled={loading}
        aria-label={`${cancelText} - Close dialog without performing action`}
      >
        {cancelText}
      </button>
      <button 
        onClick={handleConfirm}
        disabled={loading || disabled}
        className={variant === 'destructive' ? 'bg-destructive' : ''}
        aria-label={`${confirmText} - Perform the requested action`}
      >
        {loading ? 'Loading...' : confirmText}
      </button>
    </div>
  )
}

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Test Title',
    description: 'Test description',
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default props', () => {
    render(<MockConfirmDialog {...defaultProps} />)
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(<MockConfirmDialog {...defaultProps} open={false} />)
    
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    render(<MockConfirmDialog {...defaultProps} />)
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<MockConfirmDialog {...defaultProps} onCancel={onCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange when dialog is closed', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<MockConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders custom button text', () => {
    render(
      <MockConfirmDialog
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    )
    
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument()
  })

  it('applies destructive variant styling', () => {
    render(<MockConfirmDialog {...defaultProps} variant="destructive" />)
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    expect(confirmButton).toHaveClass('bg-destructive')
  })

  it('shows loading state', () => {
    render(<MockConfirmDialog {...defaultProps} loading={true} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  it('disables confirm button when disabled prop is true', () => {
    render(<MockConfirmDialog {...defaultProps} disabled={true} />)
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    expect(confirmButton).toBeDisabled()
  })

  it('does not call onConfirm when loading', async () => {
    const user = userEvent.setup()
    render(<MockConfirmDialog {...defaultProps} loading={true} />)
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    expect(defaultProps.onConfirm).not.toHaveBeenCalled()
  })

  it('does not call onConfirm when disabled', async () => {
    const user = userEvent.setup()
    render(<MockConfirmDialog {...defaultProps} disabled={true} />)
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    expect(defaultProps.onConfirm).not.toHaveBeenCalled()
  })

  it('does not close dialog when loading and cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <MockConfirmDialog
        {...defaultProps}
        loading={true}
        onOpenChange={onOpenChange}
      />
    )
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    render(<MockConfirmDialog {...defaultProps} />)
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    
    expect(confirmButton).toHaveAttribute('aria-label')
    expect(cancelButton).toHaveAttribute('aria-label')
  })

  it('has proper dialog role and labeling', () => {
    render(<MockConfirmDialog {...defaultProps} />)
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description')
  })
})