# Label Suite Logo & Brand Assets

This directory contains the official Label Suite logo and brand assets.

## Files

### SVG (Vector)

| File | Description | Usage |
|------|-------------|-------|
| `icon.svg` | Tag icon only (monochrome) | Favicon, small icons |
| `icon-colored.svg` | Icon with primary color background (48×48) | App icon, profile picture |
| `logo-horizontal.svg` | Icon + "Label Suite" text | Header, documentation |
| `banner.svg` | Icon + "Label Suite" + "NLP Annotation Portal" on white (1280×200) | README header |
| `social-preview.svg` | GitHub social preview (1280×640) | GitHub repository preview |

### PNG (Raster)

`social-preview.png` is committed. Generate other PNG files from SVG using the commands below.

## Design Tokens

- **Primary Color:** `#6366F1` (Indigo)
- **Background:** `#F5F3FF` (Light lavender)
- **Text:** `#1E1B4B` (Deep indigo)
- **Icon:** Tag/Label symbol (from Heroicons/Lucide)
- **Fonts:**
  - Heading: Crimson Pro
  - Body: Atkinson Hyperlegible

`design/system/MASTER.md` is the source of truth for these values. The logo is the Lucide `tag` glyph in white on a `#6366F1` rounded square, with the wordmark in Crimson Pro; there is no custom logo design.

## Logo Usage Guideline

### 1. Which version to use

| Version | File | Use it when |
|---------|------|-------------|
| Icon only, colored | `icon-colored.svg` | The space is square or very small: app icon, profile picture, favicon source |
| Icon only, monochrome | `icon.svg` | The icon must inherit surrounding text colour (`currentColor`), for example inline in UI |
| Horizontal lockup | `logo-horizontal.svg` | There is room for the name: page header, documentation, slides |
| Banner | `banner.svg` | Wide README or document header (1280×200) |
| Social preview | `social-preview.svg` / `social-preview.png` | GitHub repository social preview only (1280×640) |

Use the horizontal lockup whenever the name should be readable; fall back to the icon only when width is the constraint.

### 2. Minimum size and clear space

- **Minimum size:** the icon is not shown smaller than 16 px (the smallest size generated below); the horizontal lockup is not shown narrower than 100 px, which keeps the wordmark at 12 px (the SVG sets it at 24 in a 200-wide viewBox).
- **Clear space:** keep an empty margin of at least 12 units on every side, measured in the SVG viewBox. That equals the icon's corner radius (`rx="12"`) and one quarter of the 48-unit icon height, so it scales with the logo (for example, 24 px on a 96 px-tall icon).

### 3. Do not

- Do not stretch, skew, rotate or crop the logo; scale it proportionally only.
- Do not recolour it outside the tokens above: background `#6366F1`, glyph `white`, wordmark `#1E1B4B`. Only `icon.svg` takes the surrounding colour.
- Do not replace Crimson Pro in the wordmark, retype "Label Suite" in another font, or change the spacing between icon and text.
- Do not add effects (shadow, gradient, outline, glow), or place the logo on a busy background with poor contrast.

### 4. Licensing boundary

- **Today:** this repository's `LICENSE` is the "All rights reserved" research preview notice. The logo and the name "Label Suite" fall under it and are not licensed separately.
- **After the open-source split (ADR-036):** the open-source licence covers **code only**. The "Label Suite" name and logo are **not** licensed. Forks and derivative projects must rename the project and replace the logo, and may only credit the origin descriptively, for example "based on Label Suite".
- **Follow-up:** the open-source repository's `LICENSE` or `NOTICE` will carry a name and trademark reservation statement. That repository does not exist yet, so the statement is not part of this repository.

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
  <img src="assets/logo/icon-colored.svg" width="96" alt="Label Suite Logo">
</p>

<h1 align="center">Label Suite</h1>
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

These assets are part of the Label Suite project and covered by the project's main LICENSE file. See [Licensing boundary](#4-licensing-boundary) for how the name and logo are treated after the open-source split.
