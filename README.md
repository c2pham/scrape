# MLS, Realtor.com & LoopNet Scraper Chrome Extension

A Chrome extension that automatically scrapes realtor/broker information from MLS, Realtor.com, and LoopNet listings. Specifically designed to capture data from:
- Homes built in **2025** (current year)
- **Closed land lot** listings
- Commercial properties built in 2025

## Features

- **Automatic Scraping**: Automatically detects and scrapes listing pages when you browse Realtor.com, LoopNet, and MLS websites
- **Manual Scraping**: Click the scrape button on any listing page to manually trigger scraping
- **Bulk Search**: Enter multiple search queries (one per line) and automatically search across Realtor.com and LoopNet
- **Smart Filtering**: Only saves listings that match your criteria (new homes/properties or closed land lots)
- **Realtor/Broker Information**: Extracts comprehensive details including:
  - Name
  - Phone number
  - Email address
  - Company/Brokerage
  - License number
- **Data Management**: View, filter, and manage all scraped data through an intuitive popup interface
- **CSV Export**: Export your data in CSV format (spreadsheet-compatible) for easy analysis
- **JSON Export**: Also available for programmatic use
- **Multi-Source Support**: Works with Realtor.com, LoopNet, and various MLS platforms

## Installation

### Option 1: Load Unpacked (Development Mode)

1. **Download the extension files**
   - Clone this repository or download the ZIP file
   - Extract to a folder on your computer

2. **Add extension icons** (Required)
   - The extension needs three icon files in the `icons/` directory:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
   - You can create simple icons or use an online icon generator
   - Place the icons in the `icons/` folder

3. **Open Chrome Extensions page**
   - Open Chrome and navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

4. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

5. **Load the extension**
   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

6. **Pin the extension** (Optional but recommended)
   - Click the puzzle piece icon in the Chrome toolbar
   - Find "MLS & Realtor.com Scraper"
   - Click the pin icon to keep it visible

### Option 2: Create Icons Using a Script

If you need help creating icons, you can use this simple HTML file to generate placeholder icons:

```html
<!DOCTYPE html>
<html>
<body>
<canvas id="canvas" width="128" height="128"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Draw a simple house icon
ctx.fillStyle = '#0066cc';
ctx.fillRect(0, 0, 128, 128);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 80px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('🏠', 64, 64);

// Download the image
canvas.toBlob(blob => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'icon128.png';
  a.click();
});
</script>
</body>
</html>
```

Save this as `icon-generator.html` and open it in your browser. Adjust the canvas size to create 16x16, 48x48, and 128x128 versions.

## Usage

### Automatic Scraping

1. **Browse listings**: Simply visit Realtor.com or MLS listing pages
2. **Automatic detection**: The extension will automatically:
   - Check if the listing is a home built in 2025 OR a closed land lot
   - Extract all realtor information if it matches
   - Save the data to your local storage
3. **Visual feedback**: A scrape button will appear in the bottom right corner of the page
   - Green checkmark: Data successfully saved
   - Orange X: Listing doesn't match criteria
   - Red X: Error occurred

### Manual Scraping

1. Click the **"Scrape Realtor Info"**, **"Scrape LoopNet Info"**, or **"Scrape MLS Info"** button that appears on listing pages
2. Wait for the scraping to complete
3. The button will show the result (saved, no match, or error)

### Bulk Search

The bulk search feature allows you to search multiple queries across Realtor.com and LoopNet automatically:

1. Click the extension icon to open the popup
2. Click the **"Bulk Search"** button to expand the bulk search panel
3. Enter your search queries in the text area, **one per line**. Examples:
   ```
   Los Angeles CA land for sale
   San Francisco CA new homes 2025
   Seattle WA commercial property
   Austin TX vacant land
   ```
4. Select which websites to search:
   - ✅ Realtor.com
   - ✅ LoopNet
5. Set the delay between searches (3-30 seconds, default 5 seconds)
   - This helps avoid overwhelming the websites
6. Click **"Start Bulk Search"**
7. The extension will:
   - Open new browser tabs for each search query
   - Wait the specified delay between each search
   - Automatically scrape matching listings on each page
8. Once complete, click **"Refresh"** to see all newly scraped data
9. Click **"Export CSV"** to download all your data in spreadsheet format

