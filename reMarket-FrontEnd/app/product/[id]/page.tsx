"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, MapPin, MessageCircle, Share2, User } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";
import { Header } from "@/components/header";
import { getProduct, getProducts, Product, Category, getCategories } from "@/lib/api";

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productId = Array.isArray(id) ? id[0] : id;
        const [productData, categoriesData] = await Promise.all([
          getProduct(productId),
          getCategories()
        ]);
        
        setProduct(productData);
        setCategories(categoriesData);
        
        // Fetch similar products in the same category
        const similar = await getProducts(productData.category_id);
        setSimilarProducts(similar.filter(p => p.id !== productData.id).slice(0, 4));
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-gray-200 rounded-lg h-96"></div>
              </div>
              <div>
                <div className="bg-gray-200 rounded-lg h-64"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg border p-6 text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error</h2>
            <p>{error || "Product not found"}</p>
            <Button asChild className="mt-4">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const category = categories.find(c => c.id === product.category_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to listings
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="relative aspect-video">
                {product.images.length > 0 ? (
                  <Image
                    src={product.images.find(img => img.is_primary)?.url || product.images[0].url}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Image
                    src="/placeholder.svg"
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-2xl font-bold">{product.title}</h1>
                    <div className="flex items-center text-gray-500 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{product.location}</span>
                      <span className="mx-2">•</span>
                      <span>Listed {new Date(product.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold">${product.price}</div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary">{category?.name || "Unknown Category"}</Badge>
                  <Badge variant="outline">{product.condition}</Badge>
                </div>

                <Separator className="my-6" />

                <div>
                  <h2 className="text-xl font-semibold mb-4">Description</h2>
                  <p className="text-gray-700">{product.description}</p>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button className="flex-1">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message Seller
                  </Button>
                  <Button variant="outline" size="icon">
                    <Heart className="h-5 w-5" />
                    <span className="sr-only">Add to favorites</span>
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-5 w-5" />
                    <span className="sr-only">Share</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              {product.images.map((image, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={image.url || "/placeholder.svg"}
                    alt={`${product.title} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg border p-6 sticky top-24">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Seller #{product.seller_id}</h3>
                  <p className="text-sm text-gray-500">Member since {new Date().getFullYear()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="font-semibold">5.0/5</div>
                  <div className="text-sm text-gray-500">Rating</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="font-semibold">10+</div>
                  <div className="text-sm text-gray-500">Listings</div>
                </div>
              </div>

              <Button className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                Contact Seller
              </Button>

              <p className="text-sm text-gray-500 text-center mt-4">
                Always meet in a public place and inspect the item before paying
              </p>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Similar Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {similarProducts.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id.toString()}
                title={item.title}
                price={item.price}
                location={item.location}
                image={item.images.find(img => img.is_primary)?.url || "/placeholder.svg"}
                category={categories.find(c => c.id === item.category_id)?.name || "Unknown"}
                timePosted={new Date(item.created_at).toLocaleDateString()}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 ReMarket. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}