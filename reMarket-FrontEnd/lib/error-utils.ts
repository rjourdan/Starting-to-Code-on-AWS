// Error handling utilities for consistent error management across the application

export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
}

export class AppError extends Error {
  public readonly status?: number
  public readonly code?: string
  public readonly details?: any

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// Enhanced error messages for different scenarios
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long to complete. Please try again.',
  
  // Authentication errors
  AUTH_REQUIRED: 'You need to be logged in to perform this action.',
  AUTH_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_INVALID: 'Invalid credentials. Please check your username and password.',
  
  // Authorization errors
  FORBIDDEN: 'You don\'t have permission to perform this action.',
  OWNERSHIP_REQUIRED: 'You can only modify your own listings.',
  
  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  REQUIRED_FIELDS: 'Please fill in all required fields.',
  INVALID_FORMAT: 'Please check the format of your input.',
  
  // File upload errors
  FILE_TOO_LARGE: 'File is too large. Please choose a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please choose a supported format.',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  TOO_MANY_FILES: 'Too many files selected. Please choose fewer files.',
  
  // Product/Listing errors
  PRODUCT_NOT_FOUND: 'Listing not found. It may have been deleted or moved.',
  PRODUCT_UNAVAILABLE: 'This listing is no longer available.',
  PRODUCT_SOLD: 'This item has already been sold.',
  
  // Generic errors
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const

// Map HTTP status codes to user-friendly messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
    
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT_ERROR
    }
    
    if (error.message.includes('Not authenticated')) {
      return ERROR_MESSAGES.AUTH_REQUIRED
    }
    
    if (error.message.includes('Forbidden') || error.message.includes('403')) {
      return ERROR_MESSAGES.FORBIDDEN
    }
    
    if (error.message.includes('Not found') || error.message.includes('404')) {
      return ERROR_MESSAGES.PRODUCT_NOT_FOUND
    }
    
    // Return the original message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message
    }
  }

  return ERROR_MESSAGES.GENERIC_ERROR
}

// Map HTTP status codes to specific error messages
export function getErrorMessageFromStatus(status: number, defaultMessage?: string): string {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.VALIDATION_ERROR
    case 401:
      return ERROR_MESSAGES.AUTH_EXPIRED
    case 403:
      return ERROR_MESSAGES.FORBIDDEN
    case 404:
      return ERROR_MESSAGES.PRODUCT_NOT_FOUND
    case 413:
      return ERROR_MESSAGES.FILE_TOO_LARGE
    case 422:
      return ERROR_MESSAGES.VALIDATION_ERROR
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVER_ERROR
    default:
      return defaultMessage || ERROR_MESSAGES.GENERIC_ERROR
  }
}

// Create standardized error objects
export function createApiError(
  message: string, 
  status?: number, 
  code?: string, 
  details?: any
): AppError {
  return new AppError(message, status, code, details)
}

// Handle API response errors consistently
export function handleApiError(error: any): AppError {
  if (error instanceof AppError) {
    return error
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR')
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || (error.message && error.message.includes('timeout'))) {
    return createApiError(ERROR_MESSAGES.TIMEOUT_ERROR, 0, 'TIMEOUT_ERROR')
  }

  // Handle structured API errors
  if (error.status && error.message) {
    const message = getErrorMessageFromStatus(error.status, error.message)
    return createApiError(message, error.status, error.code, error.details)
  }

  // Handle generic errors
  if (error instanceof Error) {
    const message = getErrorMessage(error)
    return createApiError(message, undefined, 'GENERIC_ERROR')
  }

  // Fallback for unknown error types
  return createApiError(ERROR_MESSAGES.UNKNOWN_ERROR, undefined, 'UNKNOWN_ERROR')
}

// Validation error helpers
export function getValidationErrorMessage(field: string, error: any): string {
  if (typeof error === 'string') {
    return error
  }

  if (error?.message) {
    return error.message
  }

  // Default validation messages for common fields
  const fieldMessages: Record<string, string> = {
    title: 'Please enter a valid title',
    description: 'Please enter a description',
    price: 'Please enter a valid price',
    category_id: 'Please select a category',
    condition: 'Please select a condition',
    location: 'Please enter your location',
    email: 'Please enter a valid email address',
    password: 'Please enter a valid password',
    username: 'Please enter a valid username',
  }

  return fieldMessages[field] || `Please enter a valid ${field}`
}

// File validation error helpers
export function getFileErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }

  if (error?.message) {
    if (error.message.includes('size')) {
      return ERROR_MESSAGES.FILE_TOO_LARGE
    }
    if (error.message.includes('type')) {
      return ERROR_MESSAGES.INVALID_FILE_TYPE
    }
    return error.message
  }

  return ERROR_MESSAGES.UPLOAD_FAILED
}

// Retry logic for failed operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        break
      }

      // Don't retry on certain error types
      if (error instanceof AppError) {
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          break
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw handleApiError(lastError!)
}

// Log errors for debugging (in development) or reporting (in production)
export function logError(error: Error, context?: string) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo)
  } else {
    // In production, you might want to send this to an error reporting service
    console.error('Error:', error.message)
  }
}