**Tips for Bulk Search:**
- Be specific with your queries (include location and property type)
- Use realistic delays (5-10 seconds) to avoid detection
- The tabs open in the background - you can continue working
- Check the bulk search status message for progress updates

### Viewing Scraped Data

1. Click the extension icon in your Chrome toolbar
2. The popup will display:
   - Total number of listings scraped
   - Total number of unique realtors found
   - List of all scraped listings with full details

### Filtering Data

Use the dropdown filters in the popup to filter by:
- **Source**: All Sources, Realtor.com, LoopNet, or MLS
- **Type**: All Types, New Homes (2025), or Closed Land Lots

### Exporting Data

**Primary Export Format: CSV** - Perfect for opening in Excel, Google Sheets, or any spreadsheet application

1. Click **"Export CSV"** to download data in CSV format (recommended for most users)
2. Click **"Export JSON"** to download data in JSON format (for developers/programmatic use)
3. Files are automatically downloaded with timestamps
4. CSV format includes one row per realtor, with all listing details included

### Managing Data

- **Refresh**: Click "Refresh" to reload the data
- **Delete Entry**: Click "Delete" on any listing card to remove it
- **Clear All**: Click "Clear All" to delete all scraped data (requires confirmation)
- **View Listing**: Click "View Listing" to open the original listing page

## Supported Websites

### Realtor.com
- ✅ Full support for listing pages
- ✅ Automatic detection of property type, year built, and status
- ✅ Realtor information extraction
- ✅ Bulk search support

### LoopNet
- ✅ Full support for commercial real estate listings
- ✅ Automatic detection of property type, year built, and status
- ✅ Broker/agent information extraction
- ✅ Bulk search support
- ✅ Land and commercial property support

### MLS Platforms
The extension works with various MLS platforms including:
- MLSListings.com
- MLS.com
- BrightMLS
- CRMLS
- FlexMLS
- Matrix
- And other MLS providers

**Note**: Different MLS platforms have different layouts. The extension uses smart selectors to adapt to various formats, but some platforms may require additional configuration.

## Data Structure

The extension stores the following information for each listing:

### Listing Information
- Property type (home, land, lot, etc.)
- Year built
- Listing status (active, closed, sold, etc.)
- Price
- Address
- MLS number (if available)
- Source (Realtor.com or MLS provider)
- URL of the listing
- Timestamp of when it was scraped

### Realtor Information
- Name
- Phone number
- Email address
- Company/Brokerage name
- License number (if available)

