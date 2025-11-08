# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for NetCDF, HDF5, and other libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    libhdf5-dev \
    libnetcdf-dev \
    libpq-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Heroku will set PORT env variable)
EXPOSE 8000

# Run the application
# Use PORT environment variable from Heroku, default to 8000
CMD uvicorn api_server:app --host 0.0.0.0 --port ${PORT:-8000}
