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
  
  // Google Sheet Web App URL with array format specified
  const googleSheetWebAppUrl = 'https://script.google.com/macros/s/AKfycby5aYYKqDPZuppI71V3zT-n5p3Mr2gS5MoYCs3xJvIss9_xTOz1xRTlNMxyCdW1MlILgg/exec';
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
    try {
      if (!bookings) return false;
      const dateStr = date.toISOString().split('T')[0];
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
      })
      .catch(error => {
        console.error('Failed to submit to Google Sheets:', error);
        setIsSubmitting(false);
        setBookingSuccess(true);
      });
  };
  
  // Reset booking form
  const resetBookingForm = () => {
    setSelectedRoom(null);
    setSelectedTimeSlot(null);
    setStudentID('');
    setBookingSuccess(false);
  };

  // Modify the useEffect hook to fetch bookings

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
          // Debug logging for date comparison issue
          console.log('Selected date for fetch:', selectedDate.toISOString());
          
          data.forEach((booking) => {
            try {
              const roomId = booking.roomId || booking.roomID;
              if (!roomId) return;
              
              const timeSlotStr = booking.timeSlot || booking.slot;
              if (!timeSlotStr) return;
              
              const timeSlotMatch = findExactTimeSlot(timeSlotStr, timeSlots);
              if (!timeSlotMatch) return;
              
              const timeSlotId = timeSlotMatch.id;
              let bookingDate = booking.date || booking.bookingDate;
              if (!bookingDate) return;

              // Handle date parsing more safely
              let dateObj = null;
              let dateStr = '';
              
              try {
                // First try to parse as a standard date string
                dateObj = new Date(bookingDate);
                
                // Check if date is valid
                if (isNaN(dateObj.getTime())) {
                  // If it's not valid, try parsing as YYYY-MM-DD
                  if (typeof bookingDate === 'string' && bookingDate.includes('-')) {
                    const [year, month, day] = bookingDate.split('-').map(part => parseInt(part, 10));
                    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                      dateObj = new Date(year, month - 1, day);
                    }
                  }
                }
                
                // If still invalid, use selected date as fallback
                if (!dateObj || isNaN(dateObj.getTime())) {
                  console.warn(`Invalid date in booking: ${bookingDate}, using selected date instead`);
                  dateObj = new Date(selectedDate);
                }
                
                // Format as YYYY-MM-DD
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
                
                console.log(`Processed date for room ${roomId}, timeSlot ${timeSlotId}:`, {
                  original: bookingDate,
                  processed: dateStr
                });
              } catch (dateError) {
                console.error('Error processing date:', dateError);
                // Use current date as fallback
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
              }
              
              // Initialize structures if needed
              if (!bookingsMap[dateStr]) {
                bookingsMap[dateStr] = {};
              }
              if (!bookingsMap[dateStr][roomId]) {
                bookingsMap[dateStr][roomId] = {};
              }
              
              bookingsMap[dateStr][roomId][timeSlotId] = {
                studentID: booking.studentId || booking.studentID || ''
              };
              
              // Log successful booking import
              console.log(`Added booking: Room ${roomId}, Date ${dateStr}, TimeSlot ${timeSlotId}`);
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

  const getBookingDetails = (roomId, date, timeSlotId) => {
    try {
      if (!bookings) return 'ว่าง';
      const dateStr = date.toISOString().split('T')[0];
      const booking = bookings[dateStr]?.[roomId]?.[timeSlotId];
      if (booking && booking.studentID) {
        const studentIDStr = String(booking.studentID);
        return `จองโดย: ------${studentIDStr.slice(-2)}`;
      }
      return 'ว่าง';
    } catch (error) {
      // console.error('Error getting booking details:', error);
      return 'ว่าง';
    }
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
      </div>
    </ErrorBoundary>
  );
}

export default App;
