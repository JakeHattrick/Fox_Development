import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Button, Divider, TextField, useTheme, Alert } from '@mui/material';
//import { Upload, FileJson, Eye, Settings, Download } from '@mui/icons-material';
import UploadIcon from '@mui/icons-material/Upload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PanoramaPhotosphereIcon from '@mui/icons-material/PanoramaPhotosphere';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';
import { Header } from '../../pagecomp/Header.jsx';
import { buttonStyle, tableStyle, headerStyle, divStyle, dataTextStyle } from '../../theme/themes.js';
import { exportSecureCSV } from '../../../utils/exportUtils.js';

export const JsonToCsv = () => {
  const theme = useTheme();
  
  // Main state
  const [jsonData, setJsonData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState('upload'); // upload, explore, convert
  const [selectedPath, setSelectedPath] = useState([]);
  const [csvData, setCsvData] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [exportCooldown, setExportCooldown] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  // File handling
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setJsonData(parsed);
      setFileName(file.name.replace('.json', ''));
      setStep('explore');
      setExpandedPaths(new Set(['root']));
    } catch (error) {
      setError('Invalid JSON file. Please check the format and try again.');
    }
  }, []);

  // Utility functions
  const getValueAtPath = useCallback((obj, path) => {
    if (path.length === 0) return obj;
    return path.reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return null;
    }, obj);
  }, []);

  const isArray = (value) => Array.isArray(value);
  const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

  const toggleExpanded = useCallback((path) => {
    const pathKey = path.join('.');
    setExpandedPaths(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(pathKey)) {
        newExpanded.delete(pathKey);
      } else {
        newExpanded.add(pathKey);
      }
      return newExpanded;
    });
  }, []);

  // Object flattening for CSV conversion
  const flattenObject = useCallback((obj, prefix = '') => {
    const flattened = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (isObject(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], newKey));
        } else if (isArray(obj[key])) {
          flattened[newKey] = JSON.stringify(obj[key]);
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  }, []);

  // CSV conversion
  const convertToCsv = useCallback(() => {
    const dataAtPath = getValueAtPath(jsonData, selectedPath);
    
    if (!isArray(dataAtPath)) {
      setError('Selected path does not contain an array. Please select an array to convert to CSV.');
      return;
    }

    if (dataAtPath.length === 0) {
      setError('Selected array is empty.');
      return;
    }

    setError('');

    // Flatten all objects and collect all possible headers
    const flattenedRows = dataAtPath.map(item => {
      if (isObject(item)) {
        return flattenObject(item);
      } else {
        return { value: item };
      }
    });

    // Get all unique headers
    const allHeaders = new Set();
    flattenedRows.forEach(row => {
      Object.keys(row).forEach(key => allHeaders.add(key));
    });

    const headers = Array.from(allHeaders).sort();

    // Convert to CSV format for export
    const csvRows = flattenedRows.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        return String(value);
      })
    );

    setCsvData({ headers, rows: csvRows });
    setStep('convert');
  }, [jsonData, selectedPath, getValueAtPath, flattenObject]);

  // Export functionality using your existing utility
  const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  };

  const exportToCSV = useCallback(() => { 
    try {
      const filename = `${fileName || 'converted'}_${getTimestamp()}.csv`;
      exportSecureCSV(csvData.rows, csvData.headers, filename);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Export failed. Please try again.');
    }
  }, [csvData, fileName]);

  const handleExportCSV = useCallback(() => {
    if (exportCooldown) return;
    setExportCooldown(true);
    try {
      exportToCSV();
    } catch(err) {
      console.error(err);
      setError('Export failed');
    } finally {
      setTimeout(() => setExportCooldown(false), 3000);
    }
  }, [exportToCSV, exportCooldown]);

  // Reset function
  const reset = useCallback(() => {
    setJsonData(null);
    setFileName('');
    setStep('upload');
    setSelectedPath([]);
    setCsvData('');
    setExpandedPaths(new Set());
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // JSON hierarchy renderer
  const renderJsonHierarchy = useCallback((obj, path = [], depth = 0) => {
    if (!obj || depth > 10) return null;

    const pathKey = path.join('.');
    const isExpanded = expandedPaths.has(pathKey);

    if (isArray(obj)) {
      const hasObjects = obj.length > 0 && isObject(obj[0]);
      const canSelect = hasObjects;

      return (
        <Box key={pathKey} sx={{ ml: depth * 2, mb: 1 }}>
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1,
              borderRadius: 1,
              cursor: 'pointer',
              backgroundColor: selectedPath.join('.') === pathKey && canSelect 
                ? theme.palette.primary.light 
                : 'transparent',
              '&:hover': { backgroundColor: theme.palette.action.hover },
              borderLeft: canSelect ? `3px solid ${theme.palette.success.main}` : 'none'
            }}
            onClick={() => {
              if (canSelect) {
                setSelectedPath([...path]);
              }
              toggleExpanded(path);
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {isExpanded ? '▼' : '▶'} [{obj.length}] {path[path.length - 1] || 'root'}
            </Typography>
            {canSelect && (
              <Typography variant="caption" sx={{ 
                ml: 1, 
                px: 1, 
                py: 0.5, 
                backgroundColor: theme.palette.success.light,
                borderRadius: 1 
              }}>
                Can convert
              </Typography>
            )}
          </Box>
          {isExpanded && obj.length > 0 && renderJsonHierarchy(obj[0], [...path, '0'], depth + 1)}
        </Box>
      );
    }

    if (isObject(obj)) {
      const keys = Object.keys(obj);
      
      return (
        <Box key={pathKey} sx={{ ml: depth * 2, mb: 1 }}>
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1,
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { backgroundColor: theme.palette.action.hover }
            }}
            onClick={() => toggleExpanded(path)}
          >
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {isExpanded ? '▼' : '▶'} {`{${keys.length}} ${path[path.length - 1] || 'root'}`}
            </Typography>
          </Box>
          {isExpanded && (
            <Box sx={{ ml: 2 }}>
              {keys.slice(0, 20).map(key => 
                renderJsonHierarchy(obj[key], [...path, key], depth + 1)
              )}
              {keys.length > 20 && (
                <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
                  ... and {keys.length - 20} more properties
                </Typography>
              )}
            </Box>
          )}
        </Box>
      );
    }

    return (
      <Typography 
        key={pathKey} 
        variant="body2" 
        sx={{ 
          ml: (depth + 1) * 2, 
          fontFamily: 'monospace', 
          color: theme.palette.text.secondary 
        }}
      >
        {path[path.length - 1]}: {typeof obj === 'string' 
          ? `"${obj.slice(0, 50)}${obj.length > 50 ? '...' : ''}"` 
          : String(obj)}
      </Typography>
    );
  }, [expandedPaths, selectedPath, theme, toggleExpanded]);

  // Preview data for selected path
  const previewData = useCallback(() => {
    const dataAtPath = getValueAtPath(jsonData, selectedPath);
    if (isArray(dataAtPath) && dataAtPath.length > 0) {
      return JSON.stringify(dataAtPath.slice(0, 3), null, 2);
    }
    return 'No preview available';
  }, [jsonData, selectedPath, getValueAtPath]);

  return (
    <Box>
      <Header 
        title="JSON to CSV Converter" 
        subTitle="Upload JSON files, explore their structure, and convert arrays to CSV format"
      />

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {step === 'upload' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="json-upload"
            />
            <label htmlFor="json-upload">
              <Button
                sx={buttonStyle}
                component="span"
                startIcon={<UploadIcon />}
              >
                Choose JSON File
              </Button>
            </label>
          </>
        )}

        {step === 'explore' && (
          <>
            <Button sx={buttonStyle} onClick={reset}>
              Upload Different File
            </Button>
            {selectedPath.length > 0 && (
              <Button 
                sx={buttonStyle} 
                onClick={convertToCsv}
                startIcon={<SettingsIcon />}
              >
                Convert to CSV
              </Button>
            )}
          </>
        )}

        {step === 'convert' && (
          <>
            <Button sx={buttonStyle} onClick={() => setStep('explore')}>
              Back to Explorer
            </Button>
            <Button 
              sx={buttonStyle} 
              onClick={handleExportCSV}
              startIcon={<DownloadIcon />}
              disabled={exportCooldown}
            >
              {exportCooldown ? 'Exporting...' : 'Export CSV'}
            </Button>
          </>
        )}
      </Box>

      <Divider />

      {/* Content based on step */}
      {step === 'upload' && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <UploadFileIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Upload JSON File
          </Typography>
          <Typography color="textSecondary">
            Select a JSON file to analyze its structure and convert to CSV
          </Typography>
        </Box>
      )}

      {step === 'explore' && (
        <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
          {/* JSON Structure Panel */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              JSON Structure
            </Typography>
            <Box sx={{ 
              border: `1px solid ${theme.palette.divider}`, 
              borderRadius: 1, 
              p: 2, 
              maxHeight: 400, 
              overflow: 'auto',
              backgroundColor: theme.palette.background.paper
            }}>
              {renderJsonHierarchy(jsonData)}
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              💡 Click on arrays containing objects to select them for CSV conversion
            </Typography>
          </Box>

          {/* Selection Details Panel */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Selection Details
            </Typography>
            {selectedPath.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ p: 2, backgroundColor: theme.palette.primary.light, borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Path
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedPath.length === 0 ? 'root' : selectedPath.join(' → ')}
                  </Typography>
                </Box>
                
                <Box sx={{ p: 2, backgroundColor: theme.palette.success.light, borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Preview (first 3 items)
                  </Typography>
                  <Typography 
                    variant="caption" 
                    component="pre" 
                    sx={{ 
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 200,
                      overflow: 'auto',
                      display: 'block'
                    }}
                  >
                    {previewData()}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PanoramaPhotosphereIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 2 }} />
                <Typography color="textSecondary">
                  Select an array from the JSON structure to convert to CSV
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {step === 'convert' && csvData && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
            <Typography>Conversion completed successfully.</Typography>
            <Typography>Rows: {csvData.rows.length}</Typography>
            <Typography>Columns: {csvData.headers.length}</Typography>
            <Typography>Source: {selectedPath.join(' → ') || 'root'}</Typography>
          </Box>

          {/* CSV Preview Table */}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {csvData.headers.map((header, idx) => (
                    <th key={idx} style={headerStyle}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.rows.slice(0, 50).map((row, idx) => (
                  <tr key={idx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} style={dataTextStyle}>
                        {String(cell).length > 100 
                          ? `${String(cell).substring(0, 100)}...` 
                          : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.rows.length > 50 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Showing first 50 rows of {csvData.rows.length} total rows
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default JsonToCsv;