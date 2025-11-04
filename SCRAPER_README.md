# Realtor.com Automated Scraper

A fully automated Puppeteer-based scraper that searches Realtor.com, clicks through listings, and extracts realtor contact information from homes built in 2025 and closed land lots.

## What This Does

**Full automation:**
1. Reads your search queries from `queries.json`
2. For each query:
   - Goes to Realtor.com
   - Searches for the query
   - Clicks through each listing on the results page
   - Extracts realtor contact info
   - Only saves listings that match criteria:
     - Homes built in 2025 OR
     - Closed/sold land lots
3. Exports all data to CSV and JSON

## Installation

```bash
# Install Node.js dependencies
npm install
```

This will install:
- `puppeteer` - Browser automation
- `csv-writer` - CSV export (if needed)

## Configuration

### 1. Edit Search Queries

Edit `queries.json` with your searches:

```json
[
  "Los Angeles CA new homes 2025",
  "San Francisco CA land for sale",
  "Miami FL new construction",
  "Austin TX vacant land"
]
```

### 2. Adjust Settings (Optional)

In `scraper.js`, modify the `CONFIG` object:

```javascript
const CONFIG = {
  headless: false,           // true = hide browser, false = show browser
  timeout: 30000,            // Page load timeout (30 seconds)
  delay: 2000,               // Delay between actions (2 seconds)
  maxListingsPerSearch: 50,  // Max listings to scrape per search
  userAgent: '...'           // Browser user agent
};
```

## Usage

### Run the Scraper

```bash
npm start
# or
node scraper.js
```

### What You'll See

```
🚀 Starting Realtor Scraper...

📋 Found 4 search queries

============================================================
🔍 Query 1/4: "Los Angeles CA new homes 2025"
============================================================
  📍 Navigating to Realtor.com...
  🔎 Searching for: Los Angeles CA new homes 2025
  ⏳ Waiting for search results...
  📋 Found 25 listings on page
  🎯 Will scrape 25 listings

  [1/25] Scraping: https://www.realtor.com/realestateandhomes-detail/...
    ✅ Match! Type: new_home_2025
  [2/25] Scraping: https://www.realtor.com/realestateandhomes-detail/...
    ⏭️  Skip - doesn't match criteria
  ...

============================================================
✅ Scraping complete!
============================================================
📊 Total listings scraped: 12

💾 Saved to: realtor-data-1699999999999.csv
💾 Saved to: realtor-data-1699999999999.json

🎉 Done!
```

## Output Files

### CSV Format
Opens in Excel/Google Sheets with columns:
- Address
- Price
- Property Type
- Year Built
- Status
- Match Type (new_home_2025 or closed_land_lot)
- Realtor Name
- Realtor Phone
- Realtor Email
- Realtor Company
- URL
- Scraped At

**Note:** If a listing has multiple realtors, you'll get one row per realtor.

### JSON Format
Complete structured data for programmatic use.

## Matching Criteria

The scraper **only saves listings that match**:

1. **New Homes**: `yearBuilt === 2025` (current year)
2. **Closed Land Lots**: `propertyType === 'land'` AND `status === 'closed'`

All other listings are skipped.

## How It Works

### 1. Search Automation
```javascript
// Goes to realtor.com
// Finds search box
// Types your query
// Presses Enter
// Waits for results
```

### 2. Link Extraction
```javascript
// Finds all listing links on the page
// Uses multiple selectors to ensure it finds them:
// - a[href*="/realestateandhomes-detail/"]
// - a.CardContent__StyledCardContent
// - etc.
```

### 3. Listing Scraping
```javascript
// Opens each listing in new tab
// Extracts:
// - Address, price, property type
// - Year built (regex search)
// - Status (sold, active, etc.)
// - Realtor name, phone, email, company
```

### 4. Filtering
```javascript
// Checks if yearBuilt === 2025 OR
// (propertyType === land AND status === closed)
// Only saves matches
```

## Troubleshooting

### "Error: Could not find Chrome"
Install Chromium:
```bash
npx puppeteer browsers install chrome
```

### No listings found
- Check that your search query is valid on Realtor.com
- Try broader searches first ("Los Angeles homes")
- Website HTML may have changed (see Updating Selectors below)

### Scraper is too slow
Increase speed in `CONFIG`:
```javascript
delay: 1000,  // Reduce to 1 second (but risks detection)
```

### Getting blocked/detected
Slow it down:
```javascript
headless: false,  // Show the browser (less suspicious)
delay: 3000,      // Increase delay to 3 seconds
```

### Not finding realtor info
Website HTML may have changed. Update selectors in `scrapeListing()` function:
```javascript
const agentSections = document.querySelectorAll(
  '[class*="agent"]',
  '[class*="broker"]',
  // Add more selectors here
);
```

## Updating Selectors

If Realtor.com changes their HTML, you'll need to update selectors:

1. **Open a listing on Realtor.com**
2. **Right-click → Inspect**
3. **Find the realtor section**
4. **Note the class names/attributes**
5. **Update in `scraper.js`:**

```javascript
// Line ~170 in scrapeListing()
const agentSections = document.querySelectorAll(
  '[class*="YOUR_NEW_SELECTOR"]',  // Add this
  '[class*="agent"]',
  '[class*="broker"]'
);
```

## Limitations

- **No pagination yet**: Only scrapes first page of results (up to maxListingsPerSearch)
- **Realtor.com only**: LoopNet support not implemented yet
- **Detection risk**: Running too fast may trigger anti-bot measures
- **Selector fragility**: If website changes, selectors break

## Adding Pagination

To scrape multiple pages of results, add this after the listing loop in `scrapeRealtorSearch()`:

```javascript
// Check for "Next" button
const hasNextPage = await page.$('a[aria-label="Go to next page"]');
if (hasNextPage) {
  await hasNextPage.click();
  await page.waitForNavigation();
  // Recursively scrape next page
}
```

## Adding LoopNet Support

Create `scrapeLoopNetSearch()` function following the same pattern:
1. Navigate to loopnet.com
2. Search
3. Extract listing links (different selectors)
4. Click through listings
5. Extract broker info

## Best Practices

1. **Start small**: Test with 1-2 queries first
2. **Use delays**: Don't scrape too fast (2-3 seconds between listings)
3. **Check output**: Verify CSV has correct data before big runs
4. **Respect robots.txt**: This is for personal research only
5. **Backup data**: Save your CSV files regularly

## Legal & Ethical

⚠️ **Important:**
- This scraper is for **personal research** only
- Check Realtor.com's Terms of Service
- Respect rate limits (use delays)
- Don't use data for commercial purposes without permission
- Don't redistribute scraped data

## Next Steps

Want to enhance this? Add:
- ✅ Pagination support (scrape all result pages)
- ✅ LoopNet integration
- ✅ MLS platform support
- ✅ Proxy rotation (avoid detection)
- ✅ Retry logic for failed requests
- ✅ Database storage (SQLite/PostgreSQL)
- ✅ Email notifications when done
- ✅ Duplicate detection

Let me know what features you need!

## Support

If you encounter errors:
1. Check the console output for error messages
2. Try running in non-headless mode (`headless: false`)
3. Inspect the website manually to see if HTML changed
4. Update selectors as needed

---

**Version:** 1.0.0
**Last Updated:** 2025-11-04
