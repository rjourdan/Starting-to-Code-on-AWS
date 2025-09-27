"""
Image processing utilities for reMarket application.

This module provides functions for:
- WebP conversion and optimization
- Image resizing and quality control
- File validation and error handling
- Directory structure management
"""

import os
import io
import uuid
from pathlib import Path
from typing import List, Tuple, Optional
from PIL import Image, ImageOps
from fastapi import HTTPException, UploadFile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MAX_IMAGE_SIZE = (1200, 1200)  # Maximum width/height in pixels
WEBP_QUALITY = 85  # WebP quality setting (0-100)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_MIME_TYPES = {
    'image/jpeg', 'image/jpg', 'image/png', 
    'image/gif', 'image/webp'
}

# Directory paths - use absolute path relative to this file's location
_CURRENT_DIR = Path(__file__).parent
UPLOAD_BASE_DIR = _CURRENT_DIR / "uploads"
PRODUCT_IMAGES_DIR = UPLOAD_BASE_DIR / "product_images"


def setup_image_directories():
    """
    Create necessary directory structure for product images.
    
    Creates:
    - uploads/product_images/
    """
    try:
        PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Image directories created: {PRODUCT_IMAGES_DIR}")
    except Exception as e:
        logger.error(f"Failed to create image directories: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to initialize image storage directories"
        )


def validate_image_file(file: UploadFile) -> None:
    """
    Validate uploaded image file.
    
    Args:
        file: FastAPI UploadFile object
        
    Raises:
        HTTPException: If file validation fails
    """
    # Check file size
    if hasattr(file, 'size') and file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size too large. Maximum allowed: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )
    
    # Check file extension
    if file.filename:
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )


def generate_unique_filename(original_filename: str, product_id: int) -> str:
    """
    Generate a unique filename for the processed image.
    
    Args:
        original_filename: Original filename from upload
        product_id: ID of the product this image belongs to
        
    Returns:
        Unique filename with .webp extension
    """
    # Generate unique identifier
    unique_id = str(uuid.uuid4())[:8]
    
    # Create filename: product_{product_id}_{unique_id}.webp
    filename = f"product_{product_id}_{unique_id}.webp"
    
    return filename


def resize_image(image: Image.Image, max_size: Tuple[int, int] = MAX_IMAGE_SIZE) -> Image.Image:
    """
    Resize image while maintaining aspect ratio.
    
    Args:
        image: PIL Image object
        max_size: Maximum dimensions (width, height)
        
    Returns:
        Resized PIL Image object
    """
    # Use ImageOps.fit to resize while maintaining aspect ratio
    # This will crop the image to fit the aspect ratio if needed
    resized = ImageOps.fit(
        image, 
        max_size, 
        Image.Resampling.LANCZOS,
        centering=(0.5, 0.5)
    )
    
    logger.info(f"Image resized from {image.size} to {resized.size}")
    return resized


def convert_to_webp(image: Image.Image, quality: int = WEBP_QUALITY) -> bytes:
    """
    Convert PIL Image to WebP format.
    
    Args:
        image: PIL Image object
        quality: WebP quality setting (0-100)
        
    Returns:
        WebP image data as bytes
    """
    # Convert to RGB if necessary (WebP doesn't support all modes)
    if image.mode in ('RGBA', 'LA', 'P'):
        # Create white background for transparent images
        background = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'P':
            image = image.convert('RGBA')
        background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
        image = background
    elif image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Save to WebP format
    output = io.BytesIO()
    image.save(
        output, 
        format='WEBP', 
        quality=quality,
        optimize=True
    )
    
    webp_data = output.getvalue()
    logger.info(f"Image converted to WebP, size: {len(webp_data)} bytes")
    
    return webp_data


async def process_product_image(
    file: UploadFile, 
    product_id: int,
    max_size: Tuple[int, int] = MAX_IMAGE_SIZE,
    quality: int = WEBP_QUALITY
) -> Tuple[str, str]:
    """
    Process uploaded product image: validate, resize, convert to WebP, and save.
    
    Args:
        file: FastAPI UploadFile object
        product_id: ID of the product this image belongs to
        max_size: Maximum image dimensions
        quality: WebP quality setting
        
    Returns:
        Tuple of (filename, file_path) for the processed image
        
    Raises:
        HTTPException: If processing fails
    """
    try:
        # Validate the uploaded file
        validate_image_file(file)
        
        # Ensure directories exist
        setup_image_directories()
        
        # Read file contents
        contents = await file.read()
        
        # Open image with PIL
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            logger.error(f"Failed to open image: {e}")
            raise HTTPException(
                status_code=400,
                detail="Invalid image file or corrupted data"
            )
        
        # Fix image orientation based on EXIF data
        image = ImageOps.exif_transpose(image)
        
        # Resize image if needed
        if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
            image = resize_image(image, max_size)
        
        # Convert to WebP
        webp_data = convert_to_webp(image, quality)
        
        # Generate unique filename
        filename = generate_unique_filename(file.filename, product_id)
        file_path = PRODUCT_IMAGES_DIR / filename
        
        # Save processed image
        with open(file_path, 'wb') as f:
            f.write(webp_data)
        
        logger.info(f"Image processed and saved: {file_path}")
        
        # Return relative path for URL generation
        relative_path = f"uploads/product_images/{filename}"
        
        return filename, relative_path
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )


def delete_product_image(filename: str) -> bool:
    """
    Delete a product image file from the filesystem.
    
    Args:
        filename: Name of the file to delete
        
    Returns:
        True if deletion was successful, False otherwise
    """
    try:
        file_path = PRODUCT_IMAGES_DIR / filename
        
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            logger.info(f"Image deleted: {file_path}")
            return True
        else:
            logger.warning(f"Image file not found: {file_path}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to delete image {filename}: {e}")
        return False


def cleanup_product_images(image_filenames: List[str]) -> int:
    """
    Delete multiple product image files.
    
    Args:
        image_filenames: List of filenames to delete
        
    Returns:
        Number of files successfully deleted
    """
    deleted_count = 0
    
    for filename in image_filenames:
        if delete_product_image(filename):
            deleted_count += 1
    
    logger.info(f"Cleaned up {deleted_count}/{len(image_filenames)} image files")
    return deleted_count


def get_image_info(file_path: str) -> Optional[dict]:
    """
    Get information about an image file.
    
    Args:
        file_path: Path to the image file
        
    Returns:
        Dictionary with image info or None if file doesn't exist
    """
    try:
        full_path = PRODUCT_IMAGES_DIR / file_path
        
        if not full_path.exists():
            return None
        
        # Get file stats
        stat = full_path.stat()
        
        # Try to get image dimensions
        try:
            with Image.open(full_path) as img:
                width, height = img.size
                format_name = img.format
        except Exception:
            width = height = format_name = None
        
        return {
            'filename': file_path,
            'size_bytes': stat.st_size,
            'width': width,
            'height': height,
            'format': format_name,
            'created_at': stat.st_ctime,
            'modified_at': stat.st_mtime
        }
        
    except Exception as e:
        logger.error(f"Failed to get image info for {file_path}: {e}")
        return None