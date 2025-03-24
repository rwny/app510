import { Fragment } from 'react';

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
              <div>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '.').replace(' ', '. ')}</div>
            </button>
          );
        })}
      </div>
      <table className={`room-table transposed ${bookingSuccess ? 'disabled-table' : ''}`}>
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
                        onClick={(e) => !isPast && !isBooked && handleCellClick(room.id, timeSlot.id, e)}
                        title={isPast ? 'เวลาที่ผ่านไปแล้ว' : getBookingDetails(room.id, selectedDate, timeSlot.id)}
                        style={{
                          boxSizing: 'border-box',  // This ensures borders are included in the element's dimensions
                          position: 'relative',     // For the pseudo-elements if you're using them for highlighting
                          overflow: 'hidden'        // Prevent content from spilling out
                        }}
                      >
                        {isPast ? '•' : isBooked ? '-' : 'ว่าง'}  
                        {/* •  */}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TimeRoomTable;
