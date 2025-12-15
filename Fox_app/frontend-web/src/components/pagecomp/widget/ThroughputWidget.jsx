// Widget for Throughput Reports
// ------------------------------------------------------------
// Imports
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Button, FormControl, InputLabel, Select, MenuItem, Paper, Typography, Card, CardContent, Chip, CircularProgress, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
// Page Comps
import { Header } from '../../pagecomp/Header.jsx';
// Style Guides
import { buttonStyle, paperStyle } from '../../theme/themes.js';
// Chart Comps
import { ThroughputBarChart } from '../../charts/ThroughputBarChart.js';
// Hooks from ThroughputPage
import { useDataProcessing } from '../../hooks/throughput/useDataProcessing.js';
import { useThroughputData } from '../../hooks/throughput/useThroughputData.js';
import { useDateFormatter } from '../../hooks/throughput/useDateFormatter.js';
import { useStyles } from '../../hooks/throughput/useStyles.js';
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
  { id: 'Tesla SXM6', model: 'SXM6',       key: 'sxm6' }
];

const CONSTANTS = {
  HARDCODED_STATIONS: {
    sxm4: ['VI2', 'ASSY2', 'FI', 'FQC'],
    sxm5: ['BBD', 'ASSY2', 'FI', 'FQC'],
    sxm6: ['BBD', 'ASSY2', 'FI', 'FQC']
  }
};

