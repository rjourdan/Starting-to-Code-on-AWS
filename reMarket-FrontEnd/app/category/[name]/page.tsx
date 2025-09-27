'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Filter, Grid3X3, Book, Dumbbell, Gamepad2, type LucideIcon, Shirt, Smartphone, Sofa } from 'lucide-react'
import Link from 'next/link'
import { getProducts, getCategories, type Product as ApiProduct, type Category } from '@/lib/api'
import { getImageUrl } from '@/lib/image-utils'

interface DisplayProduct {
  id: number
  title: string
  price: number
  location: string
  image: string
  category: string
  description: string
  timePosted: string
  isSold?: boolean
}

export default function CategoryPage() {
  const params = useParams()
  const categoryName = params.name as string
  const [products, setProducts] = useState<DisplayProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Capitalize first letter for display
  const displayName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)

  // Helper function to get icon component (same as CategoryCard)
  const getIcon = (iconName: string): LucideIcon => {
    const icons: Record<string, LucideIcon> = {
      dumbbell: Dumbbell,
      shirt: Shirt,
      smartphone: Smartphone,
      "gamepad-2": Gamepad2,
      sofa: Sofa,
      "book-open": Book,
    }

    return icons[iconName] || Dumbbell
  }

  // Helper function to convert API product to display product
  const convertToDisplayProduct = (apiProduct: ApiProduct, categoryName: string): DisplayProduct => {
    const primaryImage = apiProduct.images.find(img => img.is_primary) || apiProduct.images[0]
    const imageUrl = getImageUrl(primaryImage?.url)
    
    // Calculate time posted
    const createdDate = new Date(apiProduct.created_at)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60))
    
    let timePosted: string
    if (diffInHours < 1) {
      timePosted = 'Just now'
    } else if (diffInHours < 24) {
      timePosted = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      timePosted = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }

    return {
      id: apiProduct.id,
      title: apiProduct.title,
      price: apiProduct.price,
      location: apiProduct.location,
      image: imageUrl,
      category: categoryName,
      description: apiProduct.description,
      timePosted,
      isSold: apiProduct.is_sold
    }
  }

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // First, fetch all categories to find the category ID
        const categoriesData = await getCategories()
        setCategories(categoriesData)
        
        // Find the category that matches the URL parameter
        const category = categoriesData.find(
          cat => cat.name.toLowerCase() === categoryName.toLowerCase()
        )
        
        if (!category) {
          setError(`Category "${displayName}" not found`)
          return
        }
        
        // Fetch products for this category
        const productsData = await getProducts(category.id)
        
        // Convert API products to display format
        const displayProducts = productsData.map(product => 
          convertToDisplayProduct(product, category.name)
        )
        
        setProducts(displayProducts)
      } catch (err) {
        console.error('Error fetching category products:', err)
        setError('Failed to load products. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryProducts()
  }, [categoryName, displayName])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading {displayName} products...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Category Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-gray-600">{products.length} items available</p>
            </div>
            
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All Categories Button */}
            <Link href="/">
              <Button 
                variant="outline" 
                size="sm"
                className="whitespace-nowrap flex-shrink-0"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                All Categories
              </Button>
            </Link>
            
            {/* Individual Category Buttons */}
            {categories.map((category) => {
              const isActive = category.name.toLowerCase() === categoryName.toLowerCase()
              const IconComponent = getIcon(category.icon)
              return (
                <Link 
                  key={category.id} 
                  href={`/category/${category.name.toLowerCase()}`}
                >
                  <Button 
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap flex-shrink-0"
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {category.name}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                location={product.location}
                image={product.image}
                category={product.category}
                description={product.description}
                timePosted={product.timePosted}
                isSold={product.isSold}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">
              There are currently no items available in the {displayName} category.
            </p>
            <Link href="/sell">
              <Button>
                List an Item
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}