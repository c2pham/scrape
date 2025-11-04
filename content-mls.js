// Content script for MLS websites
(function() {
  'use strict';

  const currentYear = new Date().getFullYear();

  // Extract realtor information from MLS pages
  function extractRealtorInfo() {
    const realtorData = {
      source: 'MLS',
      mlsProvider: identifyMLSProvider(),
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
      const mlsNumber = extractMLSNumber();

      realtorData.listingInfo = {
        propertyType,
        yearBuilt,
        listingStatus,
        price,
        address,
        mlsNumber
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

  function identifyMLSProvider() {
    const hostname = window.location.hostname;
    if (hostname.includes('mlslistings.com')) return 'MLSListings';
    if (hostname.includes('mls.com')) return 'MLS.com';
    if (hostname.includes('brightmls')) return 'BrightMLS';
    if (hostname.includes('crmls')) return 'CRMLS';
    if (hostname.includes('flexmls')) return 'FlexMLS';
    if (hostname.includes('matrix')) return 'Matrix';
    return hostname;
  }

  function extractPropertyType() {
    // Generic selectors that work across many MLS platforms
    const selectors = [
      '[data-label*="Property Type"]',
      '[data-field*="PropertyType"]',
      '.property-type',
      '.prop-type',
      'td:contains("Property Type") + td',
      'th:contains("Property Type") + td',
      '[class*="propertyType"]',
      'label:contains("Property Type") + *'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('land') || text.includes('lot') || text.includes('vacant')) return 'land';
        if (text.includes('single') || text.includes('residential')) return 'single_family';
        if (text.includes('condo')) return 'condo';
        return text.trim();
      }
    }

    // Search in labels and their next siblings
    const labels = document.querySelectorAll('label, th, .label, [class*="label"]');
    for (const label of labels) {
      if (label.textContent.toLowerCase().includes('property type')) {
        const value = label.nextElementSibling || label.parentElement.querySelector('td, .value, [class*="value"]');
        if (value) {
          const text = value.textContent.toLowerCase();
          if (text.includes('land') || text.includes('lot')) return 'land';
          if (text.includes('single')) return 'single_family';
          return text.trim();
        }
      }
    }

    // Check URL
    const url = window.location.href.toLowerCase();
    if (url.includes('land') || url.includes('lot')) return 'land';

    return 'unknown';
  }

  function extractYearBuilt() {
    // Generic selectors for year built
    const selectors = [
      '[data-label*="Year Built"]',
      '[data-field*="YearBuilt"]',
      '.year-built',
      '[class*="yearBuilt"]',
      'td:contains("Year Built") + td',
      'th:contains("Year Built") + td'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const match = element.textContent.match(/\b(19|20)\d{2}\b/);
        if (match) return match[0];
      }
    }

    // Search in labels
    const labels = document.querySelectorAll('label, th, .label, dt, [class*="label"]');
    for (const label of labels) {
      const labelText = label.textContent.toLowerCase();
      if (labelText.includes('year built') || labelText === 'built' || labelText.includes('yr built')) {
        let value = label.nextElementSibling;
        if (!value) {
          value = label.parentElement.querySelector('td, dd, .value, [class*="value"]');
        }
        if (value) {
          const match = value.textContent.match(/\b(19|20)\d{2}\b/);
          if (match) return match[0];
        }
      }
    }

    // Search entire page text
    const bodyText = document.body.textContent;
    const patterns = [
      /Built in (\d{4})/i,
      /Year Built:?\s*(\d{4})/i,
      /Built:?\s*(\d{4})/i,
      /Yr Built:?\s*(\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  function extractListingStatus() {
    const selectors = [
      '[data-label*="Status"]',
      '[data-field*="Status"]',
      '.listing-status',
      '.status',
      '[class*="status"]',
      'td:contains("Status") + td',
      'th:contains("Status") + td'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('sold') || text.includes('closed')) return 'closed';
        if (text.includes('active')) return 'active';
        if (text.includes('pending')) return 'pending';
        if (text.includes('contingent')) return 'contingent';
        return text.trim();
      }
    }

    // Check for status badges or pills
    const badges = document.querySelectorAll('.badge, .pill, .tag, [class*="badge"], [class*="pill"]');
    for (const badge of badges) {
      const text = badge.textContent.toLowerCase();
      if (text.includes('sold') || text.includes('closed')) return 'closed';
      if (text.includes('active')) return 'active';
    }

    return 'unknown';
  }

  function extractPrice() {
    const selectors = [
      '[data-label*="Price"]',
      '[data-field*="Price"]',
      '.price',
      '[class*="price"]',
      'td:contains("Price") + td',
      'th:contains("List Price") + td'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text.includes('$')) return text;
      }
    }

    // Look for dollar amounts in prominent locations
    const priceRegex = /\$[\d,]+/;
    const headings = document.querySelectorAll('h1, h2, .heading, [class*="heading"]');
    for (const heading of headings) {
      const match = heading.textContent.match(priceRegex);
      if (match) return match[0];
    }

    return null;
  }

  function extractAddress() {
    const selectors = [
      '[data-label*="Address"]',
      '[data-field*="Address"]',
      '.address',
      '[class*="address"]',
      'h1',
      '.listing-address'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        // Basic validation - should contain at least a number
        if (/\d+/.test(text)) {
          return text;
        }
      }
    }

    return null;
  }

  function extractMLSNumber() {
    const selectors = [
      '[data-label*="MLS"]',
      '[data-label*="MLS#"]',
      '[data-field*="MLSNumber"]',
      '.mls-number',
      '[class*="mlsNumber"]',
      'td:contains("MLS") + td',
      'th:contains("MLS#") + td'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }

    // Search in text for "MLS# XXXXXX" pattern
    const mlsRegex = /MLS[#\s:]+([A-Z0-9-]+)/i;
    const match = document.body.textContent.match(mlsRegex);
    if (match) return match[1];

    // Check URL for MLS number
    const urlMatch = window.location.href.match(/mls[=_-]?(\d+)/i);
    if (urlMatch) return urlMatch[1];

    return null;
  }

  function extractRealtors() {
    const realtors = [];

    // Look for agent/realtor sections
    const agentSections = document.querySelectorAll(`
      [data-label*="Agent"],
      [data-label*="Listing Agent"],
      [class*="agent"],
      [class*="realtor"],
      .listing-agent,
      [id*="agent"]
    `.trim());

    for (const section of agentSections) {
      const realtor = extractRealtorFromElement(section);
      if (realtor && realtor.name) {
        if (!realtors.some(r => r.name === realtor.name)) {
          realtors.push(realtor);
        }
      }
    }

    // Also search for table rows or divs that contain "Listing Agent" or "Agent"
    const labels = document.querySelectorAll('label, th, dt, [class*="label"]');
    for (const label of labels) {
      const labelText = label.textContent.toLowerCase();
      if (labelText.includes('listing agent') || labelText.includes('agent name') ||
          labelText === 'agent' || labelText.includes('listed by')) {

        let container = label.closest('tr, .row, dl, [class*="field"]');
        if (!container) container = label.parentElement;

        const realtor = extractRealtorFromElement(container);
        if (realtor && realtor.name) {
          if (!realtors.some(r => r.name === realtor.name)) {
            realtors.push(realtor);
          }
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

    const text = element.textContent;

    // Extract name - look for specific fields or use heuristics
    const nameSelectors = [
      '[data-label*="Name"]',
      '[data-field*="AgentName"]',
      '.agent-name',
      '[class*="agentName"]',
      'td:contains("Name") + td',
      'a[href*="agent"]'
    ];

    for (const selector of nameSelectors) {
      const nameEl = element.querySelector(selector);
      if (nameEl && nameEl.textContent.trim()) {
        realtor.name = nameEl.textContent.trim();
        break;
      }
    }

    // If no name found, try to extract from the element's text
    if (!realtor.name) {
      // Look for text that looks like a name (2-3 capitalized words)
      const nameMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
      if (nameMatch) {
        realtor.name = nameMatch[1];
      }
    }

    // Extract phone
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      realtor.phone = phoneMatch[0].trim();
    }

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

    const mailtoLink = element.querySelector('a[href^="mailto:"]');
    if (mailtoLink && !realtor.email) {
      realtor.email = mailtoLink.href.replace('mailto:', '').trim();
    }

    // Extract company
    const companySelectors = [
      '[data-label*="Company"]',
      '[data-label*="Brokerage"]',
      '[data-field*="Company"]',
      '.company',
      '.brokerage',
      '[class*="company"]'
    ];

    for (const selector of companySelectors) {
      const companyEl = element.querySelector(selector);
      if (companyEl && companyEl.textContent.trim()) {
        realtor.company = companyEl.textContent.trim();
        break;
      }
    }

    // Extract license
    const licenseRegex = /License[#:\s]+([A-Z0-9-]+)/i;
    const licenseMatch = text.match(licenseRegex);
    if (licenseMatch) {
      realtor.licenseNumber = licenseMatch[1];
    }

    return realtor;
  }

  // Add scrape button
  function addScrapeButton() {
    if (document.getElementById('mls-scraper-button')) return;

    const button = document.createElement('button');
    button.id = 'mls-scraper-button';
    button.textContent = '🏠 Scrape MLS Info';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      padding: 10px 15px;
      background: #009933;
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
              button.textContent = '🏠 Scrape MLS Info';
              button.style.background = '#009933';
              button.disabled = false;
            }, 2000);
          } else {
            button.textContent = '✗ Error';
            button.style.background = '#cc0000';
            setTimeout(() => {
              button.textContent = '🏠 Scrape MLS Info';
              button.style.background = '#009933';
              button.disabled = false;
            }, 2000);
          }
        });
      } else {
        button.textContent = '✗ No match';
        button.style.background = '#cc6600';
        setTimeout(() => {
          button.textContent = '🏠 Scrape MLS Info';
          button.style.background = '#009933';
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
