import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import MyListingsPage from '../page'
import * as api from '@/lib/api'

// Mock API functions
vi.mock('@/lib/api', () => ({
  getMyProducts: vi.fn(),
  deleteProduct: vi.fn(),
  toggleProductSoldStatus: vi.fn(),
}))

// Mock auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser', email: 'test@example.com' },
    isLoading: false,
  }),
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock toast hook
vi.mock('@/hooks/use-toast', () => {
  const mockToast = vi.fn()
  return {
    useToast: () => ({
      toast: mockToast,
    }),
    toast: mockToast,
  }
})

const mockProducts = [
  {
    id: 1,
    title: 'Test Product 1',
    description: 'Test description 1',
    price: 99.99,
    condition: 'good',
    location: 'Test City',
    category_id: 1,
    seller_id: 1,
    is_sold: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    images: [],
    category: { id: 1, name: 'Electronics', icon: 'laptop' },
    seller: { id: 1, username: 'testuser', email: 'test@example.com' },
  },
  {
    id: 2,
    title: 'Test Product 2',
    description: 'Test description 2',
    price: 149.99,
    condition: 'excellent',
    location: 'Test City',
    category_id: 2,
    seller_id: 1,
    is_sold: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    images: [],
    category: { id: 2, name: 'Clothing', icon: 'shirt' },
    seller: { id: 1, username: 'testuser', email: 'test@example.com' },
  },
]

describe('MyListingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getMyProducts).mockResolvedValue(mockProducts)
    vi.mocked(api.deleteProduct).mockResolvedValue(undefined)
    vi.mocked(api.toggleProductSoldStatus).mockResolvedValue({ ...mockProducts[0], is_sold: true })
  })

  it('renders the my listings page', async () => {
    render(<MyListingsPage />)
    
    expect(screen.getByText('My Listings')).toBeInTheDocument()
  })

  it('loads user products on mount', async () => {
    render(<MyListingsPage />)
    
    await waitFor(() => {
      expect(vi.mocked(api.getMyProducts)).toHaveBeenCalled()
    })
  })

  it('displays products when loaded', async () => {
    render(<MyListingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })
  })

  it('shows empty state when no products', async () => {
    vi.mocked(api.getMyProducts).mockResolvedValue([])
    render(<MyListingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('No listings yet')).toBeInTheDocument()
    })
  })

  it('can delete a product', async () => {
    const user = userEvent.setup()
    render(<MyListingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })
    
    // Find and click delete button
    const deleteButtons = screen.getAllByText('Delete')
    await user.click(deleteButtons[0])
    
    // Confirm deletion
    const confirmButton = screen.getByText('Delete')
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(vi.mocked(api.deleteProduct)).toHaveBeenCalledWith(1)
    })
  })

  it('can toggle sold status', async () => {
    const user = userEvent.setup()
    render(<MyListingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })
    
    // Find and click mark as sold button
    const soldButton = screen.getByText('Mark as Sold')
    await user.click(soldButton)
    
    await waitFor(() => {
      expect(vi.mocked(api.toggleProductSoldStatus)).toHaveBeenCalledWith(1, { is_sold: true })
    })
  })
})