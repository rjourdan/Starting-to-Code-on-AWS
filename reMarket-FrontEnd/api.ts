// API client for the ReMarket backend

import { API_URL } from './constants';

// Debug function to check API connectivity
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/`);
    console.log('API connection check:', response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error('API connection error:', error);
    return false;
  }
};

// Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  location: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  location: string;
  member_since: string;
  rating: number;
  profile_image?: string;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  location?: string;
  profile_image?: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
  product_id: number;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  condition: string;
  location: string;
  preferred_meetup?: string;
  created_at: string;
  is_sold: boolean;
  seller_id: number;
  category_id: number;
  images: ProductImage[];
}

// New interfaces for listing management
export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  condition: string;
  location: string;
  preferred_meetup?: string;
  category_id: number;
  community_ids?: number[];
}

export interface ProductUpdateData {
  title?: string;
  description?: string;
  price?: number;
  condition?: string;
  location?: string;
  preferred_meetup?: string;
  category_id?: number;
}

export interface SoldStatusUpdate {
  is_sold: boolean;
}

export interface ImageUploadResponse {
  id: number;
  url: string;
  is_primary: boolean;
}

// Helper function to get token from localStorage
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

import { handleApiError, createApiError, getErrorMessageFromStatus, logError } from './error-utils';

// Helper function to handle API responses with enhanced error handling
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      
      // Special handling for authentication errors
      if (response.status === 401 && errorData.detail === "Incorrect username or password") {
        throw createApiError(
          "Invalid username or password. Please try again or sign up for an account.",
          401,
          'INVALID_CREDENTIALS'
        );
      }

      // Handle validation errors with detailed field information
      if (response.status === 422 && errorData.detail) {
        const validationErrors = Array.isArray(errorData.detail) 
          ? errorData.detail.map((err: any) => err.msg || err.message).join(', ')
          : errorData.detail;
        
        throw createApiError(
          `Validation error: ${validationErrors}`,
          422,
          'VALIDATION_ERROR',
          errorData.detail
        );
      }

      // Use the error detail if available, otherwise use status-based message
      const message = errorData.detail || getErrorMessageFromStatus(response.status);
      throw createApiError(message, response.status, errorData.code);
      
    } catch (e) {
      if (e instanceof Error && (e as any).status) {
        throw e; // Re-throw our custom errors
      }
      
      // If response is not JSON or parsing failed
      const message = getErrorMessageFromStatus(response.status);
      throw createApiError(message, response.status, 'PARSE_ERROR');
    }
  }

  try {
    return await response.json();
  } catch (e) {
    // Handle cases where response is not JSON (e.g., 204 No Content)
    if (response.status === 204) {
      return null;
    }
    throw createApiError('Invalid response format', response.status, 'PARSE_ERROR');
  }
};

// Authentication
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch(`${API_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await handleResponse(response);
    
    // Store token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.access_token);
    }
    
    return data;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'login');
    throw handleApiError(error);
  }
};

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// User endpoints
export const registerUser = async (userData: RegisterData): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'registerUser');
    throw handleApiError(error);
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getCurrentUser');
    throw handleApiError(error);
  }
};

export const getUser = async (userId: number): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}`);
    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getUser');
    throw handleApiError(error);
  }
};

export const getUserListingsCount = async (userId: number): Promise<number> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/listings/count`);
    if (!response.ok) {
      // If endpoint doesn't exist, return 0 as fallback
      return 0;
    }
    const data = await handleResponse(response);
    return data.count || 0;
  } catch (error) {
    console.error('Error fetching user listings count:', error);
    return 0;
  }
};

export const updateUserProfile = async (userData: UpdateUserData): Promise<User> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'updateUserProfile');
    throw handleApiError(error);
  }
};

export const uploadProfileImage = async (file: File): Promise<string> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading profile image:', file.name);
    // Don't set Content-Type header - browser will set it with correct boundary
    const response = await fetch(`${API_URL}/users/me/profile-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    console.log('Upload response status:', response.status);
    const data = await handleResponse(response);
    console.log('Upload successful, URL:', data.url);
    return data.url;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'uploadProfileImage');
    throw handleApiError(error);
  }
};

// Category endpoints
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(`${API_URL}/categories/`);
    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getCategories');
    throw handleApiError(error);
  }
};

// Product endpoints
export const getProducts = async (
  categoryId?: number,
  communityId?: number,
  skip = 0,
  limit = 20
): Promise<Product[]> => {
  try {
    let url = `${API_URL}/products/?skip=${skip}&limit=${limit}`;
    
    if (categoryId) url += `&category_id=${categoryId}`;
    if (communityId) url += `&community_id=${communityId}`;
    
    console.log('Fetching products from:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });
    console.log('Products response status:', response.status);
    
    const data = await handleResponse(response);
    console.log('Products data:', data);
    return data;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getProducts');
    throw handleApiError(error);
  }
};

export const getProduct = async (id: string): Promise<Product> => {
  try {
    const response = await fetch(`${API_URL}/products/${id}`);
    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getProduct');
    throw handleApiError(error);
  }
};

export const createProduct = async (product: ProductFormData): Promise<Product> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'createProduct');
    throw handleApiError(error);
  }
};

// Listing management endpoints

// Get current user's listings
export const getMyProducts = async (): Promise<Product[]> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/products/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getMyProducts');
    throw handleApiError(error);
  }
};

// Update a product (owner only)
export const updateProduct = async (productId: number, productData: ProductUpdateData): Promise<Product> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'updateProduct');
    throw handleApiError(error);
  }
};

// Delete a product (owner only)
export const deleteProduct = async (productId: number): Promise<void> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    await handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'deleteProduct');
    throw handleApiError(error);
  }
};

// Toggle product sold status
export const toggleProductSoldStatus = async (productId: number, soldStatus: SoldStatusUpdate): Promise<Product> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/products/${productId}/sold`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(soldStatus),
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'toggleProductSoldStatus');
    throw handleApiError(error);
  }
};

// Upload product images
export const uploadProductImages = async (productId: number, files: File[]): Promise<ProductImage[]> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_URL}/products/${productId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    return handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'uploadProductImages');
    throw handleApiError(error);
  }
};

// Delete product image
export const deleteProductImage = async (productId: number, imageId: number): Promise<void> => {
  try {
    const token = getToken();
    if (!token) throw createApiError('Not authenticated', 401, 'AUTH_REQUIRED');

    const response = await fetch(`${API_URL}/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    await handleResponse(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'deleteProductImage');
    throw handleApiError(error);
  }
};