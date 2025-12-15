import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Container,
  Divider, FormControl, InputLabel, MenuItem,
  Select, Typography, Alert, Stack
} from '@mui/material';
import { DateRange } from '../../../pagecomp/DateRange.jsx';
import PChart from '../../../charts/PChart.js';
import { Header } from '../../../pagecomp/Header.jsx';
import { normalizeDate, getInitialStartDate } from '../../../../utils/dateUtils.js';

// ===== CONSTANTS =====
const CHART_CONFIG = {
  MIN_WORKDAYS: 8,
  MIN_TOTAL_DAYS: 10,
  LOW_VOLUME_THRESHOLD: 31
};

const RESET_MAP = {
  model: ['workstation', 'serviceFlow', 'partNumber'],
  workstation: ['serviceFlow', 'partNumber'],
  serviceFlow: ['partNumber'],
  partNumber: []
};

// ===== DATA PROCESSING UTILITIES =====
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
      console.log(`Merged low-volume day ${currentDay.date} (${currentDay.total} parts) into ${previousDay.date}`);
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

// ===== REUSABLE COMPONENTS =====
const FilterSelect = ({ config, value, onChange, disabled, loading }) => (
  <FormControl sx={{ minWidth: 200 }} size="small" disabled={disabled || loading}>
    <InputLabel>{config.label}{config.required ? ' *' : ''}</InputLabel>
    <Select
      value={value}
      label={`${config.label}${config.required ? ' *' : ''}`}
      onChange={(e) => onChange(config.key, e.target.value)}
    >
      <MenuItem value="">
        <em>{config.placeholder || `All ${config.label}s`}</em>
      </MenuItem>
      {config.options.map(option => (
        <MenuItem key={option} value={option}>{option}</MenuItem>
      ))}
    </Select>
  </FormControl>
);

