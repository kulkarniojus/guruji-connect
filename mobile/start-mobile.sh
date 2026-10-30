#!/bin/bash

echo "🚀 Starting Vaidik Dhara Mobile App..."
echo "📱 Setting up Expo development environment..."

# Navigate to mobile directory
cd "$(dirname "$0")"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start Expo development server
echo "🌟 Starting Expo development server..."
echo "📱 Scan the QR code with Expo Go app on your phone"
echo ""
echo "Instructions:"
echo "1. Install 'Expo Go' app from App Store or Google Play"
echo "2. Open Expo Go app on your phone" 
echo "3. Scan the QR code that appears below"
echo "4. Test the Vaidik Dhara mobile app!"
echo ""

npx expo start --tunnel