import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add the current directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import get_db
from models import Base, User, Product, Category
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

def test_update_product_success(client, test_user_and_token, test_product):
    """Test successful product update by owner"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {
        "title": "Updated Product Title",
        "price": 150.0,
        "description": "Updated description"
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    assert response.status_code == 200
    updated_product = response.json()
    assert updated_product["title"] == "Updated Product Title"
    assert updated_product["price"] == 150.0
    assert updated_product["description"] == "Updated description"
    # Unchanged fields should remain the same
    assert updated_product["condition"] == "New"
    assert updated_product["location"] == "Test Location"

def test_update_product_partial(client, test_user_and_token, test_product):
    """Test partial product update (only some fields)"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {
        "price": 200.0
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    assert response.status_code == 200
    updated_product = response.json()
    assert updated_product["price"] == 200.0
    # Other fields should remain unchanged
    assert updated_product["title"] == "Test Product"
    assert updated_product["description"] == "A test product"

def test_update_product_not_found(client, test_user_and_token):
    """Test updating non-existent product"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {"title": "Updated Title"}
    
    response = client.put("/products/999", json=update_data, headers=headers)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

def test_update_product_unauthorized(client, test_product):
    """Test updating product without authentication"""
    update_data = {"title": "Updated Title"}
    
    response = client.put(f"/products/{test_product['id']}", json=update_data)
    
    assert response.status_code == 401

def test_update_product_not_owner(setup_database, client, test_product):
    """Test updating product by non-owner"""
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
    
    # Try to update the product
    headers = {"Authorization": f"Bearer {other_token}"}
    update_data = {"title": "Hacked Title"}
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to update this product"

def test_update_product_invalid_data(client, test_user_and_token, test_product):
    """Test updating product with invalid data"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {
        "price": "invalid_price"  # Should be a number
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    assert response.status_code == 422  # Validation error

# Tests for product deletion
def test_delete_product_success(client, test_user_and_token, test_product):
    """Test successful product deletion by owner"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    response = client.delete(f"/products/{test_product['id']}", headers=headers)
    
    assert response.status_code == 200
    assert response.json()["message"] == "Product deleted successfully"
    
    # Verify product is actually deleted
    get_response = client.get(f"/products/{test_product['id']}")
    assert get_response.status_code == 404

def test_delete_product_not_found(client, test_user_and_token):
    """Test deleting non-existent product"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    response = client.delete("/products/999", headers=headers)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

def test_delete_product_unauthorized(client, test_product):
    """Test deleting product without authentication"""
    response = client.delete(f"/products/{test_product['id']}")
    
    assert response.status_code == 401

def test_delete_product_not_owner(setup_database, client, test_product):
    """Test deleting product by non-owner"""
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
    
    # Try to delete the product
    headers = {"Authorization": f"Bearer {other_token}"}
    
    response = client.delete(f"/products/{test_product['id']}", headers=headers)
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this product"

