import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AppError,
  getErrorMessage,
  getErrorMessageFromStatus,
  createApiError,
  handleApiError,
  getValidationErrorMessage,
  getFileErrorMessage,
  withRetry,
  logError,
  ERROR_MESSAGES
} from '../error-utils'

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => {
  mockConsoleError.mockClear()
})

describe('AppError', () => {
  it('should create an AppError with all properties', () => {
    const error = new AppError('Test message', 400, 'TEST_CODE', { extra: 'data' })
    
    expect(error.message).toBe('Test message')
    expect(error.status).toBe(400)
    expect(error.code).toBe('TEST_CODE')
    expect(error.details).toEqual({ extra: 'data' })
    expect(error.name).toBe('AppError')
  })

  it('should create an AppError with minimal properties', () => {
    const error = new AppError('Test message')
    
    expect(error.message).toBe('Test message')
    expect(error.status).toBeUndefined()
    expect(error.code).toBeUndefined()
    expect(error.details).toBeUndefined()
  })
})

describe('getErrorMessage', () => {
  it('should return AppError message', () => {
    const error = new AppError('Custom error message')
    expect(getErrorMessage(error)).toBe('Custom error message')
  })

  it('should return network error for fetch errors', () => {
    const error = new Error('fetch failed')
    expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.NETWORK_ERROR)
  })

  it('should return timeout error for timeout errors', () => {
    const error = new Error('timeout occurred')
    expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.TIMEOUT_ERROR)
  })

  it('should return auth required for authentication errors', () => {
    const error = new Error('Not authenticated')
    expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.AUTH_REQUIRED)
  })

  it('should return forbidden for 403 errors', () => {
    const error = new Error('Forbidden access')
    expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.FORBIDDEN)
  })

  it('should return product not found for 404 errors', () => {
    const error = new Error('Not found')
    expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.PRODUCT_NOT_FOUND)
  })

  it('should return original message for user-friendly errors', () => {
    const error = new Error('User-friendly message')
    expect(getErrorMessage(error)).toBe('User-friendly message')
  })

  it('should return generic error for long technical messages', () => {
    const error = new Error('Error: Very long technical error message that contains implementation details and stack traces')
    expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.GENERIC_ERROR)
  })

  it('should return generic error for unknown error types', () => {
    expect(getErrorMessage('string error')).toBe(ERROR_MESSAGES.GENERIC_ERROR)
    expect(getErrorMessage(null)).toBe(ERROR_MESSAGES.GENERIC_ERROR)
    expect(getErrorMessage(undefined)).toBe(ERROR_MESSAGES.GENERIC_ERROR)
  })
})

describe('getErrorMessageFromStatus', () => {
  it('should return correct messages for HTTP status codes', () => {
    expect(getErrorMessageFromStatus(400)).toBe(ERROR_MESSAGES.VALIDATION_ERROR)
    expect(getErrorMessageFromStatus(401)).toBe(ERROR_MESSAGES.AUTH_EXPIRED)
    expect(getErrorMessageFromStatus(403)).toBe(ERROR_MESSAGES.FORBIDDEN)
    expect(getErrorMessageFromStatus(404)).toBe(ERROR_MESSAGES.PRODUCT_NOT_FOUND)
    expect(getErrorMessageFromStatus(413)).toBe(ERROR_MESSAGES.FILE_TOO_LARGE)
    expect(getErrorMessageFromStatus(422)).toBe(ERROR_MESSAGES.VALIDATION_ERROR)
    expect(getErrorMessageFromStatus(429)).toBe('Too many requests. Please wait a moment and try again.')
    expect(getErrorMessageFromStatus(500)).toBe(ERROR_MESSAGES.SERVER_ERROR)
    expect(getErrorMessageFromStatus(502)).toBe(ERROR_MESSAGES.SERVER_ERROR)
    expect(getErrorMessageFromStatus(503)).toBe(ERROR_MESSAGES.SERVER_ERROR)
    expect(getErrorMessageFromStatus(504)).toBe(ERROR_MESSAGES.SERVER_ERROR)
  })

  it('should return default message for unknown status codes', () => {
    expect(getErrorMessageFromStatus(999)).toBe(ERROR_MESSAGES.GENERIC_ERROR)
  })

  it('should return custom default message when provided', () => {
    expect(getErrorMessageFromStatus(999, 'Custom default')).toBe('Custom default')
  })
})

describe('createApiError', () => {
  it('should create an AppError with all parameters', () => {
    const error = createApiError('Test message', 400, 'TEST_CODE', { extra: 'data' })
    
    expect(error).toBeInstanceOf(AppError)
    expect(error.message).toBe('Test message')
    expect(error.status).toBe(400)
    expect(error.code).toBe('TEST_CODE')
    expect(error.details).toEqual({ extra: 'data' })
  })
})

