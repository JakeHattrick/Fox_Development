import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Alert,
  Input
} from '@mui/material';

const PostgresTablesPage = () => {
  const [uploadResponse, setUploadResponse] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadError(null);
      setUploadResponse(null);
      
      const response = await fetch('http://10.23.8.215:5000/api/v1/upload/catch-file', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Upload failed');
      
      setUploadResponse(result);
      // Clear the file input
      event.target.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Test File Upload
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Input
            type="file"
            onChange={handleFileUpload}
            sx={{ flexGrow: 1 }}
          />
        </Box>
        
        {/* Show upload response or error */}
        {uploadResponse && (
          <Alert severity="success" sx={{ mt: 2 }}>
            File uploaded successfully! Content: {uploadResponse.content}
          </Alert>
        )}
        {uploadError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Upload failed: {uploadError}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default PostgresTablesPage;