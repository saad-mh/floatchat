#!/bin/bash

# FloatChat Backend - Build Script with BuildKit

echo "🔨 Building FloatChat Backend with BuildKit..."
echo ""

# Build the image using buildx
docker buildx build -t floatchat-backend .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📦 Image size:"
    docker images floatchat-backend --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    echo ""
    echo "🚀 To run the container:"
    echo "  docker run -p 8000:8000 --env-file .env floatchat-backend"
    echo ""
    echo "Or use Docker Compose:"
    echo "  docker-compose up"
    echo ""
    echo "🧪 Test the API:"
    echo "  curl http://localhost:8000/health"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi
