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

// Helper function to get token from localStorage
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    try {
      const error = await response.json();
      
      // Special handling for authentication errors
      if (response.status === 401 && error.detail === "Incorrect username or password") {
        throw new Error("Invalid username or password. Please try again or sign up for an account.");
      }
      
      throw new Error(error.detail || 'An error occurred');
    } catch (e) {
      if (e instanceof Error && e.message.includes("Invalid username or password")) {
        throw e;
      }
      // If response is not JSON
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
  return response.json();
};

// Authentication
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
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
};

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// User endpoints
export const registerUser = async (userData: RegisterData): Promise<User> => {
  const response = await fetch(`${API_URL}/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  return handleResponse(response);
};

export const getCurrentUser = async (): Promise<User> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return handleResponse(response);
};

export const updateUserProfile = async (userData: UpdateUserData): Promise<User> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  return handleResponse(response);
};

export const uploadProfileImage = async (file: File): Promise<string> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('file', file);

  try {
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
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

// Category endpoints
export const getCategories = async (): Promise<Category[]> => {
  const response = await fetch(`${API_URL}/categories/`);
  return handleResponse(response);
};

// Product endpoints
export const getProducts = async (
  categoryId?: number,
  communityId?: number,
  skip = 0,
  limit = 20
): Promise<Product[]> => {
  let url = `${API_URL}/products/?skip=${skip}&limit=${limit}`;
  
  if (categoryId) url += `&category_id=${categoryId}`;
  if (communityId) url += `&community_id=${communityId}`;
  
  try {
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
    
    if (!response.ok) {
      console.error('Error response:', await response.text());
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Products data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProduct = async (id: string): Promise<Product> => {
  const response = await fetch(`${API_URL}/products/${id}`);
  return handleResponse(response);
};

export const createProduct = async (product: any): Promise<Product> => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/products/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });

  return handleResponse(response);
};