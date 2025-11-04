// Content script for LoopNet.com
(function() {
  'use strict';

  const currentYear = new Date().getFullYear();

  // Extract realtor/broker information from the page
  function extractRealtorInfo() {
    const realtorData = {
      source: 'LoopNet',
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
      realtors: [],
      listingInfo: {}
    };

    try {
      // Extract listing information
      const propertyType = extractPropertyType();
      const yearBuilt = extractYearBuilt();
      const listingStatus = extractListingStatus();
      const price = extractPrice();
      const address = extractAddress();
      const loopNetId = extractLoopNetId();

      realtorData.listingInfo = {
        propertyType,
        yearBuilt,
        listingStatus,
        price,
        address,
        loopNetId
      };

      // Check if this listing matches our criteria
      const isNewProperty = yearBuilt && parseInt(yearBuilt) === currentYear;
      const isClosedLandLot = (propertyType === 'land' || propertyType === 'lot' || propertyType === 'vacant land') &&
                              (listingStatus === 'closed' || listingStatus === 'sold' || listingStatus === 'off market');

      if (!isNewProperty && !isClosedLandLot) {
        console.log('[MLS Scraper] LoopNet listing does not match criteria - skipping');
        return null;
      }

      realtorData.listingInfo.matchesCriteria = isNewProperty ? 'new_home' : 'closed_land_lot';

      // Extract broker/agent information
      const brokers = extractBrokers();
      realtorData.realtors = brokers;

      return realtorData;
    } catch (error) {
      console.error('[MLS Scraper] Error extracting LoopNet data:', error);
      return null;
    }
  }

  function extractPropertyType() {
    // LoopNet specific selectors
    const selectors = [
      '[data-testid="property-type"]',
      '.property-type',
      '[class*="PropertyType"]',
      '.breadcrumb-item',
      '[data-automation="property-type"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('land') || text.includes('lot') || text.includes('vacant')) return 'land';
        if (text.includes('office')) return 'office';
        if (text.includes('retail')) return 'retail';
        if (text.includes('industrial')) return 'industrial';
        if (text.includes('multifamily')) return 'multifamily';
        return text.trim();
      }
    }

    // Check URL for clues
    const url = window.location.href.toLowerCase();
    if (url.includes('land') || url.includes('lot')) return 'land';
    if (url.includes('office')) return 'office';
    if (url.includes('retail')) return 'retail';

    // Look in breadcrumbs
    const breadcrumbs = document.querySelectorAll('.breadcrumb-item, [class*="breadcrumb"]');
    for (const crumb of breadcrumbs) {
      const text = crumb.textContent.toLowerCase();
      if (text.includes('land')) return 'land';
      if (text.includes('office')) return 'office';
    }

    return 'commercial';
  }

  function extractYearBuilt() {
    // Look for year built in LoopNet listing details
    const selectors = [
      '[data-testid="year-built"]',
      '[data-automation="year-built"]',
      '[class*="YearBuilt"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const match = element.textContent.match(/\b(19|20)\d{2}\b/);
        if (match) return match[0];
      }
    }

    // Search in property details section
    const detailsSection = document.querySelector('.property-details, [class*="PropertyDetails"], [class*="property-info"]');
    if (detailsSection) {
      const patterns = [
        /Built:?\s*(\d{4})/i,
        /Year Built:?\s*(\d{4})/i,
        /Built in\s*(\d{4})/i,
        /Construction:?\s*(\d{4})/i
      ];

      const text = detailsSection.textContent;
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
    }

    // Search entire page
    const bodyText = document.body.textContent;
    const patterns = [
      /Built in (\d{4})/i,
      /Year Built:?\s*(\d{4})/i,
      /Built:?\s*(\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  function extractListingStatus() {
    // LoopNet status indicators
    const selectors = [
      '[data-testid="listing-status"]',
      '[data-automation="status"]',
      '.listing-status',
      '.status-badge',
      '[class*="Status"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('sold') || text.includes('closed') || text.includes('off market')) return 'closed';
        if (text.includes('active') || text.includes('available')) return 'active';
        if (text.includes('pending') || text.includes('under contract')) return 'pending';
        return text.trim();
      }
    }

    // Look for status badges
    const badges = document.querySelectorAll('.badge, .pill, [class*="badge"], [class*="pill"]');
    for (const badge of badges) {
      const text = badge.textContent.toLowerCase();
      if (text.includes('sold') || text.includes('closed')) return 'closed';
      if (text.includes('active') || text.includes('available')) return 'active';
    }

    return 'unknown';
  }

  function extractPrice() {
    const selectors = [
      '[data-testid="price"]',
      '[data-automation="price"]',
      '.price',
      '[class*="Price"]',
      '.listing-price'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.includes('$')) {
        return element.textContent.trim();
      }
    }

    // Look in prominent headings
    const headings = document.querySelectorAll('h1, h2, [class*="heading"]');
    for (const heading of headings) {
      if (heading.textContent.includes('$')) {
        const priceMatch = heading.textContent.match(/\$[\d,]+(?:\.\d{2})?/);
        if (priceMatch) return priceMatch[0];
      }
    }

    return null;
  }

  function extractAddress() {
    const selectors = [
      '[data-testid="address"]',
      '[data-automation="address"]',
      '.address',
      '[class*="Address"]',
      'h1[class*="property"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (/\d+/.test(text)) {
          return text;
        }
      }
    }

    // Check meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const content = ogTitle.getAttribute('content');
      if (content && /\d+/.test(content)) {
        return content.split('|')[0].trim();
      }
    }

    return null;
  }

  function extractLoopNetId() {
    // Extract LoopNet listing ID from URL or page
    const urlMatch = window.location.href.match(/\/listing\/(\d+)/i);
    if (urlMatch) return urlMatch[1];

    const idMatch = window.location.href.match(/id[=_-](\d+)/i);
    if (idMatch) return idMatch[1];

    return null;
  }

  function extractBrokers() {
    const brokers = [];

    // Look for broker/agent sections - LoopNet typically has broker contact info
    const brokerSections = [
      '[data-testid*="broker"]',
      '[data-automation*="broker"]',
      '[class*="broker"]',
      '[class*="agent"]',
      '[class*="contact"]',
      '.listing-broker',
      '.broker-info',
      '.agent-info'
    ];

    const foundSections = [];
    for (const selector of brokerSections) {
      const elements = document.querySelectorAll(selector);
      foundSections.push(...Array.from(elements));
    }

    // Also look for contact cards
    const contactCards = document.querySelectorAll('[class*="contact-card"], [class*="broker-card"]');
    foundSections.push(...Array.from(contactCards));

    // Deduplicate
    const uniqueSections = Array.from(new Set(foundSections));

    for (const section of uniqueSections) {
      const broker = extractBrokerFromElement(section);
      if (broker && broker.name) {
        if (!brokers.some(b => b.name === broker.name)) {
          brokers.push(broker);
        }
      }
    }

    // If no brokers found, try a more generic approach
    if (brokers.length === 0) {
      const genericBroker = extractBrokerGeneric();
      if (genericBroker && genericBroker.name) {
        brokers.push(genericBroker);
      }
    }

    return brokers;
  }

  function extractBrokerFromElement(element) {
    const broker = {
      name: null,
      phone: null,
      email: null,
      company: null,
      licenseNumber: null
    };

    const text = element.textContent;

    // Extract name
    const nameSelectors = [
      '[data-testid*="name"]',
      '[data-automation*="name"]',
      '[class*="name"]',
      'h3',
      'h4',
      'strong',
      'a[href*="broker"]',
      'a[href*="agent"]'
    ];

    for (const selector of nameSelectors) {
      const nameEl = element.querySelector(selector);
      if (nameEl && nameEl.textContent.trim() && !broker.name) {
        const name = nameEl.textContent.trim();
        // Basic validation - should look like a name (2-4 words, capitalized)
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(name)) {
          broker.name = name;
          break;
        }
      }
    }

    // If still no name, try pattern matching
    if (!broker.name) {
      const nameMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+){1,2})\b/);
      if (nameMatch) {
        broker.name = nameMatch[1];
      }
    }

    // Extract phone
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      broker.phone = phoneMatch[0].trim();
    }

    const telLink = element.querySelector('a[href^="tel:"]');
    if (telLink && !broker.phone) {
      broker.phone = telLink.href.replace('tel:', '').trim();
    }

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      broker.email = emailMatch[0];
    }

    const mailtoLink = element.querySelector('a[href^="mailto:"]');
    if (mailtoLink && !broker.email) {
      broker.email = mailtoLink.href.replace('mailto:', '').trim();
    }

    // Extract company
    const companySelectors = [
      '[data-testid*="company"]',
      '[data-automation*="company"]',
      '[class*="company"]',
      '[class*="brokerage"]',
      '.firm-name'
    ];

    for (const selector of companySelectors) {
      const companyEl = element.querySelector(selector);
      if (companyEl && companyEl.textContent.trim()) {
        broker.company = companyEl.textContent.trim();
        break;
      }
    }

    // Extract license
    const licenseRegex = /License[#:\s]+([A-Z0-9-]+)/i;
    const licenseMatch = text.match(licenseRegex);
    if (licenseMatch) {
      broker.licenseNumber = licenseMatch[1];
    }

    return broker;
  }

  function extractBrokerGeneric() {
    const broker = {
      name: null,
      phone: null,
      email: null,
      company: null,
      licenseNumber: null
    };

    // Look for any phone numbers on the page
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = document.body.textContent.match(phoneRegex);
    if (phones && phones.length > 0) {
      broker.phone = phones[0].trim();
    }

    // Look for any email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = document.body.textContent.match(emailRegex);
    if (emails && emails.length > 0) {
      // Filter out common non-broker emails
      const validEmail = emails.find(email =>
        !email.includes('noreply') &&
        !email.includes('support') &&
        !email.includes('info@loopnet')
      );
      if (validEmail) {
        broker.email = validEmail;
      }
    }

    // Look for broker names in common patterns
    const namePatterns = [
      /(?:Broker|Agent|Representative|Contact):?\s*([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+){1,2})/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(?:Broker|Agent|REALTOR)/i
    ];

    const bodyText = document.body.textContent;
    for (const pattern of namePatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        broker.name = match[1].trim();
        break;
      }
    }

    return broker;
  }

  // Add scrape button
  function addScrapeButton() {
    if (document.getElementById('mls-scraper-button')) return;

    const button = document.createElement('button');
    button.id = 'mls-scraper-button';
    button.textContent = '🏢 Scrape LoopNet Info';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      padding: 10px 15px;
      background: #ff6b35;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    button.addEventListener('click', async () => {
      button.textContent = '⏳ Scraping...';
      button.disabled = true;

      const data = extractRealtorInfo();

      if (data) {
        chrome.runtime.sendMessage({
          action: 'saveRealtorData',
          data: data
        }, (response) => {
          if (response && response.success) {
            button.textContent = '✓ Saved!';
            button.style.background = '#00aa00';
            setTimeout(() => {
              button.textContent = '🏢 Scrape LoopNet Info';
              button.style.background = '#ff6b35';
              button.disabled = false;
            }, 2000);
          } else {
            button.textContent = '✗ Error';
            button.style.background = '#cc0000';
            setTimeout(() => {
              button.textContent = '🏢 Scrape LoopNet Info';
              button.style.background = '#ff6b35';
              button.disabled = false;
            }, 2000);
          }
        });
      } else {
        button.textContent = '✗ No match';
        button.style.background = '#cc6600';
        setTimeout(() => {
          button.textContent = '🏢 Scrape LoopNet Info';
          button.style.background = '#ff6b35';
          button.disabled = false;
        }, 2000);
      }
    });

    document.body.appendChild(button);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addScrapeButton);
  } else {
    addScrapeButton();
  }

  // Auto-scrape after delay
  setTimeout(() => {
    const data = extractRealtorInfo();
    if (data) {
      chrome.runtime.sendMessage({
        action: 'saveRealtorData',
        data: data
      });
    }
  }, 3000);

})();
