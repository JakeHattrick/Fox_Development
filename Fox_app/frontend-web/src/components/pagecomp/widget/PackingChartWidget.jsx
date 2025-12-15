// Widget for Packing Charts
// ------------------------------------------------------------
// Imports
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress } from '@mui/material';
import { format, parseISO, addWeeks, startOfISOWeek, endOfISOWeek } from 'date-fns';
// Page Comps
import { Header } from '../../pagecomp/Header.jsx';
// Style Guides
import { paperStyle, buttonStyle } from '../../theme/themes.js';
// Chart Comps
import PackingOutputBarChart from '../../charts/PackingOutputBarChart.js';
// Hooks
import { usePackingChartData } from '../../hooks/packingCharts/usePackingChartData.js';
import { useWeekNavigation } from '../../hooks/packingCharts/useWeekNavigation';
// Global Settings
import { useGlobalSettings } from '../../../data/GlobalSettingsContext.js';

// ------------------------------------------------------------
// Environment / constants
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const modelKeys = [
  { id: 'Tesla SXM4', model: 'Tesla SXM4', key: 'sxm4' },
  { id: 'Tesla SXM5', model: 'Tesla SXM5', key: 'sxm5' },
  { id: 'Tesla SXM6', model: 'SXM6', key: 'sxm6' }
];
const options = modelKeys.map(w => w.id);

// ------------------------------------------------------------
// Component
export function PackingChartWidget({ widgetId }) {
  // ----- Global settings and guards
  const { state, dispatch } = useGlobalSettings();
  const { startDate, endDate, barLimit } = state;

  if (!state) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ p: 2 }}>Loading global state...</Box>
      </Paper>
    );
  }
  if (!widgetId) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ p: 2 }}>Widget ID missing</Box>
      </Paper>
    );
  }

  // ----- Widget settings pulled from global state
  const widgetSettings = (state.widgetSettings && state.widgetSettings[widgetId]) || {};

  // ----------------------------------------------------------
  // Local UI state (chart data + toggles + status)
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [color, setColor] = useState(false); // retained as in source

  // ----------------------------------------------------------
  // Ensure widget settings object exists in global store
  useEffect(() => {
    if (!state.widgetSettings || !state.widgetSettings[widgetId]) {
      dispatch({
        type: 'UPDATE_WIDGET_SETTINGS',
        widgetId,
        settings: {}
      });
    }
  }, [widgetId, state.widgetSettings, dispatch]);

  // ----------------------------------------------------------
  // Derived values from widget settings (kept identical)
  const model = widgetSettings.model || '';
  const timeFrame = widgetSettings.timeFrame || 'Daily';
  const loaded = widgetSettings.loaded || false;
  const showTrend = widgetSettings.showTrend || false;
  const showAvg = widgetSettings.showAvg || false;

  // Helper to update this widget's settings
  const updateWidgetSettings = updates => {
    dispatch({
      type: 'UPDATE_WIDGET_SETTINGS',
      widgetId,
      settings: { ...widgetSettings, ...updates }
    });
  };

  // ----------------------------------------------------------
  // Data hooks: fetch daily/weekly series for selected model
  
  const [currentISOWeekStart, setCurrentISOWeekStart] = useState(
      format(startOfISOWeek(endDate), 'yyyy-MM-dd')
    );

  useEffect (()=>{setCurrentISOWeekStart(format(startOfISOWeek(endDate), 'yyyy-MM-dd'))},[endDate]);

  const {
    dailyData,
    loadingDaily,
    errorDaily,
    weeklyData,
    loadingWeekly,
    errorWeekly
  } = usePackingChartData(API_BASE, model || 'Tesla SXM4', currentISOWeekStart, barLimit);

  // Sync selected timeframe onto local display state
  useEffect(() => {
    if (!loaded) return;

    if (timeFrame === 'Daily') {
      setData(dailyData);
      setLoading(loadingDaily);
      setError(errorDaily);
    } else {
      setData(weeklyData);
      setLoading(loadingWeekly);
      setError(errorWeekly);
    }
  }, [loaded, timeFrame, dailyData, loadingDaily, errorDaily, weeklyData, loadingWeekly, errorWeekly]);

  // ----------------------------------------------------------
  // Handlers (UI controls)
  const handleSetModelKey = e => {
    const selectedId = e.target.value;
    const entry = modelKeys.find(mk => mk.id === selectedId);
    if (entry) {
      updateWidgetSettings({ model: entry.model });
      setData([]); // reset data
    }
  };

  const handleSetTimeFrame = e => {
    const selectedId = e.target.value;
    updateWidgetSettings({ timeFrame: selectedId });
  };

  const handleLoadChart = () => {
    updateWidgetSettings({ loaded: true });
  };

  const handleSetShowAvg = () => {
    updateWidgetSettings({showAvg:!showAvg});
  };

  const handleSetShowTrend = () => {
    updateWidgetSettings({showTrend:!showTrend});
  };

  // ----------------------------------------------------------
  // Render: setup view (choose model & timeframe)
  if (!loaded) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Header
            title="Select Model for Packing Chart"
            subTitle="Choose a model to chart"
            titleVariant="h6"
            subTitleVariant="body2"
            titleColor="text.secondary"
          />

          <FormControl fullWidth>
            <InputLabel id="model-select-label">Choose Model</InputLabel>
            <Select
              label="Choose Model"
              value={modelKeys.find(mk => mk.model === model)?.id || ''}
              onChange={handleSetModelKey}
            >
              {modelKeys.map(mk => (
                <MenuItem key={mk.id} value={mk.id}>
                  {mk.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="model-select-label">Select Time Frame</InputLabel>
            <Select label="Choose Timeframe" value={timeFrame} onChange={handleSetTimeFrame}>
              <MenuItem value={'Daily'}>Daily</MenuItem>
              <MenuItem value={'Weekly'}>Weekly</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              sx={buttonStyle}
              variant="contained"
              size="small"
              onClick={handleSetShowTrend}
            >
              {showTrend ? "Don't show Trendline" : 'Show Trendline'}
            </Button>
            <Button
              sx={buttonStyle}
              variant="contained"
              size="small"
              onClick={handleSetShowAvg}
            >
              {showAvg ? "Don't show Avg line" : 'Show Avg line'}
            </Button>
          </Box>

          {(model.length > 0 && timeFrame.length > 0) && (
            <Button sx={buttonStyle} onClick={handleLoadChart}>
              Load Chart
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

  // Render: explicit empty-state error (kept as-is)
  if (data.length === 0) {
    return (
      <Paper sx={{...paperStyle, textAlign: 'center', py: 8}}>
        <Header 
            title="Failed to load data for given range"
            subTitle="ISO week may have no results"
            titleVariant="h6"
            subTitleVariant="body2"
            titleColor="text.secondary"
          />
      </Paper>
    );
  }

  // ----------------------------------------------------------
  // Render: chart (loading/error/data states)
  return (
    <Paper sx={paperStyle}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <PackingOutputBarChart
          title={`${timeFrame} Packing Output for ${model}`}
          data={data}
          color="#4caf50"
          showTrendLine={showTrend}
          showAvgLine={showAvg}
        />
      )}
    </Paper>
  );
}
