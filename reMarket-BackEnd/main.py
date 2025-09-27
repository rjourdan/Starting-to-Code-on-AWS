from fastapi import FastAPI, Depends, HTTPException, status, Body, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
import shutil
import os
import time
from pathlib import Path

from database import get_db, engine
import models
import schemas
from auth import authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

# Create tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReMarket API")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for uploads
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to ReMarket API"}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User endpoints
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        location=user.location
    )
    new_user.set_password(user.password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.patch("/users/me", response_model=schemas.User)
def update_user_me(
    user_data: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Update user fields
    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

from fastapi import File, UploadFile
import shutil
import os
from pathlib import Path

# Create uploads directory if it doesn't exist
PROFILE_IMAGES_DIR = Path("uploads/profile_images")
PROFILE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

from PIL import Image
import io

@app.post("/users/me/profile-image", response_model=schemas.ProfileImageResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"Received file upload: {file.filename}, content_type: {file.content_type}")
    
    try:
        # Validate file is an image
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Create a unique filename
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"user_{current_user.id}_{int(time.time())}{file_extension}"
        file_path = PROFILE_IMAGES_DIR / filename
        
        print(f"Saving file to: {file_path}")
        
        # Read the file content
        contents = await file.read()
        
        # Process the image to make it square
        try:
            # Open the image using PIL
            img = Image.open(io.BytesIO(contents))
            
            # Get dimensions
            width, height = img.size
            
            # Determine the size of the square (use the smaller dimension)
            size = min(width, height)
            
            # Calculate coordinates for cropping
            left = (width - size) // 2
            top = (height - size) // 2
            right = left + size
            bottom = top + size
            
            # Crop the image
            cropped_img = img.crop((left, top, right, bottom))
            
            # Save the cropped image
            cropped_img.save(file_path)
            print(f"Image cropped to square: {size}x{size}")
        except Exception as img_error:
            print(f"Error processing image: {str(img_error)}, saving original")
            # If image processing fails, save the original
            with open(file_path, "wb") as buffer:
                buffer.write(contents)
        
        # Update user's profile_image field
        image_url = f"/uploads/profile_images/{filename}"
        current_user.profile_image = image_url
        db.commit()
        
        print(f"File saved successfully, URL: {image_url}")
        return {"url": image_url}
    except Exception as e:
        print(f"Error in upload_profile_image: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/users/{user_id}/listings/count")
def get_user_listings_count(user_id: int, db: Session = Depends(get_db)):
    """Get the count of listings for a specific user"""
    count = db.query(models.Product).filter(models.Product.seller_id == user_id).count()
    return {"count": count}

# Category endpoints
@app.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_category = models.Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.get("/categories/", response_model=List[schemas.Category])
def read_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).all()
    return categories

# Community endpoints
@app.post("/communities/", response_model=schemas.Community)
def create_community(community: schemas.CommunityCreate, db: Session = Depends(get_db)):
    db_community = models.Community(**community.dict())
    db.add(db_community)
    db.commit()
    db.refresh(db_community)
    return db_community

@app.get("/communities/", response_model=List[schemas.Community])
def read_communities(db: Session = Depends(get_db)):
    communities = db.query(models.Community).all()
    return communities

# Product endpoints
@app.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_product = models.Product(
        title=product.title,
        description=product.description,
        price=product.price,
        condition=product.condition,
        location=product.location,
        preferred_meetup=product.preferred_meetup,
        seller_id=current_user.id,  # Use the authenticated user's ID
        category_id=product.category_id
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Add product to communities
    if product.community_ids:
        communities = db.query(models.Community).filter(models.Community.id.in_(product.community_ids)).all()
        db_product.communities.extend(communities)
        db.commit()
    
    # Add product images
    if product.image_urls:
        for i, url in enumerate(product.image_urls):
            image = models.ProductImage(
                url=url,
                is_primary=(i == 0),  # First image is primary
                product_id=db_product.id
            )
            db.add(image)
        db.commit()
    
    return db_product

@app.get("/products/", response_model=List[schemas.Product])
def read_products(
    skip: int = 0, 
    limit: int = 100, 
    category_id: int = None,
    community_id: int = None,
    db: Session = Depends(get_db)
):
    try:
        # Direct SQL query to check products
        result = db.execute(text("SELECT COUNT(*) FROM products"))
        count = result.scalar()
        print(f"Total products in database: {count}")
        
        # Use regular ORM query
        query = db.query(models.Product)
        
        # Debug the filter condition
        print(f"Checking is_sold filter")
        products_all = query.all()
        print(f"All products (without filter): {len(products_all)}")
        
        # Apply filters one by one
        query = query.filter(models.Product.is_sold == False)
        products_not_sold = query.all()
        print(f"Products not sold: {len(products_not_sold)}")
        
        if category_id:
            query = query.filter(models.Product.category_id == category_id)
            print(f"After category filter: {len(query.all())}")
        
        if community_id:
            query = query.join(models.product_community).filter(models.product_community.c.community_id == community_id)
            print(f"After community filter: {len(query.all())}")
        
        products = query.order_by(models.Product.created_at.desc()).offset(skip).limit(limit).all()
        
        # Debug output
        print(f"Final products query returned {len(products)} items")
        for product in products:
            print(f"Product: {product.id}, {product.title}, Category: {product.category_id}, Sold: {product.is_sold}")
            
        return products
    except Exception as e:
        print(f"Error in read_products: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/products/me", response_model=List[schemas.Product])
def read_user_products(
    skip: int = 0,
    limit: int = 100,
    sold_status: bool = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all products belonging to the current user with optional filtering"""
    query = db.query(models.Product).filter(models.Product.seller_id == current_user.id)
    
    # Filter by sold status if provided
    if sold_status is not None:
        query = query.filter(models.Product.is_sold == sold_status)
    
    # Order by creation date (newest first) and apply pagination
    products = query.order_by(models.Product.created_at.desc()).offset(skip).limit(limit).all()
    
    return products

@app.get("/products/{product_id}", response_model=schemas.Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product

@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int, 
    product: schemas.ProductUpdate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Get the product
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify ownership
    if db_product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    # Update only the fields that were provided
    update_data = product.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}")
def delete_product(
    product_id: int, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Get the product
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify ownership
    if db_product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
    
    # Delete associated product images first
    db.query(models.ProductImage).filter(models.ProductImage.product_id == product_id).delete()
    
    # Delete the product
    db.delete(db_product)
    db.commit()
    
    return {"message": "Product deleted successfully"}

@app.patch("/products/{product_id}/sold", response_model=schemas.Product)
def update_product_sold_status(
    product_id: int,
    sold_status: schemas.SoldStatusUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the product
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify ownership
    if db_product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    # Update sold status
    db_product.is_sold = sold_status.is_sold
    db.commit()
    db.refresh(db_product)
    
    return db_product

# Product Image Management Endpoints
from image_utils import process_product_image, delete_product_image

# Create product images directory if it doesn't exist
PRODUCT_IMAGES_DIR = Path("uploads/product_images")
PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

@app.post("/products/{product_id}/images", response_model=List[schemas.ProductImage])
async def upload_product_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process multiple images for a product"""
    # Get the product and verify ownership
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if db_product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add images to this product")
    
    # Check if adding these files would exceed the limit (6 images max)
    existing_images_count = db.query(models.ProductImage).filter(
        models.ProductImage.product_id == product_id
    ).count()
    
    if existing_images_count + len(files) > 6:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot upload {len(files)} images. Maximum 6 images per product. Currently have {existing_images_count} images."
        )
    
    uploaded_images = []
    
    try:
        for i, file in enumerate(files):
            # Validate file is an image
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"File {file.filename} must be an image")
            
            # Process the image using image_utils
            filename, relative_path = await process_product_image(file, product_id)
            
            # First image is primary if no existing images, otherwise not primary
            is_primary = existing_images_count == 0 and i == 0
            
            # Create database record
            db_image = models.ProductImage(
                url=f"/{relative_path}",
                is_primary=is_primary,
                product_id=product_id
            )
            
            db.add(db_image)
            uploaded_images.append(db_image)
            existing_images_count += 1
        
        db.commit()
        
        # Refresh all uploaded images
        for image in uploaded_images:
            db.refresh(image)
        
        return uploaded_images
        
    except Exception as e:
        # Rollback the transaction if any error occurs
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload images: {str(e)}")

@app.post("/products/{product_id}/images/single", response_model=schemas.ProductImage)
async def upload_single_product_image(
    product_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a single image for a product"""
    # Get the product and verify ownership
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if db_product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add images to this product")
    
    try:
        # Process the image using image_utils
        filename, relative_path = await process_product_image(file, product_id)
        
        # Check if this is the first image (make it primary)
        existing_images_count = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == product_id
        ).count()
        is_primary = existing_images_count == 0
        
        # Create database record
        db_image = models.ProductImage(
            url=f"/{relative_path}",
            is_primary=is_primary,
            product_id=product_id
        )
        
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        
        return db_image
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@app.delete("/products/{product_id}/images/{image_id}")
def delete_product_image_endpoint(
    product_id: int,
    image_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product image"""
    # Get the product and verify ownership
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if db_product.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete images from this product")
    
    # Get the image
    db_image = db.query(models.ProductImage).filter(
        models.ProductImage.id == image_id,
        models.ProductImage.product_id == product_id
    ).first()
    
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Extract filename from URL for filesystem deletion
    image_url = db_image.url
    if image_url.startswith('/uploads/product_images/'):
        filename = image_url.split('/')[-1]
        # Delete from filesystem
        delete_product_image(filename)
    
    # If this was the primary image, make another image primary
    was_primary = db_image.is_primary
    
    # Delete from database
    db.delete(db_image)
    db.commit()
    
    # If we deleted the primary image, make the first remaining image primary
    if was_primary:
        remaining_image = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == product_id
        ).first()
        
        if remaining_image:
            remaining_image.is_primary = True
            db.commit()
    
    return {"message": "Image deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)