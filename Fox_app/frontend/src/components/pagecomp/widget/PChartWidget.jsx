// Widget for P-Chart (SPC) Reports
// ------------------------------------------------------------
// Inspired by PerformancePage hooks/structure and TestStationWidget widget pattern
// ------------------------------------------------------------
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {  Box, Paper, Stack, FormControl, InputLabel, Select,
  MenuItem, Button, Alert, CircularProgress, Typography
} from '@mui/material';
// Page Components
import { Header } from '../../pagecomp/Header.jsx';
// Style Guides
import { buttonStyle, paperStyle } from '../../theme/themes.js';
// Chart Component
import PChart from '../../charts/PChart';
// Global Settings
import { useGlobalSettings } from '../../../data/GlobalSettingsContext.js';

// ===== ENV / CONSTANTS =====
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE not set. Please configure it in your .env');
}

const CHART_CONFIG = {
  MIN_WORKDAYS: 8,       // at least 8 consolidated points
  MIN_TOTAL_DAYS: 10,    // at least 10 calendar days
  LOW_VOLUME_THRESHOLD: 31
};

const RESET_MAP = {
  model: ['workstation', 'serviceFlow', 'partNumber'],
  workstation: ['serviceFlow', 'partNumber'],
  serviceFlow: ['partNumber'],
  partNumber: []
};

// ===== DATA PROCESSING (from PerformancePage) =====
const groupDataByDate = (rawData) => {
  return rawData.reduce((acc, point) => {
    const dateKey = point.date;
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: point.date,
        fails: 0,
        passes: 0,
        total: 0
      };
    }
    acc[dateKey].fails += point.fail_count;
    acc[dateKey].passes += point.pass_count;
    acc[dateKey].total += point.total_count;
    return acc;
  }, {});
};

const mergeLowVolumeDays = (dailyData) => {
  const processedData = [];
  for (let i = 0; i < dailyData.length; i++) {
    const currentDay = dailyData[i];
    if (currentDay.total < CHART_CONFIG.LOW_VOLUME_THRESHOLD && processedData.length > 0) {
      const previousDay = processedData[processedData.length - 1];
      previousDay.fails += currentDay.fails;
      previousDay.passes += currentDay.passes;
      previousDay.total += currentDay.total;
      // optional debug
      // console.log(`Merged low-volume ${currentDay.date} (${currentDay.total}) into ${previousDay.date}`);
    } else {
      processedData.push({ ...currentDay });
    }
  }
  return processedData;
};

