import sys
import os
from pathlib import Path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from models import Base, Category, User, Product, ProductImage
from database import SQLALCHEMY_DATABASE_URL
from datetime import datetime, timezone
from image_utils import setup_image_directories, PRODUCT_IMAGES_DIR
from PIL import Image
import shutil

def process_and_copy_photo(photo_filename: str, product_id: int) -> str:
    """
    Process a photo from the photos folder and copy it to the uploads directory.
    
    Args:
        photo_filename: Name of the photo file in the photos folder
        product_id: ID of the product this image belongs to
        
    Returns:
        Relative path for the processed image
    """
    # Setup image directories
    setup_image_directories()
    
    # Source photo path
    photos_dir = Path(__file__).parent / "photos"
    source_path = photos_dir / photo_filename
    
    if not source_path.exists():
        print(f"Warning: Photo {photo_filename} not found")
        return "/placeholder.svg"
    
    # Generate unique filename for the product
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    new_filename = f"product_{product_id}_{unique_id}.webp"
    
    # Destination path
    dest_path = PRODUCT_IMAGES_DIR / new_filename
    
    try:
        # Copy the file to the uploads directory
        shutil.copy2(source_path, dest_path)
        print(f"Copied {photo_filename} to {new_filename}")
        
        # Return URL path that the frontend can use
        return f"/uploads/product_images/{new_filename}"
        
    except Exception as e:
        print(f"Error processing photo {photo_filename}: {e}")
        return "/placeholder.svg"

