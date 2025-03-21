function doGet(e) {
   return handleResponse(e);
 }
 
 function doPost(e) {
   return handleResponse(e);
 }
 
 function handleResponse(e) {
   // Handle OPTIONS request for CORS preflight
   if (e && e.requestMethod === 'OPTIONS') {
     return ContentService.createTextOutput('')
       .setMimeType(ContentService.MimeType.TEXT);
   }
 
   try {
     // Process the data (can be from JSON or form submission)
     var data = {};
 
     if (e && e.parameter) {
       // Handle form-submitted data
       data.id = e.parameter.id;
       data.name = e.parameter.name;
       data.comment = e.parameter.comment;
     } else if (e && e.postData && e.postData.contents) {
       // Handle JSON data
       data = JSON.parse(e.postData.contents);
     }
 
     // Access the spreadsheet
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 
     // Append the data to the sheet
     sheet.appendRow([data.id, data.name, data.comment, new Date()]);
 
     // Create the JSON response
     var jsonOutput = JSON.stringify({ success: true });
     var output = ContentService.createTextOutput(jsonOutput)
       .setMimeType(ContentService.MimeType.JSON);
 
     // Set CORS headers
     output.addHeader('Access-Control-Allow-Origin', '*');
     output.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
     output.addHeader('Access-Control-Allow-Headers', 'Content-Type');
 
     return output;
 
   } catch (error) {
     // Create the error JSON response
     var errorOutput = JSON.stringify({ success: false, error: error.toString() });
     var output = ContentService.createTextOutput(errorOutput)
       .setMimeType(ContentService.MimeType.JSON);
 
     // Set CORS headers
     output.addHeader('Access-Control-Allow-Origin', '*');
     output.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
     output.addHeader('Access-Control-Allow-Headers', 'Content-Type');
     
     return output;
   }
 }