// ===== MAIN COMPONENT =====
const PerformancePage = () => {
  // ===== STATE MANAGEMENT =====
  // Date handling
  const [startDate, setStartDate] = useState(getInitialStartDate(14));
  const [endDate, setEndDate] = useState(normalizeDate.end(new Date()));
  
  // Filter states - consolidated into single object for better management
  const [filters, setFilters] = useState({
    selected: {
      model: '',
      workstation: '',
      serviceFlow: '',
      partNumber: ''
    },
    available: {
      models: [],
      workstations: [],
      serviceFlows: [],
      partNumbers: []
    }
  });

  // Loading and data states
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [pChartData, setPChartData] = useState([]);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE;

  // ===== VALIDATION FUNCTIONS =====
  const validateDateRange = useCallback(() => {
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    return daysDiff >= CHART_CONFIG.MIN_TOTAL_DAYS - 1;
  }, [startDate, endDate]);

  // ===== EVENT HANDLERS =====
  const handleStartDateChange = useCallback((date) => {
    setStartDate(normalizeDate.start(date));
  }, []);

  const handleEndDateChange = useCallback((date) => {
    setEndDate(normalizeDate.end(date));
  }, []);

  // Generic filter change handler
  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => {
      const newSelected = { ...prev.selected, [filterKey]: value };
      
      // Reset dependent filters
      const toReset = RESET_MAP[filterKey] || [];
      toReset.forEach(key => {
        newSelected[key] = '';
      });
      
      return {
        ...prev,
        selected: newSelected
      };
    });
    
    // Trigger cascading API calls
    if (filterKey === 'model' && value) {
      fetchFilters(value);
    } else if (filterKey === 'workstation' && value && filters.selected.model) {
      fetchFilters(filters.selected.model, value);
    } else if (!value) {
      // Clear dependent available options when clearing a filter
      const toReset = RESET_MAP[filterKey] || [];
      if (toReset.length > 0) {
        setFilters(prev => {
          const newAvailable = { ...prev.available };
          toReset.forEach(key => {
            newAvailable[`${key}s`] = [];
          });
          return { ...prev, available: newAvailable };
        });
      }
    }
  }, [filters.selected.model]);

  // ===== API FUNCTIONS =====
  const fetchFilters = useCallback(async (model = '', workstation = '') => {
    setFiltersLoading(true);
    try {
      const params = new URLSearchParams();
      if (model) params.append('model', model);
      if (workstation) params.append('workstation', workstation);

      const response = await fetch(`${API_BASE}/api/v1/pchart/filters?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Filter API error: ${response.status}`);
      }

      const filterData = await response.json();
      
      setFilters(prev => ({
        ...prev,
        available: {
          models: filterData.models || prev.available.models,
          workstations: model && filterData.workstations ? filterData.workstations : [],
          serviceFlows: model && workstation ? (filterData.serviceFlows || []) : [],
          partNumbers: model && workstation ? (filterData.partNumbers || []) : []
        }
      }));

    } catch (error) {
      console.error('Error fetching filters:', error);
      setError('Failed to load filter options');
    } finally {
      setFiltersLoading(false);
    }
  }, [API_BASE]);

  const fetchPChartData = useCallback(async () => {
    const { model, workstation, serviceFlow, partNumber } = filters.selected;
    
    if (!model || !workstation) {
      setPChartData([]);
      return;
    }

    if (!validateDateRange()) {
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      setError(`P-Chart requires minimum ${CHART_CONFIG.MIN_TOTAL_DAYS} days for ${CHART_CONFIG.MIN_WORKDAYS} workdays (4-day work week). Current range: ${daysDiff} days`);
      setPChartData([]);
      return;
    }

    setDataLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        model,
        workstation
      });
      
      if (serviceFlow) params.append('serviceFlow', serviceFlow);
      if (partNumber) params.append('pn', partNumber);

      const response = await fetch(`${API_BASE}/api/v1/pchart/data?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Process data based on selection
      let processedData;
      if (partNumber) {
        processedData = rawData.map(point => ({
          date: point.date,
          fails: point.fail_count,
          passes: point.pass_count
        }));
      } else {
        const shouldApplyLowVolumeMerging = !serviceFlow;
        processedData = consolidateDataByDate(rawData, shouldApplyLowVolumeMerging);
      }

      if (processedData.length < CHART_CONFIG.MIN_WORKDAYS) {
        setError(`P-Chart requires minimum ${CHART_CONFIG.MIN_WORKDAYS} data points for 4-day work week. Found ${processedData.length} points after consolidation.`);
        setPChartData([]);
        return;
      }

      setPChartData(processedData);
      
    } catch (error) {
      console.error('Error fetching P-Chart data:', error);
      setError(error.message || 'Failed to fetch P-Chart data');
      setPChartData([]);
    } finally {
      setDataLoading(false);
    }
  }, [filters.selected, startDate, endDate, validateDateRange, API_BASE]);

  // ===== COMPUTED VALUES =====
  const chartLabels = useMemo(() => {
    const { model, workstation, serviceFlow, partNumber } = filters.selected;
    
    const title = workstation && model 
      ? `${workstation} Station - ${model}` 
      : 'P-Chart Analysis';
      
    const subtitle = [
      `Analysis Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      serviceFlow ? `Service Flow: ${serviceFlow}` : null,
      partNumber ? `Part Number: ${partNumber}` : 'All Part Numbers Combined'
    ].filter(Boolean).join(' | ');
    
    return { title, subtitle };
  }, [filters.selected, startDate, endDate]);

  const filterConfigs = useMemo(() => [
    {
      key: 'model',
      label: 'Model',
      required: true,
      placeholder: 'Select Model',
      options: filters.available.models,
      disabled: false
    },
    {
      key: 'workstation',
      label: 'Workstation',
      required: true,
      placeholder: 'Select Workstation',
      options: filters.available.workstations,
      disabled: !filters.selected.model
    },
    {
      key: 'serviceFlow',
      label: 'Service Flow',
      required: false,
      options: filters.available.serviceFlows,
      disabled: !filters.selected.workstation
    },
    {
      key: 'partNumber',
      label: 'Part Number',
      required: false,
      options: filters.available.partNumbers,
      disabled: !filters.selected.workstation
    }
  ], [filters]);

  // ===== EFFECTS =====
  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    if (filters.selected.model && filters.selected.workstation) {
      fetchPChartData();
    }
  }, [fetchPChartData]);

  // ===== COMPONENT DEFINITIONS =====
  const FilterControls = () => (
    <Box sx={{ mb: 4, position: 'relative', zIndex: 999 }}>
      <Typography variant="h6" gutterBottom>Filters</Typography>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {filterConfigs.map(config => (
          <FilterSelect
            key={config.key}
            config={config}
            value={filters.selected[config.key]}
            onChange={handleFilterChange}
            disabled={config.disabled}
            loading={filtersLoading}
          />
        ))}
      </Stack>
    </Box>
  );

  // ===== RENDER =====
  const isDateRangeValid = validateDateRange();
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <Container maxWidth="xl">
      <Box>
        <Header
          title="Quality Control Charts"
          subTitle={`Statistical Process Control (SPC) Analysis using P-Charts - Minimum ${CHART_CONFIG.MIN_WORKDAYS} workdays required (4-day work week)`}
        />
      </Box>

      <Divider />

      {/* Date Range Controls */}
      <Box sx={{ 
        mb: 4, 
        position: 'relative', 
        zIndex: 1000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyItems: 'start', 
        gap: 2 
      }}>
        <Header title="Date Range" titleVariant="h6" />
        <DateRange
          startDate={startDate}
          setStartDate={handleStartDateChange}
          normalizeStart={normalizeDate.start}
          endDate={endDate}
          setEndDate={handleEndDateChange}
          normalizeEnd={normalizeDate.end}
          inline={true}
        />
        
        {!isDateRangeValid && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            P-Chart requires minimum {CHART_CONFIG.MIN_TOTAL_DAYS} days for {CHART_CONFIG.MIN_WORKDAYS} workdays (4-day work week). Current range: {daysDiff} days
          </Alert>
        )}
      </Box>

      {/* Filter Controls */}
      <FilterControls />

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Chart */}
      <Card>
        <CardHeader 
          title={chartLabels.title}
          subheader="Statistical Process Control Analysis"
        />
        <CardContent>
          {!filters.selected.model || !filters.selected.workstation ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Header
                title="Select Model and Workstation to View P-Chart"
                subTitle="Choose a model first, then select from available workstations for that model"
                titleVariant="h6"
                subTitleVariant="body2"
                titleColor="text.secondary"
              />
            </Box>
          ) : dataLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <PChart
              data={pChartData}
              title={chartLabels.title}
              subtitle={chartLabels.subtitle}
              station={filters.selected.workstation}
              model={filters.selected.model}
            />
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default PerformancePage;