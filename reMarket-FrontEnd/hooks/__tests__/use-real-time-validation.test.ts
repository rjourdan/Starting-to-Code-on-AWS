import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { 
  useRealTimeValidation, 
  useFieldValidation, 
  useMultiFieldValidation 
} from '../use-real-time-validation'

// Mock timers
vi.useFakeTimers()

describe('useRealTimeValidation', () => {
  const testSchema = z.string().min(3, 'Must be at least 3 characters')

  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  it('should initialize with valid state by default', () => {
    const { result } = renderHook(() => useRealTimeValidation(testSchema))
    
    expect(result.current.isValid).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isValidating).toBe(false)
  })

  it('should initialize with invalid state when validateOnMount is true', () => {
    const { result } = renderHook(() => 
      useRealTimeValidation(testSchema, { validateOnMount: true })
    )
    
    expect(result.current.isValid).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isValidating).toBe(false)
  })

  it('should set validating state immediately when validate is called', () => {
    const { result } = renderHook(() => useRealTimeValidation(testSchema))
    
    act(() => {
      result.current.validate('test')
    })
    
    expect(result.current.isValidating).toBe(true)
  })

  it('should validate successfully after debounce delay', () => {
    const { result } = renderHook(() => 
      useRealTimeValidation(testSchema, { debounceMs: 300 })
    )
    
    act(() => {
      result.current.validate('valid input')
    })
    
    expect(result.current.isValidating).toBe(true)
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isValid).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isValidating).toBe(false)
  })

  it('should show validation error after debounce delay', () => {
    const { result } = renderHook(() => 
      useRealTimeValidation(testSchema, { debounceMs: 300 })
    )
    
    act(() => {
      result.current.validate('ab') // Too short
    })
    
    expect(result.current.isValidating).toBe(true)
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isValid).toBe(false)
    expect(result.current.error).toBe('Must be at least 3 characters')
    expect(result.current.isValidating).toBe(false)
  })

  it('should debounce multiple rapid validations', () => {
    const { result } = renderHook(() => 
      useRealTimeValidation(testSchema, { debounceMs: 300 })
    )
    
    // Rapid fire validations
    act(() => {
      result.current.validate('a')
    })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    act(() => {
      result.current.validate('ab')
    })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    act(() => {
      result.current.validate('abc') // Valid
    })
    
    // Should still be validating
    expect(result.current.isValidating).toBe(true)
    
    // Complete the debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    // Should validate the last input only
    expect(result.current.isValid).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isValidating).toBe(false)
  })

  it('should clear validation state', () => {
    const { result } = renderHook(() => useRealTimeValidation(testSchema))
    
    // Set an error state first
    act(() => {
      result.current.validate('ab')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isValid).toBe(false)
    expect(result.current.error).toBe('Must be at least 3 characters')
    
    // Clear validation
    act(() => {
      result.current.clearValidation()
    })
    
    expect(result.current.isValid).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isValidating).toBe(false)
  })

  it('should use custom debounce delay', () => {
    const { result } = renderHook(() => 
      useRealTimeValidation(testSchema, { debounceMs: 500 })
    )
    
    act(() => {
      result.current.validate('valid input')
    })
    
    // Should still be validating after 300ms
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.isValidating).toBe(true)
    
    // Should complete after 500ms total
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.isValidating).toBe(false)
    expect(result.current.isValid).toBe(true)
  })

  it('should handle schema with no specific error message', () => {
    const customSchema = z.string().refine(val => val.length > 3)
    const { result } = renderHook(() => useRealTimeValidation(customSchema))
    
    act(() => {
      result.current.validate('ab')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isValid).toBe(false)
    expect(result.current.error).toBe('Invalid input')
  })
})

describe('useFieldValidation', () => {
  const testSchema = z.string().min(3, 'Must be at least 3 characters')

  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  it('should be an alias for useRealTimeValidation', () => {
    const { result } = renderHook(() => useFieldValidation(testSchema))
    
    expect(result.current.isValid).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isValidating).toBe(false)
    expect(typeof result.current.validate).toBe('function')
    expect(typeof result.current.clearValidation).toBe('function')
  })
})