describe('handleApiError', () => {
  it('should return AppError as-is', () => {
    const originalError = new AppError('Original message', 400)
    const result = handleApiError(originalError)
    
    expect(result).toBe(originalError)
  })

  it('should handle fetch errors', () => {
    const fetchError = new TypeError('fetch failed')
    const result = handleApiError(fetchError)
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe(ERROR_MESSAGES.NETWORK_ERROR)
    expect(result.code).toBe('NETWORK_ERROR')
  })

  it('should handle timeout errors', () => {
    const timeoutError = new Error('timeout')
    timeoutError.name = 'AbortError'
    const result = handleApiError(timeoutError)
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe(ERROR_MESSAGES.TIMEOUT_ERROR)
    expect(result.code).toBe('TIMEOUT_ERROR')
  })

  it('should handle structured API errors', () => {
    const apiError = {
      status: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR'
    }
    const result = handleApiError(apiError)
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.status).toBe(400)
    expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('should handle generic Error objects', () => {
    const genericError = new Error('Generic error message')
    const result = handleApiError(genericError)
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Generic error message')
    expect(result.code).toBe('GENERIC_ERROR')
  })

  it('should handle unknown error types', () => {
    const result = handleApiError('string error')
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR)
    expect(result.code).toBe('UNKNOWN_ERROR')
  })
})

describe('getValidationErrorMessage', () => {
  it('should return string error as-is', () => {
    expect(getValidationErrorMessage('title', 'Title is required')).toBe('Title is required')
  })

  it('should return error.message if available', () => {
    const error = { message: 'Custom validation message' }
    expect(getValidationErrorMessage('title', error)).toBe('Custom validation message')
  })

  it('should return default message for known fields', () => {
    expect(getValidationErrorMessage('title', {})).toBe('Please enter a valid title')
    expect(getValidationErrorMessage('email', {})).toBe('Please enter a valid email address')
    expect(getValidationErrorMessage('password', {})).toBe('Please enter a valid password')
  })

  it('should return generic message for unknown fields', () => {
    expect(getValidationErrorMessage('unknownField', {})).toBe('Please enter a valid unknownField')
  })
})

describe('getFileErrorMessage', () => {
  it('should return string error as-is', () => {
    expect(getFileErrorMessage('File upload failed')).toBe('File upload failed')
  })

  it('should return size error message', () => {
    const error = { message: 'File size too large' }
    expect(getFileErrorMessage(error)).toBe(ERROR_MESSAGES.FILE_TOO_LARGE)
  })

  it('should return type error message', () => {
    const error = { message: 'Invalid file type' }
    expect(getFileErrorMessage(error)).toBe(ERROR_MESSAGES.INVALID_FILE_TYPE)
  })

  it('should return error.message if available', () => {
    const error = { message: 'Custom file error' }
    expect(getFileErrorMessage(error)).toBe('Custom file error')
  })

  it('should return default upload failed message', () => {
    expect(getFileErrorMessage({})).toBe(ERROR_MESSAGES.UPLOAD_FAILED)
  })
})

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const operation = vi.fn().mockResolvedValue('success')
    
    const result = await withRetry(operation, 3, 100)
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success')
    
    const result = await withRetry(operation, 3, 10)
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('should throw after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fails'))
    
    await expect(withRetry(operation, 2, 10)).rejects.toThrow()
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should not retry on 401 errors', async () => {
    const operation = vi.fn().mockRejectedValue(new AppError('Unauthorized', 401))
    
    await expect(withRetry(operation, 3, 10)).rejects.toThrow('Unauthorized')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should not retry on 403 errors', async () => {
    const operation = vi.fn().mockRejectedValue(new AppError('Forbidden', 403))
    
    await expect(withRetry(operation, 3, 10)).rejects.toThrow('Forbidden')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should not retry on 404 errors', async () => {
    const operation = vi.fn().mockRejectedValue(new AppError('Not found', 404))
    
    await expect(withRetry(operation, 3, 10)).rejects.toThrow('Not found')
    expect(operation).toHaveBeenCalledTimes(1)
  })
})

describe('logError', () => {
  it('should log error in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const error = new Error('Test error')
    logError(error, 'test context')
    
    expect(mockConsoleError).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
      message: 'Test error',
      context: 'test context',
      timestamp: expect.any(String)
    }))
    
    process.env.NODE_ENV = originalEnv
  })

  it('should log minimal error in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const error = new Error('Test error')
    logError(error)
    
    expect(mockConsoleError).toHaveBeenCalledWith('Error:', 'Test error')
    
    process.env.NODE_ENV = originalEnv
  })
})