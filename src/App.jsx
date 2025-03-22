import { useState, useEffect, useRef } from 'react'
import './App.css'
// Import building data from external file
import buildings, { getBuilding, getAllFloors, getAllRooms } from './data/buildings'
// Import components
import TimeRoomTable from './components/TimeRoomTable'
import BookingForm from './components/BookingForm'
// Import utility functions
import { formatDateForSheet, formatTimeForSheet, submitToGoogleSheets, fetchBookingsFromGoogleSheets } from './utils/googleSheetUtils'
// • 
function App() {
  // Set the current building (can be made dynamic in the future)
  const buildingID = 'AR15';
  const building = getBuilding(buildingID);
  const buildingName = building.name;
  
  // Get floors and rooms for the current building
  const floors = getAllFloors(buildingID);
  const allRooms = getAllRooms(buildingID);

  // State management
  const [selectedDate, setSelectedDate] = useState(new Date());
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
  
  // Google Sheet Web App URL - replace with your deployed Google Apps Script web app URL
  const googleSheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbwwnmrg1Gek0bhdbyRCHoSQRjSLSyp16fn1IZ_2WDdzMmyshlFAbJqaXJsdtvKj41npjw/exec';
  const formRef = useRef(null);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Add state to track submission status
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add state for debug panel visibility
  const [showDebugPanel, setShowDebugPanel] = useState(false);

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
  
  // Check if a room is booked at a specific date and time slot
  const isRoomBooked = (roomId, date, timeSlotId) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings[dateStr]?.[roomId]?.[timeSlotId] !== undefined;
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
    // Changed condition to check if selectedTimeSlot is null/undefined instead of using !selectedTimeSlot
    if (!selectedRoom || selectedTimeSlot === null || selectedTimeSlot === undefined || !isStudentIDValid) {
      alert('กรุณาเลือกห้อง เวลา และกรอกรหัสนักศึกษา 8 หลัก');
      return;
    }
    
    // Set submitting state to true
    setIsSubmitting(true);
    
    // Use toISOString for local state, but use formatDateForSheet for Google Sheets submission
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    // Store booking in local state using the local date format
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
    
    // Submit to Google Sheets with improved error handling
    const timeSlot = timeSlots.find(slot => slot.id === selectedTimeSlot);
    
    // Format the booking date using the same function used for submission date
    // This ensures consistent date handling in Google Sheets
    const formattedBookingDate = formatDateForSheet(selectedDate);
    
    const now = new Date();
    const submissionData = {
      studentId: studentID,
      buildingId: buildingID,
      roomId: selectedRoom, 
      timeSlot: timeSlot ? `ts.${timeSlot.label}` : `'00-00`,
      date: formattedBookingDate, // Use the formatted date function instead of dateStr
      submissionDate: formatDateForSheet(now),
      submissionTime: formatTimeForSheet(now)
    };
    
    // Log the submission data format for comparison
    console.log('POST Data Format - Sending to Google Sheets:');
    console.log('> studentId:', submissionData.studentId);
    console.log('> buildingId:', submissionData.buildingId);
    console.log('> roomId:', submissionData.roomId);
    console.log('> timeSlot:', submissionData.timeSlot);
    console.log('> date:', submissionData.date);
    console.log('> submissionDate:', submissionData.submissionDate);
    console.log('> submissionTime:', submissionData.submissionTime);
    
    // Use the utility function from googleSheetUtils.js
    submitToGoogleSheets(googleSheetWebAppUrl, submissionData)
      .then(() => {
        console.log('Booking data submitted to Google Sheets');
        // End submitting state
        setIsSubmitting(false);
        // Show success message
        setBookingSuccess(true);
      })
      .catch(error => {
        console.error('Failed to submit to Google Sheets:', error);
        // End submitting state
        setIsSubmitting(false);
        // Still show booking success since local booking worked
        setBookingSuccess(true);
        // Optionally show a warning that cloud sync failed
      });
  };
  
  // Add a function to specifically check data formats
  const compareDataFormats = async () => {
    try {
      console.log('Comparing POST vs GET data formats...');
      
      // Fetch current bookings
      const data = await fetchBookingsFromGoogleSheets(googleSheetWebAppUrl);
      
      if (data && data.length > 0) {
        // Log the format of the most recent booking
        const recentBooking = data[0];
        
        console.log('GET Data Format - Retrieved from Google Sheets:');
        console.log('> studentId:', recentBooking.studentId);
        console.log('> buildingId:', recentBooking.buildingId);
        console.log('> roomId:', recentBooking.roomId);
        console.log('> timeSlot:', recentBooking.timeSlot);
        console.log('> date/bookingDate:', recentBooking.date || recentBooking.bookingDate);
        
        // Check for property name mismatches
        console.log('\nProperty Name Check:');
        const expectedProps = ['studentId', 'buildingId', 'roomId', 'timeSlot', 'date'];
        expectedProps.forEach(prop => {
          const exists = recentBooking.hasOwnProperty(prop);
          const alternatives = Object.keys(recentBooking).filter(key => 
            key.toLowerCase().includes(prop.toLowerCase()));
          
          console.log(`> ${prop}: ${exists ? 'Found' : 'Missing'}${alternatives.length > 0 && !exists ? `, possible alternatives: ${alternatives.join(', ')}` : ''}`);
        });
        
        // Check time slot format
        console.log('\nTime Slot Format Check:');
        const timeSlotStr = recentBooking.timeSlot || '';
        console.log(`> Original: "${timeSlotStr}"`);
        if (timeSlotStr.startsWith('ts.')) {
          console.log(`> Without prefix: "${timeSlotStr.substring(3)}"`);
        }
        
        // Check if this time slot exists in our app's time slots
        const matchingTimeSlot = timeSlots.find(slot => 
          timeSlotStr === slot.label || 
          timeSlotStr === `ts.${slot.label}` || 
          timeSlotStr.substring(3) === slot.label
        );
        console.log(`> Matches app time slot: ${matchingTimeSlot ? 'Yes' : 'No'}`);
        
        if (!matchingTimeSlot) {
          console.log('> Available time slots:', timeSlots.map(ts => ts.label));
        }
      } else {
        console.warn('No data available for comparison');
      }
    } catch (error) {
      console.error('Data format comparison failed:', error);
    }
  };

  // Reset booking form
  const resetBookingForm = () => {
    setSelectedRoom(null);
    setSelectedTimeSlot(null);
    setStudentID(''); // Reset studentID
    setBookingSuccess(false);
  };
  
  // Format date for display - more compact format
  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = months[date.getMonth()];
    
    return `${day} ${dateNum} ${month}`;
  };

  // Format time slot with full hours (HH:MM format)
  const formatTimeSlotLong = (timeSlotId) => {
    const slot = timeSlots.find(slot => slot.id === timeSlotId);
    if (!slot) return '';
    
    const [start, end] = slot.label.split('-');
    return `${start}:00-${end}:00`;
  };

  // Cell click handler
  const handleCellClick = (roomId, timeSlotId, event) => {
    // Don't allow clicks when booking success is showing
    if (bookingSuccess) {
      const rect = event.currentTarget.getBoundingClientRect();
      setNotification({
        show: true,
        message: 'กรุณากดปุ่ม "เสร็จสิ้น" ก่อนเลือกห้องใหม่',
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
      });
      
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      
      return;
    }

    // Simply return early for past time slots - no notification needed
    if (isTimeSlotPast(selectedDate, timeSlotId)) {
      return; // No notification, just do nothing
    }
    
    if (isRoomBooked(roomId, selectedDate, timeSlotId)) {
      // Show floating notification instead of alert
      const rect = event.currentTarget.getBoundingClientRect();
      setNotification({
        show: true,
        message: 'ห้องนี้ถูกจองแล้ว ไม่สามารถจองได้',
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      
      return;
    }
    
    // Hide notification if showing
    if (notification.show) {
      setNotification(prev => ({ ...prev, show: false }));
    }
    
    setSelectedRoom(roomId);
    setSelectedTimeSlot(timeSlotId);
  };

  // Function to get booking details for tooltip
  const getBookingDetails = (roomId, date, timeSlotId) => {
    const dateStr = date.toISOString().split('T')[0];
    const booking = bookings[dateStr]?.[roomId]?.[timeSlotId];
    
    if (booking) {
      return `ห้อง ${roomId}, ${timeSlots.find(slot => slot.id === timeSlotId)?.label} - จองแล้วโดย ${booking.userName}`;
    }
    
    return `ห้อง ${roomId}, ${timeSlots.find(slot => slot.id === timeSlotId)?.label} - ว่าง`;
  };

  // Reference for app container
  const appRef = useRef(null);

  // Prevent page jumps when showing notifications or changing views
  useEffect(() => {
    // Scroll to top on initial load
    window.scrollTo(0, 0);
  }, []);

  // Add a new function to test the connection
  const testGoogleSheetsConnection = async () => {
    try {
      console.log('Testing connection to Google Sheets...');
      const response = await fetch(`${googleSheetWebAppUrl}?action=getBookings`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Connection test successful!');
      console.log('Raw response:', data);
      console.log('Server timestamp:', data.timestamp);
      
      alert('Connection successful! Check the browser console.');
    } catch (error) {
      console.error('Connection test failed:', error);
      alert(`Connection test failed: ${error.message}`);
    }
  };

  // Modify the useEffect hook to fix the infinite loop
  useEffect(() => {
    // Add a flag to prevent multiple fetches
    let isMounted = true;
    
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching bookings from Google Sheets...');
        
        // Add timeout to prevent indefinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout after 15 seconds')), 15000)
        );
        
        // Race between actual fetch and timeout
        const data = await Promise.race([
          fetchBookingsFromGoogleSheets(googleSheetWebAppUrl),
          timeoutPromise
        ]);
        
        console.log('Raw data from Google Sheets:', data);
        
        // More detailed logging
        console.log(`Is data defined? ${!!data}`);
        console.log(`Is data an array? ${Array.isArray(data)}`);
        console.log(`Data length: ${data?.length || 0}`);
        
        // Log the first item to see the structure
        if (data && data.length > 0) {
          console.log('First booking item structure:', data[0]);
          console.log('Properties of first item:', Object.keys(data[0]));
          
          // Check specific properties we need
          const firstItem = data[0];
          console.log(`studentId exists: ${!!firstItem.studentId}, value: ${firstItem.studentId}`);
          console.log(`roomId exists: ${!!firstItem.roomId}, value: ${firstItem.roomId}`);
          console.log(`timeSlot exists: ${!!firstItem.timeSlot}, value: ${firstItem.timeSlot}`);
          console.log(`date exists: ${!!firstItem.date}, value: ${firstItem.date}`);
          console.log(`bookingDate exists: ${!!firstItem.bookingDate}, value: ${firstItem.bookingDate}`);
        }
        
        if (data && Array.isArray(data) && isMounted) {
          // Process the booking data
          const bookingsMap = {};
          let processedCount = 0;
          let skippedCount = 0;
          
          data.forEach((booking, index) => {
            // Handle case sensitivity issues between ID and Id
            // Map uppercase ID properties to lowercase Id versions expected by the code
            const normalizedBooking = {
              studentId: booking.studentID || booking.studentId,
              buildingId: booking.buildingID || booking.buildingId,
              roomId: booking.roomID || booking.roomId,
              timeSlot: booking.timeSlot,
              date: booking.date || booking.bookingDate // Use either date or bookingDate
            };
            
            // Skip rows with missing studentId
            if (!normalizedBooking.studentId) {
              skippedCount++;
              console.log(`Skipping item ${index}: Missing studentId`);
              return;
            }
            
            try {
              // Extract the time slot without the "ts." prefix if present
              let timeSlotStr = normalizedBooking.timeSlot || '';
              if (timeSlotStr.startsWith('ts.')) {
                timeSlotStr = timeSlotStr.substring(3);
              }
              
              // Log what we're working with
              console.log(`Processing: Student ${normalizedBooking.studentId}, Room ${normalizedBooking.roomId}, TimeSlot ${timeSlotStr}, Date ${normalizedBooking.date}`);
              
              if (!normalizedBooking.studentId || !normalizedBooking.roomId || !timeSlotStr || !normalizedBooking.date) {
                console.warn(`Item ${index}: Missing required booking data:`, 
                  JSON.stringify(normalizedBooking));
                skippedCount++;
                return;
              }
              
              // Find the timeSlot ID based on the label
              const timeSlotObj = timeSlots.find(slot => slot.label === timeSlotStr);
              if (!timeSlotObj) {
                console.warn(`Item ${index}: Time slot not found: ${timeSlotStr}`);
                console.log('Available time slot labels:', timeSlots.map(ts => ts.label));
                skippedCount++;
                return; // Skip if timeSlot not found
              }
              
              const timeSlotId = timeSlotObj.id;
              
              // Format date to YYYY-MM-DD if it's in ISO format
              let bookingDate = normalizedBooking.date;
              if (bookingDate && bookingDate.includes('T')) {
                bookingDate = bookingDate.split('T')[0];
              }
              
              // Initialize nested objects if they don't exist
              if (!bookingsMap[bookingDate]) {
                bookingsMap[bookingDate] = {};
              }
              if (!bookingsMap[bookingDate][normalizedBooking.roomId]) {
                bookingsMap[bookingDate][normalizedBooking.roomId] = {};
              }
              
              // Add the booking
              bookingsMap[bookingDate][normalizedBooking.roomId][timeSlotId] = { 
                studentID: normalizedBooking.studentId
              };
              
              console.log(`Added booking: ${bookingDate}, Room ${normalizedBooking.roomId}, Time ${timeSlotId}`);
              processedCount++;
            } catch (err) {
              console.error(`Error processing item ${index}:`, err);
              skippedCount++;
            }
          });
          
          console.log(`Processed ${processedCount} bookings, skipped ${skippedCount}`);
          console.log('Processed bookings map:', bookingsMap);
          console.log('Booking map size:', Object.keys(bookingsMap).length);
          
          // Update bookings state
          setBookings(bookingsMap);
        } else {
          console.warn('No valid booking data received or empty array returned');
        }
      } catch (error) {
        console.error('Failed to load bookings:', error);
        if (isMounted) {
          // Create a visible error notification for debugging
          setNotification({
            show: true,
            message: `Could not load bookings: ${error.message}`,
            x: window.innerWidth / 2,
            y: 100
          });
          
          setTimeout(() => {
            if (isMounted) {
              setNotification(prev => ({ ...prev, show: false }));
            }
          }, 5000);
        }
      } finally {
        // Always set loading to false, even if there was an error
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchBookings();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
    
    // IMPORTANT: Only run this effect once on component mount
    // Remove googleSheetWebAppUrl and timeSlots from dependency array
  }, []);  // Empty dependency array = run once on mount

  // Toggle debug panel with keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Debug panel component
  const DebugPanel = () => {
    if (!showDebugPanel) return null;
    
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
          zIndex: 1000,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ marginBottom: '10px', fontSize: '12px', fontWeight: 'bold' }}>
          Debug Tools (Ctrl+Shift+D to hide)
        </div>
        <button 
          onClick={testGoogleSheetsConnection}
          style={{
            padding: '5px 10px',
            margin: '0 5px 5px 0',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Test GSheets Connection
        </button>
        <button 
          onClick={compareDataFormats}
          style={{
            padding: '5px 10px',
            margin: '0 0 5px 0',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Compare Data Formats
        </button>
      </div>
    );
  };

  return (
    <div className="booking-app" ref={appRef}>
      {/* Floating notification */}
      {notification.show && (
        <div 
          className="floating-notification"
          style={{ 
            top: `${notification.y}px`, 
            left: `${notification.x}px` 
          }}
        >
          {notification.message}
        </div>
      )}
      
      <section className="room-layout">
        <div className="room-layout-header">
          <h2>
            ระบบจองห้องเรียน {buildingName} ({buildingID})
            <button 
              className="floor-plan-button" 
              onClick={() => setShowFloorPlan(true)}
              title="ดูแผนผังอาคาร"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.502.502 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103zM10 1.91l-4-.8v12.98l4 .8V1.91zm1 12.98 4-.8V1.11l-4 .8v12.98zm-6-.8V1.11l-4 .8v12.98l4-.8z"/>
              </svg>
            </button>
          </h2>
          
          <div className="date-selector">
            {availableDates.map((date) => (
              <button 
                key={date.toISOString()} 
                onClick={() => setSelectedDate(date)}
                className={selectedDate.toISOString().split('T')[0] === date.toISOString().split('T')[0] ? 'active' : ''}
              >
                {formatDate(date)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Time Room Table Component */}
        <TimeRoomTable 
          floors={floors}
          timeSlots={timeSlots}
          selectedDate={selectedDate}
          selectedRoom={selectedRoom}
          selectedTimeSlot={selectedTimeSlot}
          isRoomBooked={isRoomBooked}
          isTimeSlotPast={isTimeSlotPast}
          handleCellClick={handleCellClick}
          getBookingDetails={getBookingDetails}
          bookingSuccess={bookingSuccess}
        />
      </section>
      
      {/* Floor Plan Modal */}
      {showFloorPlan && (
        <div className="modal-overlay" onClick={() => setShowFloorPlan(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowFloorPlan(false)}>×</button>
            <h3>แผนผังอาคาร {buildingName}</h3>
            <div className="floor-plan-image-container">
              <img src="./plan1.png" alt="Floor Plan" className="floor-plan-image" />
            </div>
          </div>
        </div>
      )}
      
      <div className="dynamic-content">
        {/* Booking Form Component */}
        <BookingForm
          bookingSuccess={bookingSuccess}
          selectedRoom={selectedRoom}
          selectedTimeSlot={selectedTimeSlot}
          selectedDate={selectedDate}
          studentID={studentID}
          timeSlots={timeSlots}
          formatDate={formatDate}
          formatTimeSlotLong={formatTimeSlotLong} // Add the new formatter
          isStudentIDValid={isStudentIDValid}
          setStudentID={setStudentID}
          bookRoom={bookRoom}
          resetBookingForm={resetBookingForm}
          buildingName={buildingName}  // Added building name prop
          buildingID={buildingID}      // Added building ID prop
          isSubmitting={isSubmitting} // Add the new state variable
        />
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>กำลังโหลดข้อมูลการจอง...</p>
        </div>
      )}

      {/* Add the debug panel */}
      <DebugPanel />
    </div>
  )
}

export default App
