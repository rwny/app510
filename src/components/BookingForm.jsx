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
      <div className="booking-form">
        <table className="booking-table">
          <tbody>
            <tr>
              <td colSpan="3" className="success-message">
                <span className="success-badge">จองห้องเรียนสำเร็จ!</span>
                <span>ห้อง {selectedRoom}</span>
                <span>เวลา {formatTimeSlotLong(selectedTimeSlot)}</span>
                <span>วันที่ {formatDate(selectedDate)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="booking-form">
      <table className="booking-table" style={{width: '100%'}}>
        <tbody>
          <tr>
            <td className="booking-info" style={{width: '65%', paddingRight: '10px'}}>
              <span>{formatDate(selectedDate)}</span>
              {selectedRoom ? <span> ห้อง {selectedRoom}</span> : <span className="placeholder-info">โปรดเลือกห้อง</span>}
              {selectedTimeSlot !== null ? <span> เวลา {formatTimeSlotLong(selectedTimeSlot)}</span> : <span className="placeholder-info">โปรดเลือกเวลา</span>}
            </td>
            <td className="student-input" style={{width: '35%', paddingRight: '30px'}}>
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
                className={`student-input-field ${studentID.length === 8 && !/^6[1-8]/.test(studentID) ? "error-input" : ""}`}
              />
              {studentID.length === 8 && !/^6[1-8]/.test(studentID) && (
                <div className="error-message">รหัสไม่ถูกต้อง</div>
              )}
            </td>
            <td className="book-button-cell" style={{width: '20%'}}>
              <button
                onClick={bookRoom}
                className="book-button"
                disabled={!selectedRoom || selectedTimeSlot === null || !isStudentIDValid || isSubmitting}
              >
                {isSubmitting ? 'กำลังจอง...' : 'จองห้อง'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BookingForm;