describe('useMultiFieldValidation', () => {
  const fieldsSchema = {
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18 years old'),
  }

  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  it('should initialize all fields as valid by default', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    expect(result.current.validationStates.name.isValid).toBe(true)
    expect(result.current.validationStates.email.isValid).toBe(true)
    expect(result.current.validationStates.age.isValid).toBe(true)
    expect(result.current.isFormValid).toBe(true)
    expect(result.current.isAnyFieldValidating).toBe(false)
  })

  it('should initialize all fields as invalid when validateOnMount is true', () => {
    const { result } = renderHook(() => 
      useMultiFieldValidation(fieldsSchema, { validateOnMount: true })
    )
    
    expect(result.current.validationStates.name.isValid).toBe(false)
    expect(result.current.validationStates.email.isValid).toBe(false)
    expect(result.current.validationStates.age.isValid).toBe(false)
    expect(result.current.isFormValid).toBe(false)
  })

  it('should validate individual fields', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    act(() => {
      result.current.validateField('name', 'John')
    })
    
    expect(result.current.validationStates.name.isValidating).toBe(true)
    expect(result.current.isAnyFieldValidating).toBe(true)
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.validationStates.name.isValid).toBe(true)
    expect(result.current.validationStates.name.error).toBeNull()
    expect(result.current.validationStates.name.isValidating).toBe(false)
    expect(result.current.isAnyFieldValidating).toBe(false)
  })

  it('should show field validation errors', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    act(() => {
      result.current.validateField('name', 'J') // Too short
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.validationStates.name.isValid).toBe(false)
    expect(result.current.validationStates.name.error).toBe('Name must be at least 2 characters')
    expect(result.current.isFormValid).toBe(false)
  })

  it('should validate multiple fields independently', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    act(() => {
      result.current.validateField('name', 'John')
      result.current.validateField('email', 'invalid-email')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.validationStates.name.isValid).toBe(true)
    expect(result.current.validationStates.email.isValid).toBe(false)
    expect(result.current.validationStates.email.error).toBe('Invalid email format')
    expect(result.current.isFormValid).toBe(false)
  })

  it('should clear individual field validation', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    // Set an error first
    act(() => {
      result.current.validateField('name', 'J')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.validationStates.name.isValid).toBe(false)
    
    // Clear the field
    act(() => {
      result.current.clearFieldValidation('name')
    })
    
    expect(result.current.validationStates.name.isValid).toBe(true)
    expect(result.current.validationStates.name.error).toBeNull()
    expect(result.current.validationStates.name.isValidating).toBe(false)
  })

  it('should clear all field validations', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    // Set errors on multiple fields
    act(() => {
      result.current.validateField('name', 'J')
      result.current.validateField('email', 'invalid')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.validationStates.name.isValid).toBe(false)
    expect(result.current.validationStates.email.isValid).toBe(false)
    expect(result.current.isFormValid).toBe(false)
    
    // Clear all
    act(() => {
      result.current.clearAllValidations()
    })
    
    expect(result.current.validationStates.name.isValid).toBe(true)
    expect(result.current.validationStates.email.isValid).toBe(true)
    expect(result.current.validationStates.age.isValid).toBe(true)
    expect(result.current.isFormValid).toBe(true)
    expect(result.current.isAnyFieldValidating).toBe(false)
  })

  it('should debounce field validations independently', () => {
    const { result } = renderHook(() => 
      useMultiFieldValidation(fieldsSchema, { debounceMs: 300 })
    )
    
    // Rapid validations on same field
    act(() => {
      result.current.validateField('name', 'J')
    })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    act(() => {
      result.current.validateField('name', 'Jo')
    })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    act(() => {
      result.current.validateField('name', 'John') // Valid
    })
    
    // Should still be validating
    expect(result.current.validationStates.name.isValidating).toBe(true)
    
    // Complete debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    // Should validate the last input
    expect(result.current.validationStates.name.isValid).toBe(true)
    expect(result.current.validationStates.name.error).toBeNull()
  })

  it('should handle non-existent field gracefully', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    // This should not throw an error
    act(() => {
      result.current.validateField('nonExistentField' as any, 'value')
    })
    
    // State should remain unchanged
    expect(result.current.isFormValid).toBe(true)
    expect(result.current.isAnyFieldValidating).toBe(false)
  })

  it('should calculate form validity correctly', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    // All fields valid initially
    expect(result.current.isFormValid).toBe(true)
    
    // Make one field invalid
    act(() => {
      result.current.validateField('name', 'J')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isFormValid).toBe(false)
    
    // Fix the field
    act(() => {
      result.current.validateField('name', 'John')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isFormValid).toBe(true)
  })

  it('should track if any field is validating', () => {
    const { result } = renderHook(() => useMultiFieldValidation(fieldsSchema))
    
    expect(result.current.isAnyFieldValidating).toBe(false)
    
    act(() => {
      result.current.validateField('name', 'John')
    })
    
    expect(result.current.isAnyFieldValidating).toBe(true)
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isAnyFieldValidating).toBe(false)
    
    // Multiple fields validating
    act(() => {
      result.current.validateField('name', 'Jane')
      result.current.validateField('email', 'jane@example.com')
    })
    
    expect(result.current.isAnyFieldValidating).toBe(true)
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isAnyFieldValidating).toBe(false)
  })

  it('should use custom debounce delay', () => {
    const { result } = renderHook(() => 
      useMultiFieldValidation(fieldsSchema, { debounceMs: 500 })
    )
    
    act(() => {
      result.current.validateField('name', 'John')
    })
    
    // Should still be validating after 300ms
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.validationStates.name.isValidating).toBe(true)
    
    // Should complete after 500ms total
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.validationStates.name.isValidating).toBe(false)
    expect(result.current.validationStates.name.isValid).toBe(true)
  })
})