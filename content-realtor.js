// Content script for Realtor.com
(function() {
  'use strict';

  const currentYear = new Date().getFullYear();

  // Extract realtor information from the page
  function extractRealtorInfo() {
    const realtorData = {
      source: 'realtor.com',
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

      realtorData.listingInfo = {
        propertyType,
        yearBuilt,
        listingStatus,
        price,
        address
      };

      // Check if this listing matches our criteria
      const isNewHome = yearBuilt && parseInt(yearBuilt) === currentYear;
      const isClosedLandLot = (propertyType === 'land' || propertyType === 'lot') &&
                              (listingStatus === 'closed' || listingStatus === 'sold');

      if (!isNewHome && !isClosedLandLot) {
        console.log('[MLS Scraper] Listing does not match criteria - skipping');
        return null;
      }

      realtorData.listingInfo.matchesCriteria = isNewHome ? 'new_home' : 'closed_land_lot';

      // Extract realtor information
      const realtors = extractRealtors();
      realtorData.realtors = realtors;

      return realtorData;
    } catch (error) {
      console.error('[MLS Scraper] Error extracting data:', error);
      return null;
    }
  }

  function extractPropertyType() {
    // Look for property type in various locations
    const selectors = [
      '[data-testid="property-type"]',
      '.property-type',
      '[data-label="Property Type"]',
      'div:contains("Property Type")',
      '.ldp-detail-item:contains("Property Type")'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('land') || text.includes('lot')) return 'land';
        if (text.includes('single')) return 'single_family';
        if (text.includes('condo')) return 'condo';
        return text.trim();
      }
    }

    // Check URL for clues
    const url = window.location.href.toLowerCase();
    if (url.includes('land') || url.includes('lot')) return 'land';

    return 'unknown';
  }

  function extractYearBuilt() {
    // Look for year built information
    const selectors = [
      '[data-testid="year-built"]',
      '[data-label="Year Built"]',
      '.year-built'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const match = element.textContent.match(/\b(19|20)\d{2}\b/);
        if (match) return match[0];
      }
    }

    // Search in all text content for "Built in YYYY" or "Year Built: YYYY"
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
    // Look for listing status
    const selectors = [
      '[data-testid="listing-status"]',
      '.listing-status',
      '[data-label="Status"]',
      '.status-text'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('sold') || text.includes('closed')) return 'closed';
        if (text.includes('active')) return 'active';
        if (text.includes('pending')) return 'pending';
        return text.trim();
      }
    }

    return 'unknown';
  }

  function extractPrice() {
    const selectors = [
      '[data-testid="price"]',
      '.price',
      '[data-label="Price"]',
      '.listing-price'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }

    return null;
  }

  function extractAddress() {
    const selectors = [
      '[data-testid="address"]',
      '.address',
      '[data-label="Address"]',
      'h1.address'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }

    return null;
  }

  function extractRealtors() {
    const realtors = [];

    // Common realtor section selectors
    const realtorSections = [
      '[data-testid="agent-info"]',
      '.agent-info',
      '.agent-details',
      '[data-testid="listing-agent"]',
      '.listing-agent'
    ];

    const foundSections = [];
    for (const selector of realtorSections) {
      const elements = document.querySelectorAll(selector);
      foundSections.push(...Array.from(elements));
    }

    // Also search for individual agent cards
    const agentCards = document.querySelectorAll('[data-testid*="agent"], .agent-card, [class*="agent"]');
    foundSections.push(...Array.from(agentCards));

    // Deduplicate by creating a Set based on element content
    const uniqueSections = Array.from(new Set(foundSections));

    for (const section of uniqueSections) {
      const realtor = extractRealtorFromElement(section);
      if (realtor && realtor.name) {
        // Check if we already have this realtor (by name)
        if (!realtors.some(r => r.name === realtor.name)) {
          realtors.push(realtor);
        }
      }
    }

    return realtors;
  }

  function extractRealtorFromElement(element) {
    const realtor = {
      name: null,
      phone: null,
      email: null,
      company: null,
      licenseNumber: null
    };

    // Extract name
    const nameSelectors = [
      '[data-testid="agent-name"]',
      '.agent-name',
      '.realtor-name',
      'h3',
      'h4',
      '[class*="name"]'
    ];

    for (const selector of nameSelectors) {
      const nameEl = element.querySelector(selector);
      if (nameEl && nameEl.textContent.trim() && !realtor.name) {
        realtor.name = nameEl.textContent.trim();
        break;
      }
    }

    // Extract phone
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const text = element.textContent;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      realtor.phone = phoneMatch[0].trim();
    }

    // Also check href attributes for tel: links
    const telLink = element.querySelector('a[href^="tel:"]');
    if (telLink && !realtor.phone) {
      realtor.phone = telLink.href.replace('tel:', '').trim();
    }

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      realtor.email = emailMatch[0];
    }

    // Also check href attributes for mailto: links
    const mailtoLink = element.querySelector('a[href^="mailto:"]');
    if (mailtoLink && !realtor.email) {
      realtor.email = mailtoLink.href.replace('mailto:', '').trim();
    }

    // Extract company/brokerage
    const companySelectors = [
      '[data-testid="agent-company"]',
      '.company-name',
      '.brokerage',
      '[class*="company"]',
      '[class*="brokerage"]'
    ];

    for (const selector of companySelectors) {
      const companyEl = element.querySelector(selector);
      if (companyEl && companyEl.textContent.trim()) {
        realtor.company = companyEl.textContent.trim();
        break;
      }
    }

    // Extract license number if available
    const licenseRegex = /License[#:\s]+([A-Z0-9-]+)/i;
    const licenseMatch = text.match(licenseRegex);
    if (licenseMatch) {
      realtor.licenseNumber = licenseMatch[1];
    }

    return realtor;
  }

  // Add a button to manually trigger scraping
  function addScrapeButton() {
    // Check if button already exists
    if (document.getElementById('mls-scraper-button')) return;

    const button = document.createElement('button');
    button.id = 'mls-scraper-button';
    button.textContent = '🏠 Scrape Realtor Info';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      padding: 10px 15px;
      background: #0066cc;
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
        // Send to background script for storage
        chrome.runtime.sendMessage({
          action: 'saveRealtorData',
          data: data
        }, (response) => {
          if (response && response.success) {
            button.textContent = '✓ Saved!';
            button.style.background = '#00aa00';
            setTimeout(() => {
              button.textContent = '🏠 Scrape Realtor Info';
              button.style.background = '#0066cc';
              button.disabled = false;
            }, 2000);
          } else {
            button.textContent = '✗ Error';
            button.style.background = '#cc0000';
            setTimeout(() => {
              button.textContent = '🏠 Scrape Realtor Info';
              button.style.background = '#0066cc';
              button.disabled = false;
            }, 2000);
          }
        });
      } else {
        button.textContent = '✗ No match';
        button.style.background = '#cc6600';
        setTimeout(() => {
          button.textContent = '🏠 Scrape Realtor Info';
          button.style.background = '#0066cc';
          button.disabled = false;
        }, 2000);
      }
    });

    document.body.appendChild(button);
  }

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addScrapeButton);
  } else {
    addScrapeButton();
  }

  // Auto-scrape after a delay to ensure page is fully loaded
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
