"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"

export function FeaturedListings() {
  const [currentPage, setCurrentPage] = useState(0)

  const featuredItems = [
    {
      id: "f1",
      title: "Specialized Road Bike",
      price: 850,
      location: "Manhattan, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Sports",
      timePosted: "3 hours ago",
    },
    {
      id: "f2",
      title: "Vintage Leather Jacket",
      price: 120,
      location: "Brooklyn, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Clothing",
      timePosted: "1 day ago",
    },
    {
      id: "f3",
      title: "Nintendo Switch with Games",
      price: 220,
      location: "Queens, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Games",
      timePosted: "5 hours ago",
    },
    {
      id: "f4",
      title: "Antique Desk Lamp",
      price: 65,
      location: "Staten Island, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Home",
      timePosted: "2 days ago",
    },
    {
      id: "f5",
      title: "Canon DSLR Camera",
      price: 450,
      location: "Bronx, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Electronics",
      timePosted: "1 day ago",
    },
    {
      id: "f6",
      title: "Yoga Mat & Blocks Set",
      price: 35,
      location: "Manhattan, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Sports",
      timePosted: "4 hours ago",
    },
    {
      id: "f7",
      title: "Vintage Vinyl Records",
      price: 120,
      location: "Brooklyn, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Music",
      timePosted: "3 days ago",
    },
    {
      id: "f8",
      title: "Designer Handbag",
      price: 180,
      location: "Queens, NY",
      image: "/placeholder.svg?height=300&width=400",
      category: "Clothing",
      timePosted: "1 day ago",
    },
  ]

  const itemsPerPage = 4
  const totalPages = Math.ceil(featuredItems.length / itemsPerPage)

  const visibleItems = featuredItems.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages)
  }

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {visibleItems.map((item) => (
          <ProductCard
            key={item.id}
            id={item.id}
            title={item.title}
            price={item.price}
            location={item.location}
            image={item.image}
            category={item.category}
            timePosted={item.timePosted}
          />
        ))}
      </div>

      <div className="flex justify-center mt-6 gap-2">
        <Button variant="outline" size="icon" onClick={prevPage} className="rounded-full">
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button variant="outline" size="icon" onClick={nextPage} className="rounded-full">
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  )
}

