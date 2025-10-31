#!/bin/bash

echo "🚀 Setting up BugRelay development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Install root dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Copy environment file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating environment file..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update backend/.env with your configuration"
fi

# Initialize Go modules
echo "📦 Initializing Go modules..."
cd backend && go mod tidy && cd ..

echo "✅ Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Update backend/.env with your configuration"
echo "2. Run 'make docker-up' to start all services"
echo "3. Visit http://localhost:3000 to see the frontend"
echo "4. Visit http://localhost:8080/health to check the backend"
echo "5. Run 'make help' to see all available commands"