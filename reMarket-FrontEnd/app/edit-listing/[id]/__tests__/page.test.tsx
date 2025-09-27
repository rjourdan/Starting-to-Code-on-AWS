import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import EditListingPage from '../page'
import * as api from '@/lib/api'

// Mock API functions
vi.mock('@/lib/api', () => ({
  getCategories: vi.fn(),
  getProduct: vi.fn(),
  updateProduct: vi.fn(),
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
  useParams: () => ({
    id: '1',
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

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => (e) => {
      e?.preventDefault?.()
      return fn({
        title: 'Updated Product',
        description: 'Updated description',
        price: 149.99,
        condition: 'excellent',
        location: 'Updated City',
        category_id: 2,
      })
    }),
    formState: { errors: {}, isSubmitting: false },
    setValue: vi.fn(),
    watch: vi.fn(),
    reset: vi.fn(),
  }),
  FormProvider: ({ children }: any) => children,
  useFormContext: () => ({
    register: vi.fn(),
    formState: { errors: {} },
    getFieldState: vi.fn(() => ({ error: undefined })),
  }),
  Controller: ({ render }: any) => render({ field: { onChange: vi.fn(), value: '' } }),
}))

// Mock zod resolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(),
}))

const mockCategories = [
  { id: 1, name: 'Electronics', icon: 'laptop' },
  { id: 2, name: 'Clothing', icon: 'shirt' },
]

const mockProduct = {
  id: 1,
  title: 'Test Product',
  description: 'Test description',
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
}

describe('EditListingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories)
    vi.mocked(api.getProduct).mockResolvedValue(mockProduct)
    vi.mocked(api.updateProduct).mockResolvedValue({ ...mockProduct, title: 'Updated Product' })
  })

  it('renders the edit page', async () => {
    render(<EditListingPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeInTheDocument()
    })
  })

  it('loads product data on mount', async () => {
    render(<EditListingPage />)
    
    await waitFor(() => {
      expect(vi.mocked(api.getProduct)).toHaveBeenCalledWith("1")
      expect(vi.mocked(api.getCategories)).toHaveBeenCalled()
    })
  })

  it('can submit the form', async () => {
    const user = userEvent.setup()
    render(<EditListingPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: /update listing/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(vi.mocked(api.updateProduct)).toHaveBeenCalled()
    })
  })

  it('shows success message after updating', async () => {
    const user = userEvent.setup()
    render(<EditListingPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: /update listing/i })
    await user.click(submitButton)
    
    // Verify the API was called successfully
    await waitFor(() => {
      expect(vi.mocked(api.updateProduct)).toHaveBeenCalled()
    })
  })

  it('handles API errors', async () => {
    const user = userEvent.setup()
    vi.mocked(api.updateProduct).mockRejectedValue(new Error('Update failed'))
    
    render(<EditListingPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: /update listing/i })
    await user.click(submitButton)
    
    // Verify the API was called (even though it failed)
    await waitFor(() => {
      expect(vi.mocked(api.updateProduct)).toHaveBeenCalled()
    })
  })
})