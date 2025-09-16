import { API_URL } from "@/lib/constants";

/**
 * Helper function to get the full URL for a profile image
 * @param imagePath The relative path to the image from the API
 * @returns The full URL to the image
 */
export function getProfileImageUrl(imagePath: string | undefined | null): string {
  if (!imagePath) {
    return "/placeholder-user.jpg";
  }
  
  // If the path already includes the API URL, return it as is
  if (imagePath.startsWith("http")) {
    return imagePath;
  }
  
  // Otherwise, prepend the API URL
  return `${API_URL}${imagePath}`;
}