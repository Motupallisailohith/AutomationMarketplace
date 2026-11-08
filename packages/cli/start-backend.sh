#!/bin/bash

echo "========================================"
echo "Automation Marketplace Backend"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "Please edit .env file with your configuration"
    echo "Then run this script again."
    exit 1
fi

echo "Starting server..."
echo ""

pnpm tsx src/start-automation-marketplace.ts
