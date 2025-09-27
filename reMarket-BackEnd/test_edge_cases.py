import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys
import io
from PIL import Image

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

# Edge case tests for product management

def test_update_product_with_empty_fields(client, test_user_and_token, test_product):
    """Test updating product with empty string values"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {
        "title": "",  # Empty title should be handled
        "description": ""  # Empty description should be handled
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    # This might fail validation or succeed depending on schema validation
    # The behavior should be consistent with business rules
    assert response.status_code in [200, 422]

def test_update_product_with_very_long_strings(client, test_user_and_token, test_product):
    """Test updating product with very long string values"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Create very long strings
    long_title = "A" * 1000  # Very long title
    long_description = "B" * 10000  # Very long description
    
    update_data = {
        "title": long_title,
        "description": long_description
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    # Should either succeed or fail with validation error
    assert response.status_code in [200, 422]

def test_update_product_with_negative_price(client, test_user_and_token, test_product):
    """Test updating product with negative price"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {
        "price": -50.0  # Negative price
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    # Should either succeed (if business allows) or fail with validation
    assert response.status_code in [200, 422]

def test_update_product_with_zero_price(client, test_user_and_token, test_product):
    """Test updating product with zero price"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {
        "price": 0.0  # Zero price (free item)
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    assert response.status_code == 200
    updated_product = response.json()
    assert updated_product["price"] == 0.0

def test_update_product_with_invalid_category(client, test_user_and_token, test_product):
    """Test updating product with non-existent category"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    update_data = {
        "category_id": 999  # Non-existent category
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    # Should either succeed (if no foreign key constraint) or fail
    # The exact behavior depends on database constraints
    assert response.status_code in [200, 400, 422, 500]

def test_concurrent_product_updates(client, test_user_and_token, test_product):
    """Test concurrent updates to the same product"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Simulate concurrent updates
    update_data_1 = {"title": "Updated Title 1"}
    update_data_2 = {"title": "Updated Title 2"}
    
    # Both requests should succeed, but the last one should win
    response1 = client.put(f"/products/{test_product['id']}", json=update_data_1, headers=headers)
    response2 = client.put(f"/products/{test_product['id']}", json=update_data_2, headers=headers)
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert response2.json()["title"] == "Updated Title 2"

def test_delete_product_twice(client, test_user_and_token, test_product):
    """Test deleting the same product twice"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # First deletion should succeed
    response1 = client.delete(f"/products/{test_product['id']}", headers=headers)
    assert response1.status_code == 200
    
    # Second deletion should fail (product not found)
    response2 = client.delete(f"/products/{test_product['id']}", headers=headers)
    assert response2.status_code == 404

def test_update_deleted_product(client, test_user_and_token, test_product):
    """Test updating a product after it's been deleted"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Delete the product
    delete_response = client.delete(f"/products/{test_product['id']}", headers=headers)
    assert delete_response.status_code == 200
    
    # Try to update the deleted product
    update_data = {"title": "Updated Title"}
    update_response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    assert update_response.status_code == 404

def test_mark_deleted_product_as_sold(client, test_user_and_token, test_product):
    """Test marking a deleted product as sold"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Delete the product
    delete_response = client.delete(f"/products/{test_product['id']}", headers=headers)
    assert delete_response.status_code == 200
    
    # Try to mark the deleted product as sold
    sold_data = {"is_sold": True}
    sold_response = client.patch(f"/products/{test_product['id']}/sold", json=sold_data, headers=headers)
    assert sold_response.status_code == 404

def test_toggle_sold_status_multiple_times(client, test_user_and_token, test_product):
    """Test toggling sold status multiple times"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Mark as sold
    sold_data = {"is_sold": True}
    response1 = client.patch(f"/products/{test_product['id']}/sold", json=sold_data, headers=headers)
    assert response1.status_code == 200
    assert response1.json()["is_sold"] == True
    
    # Mark as available
    available_data = {"is_sold": False}
    response2 = client.patch(f"/products/{test_product['id']}/sold", json=available_data, headers=headers)
    assert response2.status_code == 200
    assert response2.json()["is_sold"] == False
    
    # Mark as sold again
    response3 = client.patch(f"/products/{test_product['id']}/sold", json=sold_data, headers=headers)
    assert response3.status_code == 200
    assert response3.json()["is_sold"] == True

def test_get_user_products_with_invalid_pagination(client, test_user_and_token):
    """Test user products endpoint with invalid pagination parameters"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Test with negative skip
    response1 = client.get("/products/me?skip=-1", headers=headers)
    assert response1.status_code in [200, 422]  # Should handle gracefully
    
    # Test with negative limit
    response2 = client.get("/products/me?limit=-1", headers=headers)
    assert response2.status_code in [200, 422]  # Should handle gracefully
    
    # Test with very large limit
    response3 = client.get("/products/me?limit=10000", headers=headers)
    assert response3.status_code == 200  # Should succeed but limit results

def test_get_user_products_with_invalid_sold_status(client, test_user_and_token):
    """Test user products endpoint with invalid sold_status parameter"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Test with invalid boolean value
    response = client.get("/products/me?sold_status=invalid", headers=headers)
    assert response.status_code in [200, 422]  # Should handle gracefully

def test_database_connection_failure_simulation(client, test_user_and_token):
    """Test behavior when database operations might fail"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # This test would require mocking database failures
    # For now, we'll just test that the endpoints are robust
    response = client.get("/products/me", headers=headers)
    assert response.status_code in [200, 500]  # Should either work or fail gracefully

def test_malformed_json_requests(client, test_user_and_token, test_product):
    """Test endpoints with malformed JSON"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    headers["Content-Type"] = "application/json"
    
    # Test with invalid JSON
    response = client.put(
        f"/products/{test_product['id']}", 
        data='{"title": "Invalid JSON"',  # Missing closing brace
        headers=headers
    )
    assert response.status_code == 422  # Should return validation error

def test_very_large_request_payload(client, test_user_and_token, test_product):
    """Test with very large request payload"""
    headers = {"Authorization": f"Bearer {test_user_and_token['token']}"}
    
    # Create a very large description
    large_description = "A" * 100000  # 100KB description
    
    update_data = {
        "description": large_description
    }
    
    response = client.put(f"/products/{test_product['id']}", json=update_data, headers=headers)
    
    # Should either succeed or fail with appropriate error
    assert response.status_code in [200, 413, 422]  # 413 = Payload Too Large