// Toast notification utilities for consistent user feedback

import { toast } from "@/hooks/use-toast"
import { getErrorMessage } from "./error-utils"

// Success toast notifications
export const showSuccessToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: "default",
  })
}

// Error toast notifications
export const showErrorToast = (error: unknown, title?: string) => {
  const message = getErrorMessage(error)
  toast({
    title: title || "Error",
    description: message,
    variant: "destructive",
  })
}

// Warning toast notifications
export const showWarningToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: "default", // Using default since there's no warning variant
  })
}

// Loading toast notifications (for long operations)
export const showLoadingToast = (title: string, description?: string) => {
  return toast({
    title,
    description,
    variant: "default",
  })
}

// Predefined success messages for common operations
export const SUCCESS_MESSAGES = {
  // Listing operations
  LISTING_CREATED: {
    title: "Success!",
    description: "Your listing has been created successfully.",
  },
  LISTING_UPDATED: {
    title: "Success!",
    description: "Your listing has been updated successfully.",
  },
  LISTING_DELETED: {
    title: "Success!",
    description: "Listing deleted successfully.",
  },
  LISTING_SOLD: {
    title: "Success!",
    description: "Listing marked as sold.",
  },
  LISTING_AVAILABLE: {
    title: "Success!",
    description: "Listing marked as available.",
  },
  
  // Image operations
  IMAGES_UPLOADED: (count: number) => ({
    title: "Images uploaded",
    description: `${count} image(s) uploaded successfully.`,
  }),
  IMAGE_DELETED: {
    title: "Image removed",
    description: "Image has been removed from your listing.",
  },
  PRIMARY_IMAGE_SET: {
    title: "Primary image updated",
    description: "This image will be shown as the main photo for your listing.",
  },
  
  // User operations
  PROFILE_UPDATED: {
    title: "Profile updated",
    description: "Your profile has been updated successfully.",
  },
  PROFILE_IMAGE_UPLOADED: {
    title: "Profile image updated",
    description: "Your profile image has been updated successfully.",
  },
  
  // Authentication
  LOGIN_SUCCESS: {
    title: "Welcome back!",
    description: "You have been logged in successfully.",
  },
  LOGOUT_SUCCESS: {
    title: "Logged out",
    description: "You have been logged out successfully.",
  },
  REGISTRATION_SUCCESS: {
    title: "Account created!",
    description: "Your account has been created successfully. You can now log in.",
  },
} as const

// Predefined warning messages
export const WARNING_MESSAGES = {
  // Image operations
  TOO_MANY_IMAGES: {
    title: "Too many images",
    description: "You can upload a maximum of 6 images per listing.",
  },
  IMAGES_UPLOAD_PARTIAL: {
    title: "Warning",
    description: "Product created but some images failed to upload. You can add images later by editing the listing.",
  },
  
  // File operations
  INVALID_FILE_TYPE: {
    title: "Invalid file type",
    description: "Please select a supported image format (JPG, PNG, GIF, WebP).",
  },
  FILE_TOO_LARGE: {
    title: "File too large",
    description: "Please select a smaller file (max 10MB).",
  },
  
  // Network
  NETWORK_ISSUES: {
    title: "Connection issues",
    description: "Some features may not work properly due to network issues.",
  },
} as const

// Helper functions for common toast patterns
export const showListingSuccess = (action: keyof typeof SUCCESS_MESSAGES) => {
  const message = SUCCESS_MESSAGES[action]
  if (typeof message === 'function') {
    throw new Error('This success message requires parameters')
  }
  showSuccessToast(message.title, message.description)
}

export const showImageSuccess = (action: 'IMAGE_DELETED' | 'PRIMARY_IMAGE_SET') => {
  const message = SUCCESS_MESSAGES[action]
  showSuccessToast(message.title, message.description)
}

export const showImagesUploadedSuccess = (count: number) => {
  const message = SUCCESS_MESSAGES.IMAGES_UPLOADED(count)
  showSuccessToast(message.title, message.description)
}

export const showListingWarning = (action: keyof typeof WARNING_MESSAGES) => {
  const message = WARNING_MESSAGES[action]
  showWarningToast(message.title, message.description)
}

// Async operation toast helpers
export const withToastFeedback = async <T>(
  operation: () => Promise<T>,
  options: {
    loadingTitle?: string
    loadingDescription?: string
    successTitle?: string
    successDescription?: string
    errorTitle?: string
    onSuccess?: (result: T) => void
    onError?: (error: unknown) => void
  }
): Promise<T | null> => {
  let loadingToast: ReturnType<typeof toast> | null = null

  try {
    // Show loading toast if specified
    if (options.loadingTitle) {
      loadingToast = showLoadingToast(options.loadingTitle, options.loadingDescription)
    }

    // Execute the operation
    const result = await operation()

    // Dismiss loading toast
    if (loadingToast) {
      loadingToast.dismiss()
    }

    // Show success toast
    if (options.successTitle) {
      showSuccessToast(options.successTitle, options.successDescription)
    }

    // Call success callback
    if (options.onSuccess) {
      options.onSuccess(result)
    }

    return result
  } catch (error) {
    // Dismiss loading toast
    if (loadingToast) {
      loadingToast.dismiss()
    }

    // Show error toast
    showErrorToast(error, options.errorTitle)

    // Call error callback
    if (options.onError) {
      options.onError(error)
    }

    return null
  }
}

// Form validation toast helpers
export const showValidationError = (fieldName: string, message: string) => {
  showErrorToast(message, `Invalid ${fieldName}`)
}

export const showFormError = (message: string) => {
  showErrorToast(message, "Form Error")
}

// Network operation helpers
export const showNetworkError = (operation: string) => {
  showErrorToast(
    `Failed to ${operation}. Please check your connection and try again.`,
    "Network Error"
  )
}

export const showAuthError = (message?: string) => {
  showErrorToast(
    message || "You need to be logged in to perform this action.",
    "Authentication Required"
  )
}

// Confirmation toast for destructive actions
export const showDestructiveActionWarning = (action: string) => {
  showWarningToast(
    "Are you sure?",
    `This will permanently ${action}. This action cannot be undone.`
  )
}