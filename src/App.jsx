import { useState, useEffect, useRef } from 'react'
import './App.css'
// Import building data from external file
import buildings, { getBuilding, getAllFloors, getAllRooms } from './data/buildings'
// Import components
import TimeRoomTable from './components/TimeRoomTable'
import BookingForm from './components/BookingForm'
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
    if (!selectedRoom || !selectedTimeSlot || !isStudentIDValid) {
      alert('กรุณาเลือกห้อง เวลา และกรอกรหัสนักศึกษา 8 หลัก');
      return;
    }
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    setBookings(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [selectedRoom]: {
          ...(prev[dateStr]?.[selectedRoom] || {}),
          [selectedTimeSlot]: { studentID } // Store only student ID
        }
      }
    }));
    
    // Show success message instead of alert
    setBookingSuccess(true);
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
                <path d="M8 1.5a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V2a.5.5 0 0 1 .5-.5z"/>
                <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
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
        />
      </div>
    </div>
  )
}

export default App
