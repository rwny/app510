/**
 * Utility functions for Google Sheets integration
 */

// Define a global constant for debugging
const isDebugging = () => {
  try {
    const debugOverride = localStorage.getItem('debugOverride');
    return debugOverride === 'true' || (process.env.NODE_ENV === 'development' && debugOverride !== 'false');
  } catch (e) {
    console.error("Error accessing localStorage:", e);
    return process.env.NODE_ENV === 'development';
  }
};

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

/**
 * Format a date object into YYYY-MM-DD format - fixed to avoid timezone issues
 */
export const formatDateForSheet = (date) => {
  if (!date || isNaN(date.getTime())) {
    console.error('Invalid date provided to formatDateForSheet');
    return '';
  }
  
  // Extract date parts directly to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const formatted = `${year}-${month}-${day}`;
  if (isDebugging()) {
    console.log(`Formatting date - Year: ${year}, Month: ${month}, Day: ${day} => ${formatted}`);
  }
  return formatted;
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
 */
export const fetchBookingsFromGoogleSheets = async (webAppUrl) => {
  try {
    if (isDebugging()) {
      console.log('Fetching bookings from Google Sheets:', webAppUrl);
    }
    
    // Create a cachebuster to prevent caching
    const cacheBuster = Date.now();
    const requestUrl = `${webAppUrl}?action=getBookings&cacheBust=${cacheBuster}`;
    
    // First try direct fetch
    try {
      const response = await fetch(requestUrl);
      if (response.ok) {
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        let result;
        try {
          result = responseText ? JSON.parse(responseText) : null;
          console.log('Parsed response:', result);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError, '\nResponse text:', responseText);
          return [];
        }
        
        if (!result) {
          console.error('Empty response from Google Sheets');
          return [];
        }
        
        // Handle both direct array response and wrapped response format
        const data = Array.isArray(result) ? result : (result?.data || []);
        console.log('Extracted bookings:', data.length);
        
        if (!Array.isArray(data)) {
          console.error('Invalid data format from Google Sheets - expected array, got:', typeof data, '\nFull response:', result);
          return [];
        }
        
        // Add debugging for date processing - with safe date handling
        if (data.length > 0) {
          console.log('Sample booking data:');
          data.slice(0, 3).forEach((booking, index) => {
            try {
              // Safely log date information
              const dateStr = booking.date || '';
              
              // Don't try to create invalid Date objects
              console.log(`Booking ${index}:`, {
                originalDate: dateStr,
                roomId: booking.roomId || booking.roomID || 'unknown',
                timeSlot: booking.timeSlot || booking.slot || 'unknown'
              });
            } catch (error) {
              console.error(`Error logging booking ${index}:`, error);
            }
          });
        }
        
        // Sanitize the data to ensure it's safe to process
        const sanitizedData = data.map(booking => {
          try {
            // Create a clean copy of the booking
            const cleanBooking = { ...booking };
            
            // Handle potential invalid date values
            if (cleanBooking.date) {
              // Try to determine if it's a valid date string
              const testDate = new Date(cleanBooking.date);
              if (isNaN(testDate.getTime())) {
                // If invalid, use current date as fallback
                console.warn(`Invalid date found in booking: ${cleanBooking.date}, using today's date instead`);
                cleanBooking.date = formatDateForSheet(new Date());
              }
            }
            
            // Return the sanitized booking
            return cleanBooking;
          } catch (error) {
            console.error('Error sanitizing booking:', error, booking);
            // Return a minimal valid booking
            return {
              roomId: booking.roomId || booking.roomID || '',
              timeSlot: booking.timeSlot || booking.slot || '',
              date: formatDateForSheet(new Date()),
              studentId: booking.studentId || booking.studentID || ''
            };
          }
        });
        
        // Add timezone debugging for raw dates
        if (data.length > 0) {
          console.log('TIMEZONE DEBUG - Sample booking dates:');
          data.slice(0, 5).forEach((booking, index) => {
            if (booking.date) {
              // Show the date in different formats to identify timezone shifts
              const rawDate = booking.date;
              let jsDate;
              try {
                jsDate = new Date(rawDate);
              } catch (e) {
                jsDate = 'Invalid Date';
              }
              
              console.log(`Booking ${index} Date:`, {
                raw: rawDate,
                parsed: jsDate.toString(),
                year: jsDate.getFullYear ? jsDate.getFullYear() : 'N/A',
                month: jsDate.getMonth ? jsDate.getMonth() + 1 : 'N/A',
                day: jsDate.getDate ? jsDate.getDate() : 'N/A',
                dateOnly: jsDate.toISOString ? jsDate.toISOString().split('T')[0] : 'N/A',
                localeDateStr: jsDate.toLocaleDateString ? jsDate.toLocaleDateString() : 'N/A'
              });
            }
          });
        }
        
        return sanitizedData;
      } else {
        console.error('Fetch failed with status:', response.status);
      }
    } catch (fetchError) {
      console.error('Direct fetch failed:', fetchError);
      console.log('Request URL was:', requestUrl);
    }
    
    // Fallback to form submission method
    try {
      const formData = await fetchWithFormSubmission(webAppUrl);
      if (formData && formData.length > 0) {
        console.log('Successfully retrieved data via form submission:', formData.length);
        return formData;
      }
      console.warn('Form submission returned empty data');
    } catch (formError) {
      console.error('Form submission failed:', formError);
    }
    
    console.warn('Could not retrieve booking data from either method');
    return [];
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return []; // Return empty array instead of throwing to prevent app crashes
  }
};

