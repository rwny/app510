/**
 * Utility functions for Google Sheets integration
 */

// Submit data to Google Sheets via iframe to avoid CORS issues
export const submitToGoogleSheets = (scriptUrl, data) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a hidden iframe with unique name
      const iframeName = `hidden-iframe-${Date.now()}`;
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Create a temporary form for submission
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = scriptUrl;
      form.target = iframeName;
      form.style.display = 'none';
      
      // Add all data as hidden inputs
      Object.entries(data).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        
        // Ensure all values are text strings with the single quote prefix
        // This forces Google Sheets to treat them as text
        if (typeof value === 'string' && !value.startsWith("'")) {
          input.value = `'${value}`;
        } else {
          input.value = value;
        }
        
        form.appendChild(input);
      });
      
      // Add form to document and submit
      document.body.appendChild(form);
      form.submit();
      
      // Assume success after a delay (no way to directly check the response)
      setTimeout(() => {
        // Clean up
        if (document.body.contains(form)) {
          document.body.removeChild(form);
        }
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        resolve({ success: true });
      }, 2000);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Format a date object into YYYY-MM-DD format for Bangkok timezone (UTC+7)
export const formatDateForSheet = (date) => {
  // Create date with timezone offset for Bangkok (UTC+7)
  const bangkokOffset = 7 * 60; // Bangkok is UTC+7 (7 hours * 60 minutes)
  const userOffset = date.getTimezoneOffset(); // Returns negative minutes from UTC
  const totalOffset = bangkokOffset + userOffset; // Minutes to add
  
  const bangkokDate = new Date(date.getTime() + totalOffset * 60000);
  
  // Format as YYYY-MM-DD
  const year = bangkokDate.getFullYear();
  const month = String(bangkokDate.getMonth() + 1).padStart(2, '0');
  const day = String(bangkokDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Format a time value for Google Sheets in Bangkok timezone (UTC+7)
export const formatTimeForSheet = (date) => {
  // Create date with timezone offset for Bangkok (UTC+7)
  const bangkokOffset = 7 * 60; // Bangkok is UTC+7 (7 hours * 60 minutes)
  const userOffset = date.getTimezoneOffset(); // Returns negative minutes from UTC
  const totalOffset = bangkokOffset + userOffset; // Minutes to add
  
  const bangkokDate = new Date(date.getTime() + totalOffset * 60000);
  
  // Format as HH:MM:SS
  const hours = String(bangkokDate.getHours()).padStart(2, '0');
  const minutes = String(bangkokDate.getMinutes()).padStart(2, '0');
  const seconds = String(bangkokDate.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

// Get full ISO string in Bangkok timezone (for debugging and complete data)
export const getBangkokISOString = (date = new Date()) => {
  const bangkokDate = formatDateForSheet(date);
  const bangkokTime = formatTimeForSheet(date);
  return `${bangkokDate}T${bangkokTime}`;
};

/**
 * Fetch booking data from Google Sheets
 * @param {string} scriptUrl - The Google Apps Script web app URL
 * @returns {Promise<Array>} - Promise resolving to an array of booking objects
 */
export const fetchBookingsFromGoogleSheets = async (url) => {
  try {
    console.log('Sending fetch request to:', `${url}?action=getBookings`);
    
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = new Date().getTime();
    const response = await fetch(`${url}?action=getBookings&_=${cacheBuster}`);
    
    console.log('Received response with status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const jsonResponse = await response.json();
    console.log('Successfully parsed JSON response');
    console.log('Response from Google Apps Script:', jsonResponse);
    
    if (jsonResponse.timestamp) {
      console.log('Server timestamp:', jsonResponse.timestamp);
    } else {
      console.warn('No timestamp in response');
    }
    
    // Add detailed debugging for data
    if (jsonResponse.data) {
      console.log(`Data is an array: ${Array.isArray(jsonResponse.data)}`);
      console.log(`Data length: ${jsonResponse.data.length}`);
      
      if (jsonResponse.data.length > 0) {
        console.log('First 3 items in data:', 
          jsonResponse.data.slice(0, 3).map(item => JSON.stringify(item)));
        
        // Log all property names from first item to help debug camelCase issues
        const firstItem = jsonResponse.data[0];
        if (firstItem) {
          console.log('Properties in first item:', Object.keys(firstItem));
          console.log('First item values:', Object.values(firstItem));
        }
      }
    } else {
      console.warn('No data property in response');
    }
    
    // Return the actual bookings data
    return jsonResponse.data || [];
  } catch (error) {
    console.error('Error details:', error);
    console.error('Error fetching from Google Sheets:', error.message);
    throw error;
  }
};
