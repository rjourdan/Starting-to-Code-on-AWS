import Link from "next/link"
import Image from "next/image"
import { Heart, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/price-utils"
import { ListingActions } from "@/components/ui/listing-actions"
import { useAuth } from "@/components/auth-provider"

interface ProductCardProps {
  id: string
  title: string
  price: number
  location: string
  image: string
  category: string
  timePosted: string
  isSold?: boolean
  sellerId?: number
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  onToggleSold?: (id: number, sold: boolean) => void
}

export function ProductCard({ 
  id, 
  title, 
  price, 
  location, 
  image, 
  category, 
  timePosted, 
  isSold = false,
  sellerId,
  onEdit,
  onDelete,
  onToggleSold
}: ProductCardProps) {
  const { user, isAuthenticated } = useAuth()
  const isOwner = isAuthenticated && user && sellerId && user.id === sellerId
  const showActions = isOwner && onEdit && onDelete && onToggleSold

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${isSold ? 'opacity-75' : ''}`}>
      <Link href={`/product/${id}`} className="block relative aspect-square">
        <Image src={image || "/placeholder.svg"} alt={title} fill className="object-cover" />
        
        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary" className="bg-red-500 text-white text-lg px-4 py-2">
              SOLD
            </Badge>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full h-8 w-8"
        >
          <Heart className="h-4 w-4" />
          <span className="sr-only">Add to favorites</span>
        </Button>
        <Badge className="absolute bottom-2 left-2 bg-emerald-500 hover:bg-emerald-600">{category}</Badge>
      </Link>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <h3 className={`font-medium text-lg line-clamp-1 ${isSold ? 'text-gray-500' : ''}`}>{title}</h3>
          <p className={`font-bold text-lg ${isSold ? 'text-gray-500' : ''}`}>{formatPrice(price)}</p>
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <MapPin className="h-3 w-3 mr-1" />
          <span>{location}</span>
        </div>
        
        {/* Owner actions */}
        {showActions && (
          <div className="mt-3 pt-3 border-t">
            <ListingActions
              listing={{ id: parseInt(id), title, is_sold: isSold }}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleSold={onToggleSold}
              variant="compact"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 py-3 border-t text-sm text-gray-500">
        Listed {timePosted}
        {isSold && <Badge variant="outline" className="ml-2 text-red-600 border-red-600">Sold</Badge>}
      </CardFooter>
    </Card>
  )
}

