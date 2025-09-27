"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { ListingActions } from "@/components/ui/listing-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { 
  getMyProducts, 
  deleteProduct, 
  toggleProductSoldStatus,
  type Product 
} from "@/lib/api"
import { formatPrice } from "@/lib/price-utils"
import { 
  showErrorToast, 
  showSuccessToast, 
  SUCCESS_MESSAGES 
} from "@/lib/toast-utils"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoading, ListingCardsLoading, EmptyState } from "@/components/ui/loading-states"
import { 
  Grid3X3, 
  List, 
  Plus, 
  Package, 
  AlertCircle,
  Filter,
  Home
} from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = "grid" | "list"
type FilterMode = "all" | "available" | "sold"

export default function MyListingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  
  const [listings, setListings] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all")
  const [actionLoading, setActionLoading] = React.useState<number | null>(null)

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch user's listings
  const fetchListings = React.useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await getMyProducts()
      setListings(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load listings'
      setError(errorMessage)
      showErrorToast(err, "Failed to load listings")
    } finally {
      setLoading(false)
    }
  }, [user])

  React.useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Filter listings based on selected filter
  const filteredListings = React.useMemo(() => {
    switch (filterMode) {
      case "available":
        return listings.filter(listing => !listing.is_sold)
      case "sold":
        return listings.filter(listing => listing.is_sold)
      default:
        return listings
    }
  }, [listings, filterMode])

  // Handle edit listing
  const handleEdit = React.useCallback((id: number) => {
    router.push(`/edit-listing/${id}`)
  }, [router])

  // Handle delete listing
  const handleDelete = React.useCallback(async (id: number) => {
    try {
      setActionLoading(id)
      await deleteProduct(id)
      
      // Remove from local state
      setListings(prev => prev.filter(listing => listing.id !== id))
      
      showSuccessToast(SUCCESS_MESSAGES.LISTING_DELETED.title, SUCCESS_MESSAGES.LISTING_DELETED.description)
    } catch (err) {
      showErrorToast(err, "Failed to delete listing")
    } finally {
      setActionLoading(null)
    }
  }, [])

  // Handle toggle sold status
  const handleToggleSold = React.useCallback(async (id: number, sold: boolean) => {
    try {
      setActionLoading(id)
      const updatedProduct = await toggleProductSoldStatus(id, { is_sold: sold })
      
      // Update local state
      setListings(prev => 
        prev.map(listing => 
          listing.id === id ? { ...listing, is_sold: updatedProduct.is_sold } : listing
        )
      )
      
      const message = sold ? SUCCESS_MESSAGES.LISTING_SOLD : SUCCESS_MESSAGES.LISTING_AVAILABLE
      showSuccessToast(message.title, message.description)
    } catch (err) {
      showErrorToast(err, "Failed to update listing")
    } finally {
      setActionLoading(null)
    }
  }, [])

  // Handle create new listing
  const handleCreateListing = React.useCallback(() => {
    router.push('/sell')
  }, [router])

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
            <BreadcrumbPage>My Listings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
          <p className="text-muted-foreground">
            Manage your product listings and track sales
          </p>
        </div>
        <Button onClick={handleCreateListing} className="w-fit">
          <Plus className="mr-2 h-4 w-4" />
          Create Listing
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-8 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            {/* Filter Tabs */}
            <Tabs value={filterMode} onValueChange={(value) => setFilterMode(value as FilterMode)}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({listings.length})
                </TabsTrigger>
                <TabsTrigger value="available">
                  Available ({listings.filter(l => !l.is_sold).length})
                </TabsTrigger>
                <TabsTrigger value="sold">
                  Sold ({listings.filter(l => l.is_sold).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Empty State */}
          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filterMode === "all" 
                  ? "No listings yet" 
                  : filterMode === "available"
                  ? "No available listings"
                  : "No sold listings"
                }
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {filterMode === "all" 
                  ? "Start selling by creating your first listing. It's quick and easy!"
                  : filterMode === "available"
                  ? "All your listings are currently sold. Create a new listing or mark existing ones as available."
                  : "You haven't sold any items yet. Keep promoting your listings!"
                }
              </p>
              {filterMode === "all" && (
                <Button onClick={handleCreateListing}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Listing
                </Button>
              )}
            </div>
          ) : (
            /* Listings Grid/List */
            <div className={cn(
              viewMode === "grid" 
                ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
                : "space-y-4"
            )}>
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  viewMode={viewMode}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleSold={handleToggleSold}
                  loading={actionLoading === listing.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface ListingCardProps {
  listing: Product
  viewMode: ViewMode
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onToggleSold: (id: number, sold: boolean) => void
  loading: boolean
}

function ListingCard({ 
  listing, 
  viewMode, 
  onEdit, 
  onDelete, 
  onToggleSold, 
  loading 
}: ListingCardProps) {
  const primaryImage = listing.images?.find(img => img.is_primary) || listing.images?.[0]
  
  // Helper function to get the correct image URL
  const getImageUrl = (imageUrl: string) => {
    // If the URL starts with '/', it's likely a placeholder that needs to be corrected
    if (imageUrl.startsWith('/placeholder.svg')) {
      return '/placeholder.svg'
    }
    // If it starts with '/uploads/', it's a backend URL
    if (imageUrl.startsWith('/uploads/')) {
      return `http://localhost:8000${imageUrl}`
    }
    // Otherwise return as is
    return imageUrl
  }
  
  if (viewMode === "list") {
    return (
      <Card>
        <div className="flex items-center p-6">
          {/* Image */}
          <div className="flex-shrink-0 mr-4">
            <div className="w-16 h-16 bg-muted rounded-md overflow-hidden">
              {primaryImage ? (
                <img
                  src={getImageUrl(primaryImage.url)}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-grow min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-grow">
                <h3 className="font-semibold truncate">{listing.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(listing.price)} • {listing.condition}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(listing.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center gap-3 ml-4">
                <Badge variant={listing.is_sold ? "secondary" : "default"}>
                  {listing.is_sold ? "Sold" : "Available"}
                </Badge>
                <ListingActions
                  listing={listing}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleSold={onToggleSold}
                  loading={loading}
                  variant="compact"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <div className="aspect-square bg-muted relative">
          {primaryImage ? (
            <img
              src={getImageUrl(primaryImage.url)}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <Badge 
            className="absolute top-2 right-2" 
            variant={listing.is_sold ? "secondary" : "default"}
          >
            {listing.is_sold ? "Sold" : "Available"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <h3 className="font-semibold truncate mb-1">{listing.title}</h3>
        <p className="text-lg font-bold text-primary mb-1">
          {formatPrice(listing.price)}
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          {listing.condition} • {listing.location}
        </p>
        <p className="text-xs text-muted-foreground">
          Created {new Date(listing.created_at).toLocaleDateString()}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <ListingActions
          listing={listing}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleSold={onToggleSold}
          loading={loading}
          variant="dropdown"
          className="w-full justify-end"
        />
      </CardFooter>
    </Card>
  )
}