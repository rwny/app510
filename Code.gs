/**
 * Room Booking System - Google Apps Script Backend
 * This script receives booking data from the React app and stores it in Google Sheets
 */

function doGet(e) {
  // Log when the function is called
  Logger.log("doGet function executed at: " + new Date());
  
  // Check if e exists and has parameter property
  if (!e || !e.parameter) {
    Logger.log("No parameters received or e is undefined");
    e = { parameter: {} }; // Create default object to prevent errors
  } else {
    Logger.log("Parameters received: " + JSON.stringify(e.parameter));
  }
  
  var action = e.parameter.action || null;
  
  // Set headers to allow cross-origin requests
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  if (action === 'getBookings') {
    try {
      Logger.log("Fetching bookings data");
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var data = getBookingsData(sheet);
      Logger.log("Retrieved " + (data.length || 0) + " booking records");
      
      // Add timestamp to response for verification
      var response = {
        status: "success",
        timestamp: new Date().toString(),
        data: data
      };
      output.setContent(JSON.stringify(response));
    } catch (error) {
      Logger.log("Error retrieving bookings: " + error.toString());
      output.setContent(JSON.stringify({
        error: error.toString(),
        timestamp: new Date().toString()
      }));
    }
  } else {
    Logger.log("No specific action requested, returning API status");
    output.setContent(JSON.stringify({
      status: "success",
      message: "API is working",
      timestamp: new Date().toString()
    }));
  }
  
  return output;
}

/**
 * Get all booking data from the spreadsheet
 * @param {Sheet} sheet - The Google Sheet to read from
 * @returns {Array} Array of booking objects
 */
function getBookingsData(sheet) {
  // Get all data from the sheet
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  // Log basic info about the data
  Logger.log("Reading data: " + values.length + " rows found");
  
  // If there's no data or only headers, return empty array
  if (values.length <= 1) {
    Logger.log("No booking data found (only headers or empty sheet)");
    return [];
  }
  
  // Extract headers from the first row
  var headers = values[0];
  Logger.log("Headers: " + headers.join(", "));
  
  // Convert headers to camelCase for consistency with frontend
  var camelHeaders = headers.map(function(header) {
    // Convert to string, trim whitespace, replace spaces with camelCase format
    header = String(header).trim();
    // Simple camelCase conversion: lowercase first word, capitalize subsequent words, remove spaces
    return header.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
      if (+match === 0) return ""; // Remove numbers
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    }).replace(/\s+/g, '');
  });
  
  Logger.log("Camel case headers: " + camelHeaders.join(", "));
  
  // Initialize result array
  var result = [];
  
  // Loop through all rows (skip the first one which is headers)
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    
    // Skip completely empty rows
    if (row.every(function(cell) { return cell === ""; })) {
      continue;
    }
    
    // Map each cell to its corresponding header
    for (var j = 0; j < camelHeaders.length; j++) {
      if (j < row.length) {
        obj[camelHeaders[j]] = row[j];
      }
    }
    
    // Add the object to results
    result.push(obj);
  }
  
  Logger.log("Processed " + result.length + " booking records");
  return result;
}

// Handle HTTP POST requests (for form submissions)
function doPost(e) {
  // Add execution timestamp logging
  Logger.log("doPost function executed at: " + new Date());
  Logger.log("Received parameters: " + JSON.stringify(e.parameter));
  
  try {
    // Get access to the active spreadsheet and sheet
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    
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
      Logger.log("Created header row in sheet");
    }
    
    Logger.log("Adding booking: Student ID: " + studentId + ", Room: " + roomId + ", Date: " + date);
    
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
      var dateRange = sheet.getRange(2, 5, sheet.getLastRow() - 1, 1);
      dateRange.setNumberFormat("yyyy-mm-dd");
      
      // Format the submission date column (column F - 6th column)
      var submissionDateRange = sheet.getRange(2, 6, sheet.getLastRow() - 1, 1);
      submissionDateRange.setNumberFormat("yyyy-mm-dd");
      
      // Format the submission time column (column G - 7th column)
      var submissionTimeRange = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1);
      submissionTimeRange.setNumberFormat("hh:mm:ss");
      
      Logger.log("Date formatting applied to columns");
    }
    
    Logger.log("Booking saved successfully");
    
    // Return a success response with timestamp
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", 
      message: "Booking saved successfully",
      timestamp: new Date().toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  } 
  catch (error) {
    // Log the error
    Logger.log("Error in doPost: " + error.message);
    
    // Return an error response with timestamp
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", 
      message: error.message,
      timestamp: new Date().toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
