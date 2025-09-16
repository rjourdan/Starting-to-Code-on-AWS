import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def check_database():
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # Create a connection
    with engine.connect() as conn:
        print("Connected to database successfully!")
        
        # Check users
        result = conn.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.scalar()
        print(f"Users in database: {user_count}")
        
        if user_count > 0:
            result = conn.execute(text("SELECT id, username, email FROM users"))
            users = result.fetchall()
            for user in users:
                print(f"User ID: {user[0]}, Username: {user[1]}, Email: {user[2]}")
        
        # Check categories
        result = conn.execute(text("SELECT COUNT(*) FROM categories"))
        category_count = result.scalar()
        print(f"Categories in database: {category_count}")
        
        if category_count > 0:
            result = conn.execute(text("SELECT id, name FROM categories"))
            categories = result.fetchall()
            for category in categories:
                print(f"Category ID: {category[0]}, Name: {category[1]}")
        
        # Check products
        result = conn.execute(text("SELECT COUNT(*) FROM products"))
        product_count = result.scalar()
        print(f"Products in database: {product_count}")
        
        if product_count > 0:
            result = conn.execute(text("SELECT id, title, category_id, seller_id, is_sold, condition FROM products"))
            products = result.fetchall()
            for product in products:
                print(f"Product ID: {product[0]}, Title: {product[1]}, Category ID: {product[2]}, Seller ID: {product[3]}, Sold: {product[4]}, Condition: {product[5]}")
            
            # Check if any products are marked as sold
            result = conn.execute(text("SELECT COUNT(*) FROM products WHERE is_sold = true"))
            sold_count = result.scalar()
            print(f"Products marked as sold: {sold_count}")
            
            # Check if any products are marked as not sold
            result = conn.execute(text("SELECT COUNT(*) FROM products WHERE is_sold = false"))
            not_sold_count = result.scalar()
            print(f"Products marked as not sold: {not_sold_count}")
        
        # Check product images
        result = conn.execute(text("SELECT COUNT(*) FROM product_images"))
        image_count = result.scalar()
        print(f"Product images in database: {image_count}")

if __name__ == "__main__":
    check_database()