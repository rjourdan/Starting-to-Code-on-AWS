import * as z from "zod"

// Common validation rules
const TITLE_MIN_LENGTH = 1
const TITLE_MAX_LENGTH = 100
const DESCRIPTION_MIN_LENGTH = 10
const DESCRIPTION_MAX_LENGTH = 1000
const LOCATION_MIN_LENGTH = 1
const LOCATION_MAX_LENGTH = 100
const PREFERRED_MEETUP_MAX_LENGTH = 200
const PRICE_MIN = 0.01
const PRICE_MAX = 999999

// Condition enum values
export const CONDITION_VALUES = ["new", "like-new", "good", "fair", "poor"] as const
export type ConditionType = typeof CONDITION_VALUES[number]

// Base product validation schema with all common fields
const baseProductSchema = {
  title: z
    .string()
    .min(TITLE_MIN_LENGTH, "Title is required")
    .max(TITLE_MAX_LENGTH, "Title must be less than 100 characters")
    .trim(),
  
  description: z
    .string()
    .min(DESCRIPTION_MIN_LENGTH, "Description must be at least 10 characters")
    .max(DESCRIPTION_MAX_LENGTH, "Description must be less than 1000 characters")
    .trim(),
  
  price: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a valid number",
    })
    .min(PRICE_MIN, "Price must be greater than 0")
    .max(PRICE_MAX, "Price must be less than $999,999")
    .multipleOf(0.01, "Price must be in cents (e.g., 10.99)"),
  
  condition: z.enum(CONDITION_VALUES, {
    required_error: "Please select a condition",
    invalid_type_error: "Please select a valid condition",
  }),
  
  location: z
    .string()
    .min(LOCATION_MIN_LENGTH, "Location is required")
    .max(LOCATION_MAX_LENGTH, "Location must be less than 100 characters")
    .trim(),
  
  preferred_meetup: z
    .string()
    .max(PREFERRED_MEETUP_MAX_LENGTH, "Preferred meetup location must be less than 200 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  category_id: z
    .number({
      required_error: "Please select a category",
      invalid_type_error: "Please select a valid category",
    })
    .min(1, "Please select a category"),
}

// Product creation schema (for sell page)
export const productCreationSchema = z.object({
  ...baseProductSchema,
})

// Product update schema (for edit page) - all fields optional except those that should remain required
export const productUpdateSchema = z.object({
  title: baseProductSchema.title.optional(),
  description: baseProductSchema.description.optional(),
  price: baseProductSchema.price.optional(),
  condition: baseProductSchema.condition.optional(),
  location: baseProductSchema.location.optional(),
  preferred_meetup: baseProductSchema.preferred_meetup,
  category_id: baseProductSchema.category_id.optional(),
})

// Full product update schema (for when all fields are required in edit form)
export const productEditSchema = z.object({
  ...baseProductSchema,
})

// Image upload validation
export const imageUploadSchema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, "At least one image is required")
    .max(6, "Maximum 6 images allowed")
    .refine(
      (files) => files.every(file => file.size <= 5 * 1024 * 1024),
      "Each image must be smaller than 5MB"
    )
    .refine(
      (files) => files.every(file => 
        ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
      ),
      "Only image files (JPEG, PNG, GIF, WebP) are allowed"
    ),
})

// Single image validation for individual uploads
export const singleImageSchema = z
  .instanceof(File)
  .refine(file => file.size <= 5 * 1024 * 1024, "Image must be smaller than 5MB")
  .refine(
    file => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
    "Only image files (JPEG, PNG, GIF, WebP) are allowed"
  )

// Sold status update schema
export const soldStatusUpdateSchema = z.object({
  is_sold: z.boolean({
    required_error: "Sold status is required",
    invalid_type_error: "Sold status must be true or false",
  }),
})

// Search and filter schemas
export const productSearchSchema = z.object({
  query: z.string().max(100, "Search query must be less than 100 characters").optional(),
  category_id: z.number().min(1).optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  condition: z.enum(CONDITION_VALUES).optional(),
  location: z.string().max(100).optional(),
  sort_by: z.enum(["price_asc", "price_desc", "date_asc", "date_desc"]).optional(),
})

// Type exports for TypeScript
export type ProductCreationData = z.infer<typeof productCreationSchema>
export type ProductUpdateData = z.infer<typeof productUpdateSchema>
export type ProductEditData = z.infer<typeof productEditSchema>
export type ImageUploadData = z.infer<typeof imageUploadSchema>
export type SoldStatusUpdateData = z.infer<typeof soldStatusUpdateSchema>
export type ProductSearchData = z.infer<typeof productSearchSchema>

// Validation helper functions
export const validateProductCreation = (data: unknown) => {
  return productCreationSchema.safeParse(data)
}

export const validateProductUpdate = (data: unknown) => {
  return productUpdateSchema.safeParse(data)
}

export const validateProductEdit = (data: unknown) => {
  return productEditSchema.safeParse(data)
}

export const validateImageUpload = (files: unknown) => {
  return imageUploadSchema.safeParse({ files })
}

export const validateSingleImage = (file: unknown) => {
  return singleImageSchema.safeParse(file)
}

export const validateSoldStatusUpdate = (data: unknown) => {
  return soldStatusUpdateSchema.safeParse(data)
}

export const validateProductSearch = (data: unknown) => {
  return productSearchSchema.safeParse(data)
}

// Custom validation error formatter
export const formatValidationErrors = (errors: z.ZodError) => {
  return errors.errors.reduce((acc, error) => {
    const path = error.path.join('.')
    acc[path] = error.message
    return acc
  }, {} as Record<string, string>)
}

// Real-time validation helpers for form fields
export const validateField = <T>(schema: z.ZodSchema<T>, value: unknown) => {
  const result = schema.safeParse(value)
  return {
    isValid: result.success,
    error: result.success ? null : (result.error.errors[0]?.message || "Invalid value")
  }
}

// Debounced validation for real-time feedback
export const createDebouncedValidator = <T>(
  schema: z.ZodSchema<T>, 
  callback: (isValid: boolean, error?: string | null) => void,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout

  return (value: unknown) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      const result = validateField(schema, value)
      callback(result.isValid, result.error)
    }, delay)
  }
}