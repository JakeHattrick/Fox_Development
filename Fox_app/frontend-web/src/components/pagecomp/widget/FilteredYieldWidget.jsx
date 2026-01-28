// Widget for TestStation Reports
// ------------------------------------------------------------
// Imports
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
// Page Comps
import { Header } from '../../pagecomp/Header.jsx';
import { DateRange } from '../../pagecomp/DateRange.jsx'
// Style Guides
import { buttonStyle, paperStyle } from '../../theme/themes.js';
// Utils
import { fetchFilteredYieldsQuery } from '../../../utils/queryUtils.js';
// Global Settings
import { useGlobalSettings } from '../../../data/GlobalSettingsContext.js';

// ------------------------------------------------------------
// Environment / constants
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

// ------------------------------------------------------------
// Helper: Get week dates from a given date (Monday to Sunday)
function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  
  const monday = new Date(d.setDate(diff));
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates;
}

// ------------------------------------------------------------
// Helper: Parse CSV file for serial numbers
function parseSerialNumbersCSV(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const serialNumbers = [];
  
  // Skip header if it exists (check if first line contains common header terms)
  const startIndex = lines[0] && /serial|sn|number/i.test(lines[0]) ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim()).filter(Boolean);
    // Take the first column value
    if (parts[0]) {
      serialNumbers.push(parts[0]);
    }
  }
  
  return serialNumbers;
}

