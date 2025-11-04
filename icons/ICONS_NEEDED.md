# Extension Icons Required

This Chrome extension requires three icon files to function properly:

## Required Files

1. **icon16.png** - 16x16 pixels
2. **icon48.png** - 48x48 pixels
3. **icon128.png** - 128x128 pixels

## Quick Icon Generation Options

### Option 1: Online Icon Generators
Use any of these free online tools:
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/
- https://www.icoconverter.com/

### Option 2: Use an Image Editor
1. Create a 128x128 image with a house/building icon
2. Use any image editor (GIMP, Photoshop, Paint.NET, etc.)
3. Resize to create 48x48 and 16x16 versions
4. Export as PNG files

### Option 3: Simple HTML Generator
Save this as an HTML file and open in your browser:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
</head>
<body>
    <h2>Icon Generator</h2>
    <button onclick="generateIcon(16)">Generate 16x16</button>
    <button onclick="generateIcon(48)">Generate 48x48</button>
    <button onclick="generateIcon(128)">Generate 128x128</button>

    <script>
    function generateIcon(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Blue background
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(0, 0, size, size);

        // White house icon (simplified)
        ctx.fillStyle = '#ffffff';
        const fontSize = Math.floor(size * 0.7);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏠', size / 2, size / 2);

        // Download
        canvas.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `icon${size}.png`;
            a.click();
        });
    }
    </script>
</body>
</html>
```

### Option 4: Use Emoji to PNG Converter
1. Go to https://emoji.gg/ or similar
2. Search for "house" or "building" emoji
3. Download as PNG
4. Resize to 16x16, 48x48, and 128x128

## Icon Design Suggestions

For best results, your icon should:
- Be clearly visible at small sizes (16x16)
- Use simple, recognizable shapes
- Have good contrast
- Represent real estate/housing theme
- Work on both light and dark backgrounds

## After Creating Icons

1. Place the three PNG files in this `icons/` directory
2. Make sure they're named exactly: `icon16.png`, `icon48.png`, `icon128.png`
3. Reload the extension in Chrome
4. The icons should now appear in the toolbar and extensions page
