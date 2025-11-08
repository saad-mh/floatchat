#!/bin/bash

# FloatChat Backend - Docker Quick Start Script

echo "🐳 FloatChat Backend - Docker Deployment"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Please create a .env file with required environment variables."
    echo ""
    echo "   Required variables:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_KEY"
    echo "   - UPSTASH_VECTOR_REST_URL"
    echo "   - UPSTASH_VECTOR_REST_TOKEN"
    echo "   - HUGGINGFACE_API_TOKEN"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Ask user which method to use
echo "Choose deployment method:"
echo "1) Docker (single container)"
echo "2) Docker Compose (recommended)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🔨 Building Docker image..."
        docker build -t floatchat-backend .
        
        if [ $? -eq 0 ]; then
            echo "✅ Build successful!"
            echo ""
            echo "🚀 Starting container..."
            docker run -p 8000:8000 --env-file .env floatchat-backend
        else
            echo "❌ Build failed!"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "🚀 Starting with Docker Compose..."
        docker-compose up
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac
