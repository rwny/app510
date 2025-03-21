import { useState, useRef } from 'react';

export default function Test01() {
  // State for form inputs
  const [id, setId] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const formRef = useRef(null);

  // Google Sheet Web App URL
  const googleSheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbyPvyg4H1f7HPzJ7uJPUr2lC5ljTWhGA_bMUD42Prg6DaCsk3ivVS_geajTf0U_Ex0gSw/exec';

  // Handle form submission using iframe to bypass CORS
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
      timestamp: formattedTimestamp,
      date: formattedDate,
      time: formattedTime
    };
    
    // Update debug info
    setDebugInfo(submissionData);
    
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
    <div className="test1">
      <h1>Test 01 sdf</h1>
      <p>Enter your data to update Google Sheet fasdf</p>

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
          {isSubmitting ? 'Submitting...' : 'Submit to Google Sheet'}
        </button>

        {message && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: message.includes('successfully') ? '#dff0d8' : '#f2dede',
            color: message.includes('successfully') ? '#3c763d' : '#a94442',
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