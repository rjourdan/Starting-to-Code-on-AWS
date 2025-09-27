import { describe, it, expect } from 'vitest'
import {
  productCreationSchema,
  productUpdateSchema,
  productEditSchema,
  imageUploadSchema,
  singleImageSchema,
  soldStatusUpdateSchema,
  productSearchSchema,
  validateProductCreation,
  validateProductUpdate,
  validateProductEdit,
  validateImageUpload,
  validateSingleImage,
  validateSoldStatusUpdate,
  validateProductSearch,
  formatValidationErrors,
  validateField,
  CONDITION_VALUES,
  type ProductCreationData,
  type ProductUpdateData,
  type ProductEditData,
} from '../validation-schemas'

describe('Validation Schemas', () => {
  describe('productCreationSchema', () => {
    const validProductData: ProductCreationData = {
      title: 'Test Product',
      description: 'This is a test product description that is long enough',
      price: 99.99,
      condition: 'good',
      location: 'Test City, State',
      preferred_meetup: 'Coffee shop',
      category_id: 1,
    }

    it('should validate valid product creation data', () => {
      const result = productCreationSchema.safeParse(validProductData)
      expect(result.success).toBe(true)
    })

    it('should require title', () => {
      const data = { ...validProductData, title: '' }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title is required')
      }
    })

    it('should limit title length', () => {
      const data = { ...validProductData, title: 'a'.repeat(101) }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title must be less than 100 characters')
      }
    })

    it('should require description with minimum length', () => {
      const data = { ...validProductData, description: 'short' }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Description must be at least 10 characters')
      }
    })

    it('should limit description length', () => {
      const data = { ...validProductData, description: 'a'.repeat(1001) }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Description must be less than 1000 characters')
      }
    })

    it('should require positive price', () => {
      const data = { ...validProductData, price: 0 }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Price must be greater than 0')
      }
    })

    it('should limit maximum price', () => {
      const data = { ...validProductData, price: 1000000 }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Price must be less than $999,999')
      }
    })

    it('should validate price precision', () => {
      const data = { ...validProductData, price: 99.999 }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Price must be in cents (e.g., 10.99)')
      }
    })

    it('should require valid condition', () => {
      const data = { ...validProductData, condition: 'invalid' as any }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept all valid conditions', () => {
      CONDITION_VALUES.forEach(condition => {
        const data = { ...validProductData, condition }
        const result = productCreationSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should require location', () => {
      const data = { ...validProductData, location: '' }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Location is required')
      }
    })

    it('should limit location length', () => {
      const data = { ...validProductData, location: 'a'.repeat(101) }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Location must be less than 100 characters')
      }
    })

    it('should allow optional preferred_meetup', () => {
      const data = { ...validProductData, preferred_meetup: undefined }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty preferred_meetup', () => {
      const data = { ...validProductData, preferred_meetup: '' }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should limit preferred_meetup length', () => {
      const data = { ...validProductData, preferred_meetup: 'a'.repeat(201) }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Preferred meetup location must be less than 200 characters')
      }
    })

    it('should require valid category_id', () => {
      const data = { ...validProductData, category_id: 0 }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please select a category')
      }
    })

    it('should trim whitespace from string fields', () => {
      const data = {
        ...validProductData,
        title: '  Test Product  ',
        description: '  This is a test product description that is long enough  ',
        location: '  Test City, State  ',
        preferred_meetup: '  Coffee shop  ',
      }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Test Product')
        expect(result.data.description).toBe('This is a test product description that is long enough')
        expect(result.data.location).toBe('Test City, State')
        expect(result.data.preferred_meetup).toBe('Coffee shop')
      }
    })
  })

  describe('productUpdateSchema', () => {
    it('should allow partial updates', () => {
      const data: Partial<ProductUpdateData> = {
        title: 'Updated Title',
        price: 149.99,
      }
      const result = productUpdateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty object', () => {
      const result = productUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should validate provided fields', () => {
      const data = { title: '' }
      const result = productUpdateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('productEditSchema', () => {
    const validEditData: ProductEditData = {
      title: 'Test Product',
      description: 'This is a test product description that is long enough',
      price: 99.99,
      condition: 'good',
      location: 'Test City, State',
      preferred_meetup: 'Coffee shop',
      category_id: 1,
    }

    it('should validate complete edit data', () => {
      const result = productEditSchema.safeParse(validEditData)
      expect(result.success).toBe(true)
    })

    it('should require all fields like creation schema', () => {
      const data = { ...validEditData, title: '' }
      const result = productEditSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('imageUploadSchema', () => {
    // Mock File objects for testing
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File([''], name, { type })
      Object.defineProperty(file, 'size', { value: size })
      return file
    }

    it('should validate valid image files', () => {
      const files = [
        createMockFile('test1.jpg', 1024 * 1024, 'image/jpeg'),
        createMockFile('test2.png', 2 * 1024 * 1024, 'image/png'),
      ]
      const result = imageUploadSchema.safeParse({ files })
      expect(result.success).toBe(true)
    })

    it('should require at least one file', () => {
      const result = imageUploadSchema.safeParse({ files: [] })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one image is required')
      }
    })

    it('should limit maximum files', () => {
      const files = Array(7).fill(null).map((_, i) => 
        createMockFile(`test${i}.jpg`, 1024 * 1024, 'image/jpeg')
      )
      const result = imageUploadSchema.safeParse({ files })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 6 images allowed')
      }
    })

    it('should reject oversized files', () => {
      const files = [createMockFile('large.jpg', 6 * 1024 * 1024, 'image/jpeg')]
      const result = imageUploadSchema.safeParse({ files })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Each image must be smaller than 5MB')
      }
    })

    it('should reject invalid file types', () => {
      const files = [createMockFile('document.pdf', 1024 * 1024, 'application/pdf')]
      const result = imageUploadSchema.safeParse({ files })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Only image files (JPEG, PNG, GIF, WebP) are allowed')
      }
    })

    it('should accept all valid image types', () => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      validTypes.forEach(type => {
        const files = [createMockFile('test.img', 1024 * 1024, type)]
        const result = imageUploadSchema.safeParse({ files })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('singleImageSchema', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File([''], name, { type })
      Object.defineProperty(file, 'size', { value: size })
      return file
    }

    it('should validate valid single image', () => {
      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg')
      const result = singleImageSchema.safeParse(file)
      expect(result.success).toBe(true)
    })

    it('should reject oversized file', () => {
      const file = createMockFile('large.jpg', 6 * 1024 * 1024, 'image/jpeg')
      const result = singleImageSchema.safeParse(file)
      expect(result.success).toBe(false)
    })

    it('should reject invalid file type', () => {
      const file = createMockFile('document.pdf', 1024 * 1024, 'application/pdf')
      const result = singleImageSchema.safeParse(file)
      expect(result.success).toBe(false)
    })
  })

  describe('soldStatusUpdateSchema', () => {
    it('should validate boolean true', () => {
      const result = soldStatusUpdateSchema.safeParse({ is_sold: true })
      expect(result.success).toBe(true)
    })

    it('should validate boolean false', () => {
      const result = soldStatusUpdateSchema.safeParse({ is_sold: false })
      expect(result.success).toBe(true)
    })

    it('should reject non-boolean values', () => {
      const result = soldStatusUpdateSchema.safeParse({ is_sold: 'true' })
      expect(result.success).toBe(false)
    })

    it('should require is_sold field', () => {
      const result = soldStatusUpdateSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('productSearchSchema', () => {
    it('should validate empty search', () => {
      const result = productSearchSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should validate complete search', () => {
      const data = {
        query: 'test',
        category_id: 1,
        min_price: 10,
        max_price: 100,
        condition: 'good' as const,
        location: 'Test City',
        sort_by: 'price_asc' as const,
      }
      const result = productSearchSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should limit query length', () => {
      const data = { query: 'a'.repeat(101) }
      const result = productSearchSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate sort options', () => {
      const validSorts = ['price_asc', 'price_desc', 'date_asc', 'date_desc']
      validSorts.forEach(sort => {
        const result = productSearchSchema.safeParse({ sort_by: sort })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid sort option', () => {
      const result = productSearchSchema.safeParse({ sort_by: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('Validation Helper Functions', () => {
    describe('validateProductCreation', () => {
      it('should return success for valid data', () => {
        const data = {
          title: 'Test Product',
          description: 'This is a test product description that is long enough',
          price: 99.99,
          condition: 'good',
          location: 'Test City, State',
          category_id: 1,
        }
        const result = validateProductCreation(data)
        expect(result.success).toBe(true)
      })

      it('should return error for invalid data', () => {
        const data = { title: '' }
        const result = validateProductCreation(data)
        expect(result.success).toBe(false)
      })
    })

    describe('validateProductUpdate', () => {
      it('should return success for partial data', () => {
        const data = { title: 'Updated Title' }
        const result = validateProductUpdate(data)
        expect(result.success).toBe(true)
      })
    })

    describe('validateProductEdit', () => {
      it('should return success for complete data', () => {
        const data = {
          title: 'Test Product',
          description: 'This is a test product description that is long enough',
          price: 99.99,
          condition: 'good',
          location: 'Test City, State',
          category_id: 1,
        }
        const result = validateProductEdit(data)
        expect(result.success).toBe(true)
      })
    })

    describe('validateImageUpload', () => {
      it('should validate file array', () => {
        const createMockFile = (name: string, size: number, type: string): File => {
          const file = new File([''], name, { type })
          Object.defineProperty(file, 'size', { value: size })
          return file
        }

        const files = [createMockFile('test.jpg', 1024 * 1024, 'image/jpeg')]
        const result = validateImageUpload(files)
        expect(result.success).toBe(true)
      })
    })

    describe('validateSingleImage', () => {
      it('should validate single file', () => {
        const createMockFile = (name: string, size: number, type: string): File => {
          const file = new File([''], name, { type })
          Object.defineProperty(file, 'size', { value: size })
          return file
        }

        const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg')
        const result = validateSingleImage(file)
        expect(result.success).toBe(true)
      })
    })

    describe('validateSoldStatusUpdate', () => {
      it('should validate sold status', () => {
        const result = validateSoldStatusUpdate({ is_sold: true })
        expect(result.success).toBe(true)
      })
    })

    describe('validateProductSearch', () => {
      it('should validate search data', () => {
        const result = validateProductSearch({ query: 'test' })
        expect(result.success).toBe(true)
      })
    })

    describe('formatValidationErrors', () => {
      it('should format zod errors', () => {
        const result = productCreationSchema.safeParse({ title: '' })
        expect(result.success).toBe(false)
        if (!result.success) {
          const formatted = formatValidationErrors(result.error)
          expect(formatted).toHaveProperty('title')
          expect(formatted.title).toBe('Title is required')
        }
      })

      it('should handle nested field errors', () => {
        const result = productCreationSchema.safeParse({
          title: '',
          price: 0,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          const formatted = formatValidationErrors(result.error)
          expect(Object.keys(formatted).length).toBeGreaterThan(1)
        }
      })
    })

    describe('validateField', () => {
      it('should validate single field successfully', () => {
        const result = validateField(productCreationSchema.shape.title, 'Valid Title')
        expect(result.isValid).toBe(true)
        expect(result.error).toBeNull()
      })

      it('should return error for invalid field', () => {
        const result = validateField(productCreationSchema.shape.title, '')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Title is required')
      })

      it('should handle schema without specific error message', () => {
        const result = validateField(productCreationSchema.shape.price, 'invalid')
        expect(result.isValid).toBe(false)
        expect(result.error).toBeTruthy()
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null values', () => {
      const result = productCreationSchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it('should handle undefined values', () => {
      const result = productCreationSchema.safeParse(undefined)
      expect(result.success).toBe(false)
    })

    it('should handle empty object', () => {
      const result = productCreationSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should handle extra fields gracefully', () => {
      const data = {
        title: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 99.99,
        condition: 'good',
        location: 'Test City, State',
        category_id: 1,
        extraField: 'should be ignored',
      }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle numeric strings for price', () => {
      const data = {
        title: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: '99.99' as any, // This should fail as we expect number
        condition: 'good',
        location: 'Test City, State',
        category_id: 1,
      }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should handle numeric strings for category_id', () => {
      const data = {
        title: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 99.99,
        condition: 'good',
        location: 'Test City, State',
        category_id: '1' as any, // This should fail as we expect number
      }
      const result = productCreationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Type Safety', () => {
    it('should infer correct types', () => {
      const validData: ProductCreationData = {
        title: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 99.99,
        condition: 'good',
        location: 'Test City, State',
        preferred_meetup: 'Coffee shop',
        category_id: 1,
      }

      // These should compile without TypeScript errors
      expect(validData.title).toBe('Test Product')
      expect(validData.condition).toBe('good')
      expect(validData.price).toBe(99.99)
      expect(validData.category_id).toBe(1)
    })

    it('should enforce condition enum', () => {
      // This test ensures TypeScript compilation catches invalid conditions
      const validConditions: Array<ProductCreationData['condition']> = [
        'new', 'like-new', 'good', 'fair', 'poor'
      ]
      expect(validConditions).toHaveLength(5)
    })
  })
})