/**
 * This uses a form submission approach to fetch data, similar to our posting mechanism
 */
const fetchWithFormSubmission = (webAppUrl) => {
  return new Promise((resolve) => {
    // Create hidden iframe
    const iframeName = `fetch-iframe-${Date.now()}`;
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Create form for "GET" request
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = `${webAppUrl}?action=getBookings&format=json`;
    form.target = iframeName;
    form.style.display = 'none';
    document.body.appendChild(form);
    
    // Set timeout for cleanup 
    const timeout = setTimeout(() => {
      console.log('Form submission fetch timed out');
      cleanupAndResolve([]);
    }, 5000);
    
    // Function to clean up elements and resolve promise
    const cleanupAndResolve = (data) => {
      clearTimeout(timeout);
      if (document.body.contains(form)) document.body.removeChild(form);
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      resolve(data);
    };
    
    // Listen for iframe load
    iframe.onload = () => {
      try {
        // Try to parse iframe content
        const rawContent = iframe.contentDocument?.body?.textContent || 
                         iframe.contentWindow?.document.body.textContent;
                         
        if (rawContent) {
          try {
            // Try parsing the content as JSON
            const data = JSON.parse(rawContent);
            if (Array.isArray(data)) {
              console.log('Successfully parsed data from iframe:', data.length, 'records');
              cleanupAndResolve(data);
              return;
            }
          } catch (e) {
            console.warn('Iframe content not valid JSON:', e);
          }
        }
        
    // If we can't get the data or it's not JSON, return empty array
    cleanupAndResolve([]);
      } catch (e) {
        console.error('Error accessing iframe content:', e);
        cleanupAndResolve([]);
      }
    };
    
    // Submit the form to initiate the request
    form.submit();
  });
};

/**
 * Helper function to convert various time slot formats to our standard HH-HH format
 * @param {string} timeSlotStr - Time slot string from various sources
 * @returns {string} - Standardized time slot string in HH-HH format
 */
