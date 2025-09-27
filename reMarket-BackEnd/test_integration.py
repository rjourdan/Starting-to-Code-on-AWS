#!/usr/bin/env python3
"""
Integration test for image processing utilities with FastAPI.
"""

import asyncio
import io
from PIL import Image
from fastapi import UploadFile
from image_utils import process_product_image, setup_image_directories

def create_sample_images():
    """Create sample images for testing."""
    images = []
    
    # JPEG image
    jpeg_img = Image.new('RGB', (800, 600), color='blue')
    jpeg_bytes = io.BytesIO()
    jpeg_img.save(jpeg_bytes, format='JPEG')
    jpeg_bytes.seek(0)
    
    # PNG image with transparency
    png_img = Image.new('RGBA', (600, 400), color=(255, 0, 0, 128))
    png_bytes = io.BytesIO()
    png_img.save(png_bytes, format='PNG')
    png_bytes.seek(0)
    
    # GIF image
    gif_img = Image.new('RGB', (300, 300), color='green')
    gif_bytes = io.BytesIO()
    gif_img.save(gif_bytes, format='GIF')
    gif_bytes.seek(0)
    
    return [
        ('test.jpg', 'image/jpeg', jpeg_bytes.getvalue()),
        ('test.png', 'image/png', png_bytes.getvalue()),
        ('test.gif', 'image/gif', gif_bytes.getvalue())
    ]

class MockUploadFile:
    """Mock UploadFile for testing."""
    def __init__(self, filename, content_type, content):
        self.filename = filename
        self.content_type = content_type
        self.content = content
        self.size = len(content)
    
    async def read(self):
        return self.content

async def test_integration():
    """Test integration with multiple image formats."""
    print("Testing integration with multiple image formats...")
    
    # Setup directories
    setup_image_directories()
    
    # Create sample images
    sample_images = create_sample_images()
    processed_files = []
    
    # Process each image
    for i, (filename, content_type, content) in enumerate(sample_images):
        print(f"\nProcessing {filename}...")
        
        mock_file = MockUploadFile(filename, content_type, content)
        
        try:
            processed_filename, file_path = await process_product_image(mock_file, 100 + i)
            processed_files.append(processed_filename)
            
            print(f"✓ {filename} -> {processed_filename}")
            print(f"  Original size: {len(content)} bytes")
            
            # Check file exists
            from pathlib import Path
            full_path = Path("uploads/product_images") / processed_filename
            if full_path.exists():
                print(f"  WebP size: {full_path.stat().st_size} bytes")
                
                # Get compression ratio
                compression_ratio = (1 - full_path.stat().st_size / len(content)) * 100
                print(f"  Compression: {compression_ratio:.1f}%")
            
        except Exception as e:
            print(f"✗ Failed to process {filename}: {e}")
    
    # Clean up
    print(f"\nCleaning up {len(processed_files)} files...")
    from image_utils import cleanup_product_images
    deleted_count = cleanup_product_images(processed_files)
    print(f"✓ Cleaned up {deleted_count} files")
    
    print("\n✓ Integration test completed!")

if __name__ == "__main__":
    asyncio.run(test_integration())