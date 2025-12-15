// IMPORTS
// React Core
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
// Material UI Components
import { Box, Stack, Paper, Typography, CircularProgress, Button, TextField } from '@mui/material';
// Third Party Libraries
import 'react-datepicker/dist/react-datepicker.css';
// Page Components
import { Header } from '../../pagecomp/Header.jsx';
import { DateRange } from '../../pagecomp/DateRange.jsx';
import { paperStyle } from '../../theme/themes.js';
import { toUTCDateString } from '../../../utils/dateUtils.js';
import { FixedSizeList as List} from 'react-window';

// CONSTANTS & CONFIGURATION
const API_BASE = process.env.REACT_APP_API_BASE;
const REFRESH_INTERVAL = 300000; // 5 minutes

// Validate API base configuration
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}
console.log('API_BASE:', API_BASE);

// UTILITY COMPONENTS
const ReadOnlyInput = React.forwardRef((props, ref) => (
  <input {...props} ref={ref} readOnly />
));

// MAIN COMPONENT
export const QueryPage = () => {
  
  // DATE UTILITIES
  const normalizeStart = (date) => new Date(new Date(date).setHours(0, 0, 0, 0));
  const normalizeEnd = (date) => new Date(new Date(date).setHours(23, 59, 59, 999));
  
  // STATE MANAGEMENT
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return normalizeStart(date);
  });
  const [endDate, setEndDate] = useState(normalizeEnd(new Date()));
  
  const [output, setOutput] = useState(null);
  
  const [optionals, setOptionals] = useState({
    one: '',
    two: '',
    three: '',
    four: ''
  });
  
  const [query, setQuery] = useState('');
  
  // REFS
  const inputRefs = {
    one: useRef(null),
    two: useRef(null),
    three: useRef(null),
    four: useRef(null)
  };
  
  const fileInputRef = useRef(null);
  
  // EVENT HANDLERS - OPTIONAL INPUTS
  const handleOptChange = (e) => {
    const { name, value } = e.target;
    setOptionals((prev) => ({ ...prev, [name]: value }));
  };
  
  // QUERY BUILDING & EXECUTION
  const handleSubmit = () => {
    if (!query) return;
    
    let builtQuery = query;
    
    // Replace {n1} placeholder with formatted optional.one values
    if (optionals.one) {
      const formatted = optionals.one
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `'${s.replace(/'/g, "")}'`)
        .join(',');
      builtQuery = builtQuery.replace(/\{n1\}/g, formatted);
    }
    // Replace {n2} placeholder with formatted optional.two values
    if (optionals.two) {
      const formatted = optionals.two
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `'${s.replace(/'/g, "")}'`)
        .join(',');
      builtQuery = builtQuery.replace(/\{n2\}/g, formatted);
    }
    // Replace {n3} placeholder with formatted optional.three values
    if (optionals.three) {
      const formatted = optionals.three
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `'${s.replace(/'/g, "")}'`)
        .join(',');
      builtQuery = builtQuery.replace(/\{n3\}/g, formatted);
    }
    // Replace {n4} placeholder with formatted optional.four values
    if (optionals.four) {
      const formatted = optionals.four
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `'${s.replace(/'/g, "")}'`)
        .join(',');
      builtQuery = builtQuery.replace(/\{n4\}/g, formatted);
    }
    // Replace date placeholders
    builtQuery = builtQuery.replace(/\{start\}/g, startDate.toISOString().slice(0, 10));
    builtQuery = builtQuery.replace(/\{end\}/g, endDate.toISOString().slice(0, 10));
    
    handleQuery(builtQuery);
  };
  
  // Execute the SQL query via API
  const handleQuery = async (q) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/sql-portal/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: q })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setOutput(data);
      } else {
        setOutput(`Error: ${data.error}\nMessage: ${data.message || 'No additional details'}`);
      }
    } catch (error) {
      console.error('Query error:', error);
      setOutput(`Network Error: ${error.message}`);
    }
  };
  
  // CSV IMPORT FUNCTIONALITY
  const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  
  const looksLikeHeader = (cells) =>
    cells.some((c) => /^(id|sn|serial|serial_?number|part|pn|name|model)$/i.test(c?.trim()));
  
  const handleImport = () => {
    fileInputRef.current?.click();
  };
  
  //Process CSV file and populate optional input fields
  const onCsvChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isCsv = /\.csv$/i.test(file.name) || /text\/csv/i.test(file.type);
    if (!isCsv) {
      alert('Please choose a .csv file');
      e.target.value = '';
      return;
    }
    
    try {
      const text = await file.text();
      
      // Normalize newlines, split rows, drop empty lines
      const lines = text
        .replace(/\r/g, '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      
      if (!lines.length) {
        alert('CSV is empty');
        return;
      }
      
      // Get first row to detect header
      const firstRow = csvSplit(lines[0]).map((c) => c.replace(/^"(.*)"$/, '$1').trim());
      const startIdx = looksLikeHeader(firstRow) ? 1 : 0;
      
      const col1 = [];
      const col2 = [];
      const col3 = [];
      const col4 = [];
      
      // Parse each row and extract columns
      for (let i = startIdx; i < lines.length; i++) {
        const cells = csvSplit(lines[i]).map((c) => c.replace(/^"(.*)"$/, '$1').trim());
        if (!cells.length) continue;
        if (cells[0]) col1.push(cells[0]);
        if (cells[1]) col2.push(cells[1]);
        if (cells[2]) col3.push(cells[2]);
        if (cells[3]) col4.push(cells[3]);
      }
      
      // Update state with imported data
      flushSync(() => {
        setOptionals({
          one: col1.join(','),
          two: col2.join(','),
          three: col3.join(','),
          four: col4.join(',')
        });
      });
      
      //alert(`Imported ${lines.length - startIdx} row(s) into optionals`);
    } catch (err) {
      console.error('CSV import error:', err);
      alert(`Import failed: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  // CSV EXPORT FUNCTIONALITY
  const handleExport = () => {
    if (!output?.success || !output?.rows?.length) {
      alert('No data to export');
      return;
    }
    
    // Create CSV header
    const headers = output.fields.map(field => field.name).join(',');
    
    // Create CSV rows
    const csvRows = output.rows.map(row => {
      return output.fields.map(field => {
        const value = row[field.name];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });
    
    // Combine headers and rows
    const csv = [headers, ...csvRows].join('\n');
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const VirtualizedResults = ({ fields, rows, height = 520, rowHeight = 36 }) => {
    const colMin = 150; // min px per column for readability
    const gridMinWidth = fields.length * colMin;
    const colTemplate = `repeat(${fields.length}, minmax(${colMin}px, 1fr))`;

    const Row = ({ index, style }) => {
      const row = rows[index];
      return (
        <Box
          role="row"
          style={style}
          sx={{
            display: 'grid',
            gridTemplateColumns: colTemplate,
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            px: 1,
            whiteSpace: 'nowrap',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' }
          }}
        >
          {fields.map((f, i) => (
            <Box
              key={i}
              role="cell"
              sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', pr: 1 }}
              title={row[f.name] != null ? String(row[f.name]) : ''}
            >
              {row[f.name] != null ? String(row[f.name]) : ''}
            </Box>
          ))}
        </Box>
      );
    };

    return (
      <Box sx={{ width: '100%', overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
        {/* sticky header */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: 'grey.100',
            borderBottom: '1px solid #ddd'
          }}
        >
          <Box
            role="row"
            sx={{
              display: 'grid',
              gridTemplateColumns: colTemplate,
              fontWeight: 'bold',
              px: 1,
              py: 1,
              minWidth: gridMinWidth
            }}
          >
            {fields.map((f, i) => (
              <Box key={i} role="columnheader" sx={{ pr: 1 }}>
                {f.name}
              </Box>
            ))}
          </Box>
        </Box>

        {/* virtualized body */}
        <Box sx={{ height, minWidth: gridMinWidth }}>
          <List
            height={height}
            itemCount={rows.length}
            itemSize={rowHeight}
            width="100%"
          >
            {Row}
          </List>
        </Box>
      </Box>
    );
  };

  
  // RENDER
  return (
    <Box p={1}>
      {/* Header Section */}
      <Header title="Query Page" subTitle="Query the database to your heart's desire" />
      
      {/* Input Controls Section */}
      <Box>
        <Stack direction="row">
          {/* Optional Input Fields */}
          <TextField
            name="one"
            label="Input 1 {n1}"
            placeholder="Optional input 1 {n1}"
            value={optionals.one}
            onChange={handleOptChange}
            size="small"
            key="optional-one"
          />
          <TextField
            name="two"
            label="Input 2 {n2}"
            placeholder="Optional input 2 {n2}"
            value={optionals.two}
            onChange={handleOptChange}
            size="small"
            key="optional-two"
          />
          <TextField
            name="three"
            label="Input 3 {n3}"
            placeholder="Optional input 3 {n3}"
            value={optionals.three}
            onChange={handleOptChange}
            size="small"
            key="optional-three"
          />
          <TextField
            name="four"
            label="Input 4 {n4}"
            placeholder="Optional input 4 {n4}"
            value={optionals.four}
            onChange={handleOptChange}
            size="small"
            key="optional-four"
          />
          
          {/* Hidden File Input for CSV Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={onCsvChosen}
          />
          
          {/* Import Button */}
          <Button onClick={handleImport} variant="contained" size="small">
            Import
          </Button>
          
          {/* Date Range Picker */}
          <DateRange
            startDate={startDate}
            setStartDate={setStartDate}
            normalizeStart={normalizeStart}
            endDate={endDate}
            setEndDate={setEndDate}
            normalizeEnd={normalizeEnd}
            inline={true}
          />
        </Stack>
      </Box>
      
      {/* Query Input Section */}
      <Box>
        <TextField
          label="Input Query Here"
          value={query}
          rows={6}
          multiline
          fullWidth
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={handleSubmit} variant="contained">
          Submit
        </Button>
      </Box>
      
      {/* Results Display Section */}
      <Box>
        {output?.success && output?.rows?.length > 0 ? (
          <Box sx={{ overflowX: 'auto', overflowY: 'auto' }}>
            <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
              {output.rowCount} rows returned in {output.executionTime}
            </Typography>

            {output.rows.length > 100 ? (
              // Virtualized for large result sets
              <VirtualizedResults fields={output.fields} rows={output.rows} />
            ) : (
              // Regular table with a scroll container for comfort
              <Box sx={{ maxHeight: 520, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f2f2f2' }}>
                    <tr>
                      {output.fields.map((field, index) => (
                        <th
                          key={index}
                          style={{
                            border: '1px solid #ddd',
                            padding: '8px',
                            textAlign: 'left',
                            fontWeight: 'bold'
                          }}
                        >
                          {field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {output.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {output.fields.map((field, colIndex) => (
                          <td
                            key={colIndex}
                            style={{
                              border: '1px solid #ddd',
                              padding: '8px',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              maxWidth: 320
                            }}
                            title={row[field.name] != null ? String(row[field.name]) : ''}
                          >
                            {row[field.name] != null ? String(row[field.name]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        ) : (
          <Typography>Query Output Here</Typography>
        )}
        
        {/* Export Button */}
        <Button onClick={handleExport} variant="contained">
          Export
        </Button>
      </Box>
    </Box>
  );
};

export default QueryPage;