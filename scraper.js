const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CURRENT_YEAR = new Date().getFullYear();

// Configuration
const CONFIG = {
  headless: false, // Set to true to hide browser
  timeout: 30000,
  delay: 2000, // Delay between actions to avoid detection
  maxListingsPerSearch: 50, // Limit listings per search
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Store all scraped data
let allData = [];

async function main() {
  console.log('🚀 Starting Realtor Scraper...\n');

  // Load search queries
  const queries = loadQueries();
  if (queries.length === 0) {
    console.error('❌ No queries found in queries.json');
    console.log('Create a queries.json file with your search terms.');
    return;
  }

  console.log(`📋 Found ${queries.length} search queries\n`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Query ${i + 1}/${queries.length}: "${query}"`);
      console.log('='.repeat(60));

      await scrapeRealtorSearch(browser, query);

      // Delay between searches
      await sleep(CONFIG.delay);
    }

    // Export results
    console.log('\n' + '='.repeat(60));
    console.log('✅ Scraping complete!');
    console.log('='.repeat(60));
    console.log(`📊 Total listings scraped: ${allData.length}`);

    if (allData.length > 0) {
      exportToCSV(allData);
      exportToJSON(allData);
    } else {
      console.log('⚠️  No matching listings found.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🎉 Done!');
  }
}

async function scrapeRealtorSearch(browser, query) {
  const page = await browser.newPage();

  try {
    // Set user agent
    await page.setUserAgent(CONFIG.userAgent);

    // Go to Realtor.com
    console.log('  📍 Navigating to Realtor.com...');
    await page.goto('https://www.realtor.com/', {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });

    await sleep(1000);

    // Find and fill search box
    console.log('  🔎 Searching for:', query);
    const searchBoxSelector = 'input[placeholder*="Address"], input[placeholder*="City"], input[id*="search"], input[aria-label*="Search"]';

    await page.waitForSelector(searchBoxSelector, { timeout: 10000 });
    await page.type(searchBoxSelector, query, { delay: 100 });
    await sleep(500);

    // Press Enter or click search button
    await page.keyboard.press('Enter');

    // Wait for search results
    console.log('  ⏳ Waiting for search results...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    await sleep(2000);

    // Get all listing links on the page
    const listingLinks = await getListingLinks(page);
    console.log(`  📋 Found ${listingLinks.length} listings on page`);

    if (listingLinks.length === 0) {
      console.log('  ⚠️  No listings found for this search');
      return;
    }

    // Limit listings
    const linksToScrape = listingLinks.slice(0, CONFIG.maxListingsPerSearch);
    console.log(`  🎯 Will scrape ${linksToScrape.length} listings\n`);

    // Visit each listing
    for (let i = 0; i < linksToScrape.length; i++) {
      const link = linksToScrape[i];
      console.log(`  [${i + 1}/${linksToScrape.length}] Scraping: ${link.substring(0, 60)}...`);

      try {
        const listingData = await scrapeListing(browser, link);

        if (listingData) {
          // Check if it matches our criteria
          if (matchesCriteria(listingData)) {
            console.log(`    ✅ Match! Type: ${listingData.matchType}`);
            allData.push(listingData);
          } else {
            console.log(`    ⏭️  Skip - doesn't match criteria`);
          }
        } else {
          console.log(`    ⚠️  Failed to scrape`);
        }
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }

      await sleep(CONFIG.delay);
    }

  } catch (error) {
    console.error('  ❌ Error in search:', error.message);
  } finally {
    await page.close();
  }
}

async function getListingLinks(page) {
  return await page.evaluate(() => {
    const links = new Set();

    // Try various selectors for listing links
    const selectors = [
      'a[href*="/realestateandhomes-detail/"]',
      'a.CardContent__StyledCardContent',
      'a[data-testid="property-card-link"]',
      'div[data-testid="property-card"] a',
      '.PropertyCard a[href*="/realestateandhomes-detail/"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const href = el.href;
        if (href && href.includes('/realestateandhomes-detail/')) {
          links.add(href);
        }
      });
    }

    return Array.from(links);
  });
}

