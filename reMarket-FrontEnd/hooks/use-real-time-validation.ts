import { useState, useCallback, useRef } from 'react'
import { z } from 'zod'

interface ValidationState {
  isValid: boolean
  error: string | null
  isValidating: boolean
}

interface UseRealTimeValidationOptions {
  debounceMs?: number
  validateOnMount?: boolean
}

export function useRealTimeValidation<T>(
  schema: z.ZodSchema<T>,
  options: UseRealTimeValidationOptions = {}
) {
  const { debounceMs = 300, validateOnMount = false } = options
  
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: validateOnMount ? false : true, // Start as valid unless we want to validate on mount
    error: null,
    isValidating: false,
  })
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const validate = useCallback((value: unknown) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set validating state
    setValidationState(prev => ({ ...prev, isValidating: true }))
    
    // Debounce validation
    timeoutRef.current = setTimeout(() => {
      const result = schema.safeParse(value)
      
      setValidationState({
        isValid: result.success,
        error: result.success ? null : result.error.errors[0]?.message || 'Invalid value',
        isValidating: false,
      })
    }, debounceMs)
  }, [schema, debounceMs])
  
  const clearValidation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setValidationState({
      isValid: true,
      error: null,
      isValidating: false,
    })
  }, [])
  
  return {
    ...validationState,
    validate,
    clearValidation,
  }
}

// Hook for validating individual form fields with real-time feedback
export function useFieldValidation<T>(
  fieldSchema: z.ZodSchema<T>,
  options: UseRealTimeValidationOptions = {}
) {
  return useRealTimeValidation(fieldSchema, options)
}

// Hook for validating multiple fields
export function useMultiFieldValidation<T extends Record<string, any>>(
  fieldsSchema: { [K in keyof T]: z.ZodSchema<T[K]> },
  options: UseRealTimeValidationOptions = {}
) {
  const [validationStates, setValidationStates] = useState<
    Record<keyof T, ValidationState>
  >(() => {
    const initialState = {} as Record<keyof T, ValidationState>
    Object.keys(fieldsSchema).forEach(key => {
      initialState[key as keyof T] = {
        isValid: options.validateOnMount ? false : true,
        error: null,
        isValidating: false,
      }
    })
    return initialState
  })
  
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({})
  
  const validateField = useCallback((fieldName: keyof T, value: unknown) => {
    const schema = fieldsSchema[fieldName]
    if (!schema) return
    
    // Clear existing timeout for this field
    if (timeoutRefs.current[fieldName as string]) {
      clearTimeout(timeoutRefs.current[fieldName as string])
    }
    
    // Set validating state for this field
    setValidationStates(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], isValidating: true }
    }))
    
    // Debounce validation
    timeoutRefs.current[fieldName as string] = setTimeout(() => {
      const result = schema.safeParse(value)
      
      setValidationStates(prev => ({
        ...prev,
        [fieldName]: {
          isValid: result.success,
          error: result.success ? null : result.error.errors[0]?.message || 'Invalid value',
          isValidating: false,
        }
      }))
    }, options.debounceMs || 300)
  }, [fieldsSchema, options.debounceMs])
  
  const clearFieldValidation = useCallback((fieldName: keyof T) => {
    if (timeoutRefs.current[fieldName as string]) {
      clearTimeout(timeoutRefs.current[fieldName as string])
    }
    setValidationStates(prev => ({
      ...prev,
      [fieldName]: {
        isValid: true,
        error: null,
        isValidating: false,
      }
    }))
  }, [])
  
  const clearAllValidations = useCallback(() => {
    Object.values(timeoutRefs.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout)
    })
    timeoutRefs.current = {}
    
    setValidationStates(prev => {
      const clearedState = {} as Record<keyof T, ValidationState>
      Object.keys(prev).forEach(key => {
        clearedState[key as keyof T] = {
          isValid: true,
          error: null,
          isValidating: false,
        }
      })
      return clearedState
    })
  }, [])
  
  const isFormValid = Object.values(validationStates).every(state => state.isValid)
  const isAnyFieldValidating = Object.values(validationStates).some(state => state.isValidating)
  
  return {
    validationStates,
    validateField,
    clearFieldValidation,
    clearAllValidations,
    isFormValid,
    isAnyFieldValidating,
  }
}