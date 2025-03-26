import { useState, useRef } from 'react';

export default function Test02() {
  // State for form inputs
  const [id, setId] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const formRef = useRef(null);

  // Google Sheet Web App URL - replace with your deployed Google Apps Script web app URL
  const googleSheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzfOjtDBreBGm_RbDkLnoj9itABa47JZgZ4mXRiPjRMneRI1W0xL2E9kuyhO7eoRgeDPQ/exec';

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    // Create unique name for iframe
    const iframeName = `hidden-iframe-${Date.now()}`;
    
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Set target and action for the form
    const form = formRef.current;
    form.target = iframeName;
    form.action = googleSheetWebAppUrl;
    form.method = 'POST';
    
    // Create hidden inputs for our data
    const createOrUpdateHiddenInput = (name, value) => {
      let input = form.querySelector(`input[name="${name}"]`);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = value;
    };
    
    // Format timestamp, date, and time separately
    const now = new Date();
    const formattedTimestamp = now.toISOString();
    
    // Extract date in YYYY-MM-DD format
    const formattedDate = now.toISOString().split('T')[0];
    
    // Extract time in HH:MM:SS format
    const formattedTime = now.toISOString().split('T')[1].split('.')[0];
    
    // Prepare data for submission
    const submissionData = {
      id,
      comment,
      date: formattedDate,
      time: formattedTime
    };
    
    // Update debug info
    setDebugInfo(submissionData);
    
    // Ensure form data is properly encoded for Google Apps Script
    form.enctype = "application/x-www-form-urlencoded";
    
    createOrUpdateHiddenInput('id', id);
    createOrUpdateHiddenInput('comment', comment);
    createOrUpdateHiddenInput('timestamp', formattedTimestamp);
    createOrUpdateHiddenInput('date', formattedDate);
    createOrUpdateHiddenInput('time', formattedTime);
    
    // Submit the form
    form.submit();
    
    // Set a timeout to consider the submission successful
    setTimeout(() => {
      setMessage('Data submitted to Google Sheet! (Check the sheet to verify)');
      setId('');
      setComment('');
      setIsSubmitting(false);
      
      // Clean up
      if (iframe && iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  };

  return (
    <div className="test2">
      <h1>Test 02</h1>
      <p>Google Sheet Integration Form</p>

      <form ref={formRef} onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="id" style={{ display: 'block', marginBottom: '5px' }}>ID:</label>
          <input
            type="text"
            id="id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="comment" style={{ display: 'block', marginBottom: '5px' }}>Comment:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', minHeight: '100px' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '10px 15px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>

        {message && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#dff0d8',
            color: '#3c763d',
            borderRadius: '4px'
          }}>
            {message}
          </div>
        )}
        
        {/* Debug Section */}
        {debugInfo && (
          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <h3 style={{ marginTop: 0 }}>Debug - Submitted Data:</h3>
            <pre style={{ 
              backgroundColor: '#eee', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto' 
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}