import React, { useEffect } from 'react';

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
  
  useEffect(() => {
    if (bookingSuccess) {
      const timer = setTimeout(() => {
        resetBookingForm();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [bookingSuccess, resetBookingForm]);

  if (bookingSuccess) {
    return (
      <div className="booking-form fixed-height">
        <div className="booking-form-grid">
          <div className="booking-details">
            <div className="booking-info-row">
              <span className="success-badge">จองห้องเรียนสำเร็จ!</span>
              <span>ห้อง {selectedRoom}</span>
              <span>เวลา {formatTimeSlotLong(selectedTimeSlot)}</span>
              <span>วันที่ {formatDate(selectedDate)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-form fixed-height">
      <div className="booking-form-grid">
        <div className="booking-details">
          <div className="booking-info-row">
            <span>Choose {formatDate(selectedDate)}</span>
            {selectedRoom ? <span>ห้อง {selectedRoom}</span> : <span className="placeholder-info">โปรดเลือกห้อง</span>}
            {selectedTimeSlot !== null ? <span>เวลา {formatTimeSlotLong(selectedTimeSlot)}</span> : <span className="placeholder-info">โปรดเลือกเวลา</span>}
          </div>
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
