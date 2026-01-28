// Widget for TestStation Reports
// ------------------------------------------------------------
// Imports
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, Select, MenuItem, Checkbox, ListItemText, OutlinedInput } from '@mui/material';
// Page Comps
import { Header } from '../../pagecomp/Header.jsx';
import { DateRange } from '../../pagecomp/DateRange.jsx'
// Style Guides
import { buttonStyle, paperStyle } from '../../theme/themes.js';
// Utils
import { fetchTestYieldsQuery } from '../../../utils/queryUtils.js';
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
// Component
export function TestYieldWidget({ widgetId }) {
  // ----- Local state (must be at top level)
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModels, setSelectedModels] = useState([]);

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

  // Get unique models from data
  const availableModels = useMemo(() => {
    return [...new Set(data.map(item => item.model))].filter(Boolean).sort();
  }, [data]);

  // Initialize selected models when data changes
  useEffect(() => {
    if (availableModels.length > 0 && selectedModels.length === 0) {
      setSelectedModels(availableModels);
    }
  }, [availableModels]);

  // Filter data based on selected models
  const filteredData = useMemo(() => {
    return data.filter(item => selectedModels.includes(item.model));
  }, [data, selectedModels]);

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
  // Fetch: test yields data
  useEffect(() => {
    if (!date || !mode || dateRange.length === 0) return;

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      
      try {
        await fetchTestYieldsQuery({
          dates: dateRange,
          key: 'tpy_test_yields',
          setDataCache: setData,
          API_BASE,
          API_Route: '/api/v1/tpy/test-yields'
        });
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
  }, [dateRange, widgetId]);

  // ----------------------------------------------------------
  // Handlers (selection + trigger load)
  const changeMode = () => {
    if (mode === 'daily') {
      updateWidgetSettings({ mode: "weekly" });
    } else {
      updateWidgetSettings({ mode: 'daily' });
    }
  };

  const handleModelChange = (event) => {
    const value = event.target.value;
    setSelectedModels(typeof value === 'string' ? value.split(',') : value);
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                multiple
                value={selectedModels}
                onChange={handleModelChange}
                input={<OutlinedInput />}
                renderValue={(selected) => `Models (${selected.length})`}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    <Checkbox checked={selectedModels.indexOf(model) > -1} />
                    <ListItemText primary={model} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <DateRange 
            startDate={date}
            setStartDate={(d) => updateWidgetSettings({date: d ? d.toISOString() : null})}
          />
        </Stack>
        
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>Loading...</Box>
        ) : filteredData.length > 0 ? (
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
                {filteredData.map((item, index) => (
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
                    <strong>{filteredData.reduce((sum, item) => sum + (item.assy2_total || 0), 0)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{filteredData.reduce((sum, item) => sum + (item.fla_total || 0), 0)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{filteredData.reduce((sum, item) => sum + (item.fct_total || 0), 0)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {filteredData.length > 0 
                        ? ((filteredData.reduce((sum, item) => sum + (item.assy2_total || 0), 0) / 
                            filteredData.reduce((sum, item) => sum + (item.fla_total || 0), 0) * 100) || 0).toFixed(2)
                        : '0.00'}%
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {filteredData.length > 0
                        ? ((filteredData.reduce((sum, item) => sum + (item.assy2_total || 0), 0) / 
                            filteredData.reduce((sum, item) => sum + (item.fct_total || 0), 0) * 100) || 0).toFixed(2)
                        : '0.00'}%
                    </strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>No data available</Box>
        )}
      </Box>
    </Paper>
  );
}