import { API_URL } from './constants';

/**
 * Get the full URL for an image path
 * @param imagePath - The relative image path from the API
 * @returns The full URL to the image
 */
export function getImageUrl(imagePath: string | undefined): string {
  if (!imagePath) {
    return "/placeholder.svg";
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it's a relative path, prepend the API URL
  return `${API_URL}${imagePath}`;
}