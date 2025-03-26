/**
 * Room Booking System - Google Apps Script Backend
 * This script receives booking data from the React app and stores it in Google Sheets
 */




function doGet(e) {
  var action = e.parameter.action;
  
  // Set headers to allow cross-origin requests
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  if (action === 'getBookings') {
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var data = getBookingsData(sheet);
      output.setContent(JSON.stringify(data));
    } catch (error) {
      output.setContent(JSON.stringify({
        error: error.toString()
      }));
    }
  } else {
    output.setContent(JSON.stringify({
      status: "success",
      message: "API is working"
    }));
  }
  
  return output;
}






// Handle HTTP POST requests (for form submissions)
function doPost(e) {
  try {
    // Get access to the active spreadsheet and sheet
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    
    // Log parameters for debugging
    Logger.log("Received parameters: " + JSON.stringify(e.parameter));
    
    // Extract data from the request
    var date = e.parameter.date || '';                    // Booking date
    var buildingId = e.parameter.buildingId || '';        // Building ID
    var roomId = e.parameter.roomId || '';                // Room ID
    var timeSlot = e.parameter.timeSlot || '';            // Time slot
    var studentId = e.parameter.studentId || '';          // Student ID
    var submissionDate = e.parameter.submissionDate || ''; // Date of submission
    var submissionTime = e.parameter.submissionTime || ''; // Time of submission

    if (timeSlot.startsWith("'")) {
      timeSlot = timeSlot.substring(1);
    }

    // Check if headers exist, if not, add them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Student ID", 
        "Building ID", 
        "Room ID", 
        "Time Slot", 
        "Booking Date", 
        "Submission Date", 
        "Submission Time",
      ]);
    }
    
    // Add the booking data to the sheet in the SAME ORDER as headers
    sheet.appendRow([
      studentId,      // Student ID - 1st column
      buildingId,     // Building ID - 5th column
      roomId,         // Room ID - 2nd column
      timeSlot,       // Time Slot - 3rd column
      date,           // Booking date - 4th column
      submissionDate, // Submission Date - 6th column
      submissionTime  // Submission Time - 7th column
    ]);
    
    // Format the date columns to show properly as dates
    if (sheet.getLastRow() > 1) {
      // Format the booking date column (column D - 4th column)
      var dateRange = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1);
      dateRange.setNumberFormat("yyyy-mm-dd");
      
      // Format the submission date column (column F - 6th column)
      var submissionDateRange = sheet.getRange(2, 6, sheet.getLastRow() - 1, 1);
      submissionDateRange.setNumberFormat("yyyy-mm-dd");
      
      // Format the submission time column (column G - 7th column)
      var submissionTimeRange = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1);
      submissionTimeRange.setNumberFormat("hh:mm:ss");
    }
    
    // Return a success response
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", 
      message: "Booking saved successfully"
    }))
    .setMimeType(ContentService.MimeType.JSON);
  } 
  catch (error) {
    // Log the error
    Logger.log("Error: " + error.message);
    
    // Return an error response
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", 
      message: error.message
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}