async function scrapeListing(browser, url) {
  const page = await browser.newPage();

  try {
    await page.setUserAgent(CONFIG.userAgent);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    await sleep(1500);

    // Extract all data from the page
    const data = await page.evaluate((currentYear) => {
      const result = {
        url: window.location.href,
        scrapedAt: new Date().toISOString(),
        address: null,
        price: null,
        propertyType: null,
        yearBuilt: null,
        status: null,
        realtors: []
      };

      // Extract address
      const addressSelectors = [
        'h1.address',
        '[data-testid="property-address"]',
        'h1[class*="address"]',
        '.listing-address'
      ];
      for (const sel of addressSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          result.address = el.textContent.trim();
          break;
        }
      }

      // Extract price
      const priceSelectors = [
        '[data-testid="list-price"]',
        '.price',
        '[class*="price"]'
      ];
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.includes('$')) {
          result.price = el.textContent.trim();
          break;
        }
      }

      // Extract property type
      const bodyText = document.body.textContent.toLowerCase();
      if (bodyText.includes('land') || bodyText.includes('lot') || bodyText.includes('vacant')) {
        result.propertyType = 'land';
      } else if (bodyText.includes('single family')) {
        result.propertyType = 'single_family';
      } else {
        result.propertyType = 'unknown';
      }

      // Extract year built
      const yearPattern = /(?:built|year built|construction)[\s:]*(\d{4})/i;
      const yearMatch = document.body.textContent.match(yearPattern);
      if (yearMatch) {
        result.yearBuilt = yearMatch[1];
      }

      // Extract status
      if (bodyText.includes('sold') || bodyText.includes('closed')) {
        result.status = 'closed';
      } else if (bodyText.includes('active') || bodyText.includes('for sale')) {
        result.status = 'active';
      } else {
        result.status = 'unknown';
      }

      // Extract realtor info
      const agentSections = document.querySelectorAll('[class*="agent"], [class*="broker"], [data-testid*="agent"]');

      const realtors = [];
      agentSections.forEach(section => {
        const realtor = {
          name: null,
          phone: null,
          email: null,
          company: null
        };

        const text = section.textContent;

        // Extract name
        const nameEl = section.querySelector('[class*="name"], h3, h4, strong');
        if (nameEl) {
          realtor.name = nameEl.textContent.trim();
        }

        // Extract phone
        const phoneMatch = text.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
        if (phoneMatch) {
          realtor.phone = phoneMatch[0];
        }

        // Extract email
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          realtor.email = emailMatch[0];
        }

        // Extract company
        const companyEl = section.querySelector('[class*="company"], [class*="brokerage"]');
        if (companyEl) {
          realtor.company = companyEl.textContent.trim();
        }

        if (realtor.name) {
          realtors.push(realtor);
        }
      });

      result.realtors = realtors;
      return result;
    }, CURRENT_YEAR);

    return data;

  } catch (error) {
    console.error('    Error scraping listing:', error.message);
    return null;
  } finally {
    await page.close();
  }
}

function matchesCriteria(data) {
  // Check if it's a new home (built in current year)
  if (data.yearBuilt && parseInt(data.yearBuilt) === CURRENT_YEAR) {
    data.matchType = 'new_home_2025';
    return true;
  }

  // Check if it's a closed land lot
  if (data.propertyType === 'land' && data.status === 'closed') {
    data.matchType = 'closed_land_lot';
    return true;
  }

  return false;
}

function loadQueries() {
  const queriesPath = path.join(__dirname, 'queries.json');

  if (!fs.existsSync(queriesPath)) {
    console.log('Creating default queries.json file...');
    const defaultQueries = [
      "Los Angeles CA new homes 2025",
      "San Francisco CA land for sale"
    ];
    fs.writeFileSync(queriesPath, JSON.stringify(defaultQueries, null, 2));
    return defaultQueries;
  }

  const content = fs.readFileSync(queriesPath, 'utf8');
  return JSON.parse(content);
}

function exportToCSV(data) {
  const csvRows = [];

  // Header
  csvRows.push([
    'Address',
    'Price',
    'Property Type',
    'Year Built',
    'Status',
    'Match Type',
    'Realtor Name',
    'Realtor Phone',
    'Realtor Email',
    'Realtor Company',
    'URL',
    'Scraped At'
  ].join(','));

  // Data rows
  data.forEach(listing => {
    if (listing.realtors.length > 0) {
      listing.realtors.forEach(realtor => {
        csvRows.push([
          escapeCsv(listing.address),
          escapeCsv(listing.price),
          escapeCsv(listing.propertyType),
          escapeCsv(listing.yearBuilt),
          escapeCsv(listing.status),
          escapeCsv(listing.matchType),
          escapeCsv(realtor.name),
          escapeCsv(realtor.phone),
          escapeCsv(realtor.email),
          escapeCsv(realtor.company),
          escapeCsv(listing.url),
          escapeCsv(listing.scrapedAt)
        ].join(','));
      });
    } else {
      csvRows.push([
        escapeCsv(listing.address),
        escapeCsv(listing.price),
        escapeCsv(listing.propertyType),
        escapeCsv(listing.yearBuilt),
        escapeCsv(listing.status),
        escapeCsv(listing.matchType),
        '',
        '',
        '',
        '',
        escapeCsv(listing.url),
        escapeCsv(listing.scrapedAt)
      ].join(','));
    }
  });

  const filename = `realtor-data-${Date.now()}.csv`;
  fs.writeFileSync(filename, csvRows.join('\n'));
  console.log(`\n💾 Saved to: ${filename}`);
}

function exportToJSON(data) {
  const filename = `realtor-data-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`💾 Saved to: ${filename}`);
}

function escapeCsv(value) {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the scraper
main().catch(console.error);
