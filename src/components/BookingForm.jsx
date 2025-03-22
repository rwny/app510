import React from 'react';

const BookingForm = ({
  bookingSuccess,
  selectedRoom,
  selectedTimeSlot,
  selectedDate,
  studentID,
  timeSlots,
  formatDate,
  formatTimeSlotLong,
  isStudentIDValid,
  setStudentID,
  bookRoom,
  resetBookingForm,
  buildingName,
  buildingID,
  isSubmitting
}) => {
  
  if (bookingSuccess) {
    return (
      <div className="booking-form">
        <div className="booking-success">
          <div>
            <strong>จองห้องเรียนสำเร็จ!</strong>
            <p>ห้อง {selectedRoom} วันที่ {formatDate(selectedDate)} เวลา {formatTimeSlotLong(selectedTimeSlot)}</p>
          </div>
          <button onClick={resetBookingForm} className="book-button">
            เสร็จสิ้น
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-form">
      <div className="booking-form-grid">
        <div className="booking-details">
          {selectedRoom && (
            <strong>ห้อง {selectedRoom}</strong>
          )}
          {selectedTimeSlot !== null && (
            <div>เวลา {formatTimeSlotLong(selectedTimeSlot)}</div>
          )}
          <div>วันที่ {formatDate(selectedDate)}</div>
        </div>
        
        <div className="user-info">
          <input
            type="text"
            value={studentID}
            onChange={(e) => setStudentID(e.target.value)}
            placeholder="รหัสนักศึกษา 8 หลัก"
            maxLength="8"
            disabled={!selectedRoom || selectedTimeSlot === null}
          />
        </div>
        
        <button
          onClick={bookRoom}
          className="book-button"
          disabled={!selectedRoom || selectedTimeSlot === null || !isStudentIDValid || isSubmitting}
        >
          {isSubmitting ? 'กำลังจอง...' : 'จองห้อง'}
        </button>
      </div>
    </div>
  );
};

export default BookingForm;
