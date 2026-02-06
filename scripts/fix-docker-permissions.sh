#!/bin/bash

echo "🔧 Docker Permission Diagnostic & Fix Script"
echo "============================================="

# Check Docker access
echo "1. Checking Docker daemon access..."
if docker info >/dev/null 2>&1; then
    echo "✅ Docker daemon accessible"
else
    echo "❌ Docker daemon not accessible"
    echo "   Fix: sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
fi

# Check if user is in docker group
echo "2. Checking user groups..."
if groups | grep -q docker; then
    echo "✅ User is in docker group"
else
    echo "❌ User not in docker group"
    echo "   Fix: sudo usermod -aG docker \$USER && newgrp docker"
fi

# Check file permissions
echo "3. Checking file permissions..."
if [ -r "docker-compose.yml" ] && [ -r "backend/Dockerfile" ] && [ -r "frontend/Dockerfile" ]; then
    echo "✅ Docker files are readable"
else
    echo "❌ Some Docker files are not readable"
    echo "   Fix: chmod 644 docker-compose.yml */Dockerfile"
fi

# Check directory permissions
echo "4. Checking directory permissions..."
if [ -d "backend" ] && [ -d "frontend" ]; then
    echo "✅ Source directories exist and accessible"
else
    echo "❌ Source directories not accessible"
fi

# Clean up potential permission conflicts
echo "5. Cleaning up Docker to resolve conflicts..."
docker compose down 2>/dev/null
docker system prune -f >/dev/null 2>&1

# Try to build without cache to avoid permission conflicts
echo "6. Testing Docker build..."
if docker compose build --no-cache --pull api >/dev/null 2>&1; then
    echo "✅ Docker build successful"
else
    echo "❌ Docker build failed"
    echo "   Running with detailed output..."
    docker compose build --no-cache --pull api
fi

echo ""
echo "🔧 Permission fix complete!"
echo "Now try: docker compose up --build"