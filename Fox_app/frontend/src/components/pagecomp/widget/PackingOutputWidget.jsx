// Widget for Packing Reports Tables
// ------------------------------------------------------------
// Imports
import React,{useState, useEffect, useMemo, useCallback} from 'react';
import { Box, Button, Typography, FormControl, InputLabel, Select, MenuItem, Paper } from '@mui/material';
// Page Comps
import { Header } from '../../pagecomp/Header.jsx'
// Style Guides
import { paperStyle, buttonStyle } from '../../theme/themes.js';
// Chart Comps
import { PackingPageTable } from '../packingPage/PackingPageTable.jsx'
// Hooks
import { usePackingTableData } from '../../hooks/packingPage/usePackingTableData.js';
// Global Settings
import { useGlobalSettings } from '../../../data/GlobalSettingsContext.js';

// ------------------------------------------------------------
// Environment / constants
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const widgetKeys = [
  {id:"Tesla SXM4", model:"Tesla SXM4"},
  {id:"Tesla SXM5", model:"Tesla SXM5"},
  {id:"Tesla SXM6", model:"SXM6"},
  {id:"Red October",model:"Red October"},
];

const options = widgetKeys.map(w => w.id);

// ------------------------------------------------------------
// Component
export function PackingOutputWidget({ widgetId }) {
  // ----- Global context & guards
  const { state, dispatch } = useGlobalSettings();
  const { startDate, endDate, barLimit } = state;
  if (!state) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Loading global state...</Box></Paper>;
  }
  if (!widgetId) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Widget ID missing</Box></Paper>;
  }

  // ----- Widget settings pulled from global state
  const widgetSettings = (state.widgetSettings && state.widgetSettings[widgetId]) || {};

  // ----------------------------------------------------------
  // Effects: initialize widget settings if absent
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
  // Local component state
  const [data, setData] = useState([]);
  const [copied, setCopied] = useState({ group: '', date: '' });

  // ----------------------------------------------------------
  // Basic derived values from widget settings
  const model = widgetSettings.model || '';
  const loaded = widgetSettings.loaded || false;

  // ----------------------------------------------------------
  // Helper to update widget-specific settings in global store
  const updateWidgetSettings = (updates) => {
    dispatch({
      type: 'UPDATE_WIDGET_SETTINGS',
      widgetId,
      settings: { ...widgetSettings, ...updates }
    });
  };

  // ----------------------------------------------------------
  // Data fetching hook control & refresh key
  const enabled = useMemo(() => {
    return loaded && !!startDate && !!endDate;
  }, [loaded, startDate, endDate]);

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch packing data within date range (polling every 300s)
  const { packingData, sortData, lastUpdated, refetch } =
    usePackingTableData(API_BASE, startDate, endDate, 300_000, { enabled, refreshKey });

  // ----------------------------------------------------------
  // Memo: build array of dates between start and end (M/D/YYYY)
  const dateRange = useMemo(() => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

    while (current <= end) {
      dates.push(formatDate(new Date(current)));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  // ----------------------------------------------------------
  // Memo: compute available groups with active parts (sorted)
  const groups = useMemo(() => {
    if (!packingData || typeof packingData !== 'object') return [];
    try {
      const groupOrder = ['Tesla SXM4', 'Tesla SXM5', 'SXM6', 'RED OCTOBER'];

      return Object.entries(packingData)
        .map(([modelName, modelData]) => {
          // Only include parts that have data in current date range
          const activeParts = Object.entries(modelData?.parts || {})
            .filter(([_, partData]) => dateRange.some(date => partData[date] !== undefined && partData[date] !== null))
            .map(([partNumber]) => partNumber.trim())
            .sort((a, b) => a.localeCompare(b));

          return {
            key: modelName,
            label: modelData?.groupLabel || modelName,
            totalLabel: modelData?.totalLabel || `${modelName} Total`,
            parts: activeParts,
            order: groupOrder.indexOf(modelName) // -1 if not found
          };
        })
        .filter(group => group.parts.length > 0)
        .sort((a, b) => {
          if (a.order !== -1 && b.order !== -1) return a.order - b.order; // both in order list
          if (a.order !== -1) return -1;                                  // only a is in list
          if (b.order !== -1) return 1;                                   // only b is in list
          return a.key.localeCompare(b.key);                              // neither in list
        });
    } catch (error) {
      console.error('Error processing packing data:', error);
      return [];
    }
  }, [packingData, dateRange]);

  // ----------------------------------------------------------
  // Memo: totals per day across all models/parts in range
  const dailyTotals = useMemo(() => {
    if (!packingData || typeof packingData !== 'object') return {};
    try {
      const totals = dateRange.reduce((acc, date) => {
        let total = 0;

        Object.values(packingData).forEach(model => {
          if (model?.parts) {
            Object.values(model.parts).forEach(partData => {
              const value = Number(partData[date] || 0);
              total += value;
            });
          }
        });

        acc[date] = total; // store total (even if zero)
        return acc;
      }, {});

      return totals;
    } catch (error) {
      console.error('Error calculating daily totals:', error);
      return {};
    }
  }, [dateRange, packingData]);

  // ----------------------------------------------------------
  // Handlers: copy a column of values / set model / load chart
  const handleCopyColumn = useCallback((group, date) => {
    let values = '';

    if (packingData[group]) {
      values = Object.values(packingData[group].parts)
        .map(partData => partData[date] || '')
        .join('\n');
    } else if (group === 'DAILY TOTAL') {
      values = dailyTotals[date]?.toString() || '';
    } else if (group === 'SORT') {
      values = ['506', '520'].map(model => sortData[model]?.[date] || '').join('\n');
    }

    navigator.clipboard.writeText(values).then(() => {
      setCopied({ group, date });
      setTimeout(() => setCopied({ group: '', date: '' }), 1200);
    });
  }, [packingData, sortData, dailyTotals]);

  const handleSetModelKey = e => {
    const selectedId = e.target.value;
    const entry = widgetKeys.find(mk => mk.id === selectedId);
    if (entry) {
      updateWidgetSettings({ model: entry.model /* key omitted by design */ });
      setData([]); // reset local data snapshot
    }
  };

  const handleLoadChart = () => {
    updateWidgetSettings({ loaded: true });
    setRefreshKey(k => k + 1);
  };

  // ----------------------------------------------------------
  // Memo: currently selected group (or null if none)
  const selectedGroup = useMemo(
    () => groups.find(g => g.key === model) || null,
    [groups, model]
  );

  // ----------------------------------------------------------
  // Render states: not loaded / no group / main content
  if (!loaded) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Header
            title="Select Model"
            subTitle="Choose a model to chart"
            titleVariant="h6"
            subTitleVariant="body2"
            titleColor="text.secondary"
          />
          <FormControl fullWidth>
            <InputLabel id="model-select-label">Choose Model</InputLabel>
            <Select
              label="Choose Model"
              value={widgetKeys.find(mk => mk.model === model)?.id || ''}
              onChange={handleSetModelKey}
            >
              {widgetKeys.map(mk => (
                <MenuItem key={mk.id} value={mk.id}>
                  {mk.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {model.length > 0 && (
            <Button sx={buttonStyle} onClick={handleLoadChart}>
              Load Chart
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

  if (!selectedGroup) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ p: 2 }}>
          <Typography variant='body2'>
            {`No data yet for "${model}" in this date range.`}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // ----- Main render: responsive Paper constrained to ~half screen
  return (
    <Paper
      sx={{
        ...paperStyle,
        display:'flex',
        flexDirection:'column',
        height:'100%',
        maxWidth: { xs: '100vh', md: '50vw' },
        maxHeight: { xs: '50vh', md: '50vh' },
        zIndex:0,
      }}
    >
      <Box
        role="region"
        aria-label={`${selectedGroup.label} packing table`}
        tabIndex={0}
        sx={{
          flex:1,
          overflow:'auto',
          overscrollBehavior:'contain',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          zIndex: 0,
        }}
      >
        <Header title={`${model} Packing Output`} titleVariant='h6' />
        <PackingPageTable
          key={selectedGroup.key}
          header={selectedGroup.label}
          headerTwo={selectedGroup.totalLabel}
          dates={dateRange}
          partLabel={selectedGroup.key}
          handleOnClick={handleCopyColumn}
          partsMap={selectedGroup.parts}
          packingData={packingData?.[selectedGroup.key]?.parts || {}}
          copied={copied}
        />
      </Box>
    </Paper>
  );
}
