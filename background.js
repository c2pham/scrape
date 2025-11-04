// Background service worker for managing scraped data
chrome.runtime.onInstalled.addListener(() => {
  console.log('MLS & Realtor.com Scraper extension installed');

  // Initialize storage
  chrome.storage.local.get(['realtorData'], (result) => {
    if (!result.realtorData) {
      chrome.storage.local.set({ realtorData: [] });
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveRealtorData') {
    saveRealtorData(request.data).then((success) => {
      sendResponse({ success: success });
    });
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'getRealtorData') {
    getRealtorData(request.filters).then((data) => {
      sendResponse({ data: data });
    });
    return true;
  }

  if (request.action === 'clearRealtorData') {
    clearRealtorData().then((success) => {
      sendResponse({ success: success });
    });
    return true;
  }

  if (request.action === 'deleteRealtorEntry') {
    deleteRealtorEntry(request.index).then((success) => {
      sendResponse({ success: success });
    });
    return true;
  }

  if (request.action === 'exportRealtorData') {
    exportRealtorData(request.format).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'startBulkSearch') {
    startBulkSearch(request.queries, request.sites, request.delay).then((success) => {
      sendResponse({ success: success });
    });
    return true;
  }
});

// Save realtor data to storage
async function saveRealtorData(data) {
  try {
    const result = await chrome.storage.local.get(['realtorData']);
    const realtorData = result.realtorData || [];

    // Check for duplicates based on URL
    const existingIndex = realtorData.findIndex(item => item.url === data.url);

    if (existingIndex !== -1) {
      // Update existing entry
      realtorData[existingIndex] = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      console.log('Updated existing realtor data entry');
    } else {
      // Add new entry
      realtorData.push(data);
      console.log('Added new realtor data entry');
    }

    await chrome.storage.local.set({ realtorData: realtorData });

    // Update badge to show count
    chrome.action.setBadgeText({ text: realtorData.length.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#0066cc' });

    return true;
  } catch (error) {
    console.error('Error saving realtor data:', error);
    return false;
  }
}

// Get realtor data with optional filters
async function getRealtorData(filters = {}) {
  try {
    const result = await chrome.storage.local.get(['realtorData']);
    let realtorData = result.realtorData || [];

    // Apply filters
    if (filters.source) {
      realtorData = realtorData.filter(item =>
        item.source.toLowerCase().includes(filters.source.toLowerCase())
      );
    }

    if (filters.matchType) {
      realtorData = realtorData.filter(item =>
        item.listingInfo.matchesCriteria === filters.matchType
      );
    }

    if (filters.fromDate) {
      realtorData = realtorData.filter(item =>
        new Date(item.scrapedAt) >= new Date(filters.fromDate)
      );
    }

    return realtorData;
  } catch (error) {
    console.error('Error getting realtor data:', error);
    return [];
  }
}

// Clear all realtor data
async function clearRealtorData() {
  try {
    await chrome.storage.local.set({ realtorData: [] });
    chrome.action.setBadgeText({ text: '' });
    console.log('Cleared all realtor data');
    return true;
  } catch (error) {
    console.error('Error clearing realtor data:', error);
    return false;
  }
}

// Delete a specific realtor entry by index
async function deleteRealtorEntry(index) {
  try {
    const result = await chrome.storage.local.get(['realtorData']);
    const realtorData = result.realtorData || [];

    if (index >= 0 && index < realtorData.length) {
      realtorData.splice(index, 1);
      await chrome.storage.local.set({ realtorData: realtorData });

      // Update badge
      if (realtorData.length > 0) {
        chrome.action.setBadgeText({ text: realtorData.length.toString() });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }

      console.log('Deleted realtor entry at index:', index);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting realtor entry:', error);
    return false;
  }
}

// Export realtor data in various formats
async function exportRealtorData(format = 'json') {
  try {
    const result = await chrome.storage.local.get(['realtorData']);
    const realtorData = result.realtorData || [];

    if (realtorData.length === 0) {
      return { success: false, message: 'No data to export' };
    }

    if (format === 'json') {
      const jsonStr = JSON.stringify(realtorData, null, 2);
      return {
        success: true,
        data: jsonStr,
        filename: `realtor-data-${Date.now()}.json`,
        mimeType: 'application/json'
      };
    }

    if (format === 'csv') {
      const csv = convertToCSV(realtorData);
      return {
        success: true,
        data: csv,
        filename: `realtor-data-${Date.now()}.csv`,
        mimeType: 'text/csv'
      };
    }

    return { success: false, message: 'Unsupported format' };
  } catch (error) {
    console.error('Error exporting realtor data:', error);
    return { success: false, message: error.message };
  }
}

// Convert data to CSV format
function convertToCSV(data) {
  const rows = [];

  // Header row
  rows.push([
    'Source',
    'URL',
    'Scraped At',
    'Match Type',
    'Property Type',
    'Year Built',
    'Status',
    'Price',
    'Address',
    'MLS Number',
    'Realtor Name',
    'Realtor Phone',
    'Realtor Email',
    'Realtor Company',
    'License Number'
  ].join(','));

  // Data rows - flatten realtors
  for (const entry of data) {
    const base = [
      escapeCsvValue(entry.source),
      escapeCsvValue(entry.url),
      escapeCsvValue(entry.scrapedAt),
      escapeCsvValue(entry.listingInfo.matchesCriteria || ''),
      escapeCsvValue(entry.listingInfo.propertyType || ''),
      escapeCsvValue(entry.listingInfo.yearBuilt || ''),
      escapeCsvValue(entry.listingInfo.listingStatus || ''),
      escapeCsvValue(entry.listingInfo.price || ''),
      escapeCsvValue(entry.listingInfo.address || ''),
      escapeCsvValue(entry.listingInfo.mlsNumber || '')
    ];

    if (entry.realtors && entry.realtors.length > 0) {
      // Create a row for each realtor
      for (const realtor of entry.realtors) {
        const row = [
          ...base,
          escapeCsvValue(realtor.name || ''),
          escapeCsvValue(realtor.phone || ''),
          escapeCsvValue(realtor.email || ''),
          escapeCsvValue(realtor.company || ''),
          escapeCsvValue(realtor.licenseNumber || '')
        ];
        rows.push(row.join(','));
      }
    } else {
      // No realtors found
      const row = [...base, '', '', '', '', ''];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If contains comma, newline, or quotes, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

// Bulk search functionality
async function startBulkSearch(queries, sites, delay) {
  try {
    console.log(`Starting bulk search for ${queries.length} queries`);

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`Processing query ${i + 1}/${queries.length}: ${query}`);

      // Search on Realtor.com
      if (sites.realtor) {
        const realtorUrl = buildRealtorSearchUrl(query);
        await chrome.tabs.create({
          url: realtorUrl,
          active: false
        });

        // Wait for delay before next search
        if (i < queries.length - 1 || sites.loopnet) {
          await sleep(delay);
        }
      }

      // Search on LoopNet
      if (sites.loopnet) {
        const loopnetUrl = buildLoopNetSearchUrl(query);
        await chrome.tabs.create({
          url: loopnetUrl,
          active: false
        });

        // Wait for delay before next search
        if (i < queries.length - 1) {
          await sleep(delay);
        }
      }
    }

    console.log('Bulk search completed');
    return true;
  } catch (error) {
    console.error('Error in bulk search:', error);
    return false;
  }
}

// Build Realtor.com search URL
function buildRealtorSearchUrl(query) {
  const encoded = encodeURIComponent(query);
  return `https://www.realtor.com/realestateandhomes-search/${encoded}`;
}

// Build LoopNet search URL
function buildLoopNetSearchUrl(query) {
  const encoded = encodeURIComponent(query);
  return `https://www.loopnet.com/search/?sk=${encoded}`;
}

// Sleep helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.realtorData) {
    const newData = changes.realtorData.newValue || [];
    if (newData.length > 0) {
      chrome.action.setBadgeText({ text: newData.length.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#0066cc' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
