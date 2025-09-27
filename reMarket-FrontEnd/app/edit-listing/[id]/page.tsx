"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Home } from "lucide-react"
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
import { ImageManager, ProductImage } from "@/components/ui/image-manager"
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
  showImagesUploadedSuccess,
  SUCCESS_MESSAGES 
} from "@/lib/toast-utils"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoading } from "@/components/ui/loading-states"

import { 
  getProduct, 
  updateProduct, 
  getCategories, 
  uploadProductImages, 
  deleteProductImage,
  type Product, 
  type Category,
  type ProductUpdateData 
} from "@/lib/api"
import { 
  productEditSchema, 
  validateSingleImage,
  type ProductEditData 
} from "@/lib/validation-schemas"

type EditListingFormData = ProductEditData

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [imageUploading, setImageUploading] = useState(false)

  const form = useForm<EditListingFormData>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      condition: "good",
      location: "",
      preferred_meetup: "",
      category_id: 0,
    },
  })

  // Load product data and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const productId = params.id as string
        
        // Load product and categories in parallel
        const [productData, categoriesData] = await Promise.all([
          getProduct(productId),
          getCategories()
        ])

        setProduct(productData)
        setCategories(categoriesData)
        setImages(productData.images || [])

        // Populate form with existing data
        form.reset({
          title: productData.title,
          description: productData.description,
          price: productData.price,
          condition: productData.condition as any,
          location: productData.location,
          preferred_meetup: productData.preferred_meetup || "",
          category_id: productData.category_id,
        })
      } catch (error) {
        console.error("Error loading data:", error)
        showErrorToast(error, "Failed to load listing data")
        router.push("/my-listings")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadData()
    }
  }, [params.id, form, router])

  // Handle form submission
  const onSubmit = async (data: EditListingFormData) => {
    if (!product) return

    try {
      setSubmitting(true)
      
      const updateData: ProductUpdateData = {
        title: data.title,
        description: data.description,
        price: data.price,
        condition: data.condition,
        location: data.location,
        preferred_meetup: data.preferred_meetup || undefined,
        category_id: data.category_id,
      }

      await updateProduct(product.id, updateData)
      
      showSuccessToast(SUCCESS_MESSAGES.LISTING_UPDATED.title, SUCCESS_MESSAGES.LISTING_UPDATED.description)
      
      router.push("/my-listings")
    } catch (error) {
      console.error("Error updating product:", error)
      showErrorToast(error, "Failed to update listing")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle image upload
  const handleImageUpload = async (files: File[]) => {
    if (!product) return

    // Check if adding these files would exceed the limit
    if (images.length + files.length > 6) {
      showErrorToast("You can upload a maximum of 6 images per listing.", "Too many images")
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

    try {
      setImageUploading(true)
      const uploadedImages = await uploadProductImages(product.id, files)
      
      // Update images state
      setImages(prev => [...prev, ...uploadedImages])
      
      showImagesUploadedSuccess(uploadedImages.length)
    } catch (error) {
      console.error("Error uploading images:", error)
      showErrorToast(error, "Failed to upload images")
    } finally {
      setImageUploading(false)
    }
  }

  // Handle image deletion
  const handleImageDelete = async (imageId: number) => {
    if (!product) return

    try {
      await deleteProductImage(product.id, imageId)
      
      // Update images state
      setImages(prev => prev.filter(img => img.id !== imageId))
      
      showSuccessToast("Success", "Image deleted successfully.")
    } catch (error) {
      console.error("Error deleting image:", error)
      showErrorToast(error, "Failed to delete image")
    }
  }

  // Handle setting primary image
  const handleSetPrimary = async (imageId: number) => {
    // Update images state optimistically
    setImages(prev => prev.map(img => ({
      ...img,
      is_primary: img.id === imageId
    })))
    
    showSuccessToast("Success", "Primary image updated.")
  }

  // Handle image reordering
  const handleImageReorder = (reorderedImages: ProductImage[]) => {
    setImages(reorderedImages)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading listing...</span>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Listing not found</h1>
          <Button asChild>
            <Link href="/my-listings">Back to My Listings</Link>
          </Button>
        </div>
      </div>
    )
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
              <BreadcrumbLink asChild>
                <Link href="/my-listings">My Listings</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Listing</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="max-w-2xl mx-auto bg-white rounded-lg border p-6">
          <h1 className="text-2xl font-bold mb-6">Edit Listing</h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Images Section */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Photos</h2>
                <ImageManager
                  images={images}
                  onUpload={handleImageUpload}
                  onDelete={handleImageDelete}
                  onSetPrimary={handleSetPrimary}
                  onReorder={handleImageReorder}
                  maxImages={6}
                  loading={imageUploading}
                  disabled={submitting}
                />
              </div>

              <Separator />

              {/* Listing Details */}
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
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
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

              {/* Location */}
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

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Listing
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push("/my-listings")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
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