#!/bin/bash

# Automation Marketplace - Vue 3 Editor Quick Start Script

echo "🚀 Starting Automation Marketplace Vue 3 Editor Setup..."
echo ""

# Navigate to editor-ui directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🎨 Setup complete!"
echo ""
echo "Available commands:"
echo "  pnpm dev          - Start development server"
echo "  pnpm build        - Build for production"
echo "  pnpm typecheck    - Run TypeScript checks"
echo ""
echo "📚 Documentation:"
echo "  - SETUP_GUIDE.md             - Complete setup guide"
echo "  - IMPLEMENTATION_COMPLETE.md - Implementation summary"
echo ""
echo "🌐 Development server will run at: http://localhost:5678"
echo ""
read -p "Start development server now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting development server..."
    pnpm dev
fi
