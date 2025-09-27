# ReMarket Backend

This is the backend for the ReMarket application, a marketplace for second-hand products.

## Setup

### Prerequisites
- Python 3.8 or higher
- [uv](https://docs.astral.sh/uv/) (fast Python package manager)
- PostgreSQL (can be run via Docker)

### 1. Install uv (if not already installed)

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Set up PostgreSQL Database

If using Docker:
```bash
# Start PostgreSQL in Docker
docker run --name postgres-remarketdb -e POSTGRES_PASSWORD=password -e POSTGRES_DB=remarketdb -p 5432:5432 -d postgres:13
```

Or install PostgreSQL locally and create a database:
```bash
# Create database
createdb remarketdb
```

### 3. Set up Python Virtual Environment with uv

```bash
# Create virtual environment
uv venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate     # On Windows
```

### 4. Install Dependencies

```bash
# Install dependencies (much faster than pip!)
uv pip install -r requirements.txt
```

### 4. Configure Database Connection

Update the database connection string in `database.py` if needed to match your PostgreSQL setup.

### 5. Initialize Database

```bash
# Make sure virtual environment is activated
./setup.sh
```

### 6. Run the Application

```bash
# Make sure virtual environment is activated
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