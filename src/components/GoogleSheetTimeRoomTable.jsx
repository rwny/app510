import React, { useEffect, useMemo } from 'react';
import { normalizeBookingData } from '../utils/googleSheetUtils';
import './GoogleSheetTimeRoomTable.css';

const GoogleSheetTimeRoomTable = ({
  floors,
  timeSlots,
  selectedDate,
  googleSheetBookings,
  getBookingDetails
}) => {
  // Format date for display
  const formattedDate = selectedDate.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Create a date string for comparison in the format YYYY-MM-DD
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  console.log('Selected date for comparison:', selectedDateStr);

  // Normalize all booking data
  const normalizedBookings = useMemo(() => {
    if (!googleSheetBookings || !Array.isArray(googleSheetBookings)) {
      console.log('Google Sheet bookings is not an array or is empty:', googleSheetBookings);
      return [];
    }
    
    console.log('Normalizing Google Sheet bookings:', googleSheetBookings);
    return googleSheetBookings.map(booking => normalizeBookingData(booking, timeSlots));
  }, [googleSheetBookings, timeSlots]);
  
  // Filter bookings for selected date with better date handling
  const dateBookings = useMemo(() => {
    console.log('Total normalized bookings:', normalizedBookings.length);
    console.log('Looking for bookings on date:', selectedDateStr);
    
    return normalizedBookings.filter(booking => {
      if (!booking) return false;
      
      // Try several date formats for matching
      
      // 1. First check the normalized ISO date we created
      if (booking.dateISO === selectedDateStr) {
        console.log('Date match via dateISO:', booking);
        return true;
      }
      
      // 2. If there's a raw date string, try to parse it
      if (booking.date) {
        try {
          // Try different date formats
          let dateObj;
          
          // Try as ISO date (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}/.test(booking.date)) {
            dateObj = new Date(booking.date);
          } 
          // Try as Thai Buddhist date format (DD/MM/BBBB)
    }
    
    // Log all normalized bookings for the selected date
    if (hasBookingsForDate) {
      console.log(`${dateBookings.length} bookings found for ${formattedDate}:`, dateBookings);
    } else {
      console.log(`No bookings found for ${formattedDate}`);
    }
  }, [lastBooking, dateBookings, formattedDate, hasBookingsForDate]);

  return (
    <div className="google-sheet-time-room-table">
      <h3>ข้อมูลการจองจาก Google Sheet</h3>
      <p>วันที่: {formattedDate}</p>
      
      {!hasBookingsForDate ? (
        <p>ไม่พบข้อมูลการจองในวันนี้</p>
      ) : (
        <>
          <div className="last-booking-info">
            <h4>รายการจองล่าสุด:</h4>
            <pre>{JSON.stringify(lastBooking, null, 2)}</pre>
          </div>
          
          <table className="debug-table">
            <thead>
              <tr>
                <th>รหัสนักศึกษา</th>
                <th>อาคาร</th>
                <th>ห้อง</th>
                <th>เวลา (ID)</th>
                <th>เวลา (แสดงผล)</th>
                <th>วันที่</th>
                <th>วันที่บันทึก</th>
                <th>เวลาบันทึก</th>
              </tr>
            </thead>
            <tbody>
              {dateBookings.map((booking, index) => (
                <tr key={index}>
                  <td>{booking.studentId}</td>
                  <td>{booking.buildingId}</td>
                  <td>{booking.roomId}</td>
                  <td>{booking.timeSlotId !== undefined ? booking.timeSlotId : '(ไม่ระบุ)'}</td>
                  <td>{booking.timeSlot || booking.formattedTimeSlot || '(ไม่ระบุ)'}</td>
                  <td>{booking.date}</td>
                  <td>{booking.submissionDate}</td>
                  <td>{booking.submissionTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default GoogleSheetTimeRoomTable;
