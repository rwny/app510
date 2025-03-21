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
  const googleSheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzS4qdlJ9q0EblfSxeimaMcmocjGAHmEz0ja3LYdDKpjURSMmyD3cNoAp7YY60W35cH6Q/exec';
  const formRef = useRef(null);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Add state to track submission status
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch bookings from Google Sheets when component mounts
  useEffect(() => {
    // Set loading to false immediately since data fetching is disabled
    setIsLoading(false);
    
    // This is the disabled data fetching implementation
    // We're keeping it commented out for future use
    /*
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
        
        if (data && Array.isArray(data)) {
          // Process the booking data
          const bookingsMap = {};
          
          data.forEach(booking => {
            // Skip header rows or empty entries
            if (booking.studentId === 'Student ID' || !booking.studentId) {
              return;
            }
            
            console.log('Processing booking:', booking);
            
            // Get relevant booking data - adjust property names based on actual data
            // The property names come from the camelCase conversion in the Google Apps Script
            const studentId = booking.studentId;
            const roomId = booking.roomId;
            const timeSlotStr = booking.timeSlot;
            const bookingDate = booking.bookingDate;
            
            if (!studentId || !roomId || !timeSlotStr || !bookingDate) {
              console.warn('Missing required booking data:', booking);
              return;
            }
            
            // Find the timeSlot ID based on the label
            const timeSlotObj = timeSlots.find(slot => slot.label === timeSlotStr);
            if (!timeSlotObj) {
              console.warn(`Time slot not found: ${timeSlotStr}`);
              return; // Skip if timeSlot not found
            }
            
            const timeSlotId = timeSlotObj.id;
            
            // Initialize nested objects if they don't exist
            if (!bookingsMap[bookingDate]) {
              bookingsMap[bookingDate] = {};
            }
            if (!bookingsMap[bookingDate][roomId]) {
              bookingsMap[bookingDate][roomId] = {};
            }
            
            // Add the booking
            bookingsMap[bookingDate][roomId][timeSlotId] = { 
              studentID: studentId,
              // Add other booking details as needed
            };
            
            console.log(`Added booking: ${bookingDate}, Room ${roomId}, Time ${timeSlotId}`);
          });
          
          console.log('Processed bookings map:', bookingsMap);
          
          // Update bookings state
          setBookings(bookingsMap);
        } else {
          console.warn('No valid booking data received or empty array returned');
          // Still set loading to false to show the interface
        }
      } catch (error) {
        console.error('Failed to load bookings:', error);
        // Create a visible error notification for debugging
        setNotification({
          show: true,
          message: `Could not load bookings: ${error.message}`,
          x: window.innerWidth / 2,
          y: 100
        });
        
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 5000);
      } finally {
        // Always set loading to false, even if there was an error
        setIsLoading(false);
      }
    };
    
    fetchBookings();
    */
  }, [googleSheetWebAppUrl, timeSlots]);

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
    </div>
  )
}

export default App
