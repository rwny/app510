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
            type="tel"
            value={studentID}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value) && value.length <= 8) {
                setStudentID(value);
              }
            }}
            placeholder="รหัสนักศึกษา 8 หลัก"
            maxLength="8"
            pattern="\d{8}"
            title="กรุณากรอกรหัสนักศึกษา 8 หลัก (ปีปัจจุบัน 68 และย้อนหลัง 7 ปี)"
            disabled={!selectedRoom || selectedTimeSlot === null}
            className={studentID.length === 8 && !/^6[1-8]/.test(studentID) ? "error-input" : ""}
          />
          {studentID.length === 8 && !/^6[1-8]/.test(studentID) && (
            <div className="error-message">wrong-ID</div>
          )}
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
