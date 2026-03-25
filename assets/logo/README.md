# LabelSuite Logo & Brand Assets

This directory contains the official LabelSuite logo and brand assets.

## Files

### SVG (Vector)

| File | Description | Usage |
|------|-------------|-------|
| `icon.svg` | Tag icon only (monochrome) | Favicon, small icons |
| `icon-colored.svg` | Icon with primary color background (48×48) | App icon, profile picture |
| `logo-horizontal.svg` | Icon + "LabelSuite" text | Header, documentation |
| `social-preview.svg` | GitHub social preview (1280×640) | GitHub repository preview |

### PNG (Raster)

Generate PNG files from SVG using the commands below.

## Design Tokens

- **Primary Color:** `#6366F1` (Indigo)
- **Background:** `#F5F3FF` (Light lavender)
- **Text:** `#1E1B4B` (Deep indigo)
- **Icon:** Tag/Label symbol (from Heroicons/Lucide)
- **Fonts:**
  - Heading: Crimson Pro
  - Body: Atkinson Hyperlegible

## Generate PNG from SVG

### Using Inkscape (Recommended)

```bash
# Install Inkscape (macOS)
brew install inkscape

# Generate PNG files
cd assets/logo

# Icon - multiple sizes
inkscape icon-colored.svg --export-filename=icon-16.png --export-width=16
inkscape icon-colored.svg --export-filename=icon-32.png --export-width=32
inkscape icon-colored.svg --export-filename=icon-64.png --export-width=64
inkscape icon-colored.svg --export-filename=icon-128.png --export-width=128
inkscape icon-colored.svg --export-filename=icon-256.png --export-width=256
inkscape icon-colored.svg --export-filename=icon-512.png --export-width=512

# Horizontal logo
inkscape logo-horizontal.svg --export-filename=logo-horizontal.png --export-width=400

# GitHub social preview
inkscape social-preview.svg --export-filename=social-preview.png --export-width=1280
```

### Using ImageMagick (Alternative)

```bash
# Install ImageMagick (macOS)
brew install imagemagick

# Generate PNG files
cd assets/logo

convert -background none icon-colored.svg -resize 256x256 icon-256.png
convert -background none logo-horizontal.svg -resize 400x logo-horizontal.png
convert -background none social-preview.svg -resize 1280x640 social-preview.png
```

### Using rsvg-convert (Alternative)

```bash
# Install librsvg (macOS)
brew install librsvg

# Generate PNG files
cd assets/logo

rsvg-convert -w 256 -h 256 icon-colored.svg -o icon-256.png
rsvg-convert -w 400 logo-horizontal.svg -o logo-horizontal.png
rsvg-convert -w 1280 -h 640 social-preview.svg -o social-preview.png
```

## GitHub Repository Setup

### 1. Social Preview Image

1. Generate PNG: `inkscape social-preview.svg --export-filename=social-preview.png --export-width=1280`
2. Go to your GitHub repository
3. Navigate to **Settings** → **Options** → **Social preview**
4. Click **Edit** and upload `social-preview.png`

### 2. Repository Icon (Profile Picture)

GitHub repositories don't have custom icons by default, but you can:

- Use `icon-colored.svg` or `icon-256.png` as your organization's profile picture
- Add the logo to your README.md (see below)

### 3. Add Logo to README

```markdown
<p align="center">
  <img src="assets/logo/icon-colored.svg" width="96" alt="LabelSuite Logo">
</p>

<h1 align="center">LabelSuite</h1>
<p align="center">NLP Annotation Portal</p>
```

## Favicon

For web applications, use `icon.svg` or generate a favicon:

```bash
# Generate favicon sizes
inkscape icon-colored.svg --export-filename=favicon-16.png --export-width=16
inkscape icon-colored.svg --export-filename=favicon-32.png --export-width=32
inkscape icon-colored.svg --export-filename=favicon-48.png --export-width=48

# Create .ico file (requires imagemagick)
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
```

Then add to your HTML:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
```

## License

These assets are part of the LabelSuite project. See the project's main LICENSE file for details.
