#!/bin/bash

# Migration Script: React (Vite) to Next.js
# This script helps transition from the old structure to the new one

echo "🚀 Starting migration to Next.js..."

# Backup old files
echo "📦 Creating backup of old files..."
mkdir -p backup-vite
cp package.json backup-vite/package.json.old 2>/dev/null
cp tsconfig.json backup-vite/tsconfig.json.old 2>/dev/null
cp vite.config.ts backup-vite/vite.config.ts.old 2>/dev/null
cp -r locales backup-vite/ 2>/dev/null
cp -r services backup-vite/ 2>/dev/null
cp index.html backup-vite/ 2>/dev/null
cp index.tsx backup-vite/ 2>/dev/null
cp App.tsx backup-vite/ 2>/dev/null
cp -r context backup-vite/ 2>/dev/null

# Apply new configuration files
echo "📝 Applying new configuration..."
mv package.json.new package.json 2>/dev/null
mv tsconfig.json.new tsconfig.json 2>/dev/null

# Clean up old Vite files
echo "🧹 Cleaning up old files..."
rm -f vite.config.ts
rm -f index.html
rm -f index.tsx
rm -f App.tsx
rm -rf context
rm -rf services
rm -rf locales
rm -f types.ts

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔑 Creating .env.local file..."
    echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
    echo "⚠️  Please update .env.local with your actual Gemini API key!"
fi

echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Add your Gemini API key to .env.local"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Test all functionality"
echo "4. Deploy to Vercel when ready"
echo ""
echo "📚 See README-NEXTJS.md for detailed documentation"