const consolidateDataByDate = (rawData, applyLowVolumeMerging = true) => {
  const consolidatedByDate = groupDataByDate(rawData);
  const dailyData = Object.values(consolidatedByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  return applyLowVolumeMerging ? mergeLowVolumeDays(dailyData) : dailyData;
};

// ------------------------------------------------------------
// Component
export function PChartWidget({ widgetId }) {
  // ===== Global Settings =====
  const { state, dispatch } = useGlobalSettings();
  const { startDate, endDate } = state || {};

  if (!state) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Loading global state...</Box></Paper>;
  }
  if (!widgetId) {
    return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Widget ID missing</Box></Paper>;
  }

  // ===== Widget-scoped persisted settings =====
  const widgetSettings = (state.widgetSettings && state.widgetSettings[widgetId]) || {};
  const loaded       = widgetSettings.loaded || false;
  const selModel     = widgetSettings.model || '';
  const selStation   = widgetSettings.workstation || '';
  const selFlow      = widgetSettings.serviceFlow || '';
  const selPart      = widgetSettings.partNumber || '';

  // bootstrap: ensure settings container exists
  useEffect(() => {
    if (!state.widgetSettings || !state.widgetSettings[widgetId]) {
      dispatch({ type: 'UPDATE_WIDGET_SETTINGS', widgetId, settings: {} });
    }
  }, [dispatch, state.widgetSettings, widgetId]);

  const updateWidgetSettings = (updates) => {
    dispatch({
      type: 'UPDATE_WIDGET_SETTINGS',
      widgetId,
      settings: { ...widgetSettings, ...updates }
    });
  };

  // ===== Local UI/data state =====
  const [available, setAvailable] = useState({
    models: [],
    workstations: [],
    serviceFlows: [],
    partNumbers: []
  });
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [pChartData, setPChartData] = useState([]);

  // request ordering guard for data fetches
  const latestReqId = useRef(0);

  // ===== Derived / validation =====
  const daysDiff = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const ms = new Date(endDate) - new Date(startDate);
    return Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const isDateRangeValid = useMemo(() => daysDiff >= CHART_CONFIG.MIN_TOTAL_DAYS, [daysDiff]);

  const title = useMemo(() => {
    return (selStation && selModel) ? `${selStation} Station - ${selModel}` : 'P-Chart Analysis';
  }, [selStation, selModel]);

  const subtitle = useMemo(() => {
    const bits = [];
    if (startDate && endDate) bits.push(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
    if (selFlow) bits.push(`Service Flow: ${selFlow}`);
    bits.push(selPart ? `Part Number: ${selPart}` : 'All Part Numbers Combined');
    return bits.join(' | ');
  }, [startDate, endDate, selFlow, selPart]);

  // ===== API: fetch filters =====
  const fetchFilters = useCallback(async (model = '', workstation = '') => {
    setFiltersLoading(true);
    try {
      const params = new URLSearchParams();
      if (model) params.append('model', model);
      if (workstation) params.append('workstation', workstation);
      const res = await fetch(`${API_BASE}/api/v1/pchart/filters?${params.toString()}`);
      if (!res.ok) throw new Error(`Filter API error: ${res.status}`);
      const json = await res.json();
      setAvailable(prev => ({
        models: json.models || prev.models,
        workstations: model && json.workstations ? json.workstations : [],
        serviceFlows: model && workstation ? (json.serviceFlows || []) : [],
        partNumbers: model && workstation ? (json.partNumbers || []) : []
      }));
    } catch (e) {
      console.error('Error fetching filters:', e);
      setError('Failed to load filter options');
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  // initial load: models
  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  // when model changes, fetch workstations; when station changes, fetch flows/pns
  useEffect(() => {
    if (selModel && !selStation) fetchFilters(selModel);
    if (selModel && selStation) fetchFilters(selModel, selStation);
  }, [selModel, selStation, fetchFilters]);

  // ===== API: fetch p-chart data =====
  const fetchPChartData = useCallback(async () => {
    if (!selModel || !selStation || !startDate || !endDate) {
      setPChartData([]);
      return;
    }

    if (!isDateRangeValid) {
      setError(`P-Chart requires minimum ${CHART_CONFIG.MIN_TOTAL_DAYS} days for ${CHART_CONFIG.MIN_WORKDAYS} workdays (4-day week). Current range: ${daysDiff} days`);
      setPChartData([]);
      return;
    }

    setError('');
    setDataLoading(true);

    const reqId = ++latestReqId.current;

    try {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString().split('T')[0],
        endDate: new Date(endDate).toISOString().split('T')[0],
        model: selModel,
        workstation: selStation
      });
      if (selFlow) params.append('serviceFlow', selFlow);
      if (selPart) params.append('pn', selPart);

      const res = await fetch(`${API_BASE}/api/v1/pchart/data?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `API error: ${res.status}`);
      }
      const rawData = await res.json();

      let processed;
      if (selPart) {
        processed = rawData.map(p => ({ date: p.date, fails: p.fail_count, passes: p.pass_count }));
      } else {
        const shouldApplyLowVolumeMerging = !selFlow; // match PerformancePage behavior
        processed = consolidateDataByDate(rawData, shouldApplyLowVolumeMerging);
      }

      if (processed.length < CHART_CONFIG.MIN_WORKDAYS) {
        setError(`P-Chart requires minimum ${CHART_CONFIG.MIN_WORKDAYS} data points (4-day work week). Found ${processed.length} after consolidation.`);
        setPChartData([]);
        return;
      }

      // accept only latest request
      if (latestReqId.current === reqId) {
        setPChartData(processed);
      }
    } catch (e) {
      console.error('Error fetching P-Chart data:', e);
      setError(e.message || 'Failed to fetch P-Chart data');
      setPChartData([]);
    } finally {
      if (latestReqId.current === reqId) setDataLoading(false);
    }
  }, [selModel, selStation, selFlow, selPart, startDate, endDate, isDateRangeValid, daysDiff]);

  // auto-fetch when ready or selections change (after user hits Load)
  useEffect(() => {
    if (loaded && selModel && selStation) {
      fetchPChartData();
      const interval = setInterval(fetchPChartData, 300000); // refresh every 5 min
      return () => clearInterval(interval);
    }
  }, [loaded, selModel, selStation, selFlow, selPart, startDate, endDate, fetchPChartData]);

  // ===== Handlers =====
  const handleSelect = (key, value) => {
    // reset dependents per RESET_MAP
    const updates = { [key]: value };
    (RESET_MAP[key] || []).forEach(dep => (updates[dep] = ''));
    updateWidgetSettings(updates);

    // if model changes -> refresh workstations; if station changes -> refresh flows/pns
    if (key === 'model') {
      setAvailable(a => ({ ...a, workstations: [], serviceFlows: [], partNumbers: [] }));
    }
    if (key === 'workstation') {
      setAvailable(a => ({ ...a, serviceFlows: [], partNumbers: [] }));
    }
  };

  const handleLoadChart = () => updateWidgetSettings({ loaded: true });

  // ===== UI: Filter controls =====
  const FilterSelect = ({ label, value, onChange, options, required = false, disabled = false, placeholder }) => (
    <FormControl sx={{ minWidth: 200 }} size="small" disabled={disabled || filtersLoading}>
      <InputLabel>{label}{required ? ' *' : ''}</InputLabel>
      <Select label={`${label}${required ? ' *' : ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">
          <em>{placeholder || `All ${label}s`}</em>
        </MenuItem>
        {options.map(opt => (
          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  // ===== Render =====
  if (!loaded) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={{ p: 3 }}>
          <Header
            title="Select Filters for P-Chart"
            subTitle={`Choose at least Model and Workstation${!isDateRangeValid ? ` — current date range is ${daysDiff} days (min ${CHART_CONFIG.MIN_TOTAL_DAYS})` : ''}`}
            titleVariant="h6"
            subTitleVariant="body2"
            titleColor="text.secondary"
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <FilterSelect
              label="Model"
              required
              value={selModel}
              onChange={(val) => handleSelect('model', val)}
              options={available.models}
              placeholder="Select Model"
            />
            <FilterSelect
              label="Workstation"
              required
              value={selStation}
              onChange={(val) => handleSelect('workstation', val)}
              options={available.workstations}
              disabled={!selModel}
              placeholder="Select Workstation"
            />
            <FilterSelect
              label="Service Flow"
              value={selFlow}
              onChange={(val) => handleSelect('serviceFlow', val)}
              options={available.serviceFlows}
              disabled={!selStation}
            />
            <FilterSelect
              label="Part Number"
              value={selPart}
              onChange={(val) => handleSelect('partNumber', val)}
              options={available.partNumbers}
              disabled={!selStation}
            />
          </Stack>

          {!isDateRangeValid && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              P-Chart requires minimum {CHART_CONFIG.MIN_TOTAL_DAYS} days for {CHART_CONFIG.MIN_WORKDAYS} workdays (4-day work week). Current range: {daysDiff} days
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            <Button
              sx={buttonStyle}
              disabled={!selModel || !selStation}
              onClick={handleLoadChart}
            >
              Load Chart
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  }

  // loaded view
  return (
    <Paper sx={paperStyle}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1">{title}</Typography>
          <Button sx={buttonStyle} onClick={() => updateWidgetSettings({ loaded: false })}>Change Filters</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {dataLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 360 }}>
            <CircularProgress />
          </Box>
        ) : (
          <PChart
            data={pChartData}
            title={title}
            subtitle={subtitle}
            station={selStation}
            model={selModel}
          />
        )}
      </Box>
    </Paper>
  );
}
