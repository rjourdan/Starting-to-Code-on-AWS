import Link from "next/link"
import Image from "next/image"
import { Heart, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductCardProps {
  id: string
  title: string
  price: number
  location: string
  image: string
  category: string
  timePosted: string
}

export function ProductCard({ id, title, price, location, image, category, timePosted }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/product/${id}`} className="block relative aspect-square">
        <Image src={image || "/placeholder.svg"} alt={title} fill className="object-cover" />
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
          <h3 className="font-medium text-lg line-clamp-1">{title}</h3>
          <p className="font-bold text-lg">${price}</p>
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <MapPin className="h-3 w-3 mr-1" />
          <span>{location}</span>
        </div>
      </CardContent>
      <CardFooter className="px-4 py-3 border-t text-sm text-gray-500">Listed {timePosted}</CardFooter>
    </Card>
  )
}

