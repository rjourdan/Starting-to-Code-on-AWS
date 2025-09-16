import requests
import json

def test_api():
    base_url = "http://localhost:8000"
    
    # Test root endpoint
    print("\n--- Testing root endpoint ---")
    try:
        response = requests.get(f"{base_url}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test categories endpoint
    print("\n--- Testing categories endpoint ---")
    try:
        response = requests.get(f"{base_url}/categories/")
        print(f"Status: {response.status_code}")
        categories = response.json()
        print(f"Categories count: {len(categories)}")
        print(f"Categories: {json.dumps(categories, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test products endpoint
    print("\n--- Testing products endpoint ---")
    try:
        response = requests.get(f"{base_url}/products/")
        print(f"Status: {response.status_code}")
        products = response.json()
        print(f"Products count: {len(products)}")
        if len(products) > 0:
            print(f"First product: {json.dumps(products[0], indent=2)}")
        else:
            print("No products returned")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()