# Tests for sold status toggle
def test_mark_product_as_sold(client, test_user_and_token, test_product):
    """Test marking product as sold"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    sold_data = {"is_sold": True}
    
    response = client.patch(f"/products/{test_product['id']}/sold", json=sold_data, headers=headers)
    
    assert response.status_code == 200
    updated_product = response.json()
    assert updated_product["is_sold"] == True
    # Other fields should remain unchanged
    assert updated_product["title"] == test_product["title"]
    assert updated_product["price"] == test_product["price"]

def test_mark_product_as_available(client, test_user_and_token, test_product):
    """Test marking product as available (unsold)"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # First mark as sold
    sold_data = {"is_sold": True}
    response = client.patch(f"/products/{test_product['id']}/sold", json=sold_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["is_sold"] == True
    
    # Then mark as available
    available_data = {"is_sold": False}
    response = client.patch(f"/products/{test_product['id']}/sold", json=available_data, headers=headers)
    
    assert response.status_code == 200
    updated_product = response.json()
    assert updated_product["is_sold"] == False

def test_update_sold_status_not_found(client, test_user_and_token):
    """Test updating sold status for non-existent product"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    sold_data = {"is_sold": True}
    
    response = client.patch("/products/999/sold", json=sold_data, headers=headers)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

def test_update_sold_status_unauthorized(client, test_product):
    """Test updating sold status without authentication"""
    sold_data = {"is_sold": True}
    
    response = client.patch(f"/products/{test_product['id']}/sold", json=sold_data)
    
    assert response.status_code == 401

def test_update_sold_status_not_owner(setup_database, client, test_product):
    """Test updating sold status by non-owner"""
    # Create another user
    user_data = {
        "username": "otheruser3",
        "email": "other3@example.com",
        "full_name": "Other User 3",
        "location": "Other City 3",
        "password": "otherpassword3"
    }
    
    # Register user
    response = client.post("/users/", json=user_data)
    assert response.status_code == 200
    
    # Login to get token
    login_data = {
        "username": "otheruser3",
        "password": "otherpassword3"
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    other_token = response.json()["access_token"]
    
    # Try to update sold status
    headers = {"Authorization": f"Bearer {other_token}"}
    sold_data = {"is_sold": True}
    
    response = client.patch(f"/products/{test_product['id']}/sold", json=sold_data, headers=headers)
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to update this product"

def test_update_sold_status_invalid_data(client, test_user_and_token, test_product):
    """Test updating sold status with invalid data"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    invalid_data = {"is_sold": "invalid_boolean"}  # Should be a boolean
    
    response = client.patch(f"/products/{test_product['id']}/sold", json=invalid_data, headers=headers)
    
    assert response.status_code == 422  # Validation error

# Tests for user listings endpoint
def test_get_user_products_success(client, test_user_and_token, test_category):
    """Test getting user's own products"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Create multiple products for the user
    product_data_1 = {
        "title": "User Product 1",
        "description": "First product",
        "price": 100.0,
        "condition": "New",
        "location": "Test Location",
        "seller_id": 1,
        "category_id": test_category.id
    }
    
    product_data_2 = {
        "title": "User Product 2",
        "description": "Second product",
        "price": 200.0,
        "condition": "Used",
        "location": "Test Location",
        "seller_id": 1,
        "category_id": test_category.id
    }
    
    # Create products
    response1 = client.post("/products/", json=product_data_1, headers=headers)
    assert response1.status_code == 200
    
    response2 = client.post("/products/", json=product_data_2, headers=headers)
    assert response2.status_code == 200
    
    # Get user's products
    response = client.get("/products/me", headers=headers)
    
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 2
    
    # Check that products are ordered by creation date (newest first)
    assert products[0]["title"] == "User Product 2"  # Created second, should be first
    assert products[1]["title"] == "User Product 1"  # Created first, should be second

def test_get_user_products_with_sold_filter(client, test_user_and_token, test_category):
    """Test getting user's products filtered by sold status"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Create a product
    product_data = {
        "title": "Test Product for Sold Filter",
        "description": "A test product",
        "price": 100.0,
        "condition": "New",
        "location": "Test Location",
        "seller_id": 1,
        "category_id": test_category.id
    }
    
    response = client.post("/products/", json=product_data, headers=headers)
    assert response.status_code == 200
    product = response.json()
    
    # Mark product as sold
    sold_data = {"is_sold": True}
    response = client.patch(f"/products/{product['id']}/sold", json=sold_data, headers=headers)
    assert response.status_code == 200
    
    # Get only sold products
    response = client.get("/products/me?sold_status=true", headers=headers)
    assert response.status_code == 200
    sold_products = response.json()
    assert len(sold_products) == 1
    assert sold_products[0]["is_sold"] == True
    
    # Get only available products
    response = client.get("/products/me?sold_status=false", headers=headers)
    assert response.status_code == 200
    available_products = response.json()
    assert len(available_products) == 0  # No available products

def test_get_user_products_pagination(client, test_user_and_token, test_category):
    """Test pagination for user's products"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Create multiple products
    for i in range(5):
        product_data = {
            "title": f"Product {i}",
            "description": f"Product {i} description",
            "price": 100.0 + i,
            "condition": "New",
            "location": "Test Location",
            "seller_id": 1,
            "category_id": test_category.id
        }
        response = client.post("/products/", json=product_data, headers=headers)
        assert response.status_code == 200
    
    # Get first 3 products
    response = client.get("/products/me?limit=3", headers=headers)
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 3
    
    # Get next 2 products
    response = client.get("/products/me?skip=3&limit=3", headers=headers)
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 2

def test_get_user_products_empty(client, test_user_and_token):
    """Test getting user's products when user has no products"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    response = client.get("/products/me", headers=headers)
    
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 0

def test_get_user_products_unauthorized(client):
    """Test getting user's products without authentication"""
    response = client.get("/products/me")
    
    assert response.status_code == 401

def test_get_user_products_only_own_products(setup_database, client, test_category):
    """Test that user only gets their own products, not others'"""
    # Create first user
    user1_data = {
        "username": "user1",
        "email": "user1@example.com",
        "full_name": "User One",
        "location": "City 1",
        "password": "password1"
    }
    response = client.post("/users/", json=user1_data)
    assert response.status_code == 200
    
    login_data = {"username": "user1", "password": "password1"}
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    user1_token = response.json()["access_token"]
    
    # Create second user
    user2_data = {
        "username": "user2",
        "email": "user2@example.com",
        "full_name": "User Two",
        "location": "City 2",
        "password": "password2"
    }
    response = client.post("/users/", json=user2_data)
    assert response.status_code == 200
    
    login_data = {"username": "user2", "password": "password2"}
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    user2_token = response.json()["access_token"]
    
    # Create product for user1
    headers1 = {"Authorization": f"Bearer {user1_token}"}
    product_data1 = {
        "title": "User 1 Product",
        "description": "Product by user 1",
        "price": 100.0,
        "condition": "New",
        "location": "Test Location",
        "seller_id": 1,
        "category_id": test_category.id
    }
    response = client.post("/products/", json=product_data1, headers=headers1)
    assert response.status_code == 200
    
    # Create product for user2
    headers2 = {"Authorization": f"Bearer {user2_token}"}
    product_data2 = {
        "title": "User 2 Product",
        "description": "Product by user 2",
        "price": 200.0,
        "condition": "Used",
        "location": "Test Location",
        "seller_id": 2,
        "category_id": test_category.id
    }
    response = client.post("/products/", json=product_data2, headers=headers2)
    assert response.status_code == 200
    
    # User1 should only see their own product
    response = client.get("/products/me", headers=headers1)
    assert response.status_code == 200
    user1_products = response.json()
    assert len(user1_products) == 1
    assert user1_products[0]["title"] == "User 1 Product"
    
    # User2 should only see their own product
    response = client.get("/products/me", headers=headers2)
    assert response.status_code == 200
    user2_products = response.json()
    assert len(user2_products) == 1
    assert user2_products[0]["title"] == "User 2 Product"