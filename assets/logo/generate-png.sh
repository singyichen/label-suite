#!/bin/bash
# Generate PNG files from SVG logo assets
# Usage: ./generate-png.sh

set -e

cd "$(dirname "$0")"

echo "Checking for SVG to PNG conversion tools..."

# Check which tool is available
if command -v inkscape &> /dev/null; then
    TOOL="inkscape"
    echo "✓ Using Inkscape"
elif command -v rsvg-convert &> /dev/null; then
    TOOL="rsvg-convert"
    echo "✓ Using rsvg-convert"
elif command -v magick &> /dev/null; then
    TOOL="magick"
    echo "✓ Using ImageMagick (magick)"
elif command -v convert &> /dev/null; then
    TOOL="convert"
    echo "✓ Using ImageMagick (convert)"
else
    echo "❌ Error: No SVG to PNG conversion tool found."
    echo ""
    echo "Please install one of the following:"
    echo "  - Inkscape:     brew install inkscape"
    echo "  - librsvg:      brew install librsvg"
    echo "  - ImageMagick:  brew install imagemagick"
    exit 1
fi

echo ""
echo "Generating PNG files..."

# Generate icon sizes
case "$TOOL" in
    inkscape)
        inkscape icon-colored.svg --export-filename=icon-16.png --export-width=16
        inkscape icon-colored.svg --export-filename=icon-32.png --export-width=32
        inkscape icon-colored.svg --export-filename=icon-64.png --export-width=64
        inkscape icon-colored.svg --export-filename=icon-128.png --export-width=128
        inkscape icon-colored.svg --export-filename=icon-256.png --export-width=256
        inkscape icon-colored.svg --export-filename=icon-512.png --export-width=512
        inkscape logo-horizontal.svg --export-filename=logo-horizontal.png --export-width=400
        inkscape social-preview.svg --export-filename=social-preview.png --export-width=1280
        ;;
    rsvg-convert)
        rsvg-convert -w 16 -h 16 icon-colored.svg -o icon-16.png
        rsvg-convert -w 32 -h 32 icon-colored.svg -o icon-32.png
        rsvg-convert -w 64 -h 64 icon-colored.svg -o icon-64.png
        rsvg-convert -w 128 -h 128 icon-colored.svg -o icon-128.png
        rsvg-convert -w 256 -h 256 icon-colored.svg -o icon-256.png
        rsvg-convert -w 512 -h 512 icon-colored.svg -o icon-512.png
        rsvg-convert -w 400 logo-horizontal.svg -o logo-horizontal.png
        rsvg-convert -w 1280 -h 640 social-preview.svg -o social-preview.png
        ;;
    magick|convert)
        CMD="$TOOL"
        $CMD -background none icon-colored.svg -resize 16x16 icon-16.png
        $CMD -background none icon-colored.svg -resize 32x32 icon-32.png
        $CMD -background none icon-colored.svg -resize 64x64 icon-64.png
        $CMD -background none icon-colored.svg -resize 128x128 icon-128.png
        $CMD -background none icon-colored.svg -resize 256x256 icon-256.png
        $CMD -background none icon-colored.svg -resize 512x512 icon-512.png
        $CMD -background none logo-horizontal.svg -resize 400x logo-horizontal.png
        $CMD -background none social-preview.svg -resize 1280x640 social-preview.png
        ;;
esac

echo ""
echo "✓ PNG files generated successfully!"
echo ""
echo "Generated files:"
ls -lh *.png 2>/dev/null || echo "  (no PNG files found)"
