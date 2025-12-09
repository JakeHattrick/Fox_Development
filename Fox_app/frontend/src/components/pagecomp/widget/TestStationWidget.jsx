// Widget for TestStation Reports
// ------------------------------------------------------------
// Imports
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, FormControl, InputLabel, Select, MenuItem, Paper } from '@mui/material';
// Page Comps
import { Header } from '../../pagecomp/Header.jsx';
// Style Guides
import { buttonStyle, paperStyle } from '../../theme/themes.js';
// Chart Comps
import { TestStationChart } from '../../charts/TestStationChart.js';
// Utils
import { fetchWorkstationQuery } from '../../../utils/queryUtils.js';
// Global Settings
import { useGlobalSettings } from '../../../data/GlobalSettingsContext.js';
import { ALL_MODELS } from '../../../data/dataTables.js';

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

// ------------------------------------------------------------
// Component
export function TestStationWidget({ widgetId }) {
  // ----- Global settings & extractions
  const { state, dispatch } = useGlobalSettings();
  const { startDate, endDate, barLimit } = state;

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
        settings: {}
      });
    }
  }, [widgetId, state.widgetSettings, dispatch]);

  // ----------------------------------------------------------
  // Local state (data, loading, and “latest request” tracking)
  const [testStationData, setTestStationData] = useState([]);
  const [loading, setLoading] = useState(true);

  const latestReqId = useRef(0);

  // ----------------------------------------------------------
  // Derived values from widget settings (persisted selections)
  const model  = widgetSettings.model  || '';
  const key    = widgetSettings.key    || '';
  const loaded = widgetSettings.loaded || false;

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
  // Fetch: station performance with request-order protection
  useEffect(() => {
    if (!loaded || !model || !key || !startDate || !endDate) return;

    let isMounted = true;
    const reqId = ++latestReqId.current;

    // flip loading but keep previous good data for stability
    setLoading(true);

    const fetchData = async () => {
      try {
        await fetchWorkstationQuery({
          parameters: [{ id: 'model', value: model }],
          startDate,
          endDate,
          key,
          setDataCache: data => {
            // accept only the latest inflight request
            if (isMounted && latestReqId.current === reqId) {
              setTestStationData(data);
            }
          },
          API_BASE,
          API_Route: '/api/v1/functional-testing/station-performance?'
        });
      } catch (err) {
        console.error('Error fetching data', err);
        if (isMounted && latestReqId.current === reqId) {
          setTestStationData([]);
        }
      } finally {
        if (isMounted && latestReqId.current === reqId) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 300000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [model, key, startDate, endDate, loaded, widgetId]);

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
      setTestStationData([]); // reset data
    }
  };

  const handleLoadChart = () => {
    updateWidgetSettings({ loaded: true });
  };

  // ----------------------------------------------------------
  // Render: setup screen (choose model then load)
  if (!loaded) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Header
            title="Select Model for Test Station Chart"
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
          {model.length > 0 && (
            <Button sx={buttonStyle} onClick={handleLoadChart}>
              Load Chart
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

  // ----------------------------------------------------------
  // Render: chart view
  const filters = ALL_MODELS.find(mk => mk.label === model)?.filter || [];
  return (
    <TestStationChart
      label={`${model} Test Station Performance`}
      data={testStationData}
      loading={loading}
      filter={filters}
    />
  );
}
