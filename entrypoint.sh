#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Create database directory if specified
if [ -n "$DATABASE_DIR" ]; then
    echo "Creating database directory: $DATABASE_DIR"
    mkdir -p "$DATABASE_DIR"
fi

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Execute the passed command
exec "$@"
