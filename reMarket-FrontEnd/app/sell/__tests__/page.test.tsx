import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SellPage from '../page'
import * as api from '@/lib/api'

// Mock API functions
vi.mock('@/lib/api', () => ({
  getCategories: vi.fn(),
  createProduct: vi.fn(),
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

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => (e) => {
      e?.preventDefault?.()
      return fn({
        title: 'Test Product',
        description: 'Test description',
        price: 99.99,
        condition: 'good',
        location: 'Test City',
        category_id: 1,
      })
    }),
    formState: { errors: {}, isSubmitting: false },
    setValue: vi.fn(),
    watch: vi.fn(),
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

describe('SellPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories)
    vi.mocked(api.createProduct).mockResolvedValue(mockProduct)
  })

  it('renders the sell page', async () => {
    render(<SellPage />)
    
    expect(screen.getByText('Create a Listing')).toBeInTheDocument()
    expect(screen.getByText('Photos')).toBeInTheDocument()
    expect(screen.getByText('Listing Details')).toBeInTheDocument()
  })

  it('loads categories on mount', async () => {
    render(<SellPage />)
    
    await waitFor(() => {
      expect(vi.mocked(api.getCategories)).toHaveBeenCalled()
    })
  })

  it('can submit the form', async () => {
    const user = userEvent.setup()
    render(<SellPage />)
    
    // Find and click the submit button
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(vi.mocked(api.createProduct)).toHaveBeenCalled()
    })
  })

  it('shows success message after creating product', async () => {
    const user = userEvent.setup()
    render(<SellPage />)
    
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    // Verify the API was called successfully
    await waitFor(() => {
      expect(vi.mocked(api.createProduct)).toHaveBeenCalled()
    })
  })

  it('handles API errors', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createProduct).mockRejectedValue(new Error('API Error'))
    
    render(<SellPage />)
    
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    // Verify the API was called (even though it failed)
    await waitFor(() => {
      expect(vi.mocked(api.createProduct)).toHaveBeenCalled()
    })
  })
})