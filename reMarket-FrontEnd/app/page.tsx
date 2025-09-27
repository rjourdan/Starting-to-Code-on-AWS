"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { CategoryCard } from "@/components/category-card";
import { getProducts, getCategories, checkApiConnection, deleteProduct, toggleProductSoldStatus, Product, Category } from "@/lib/api";
import { getImageUrl } from "@/lib/image-utils";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check API connection first
        const isConnected = await checkApiConnection();
        console.log('API connection status:', isConnected);
        
        if (!isConnected) {
          setError("Cannot connect to the backend API. Please make sure the server is running.");
          setIsLoading(false);
          return;
        }
        
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        
        console.log('Products fetched:', productsData.length);
        console.log('Categories fetched:', categoriesData.length);
        
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handler functions for owner actions
  const handleEdit = (productId: number) => {
    router.push(`/edit-listing/${productId}`);
  };

  const handleDelete = async (productId: number) => {
    setActionLoading(productId);
    try {
      await deleteProduct(productId);
      // Remove the deleted product from the local state
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      showSuccessToast("Listing deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      showErrorToast(error, "Failed to delete listing");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSold = async (productId: number, sold: boolean) => {
    setActionLoading(productId);
    try {
      const updatedProduct = await toggleProductSoldStatus(productId, { is_sold: sold });
      // Update the product in the local state
      setProducts(prevProducts => 
        prevProducts.map(p => p.id === productId ? updatedProduct : p)
      );
      showSuccessToast(
        sold ? "Listing marked as sold" : "Listing marked as available"
      );
    } catch (error) {
      console.error("Error updating sold status:", error);
      showErrorToast(error, "Failed to update listing status");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {isLoading
              ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 animate-pulse h-32"></div>
                ))
              : categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    name={category.name}
                    icon={category.icon}
                    count={products.filter(p => p.category_id === category.id).length}
                  />
                ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Featured Listings</h2>
          {error && <p className="text-red-500">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {isLoading
              ? Array(8).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden border border-gray-200 animate-pulse h-64"></div>
                ))
              : products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id.toString()}
                    title={product.title}
                    price={product.price}
                    location={product.location}
                    image={getImageUrl(product.images.find(img => img.is_primary)?.url)}
                    category={categories.find(c => c.id === product.category_id)?.name || "Unknown"}
                    timePosted={new Date(product.created_at).toLocaleDateString()}
                    isSold={product.is_sold}
                    sellerId={product.seller_id}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleSold={handleToggleSold}
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