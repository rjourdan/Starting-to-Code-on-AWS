import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from models import Base, Category, User, Product, ProductImage
from database import SQLALCHEMY_DATABASE_URL
from datetime import datetime, timezone

def init_database():
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
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
        
        if count == 0:
            conn.execute(Category.__table__.insert(), categories)
            conn.commit()
            print("Added initial categories")
        
        # Add a test user if no users exist
        result = conn.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        
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
                "rating": 5.0
            }
            result = conn.execute(User.__table__.insert(), test_user)
            user_id = result.inserted_primary_key[0]
            conn.commit()
            print("Added test user (username: testuser, password: password123)")
            
            # Add sample products
            result = conn.execute(text("SELECT COUNT(*) FROM products"))
            count = result.scalar()
            
            if count == 0:
                # Get category IDs
                result = conn.execute(text("SELECT id, name FROM categories"))
                categories_map = {name: id for id, name in result.fetchall()}
                
                # Create sample products
                sample_products = [
                    {
                        "title": "Mountain Bike - Trek",
                        "description": "Trek mountain bike in excellent condition. Only used a few times. Features 21 speeds, front suspension, and disc brakes. Perfect for trails or commuting.",
                        "price": 350.00,
                        "condition": "Like New",
                        "location": "Brooklyn, NY",
                        "preferred_meetup": "Local coffee shop",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Sports"]
                    },
                    {
                        "title": "iPhone 13 Pro - 128GB",
                        "description": "iPhone 13 Pro in great condition. Includes original box, charger, and a case. Battery health at 92%. No scratches or dents.",
                        "price": 650.00,
                        "condition": "Good",
                        "location": "Manhattan, NY",
                        "preferred_meetup": "Apple Store SoHo",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Electronics"]
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
                        "category_id": categories_map["Clothing"]
                    },
                    {
                        "title": "PlayStation 5 with 2 Controllers",
                        "description": "PS5 disc edition with two controllers and 3 games. Everything works perfectly. Selling because I don't have time to play anymore.",
                        "price": 450.00,
                        "condition": "Good",
                        "location": "Bronx, NY",
                        "preferred_meetup": "Target store",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Games"]
                    },
                    {
                        "title": "Coffee Table - Solid Wood",
                        "description": "Beautiful solid wood coffee table. Minor scratches but overall in great condition. Dimensions: 48\" x 24\" x 18\".",
                        "price": 180.00,
                        "condition": "Good",
                        "location": "Brooklyn, NY",
                        "preferred_meetup": "My apartment building lobby",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Home"]
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
                        "category_id": categories_map["Books"]
                    },
                    {
                        "title": "White buffet with marble top",
                        "description": "very beautiful.",
                        "price": 350.00,
                        "condition": "Like New",
                        "location": "San Francisco, CA",
                        "preferred_meetup": "My place, and bring movers!",
                        "created_at": datetime.now(timezone.utc),
                        "is_sold": False,
                        "seller_id": user_id,
                        "category_id": categories_map["Home"]
                    }
                ]
                
                # Insert products using direct SQL queries
                for product in sample_products:
                    query = text("""
                        INSERT INTO products (title, description, price, condition, location, preferred_meetup, created_at, is_sold, seller_id, category_id)
                        VALUES (:title, :description, :price, :condition, :location, :preferred_meetup, :created_at, :is_sold, :seller_id, :category_id)
                        RETURNING id
                    """)
                    
                    result = conn.execute(query, product)
                    product_id = result.scalar()
                    
                    # Add a sample image for each product
                    image_query = text("""
                        INSERT INTO product_images (url, is_primary, product_id)
                        VALUES (:url, :is_primary, :product_id)
                    """)
                    
                    conn.execute(image_query, {
                        "url": "/placeholder.svg",
                        "is_primary": True,
                        "product_id": product_id
                    })
                    
                    print(f"Added product: {product['title']} with ID: {product_id}")
                
                conn.commit()
                print("Added sample products with images")
    
    print("Database initialized successfully")

if __name__ == "__main__":
    init_database()