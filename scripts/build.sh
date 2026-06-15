#!/bin/bash
set -e

echo "Starting Scutter Skim build process..."

# Clean up previous build
rm -rf dist/
mkdir -p dist/

echo "Copying extension files..."
# Create directory structure in dist
mkdir -p dist/background dist/content dist/lib dist/options dist/services

# Copy files (only the necessary ones for production)
cp manifest.json dist/
cp background/background.js dist/background/
cp content/extractor.js dist/content/
cp content/ui.css dist/content/
cp content/ui.js dist/content/
cp content/fab.css dist/content/
cp content/fab.js dist/content/
cp lib/marked.min.js dist/lib/
cp lib/purify.min.js dist/lib/
cp lib/Readability.js dist/lib/
cp options/options.css dist/options/
cp options/options.html dist/options/
cp options/options.js dist/options/
cp services/ai-provider.js dist/services/
cp services/gemini-provider.js dist/services/
cp services/openai-provider.js dist/services/
cp services/anthropic-provider.js dist/services/

# Check if icons exist, if so copy them
if [ -d "icons" ]; then
  cp -r icons dist/
fi

# Check if locales exist, if so copy them
if [ -d "_locales" ]; then
  cp -r _locales dist/
fi

# Create the zip file
echo "Zipping the extension..."
cd dist
zip -r extension.zip ./*
cd ..

echo "Build complete! The extension is ready at dist/extension.zip"