export const normalizeTimeSlotFormat = (timeSlotStr) => {
  // Handle empty values
  if (!timeSlotStr) return '';
  
  // Remove any leading single quote (Google Sheets text indicator)
  if (timeSlotStr.startsWith("'")) {
    timeSlotStr = timeSlotStr.substring(1);
  }
  
  // Remove ts. prefix if present for consistent matching
  if (timeSlotStr.startsWith('ts.')) {
    timeSlotStr = timeSlotStr.substring(3);
  }
  
  // If already in our HH-HH format, return as is
  if (/^\d{2}-\d{2}$/.test(timeSlotStr)) {
    return timeSlotStr;
  }
  
  // Handle HH:MM format (Google Sheets time format)
  if (timeSlotStr.includes(':')) {
    const hourMatch = timeSlotStr.match(/(\d+):/);
    if (hourMatch && hourMatch[1]) {
      const startHour = parseInt(hourMatch[1], 10);
      const endHour = startHour + 3;
      return `${String(startHour).padStart(2, '0')}-${String(endHour).padStart(2, '0')}`;
    }
  }
  
  // Handle numeric values (Google might convert time slots to numbers)
  if (/^\d+$/.test(timeSlotStr)) {
    const hour = parseInt(timeSlotStr, 10);
    // Assume this is a starting hour
    if (hour >= 0 && hour <= 21) {
      const endHour = hour + 3;
      return `${String(hour).padStart(2, '0')}-${String(endHour).padStart(2, '0')}`;
    }
  }
  
  // If we can extract numbers, try to interpret as a time range
  const numbers = timeSlotStr.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const startHour = parseInt(numbers[0], 10);
    const endHour = parseInt(numbers[1], 10);
    // Ensure we're using exactly the format from our time slots
    return `${String(startHour).padStart(2, '0')}-${String(endHour).padStart(2, '0')}`;
  }
  
  // Return original if all else fails
  return timeSlotStr;
};

/**
 * Find the exact time slot from the global time slots array
 * @param {string} timeSlotStr - The time slot string to match
 * @param {Array} timeSlots - Array of time slot objects with id and label properties
 * @returns {Object|null} - The matching time slot object or null if not found
 */
export const findExactTimeSlot = (timeSlotStr, timeSlots) => {
  if (!timeSlotStr || !Array.isArray(timeSlots) || !timeSlots.length) {
    return null;
  }
  
  try {
    // First normalize the time slot string (removing any ts. prefix)
    const normalizedTimeSlot = normalizeTimeSlotFormat(timeSlotStr);
    
    // Log each attempt to match for debugging
    console.log(`Finding time slot match for: ${timeSlotStr} -> normalized: ${normalizedTimeSlot}`);
    
    // Try direct match first (comparing just the time portion)
    const exactMatch = timeSlots.find(slot => {
      // Compare both with and without 'ts.' prefix
      return slot.label === normalizedTimeSlot || 
             slot.label === `ts.${normalizedTimeSlot}` ||
             slot.label.replace('ts.', '') === normalizedTimeSlot;
    });
    if (exactMatch) return exactMatch;
    
    // If no direct match, try to extract the hours
    const numbers = normalizedTimeSlot.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const startHour = parseInt(numbers[0], 10);
      const endHour = parseInt(numbers[1], 10);
      
      // Look for a time slot with the same start and end hours
      const hourMatch = timeSlots.find(slot => {
        // Handle both formats: "HH-HH" and "ts.HH-HH"
        const slotLabel = slot.label.startsWith('ts.') ? 
          slot.label.substring(3) : 
          slot.label;
        
        const slotNumbers = slotLabel.match(/\d+/g);
        if (slotNumbers && slotNumbers.length >= 2) {
          const slotStart = parseInt(slotNumbers[0], 10);
          const slotEnd = parseInt(slotNumbers[1], 10);
          return slotStart === startHour && slotEnd === endHour;
        }
        return false;
      });
      
      if (hourMatch) return hourMatch;
    }
    
    // If we still don't have a match, try matching just the start hour
    if (numbers && numbers.length >= 1) {
      const startHour = parseInt(numbers[0], 10);
      const endHour = startHour + 3;
      
      const hourMatch = timeSlots.find(slot => {
        const slotLabel = slot.label.startsWith('ts.') ? 
          slot.label.substring(3) : 
          slot.label;
        
        const slotNumbers = slotLabel.match(/\d+/g);
        if (slotNumbers && slotNumbers.length >= 2) {
          const slotStart = parseInt(slotNumbers[0], 10);
          const slotEnd = parseInt(slotNumbers[1], 10);
          return slotStart === startHour && slotEnd === endHour;
        }
        return false;
      });
      
      if (hourMatch) return hourMatch;
    }
    
    // If we still don't have a match, log details and return null
    console.warn(`Could not find exact time slot match for: ${timeSlotStr} (normalized: ${normalizedTimeSlot})`);
    console.log('Available time slots:', timeSlots.map(ts => ts.label));
    return null;
  } catch (error) {
    console.error('Error finding time slot match:', error);
    return null;
  }
};

