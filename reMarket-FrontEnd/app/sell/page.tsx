"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload, Loader2, Home } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ImageManager, type ProductImage } from "@/components/ui/image-manager"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { 
  showErrorToast, 
  showSuccessToast, 
  showListingWarning,
  showImagesUploadedSuccess,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES 
} from "@/lib/toast-utils"

import { 
  createProduct, 
  getCategories,
  uploadProductImages,
  type Category,
  type ProductFormData 
} from "@/lib/api"
import { 
  productCreationSchema, 
  validateSingleImage,
  type ProductCreationData 
} from "@/lib/validation-schemas"

type SellListingFormData = ProductCreationData

export default function SellPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [images, setImages] = useState<ProductImage[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([]) // Store original files for upload

  const form = useForm<SellListingFormData>({
    resolver: zodResolver(productCreationSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      condition: undefined,
      location: "",
      preferred_meetup: "",
      category_id: 0,
    },
  })

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error loading categories:', error)
        showErrorToast(error, "Failed to load categories")
      }
    }

    loadCategories()
  }, [])

  // Image upload handlers
  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return

    // Check if adding these files would exceed the limit
    if (images.length + files.length > 6) {
      showListingWarning('TOO_MANY_IMAGES')
      return
    }

    // Validate each file using centralized validation
    for (const file of files) {
      const validation = validateSingleImage(file)
      if (!validation.success) {
        showErrorToast(validation.error.errors[0]?.message || "Invalid file uploaded.", "Invalid file")
        return
      }
    }

    setIsUploadingImages(true)
    try {
      // Store original files for later upload
      setImageFiles(prev => [...prev, ...files])

      // Create temporary image objects with preview URLs
      const newImages: ProductImage[] = files.map((file, index) => ({
        id: Date.now() + index, // Temporary ID
        url: URL.createObjectURL(file),
        is_primary: images.length === 0 && index === 0, // First image is primary if no images exist
      }))

      setImages(prev => [...prev, ...newImages])
      
      showSuccessToast(
        "Images ready",
        `${files.length} image(s) added successfully. They will be uploaded when you create the listing.`
      )
    } catch (error) {
      console.error('Error processing images:', error)
      showErrorToast(error, "Upload failed")
    } finally {
      setIsUploadingImages(false)
    }
  }

  const handleImageDelete = (imageId: number) => {
    // Find the index of the image being deleted
    const imageIndex = images.findIndex(img => img.id === imageId)
    
    setImages(prev => {
      const updatedImages = prev.filter(img => img.id !== imageId)
      
      // If we deleted the primary image, make the first remaining image primary
      if (updatedImages.length > 0 && !updatedImages.some(img => img.is_primary)) {
        updatedImages[0].is_primary = true
      }
      
      return updatedImages
    })

    // Also remove the corresponding file from imageFiles array
    if (imageIndex !== -1) {
      setImageFiles(prev => prev.filter((_, index) => index !== imageIndex))
    }
    
    showSuccessToast("Image removed", "Image has been removed from your listing.")
  }

  const handleSetPrimary = (imageId: number) => {
    setImages(prev => prev.map(img => ({
      ...img,
      is_primary: img.id === imageId
    })))
    
    showSuccessToast("Primary image updated", "This image will be shown as the main photo for your listing.")
  }

  const onSubmit = async (data: SellListingFormData) => {
    setIsSubmitting(true)
    try {
      const productData: ProductFormData = {
        title: data.title,
        description: data.description,
        price: data.price,
        condition: data.condition,
        location: data.location,
        preferred_meetup: data.preferred_meetup || undefined,
        category_id: data.category_id,
      }

      const newProduct = await createProduct(productData)
      
      // If there are images, upload them after creating the product
      if (imageFiles.length > 0) {
        try {
          setIsUploadingImages(true)
          
          // Upload images to the newly created product
          const uploadedImages = await uploadProductImages(newProduct.id, imageFiles)
          
          showImagesUploadedSuccess(uploadedImages.length)
        } catch (imageError) {
          console.error('Error uploading images:', imageError)
          showListingWarning('IMAGES_UPLOAD_PARTIAL')
        } finally {
          setIsUploadingImages(false)
        }
      }
      
      showSuccessToast(SUCCESS_MESSAGES.LISTING_CREATED.title, SUCCESS_MESSAGES.LISTING_CREATED.description)

      // Redirect to the new product page or my listings
      router.push(`/product/${newProduct.id}`)
    } catch (error) {
      console.error('Error creating product:', error)
      showErrorToast(error, "Failed to create listing")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Listing</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="max-w-2xl mx-auto bg-white rounded-lg border p-6">
          <h1 className="text-2xl font-bold mb-6">Create a Listing</h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Photos</h2>
                <ImageManager
                  images={images}
                  onUpload={handleImageUpload}
                  onDelete={handleImageDelete}
                  onSetPrimary={handleSetPrimary}
                  maxImages={6}
                  loading={isUploadingImages}
                  disabled={isSubmitting}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Listing Details</h2>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="What are you selling?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="like-new">Like New</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your item in detail. Include information about condition, features, and why you're selling."
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Location</h2>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="City, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferred_meetup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred meetup location (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Local coffee shop, mall, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Listing...
                    </>
                  ) : (
                    "Create Listing"
                  )}
                </Button>
                <p className="text-sm text-gray-500 text-center mt-4">
                  By listing an item, you agree to our terms of service and community guidelines
                </p>
              </div>
            </form>
          </Form>
        </div>
      </main>

      <footer className="bg-white border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 ReMarket. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

