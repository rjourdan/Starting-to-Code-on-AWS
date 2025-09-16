# ReMarket Backend

This is the backend for the ReMarket application, a marketplace for second-hand products.

## Setup

1. Install PostgreSQL and create a database:

```bash
# Create database
createdb remarketdb
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Update the database connection string in `database.py` if needed.

4. Run the application:

```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

Once the server is running, you can access the auto-generated API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Schema

The application uses the following database schema:

- **Users**: Store user information and credentials
- **Communities**: Groups that users can join to buy/sell items
- **Categories**: Product categories (Sports, Clothing, Electronics, etc.)
- **Products**: Items listed for sale
- **ProductImages**: Images associated with products

## Many-to-Many Relationships

- Users can belong to multiple communities
- Products can be listed in multiple communities