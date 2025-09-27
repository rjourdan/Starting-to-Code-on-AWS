#!/bin/bash

# Function to handle errors
handle_error() {
    echo "ERROR: $1"
    exit 1
}

echo "Setting up reMarket Backend..."

# Check if uv is installed, install if not
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh || handle_error "Failed to install uv"
    export PATH="$HOME/.local/bin:$PATH"
fi

# Create virtual environment with uv
echo "Creating virtual environment with uv..."
uv venv || handle_error "Failed to create virtual environment"

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate || handle_error "Failed to activate virtual environment"

# Install dependencies with uv
echo "Installing dependencies..."
uv pip install -r requirements.txt || handle_error "Failed to install dependencies"

# Check if database credentials are set in environment variables
if [ -z "${DB_USER}" ] || [ -z "${DB_PASSWORD}" ] || [ -z "${DB_HOST}" ] || [ -z "${DB_PORT}" ] || [ -z "${DB_NAME}" ]; then
    echo "ERROR: Database credentials not found in environment variables."
    echo "Please ensure launch_script.sh has set: DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME"
    exit 1
else
    echo "Using database credentials from environment variables."
    echo "DB_USER: ${DB_USER}"
    echo "DB_HOST: ${DB_HOST}"
    echo "DB_PORT: ${DB_PORT}"
    echo "DB_NAME: ${DB_NAME}"
fi

# Create database
echo "Creating database..."
cd db_bootstrap || handle_error "Failed to change directory to db_bootstrap"
python create_db.py || handle_error "Failed to create database"

# Initialize database
echo "Initializing database..."
python init_db.py || handle_error "Failed to initialize database"
cd .. || handle_error "Failed to change directory back"

# Start the server
echo "Starting the server..."
echo "The API will be available internally at http://localhost:8000"
echo "API documentation will be available at http://localhost:8000/docs"
echo "Frontend will access API via nginx proxy at /api/"
echo "Press CTRL+C to stop the server"
uvicorn main:app --host 127.0.0.1 --port 8000

# Note: The script will not reach this point while the server is running
# Deactivate virtual environment
deactivate