Date Selector Buttons
Selected: Background #1a73e8 (blue), Text white
Normal: Background white, Text black
Hover: Background #e8f0fe (light blue)

Time Headers (Column Headers)
Selected: Background #e8f0fe (light blue), Text #1a73e8 (blue)
Normal: Default styling

Room Headers (Row Headers)
Selected: Background #e8f0fe (light blue), Text #1a73e8 (blue)
Normal: Default styling

Time-Room Cells (Booking Slots)
Selected: Background #1a73e8 (blue), Text white
Past time: Background #f0f0f0 (light gray)
Booked: Background #ffeeee (light red/pink)
Available: Background #f8f9fa (very light gray)
Hover (for available cells): Background #e8f0fe (light blue)

///////////////
set color theme make simplify to this >> 
Normal
Available: Backgroundrgb(188, 235, 173), green, Text white
Available Hover : Background #e8f0fe (light blue) , no background, text white
Available Clicked Select : Background #1a73e8 (blue), Text white

Past time: Background #f0f0f0 (light gray)
Booked: Background #f0f0f0 (light gray)

:root {
  --page-bg: #f0f7ed;
  --base-bg: #f8fdf5;
  --text-color: #292929;
  --accent-color: #1e3d25; 
  --border-color: #d8e8d4; 
  --table-header-bg: #e0f0d9; 
  --selected-bg: #1a73e8; 
  --selected-text: #ffffff;
  --past-bg: #f0f0f0;
  --booked-bg: #f0f0f0;
  --available-bg: #b3e9a3;
  --available-text: #292929;
  --hover-bg: #1a73e8; 
  --hover-text: #ffffff;
}