// Popup script for viewing and managing scraped data
document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const totalCountEl = document.getElementById('totalCount');
  const realtorCountEl = document.getElementById('realtorCount');
  const sourceFilterEl = document.getElementById('sourceFilter');
  const typeFilterEl = document.getElementById('typeFilter');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const clearBtn = document.getElementById('clearBtn');
  const loadingEl = document.getElementById('loading');
  const emptyStateEl = document.getElementById('emptyState');
  const dataListEl = document.getElementById('dataList');

  let allData = [];
  let filteredData = [];

  // Initialize
  loadData();

  // Event listeners
  refreshBtn.addEventListener('click', loadData);
  exportJsonBtn.addEventListener('click', () => exportData('json'));
  exportCsvBtn.addEventListener('click', () => exportData('csv'));
  clearBtn.addEventListener('click', clearAllData);
  sourceFilterEl.addEventListener('change', applyFilters);
  typeFilterEl.addEventListener('change', applyFilters);

  // Load data from storage
  async function loadData() {
    showLoading();

    chrome.runtime.sendMessage({ action: 'getRealtorData' }, (response) => {
      if (response && response.data) {
        allData = response.data;
        applyFilters();
      } else {
        allData = [];
        filteredData = [];
        updateUI();
      }
    });
  }

  // Apply filters to data
  function applyFilters() {
    const sourceFilter = sourceFilterEl.value;
    const typeFilter = typeFilterEl.value;

    filteredData = allData.filter(item => {
      // Source filter
      if (sourceFilter && !item.source.toLowerCase().includes(sourceFilter.toLowerCase())) {
        return false;
      }

      // Type filter
      if (typeFilter && item.listingInfo.matchesCriteria !== typeFilter) {
        return false;
      }

      return true;
    });

    updateUI();
  }

  // Update UI with current data
  function updateUI() {
    hideLoading();

    // Update stats
    totalCountEl.textContent = filteredData.length;

    // Count unique realtors
    const uniqueRealtors = new Set();
    filteredData.forEach(item => {
      if (item.realtors) {
        item.realtors.forEach(realtor => {
          if (realtor.name) {
            uniqueRealtors.add(realtor.name);
          }
        });
      }
    });
    realtorCountEl.textContent = uniqueRealtors.size;

    // Show empty state if no data
    if (filteredData.length === 0) {
      emptyStateEl.style.display = 'block';
      dataListEl.innerHTML = '';
      return;
    }

    emptyStateEl.style.display = 'none';

    // Render data list
    renderDataList();
  }

  // Render the list of listings
  function renderDataList() {
    dataListEl.innerHTML = '';

    filteredData.forEach((item, index) => {
      const card = createListingCard(item, index);
      dataListEl.appendChild(card);
    });
  }

  // Create a listing card element
  function createListingCard(item, index) {
    const card = document.createElement('div');
    card.className = 'listing-card';

    // Header
    const header = document.createElement('div');
    header.className = 'listing-header';

    const title = document.createElement('div');
    title.className = 'listing-title';

    const source = document.createElement('span');
    source.className = 'listing-source';
    source.textContent = item.source;
    title.appendChild(source);

    const address = document.createElement('div');
    address.className = 'listing-address';
    address.textContent = item.listingInfo.address || 'Address not available';
    title.appendChild(address);

    if (item.listingInfo.matchesCriteria) {
      const matchType = document.createElement('span');
      matchType.className = 'listing-match-type';
      matchType.textContent = item.listingInfo.matchesCriteria === 'new_home' ? 'New Home 2025' : 'Closed Land Lot';
      if (item.listingInfo.matchesCriteria === 'closed_land_lot') {
        matchType.style.background = '#ff6b6b';
      }
      title.appendChild(matchType);
    }

    header.appendChild(title);
    card.appendChild(header);

    // Details
    const details = document.createElement('div');
    details.className = 'listing-details';

    if (item.listingInfo.propertyType) {
      details.appendChild(createDetailItem('Property Type', item.listingInfo.propertyType));
    }

    if (item.listingInfo.yearBuilt) {
      details.appendChild(createDetailItem('Year Built', item.listingInfo.yearBuilt));
    }

    if (item.listingInfo.listingStatus) {
      details.appendChild(createDetailItem('Status', item.listingInfo.listingStatus));
    }

    if (item.listingInfo.price) {
      details.appendChild(createDetailItem('Price', item.listingInfo.price));
    }

    if (item.listingInfo.mlsNumber) {
      details.appendChild(createDetailItem('MLS #', item.listingInfo.mlsNumber));
    }

    details.appendChild(createDetailItem('Scraped', new Date(item.scrapedAt).toLocaleString()));

    card.appendChild(details);

    // Realtors section
    const realtorsSection = document.createElement('div');
    realtorsSection.className = 'realtors-section';

    const realtorsTitle = document.createElement('div');
    realtorsTitle.className = 'realtors-title';
    realtorsTitle.textContent = `Realtors (${item.realtors?.length || 0})`;
    realtorsSection.appendChild(realtorsTitle);

    if (item.realtors && item.realtors.length > 0) {
      item.realtors.forEach(realtor => {
        realtorsSection.appendChild(createRealtorCard(realtor));
      });
    } else {
      const noRealtors = document.createElement('div');
      noRealtors.className = 'no-realtors';
      noRealtors.textContent = 'No realtor information found';
      realtorsSection.appendChild(noRealtors);
    }

    card.appendChild(realtorsSection);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'listing-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-small btn-view';
    viewBtn.textContent = 'View Listing';
    viewBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: item.url });
    });
    actions.appendChild(viewBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-small btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      deleteEntry(index);
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);

    return card;
  }

  // Create a detail item
  function createDetailItem(label, value) {
    const item = document.createElement('div');
    item.className = 'detail-item';

    const labelEl = document.createElement('span');
    labelEl.className = 'detail-label';
    labelEl.textContent = label;
    item.appendChild(labelEl);

    const valueEl = document.createElement('div');
    valueEl.className = 'detail-value';
    valueEl.textContent = value || 'N/A';
    item.appendChild(valueEl);

    return item;
  }

  // Create a realtor card
  function createRealtorCard(realtor) {
    const card = document.createElement('div');
    card.className = 'realtor-card';

    const name = document.createElement('div');
    name.className = 'realtor-name';
    name.textContent = realtor.name || 'Name not available';
    card.appendChild(name);

    const info = document.createElement('div');
    info.className = 'realtor-info';

    if (realtor.phone) {
      const phone = document.createElement('div');
      phone.className = 'realtor-info-item';
      phone.innerHTML = `<strong>Phone:</strong> ${realtor.phone}`;
      info.appendChild(phone);
    }

    if (realtor.email) {
      const email = document.createElement('div');
      email.className = 'realtor-info-item';
      email.innerHTML = `<strong>Email:</strong> ${realtor.email}`;
      info.appendChild(email);
    }

    if (realtor.company) {
      const company = document.createElement('div');
      company.className = 'realtor-info-item';
      company.innerHTML = `<strong>Company:</strong> ${realtor.company}`;
      info.appendChild(company);
    }

    if (realtor.licenseNumber) {
      const license = document.createElement('div');
      license.className = 'realtor-info-item';
      license.innerHTML = `<strong>License:</strong> ${realtor.licenseNumber}`;
      info.appendChild(license);
    }

    card.appendChild(info);

    return card;
  }

  // Delete an entry
  function deleteEntry(index) {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    // Find the actual index in allData
    const itemToDelete = filteredData[index];
    const actualIndex = allData.indexOf(itemToDelete);

    if (actualIndex === -1) return;

    chrome.runtime.sendMessage({
      action: 'deleteRealtorEntry',
      index: actualIndex
    }, (response) => {
      if (response && response.success) {
        loadData();
      }
    });
  }

  // Export data
  function exportData(format) {
    if (filteredData.length === 0) {
      alert('No data to export!');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'exportRealtorData',
      format: format
    }, (response) => {
      if (response && response.success) {
        downloadFile(response.data, response.filename, response.mimeType);
      } else {
        alert('Export failed: ' + (response?.message || 'Unknown error'));
      }
    });
  }

  // Download file
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Clear all data
  function clearAllData() {
    if (!confirm('Are you sure you want to clear all scraped data? This cannot be undone.')) {
      return;
    }

    chrome.runtime.sendMessage({ action: 'clearRealtorData' }, (response) => {
      if (response && response.success) {
        loadData();
      }
    });
  }

  // Show loading state
  function showLoading() {
    loadingEl.style.display = 'flex';
    emptyStateEl.style.display = 'none';
    dataListEl.innerHTML = '';
  }

  // Hide loading state
  function hideLoading() {
    loadingEl.style.display = 'none';
  }
});
