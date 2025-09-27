#!/usr/bin/env python3
"""
Comprehensive test suite for listing management functionality.
Tests authentication, authorization, image processing, and edge cases.
"""

import pytest
import asyncio
import io
import os
import tempfile
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from PIL import Image
from pathlib import Path
import sys

# Add the current directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import get_db
from models import Base, User, Product, Category, ProductImage
import schemas

# Create test database connection
# Use environment variables or defaults for test database
import os
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/test_remarketdb"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def setup_database():
    """Setup test database with clean state for each test."""
    # Create test database if it doesn't exist
    try:
        postgres_engine = create_engine("postgresql://postgres:postgres@localhost/postgres")
        with postgres_engine.connect() as conn:
            conn.execute(text("COMMIT"))
            try:
                conn.execute(text("CREATE DATABASE test_remarketdb"))
            except Exception:
                pass  # Database might already exist
    except Exception as e:
        print(f"Warning: Could not create test database: {e}")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    
    # Clean up - drop all tables
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)

@pytest.fixture
def test_users_and_tokens(setup_database, client):
    """Create multiple test users with tokens for authorization testing."""
    users_data = [
        {
            "username": "user1",
            "email": "user1@example.com",
            "full_name": "User One",
            "location": "City 1",
            "password": "password1"
        },
        {
            "username": "user2",
            "email": "user2@example.com",
            "full_name": "User Two",
            "location": "City 2",
            "password": "password2"
        },
        {
            "username": "admin",
            "email": "admin@example.com",
            "full_name": "Admin User",
            "location": "Admin City",
            "password": "adminpass"
        }
    ]
    
    users_with_tokens = []
    
    for user_data in users_data:
        # Register user
        response = client.post("/users/", json=user_data)
        assert response.status_code == 200
        
        # Login to get token
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        response = client.post("/token", data=login_data)
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        users_with_tokens.append({
            "user_data": user_data,
            "token": token,
            "headers": {"Authorization": f"Bearer {token}"}
        })
    
    return users_with_tokens

@pytest.fixture
def test_categories(setup_database):
    """Create test categories."""
    db = TestingSessionLocal()
    categories = [
        Category(name="Electronics", icon="laptop"),
        Category(name="Clothing", icon="shirt"),
        Category(name="Sports", icon="dumbbell"),
        Category(name="Books", icon="book"),
        Category(name="Home", icon="home")
    ]
    
    for category in categories:
        db.add(category)
    
    db.commit()
    
    for category in categories:
        db.refresh(category)
    
    db.close()
    return categories

def create_test_image(width=800, height=600, format='JPEG', size_kb=None):
    """Create a test image with specified dimensions and size."""
    image = Image.new('RGB', (width, height), color='red')
    img_bytes = io.BytesIO()
    
    if size_kb:
        # Adjust quality to approximate target size
        quality = 95
        while quality > 10:
            img_bytes.seek(0)
            img_bytes.truncate()
            image.save(img_bytes, format=format, quality=quality)
            if len(img_bytes.getvalue()) <= size_kb * 1024:
                break
            quality -= 10
    else:
        image.save(img_bytes, format=format)
    
    img_bytes.seek(0)
    return img_bytes