Multiple realtors per listing are supported (e.g., listing agent and buyer's agent).

## Privacy & Data Storage

- **Local Storage Only**: All data is stored locally in your browser using Chrome's storage API
- **No External Servers**: No data is sent to external servers
- **Your Data, Your Control**: You can delete data at any time using the "Clear All" button
- **Export Anytime**: Export your data to keep offline backups

## Troubleshooting

### Extension not working
1. Make sure you're on a listing page (not a search results page)
2. Check that the page has fully loaded before scraping
3. Try clicking the manual scrape button

### No data being captured
1. Verify the listing matches the criteria:
   - Is it a home built in 2025? OR
   - Is it a closed/sold land lot?
2. Check the browser console (F12) for error messages
3. The extension logs helpful messages with `[MLS Scraper]` prefix

### Icons not showing
1. Make sure you've added the three required icon files:
   - `icons/icon16.png`
   - `icons/icon48.png`
   - `icons/icon128.png`
2. Reload the extension after adding icons

### MLS website not supported
- Some MLS platforms use different layouts
- Open the browser console (F12) and check for errors
- You may need to modify the content scripts to support specific platforms

### Bulk search not working
1. Make sure you've entered queries (one per line)
2. Check that at least one website is selected (Realtor.com or LoopNet)
3. The extension opens tabs in the background - check your tab bar
4. Wait for the scraping to complete before exporting data

## Testing the Extension

Since I cannot directly test the extension in a browser, here's how you can test it:

### Basic Testing Steps

1. **Install the Extension**
   - Follow the installation instructions above
   - Make sure icons are added (or the extension may not load properly)
   - Check that the extension appears in your Chrome toolbar

2. **Test Manual Scraping**
   - Visit a listing page on Realtor.com (search for "new homes 2025" in your area)
   - Look for the scrape button in the bottom right corner
   - Click the button and verify it shows "✓ Saved!" or "✗ No match"
   - Open the extension popup and check if data appears

3. **Test LoopNet Scraping**
   - Visit LoopNet.com and search for "commercial land" or similar
   - Open a listing page
   - Look for the orange scrape button
   - Click and verify the result

4. **Test Bulk Search**
   - Open the extension popup
   - Click "Bulk Search" to expand the panel
   - Enter test queries like:
     ```
     Los Angeles CA new homes
     New York NY land
     ```
   - Set delay to 5 seconds
   - Select both Realtor.com and LoopNet
   - Click "Start Bulk Search"
   - Watch as tabs open in the background
   - Wait a few moments, then click "Refresh" in the popup
   - Verify that data from multiple searches appears

5. **Test CSV Export**
   - After scraping some data, click "Export CSV"
   - Open the downloaded CSV file in Excel or Google Sheets
   - Verify all columns are present and data is correctly formatted

6. **Test Filtering**
   - Use the dropdown filters to filter by source and type
   - Verify the data list updates correctly

### Common Issues During Testing

- **No scrape button appears**: Check browser console (F12) for JavaScript errors
- **Button shows "No match"**: Verify the listing matches criteria (2025 build year or closed land lot)
- **No data in popup**: Check Chrome DevTools Application tab → Storage → Local Storage
- **Bulk search tabs don't open**: Check extension permissions in chrome://extensions/

### Browser Console Messages

The extension logs helpful debug messages. Open the browser console (F12) and look for:
- `[MLS Scraper]` prefix messages
- Any error messages in red
- Network requests to verify page loads

## Development

### File Structure
```
/
├── manifest.json           # Extension configuration
├── background.js          # Background service worker
├── content-realtor.js     # Content script for Realtor.com
├── content-loopnet.js     # Content script for LoopNet
├── content-mls.js         # Content script for MLS sites
├── popup.html             # Popup interface HTML
├── popup.css              # Popup interface styles
├── popup.js               # Popup interface logic
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

### Modifying for Other Sites

To add support for additional real estate websites:

1. **Add host permissions** in `manifest.json`:
```json
"host_permissions": [
  "https://newsite.com/*"
]
```

2. **Create a new content script** (e.g., `content-newsite.js`)
3. **Add the content script** to `manifest.json`:
```json
"content_scripts": [
  {
    "matches": ["https://newsite.com/*"],
    "js": ["content-newsite.js"]
  }
]
```

4. **Implement extraction functions** following the same pattern as existing scripts

### Customizing Criteria

To change what listings are captured, edit the extraction logic in the content scripts:

```javascript
// In content-realtor.js or content-mls.js
const isNewHome = yearBuilt && parseInt(yearBuilt) === currentYear;
const isClosedLandLot = (propertyType === 'land' || propertyType === 'lot') &&
                        (listingStatus === 'closed' || listingStatus === 'sold');

if (!isNewHome && !isClosedLandLot) {
  return null; // Skip this listing
}
```

## Contributing

Contributions are welcome! If you find a bug or want to add support for additional MLS platforms:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is provided as-is for personal use. Please ensure you comply with the terms of service of any websites you scrape.

## Disclaimer

This extension is designed for personal research and data collection purposes. Users are responsible for:
- Complying with website terms of service
- Respecting robots.txt and rate limiting
- Using collected data ethically and legally
- Following applicable real estate and privacy laws

Always ensure you have the right to scrape and use data from websites you visit.

## Support

If you encounter issues or have questions:
1. Check the Troubleshooting section above
2. Review the browser console for error messages
3. Open an issue on the GitHub repository

## Version History

### Version 1.1.0 (2025-11-04)
- Added LoopNet support for commercial real estate
- Added bulk search functionality
- Automatic search across multiple queries
- Enhanced CSV export as primary format
- Improved filtering with LoopNet option
- Background tab opening for bulk searches
- Configurable search delays

### Version 1.0.0 (2025-11-04)
- Initial release
- Support for Realtor.com
- Support for major MLS platforms
- Automatic and manual scraping
- JSON and CSV export
- Filter and search capabilities