// ------------------------------------------------------------
// Component
export function FilteredYieldWidget({ widgetId }) {
  // ----- Local state (must be at top level)
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // ----- Global settings & extractions
  const { state, dispatch } = useGlobalSettings();

  // ----- Guards: missing global state or widget id
  if (!state) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Loading global state...</Box></Paper>;
  }
  if (!widgetId) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Widget ID missing</Box></Paper>;
  }

  // ----- Widget settings pulled from global state
  const widgetSettings = state.widgetSettings?.[widgetId] ?? {};

  // Use a stable primitive key for dependencies
  const dateISO = widgetSettings.date ?? state.startDate.value;
  const serials = widgetSettings.sns ?? [];
  const mode = widgetSettings.mode ?? 'daily';

  // Only create Date object when dateISO actually changes
  const date = useMemo(() => (dateISO ? new Date(dateISO) : null), [dateISO]);

  // Calculate date range based on mode
  const dateRange = useMemo(() => {
    if (!date) return [];
    
    if (mode === 'daily') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return [`${year}-${month}-${day}`];
    } else {
      return getWeekDates(date);
    }
  }, [date, mode]);

  // ----------------------------------------------------------
  // Helper: update current widget's settings (merge)
  const updateWidgetSettings = (updates) => {
    dispatch({
      type: 'UPDATE_WIDGET_SETTINGS',
      widgetId,
      settings: updates,
    });
  };

  // ----------------------------------------------------------
  // Helper: split array into chunks
  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // ----------------------------------------------------------
  // Fetch: test yields data with batching
  useEffect(() => {
    if (!date || !mode || dateRange.length === 0 || serials.length === 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const CHUNK_SIZE = 2000;

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Split serials into chunks
        const snChunks = chunkArray(serials, CHUNK_SIZE);
        const totalChunks = snChunks.length;
        
        console.log(`Processing ${serials.length} SNs in ${totalChunks} chunks of up to ${CHUNK_SIZE}`);

        // Accumulate results from all chunks
        const allResults = [];

        // Process each chunk
        for (let i = 0; i < snChunks.length; i++) {
          if (!isMounted) break;

          const chunk = snChunks[i];
          console.log(`Processing chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
          
          const chunkResults = await fetchFilteredYieldsQuery({
            dates: dateRange,
            sns: chunk,
            key: `tpy_filtered_yields_chunk_${i}`,
            setDataCache: () => {}, // Don't update state for individual chunks
            API_BASE,
            API_Route: '/api/v1/workstation-routes/filtered-yields'
          });
          
          allResults.push(...chunkResults);
        }

        // Merge results by model
        const mergedByModel = allResults.reduce((acc, item) => {
          const existing = acc.find(m => m.model === item.model);
          if (existing) {
            existing.assy2_total += item.assy2_total || 0;
            existing.fla_total += item.fla_total || 0;
            existing.fct_total += item.fct_total || 0;
            // Recalculate yields based on aggregated totals
            existing.test_yield_fla = existing.assy2_total && existing.fla_total 
              ? Number(((existing.assy2_total / existing.fla_total) * 100).toFixed(2))
              : null;
            existing.test_yield_fct = existing.assy2_total && existing.fct_total
              ? Number(((existing.assy2_total / existing.fct_total) * 100).toFixed(2))
              : null;
          } else {
            acc.push({ ...item });
          }
          return acc;
        }, []);

        console.log('Combined data:', mergedByModel.length, 'models');

        if (isMounted) {
          setData(mergedByModel);
        }
      } catch (err) {
        console.error('Error fetching data', err);
        if (isMounted) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 300000); // Refresh every 5 minutes

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [dateRange, serials, widgetId]);

  // ----------------------------------------------------------
  // Handlers (selection + trigger load)
  const changeMode = () => {
    if (mode === 'daily') {
      updateWidgetSettings({ mode: "weekly" });
    } else {
      updateWidgetSettings({ mode: 'daily' });
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const serialNumbers = parseSerialNumbersCSV(text);
        if (serialNumbers.length > 0) {
          updateWidgetSettings({ sns: serialNumbers });
        } else {
          alert('No serial numbers found in the CSV file');
        }
      }
    };
    reader.onerror = () => {
      alert('Error reading file');
    };
    reader.readAsText(file);
    
    // Reset input so same file can be uploaded again
    event.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearSerials = () => {
    updateWidgetSettings({ sns: [] });
  };

  // ----------------------------------------------------------
  // Render: chart view
  return (
    <Paper sx={paperStyle}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button sx={buttonStyle} onClick={changeMode}>
              {mode}
            </Button>
            <Button 
              sx={buttonStyle} 
              onClick={handleImportClick}
              startIcon={<UploadFileIcon />}
            >
              Import CSV
            </Button>
            {serials.length > 0 && (
              <Chip 
                label={`${serials.length} Serial${serials.length !== 1 ? 's' : ''}`}
                onDelete={handleClearSerials}
                size="small"
                color="primary"
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </Stack>
          <DateRange 
            startDate={date}
            setStartDate={(d) => updateWidgetSettings({date: d ? d.toISOString() : null})}
          />
        </Stack>
        
        {serials.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            Please import a CSV file with serial numbers
          </Box>
        ) : loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>Loading...</Box>
        ) : data.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Model totals and yields">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Model</strong></TableCell>
                  <TableCell align="right">ASSY2 Total</TableCell>
                  <TableCell align="right">FLA Total</TableCell>
                  <TableCell align="right">FCT Total</TableCell>
                  <TableCell align="right">Test Yield FLA</TableCell>
                  <TableCell align="right">Test Yield FCT</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={item.model ?? index} hover>
                    <TableCell component="th" scope="row">
                      <strong>{item.model}</strong>
                    </TableCell>
                    <TableCell align="right">{item.assy2_total}</TableCell>
                    <TableCell align="right">{item.fla_total}</TableCell>
                    <TableCell align="right">{item.fct_total}</TableCell>
                    <TableCell align="right">{item.test_yield_fla}%</TableCell>
                    <TableCell align="right">{item.test_yield_fct}%</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell component="th" scope="row">
                    <strong>Grand Total</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{data.reduce((sum, item) => sum + (item.assy2_total || 0), 0)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{data.reduce((sum, item) => sum + (item.fla_total || 0), 0)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{data.reduce((sum, item) => sum + (item.fct_total || 0), 0)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {data.length > 0 
                        ? ((data.reduce((sum, item) => sum + (item.assy2_total || 0), 0) / 
                            data.reduce((sum, item) => sum + (item.fla_total || 0), 0) * 100) || 0).toFixed(2)
                        : '0.00'}%
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {data.length > 0
                        ? ((data.reduce((sum, item) => sum + (item.assy2_total || 0), 0) / 
                            data.reduce((sum, item) => sum + (item.fct_total || 0), 0) * 100) || 0).toFixed(2)
                        : '0.00'}%
                    </strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>No data available for selected serial numbers</Box>
        )}
      </Box>
    </Paper>
  );
}