import { useState, useEffect, useRef } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'
import { version } from './data/version'
// Import building data from external file
import buildings, { getBuilding, getAllFloors, getAllRooms } from './data/buildings'
// Import components
import TimeRoomTable from './components/TimeRoomTable'
import BookingForm from './components/BookingForm'
// Import utility functions - Add the missing imports
import { 
  formatDateForSheet, 
  formatTimeForSheet, 
  submitToGoogleSheets, 
  fetchBookingsFromGoogleSheets,
  findExactTimeSlot
} from './utils/googleSheetUtils'

function App() {
  // Set the current building (can be made dynamic in the future)
  const buildingID = 'AR15';
  const building = getBuilding(buildingID);
  const buildingName = building.name;
  
  // Get floors and rooms for the current building
  const floors = getAllFloors(buildingID);
  const allRooms = getAllRooms(buildingID);

  // State management
  const [selectedDate, setSelectedDate] = useState(() => {
    // Try to restore date from localStorage on initial load
    try {
      const savedDateStr = localStorage.getItem('selectedDate');
      if (savedDateStr) {
        const savedDate = new Date(savedDateStr);
        if (!isNaN(savedDate.getTime())) {
          return savedDate;
        }
      }
    } catch (e) {
      console.error('Error restoring saved date:', e);
    }
    return new Date(); // Default to current date
  });
  const [bookings, setBookings] = useState({});
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [studentID, setStudentID] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ 
    show: false, 
    message: '', 
    x: 0, 
    y: 0 
  });

  // State for floor plan modal
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  
  // Google Sheet Web App URL with array format specified
  const googleSheetWebAppUrl = 'https://script.google.com/macros/s/AKfycby5aYYKqDPZuppI71V3zT-n5p3Mr2gS5MoYCs3xJvIss9_xTOz1xRTlNMxyCdW1MlILgg/exec';
  const formRef = useRef(null);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Add state to track submission status
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add state for debug panel visibility
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Add state for reload loading overlay
  const [isReloading, setIsReloading] = useState(false);

  // Generate available dates (today + 6 more days)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });
  
  // Generate time slots (3-hour blocks)
  const timeSlots = Array.from({ length: 8 }, (_, i) => {
    const startHour = i * 3;
    const endHour = startHour + 3;
    return {
      id: i,
      label: `${String(startHour).padStart(2, '0')}-${String(endHour).padStart(2, '0')}`
    };
  });
  
  // Modify the isRoomBooked function to handle timezone issues
  const isRoomBooked = (roomId, date, timeSlotId) => {
    try {
      if (!bookings) return false;
      
      // Fix timezone issue by creating a consistent date string
      // that matches what's shown in the UI
      // Get year, month, day directly from the date object
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // For debugging
      console.log(`Checking booking: ${dateStr}, room: ${roomId}, timeslot: ${timeSlotId}`);
      
      const timeSlot = timeSlots.find(slot => slot.id === timeSlotId);
      
      // Check both with and without 'ts.' prefix for backward compatibility
      return bookings[dateStr]?.[roomId]?.[timeSlotId] !== undefined ||
             (timeSlot && bookings[dateStr]?.[roomId]?.[`ts.${timeSlot.label}`] !== undefined);
    } catch (error) {
      console.error('Error checking room booking status:', error);
      return false;
    }
  };
  
  // Check if a time slot is in the past
  const isTimeSlotPast = (date, timeSlotId) => {
    const today = new Date();
    const slotDate = new Date(date);
    
    // If the date is in the past, the whole day is in the past
    if (slotDate.setHours(0,0,0,0) < today.setHours(0,0,0,0)) {
      return true;
    }
    
    // If it's today, check if the time slot has passed
    if (slotDate.setHours(0,0,0,0) === today.setHours(0,0,0,0)) {
      const currentHour = new Date().getHours();
      const slotStartHour = timeSlotId * 3;
      
      // If current hour is past the slot's start hour, it's in the past
      return currentHour >= slotStartHour + 3; // Past if current hour is >= end time
    }
    
    return false;
  };

  // Check if a room is available (not booked and not in the past)
  const isRoomAvailable = (roomId, date, timeSlotId) => {
    return !isRoomBooked(roomId, date, timeSlotId) && !isTimeSlotPast(date, timeSlotId);
  };
  
  // Validate student ID - must be exactly 8 characters
  const isStudentIDValid = studentID.trim().length === 8;
  
  // Book a room
  const bookRoom = () => {
    if (!selectedRoom || selectedTimeSlot === null || selectedTimeSlot === undefined || !isStudentIDValid) {
      alert('กรุณาเลือกห้อง เวลา และกรอกรหัสนักศึกษา 8 หลัก');
      return;
    }
    
    setIsSubmitting(true);
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    setBookings(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [selectedRoom]: {
          ...(prev[dateStr]?.[selectedRoom] || {}),
          [selectedTimeSlot]: { studentID }
        }
      }
    }));
    
    const timeSlot = timeSlots.find(slot => slot.id === selectedTimeSlot);
    const formattedBookingDate = formatDateForSheet(selectedDate);
    
    const now = new Date();
    const submissionData = {
      studentId: studentID,
      buildingId: buildingID,
      roomId: selectedRoom, 
      timeSlot: timeSlot ? `ts.${timeSlot.label}` : `'00-00`,
      date: formattedBookingDate,
      submissionDate: formatDateForSheet(now),
      submissionTime: formatTimeForSheet(now)
    };
    
    submitToGoogleSheets(googleSheetWebAppUrl, submissionData)
      .then(() => {
        console.log('Booking data submitted to Google Sheets');
        setIsSubmitting(false);
        setBookingSuccess(true);
        
        // Make sure current date and selection state are saved before reload
        try {
          // Save the current view state
          localStorage.setItem('selectedDate', selectedDate.toISOString());
          localStorage.setItem('lastBookingSuccess', 'true');
          
          // Show overlay with loading indicator
          setIsReloading(true);
          
          // Show notification before reload
          setNotification({
            show: true,
            message: 'จองสำเร็จ กำลังรีเฟรชข้อมูล...',
            x: window.innerWidth / 2 - 100,
            y: 20
          });
        } catch (e) {
          console.error('Error saving state before reload:', e);
        }
        
        // Set a timeout to allow notification to be seen before reload
        setTimeout(() => {
          // Reload the page but stay on the same date
          window.location.reload();
        }, 2000);
      })
      .catch(error => {
        console.error('Failed to submit to Google Sheets:', error);
        setIsSubmitting(false);
        setBookingSuccess(true);
        
        // Show loading overlay
        setIsReloading(true);
        
        // Still reload after a short delay even on error
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      });
  };
  
  // Reset booking form
  const resetBookingForm = () => {
    setSelectedRoom(null);
    setSelectedTimeSlot(null);
    setStudentID('');
    setBookingSuccess(false);
  };

  // Add this debugging function
  const analyzeBookingDates = (bookingsData) => {
    if (!bookingsData || Object.keys(bookingsData).length === 0) {
      console.log('No booking data to analyze');
      return;
    }
  
    console.log('===== BOOKING DATE ANALYSIS =====');
    
    // Collect all bookings in a flat array for analysis
    const allBookings = [];
    
    Object.entries(bookingsData).forEach(([dateStr, roomsData]) => {
      Object.entries(roomsData).forEach(([roomId, timeSlotsData]) => {
        Object.entries(timeSlotsData).forEach(([timeSlotId, booking]) => {
          if (booking && booking.studentID) {
            const studentId = booking.studentID.toString();
            // Get last 2 digits
            const lastTwoDigits = studentId.slice(-2);
            
            // Parse date
            const bookingDate = new Date(dateStr);
            const bookingDay = bookingDate.getDate();
            
            allBookings.push({
              dateStr,
              date: bookingDate,
              day: bookingDay,
              studentId,
              lastTwoDigits,
              roomId,
              timeSlotId
            });
            
            // Check if last 2 digits match or are offset by 1 from the booking day
            const lastTwoDigitsNum = parseInt(lastTwoDigits, 10);
            const dayMatch = lastTwoDigitsNum === bookingDay;
            const dayOffsetPlus1 = lastTwoDigitsNum === bookingDay + 1;
            const dayOffsetMinus1 = lastTwoDigitsNum === bookingDay - 1;
            
            console.log(`Booking: ${dateStr} | Room: ${roomId} | Time: ${timeSlotId} | Student: ${studentId}`);
            console.log(`  Day: ${bookingDay} | Last 2 digits: ${lastTwoDigits}`);
            console.log(`  Match: ${dayMatch ? 'YES' : 'NO'}`);
            console.log(`  Offset +1: ${dayOffsetPlus1 ? 'YES' : 'NO'}`);
            console.log(`  Offset -1: ${dayOffsetMinus1 ? 'YES' : 'NO'}`);
          }
        });
      });
    });
    
    // Summary statistics
    let exactMatches = 0;
    let offsetPlus1Matches = 0;
    let offsetMinus1Matches = 0;
    let nonMatches = 0;
    
    allBookings.forEach(booking => {
      const lastTwoDigitsNum = parseInt(booking.lastTwoDigits, 10);
      if (lastTwoDigitsNum === booking.day) {
        exactMatches++;
      } else if (lastTwoDigitsNum === booking.day + 1) {
        offsetPlus1Matches++;
      } else if (lastTwoDigitsNum === booking.day - 1) {
        offsetMinus1Matches++;
      } else {
        nonMatches++;
      }
    });
    
    console.log('===== SUMMARY =====');
    console.log(`Total bookings analyzed: ${allBookings.length}`);
    console.log(`Exact day matches: ${exactMatches} (${(exactMatches/allBookings.length*100).toFixed(1)}%)`);
    console.log(`Day+1 matches: ${offsetPlus1Matches} (${(offsetPlus1Matches/allBookings.length*100).toFixed(1)}%)`);
    console.log(`Day-1 matches: ${offsetMinus1Matches} (${(offsetMinus1Matches/allBookings.length*100).toFixed(1)}%)`);
    console.log(`No pattern matches: ${nonMatches} (${(nonMatches/allBookings.length*100).toFixed(1)}%)`);
    console.log('===== END ANALYSIS =====');
  };

  // Add this debug function to deeply inspect bookings data in the console
  const debugBookingData = () => {
    console.group("BOOKING DATA DEBUG:");
    console.log("Current bookings state:", bookings);
    
    // Extract and log all dates in the bookings data
    const allDates = Object.keys(bookings);
    console.log("All dates in bookings:", allDates);
    
    // Log details for each date
    allDates.forEach(dateStr => {
      const rooms = Object.keys(bookings[dateStr] || {});
      console.group(`Date: ${dateStr} (${new Date(dateStr).toLocaleDateString()})`);
      console.log(`Rooms with bookings: ${rooms.join(", ")}`);
      
      // Log all rooms and their timeslots
      rooms.forEach(roomId => {
        const timeslots = Object.keys(bookings[dateStr][roomId] || {});
        console.group(`Room ${roomId}`);
        timeslots.forEach(timeSlotId => {
          const booking = bookings[dateStr][roomId][timeSlotId];
          console.log(`TimeSlot ${timeSlotId} (${timeSlots.find(ts => ts.id == timeSlotId)?.label || timeSlotId}): Student: ${booking.studentID}`);
        });
        console.groupEnd();
      });
      console.groupEnd();
    });
    console.groupEnd();
  }

  // Modify the getBookingDetails function to be more precise and debug potential issues
  const getBookingDetails = (roomId, date, timeSlotId) => {
    try {
      if (!bookings) return 'ว่าง';
      
      // Create date string in YYYY-MM-DD format directly from date parts
      // This avoids timezone issues with toISOString()
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Debug output to help trace the issue
      console.log(`Looking up booking: Date=${dateStr}, Room=${roomId}, TimeSlot=${timeSlotId}`);
      
      // Check if we have bookings for this date
      if (!bookings[dateStr]) {
        console.log(`No bookings found for date: ${dateStr}`);
        return 'ว่าง';
      }
      
      // Check if we have bookings for this room
      if (!bookings[dateStr][roomId]) {
        console.log(`No bookings found for room: ${roomId} on date: ${dateStr}`);
        return 'ว่าง';
      }
      
      // Get the booking for this timeslot
      const booking = bookings[dateStr][roomId][timeSlotId];
      
      // If booking exists, return formatted booking info
      if (booking && booking.studentID) {
        const studentIDStr = String(booking.studentID);
        const lastTwoDigits = studentIDStr.slice(-2);
        const bookingDay = date.getDate();
        
        console.log(`Found booking: Student=${studentIDStr}, LastTwoDigits=${lastTwoDigits}, BookingDay=${bookingDay}`);
        
        // Add date verification markers
        let matchIndicator = '';
        if (parseInt(lastTwoDigits, 10) === bookingDay) {
          matchIndicator = '✓'; // Exact match
        } else if (parseInt(lastTwoDigits, 10) === bookingDay + 1) {
          matchIndicator = '↑'; // Offset +1
        } else if (parseInt(lastTwoDigits, 10) === bookingDay - 1) {
          matchIndicator = '↓'; // Offset -1
        }
        
        return `จอง: ${studentIDStr} ${matchIndicator}`;
      }
      
      console.log(`No booking found for timeslot: ${timeSlotId}`);
      return 'ว่าง';
    } catch (error) {
      console.error('Error getting booking details:', error);
      return 'ว่าง';
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout after 15 seconds')), 15000)
        );
        
        let data;
        try {
          data = await Promise.race([
            fetchBookingsFromGoogleSheets(googleSheetWebAppUrl),
            timeoutPromise
          ]);
        } catch (error) {
          console.error('Error fetching booking data:', error);
          // Fallback to mock data if API fails
          data = [];
        }
        
        const bookingsMap = {};
        
        // Process data if we got any, otherwise use empty map
        if (data && Array.isArray(data)) {
          console.log('*** PROCESSING BOOKINGS DATA ***');
          // Log selected date with consistent formatting to debug timezone issues
          const selYear = selectedDate.getFullYear();
          const selMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const selDay = String(selectedDate.getDate()).padStart(2, '0');
          const selDateStr = `${selYear}-${selMonth}-${selDay}`;
          
          console.log('Selected date formatted for fetch:', selDateStr);
          
          data.forEach((booking) => {
            try {
              const roomId = booking.roomId || booking.roomID;
              if (!roomId) {
                console.log('Skipping booking - no roomId:', booking);
                return;
              }
              
              const timeSlotStr = booking.timeSlot || booking.slot;
              if (!timeSlotStr) {
                console.log('Skipping booking - no timeSlot:', booking);
                return;
              }
              
              const timeSlotMatch = findExactTimeSlot(timeSlotStr, timeSlots);
              if (!timeSlotMatch) {
                console.log('Skipping booking - no timeSlot match:', timeSlotStr, booking);
                return;
              }
              
              const timeSlotId = timeSlotMatch.id;
              let bookingDate = booking.date || booking.bookingDate;
              if (!bookingDate) {
                console.log('Skipping booking - no date:', booking);
                return;
              }

              console.log('Processing booking:', { roomId, timeSlotId, bookingDate, studentId: booking.studentId || booking.studentID });
              
              // Parse date using multiple approaches to ensure correctness
              let dateObj = null;
              
              // First try direct parsing
              if (typeof bookingDate === 'string') {
                // Check if it's already in ISO format
                if (bookingDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                  // Extract just the date part
                  const datePart = bookingDate.split('T')[0];
                  const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
                  
                  // Create Date object with correct year-month-day, forcing UTC to avoid timezone shifts
                  // Month is 0-indexed in JavaScript Date
                  dateObj = new Date(Date.UTC(year, month - 1, day));
                  
                  console.log('Parsed ISO date string:', { 
                    original: bookingDate, 
                    parts: [year, month, day],
                    parsed: dateObj.toISOString() 
                  });
                } 
                // Check if it has slashes (MM/DD/YYYY format)
                else if (bookingDate.includes('/')) {
                  const parts = bookingDate.split('/');
                  if (parts.length === 3) {
                    // Be careful with MM/DD/YYYY vs DD/MM/YYYY formats
                    // Assume MM/DD/YYYY for US locale
                    const month = parseInt(parts[0], 10);
                    const day = parseInt(parts[1], 10);
                    const year = parseInt(parts[2], 10);
                    
                    // Create Date with UTC to avoid timezone shifts
                    dateObj = new Date(Date.UTC(year, month - 1, day));
                    
                    console.log('Parsed date with slashes:', { 
                      original: bookingDate, 
                      parts: [month, day, year],
                      parsed: dateObj.toISOString() 
                    });
                  }
                }
                // Try with any other format
                else {
                  dateObj = new Date(bookingDate);
                  console.log('Parsed with generic Date constructor:', {
                    original: bookingDate,
                    parsed: dateObj.toISOString()
                  });
                }
              } else if (bookingDate instanceof Date) {
                dateObj = new Date(bookingDate);
              }
              
              // If still invalid, use selected date as fallback
              if (!dateObj || isNaN(dateObj.getTime())) {
                console.warn(`Invalid date in booking: ${bookingDate}, using selected date instead`);
                dateObj = new Date(selectedDate);
              }
              
              // Get correct date string in YYYY-MM-DD format
              const year = dateObj.getUTCFullYear();
              const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getUTCDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              
              console.log(`Final date string: ${dateStr}`);
              
              // Initialize structures if needed
              if (!bookingsMap[dateStr]) {
                bookingsMap[dateStr] = {};
              }
              if (!bookingsMap[dateStr][roomId]) {
                bookingsMap[dateStr][roomId] = {};
              }
              
              bookingsMap[dateStr][roomId][timeSlotId] = {
                studentID: booking.studentId || booking.studentID || '',
                rawDate: bookingDate // Keep the original date for debugging
              };
              
              console.log(`Added booking: Room ${roomId}, Date ${dateStr}, TimeSlot ${timeSlotId}, Student: ${booking.studentId || booking.studentID}`);
            } catch (error) {
              console.error('Error processing booking record:', error, booking);
            }
          });
        }
        
        // Log the final bookings map for each date
        console.log('Final bookings map:', Object.keys(bookingsMap).map(date => ({
          date,
          rooms: Object.keys(bookingsMap[date] || {}).length
        })));
        
        if (isMounted) {
          setBookings(bookingsMap);
          setIsLoading(false);
          
          // Run the analysis on the bookings data
          analyzeBookingDates(bookingsMap);
          
          // Debug the full bookings data structure
          setTimeout(debugBookingData, 1000);
        }
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBookings();
    
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Effect to save selected date to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('selectedDate', selectedDate.toISOString());
    } catch (e) {
      console.error('Error saving date to localStorage:', e);
    }
  }, [selectedDate]);

  // Check for successful booking after reload
  useEffect(() => {
    try {
      const wasSuccessful = localStorage.getItem('lastBookingSuccess') === 'true';
      if (wasSuccessful) {
        // Clear the success flag
        localStorage.removeItem('lastBookingSuccess');
        
        // Show a success message
        setNotification({
          show: true,
          message: 'การจองเสร็จสมบูรณ์!',
          x: window.innerWidth / 2 - 100,
          y: 20
        });
        
        // Hide notification after 3 seconds
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 3000);
      }
    } catch (e) {
      console.error('Error checking booking success state:', e);
    }
  }, []);

  const appRef = useRef(null)

  const formatDate = (date) => {
    return date.toLocaleDateString('th-TH', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTimeSlotLong = (timeSlotId) => {
    const slot = timeSlots.find(s => s.id === timeSlotId)
    return slot ? slot.label.replace('-', ':00-') + ':00' : ''
  }

  const handleCellClick = (roomId, timeSlotId, date) => {
    setSelectedRoom(roomId)
    setSelectedTimeSlot(timeSlotId)
    setSelectedDate(date)
  }

  const [isMobile, setIsMobile] = useState(false);


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showBookingForm = !isMobile || (selectedRoom !== null && selectedTimeSlot !== null);

  return (
    <ErrorBoundary>
      <div className="App" ref={appRef}>
        <header>
          <h3>ระบบจองห้องเรียน {buildingID}</h3>
          <div className="version-text">{version}</div>
        </header>
        {/* Main app content */}
        <TimeRoomTable
          buildingName={buildingName}
          floors={floors}
          allRooms={allRooms}
          availableDates={availableDates}
          timeSlots={timeSlots}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          bookings={bookings}
          isRoomAvailable={isRoomAvailable}
          isRoomBooked={isRoomBooked}
          isTimeSlotPast={isTimeSlotPast}
          handleCellClick={handleCellClick}
          selectedRoom={selectedRoom}
          selectedTimeSlot={selectedTimeSlot}
          isLoading={isLoading}
          getBookingDetails={getBookingDetails}
          bookingSuccess={bookingSuccess}
        />
      
        {/* Booking form - only shown on mobile after selection */}
        {showBookingForm && (
          <BookingForm
            selectedRoom={selectedRoom}
            selectedTimeSlot={selectedTimeSlot}
            selectedDate={selectedDate}
            studentID={studentID}
            setStudentID={setStudentID}
            isStudentIDValid={isStudentIDValid}
            bookRoom={bookRoom}
            resetBookingForm={resetBookingForm}
            bookingSuccess={bookingSuccess}
            isSubmitting={isSubmitting}
            formatDate={formatDate}
            formatTimeSlotLong={formatTimeSlotLong}
          />
        )}
      
      {/* Notification */}
      {notification.show && (
        <div className="notification" style={{ left: notification.x, top: notification.y }}>
          {notification.message}
        </div>
      )}
      
      {/* Reload Loading Overlay */}
      {isReloading && (
        <div className="reloading-overlay">
          <div className="reloading-content">
            <div className="loading-spinner"></div>
            <div className="reloading-text">กำลังโหลดข้อมูลใหม่...</div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