/**
 * Process a single booking record into standard format
 * @param {Object} record - Raw booking record from API
 * @param {Array} timeSlots - App time slots array
 * @returns {Object} Normalized booking object
 */
export const normalizeBookingRecord = (record, timeSlots) => {
  // Create a standardized booking object
  const booking = {
    studentId: '',
    buildingId: '',
    roomId: '',
    timeSlot: '',
    date: '',
    submissionDate: '',
    submissionTime: ''
  };
  
  // Normalize all fields regardless of case
  Object.entries(record).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('student')) booking.studentId = value;
    if (lowerKey.includes('building')) booking.buildingId = value;
    if (lowerKey.includes('room') && !lowerKey.includes('building')) booking.roomId = value;
    if (lowerKey.includes('time') && !lowerKey.includes('submission')) booking.timeSlot = value;
    if (lowerKey === 'slot' || lowerKey.includes('slot')) booking.timeSlot = value;
    if (lowerKey.includes('date') && !lowerKey.includes('submission')) booking.date = value;
    if (lowerKey.includes('submission') && lowerKey.includes('date')) booking.submissionDate = value;
    if (lowerKey.includes('submission') && lowerKey.includes('time')) booking.submissionTime = value;
  });
  
  // Normalize time slot format using our helper function
  booking.timeSlot = normalizeTimeSlotFormat(booking.timeSlot);
  
  // Normalize date format
  if (booking.date) {
    if (booking.date.startsWith("'")) {
      booking.date = booking.date.substring(1);
    }
    
    if (booking.date.includes('T')) {
      booking.date = booking.date.split('T')[0];
    } else if (booking.date.includes('/')) {
      const parts = booking.date.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
          const dateObj = new Date(year, month - 1, day);
          booking.date = formatDateForSheet(dateObj);
        }
      }
    }
  }
  
  return booking;
};

/**
 * Format mock bookings for consistent development testing
 */
export const getMockBookings = () => {
  console.log('Generating mock booking data for testing');
  
  // Get current date and next 7 days
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    return formatDateForSheet(date);
  });
  
  // Focus on current building rooms
  const rooms = ['201', '202', '203', '204', '205', '301', '302', '303', '304', '305'];
  
  // Generate random bookings
  const bookings = [];
  
  // Create 15-25 random bookings
  const bookingCount = Math.floor(Math.random() * 10) + 15;
  
  for (let i = 0; i < bookingCount; i++) {
    const randomDate = dates[Math.floor(Math.random() * dates.length)];
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    const randomTimeSlot = Math.floor(Math.random() * 8);
    const timeSlotLabel = `${String(randomTimeSlot * 3).padStart(2, '0')}-${String(randomTimeSlot * 3 + 3).padStart(2, '0')}`;
    
    bookings.push({
      studentId: `6${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      buildingId: 'AR15',
      roomId: randomRoom,
      timeSlot: `ts.${timeSlotLabel}`,
      date: randomDate,
      // Add sample submission data
      submissionDate: formatDateForSheet(today),
      submissionTime: formatTimeForSheet(today)
    });
  }
  
  console.log(`Generated ${bookings.length} mock bookings`);
  return bookings;
};
