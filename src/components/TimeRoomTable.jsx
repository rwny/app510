import { Fragment, useEffect, useState, useRef } from 'react';

function TimeRoomTable({ 
  floors,
  timeSlots,
  selectedDate,
  setSelectedDate,
  availableDates,
  selectedRoom, 
  selectedTimeSlot,
  isRoomBooked, 
  isTimeSlotPast, 
  handleCellClick, 
  getBookingDetails,
  bookingSuccess
}) {
  // Add state to track current date
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Add state for tooltip
  const [tooltip, setTooltip] = useState({
    show: false,
    x: 0,
    y: 0,
    content: '',
    date: null,
    room: null,
    timeSlot: null
  });

  // Ref for tooltip element
  const tooltipRef = useRef(null);
  
  // Effect to check for date changes every minute
  useEffect(() => {
    const checkDateChange = () => {
      const now = new Date();
      if (now.getDate() !== currentDate.getDate() || 
          now.getMonth() !== currentDate.getMonth() || 
          now.getFullYear() !== currentDate.getFullYear()) {
        setCurrentDate(now);
        setSelectedDate(now);
      }
    };
    
    // Run immediately and then every minute
    checkDateChange();
    const intervalId = setInterval(checkDateChange, 60000);
    
    return () => clearInterval(intervalId);
  }, [currentDate, setSelectedDate]);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('th-TH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format timeslot for display
  const formatTimeSlot = (timeSlotId) => {
    const slot = timeSlots.find(slot => slot.id === timeSlotId);
    if (!slot) return '';
    return `${slot.label.split('-')[0]}:00 - ${slot.label.split('-')[1]}:00`;
  };

  // Handle mouse enter on cell
  const handleMouseEnter = (e, room, timeSlot) => {
    if (!room || timeSlot === undefined) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Prepare tooltip content
    const dateFormatted = formatDate(selectedDate);
    const timeSlotFormatted = formatTimeSlot(timeSlot);
    const status = isTimeSlotPast(selectedDate, timeSlot) 
      ? 'ผ่านไปแล้ว' 
      : isRoomBooked(room.id, selectedDate, timeSlot) 
        ? 'จองแล้ว' 
        : 'ว่าง';
    
    const bookingInfo = getBookingDetails(room.id, selectedDate, timeSlot);
    
    const tooltipContent = `
      <div class="tooltip-content">
        <div class="tooltip-header">
          <strong>ห้อง ${room.id}</strong>
        </div>
        <div>วันที่: ${dateFormatted}</div>
        <div>เวลา: ${timeSlotFormatted}</div>
        <div>สถานะ: ${status}</div>
        <div>${bookingInfo !== 'ว่าง' ? bookingInfo : ''}</div>
      </div>
    `;
    
    // Position tooltip below the cell instead of above
    setTooltip({
      show: true,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10, // Position below the cell with a small gap
      content: tooltipContent,
      date: selectedDate,
      room: room,
      timeSlot: timeSlot
    });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  // Effect to adjust tooltip position based on viewport
  useEffect(() => {
    if (tooltip.show && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Check if tooltip is out of viewport bounds
      if (tooltipRect.right > viewportWidth) {
        setTooltip(prev => ({ 
          ...prev, 
          x: prev.x - (tooltipRect.right - viewportWidth) - 10
        }));
      }
      
      if (tooltipRect.left < 0) {
        setTooltip(prev => ({ 
          ...prev, 
          x: prev.x - tooltipRect.left + 10
        }));
      }
      
      if (tooltipRect.top < 0) {
        setTooltip(prev => ({ 
          ...prev, 
          y: tooltipRect.height + 10
        }));
      }
    }
  }, [tooltip.show]);

  return (
    <div className="room-table-container">
      <div className="date-selector">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const isSelected = date.toDateString() === selectedDate.toDateString();
          
          return (
            <button
              key={date.toISOString()}
              className={`date-button ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div>
                {date.toLocaleDateString('en-US', { weekday: 'short' }).replace('.', '')}. {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' }).replace('.', '')}.
              </div>
            </button>
          );
        })}
      </div>
      <table className={`room-table transposed ${bookingSuccess ? 'disabled-table' : ''}`}>
        <thead>
          <tr>
            <th className="building-header"></th>
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
                  {/* {floor.name} */}
                </td>
              </tr>
              {floor.rooms.map(room => (
                <tr key={room.id} className="room-row">
                  <td 
                    className={`room-cell-header ${selectedRoom === room.id ? 'highlighted-header' : ''}`}
                  >
                    ห้อง {room.id}
                  </td>
                  {timeSlots.map(timeSlot => {
                    const isPast = isTimeSlotPast(selectedDate, timeSlot.id);
                    const isBooked = isRoomBooked(room.id, selectedDate, timeSlot.id);
                    const isSelected = selectedRoom === room.id && selectedTimeSlot === timeSlot.id;
                    
                    return (
                      <td 
                        key={`${room.id}-${timeSlot.id}`} 
                        className={`time-cell 
                          ${isPast ? 'past' : isBooked ? 'booked' : 'available'} 
                          ${isSelected ? 'selected' : ''}
                        `}
                        onClick={(e) => {
                          if (!isPast && !isBooked) {
                            handleCellClick(room.id, timeSlot.id, selectedDate);
                          }
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, room, timeSlot.id)}
                        onMouseLeave={handleMouseLeave}
                        title=""
                      >
                        {isPast ? '-' : isBooked ? '-' : 'ว่าง'}  
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      
      {/* Custom Tooltip */}
      {tooltip.show && (
        <div 
          ref={tooltipRef}
          className="custom-tooltip below-cell" 
          style={{ 
            position: 'fixed',
            top: `${tooltip.y}px`,
            left: `${tooltip.x}px`,
            transform: 'translate(-50%, 0)', // Changed from 'translate(-50%, -100%)' to show below
            zIndex: 1000
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}

export default TimeRoomTable;