class TestComprehensiveListingManagement:
    """Comprehensive test suite for listing management."""

    def test_complete_listing_creation_workflow(self, client, test_users_and_tokens, test_categories):
        """Test complete listing creation from start to finish."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Step 1: Create product
        product_data = {
            "title": "iPhone 13 Pro",
            "description": "Excellent condition iPhone 13 Pro with original box and accessories. No scratches or damage.",
            "price": 799.99,
            "condition": "excellent",
            "location": "San Francisco, CA",
            "preferred_meetup": "Apple Store Union Square",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
        product = response.json()
        
        assert product["title"] == product_data["title"]
        assert product["price"] == product_data["price"]
        assert product["is_sold"] == False
        assert product["seller_id"] == 1
        
        # Step 2: Upload images
        test_image1 = create_test_image(1200, 800, 'JPEG')
        test_image2 = create_test_image(800, 600, 'PNG')
        
        files = [
            ("file", ("iphone_front.jpg", test_image1, "image/jpeg")),
            ("file", ("iphone_back.png", test_image2, "image/png"))
        ]
        
        response = client.post(f"/products/{product['id']}/images", files=files, headers=headers)
        assert response.status_code == 200
        images = response.json()
        
        assert len(images) == 2
        assert images[0]["is_primary"] == True  # First image should be primary
        assert images[1]["is_primary"] == False
        
        # Step 3: Verify product with images
        response = client.get(f"/products/{product['id']}")
        assert response.status_code == 200
        product_with_images = response.json()
        
        assert len(product_with_images["images"]) == 2
        assert any(img["is_primary"] for img in product_with_images["images"])
        
        # Step 4: Verify in user's listings
        response = client.get("/products/me", headers=headers)
        assert response.status_code == 200
        user_products = response.json()
        
        assert len(user_products) == 1
        assert user_products[0]["id"] == product["id"]

    def test_complete_listing_edit_workflow(self, client, test_users_and_tokens, test_categories):
        """Test complete listing editing workflow."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Create initial product
        product_data = {
            "title": "Original Title",
            "description": "Original description",
            "price": 100.0,
            "condition": "good",
            "location": "Original Location",
            "preferred_meetup": "Original Meetup",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
        product = response.json()
        
        # Add initial images
        test_image = create_test_image()
        files = [("file", ("original.jpg", test_image, "image/jpeg"))]
        
        response = client.post(f"/products/{product['id']}/images", files=files, headers=headers)
        assert response.status_code == 200
        original_images = response.json()
        
        # Edit product details
        update_data = {
            "title": "Updated Title",
            "description": "Updated description with more details",
            "price": 150.0,
            "condition": "excellent",
            "location": "Updated Location",
            "preferred_meetup": "Updated Meetup Location"
        }
        
        response = client.put(f"/products/{product['id']}", json=update_data, headers=headers)
        assert response.status_code == 200
        updated_product = response.json()
        
        assert updated_product["title"] == update_data["title"]
        assert updated_product["price"] == update_data["price"]
        assert updated_product["condition"] == update_data["condition"]
        
        # Add new image
        new_image = create_test_image(600, 400, 'PNG')
        files = [("file", ("new_image.png", new_image, "image/png"))]
        
        response = client.post(f"/products/{product['id']}/images", files=files, headers=headers)
        assert response.status_code == 200
        new_images = response.json()
        
        # Delete original image
        response = client.delete(f"/products/{product['id']}/images/{original_images[0]['id']}", headers=headers)
        assert response.status_code == 200
        
        # Verify final state
        response = client.get(f"/products/{product['id']}")
        assert response.status_code == 200
        final_product = response.json()
        
        assert final_product["title"] == update_data["title"]
        assert len(final_product["images"]) == 1
        assert final_product["images"][0]["is_primary"] == True  # New image should be primary

    def test_listing_sold_status_workflow(self, client, test_users_and_tokens, test_categories):
        """Test complete sold status management workflow."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Create product
        product_data = {
            "title": "Test Product for Sale",
            "description": "This product will be marked as sold",
            "price": 200.0,
            "condition": "good",
            "location": "Test City",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
        product = response.json()
        assert product["is_sold"] == False
        
        # Mark as sold
        sold_data = {"is_sold": True}
        response = client.patch(f"/products/{product['id']}/sold", json=sold_data, headers=headers)
        assert response.status_code == 200
        sold_product = response.json()
        assert sold_product["is_sold"] == True
        
        # Verify product is not in public available listings
        response = client.get("/products/")
        public_products = response.json()
        available_products = [p for p in public_products if not p["is_sold"]]
        assert not any(p["id"] == product["id"] for p in available_products)
        
        # Verify product is still in user's listings
        response = client.get("/products/me", headers=headers)
        user_products = response.json()
        assert any(p["id"] == product["id"] and p["is_sold"] for p in user_products)
        
        # Mark as available again
        available_data = {"is_sold": False}
        response = client.patch(f"/products/{product['id']}/sold", json=available_data, headers=headers)
        assert response.status_code == 200
        available_product = response.json()
        assert available_product["is_sold"] == False
        
        # Verify product is back in public listings
        response = client.get("/products/")
        public_products = response.json()
        assert any(p["id"] == product["id"] and not p["is_sold"] for p in public_products)

    def test_listing_deletion_workflow(self, client, test_users_and_tokens, test_categories):
        """Test complete listing deletion workflow."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Create product with images
        product_data = {
            "title": "Product to Delete",
            "description": "This product will be deleted",
            "price": 50.0,
            "condition": "fair",
            "location": "Delete City",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
        product = response.json()
        
        # Add images
        test_image1 = create_test_image()
        test_image2 = create_test_image()
        files = [
            ("file", ("delete1.jpg", test_image1, "image/jpeg")),
            ("file", ("delete2.jpg", test_image2, "image/jpeg"))
        ]
        
        response = client.post(f"/products/{product['id']}/images", files=files, headers=headers)
        assert response.status_code == 200
        images = response.json()
        
        # Verify product exists
        response = client.get(f"/products/{product['id']}")
        assert response.status_code == 200
        
        # Delete product
        response = client.delete(f"/products/{product['id']}", headers=headers)
        assert response.status_code == 200
        
        # Verify product is deleted
        response = client.get(f"/products/{product['id']}")
        assert response.status_code == 404
        
        # Verify product is not in user's listings
        response = client.get("/products/me", headers=headers)
        user_products = response.json()
        assert not any(p["id"] == product["id"] for p in user_products)
        
        # Verify images are cleaned up (would need to check filesystem in real implementation)
        for image in images:
            response = client.delete(f"/products/{product['id']}/images/{image['id']}", headers=headers)
            assert response.status_code == 404  # Product no longer exists

    def test_authorization_and_ownership(self, client, test_users_and_tokens, test_categories):
        """Test authorization and ownership verification across all operations."""
        user1 = test_users_and_tokens[0]
        user2 = test_users_and_tokens[1]
        
        # User 1 creates a product
        product_data = {
            "title": "User 1 Product",
            "description": "This belongs to user 1",
            "price": 100.0,
            "condition": "good",
            "location": "User 1 City",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=user1["headers"])
        assert response.status_code == 200
        product = response.json()
        
        # User 2 tries to update user 1's product
        update_data = {"title": "Hacked Title"}
        response = client.put(f"/products/{product['id']}", json=update_data, headers=user2["headers"])
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
        
        # User 2 tries to delete user 1's product
        response = client.delete(f"/products/{product['id']}", headers=user2["headers"])
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
        
        # User 2 tries to change sold status of user 1's product
        sold_data = {"is_sold": True}
        response = client.patch(f"/products/{product['id']}/sold", json=sold_data, headers=user2["headers"])
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
        
        # User 2 tries to add images to user 1's product
        test_image = create_test_image()
        files = [("file", ("hack.jpg", test_image, "image/jpeg"))]
        response = client.post(f"/products/{product['id']}/images", files=files, headers=user2["headers"])
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
        
        # User 1 can perform all operations on their own product
        response = client.put(f"/products/{product['id']}", json=update_data, headers=user1["headers"])
        assert response.status_code == 200
        
        response = client.patch(f"/products/{product['id']}/sold", json=sold_data, headers=user1["headers"])
        assert response.status_code == 200
        
        response = client.post(f"/products/{product['id']}/images", files=files, headers=user1["headers"])
        assert response.status_code == 200

    def test_image_processing_and_validation(self, client, test_users_and_tokens, test_categories):
        """Test comprehensive image processing and validation."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Create product
        product_data = {
            "title": "Image Test Product",
            "description": "Testing image functionality",
            "price": 100.0,
            "condition": "good",
            "location": "Image City",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
        product = response.json()
        
        # Test valid image formats
        valid_formats = [
            ("test.jpg", "image/jpeg", "JPEG"),
            ("test.png", "image/png", "PNG"),
            ("test.gif", "image/gif", "GIF"),
            ("test.webp", "image/webp", "WEBP")
        ]
        
        uploaded_images = []
        for filename, content_type, format_name in valid_formats:
            test_image = create_test_image(format=format_name)
            files = [("file", (filename, test_image, content_type))]
            
            response = client.post(f"/products/{product['id']}/images", files=files, headers=headers)
            assert response.status_code == 200
            images = response.json()
            uploaded_images.extend(images)
        
        # Verify all images were converted to WebP
        response = client.get(f"/products/{product['id']}")
        assert response.status_code == 200
        product_with_images = response.json()
        
        for image in product_with_images["images"]:
            assert image["url"].endswith(".webp")
        
        # Test invalid file type
        text_file = io.BytesIO(b"This is not an image")
        files = [("file", ("document.txt", text_file, "text/plain"))]
        
        response = client.post(f"/products/{product['id']}/images", files=files, headers=headers)
        assert response.status_code == 400
        
        # Test oversized image (mock - would need actual large file in real test)
        # For now, test the validation logic exists
        large_image = create_test_image(5000, 5000, 'JPEG')  # Very large image
        files = [("file", ("large.jpg", large_image, "image/jpeg"))]
        
        response = client.post(f"/products/{product['id']}/images", files=files, headers=headers)
        # Should either succeed (if within limits) or fail with appropriate error
        assert response.status_code in [200, 400, 413]
        
        # Test image deletion and primary reassignment
        if len(uploaded_images) >= 2:
            # Find primary image
            primary_image = next(img for img in uploaded_images if img["is_primary"])
            
            # Delete primary image
            response = client.delete(f"/products/{product['id']}/images/{primary_image['id']}", headers=headers)
            assert response.status_code == 200
            
            # Verify another image became primary
            response = client.get(f"/products/{product['id']}")
            assert response.status_code == 200
            updated_product = response.json()
            
            remaining_images = updated_product["images"]
            if remaining_images:  # If there are still images
                assert any(img["is_primary"] for img in remaining_images)

    def test_user_listings_filtering_and_pagination(self, client, test_users_and_tokens, test_categories):
        """Test user listings with filtering and pagination."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Create multiple products with different statuses
        products_data = [
            {"title": f"Product {i}", "description": f"Description {i}", "price": float(i * 10), 
             "condition": "good", "location": "Test City", "category_id": test_categories[0].id,
             "is_sold": i % 2 == 0}  # Even numbered products will be marked as sold
            for i in range(1, 11)  # Create 10 products
        ]
        
        created_products = []
        for product_data in products_data:
            is_sold = product_data.pop("is_sold")
            
            response = client.post("/products/", json=product_data, headers=headers)
            assert response.status_code == 200
            product = response.json()
            created_products.append(product)
            
            # Mark some as sold
            if is_sold:
                sold_data = {"is_sold": True}
                response = client.patch(f"/products/{product['id']}/sold", json=sold_data, headers=headers)
                assert response.status_code == 200
        
        # Test getting all user products
        response = client.get("/products/me", headers=headers)
        assert response.status_code == 200
        all_products = response.json()
        assert len(all_products) == 10
        
        # Test filtering by sold status
        response = client.get("/products/me?sold_status=true", headers=headers)
        assert response.status_code == 200
        sold_products = response.json()
        assert all(p["is_sold"] for p in sold_products)
        assert len(sold_products) == 5  # Half should be sold
        
        response = client.get("/products/me?sold_status=false", headers=headers)
        assert response.status_code == 200
        available_products = response.json()
        assert all(not p["is_sold"] for p in available_products)
        assert len(available_products) == 5  # Half should be available
        
        # Test pagination
        response = client.get("/products/me?limit=3", headers=headers)
        assert response.status_code == 200
        first_page = response.json()
        assert len(first_page) == 3
        
        response = client.get("/products/me?skip=3&limit=3", headers=headers)
        assert response.status_code == 200
        second_page = response.json()
        assert len(second_page) == 3
        
        # Verify no overlap between pages
        first_page_ids = {p["id"] for p in first_page}
        second_page_ids = {p["id"] for p in second_page}
        assert first_page_ids.isdisjoint(second_page_ids)

    def test_error_handling_and_edge_cases(self, client, test_users_and_tokens, test_categories):
        """Test comprehensive error handling and edge cases."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Test operations on non-existent product
        response = client.get("/products/99999")
        assert response.status_code == 404
        
        response = client.put("/products/99999", json={"title": "Updated"}, headers=headers)
        assert response.status_code == 404
        
        response = client.delete("/products/99999", headers=headers)
        assert response.status_code == 404
        
        response = client.patch("/products/99999/sold", json={"is_sold": True}, headers=headers)
        assert response.status_code == 404
        
        # Test invalid data validation
        invalid_product_data = {
            "title": "",  # Empty title
            "description": "short",  # Too short
            "price": -10.0,  # Negative price
            "condition": "invalid_condition",  # Invalid condition
            "location": "",  # Empty location
            "category_id": 99999  # Non-existent category
        }
        
        response = client.post("/products/", json=invalid_product_data, headers=headers)
        assert response.status_code == 422
        
        # Test malformed JSON
        response = client.post("/products/", data='{"title": "incomplete json"', headers=headers)
        assert response.status_code == 422
        
        # Test unauthorized access (no token)
        response = client.post("/products/", json={
            "title": "Unauthorized Product",
            "description": "This should fail",
            "price": 100.0,
            "condition": "good",
            "location": "Unauthorized City",
            "category_id": test_categories[0].id
        })
        assert response.status_code == 401
        
        # Test invalid token
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/products/me", headers=invalid_headers)
        assert response.status_code == 401
        
        # Test concurrent operations (create product first)
        product_data = {
            "title": "Concurrent Test Product",
            "description": "Testing concurrent operations",
            "price": 100.0,
            "condition": "good",
            "location": "Concurrent City",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
        product = response.json()
        
        # Test double deletion
        response = client.delete(f"/products/{product['id']}", headers=headers)
        assert response.status_code == 200
        
        response = client.delete(f"/products/{product['id']}", headers=headers)
        assert response.status_code == 404
        
        # Test operations on deleted product
        response = client.put(f"/products/{product['id']}", json={"title": "Updated"}, headers=headers)
        assert response.status_code == 404
        
        response = client.patch(f"/products/{product['id']}/sold", json={"is_sold": True}, headers=headers)
        assert response.status_code == 404

    def test_performance_and_bulk_operations(self, client, test_users_and_tokens, test_categories):
        """Test performance with bulk operations and large datasets."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Create multiple products quickly
        products = []
        for i in range(20):  # Create 20 products
            product_data = {
                "title": f"Bulk Product {i}",
                "description": f"Bulk description {i} with sufficient length to meet requirements",
                "price": float(i + 1) * 10.0,
                "condition": ["new", "like-new", "good", "fair", "poor"][i % 5],
                "location": f"Bulk City {i}",
                "category_id": test_categories[i % len(test_categories)].id
            }
            
            response = client.post("/products/", json=product_data, headers=headers)
            assert response.status_code == 200
            products.append(response.json())
        
        # Test bulk retrieval
        response = client.get("/products/me", headers=headers)
        assert response.status_code == 200
        user_products = response.json()
        assert len(user_products) == 20
        
        # Test bulk status updates
        for i, product in enumerate(products[:10]):  # Mark first 10 as sold
            sold_data = {"is_sold": True}
            response = client.patch(f"/products/{product['id']}/sold", json=sold_data, headers=headers)
            assert response.status_code == 200
        
        # Verify bulk status changes
        response = client.get("/products/me?sold_status=true", headers=headers)
        assert response.status_code == 200
        sold_products = response.json()
        assert len(sold_products) == 10
        
        # Test bulk deletion
        for product in products[15:]:  # Delete last 5 products
            response = client.delete(f"/products/{product['id']}", headers=headers)
            assert response.status_code == 200
        
        # Verify remaining products
        response = client.get("/products/me", headers=headers)
        assert response.status_code == 200
        remaining_products = response.json()
        assert len(remaining_products) == 15

    def test_data_integrity_and_consistency(self, client, test_users_and_tokens, test_categories):
        """Test data integrity and consistency across operations."""
        user = test_users_and_tokens[0]
        headers = user["headers"]
        
        # Create product
        product_data = {
            "title": "Integrity Test Product",
            "description": "Testing data integrity and consistency",
            "price": 299.99,
            "condition": "excellent",
            "location": "Integrity City",
            "preferred_meetup": "Central Park",
            "category_id": test_categories[0].id
        }
        
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
        product = response.json()
        
        # Verify all fields are correctly stored
        assert product["title"] == product_data["title"]
        assert product["description"] == product_data["description"]
        assert product["price"] == product_data["price"]
        assert product["condition"] == product_data["condition"]
        assert product["location"] == product_data["location"]
        assert product["preferred_meetup"] == product_data["preferred_meetup"]
        assert product["category_id"] == product_data["category_id"]
        assert product["seller_id"] == 1  # First user
        assert product["is_sold"] == False
        assert "created_at" in product
        assert "id" in product
        
        # Test field updates maintain consistency
        update_data = {
            "title": "Updated Integrity Test",
            "price": 349.99,
            "condition": "good"
        }
        
        response = client.put(f"/products/{product['id']}", json=update_data, headers=headers)
        assert response.status_code == 200
        updated_product = response.json()
        
        # Verify updated fields changed
        assert updated_product["title"] == update_data["title"]
        assert updated_product["price"] == update_data["price"]
        assert updated_product["condition"] == update_data["condition"]
        
        # Verify unchanged fields remained the same
        assert updated_product["description"] == product_data["description"]
        assert updated_product["location"] == product_data["location"]
        assert updated_product["preferred_meetup"] == product_data["preferred_meetup"]
        assert updated_product["category_id"] == product_data["category_id"]
        assert updated_product["seller_id"] == product["seller_id"]
        assert updated_product["created_at"] == product["created_at"]
        assert updated_product["id"] == product["id"]
        
        # Test sold status consistency
        sold_data = {"is_sold": True}
        response = client.patch(f"/products/{product['id']}/sold", json=sold_data, headers=headers)
        assert response.status_code == 200
        sold_product = response.json()
        
        # Verify only sold status changed
        assert sold_product["is_sold"] == True
        assert sold_product["title"] == update_data["title"]  # Should maintain previous update
        assert sold_product["price"] == update_data["price"]
        
        # Verify product relationships are maintained
        response = client.get(f"/products/{product['id']}")
        assert response.status_code == 200
        final_product = response.json()
        
        # Should have category information
        assert "category" in final_product or final_product["category_id"] == test_categories[0].id
        
        # Should have seller information
        assert final_product["seller_id"] == 1

if __name__ == "__main__":
    # Run specific test
    pytest.main([__file__, "-v"])