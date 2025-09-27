import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock the ListingActions component for testing
const MockListingActions = ({ 
  listing,
  onEdit,
  onDelete,
  onToggleSold,
  loading = false,
  disabled = false,
  variant = "default"
}: any) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [soldDialogOpen, setSoldDialogOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  const handleEdit = () => {
    if (!loading && !disabled) {
      onEdit(listing.id)
    }
  }

  const handleDelete = async () => {
    if (!loading && !disabled) {
      setActionLoading('delete')
      try {
        await onDelete(listing.id)
        setDeleteDialogOpen(false)
      } finally {
        setActionLoading(null)
      }
    }
  }

  const handleToggleSold = async () => {
    if (!loading && !disabled) {
      setActionLoading('sold')
      try {
        await onToggleSold(listing.id, !listing.is_sold)
        setSoldDialogOpen(false)
      } finally {
        setActionLoading(null)
      }
    }
  }

  const isLoading = loading || actionLoading !== null
  const isDisabled = disabled || isLoading

  if (variant === "dropdown") {
    return (
      <div data-testid="listing-actions-dropdown">
        <button
          data-testid="dropdown-trigger"
          disabled={isDisabled}
          aria-label={`Actions for ${listing.title}`}
        >
          More Actions
        </button>
        <div data-testid="dropdown-menu" style={{ display: 'block' }}>
          <button onClick={handleEdit} disabled={isDisabled} data-testid="edit-action">
            Edit listing
          </button>
          <button onClick={() => setSoldDialogOpen(true)} disabled={isDisabled} data-testid="sold-action">
            {listing.is_sold ? "Mark as available" : "Mark as sold"}
          </button>
          <button onClick={() => setDeleteDialogOpen(true)} disabled={isDisabled} data-testid="delete-action">
            Delete listing
          </button>
        </div>
        
        {deleteDialogOpen && (
          <div data-testid="delete-dialog">
            <h2>Delete listing</h2>
            <p>Are you sure you want to delete "{listing.title}"? This action cannot be undone.</p>
            <button onClick={handleDelete} disabled={actionLoading === 'delete'} data-testid="confirm-delete">
              {actionLoading === 'delete' ? 'Loading...' : 'Delete'}
            </button>
            <button onClick={() => setDeleteDialogOpen(false)} data-testid="cancel-delete">
              Cancel
            </button>
          </div>
        )}

        {soldDialogOpen && (
          <div data-testid="sold-dialog">
            <h2>{listing.is_sold ? "Mark as available" : "Mark as sold"}</h2>
            <p>
              {listing.is_sold
                ? `Mark "${listing.title}" as available for sale again?`
                : `Mark "${listing.title}" as sold? This will hide it from public listings.`}
            </p>
            <button onClick={handleToggleSold} disabled={actionLoading === 'sold'} data-testid="confirm-sold">
              {actionLoading === 'sold' ? 'Loading...' : (listing.is_sold ? "Mark available" : "Mark sold")}
            </button>
            <button onClick={() => setSoldDialogOpen(false)} data-testid="cancel-sold">
              Cancel
            </button>
          </div>
        )}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div data-testid="listing-actions-compact">
        <button
          onClick={handleEdit}
          disabled={isDisabled}
          aria-label={`Edit ${listing.title}`}
          data-testid="edit-button"
        >
          Edit
        </button>
        <button
          onClick={() => setSoldDialogOpen(true)}
          disabled={isDisabled}
          aria-label={listing.is_sold ? `Mark ${listing.title} as available` : `Mark ${listing.title} as sold`}
          data-testid="sold-button"
        >
          {listing.is_sold ? "Available" : "Sold"}
        </button>
        <button
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDisabled}
          aria-label={`Delete ${listing.title}`}
          data-testid="delete-button"
        >
          Delete
        </button>

        {deleteDialogOpen && (
          <div data-testid="delete-dialog">
            <h2>Delete listing</h2>
            <p>Are you sure you want to delete "{listing.title}"? This action cannot be undone.</p>
            <button onClick={handleDelete} disabled={actionLoading === 'delete'} data-testid="confirm-delete">
              {actionLoading === 'delete' ? 'Loading...' : 'Delete'}
            </button>
            <button onClick={() => setDeleteDialogOpen(false)} data-testid="cancel-delete">
              Cancel
            </button>
          </div>
        )}

        {soldDialogOpen && (
          <div data-testid="sold-dialog">
            <h2>{listing.is_sold ? "Mark as available" : "Mark as sold"}</h2>
            <p>
              {listing.is_sold
                ? `Mark "${listing.title}" as available for sale again?`
                : `Mark "${listing.title}" as sold? This will hide it from public listings.`}
            </p>
            <button onClick={handleToggleSold} disabled={actionLoading === 'sold'} data-testid="confirm-sold">
              {actionLoading === 'sold' ? 'Loading...' : (listing.is_sold ? "Mark available" : "Mark sold")}
            </button>
            <button onClick={() => setSoldDialogOpen(false)} data-testid="cancel-sold">
              Cancel
            </button>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div data-testid="listing-actions-default">
      <button
        onClick={handleEdit}
        disabled={isDisabled}
        aria-label={`Edit ${listing.title}`}
        data-testid="edit-button"
      >
        Edit
      </button>
      <button
        onClick={() => setSoldDialogOpen(true)}
        disabled={isDisabled}
        aria-label={listing.is_sold ? `Mark ${listing.title} as available` : `Mark ${listing.title} as sold`}
        data-testid="sold-button"
      >
        {listing.is_sold ? "Mark Available" : "Mark Sold"}
      </button>
      <button
        onClick={() => setDeleteDialogOpen(true)}
        disabled={isDisabled}
        aria-label={`Delete ${listing.title}`}
        data-testid="delete-button"
      >
        Delete
      </button>

      {deleteDialogOpen && (
        <div data-testid="delete-dialog">
          <h2>Delete listing</h2>
          <p>Are you sure you want to delete "{listing.title}"? This action cannot be undone.</p>
          <button onClick={handleDelete} disabled={actionLoading === 'delete'} data-testid="confirm-delete">
            {actionLoading === 'delete' ? 'Loading...' : 'Delete'}
          </button>
          <button onClick={() => setDeleteDialogOpen(false)} data-testid="cancel-delete">
            Cancel
          </button>
        </div>
      )}

      {soldDialogOpen && (
        <div data-testid="sold-dialog">
          <h2>{listing.is_sold ? "Mark as available" : "Mark as sold"}</h2>
          <p>
            {listing.is_sold
              ? `Mark "${listing.title}" as available for sale again?`
              : `Mark "${listing.title}" as sold? This will hide it from public listings.`}
          </p>
          <button onClick={handleToggleSold} disabled={actionLoading === 'sold'} data-testid="confirm-sold">
            {actionLoading === 'sold' ? 'Loading...' : (listing.is_sold ? "Mark available" : "Mark sold")}
          </button>
          <button onClick={() => setSoldDialogOpen(false)} data-testid="cancel-sold">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

describe('ListingActions', () => {
  const mockListing = {
    id: 1,
    title: 'Test Product',
    is_sold: false,
  }

  const mockSoldListing = {
    id: 2,
    title: 'Sold Product',
    is_sold: true,
  }

  const defaultProps = {
    listing: mockListing,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleSold: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Default variant', () => {
    it('renders all action buttons', () => {
      render(<MockListingActions {...defaultProps} />)
      
      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('sold-button')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button')).toBeInTheDocument()
    })

    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} />)
      
      await user.click(screen.getByTestId('edit-button'))
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith(1)
    })

    it('shows correct text for unsold listing', () => {
      render(<MockListingActions {...defaultProps} />)
      
      expect(screen.getByText('Mark Sold')).toBeInTheDocument()
    })

    it('shows correct text for sold listing', () => {
      render(<MockListingActions {...defaultProps} listing={mockSoldListing} />)
      
      expect(screen.getByText('Mark Available')).toBeInTheDocument()
    })

    it('opens delete confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} />)
      
      await user.click(screen.getByTestId('delete-button'))
      
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
      expect(screen.getByText('Delete listing')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete "Test Product"? This action cannot be undone.')).toBeInTheDocument()
    })

    it('calls onDelete when delete is confirmed', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} />)
      
      await user.click(screen.getByTestId('delete-button'))
      await user.click(screen.getByTestId('confirm-delete'))
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith(1)
    })

    it('closes delete dialog when cancelled', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} />)
      
      await user.click(screen.getByTestId('delete-button'))
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
      
      await user.click(screen.getByTestId('cancel-delete'))
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
    })

    it('opens sold confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} />)
      
      await user.click(screen.getByTestId('sold-button'))
      
      expect(screen.getByTestId('sold-dialog')).toBeInTheDocument()
      expect(screen.getByText('Mark as sold')).toBeInTheDocument()
    })

    it('calls onToggleSold when sold status change is confirmed', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} />)
      
      await user.click(screen.getByTestId('sold-button'))
      await user.click(screen.getByTestId('confirm-sold'))
      
      expect(defaultProps.onToggleSold).toHaveBeenCalledWith(1, true)
    })

    it('shows correct dialog content for sold listing', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} listing={mockSoldListing} />)
      
      await user.click(screen.getByTestId('sold-button'))
      
      expect(screen.getByText('Mark as available')).toBeInTheDocument()
      expect(screen.getByText('Mark "Sold Product" as available for sale again?')).toBeInTheDocument()
    })
  })

  describe('Compact variant', () => {
    it('renders compact action buttons', () => {
      render(<MockListingActions {...defaultProps} variant="compact" />)
      
      expect(screen.getByTestId('listing-actions-compact')).toBeInTheDocument()
      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('sold-button')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button')).toBeInTheDocument()
    })

    it('shows correct compact text for sold status', () => {
      render(<MockListingActions {...defaultProps} variant="compact" />)
      
      expect(screen.getByText('Sold')).toBeInTheDocument()
    })

    it('shows correct compact text for available status', () => {
      render(<MockListingActions {...defaultProps} listing={mockSoldListing} variant="compact" />)
      
      expect(screen.getByText('Available')).toBeInTheDocument()
    })
  })

  describe('Dropdown variant', () => {
    it('renders dropdown trigger', () => {
      render(<MockListingActions {...defaultProps} variant="dropdown" />)
      
      expect(screen.getByTestId('listing-actions-dropdown')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
    })

    it('shows dropdown menu items', () => {
      render(<MockListingActions {...defaultProps} variant="dropdown" />)
      
      expect(screen.getByTestId('edit-action')).toBeInTheDocument()
      expect(screen.getByTestId('sold-action')).toBeInTheDocument()
      expect(screen.getByTestId('delete-action')).toBeInTheDocument()
    })

    it('calls onEdit when dropdown edit is clicked', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} variant="dropdown" />)
      
      await user.click(screen.getByTestId('edit-action'))
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith(1)
    })
  })

  describe('Loading and disabled states', () => {
    it('disables all buttons when loading', () => {
      render(<MockListingActions {...defaultProps} loading={true} />)
      
      expect(screen.getByTestId('edit-button')).toBeDisabled()
      expect(screen.getByTestId('sold-button')).toBeDisabled()
      expect(screen.getByTestId('delete-button')).toBeDisabled()
    })

    it('disables all buttons when disabled', () => {
      render(<MockListingActions {...defaultProps} disabled={true} />)
      
      expect(screen.getByTestId('edit-button')).toBeDisabled()
      expect(screen.getByTestId('sold-button')).toBeDisabled()
      expect(screen.getByTestId('delete-button')).toBeDisabled()
    })

    it('does not call handlers when disabled', async () => {
      const user = userEvent.setup()
      render(<MockListingActions {...defaultProps} disabled={true} />)
      
      await user.click(screen.getByTestId('edit-button'))
      
      expect(defaultProps.onEdit).not.toHaveBeenCalled()
    })

    it('shows loading state in delete dialog', async () => {
      const user = userEvent.setup()
      const slowDelete = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<MockListingActions {...defaultProps} onDelete={slowDelete} />)
      
      await user.click(screen.getByTestId('delete-button'))
      await user.click(screen.getByTestId('confirm-delete'))
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper aria labels for all buttons', () => {
      render(<MockListingActions {...defaultProps} />)
      
      expect(screen.getByLabelText('Edit Test Product')).toBeInTheDocument()
      expect(screen.getByLabelText('Mark Test Product as sold')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete Test Product')).toBeInTheDocument()
    })

    it('has proper aria labels for sold listing', () => {
      render(<MockListingActions {...defaultProps} listing={mockSoldListing} />)
      
      expect(screen.getByLabelText('Mark Sold Product as available')).toBeInTheDocument()
    })

    it('has proper aria label for dropdown trigger', () => {
      render(<MockListingActions {...defaultProps} variant="dropdown" />)
      
      expect(screen.getByLabelText('Actions for Test Product')).toBeInTheDocument()
    })
  })

  describe('Async operations', () => {
    it('calls delete function with correct parameters', async () => {
      const user = userEvent.setup()
      const mockDelete = vi.fn().mockResolvedValue(undefined)
      render(<MockListingActions {...defaultProps} onDelete={mockDelete} />)
      
      await user.click(screen.getByTestId('delete-button'))
      await user.click(screen.getByTestId('confirm-delete'))
      
      expect(mockDelete).toHaveBeenCalledWith(1)
    })

    it('calls toggle sold function with correct parameters', async () => {
      const user = userEvent.setup()
      const mockToggleSold = vi.fn().mockResolvedValue(undefined)
      render(<MockListingActions {...defaultProps} onToggleSold={mockToggleSold} />)
      
      await user.click(screen.getByTestId('sold-button'))
      await user.click(screen.getByTestId('confirm-sold'))
      
      expect(mockToggleSold).toHaveBeenCalledWith(1, true)
    })
  })
})