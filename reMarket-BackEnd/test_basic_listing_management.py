import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app, get_db
from database import Base
from models import User, Product, Category
import json

# Use existing PostgreSQL database
import os
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "remarketdb")

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
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
def client():
    # Ensure tables exist (don't drop existing ones)
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up test data instead of dropping all tables
    db = TestingSessionLocal()
    try:
        # Delete test products and users created during testing
        db.query(Product).filter(Product.title.like("Test%")).delete(synchronize_session=False)
        db.query(Product).filter(Product.title.like("My Test%")).delete(synchronize_session=False)
        db.query(Product).filter(Product.title.like("Original%")).delete(synchronize_session=False)
        db.query(Product).filter(Product.title.like("Updated%")).delete(synchronize_session=False)
        db.query(Product).filter(Product.title.like("Product%")).delete(synchronize_session=False)
        db.query(Product).filter(Product.title.like("Public%")).delete(synchronize_session=False)
        db.query(Product).filter(Product.title.like("Unauthorized%")).delete(synchronize_session=False)
        db.query(User).filter(User.username == "testuser").delete(synchronize_session=False)
        db.query(Category).filter(Category.name == "Electronics").delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Cleanup error: {e}")
    finally:
        db.close()

@pytest.fixture
def test_user(client):
    """Create a test user and return auth token"""
    # Create a test user with unique email for each test
    import time
    unique_id = int(time.time() * 1000) % 10000  # Get last 4 digits of timestamp
    user_data = {
        "username": f"testuser{unique_id}",
        "email": f"test{unique_id}@example.com",
        "password": "testpass123",
        "full_name": "Test User",
        "location": "Test City"
    }
    
    # Register user
    response = client.post("/users/", json=user_data)
    if response.status_code != 200:
        print(f"User creation failed: {response.status_code} - {response.text}")
    assert response.status_code == 200
    
    # Login to get token using form data
    login_data = {
        "username": user_data["username"],
        "password": "testpass123"
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_category(client):
    """Create a test category or get existing one"""
    db = TestingSessionLocal()
    try:
        # Try to get existing category first
        category = db.query(Category).filter(Category.name == "Electronics").first()
        if category is None:
            # Create new category if it doesn't exist
            category = Category(name="Electronics", icon="laptop")
            db.add(category)
            db.commit()
            db.refresh(category)
        return category
    finally:
        db.close()

def test_create_product(client, test_user, test_category):
    """Test basic product creation"""
    product_data = {
        "title": "Test Product",
        "description": "A test product description",
        "price": 99.99,
        "condition": "good",
        "location": "Test City",
        "category_id": test_category.id
    }
    
    response = client.post("/products/", json=product_data, headers=test_user)
    assert response.status_code == 200
    
    data = response.json()
    assert data["title"] == "Test Product"
    assert data["price"] == 99.99
    assert data["is_sold"] == False

def test_get_my_products(client, test_user, test_category):
    """Test getting user's products"""
    # Create a product first
    product_data = {
        "title": "My Test Product",
        "description": "A test product description",
        "price": 149.99,
        "condition": "excellent",
        "location": "Test City",
        "category_id": test_category.id
    }
    
    create_response = client.post("/products/", json=product_data, headers=test_user)
    assert create_response.status_code == 200
    
    # Get user's products
    response = client.get("/products/me", headers=test_user)
    assert response.status_code == 200
    
    products = response.json()
    assert len(products) == 1
    assert products[0]["title"] == "My Test Product"

def test_update_product(client, test_user, test_category):
    """Test updating a product"""
    # Create a product first
    product_data = {
        "title": "Original Title",
        "description": "Original description",
        "price": 99.99,
        "condition": "good",
        "location": "Test City",
        "category_id": test_category.id
    }
    
    create_response = client.post("/products/", json=product_data, headers=test_user)
    product_id = create_response.json()["id"]
    
    # Update the product
    update_data = {
        "title": "Updated Title",
        "price": 149.99
    }
    
    response = client.put(f"/products/{product_id}", json=update_data, headers=test_user)
    assert response.status_code == 200
    
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["price"] == 149.99

def test_delete_product(client, test_user, test_category):
    """Test deleting a product"""
    # Create a product first
    product_data = {
        "title": "Product to Delete",
        "description": "This will be deleted",
        "price": 99.99,
        "condition": "good",
        "location": "Test City",
        "category_id": test_category.id
    }
    
    create_response = client.post("/products/", json=product_data, headers=test_user)
    product_id = create_response.json()["id"]
    
    # Delete the product
    response = client.delete(f"/products/{product_id}", headers=test_user)
    assert response.status_code == 200
    
    # Verify it's deleted
    get_response = client.get(f"/products/{product_id}")
    assert get_response.status_code == 404

def test_toggle_sold_status(client, test_user, test_category):
    """Test marking product as sold/available"""
    # Create a product first
    product_data = {
        "title": "Product for Sale",
        "description": "This will be marked as sold",
        "price": 99.99,
        "condition": "good",
        "location": "Test City",
        "category_id": test_category.id
    }
    
    create_response = client.post("/products/", json=product_data, headers=test_user)
    product_id = create_response.json()["id"]
    
    # Mark as sold
    response = client.patch(f"/products/{product_id}/sold", 
                          json={"is_sold": True}, 
                          headers=test_user)
    assert response.status_code == 200
    
    data = response.json()
    assert data["is_sold"] == True
    
    # Mark as available again
    response = client.patch(f"/products/{product_id}/sold", 
                          json={"is_sold": False}, 
                          headers=test_user)
    assert response.status_code == 200
    
    data = response.json()
    assert data["is_sold"] == False

def test_unauthorized_access(client, test_category):
    """Test that unauthorized users cannot access protected endpoints"""
    # Try to create product without auth
    product_data = {
        "title": "Unauthorized Product",
        "description": "This should fail",
        "price": 99.99,
        "condition": "good",
        "location": "Test City",
        "category_id": test_category.id
    }
    
    response = client.post("/products/", json=product_data)
    assert response.status_code == 401

def test_get_public_products(client, test_user, test_category):
    """Test that public can view products"""
    # Create a product first
    product_data = {
        "title": "Public Product",
        "description": "This should be visible to everyone",
        "price": 99.99,
        "condition": "good",
        "location": "Test City",
        "category_id": test_category.id
    }
    
    create_response = client.post("/products/", json=product_data, headers=test_user)
    assert create_response.status_code == 200
    
    # Get products without auth (public access)
    response = client.get("/products/")
    assert response.status_code == 200
    
    products = response.json()
    assert len(products) >= 1
    assert any(p["title"] == "Public Product" for p in products)