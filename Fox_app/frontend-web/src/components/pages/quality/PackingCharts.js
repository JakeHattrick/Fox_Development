// React and Router
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Material UI Components
import Button from '@mui/material/Button';
import { Box, FormGroup, FormControlLabel, Checkbox, Typography, CircularProgress } from '@mui/material';
// Material UI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// Custom Components
import PackingOutputBarChart from '../../charts/PackingOutputBarChart';
// Data and Configuration
import { ALL_MODELS } from '../../../data/dataTables';
// Custom Hooks
import { useWeekNavigation } from '../../hooks/packingCharts/useWeekNavigation';
import { usePackingChartData as usePackingData } from '../../hooks/packingCharts/usePackingChartData';
import { buttonStyle } from '../../theme/themes';

// Configuration Constants
const API_BASE = process.env.REACT_APP_API_BASE;
const WEEKS_TO_SHOW = 12; // Number of weeks to show in the weekly chart
const DEFAULT_MODELS = ['SXM4', 'SXM5']; // Default models to show in the charts

// Reusable Components
const LoadingChart = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
    <CircularProgress />
  </Box>
);

const ErrorMessage = ({ message }) => (
  <Typography color="error">{message}</Typography>
);

// Chart Control Component for Toggle Switches
const ChartControls = ({ showAvgLine, setShowAvgLine, showTrendLine, setShowTrendLine }) => (
  <Box display="flex" alignItems="center" gap={2} mb={1}>
    <FormControlLabel
      control={
        <Checkbox
          checked={showAvgLine}
          onChange={e => setShowAvgLine(e.target.checked)}
        />
      }
      label="Show Average Line"
    />
    <FormControlLabel
      control={
        <Checkbox
          checked={showTrendLine}
          onChange={e => setShowTrendLine(e.target.checked)}
        />
      }
      label="Show Trend Line"
    />
  </Box>
);

// Test Data for Development and Debugging
const TEST_DATA = [
  { label: 'A', value: 100 }, { label: 'B', value: 200 },
  { label: 'C', value: 300 }, { label: 'D', value: 400 },
  { label: 'E', value: 500 }, { label: 'F', value: 600 },
  { label: 'G', value: 700 }, { label: 'H', value: 800 },
  { label: 'I', value: 900 }, { label: 'J', value: 1000 },
  { label: 'K', value: 1100 }, { label: 'L', value: 1200 },
];

/**
 * PackingCharts Component
 * Displays daily and weekly packing output data with filtering and navigation controls
 */
const PackingCharts = () => {
  // Navigation and Week Selection
  const navigate = useNavigate();
  const { currentISOWeekStart, handlePrevWeek, handleNextWeek, weekRange } = useWeekNavigation();
  
  // State Management
  const [selectedModels, setSelectedModels] = useState(DEFAULT_MODELS);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [showAvgLine, setShowAvgLine] = useState(true);

  // Data Fetching Hook
  const {
    dailyData,
    loadingDaily,
    errorDaily,
    weeklyData,
    loadingWeekly,
    errorWeekly
  } = usePackingData(API_BASE, selectedModels, currentISOWeekStart, WEEKS_TO_SHOW);

  // Event Handlers
  const handleModelChange = (model) => {
    setSelectedModels(prev =>
      prev.includes(model)
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  return (
    <Box sx={{ padding: 4 }}>
      {/* Navigation Header */}
      <Box display="flex" mb={3} gap={2}>
        <Typography variant="h4" gutterBottom>
          Packing Charts
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/packing')}
          sx={buttonStyle}
        >
          Back to Packing
        </Button>
      </Box>

      {/* Model Selection Filter */}
      <Box display="flex" alignItems="center" gap={4} mb={3}>
        <FormGroup row>
          {ALL_MODELS.map(model => (
            <FormControlLabel
              key={model.value}
              control={
                <Checkbox
                  checked={selectedModels.includes(model.value)}
                  onChange={() => handleModelChange(model.value)}
                />
              }
              label={model.label}
            />
          ))}
        </FormGroup>
      </Box>

      {/* Week Navigation Controls */}
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Button variant="outlined" size="small" onClick={handlePrevWeek}>
          &lt; Prev Week
        </Button>
        <Typography variant="subtitle1">{weekRange.label}</Typography>
        <Button variant="outlined" size="small" onClick={handleNextWeek}>
          Next Week &gt;
        </Button>
      </Box>

      {/* Daily Chart Section */}
      {loadingDaily ? <LoadingChart /> :
       errorDaily ? <ErrorMessage message={errorDaily} /> :
       <PackingOutputBarChart
         title="Daily Packing Output"
         data={dailyData}
       />}

      {/* Chart Display Controls */}
      <ChartControls
        showAvgLine={showAvgLine}
        setShowAvgLine={setShowAvgLine}
        showTrendLine={showTrendLine}
        setShowTrendLine={setShowTrendLine}
      />

      {/* Weekly Chart Section */}
      {loadingWeekly ? <LoadingChart /> :
       errorWeekly ? <ErrorMessage message={errorWeekly} /> :
       <PackingOutputBarChart
         title="Weekly Packing Output"
         data={weeklyData}
         color="#4caf50"
         showTrendLine={showTrendLine}
         showAvgLine={showAvgLine}
       />}

      {/* Development/Debug Chart with Test Data */}
      {process.env.NODE_ENV === 'development' && (
        <PackingOutputBarChart
          title="Test Data Chart"
          data={TEST_DATA}
          color="#1976d2"
          showTrendLine
          showAvgLine={false}
        />
      )}
    </Box>
  );
};

export default PackingCharts;