// ------------------------------------------------------------
// Component
export function ThroughputWidget({ widgetId }) {
  // ----- Global settings & extractions
  const { state, dispatch } = useGlobalSettings();
  const theme = useTheme();

  // ----- Guards: missing global state or widget id
  if (!state) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Loading global state...</Box></Paper>;
  }
  if (!widgetId) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Widget ID missing</Box></Paper>;
  }

  // ----- Widget settings pulled from global state
  const widgetSettings = (state.widgetSettings && state.widgetSettings[widgetId]) || {};

  // ----------------------------------------------------------
  // Bootstrap: ensure settings object exists for this widget
  useEffect(() => {
    if (!state.widgetSettings || !state.widgetSettings[widgetId]) {
      dispatch({
        type: 'UPDATE_WIDGET_SETTINGS',
        widgetId,
        settings: {
          useHardcodedTPY: true,
          sortBy: 'volume',
          showRepairStations: false,
          selectedWeek: ''
        }
      });
    }
  }, [widgetId, state.widgetSettings, dispatch]);

  // ----------------------------------------------------------
  // Derived values from widget settings (persisted selections)
  const model = widgetSettings.model || '';
  const key = widgetSettings.key || '';
  const loaded = widgetSettings.loaded || false;
  const useHardcodedTPY = widgetSettings.useHardcodedTPY !== undefined ? widgetSettings.useHardcodedTPY : true;
  const sortBy = widgetSettings.sortBy || 'volume';
  const showRepairStations = widgetSettings.showRepairStations || false;
  const selectedWeek = widgetSettings.selectedWeek || '';

  // ----------------------------------------------------------
  // Use ThroughputPage hooks
  const { formatWeekDateRange } = useDateFormatter();
  const { availableWeeks, loading, error, throughputData } = useThroughputData(selectedWeek, formatWeekDateRange);
  const styles = useStyles(loading);
  const { processModelData } = useDataProcessing({
    showRepairStations,
    sortBy
  });

  // ----------------------------------------------------------
  // Process data using the same logic as ThroughputPage
  const processedStationData = useMemo(() => {
    if (!throughputData?.weeklyThroughputYield?.modelSpecific || !loaded || !key) {
      return { modelData: [], tpyData: {} };
    }
    
    const { modelSpecific } = throughputData.weeklyThroughputYield;
    const tpySource = useHardcodedTPY ? 'hardcoded' : 'dynamic';
    
    // Get the correct model data based on key
    let modelData = [];
    if (key === 'sxm4' && modelSpecific['Tesla SXM4']) {
      modelData = processModelData(modelSpecific['Tesla SXM4']);
    } else if (key === 'sxm5' && modelSpecific['Tesla SXM5']) {
      modelData = processModelData(modelSpecific['Tesla SXM5']);
    } else if (key === 'sxm6' && modelSpecific['SXM6']) {
      modelData = processModelData(modelSpecific['SXM6']);
    }
    
    return {
      modelData,
      tpyData: throughputData.weeklyTPY?.[tpySource] || {}
    };
  }, [throughputData, processModelData, useHardcodedTPY, loaded, key]);

  // Filter stations for table/chart display
  const displayStationData = useMemo(() => {
    //return processedStationData.modelData;
    if (!useHardcodedTPY || !CONSTANTS.HARDCODED_STATIONS[key]) {
      return processedStationData.modelData;
    }
    return processedStationData.modelData.filter(s => 
      CONSTANTS.HARDCODED_STATIONS[key].includes(s.station)
    );
  }, [processedStationData.modelData, useHardcodedTPY, key]);

  const tooltipContent = useMemo(() => {
    if (!displayStationData || displayStationData.length === 0) {
      return "No station data available";
    }

    return (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Stations ({displayStationData.length}):
        </Typography>
        {displayStationData.map((station, index) => (
          <Typography key={station.station || index} variant="body2" sx={{ fontSize: '0.75rem' }}>
            {station.station}: {station.failedParts || 0}/{station.totalParts}  ({((station.failureRate || 0)).toFixed(2)}% failure)
          </Typography>
        ))}
      </Box>
    );
  }, [displayStationData]);

  // Get TPY value for display
  const tpyValue = useMemo(() => {
    const modelKey = model.replace('Tesla ', '').toUpperCase();
    return processedStationData.tpyData[modelKey]?.tpy;
  }, [processedStationData.tpyData, model]);

  // ----------------------------------------------------------
  // Helper: update current widget's settings (merge)
  const updateWidgetSettings = (updates) => {
    dispatch({
      type: 'UPDATE_WIDGET_SETTINGS',
      widgetId,
      settings: { ...widgetSettings, ...updates }
    });
  };

  // ----------------------------------------------------------
  // Handlers (selection + trigger load)
  const handleSetModelKey = (e) => {
    const selectedId = e.target.value;
    const entry = modelKeys.find(mk => mk.id === selectedId);

    if (entry) {
      updateWidgetSettings({
        model: entry.model,
        key: entry.key
      });
    }
  };

  const handleWeekChange = useCallback((event) => {
    const value = event.target.value;
    if (typeof value === 'string' && value.trim()) {
      updateWidgetSettings({ selectedWeek: value.trim() });
    }
  }, [updateWidgetSettings]);

  const handleLoadChart = () => {
    updateWidgetSettings({ loaded: true });
  };

  const handleTPYModeChange = useCallback((event) => {
    const newValue = Boolean(event.target.checked);
    updateWidgetSettings({ useHardcodedTPY: newValue });
  }, [updateWidgetSettings]);

  const handleSortChange = useCallback((event) => {
    const newValue = String(event.target.value);
    const validSortOptions = ['volume', 'failureRate', 'impactScore', 'alphabetical'];
    
    if (validSortOptions.includes(newValue)) {
      updateWidgetSettings({ sortBy: newValue });
    }
  }, [updateWidgetSettings]);

  const handleRepairStationsChange = useCallback((event) => {
    const newValue = Boolean(event.target.checked);
    updateWidgetSettings({ showRepairStations: newValue });
  }, [updateWidgetSettings]);
  
  // ----------------------------------------------------------
  // Container styles
  const containerStyles = {
    position: 'relative',
    minHeight: '400px',
    height: '400px', // Add explicit height
    width: '100%'    // Add explicit width
  };

  const processingStyles = loading ? {
    opacity: 0.7,
    pointerEvents: 'none'
  } : {};

  // ----------------------------------------------------------
  // Render: setup screen (choose model and week then load)
  if (!loaded) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Header
            title="Select Model for Throughput Chart"
            subTitle="Choose a model and week to chart throughput data"
            titleVariant="h6"
            subTitleVariant="body2"
            titleColor="text.secondary"
          />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 400, mx: 'auto' }}>
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
              <InputLabel>Week</InputLabel>
              <Select 
                value={selectedWeek} 
                label="Week" 
                onChange={handleWeekChange} 
                disabled={!availableWeeks.length}
              >
                {availableWeeks.map((week) => (
                  <MenuItem key={week.id} value={week.id}>
                    {week.id} ({week.dateRange})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select value={sortBy} label="Sort By" onChange={handleSortChange}>
                <MenuItem value="volume">Volume (Parts Processed)</MenuItem>
                <MenuItem value="failureRate">Failure Rate</MenuItem>
                <MenuItem value="impactScore">Impact Score</MenuItem>
                <MenuItem value="alphabetical">Alphabetical</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <FastSwitch
                checked={useHardcodedTPY}
                onChange={handleTPYModeChange}
                label={useHardcodedTPY ? "Focused TPY" : "Complete TPY"}
                color="primary"
              />
              <FastSwitch
                checked={showRepairStations}
                onChange={handleRepairStationsChange}
                label="Show Repair Stations"
                color="secondary"
              />
            </Box>
            {model.length > 0 && selectedWeek && (
              <Button sx={buttonStyle} onClick={handleLoadChart}>
                Load Chart
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    );
  }

  // Handle loading and error states
  if (loading) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={styles.loadingContainer}>
          <CircularProgress size={24} />
          <Typography variant="h6" color="text.secondary">Loading throughput data...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={styles.errorContainer}>
          <Typography variant="h6" color="error">Error loading data</Typography>
          <Typography variant="body2" color="text.secondary">{error}</Typography>
        </Box>
      </Paper>
    );
  }

  // ----------------------------------------------------------
  // Render: chart view with controls
  return (
    <Paper sx={paperStyle}>
      {/* TPY Summary Card */}
      {tpyValue !== null && tpyValue !== undefined && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h7" gutterBottom color="primary">
              {model} TPY
            </Typography>
            <Typography 
              variant="h5" 
              color={key === 'sxm4' ? "error.main" : key === 'sxm5' ? "success.main" : "info.main"}
            >
              {tpyValue?.toFixed(1) || '--'}%
            </Typography>
              <Typography variant="body2" color="text.secondary">
                {`${useHardcodedTPY ? 'Focused Analysis' : 'Complete Analysis'} — `}
                  {`${availableWeeks.find(w => w.id === selectedWeek)?.dateRange} — `}
                {useHardcodedTPY ? "4 Key Stations" : "All Stations"}
                {loading && " • Processing..."}
              </Typography>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {throughputData ? (
        <Card elevation={3}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="primary">
                {model} - Station Throughput
              </Typography>
              <Tooltip 
                title={tooltipContent}>
                <Chip 
                  label={`${displayStationData.length} stations${useHardcodedTPY ? ' (TPY calc)' : ''}`} 
                  size="small" 
                />
              </Tooltip>
            </Box>
            {/* FIX: Add explicit height to the chart container */}
            <Box sx={{ 
              ...containerStyles, 
              ...processingStyles,
              height: '400px', // Add explicit height
              width: '100%'    // Ensure full width
            }}>
              {displayStationData && displayStationData.length > 0 ? (
                // Force re-render with key prop
                <ThroughputBarChart 
                  key={`${widgetId}-${selectedWeek}-${model}-${displayStationData.length}`}
                  data={processedStationData.modelData} 
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    No chart data available (Length: {displayStationData?.length || 0})
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box sx={styles.container}>
          <Typography variant="h6" color="text.secondary">No throughput data available</Typography>
          <Typography variant="body2" color="text.secondary">Select a week to view station throughput analysis</Typography>
        </Box>
      )}
    </Paper>
  );
}

// FastSwitch component (same as ThroughputPage)
const FastSwitch = React.memo(({ checked, onChange, label, color = 'primary' }) => {
  const theme = useTheme();
  
  const switchStyles = useMemo(() => ({
    container: {
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      cursor: 'pointer', 
      userSelect: 'none', 
      padding: '4px', 
      borderRadius: '4px',
      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
    },
    switch: {
      position: 'relative', 
      width: '44px', 
      height: '24px', 
      borderRadius: '12px',
      backgroundColor: checked ? 
        (color === 'primary' ? theme.palette.primary.main : theme.palette.secondary.main) : 
        theme.palette.grey[400],
      transition: 'background-color 0.2s ease', 
      border: 'none', 
      cursor: 'pointer', 
      outline: 'none',
      '&:focus': { boxShadow: `0 0 0 2px ${theme.palette.primary.main}40` }
    },
    thumb: {
      position: 'absolute', 
      top: '2px', 
      left: checked ? '22px' : '2px',
      width: '20px', 
      height: '20px', 
      backgroundColor: 'white', 
      borderRadius: '50%',
      transition: 'left 0.2s ease', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    label: { 
      fontSize: '14px', 
      fontWeight: 500, 
      color: theme.palette.text.primary 
    }
  }), [checked, color, theme]);

  const handleClick = useCallback((e) => {
    const syntheticEvent = {
      ...e, 
      preventDefault: () => e.preventDefault(), 
      stopPropagation: () => e.stopPropagation(),
      target: { ...e.target, checked: !checked }
    };
    onChange(syntheticEvent);
  }, [checked, onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick(e);
    }
  }, [handleClick]);

  return (
    <div 
      style={switchStyles.container} 
      onClick={handleClick} 
      onKeyDown={handleKeyDown}
      tabIndex={0} 
      role="switch" 
      aria-checked={checked} 
      aria-label={label}
    >
      <div style={switchStyles.switch}>
        <div style={switchStyles.thumb} />
      </div>
      <span style={switchStyles.label}>{label}</span>
    </div>
  );
});

FastSwitch.displayName = 'FastSwitch';