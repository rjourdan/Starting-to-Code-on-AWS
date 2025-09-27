import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys
import io
from PIL import Image
from pathlib import Path

# Add the current directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import get_db
from models import Base, User, Product, Category, ProductImage
import schemas

# Create test database connection
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:postgres@localhost/test_remarketdb"
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
    # Create test database if it doesn't exist
    try:
        # Connect to postgres database to create test database
        postgres_engine = create_engine("postgresql://postgres:postgres@localhost/postgres")
        with postgres_engine.connect() as conn:
            conn.execute(text("COMMIT"))  # End any existing transaction
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
    return TestClient(app)

@pytest.fixture
def test_user_and_token(setup_database, client):
    # Create a test user
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "location": "Test City",
        "password": "testpassword"
    }
    
    # Register user
    response = client.post("/users/", json=user_data)
    assert response.status_code == 200
    
    # Login to get token
    login_data = {
        "username": "testuser",
        "password": "testpassword"
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    return {"user": user_data, "token": token}

@pytest.fixture
def test_category(setup_database):
    db = TestingSessionLocal()
    category = Category(name="Electronics", icon="laptop")
    db.add(category)
    db.commit()
    db.refresh(category)
    db.close()
    return category

@pytest.fixture
def test_product(setup_database, test_user_and_token, test_category, client):
    # Create a test product
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    product_data = {
        "title": "Test Product",
        "description": "A test product",
        "price": 100.0,
        "condition": "New",
        "location": "Test Location",
        "preferred_meetup": "Test Meetup",
        "seller_id": 1,  # This will be overridden by the endpoint
        "category_id": test_category.id
    }
    
    response = client.post("/products/", json=product_data, headers=headers)
    assert response.status_code == 200
    return response.json()

def create_test_image(width=800, height=600, format='JPEG'):
    """Create a test image in memory"""
    image = Image.new('RGB', (width, height), color='red')
    img_bytes = io.BytesIO()
    image.save(img_bytes, format=format)
    img_bytes.seek(0)
    return img_bytes

def test_upload_product_image_success(client, test_user_and_token, test_product):
    """Test successful product image upload"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Create test image
    test_image = create_test_image()
    
    # Upload image
    files = {"file": ("test_image.jpg", test_image, "image/jpeg")}
    response = client.post(f"/products/{test_product['id']}/images", files=files, headers=headers)
    
    assert response.status_code == 200
    image_data = response.json()
    assert "id" in image_data
    assert "url" in image_data
    assert image_data["is_primary"] == True  # First image should be primary
    assert image_data["product_id"] == test_product["id"]
    assert image_data["url"].startswith("/uploads/product_images/")
    assert image_data["url"].endswith(".webp")  # Should be converted to WebP

def test_upload_multiple_product_images(client, test_user_and_token, test_product):
    """Test uploading multiple images to a product"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Upload first image
    test_image1 = create_test_image()
    files1 = {"file": ("test_image1.jpg", test_image1, "image/jpeg")}
    response1 = client.post(f"/products/{test_product['id']}/images", files=files1, headers=headers)
    assert response1.status_code == 200
    image1_data = response1.json()
    assert image1_data["is_primary"] == True
    
    # Upload second image
    test_image2 = create_test_image()
    files2 = {"file": ("test_image2.jpg", test_image2, "image/jpeg")}
    response2 = client.post(f"/products/{test_product['id']}/images", files=files2, headers=headers)
    assert response2.status_code == 200
    image2_data = response2.json()
    assert image2_data["is_primary"] == False  # Second image should not be primary

def test_upload_product_image_not_found(client, test_user_and_token):
    """Test uploading image to non-existent product"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    test_image = create_test_image()
    files = {"file": ("test_image.jpg", test_image, "image/jpeg")}
    response = client.post("/products/999/images", files=files, headers=headers)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

def test_upload_product_image_unauthorized(client, test_product):
    """Test uploading image without authentication"""
    test_image = create_test_image()
    files = {"file": ("test_image.jpg", test_image, "image/jpeg")}
    response = client.post(f"/products/{test_product['id']}/images", files=files)
    
    assert response.status_code == 401

def test_upload_product_image_not_owner(setup_database, client, test_product):
    """Test uploading image by non-owner"""
    # Create another user
    user_data = {
        "username": "otheruser",
        "email": "other@example.com",
        "full_name": "Other User",
        "location": "Other City",
        "password": "otherpassword"
    }
    
    # Register user
    response = client.post("/users/", json=user_data)
    assert response.status_code == 200
    
    # Login to get token
    login_data = {
        "username": "otheruser",
        "password": "otherpassword"
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    other_token = response.json()["access_token"]
    
    # Try to upload image
    headers = {"Authorization": f"Bearer {other_token}"}
    test_image = create_test_image()
    files = {"file": ("test_image.jpg", test_image, "image/jpeg")}
    response = client.post(f"/products/{test_product['id']}/images", files=files, headers=headers)
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to add images to this product"

def test_upload_invalid_file_type(client, test_user_and_token, test_product):
    """Test uploading non-image file"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Create a text file instead of image
    text_content = io.BytesIO(b"This is not an image")
    files = {"file": ("test.txt", text_content, "text/plain")}
    response = client.post(f"/products/{test_product['id']}/images", files=files, headers=headers)
    
    assert response.status_code == 400

def test_delete_product_image_success(client, test_user_and_token, test_product):
    """Test successful product image deletion"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # First upload an image
    test_image = create_test_image()
    files = {"file": ("test_image.jpg", test_image, "image/jpeg")}
    upload_response = client.post(f"/products/{test_product['id']}/images", files=files, headers=headers)
    assert upload_response.status_code == 200
    image_data = upload_response.json()
    
    # Delete the image
    delete_response = client.delete(f"/products/{test_product['id']}/images/{image_data['id']}", headers=headers)
    
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Image deleted successfully"

def test_delete_product_image_primary_reassignment(client, test_user_and_token, test_product):
    """Test that when primary image is deleted, another image becomes primary"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Upload first image (will be primary)
    test_image1 = create_test_image()
    files1 = {"file": ("test_image1.jpg", test_image1, "image/jpeg")}
    response1 = client.post(f"/products/{test_product['id']}/images", files=files1, headers=headers)
    assert response1.status_code == 200
    image1_data = response1.json()
    assert image1_data["is_primary"] == True
    
    # Upload second image (will not be primary)
    test_image2 = create_test_image()
    files2 = {"file": ("test_image2.jpg", test_image2, "image/jpeg")}
    response2 = client.post(f"/products/{test_product['id']}/images", files=files2, headers=headers)
    assert response2.status_code == 200
    image2_data = response2.json()
    assert image2_data["is_primary"] == False
    
    # Delete the primary image
    delete_response = client.delete(f"/products/{test_product['id']}/images/{image1_data['id']}", headers=headers)
    assert delete_response.status_code == 200
    
    # Check that the product still has the second image and it's now primary
    product_response = client.get(f"/products/{test_product['id']}")
    assert product_response.status_code == 200
    product_data = product_response.json()
    assert len(product_data["images"]) == 1
    assert product_data["images"][0]["is_primary"] == True

def test_delete_product_image_not_found(client, test_user_and_token, test_product):
    """Test deleting non-existent image"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    response = client.delete(f"/products/{test_product['id']}/images/999", headers=headers)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Image not found"

def test_delete_product_image_product_not_found(client, test_user_and_token):
    """Test deleting image from non-existent product"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    response = client.delete("/products/999/images/1", headers=headers)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

def test_delete_product_image_unauthorized(client, test_product):
    """Test deleting image without authentication"""
    response = client.delete(f"/products/{test_product['id']}/images/1")
    
    assert response.status_code == 401

def test_delete_product_image_not_owner(setup_database, client, test_product):
    """Test deleting image by non-owner"""
    # Create another user
    user_data = {
        "username": "otheruser2",
        "email": "other2@example.com",
        "full_name": "Other User 2",
        "location": "Other City 2",
        "password": "otherpassword2"
    }
    
    # Register user
    response = client.post("/users/", json=user_data)
    assert response.status_code == 200
    
    # Login to get token
    login_data = {
        "username": "otheruser2",
        "password": "otherpassword2"
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    other_token = response.json()["access_token"]
    
    # Try to delete image
    headers = {"Authorization": f"Bearer {other_token}"}
    response = client.delete(f"/products/{test_product['id']}/images/1", headers=headers)
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete images from this product"