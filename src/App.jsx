import { useState, useEffect, useRef, Fragment } from 'react'
import './App.css'
// Import building data from external file
import buildings, { getBuilding, getAllFloors, getAllRooms } from './data/buildings'

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
  const [userName, setUserName] = useState('');
  const [studentID, setStudentID] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ 
    show: false, 
    message: '', 
    x: 0, 
    y: 0 
  });
  
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
  
  // Book a room
  const bookRoom = () => {
    if (!selectedRoom || !selectedTimeSlot || !userName.trim() || !studentID.trim()) {
      alert('กรุณาเลือกห้อง เวลา และกรอกข้อมูลผู้จอง (ชื่อและรหัสนักศึกษา)');
      return;
    }
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    setBookings(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [selectedRoom]: {
          ...(prev[dateStr]?.[selectedRoom] || {}),
          [selectedTimeSlot]: { userName, studentID } // Include studentID in booking data
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
    setUserName('');
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

  // Cell click handler
  const handleCellClick = (roomId, timeSlotId, event) => {
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
          <h2>ระบบจองห้องเรียน {buildingName} ({buildingID})</h2>
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
        
        <div className="room-table-container">
          <table className="room-table transposed">
            <thead>
              <tr>
                <th className="building-header">ห้อง</th>
                {timeSlots.map(timeSlot => (
                  <th 
                    key={timeSlot.id} 
                    className={`time-header ${selectedTimeSlot === timeSlot.id ? 'highlighted-header' : ''}`}
                  >
                    {timeSlot.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {floors.map(floor => (
                <Fragment key={floor.id}>
                  <tr className="floor-header-row">
                    <td colSpan={timeSlots.length + 1} className="floor-header">
                      {floor.name}
                    </td>
                  </tr>
                  {floor.rooms.map(room => (
                    <tr key={room.id} className="room-row">
                      <td 
                        className={`room-cell-header ${selectedRoom === room.id ? 'highlighted-header' : ''}`}
                      >
                        ห้อง {room.id}
                      </td>
                      {timeSlots.map(timeSlot => (
                        <td 
                          key={`${room.id}-${timeSlot.id}`} 
                          className={`time-cell 
                            ${isRoomBooked(room.id, selectedDate, timeSlot.id) ? 'booked' : 'available'} 
                            ${selectedRoom === room.id && selectedTimeSlot === timeSlot.id ? 'selected' : ''}
                          `}
                          onClick={(e) => handleCellClick(room.id, timeSlot.id, e)}
                          title={getBookingDetails(room.id, selectedDate, timeSlot.id)}
                        >
                          {isRoomBooked(room.id, selectedDate, timeSlot.id) ? 'จองแล้ว' : 'ว่าง'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      <div className="dynamic-content">
        <section className="booking-form">
          <h2>จองห้อง</h2>
          {bookingSuccess ? (
            <div className="booking-success">
              <div className="success-icon">✓</div>
              <h3>จองห้องเรียบร้อยแล้ว</h3>
              <p>ห้อง {selectedRoom} เวลา {timeSlots.find(slot => slot.id === selectedTimeSlot)?.label}</p>
              <p>ผู้จอง: {userName}</p>
              <p>รหัสนักศึกษา: {studentID}</p>
              <button 
                className="done-button"
                onClick={resetBookingForm}
              >
                เสร็จสิ้น
              </button>
            </div>
          ) : selectedRoom ? (
            <div className="form">
              <h3>ห้อง {selectedRoom} เวลา {timeSlots.find(slot => slot.id === selectedTimeSlot)?.label}</h3>
              <div className="user-info">
                <h4>ข้อมูลผู้จอง</h4>
                <input
                  type="text"
                  placeholder="ชื่อผู้จอง"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="รหัสนักศึกษา"
                  value={studentID}
                  onChange={(e) => setStudentID(e.target.value)}
                  className="student-id-input"
                />
              </div>
              <button 
                className="book-button"
                onClick={bookRoom}
              >
                จองห้อง
              </button>
            </div>
          ) : (
            <p>กรุณาเลือกห้องและเวลาที่ต้องการจองจากตาราง</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
