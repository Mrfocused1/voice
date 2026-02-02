#!/bin/bash

echo "🎤 VoxMod Setup Script"
echo "======================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads
mkdir -p generated
echo "✅ Directories created"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your Fish Audio API key!"
    echo "   Get your API key from: https://fish.audio"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your Fish Audio API key"
echo "2. Run: npm start"
echo "3. Open: http://localhost:3000"
echo ""
echo "For development with auto-reload:"
echo "Run: npm run dev"
echo ""
