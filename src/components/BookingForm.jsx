import React from 'react';

function BookingForm({
  bookingSuccess,
  selectedRoom,
  selectedTimeSlot,
  selectedDate,
  studentID,
  timeSlots,
  formatDate,
  formatTimeSlotLong, // Added the new formatter
  isStudentIDValid,
  setStudentID,
  bookRoom,
  resetBookingForm,
  buildingName,
  buildingID
}) {
  return (
    <section className="booking-form">
      {bookingSuccess ? (
        <div className="booking-success compact">
          <div className="success-icon">✓</div>
          <div className="success-details">
            <h3>จองห้องเรียบร้อยแล้ว</h3>
            <p className="student-id-text">รหัสนักศึกษา : {studentID}</p> 
            <p className="booking-details-text">{buildingName} ({buildingID}) • ห้อง {selectedRoom} • {formatTimeSlotLong(selectedTimeSlot)} • {formatDate(selectedDate)}</p>
          </div>
          <button 
            className="done-button"
            onClick={resetBookingForm}
          >
            เสร็จสิ้น
          </button>
        </div>
      ) : selectedRoom ? (
        <div className="form">
          <h3>เลือกห้อง {selectedRoom} • {formatTimeSlotLong(selectedTimeSlot)} •  {formatDate(selectedDate)}</h3>
          <div className="user-info">
            <h4>ข้อมูลผู้จอง</h4>
            <div className="input-container">
              <input
                type="text"
                placeholder="รหัสนักศึกษา 8 หลัก"
                value={studentID}
                onChange={(e) => setStudentID(e.target.value.trim())}
                maxLength={8}
                className={`student-id-input ${studentID.length > 0 && !isStudentIDValid ? 'invalid' : ''}`}
              />
              {studentID.length > 0 && !isStudentIDValid && 
                <div className="validation-message">รหัสนักศึกษาต้องมี 8 หลัก</div>
              }
            </div>
          </div>
          <button 
            className="book-button"
            onClick={bookRoom}
            disabled={!isStudentIDValid}
          >
            จองห้อง
          </button>
        </div>
      ) : (
        <p>กรุณาเลือกห้องและเวลาที่ต้องการจองจากตาราง</p>
      )}
    </section>
  );
}

export default BookingForm;
