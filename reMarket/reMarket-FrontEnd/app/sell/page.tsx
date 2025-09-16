"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export default function SellPage() {
  const [images, setImages] = useState<string[]>([])

  // In a real app, this would handle file uploads
  const handleImageUpload = () => {
    // Mock adding a new image
    setImages([...images, "/placeholder.svg?height=300&width=400"])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-emerald-600">
            ReMarket
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>

        <div className="max-w-2xl mx-auto bg-white rounded-lg border p-6">
          <h1 className="text-2xl font-bold mb-6">Create a Listing</h1>

          <form className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Photos</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Listing image ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
                {images.length < 6 && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Add Photo</span>
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500">Add up to 6 photos. First image will be the cover.</p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Listing Details</h2>

              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="What are you selling?" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" type="number" placeholder="0.00" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="games">Games</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="condition">Condition</Label>
                <Select>
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like-new">Like New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your item in detail. Include information about condition, features, and why you're selling."
                  rows={5}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Location</h2>

              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="City, State" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meetup">Preferred meetup location</Label>
                <Input id="meetup" placeholder="e.g., Local coffee shop, mall, etc." />
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full">
                Create Listing
              </Button>
              <p className="text-sm text-gray-500 text-center mt-4">
                By listing an item, you agree to our terms of service and community guidelines
              </p>
            </div>
          </form>
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

