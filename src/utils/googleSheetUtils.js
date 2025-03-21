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
        input.value = value;
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
 * @returns {Promise<Array>} - Promise resolving to an empty array (disabled)
 */
export const fetchBookingsFromGoogleSheets = async (scriptUrl) => {
  // DISABLED: Return empty array immediately without attempting to fetch data
  console.log('Data fetching from Google Sheets is disabled. Returning empty array.');
  return [];
  
  // The original implementation is commented out below:
  /*
  try {
    console.log('Attempting to fetch bookings from Google Sheets:', scriptUrl);
    
    // Use the same iframe/form approach that works for POST requests
    return new Promise((resolve, reject) => {
      // ...existing code...
    });
  } catch (error) {
    console.error('Error in fetchBookingsFromGoogleSheets:', error);
    return [];
  }
  */
};