def init_database():
    print("Starting database initialization...")
    print(f"Database URL: {SQLALCHEMY_DATABASE_URL}")
    
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created/verified")
    
    # Create a connection
    with engine.connect() as conn:
        # Add initial categories
        categories = [
            {"name": "Sports", "icon": "dumbbell"},
            {"name": "Clothing", "icon": "shirt"},
            {"name": "Electronics", "icon": "smartphone"},
            {"name": "Games", "icon": "gamepad-2"},
            {"name": "Books", "icon": "book-open"},
            {"name": "Home", "icon": "sofa"}
        ]
        
        # Check if categories already exist
        result = conn.execute(text("SELECT COUNT(*) FROM categories"))
        count = result.scalar()
        print(f"Found {count} existing categories")
        
        if count == 0:
            conn.execute(Category.__table__.insert(), categories)
            conn.commit()
            print("Added initial categories")
        
        # Add a test user if no users exist
        result = conn.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        print(f"Found {count} existing users")
        
        if count == 0:
            # Create test user
            from passlib.hash import bcrypt
            test_user = {
                "username": "testuser",
                "email": "test@example.com",
                "hashed_password": bcrypt.hash("password123"),
                "full_name": "Test User",
                "location": "Test City",
                "member_since": datetime.now(timezone.utc),
                "rating": 5.0,
                "profile_image": None
            }
            result = conn.execute(User.__table__.insert(), test_user)
            user_id = result.inserted_primary_key[0]
            conn.commit()
            print("Added test user (username: testuser, password: password123)")
            
            # Add sample products
            result = conn.execute(text("SELECT COUNT(*) FROM products"))
            count = result.scalar()
            print(f"Found {count} existing products")
            
            if count == 0:
                # Get category IDs
                result = conn.execute(text("SELECT id, name FROM categories"))
                categories_map = {name: id for id, name in result.fetchall()}       
         
                # Create sample products with their corresponding photos
                sample_products = [
                    {
                        "title": "Mountain Bike - Scott",
                        "description": "scott mountain bike in excellent condition. Only used a few times. Features 27 speeds, front suspension, and disc brakes. Perfect for trails or commuting.",
                        "price": 350.00,
                        "condition": "Like New",
                        "location": "Brooklyn, NY",
                        "preferred_meetup": "Local coffee shop",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Sports"],
                        "photos": ["bike.webp"]
                    },
                    {
                        "title": "iPhone 13 Pro - 256GB",
                        "description": "iPhone 13 Pro in great condition. Includes original box, charger, and a case. Battery health at 92%. No scratches or dents.",
                        "price": 300.00,
                        "condition": "Good",
                        "location": "Manhattan, NY",
                        "preferred_meetup": "Apple Store SoHo",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Electronics"],
                        "photos": ["iphone1.webp", "iphone2.webp"]
                    },
                    {
                        "title": "Designer Jacket - Medium",
                        "description": "Stylish designer jacket, size medium. Worn only a few times. Perfect for fall weather. Water resistant and very comfortable.",
                        "price": 120.00,
                        "condition": "Like New",
                        "location": "Queens, NY",
                        "preferred_meetup": "Queens Center Mall",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Clothing"],
                        "photos": []
                    },
                    {
                        "title": "PlayStation 4 with 2 Controllers",
                        "description": "PS4 disc edition with two controllers and 3 games. Everything works perfectly. Selling because I don't have time to play anymore.",
                        "price": 450.00,
                        "condition": "Good",
                        "location": "Bronx, NY",
                        "preferred_meetup": "Target store",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Games"],
                        "photos": ["ps4_1.webp", "ps4_2.webp", "ps4_3.webp", "ps4_4.webp"]
                    },
                    {
                        "title": "Coffee Table",
                        "description": "Beautiful wood coffee table. round  white top 3 wood legs 34\". Minor scratches but overall in great condition.",
                        "price": 180.00,
                        "condition": "Good",
                        "location": "Brooklyn, NY",
                        "preferred_meetup": "My apartment building lobby",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Home"],
                        "photos": ["coffee-table.webp"]
                    },
                    {
                        "title": "Book Collection - Fantasy Novels",
                        "description": "Collection of 12 fantasy novels including complete sets of popular series. All books in good condition with no markings.",
                        "price": 75.00,
                        "condition": "Good",
                        "location": "Manhattan, NY",
                        "preferred_meetup": "Barnes & Noble Union Square",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Books"],
                        "photos": ["books.webp"]
                    },
                    {
                        "title": "White buffet with marble top",
                        "description": "very beautiful.",
                        "price": 450.00,
                        "condition": "Like New",
                        "location": "San Francisco, CA",
                        "preferred_meetup": "My place, and bring movers!",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Home"],
                        "photos": ["buffet.webp"]
                    },
                    {
                        "title": "Dining table and chairs",
                        "description": "Large dining table, with 4 chairs, 2 arm chairs, very beautiful.",
                        "price": 550.00,
                        "condition": "Like New",
                        "location": "San Francisco, CA",
                        "preferred_meetup": "My place, and bring movers!",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Home"],
                        "photos": ["table.webp"]
                    },
                    {
                        "title": "Queen Size Bed Frame",
                        "description": "Modern queen size bed frame in excellent condition. Sturdy wooden construction with a sleek design. Easy to assemble and disassemble for moving.",
                        "price": 200.00,
                        "condition": "Good",
                        "location": "Brooklyn, NY",
                        "preferred_meetup": "My apartment building",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Home"],
                        "photos": ["bed.webp"]
                    }
                ]      
          
                # Insert products using direct SQL queries
                for product in sample_products:
                    # Extract photos list before inserting product
                    photos = product.pop("photos", [])
                    
                    query = text("""
                        INSERT INTO products (title, description, price, condition, location, preferred_meetup, created_at, is_sold, seller_id, category_id)
                        VALUES (:title, :description, :price, :condition, :location, :preferred_meetup, :created_at, :is_sold, :seller_id, :category_id)
                        RETURNING id
                    """)
                    
                    result = conn.execute(query, product)
                    product_id = result.scalar()
                    
                    # Process and add photos for this product
                    image_query = text("""
                        INSERT INTO product_images (url, is_primary, product_id)
                        VALUES (:url, :is_primary, :product_id)
                    """)
                    
                    if photos:
                        # Add actual photos
                        for i, photo_filename in enumerate(photos):
                            image_url = process_and_copy_photo(photo_filename, product_id)
                            conn.execute(image_query, {
                                "url": image_url,
                                "is_primary": i == 0,  # First photo is primary
                                "product_id": product_id
                            })
                    else:
                        # Add placeholder if no photos
                        conn.execute(image_query, {
                            "url": "/placeholder.svg",
                            "is_primary": True,
                            "product_id": product_id
                        })
                    
                    print(f"Added product: {product['title']} with ID: {product_id} and {len(photos)} photos")
                
                conn.commit()
                print("Added sample products with images")
    
    print("Database initialized successfully")

if __name__ == "__main__":
    init_database()