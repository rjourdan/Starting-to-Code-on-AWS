#!/bin/bash

# Function to handle errors
handle_error() {
    echo "ERROR: $1"
    exit 1
}

# Function to get database credentials
get_db_credentials() {
    echo "Please enter your PostgreSQL credentials:"
    read -p "Username [postgres]: " DB_USER_INPUT
    export DB_USER=${DB_USER_INPUT:-postgres}
    
    read -s -p "Password: " DB_PASSWORD_INPUT
    echo
    export DB_PASSWORD=${DB_PASSWORD_INPUT:-password}
    
    read -p "Host [localhost]: " DB_HOST_INPUT
    export DB_HOST=${DB_HOST_INPUT:-localhost}
    
    read -p "Port [5432]: " DB_PORT_INPUT
    export DB_PORT=${DB_PORT_INPUT:-5432}
    
    read -p "Database name [remarketdb]: " DB_NAME_INPUT
    export DB_NAME=${DB_NAME_INPUT:-remarketdb}
    
    echo "Database configuration updated."
}

echo "Setting up reMarket Backend..."

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment with uv..."
    uv venv || handle_error "Failed to create virtual environment"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate || handle_error "Failed to activate virtual environment"

# Install dependencies
echo "Installing dependencies with uv..."
uv pip install -r requirements.txt || handle_error "Failed to install dependencies"

# Check if database credentials are set in environment variables
if [ -z "${DB_USER}" ] || [ -z "${DB_PASSWORD}" ] || [ -z "${DB_HOST}" ] || [ -z "${DB_PORT}" ] || [ -z "${DB_NAME}" ]; then
    echo "Database credentials not found in environment variables."
    get_db_credentials
else
    echo "Using database credentials from environment variables."
fi

# Create database
echo "Creating database..."
cd db_bootstrap || handle_error "Failed to change directory to db_bootstrap"
../.venv/bin/python create_db.py || {
    echo "Failed to create database. Would you like to retry with different credentials? (y/n)"
    read answer
    if [[ "$answer" == "y" ]]; then
        get_db_credentials
        ../.venv/bin/python create_db.py || handle_error "Failed to create database again"
    else
        handle_error "Database creation failed"
    fi
}

# Initialize database
echo "Initializing database..."
../.venv/bin/python init_db.py || handle_error "Failed to initialize database"
cd .. || handle_error "Failed to change directory back"

# Start the server
echo "Starting the server..."
echo "The API will be available at http://localhost:8000"
echo "API documentation will be available at http://localhost:8000/docs"
echo "Press CTRL+C to stop the server"

# Export environment variables for uvicorn
export DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME

# Debug: Show environment variables
echo "Database config: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "Password set: ${DB_PASSWORD:+YES}"
echo "Password length: ${#DB_PASSWORD}"

# Start uvicorn with error output
echo "Starting uvicorn..."
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --log-level debug 2>&1 || {
    echo "Uvicorn failed to start. Exit code: $?"
    echo "Trying to test import manually..."
    .venv/bin/python -c "import main; print('Import successful')" 2>&1
}

# Note: The script will not reach this point while the server is running
# Deactivate virtual environment (if activated)
if [[ "$VIRTUAL_ENV" != "" ]]; then
    deactivate
fi