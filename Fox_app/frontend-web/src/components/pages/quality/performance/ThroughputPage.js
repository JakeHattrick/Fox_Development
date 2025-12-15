import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { debounceHeavy, batchUpdates } from '../../../../utils/performanceUtils';
import { Box, Container, Typography, Card, CardContent, Grid, FormControl,
  InputLabel, Select, MenuItem, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import { ThroughputBarChart } from '../../../charts/ThroughputBarChart';
import { useTheme } from '@mui/material/styles';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

/**
 * ThroughputPage Component with Performance Optimizations
 * 
 * Applied optimizations to resolve toggle button lag:
 * 1. useCallback for all event handlers (prevents function recreation)
 * 2. Throttling for toggle switches (300ms delay to prevent rapid switching)
 * 3. Memoized style objects (prevents object recreation on each render)
 * 4. React.memo component wrapper (prevents unnecessary re-renders)
 * 5. useRef for throttling state (stable references)
 * 
 * Target: Reduce lag from toggle button interactions
 */
const ThroughputPage = () => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [throughputData, setThroughputData] = useState(null);
  const [useHardcodedTPY, setUseHardcodedTPY] = useState(true);
  const [sortBy, setSortBy] = useState('volume');
  const [showRepairStations, setShowRepairStations] = useState(false);
  
  // Separate state for immediate UI updates vs expensive processing
  const [processingState, setProcessingState] = useState({
    useHardcodedTPY: true,
    sortBy: 'volume',
    showRepairStations: false,
    isProcessing: false
  });

  // Performance optimization - throttling refs  
  const lastToggleTime = useRef(0);
  const lastRepairToggleTime = useRef(0);

  // Debounced expensive processing function
  const debouncedProcessing = useRef(
    debounceHeavy((newState) => {
      batchUpdates(() => {
        setProcessingState(prev => ({
          ...prev,
          ...newState,
          isProcessing: false
        }));
      });
    }, 100) // Reduced to 100ms for better responsiveness
  ).current;

  // Helper function to format date range for week display
  const formatWeekDateRange = useCallback((weekStart, weekEnd) => {
    if (!weekStart || !weekEnd) return '';
    
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();
    const year = startDate.getFullYear();
    
    // If same month, show "Jan 20-26, 2025"
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    }
    // If different months, show "Jan 20 - Feb 2, 2025"
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }, []);

  // Memoized style objects to prevent recreation on each render
  const containerStyles = useMemo(() => ({
    textAlign: 'center', 
    py: 8
  }), []);

  const headerStyles = useMemo(() => ({
    py: 4
  }), []);

  const cardContentStyles = useMemo(() => ({
    p: 3
  }), []);

  const chartContainerStyles = useMemo(() => ({
    height: 500, 
    mt: 2
  }), []);

  // Dynamic styles based on processing state
  const processingStyles = useMemo(() => ({
    opacity: processingState.isProcessing ? 0.7 : 1,
    transition: 'opacity 0.2s ease-in-out',
    pointerEvents: processingState.isProcessing ? 'none' : 'auto',
    // CSS containment for better performance
    contain: 'layout style paint',
    willChange: processingState.isProcessing ? 'opacity' : 'auto'
  }), [processingState.isProcessing]);

  // Fetch throughput data
  const fetchThroughputData = async () => {
    setLoading(true);
    try {
      // Always fetch the most recent week by default
      // First, get all available weeks
      const allWeeksResponse = await fetch(`${API_BASE}/api/v1/tpy/weekly?startWeek=1900-W01&endWeek=2100-W99`);
      if (!allWeeksResponse.ok) {
        throw new Error(`Weekly metrics API error: ${allWeeksResponse.status}`);
      }
      const allWeeksData = await allWeeksResponse.json();
      if (!allWeeksData.length) {
        setAvailableWeeks([]);
        setThroughputData(null);
        setLoading(false);
        return;
      }
      // Sort weeks descending and get the most recent
      const sortedWeeks = allWeeksData.sort((a, b) => b.weekId.localeCompare(a.weekId));
      const weeksWithDates = sortedWeeks.map(week => ({
        id: week.weekId,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        dateRange: formatWeekDateRange(week.weekStart, week.weekEnd)
      }));
      setAvailableWeeks(weeksWithDates);
      const mostRecentWeekId = weeksWithDates[0].id;
      const currentSelectedWeek = selectedWeek || mostRecentWeekId;
      if (!selectedWeek) {
        setSelectedWeek(currentSelectedWeek);
      }
      if (!currentSelectedWeek) {
        setThroughputData(null);
        setLoading(false);
        return;
      }
      // Fetch only the selected week
      const weeklyResponse = await fetch(`${API_BASE}/api/v1/tpy/weekly?startWeek=${currentSelectedWeek}&endWeek=${currentSelectedWeek}`);
      if (!weeklyResponse.ok) {
        throw new Error(`Weekly metrics API error: ${weeklyResponse.status}`);
      }
      const weeklyData = await weeklyResponse.json();
      if (!weeklyData.length) {
        setThroughputData(null);
        setLoading(false);
        return;
      }

      // Find the selected week in the new data (use weekId)
      const weekData = weeklyData.find(week => week.weekId === currentSelectedWeek);
      if (weekData) {
        // Fetch daily data for the selected week to get station-level details
        const startDate = new Date(weekData.weekStart).toISOString().split('T')[0];
        const endDate = new Date(weekData.weekEnd).toISOString().split('T')[0];
        
        const dailyResponse = await fetch(`${API_BASE}/api/v1/tpy/daily?startDate=${startDate}&endDate=${endDate}`);
        if (!dailyResponse.ok) {
          throw new Error(`Daily metrics API error: ${dailyResponse.status}`);
        }
        const dailyData = await dailyResponse.json();
        console.log('Daily data fetched:', dailyData.length, 'days');

        // Aggregate daily data by station and model
        const aggregatedStations = {
          'Tesla SXM4': {},
          'Tesla SXM5': {},
          'SXM6': {},
          'overall': {}
        };

        // Process each day's data
        dailyData.forEach(dayData => {
          if (dayData.stations) {
            // Process SXM4 stations
            if (dayData.stations['Tesla SXM4']) {
              Object.entries(dayData.stations['Tesla SXM4']).forEach(([stationName, stationData]) => {
                if (!aggregatedStations['Tesla SXM4'][stationName]) {
                  aggregatedStations['Tesla SXM4'][stationName] = {
                    totalParts: 0,
                    passedParts: 0,
                    failedParts: 0,
                    throughputYield: 0
                  };
                }
                aggregatedStations['Tesla SXM4'][stationName].totalParts += stationData.totalParts || 0;
                aggregatedStations['Tesla SXM4'][stationName].passedParts += stationData.passedParts || 0;
                aggregatedStations['Tesla SXM4'][stationName].failedParts += stationData.failedParts || 0;
              });
            }

            // Process SXM5 stations
            if (dayData.stations['Tesla SXM5']) {
              Object.entries(dayData.stations['Tesla SXM5']).forEach(([stationName, stationData]) => {
                if (!aggregatedStations['Tesla SXM5'][stationName]) {
                  aggregatedStations['Tesla SXM5'][stationName] = {
                    totalParts: 0,
                    passedParts: 0,
                    failedParts: 0,
                    throughputYield: 0
                  };
                }
                aggregatedStations['Tesla SXM5'][stationName].totalParts += stationData.totalParts || 0;
                aggregatedStations['Tesla SXM5'][stationName].passedParts += stationData.passedParts || 0;
                aggregatedStations['Tesla SXM5'][stationName].failedParts += stationData.failedParts || 0;
              });
            }

            // Process SXM6 stations
            if (dayData.stations['SXM6']) {
              Object.entries(dayData.stations['SXM6']).forEach(([stationName, stationData]) => {
                if (!aggregatedStations['SXM6'][stationName]) {
                  aggregatedStations['SXM6'][stationName] = {
                    totalParts: 0,
                    passedParts: 0,
                    failedParts: 0,
                    throughputYield: 0
                  };
                }
                aggregatedStations['SXM6'][stationName].totalParts += stationData.totalParts || 0;
                aggregatedStations['SXM6'][stationName].passedParts += stationData.passedParts || 0;
                aggregatedStations['SXM6'][stationName].failedParts += stationData.failedParts || 0;
              });
            }
          }
        });

        console.log('Aggregated SXM4 stations:', Object.keys(aggregatedStations['Tesla SXM4']).length);
        console.log('Aggregated SXM5 stations:', Object.keys(aggregatedStations['Tesla SXM5']).length);
        console.log('Aggregated SXM6 stations:', Object.keys(aggregatedStations['SXM6']).length);

        // Calculate throughput yield for each station
        Object.keys(aggregatedStations).forEach(model => {
          Object.keys(aggregatedStations[model]).forEach(station => {
            const stationData = aggregatedStations[model][station];
            if (stationData.totalParts > 0) {
              stationData.throughputYield = (stationData.passedParts / stationData.totalParts) * 100;
            }
          });
        });

        // Map the new API structure to the expected frontend structure
        setThroughputData({
          weekId: weekData.weekId,
          weekStart: weekData.weekStart,
          weekEnd: weekData.weekEnd,
          weeklyTPY: {
            hardcoded: {
              SXM4: { 
                tpy: parseFloat(weekData.sxm4HardcodedTPY || 0),
                stations: weekData.hardcoded_stations || {}
              },
              SXM5: { 
                tpy: parseFloat(weekData.sxm5HardcodedTPY || 0),
                stations: weekData.hardcoded_stations || {}
              },
              SXM6: { 
                tpy: parseFloat(weekData.sxm6HardcodedTPY || 0),
                stations: weekData.hardcoded_stations || {}
              }
            },
            dynamic: {
              SXM4: { 
                tpy: parseFloat(weekData.sxm4DynamicTPY || 0),
                stations: weekData.dynamic_stations || {},
                stationCount: weekData.dynamic_station_count || 0
              },
              SXM5: { 
                tpy: parseFloat(weekData.sxm5DynamicTPY || 0),
                stations: weekData.dynamic_stations || {},
                stationCount: weekData.dynamic_station_count || 0
              },
              SXM6: { 
                tpy: parseFloat(weekData.sxm6DynamicTPY || 0),
                stations: weekData.dynamic_stations || {},
                stationCount: weekData.dynamic_station_count || 0
              }
            }
          },
          weeklyThroughputYield: {
            modelSpecific: aggregatedStations
          },
          summary: weekData.summary
        });
        console.log('ThroughputData set:', {
          weekId: weekData.weekId,
          sxm4Stations: Object.keys(aggregatedStations['Tesla SXM4']).length,
          sxm5Stations: Object.keys(aggregatedStations['Tesla SXM5']).length
        });
      }
    } catch (error) {
      console.error('Error fetching throughput data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process station data for charts - now using debounced processingState
  const processedStationData = useMemo(() => {
    if (!throughputData) {
      console.log('No throughputData available');
      return { sxm4: [], sxm5: [], sxm6: [], tpyData: {} };
    }
    
    console.log('Processing station data, throughputData:', {
      hasWeeklyThroughputYield: !!throughputData.weeklyThroughputYield,
      hasModelSpecific: !!throughputData.weeklyThroughputYield?.modelSpecific,
      sxm4Keys: Object.keys(throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM4'] || {}),
      sxm5Keys: Object.keys(throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM5'] || {}),
      sxm6Keys: Object.keys(throughputData.weeklyThroughputYield?.modelSpecific?.['SXM6'] || {})
    });
    
    const processModelData = (modelData) => {
      if (!modelData) {
        console.log('No modelData provided');
        return [];
      }
      
      let stations = Object.entries(modelData)
        .map(([stationName, data]) => ({
          station: stationName,
          totalParts: data.totalParts || 0,
          failedParts: data.failedParts || 0,
          passedParts: data.passedParts || 0,
          failureRate: data.totalParts > 0 ? parseFloat(((data.failedParts / data.totalParts) * 100).toFixed(2)) : 0,
          throughputYield: parseFloat((data.throughputYield || 0).toFixed(2)),
          impactScore: parseFloat(((data.totalParts || 0) * ((data.failedParts / (data.totalParts || 1)) || 0)).toFixed(1))
        }))
        .filter(station => station.totalParts >= 10); // Minimum volume filter
      
      console.log('Processed stations before filtering:', stations.length);
      
      // Filter repair stations if needed - using processingState
      if (!processingState.showRepairStations) {
        stations = stations.filter(station => 
          !station.station.includes('REPAIR') && 
          !station.station.includes('DEBUG')
        );
        console.log('Stations after repair filter:', stations.length);
      }
      
      // Sort stations - using processingState
      switch (processingState.sortBy) {
        case 'volume':
          stations.sort((a, b) => b.totalParts - a.totalParts);
          break;
        case 'failureRate':
          stations.sort((a, b) => b.failureRate - a.failureRate);
          break;
        case 'impactScore':
          stations.sort((a, b) => b.impactScore - a.impactScore);
          break;
        case 'alphabetical':
          stations.sort((a, b) => a.station.localeCompare(b.station));
          break;
        default:
          break;
      }
      
      return stations;
    };
    
    const tpySource = processingState.useHardcodedTPY ? 'hardcoded' : 'dynamic';
    const sxm4Data = throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM4'];
    const sxm5Data = throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM5'];
    const sxm6Data = throughputData.weeklyThroughputYield?.modelSpecific?.['SXM6'];
    
    const result = {
      sxm4: processModelData(sxm4Data),
      sxm5: processModelData(sxm5Data),
      sxm6: processModelData(sxm6Data),
      tpyData: throughputData.weeklyTPY?.[tpySource] || {}
    };
    
    console.log('Final processedStationData:', {
      sxm4Count: result.sxm4.length,
      sxm5Count: result.sxm5.length,
      sxm6Count: result.sxm6.length,
      tpyData: result.tpyData
    });
    
    return result;
  }, [throughputData, processingState.useHardcodedTPY, processingState.sortBy, processingState.showRepairStations]);

  // Process station data for tables (filtered for TPY calculation)
  const tableStationData = useMemo(() => {
    if (!processingState.useHardcodedTPY) {
      // If dynamic TPY, show all stations (same as charts)
      return {
        sxm4: processedStationData.sxm4,
        sxm5: processedStationData.sxm5,
        sxm6: processedStationData.sxm6
      };
    }
    
    // If hardcoded TPY, filter to only key stations used in calculation
    // Hardcoded stations based on TPY calculation formulas
    const hardcodedStations = {
      // SXM4 formula: VI2 × ASSY2 × FI × FQC
      sxm4: ['VI2', 'ASSY2', 'FI', 'FQC'],
      // SXM5/6 formula: BBD × ASSY2 × FI × FQC
      sxm5: ['BBD', 'ASSY2', 'FI', 'FQC'],
      sxm6: ['BBD', 'ASSY2', 'FI', 'FQC']
    };
    
    return {
      sxm4: processedStationData.sxm4.filter(station => 
        hardcodedStations.sxm4.includes(station.station)
      ),
      sxm5: processedStationData.sxm5.filter(station => 
        hardcodedStations.sxm5.includes(station.station)
      ),
      sxm6: processedStationData.sxm6.filter(station => 
        hardcodedStations.sxm6.includes(station.station)
      )
    };
  }, [processedStationData, processingState.useHardcodedTPY]);

  useEffect(() => {
    fetchThroughputData();
  }, [selectedWeek]);

  // Optimized event handlers with useCallback and throttling
  const handleWeekChange = useCallback((event) => {
    setSelectedWeek(event.target.value);
  }, []);

  const handleTPYModeChange = useCallback((event) => {
    event.preventDefault();
    
    // Throttle toggles to prevent rapid switching
    const now = Date.now();
    if (now - lastToggleTime.current < 50) {
      return;
    }
    lastToggleTime.current = now;
    
    const newValue = event.target.checked;
    
    // Immediate UI update for responsiveness
    setUseHardcodedTPY(newValue);
    
    // Mark as processing and debounce expensive calculations using startTransition
    setProcessingState(prev => ({ ...prev, isProcessing: true }));
    startTransition(() => {
      debouncedProcessing({ useHardcodedTPY: newValue });
    });
  }, [debouncedProcessing]);

  const handleSortChange = useCallback((event) => {
    const newValue = event.target.value;
    
    // Immediate UI update
    setSortBy(newValue);
    
    // Debounce expensive processing with startTransition
    setProcessingState(prev => ({ ...prev, isProcessing: true }));
    startTransition(() => {
      debouncedProcessing({ sortBy: newValue });
    });
  }, [debouncedProcessing]);

  const handleRepairStationsChange = useCallback((event) => {
    event.preventDefault();
    
    // Throttle repair station toggle
    const now = Date.now();
    if (now - lastRepairToggleTime.current < 50) {
      return;
    }
    lastRepairToggleTime.current = now;
    
    const newValue = event.target.checked;
    
    // Immediate UI update for responsiveness
    setShowRepairStations(newValue);
    
    // Mark as processing and debounce expensive calculations using startTransition
    setProcessingState(prev => ({ ...prev, isProcessing: true }));
    startTransition(() => {
      debouncedProcessing({ showRepairStations: newValue });
    });
  }, [debouncedProcessing]);

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={containerStyles}>
          <Typography variant="h6" color="text.secondary">
            Loading throughput data...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header Section */}
      <Box sx={headerStyles}>
        <Typography variant="h4" gutterBottom>
          Throughput Yield Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Station efficiency analysis and bottleneck identification for production optimization.
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Controls Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Week</InputLabel>
              <Select
                value={selectedWeek}
                label="Week"
                onChange={handleWeekChange}
              >
                {availableWeeks.map((week) => (
                  <MenuItem key={week.id} value={week.id}>
                    {week.id} ({week.dateRange})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedWeek && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                {availableWeeks.find(w => w.id === selectedWeek)?.dateRange}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={handleSortChange}
              >
                <MenuItem value="volume">Volume (Parts Processed)</MenuItem>
                <MenuItem value="failureRate">Failure Rate</MenuItem>
                <MenuItem value="impactScore">Impact Score</MenuItem>
                <MenuItem value="alphabetical">Alphabetical</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FastSwitch
              checked={useHardcodedTPY}
              onChange={handleTPYModeChange}
              label={useHardcodedTPY ? "Focused TPY" : "Complete TPY"}
              color="primary"
            />
            <Typography variant="caption" display="block" color="text.secondary">
              {useHardcodedTPY ? "4 Key Stations" : "All Stations"}
              {processingState.isProcessing && " • Processing..."}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FastSwitch
              checked={showRepairStations}
              onChange={handleRepairStationsChange}
              label="Show Repair Stations"
              color="secondary"
            />
          </Grid>
        </Grid>
      </Box>

      {/* TPY Summary Cards */}
      {throughputData && (
        <Box sx={{ mb: 6 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Tesla SXM4 TPY
                  </Typography>
                  <Typography variant="h3" color="error.main">
                    {processedStationData.tpyData.SXM4?.tpy?.toFixed(1) || '--'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {useHardcodedTPY ? 'Focused Analysis' : 'Complete Analysis'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Tesla SXM5 TPY
                  </Typography>
                  <Typography variant="h3" color="success.main">
                    {processedStationData.tpyData.SXM5?.tpy?.toFixed(1) || '--'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {useHardcodedTPY ? 'Focused Analysis' : 'Complete Analysis'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    SXM6 TPY
                  </Typography>
                  <Typography variant="h3" color="info.main">
                    {processedStationData.tpyData.SXM6?.tpy?.toFixed(1) || '--'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {useHardcodedTPY ? 'Focused Analysis' : 'Complete Analysis'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {throughputData ? (
        <>
          {/* Tesla SXM4 Section */}
          <Box sx={{ mb: 8 }}>
            {/* SXM4 Chart */}
            <MemoizedChart 
              data={processedStationData.sxm4}
              title="Tesla SXM4 - Station Throughput"
              containerStyles={chartContainerStyles}
              processingStyles={processingStyles}
            />

            {/* SXM4 Table */}
            <MemoizedTable 
              data={tableStationData.sxm4}
              title="Tesla SXM4 Station Details"
              modelName="SXM4"
              useHardcodedTPY={useHardcodedTPY}
              processingStyles={processingStyles}
            />
          </Box>

          {/* Tesla SXM5 Section */}
          <Box sx={{ mb: 8 }}>
            {/* SXM5 Chart */}
            <MemoizedChart 
              data={processedStationData.sxm5}
              title="Tesla SXM5 - Station Throughput"
              containerStyles={chartContainerStyles}
              processingStyles={processingStyles}
            />

            {/* SXM5 Table */}
            <MemoizedTable 
              data={tableStationData.sxm5}
              title="Tesla SXM5 Station Details"
              modelName="SXM5"
              useHardcodedTPY={useHardcodedTPY}
              processingStyles={processingStyles}
            />
          </Box>

          {/* Tesla SXM6 Section */}
          <Box sx={{ mb: 8 }}>
            {/* SXM6 Chart */}
            <MemoizedChart 
              data={processedStationData.sxm6}
              title="SXM6 - Station Throughput"
              containerStyles={chartContainerStyles}
              processingStyles={processingStyles}
            />

            {/* SXM6 Table */}
            <MemoizedTable 
              data={tableStationData.sxm6}
              title="SXM6 Station Details"
              modelName="SXM6"
              useHardcodedTPY={useHardcodedTPY}
              processingStyles={processingStyles}
            />
          </Box>
        </>
      ) : (
        <Box sx={containerStyles}>
          <Typography variant="h6" color="text.secondary">
            No throughput data available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a week to view station throughput analysis
          </Typography>
        </Box>
      )}
    </Container>
  );
};

// Memoized Chart Component for Performance
const MemoizedChart = React.memo(({ data, title, containerStyles, processingStyles }) => (
  <Card elevation={3} sx={{ mb: 3 }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        {title} ({data.length} stations)
      </Typography>
      <Box sx={{...containerStyles, ...processingStyles}}>
        <ThroughputBarChart data={data} />
      </Box>
    </CardContent>
  </Card>
));

// Memoized Table Component for Performance  
const MemoizedTable = React.memo(({ data, title, modelName, useHardcodedTPY, processingStyles }) => (
  <Card elevation={3}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Chip 
          label={`${data.length} stations${useHardcodedTPY ? ' (TPY calc)' : ''}`} 
          size="small" 
        />
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={processingStyles}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Station</TableCell>
              <TableCell align="right">Fail</TableCell>
              <TableCell align="right">Pass</TableCell>
              <TableCell align="right">Grand Total</TableCell>
              <TableCell align="right">Yield</TableCell>
              <TableCell align="right">Fail%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((station) => (
              <TableRow key={station.station}>
                <TableCell component="th" scope="row">
                  {station.station}
                </TableCell>
                <TableCell align="right">{station.failedParts}</TableCell>
                <TableCell align="right">{station.passedParts.toLocaleString()}</TableCell>
                <TableCell align="right">{station.totalParts.toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Box sx={{ color: station.failureRate < 5 ? 'success.main' : station.failureRate < 10 ? 'warning.main' : 'error.main' }}>
                    {(100 - station.failureRate).toFixed(1)}%
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ color: station.failureRate > 10 ? 'error.main' : station.failureRate > 5 ? 'warning.main' : 'success.main' }}>
                    {station.failureRate}%
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
));

// Lightweight custom switch component for performance
const FastSwitch = React.memo(({ checked, onChange, label, color = 'primary' }) => {
  const theme = useTheme();
  
  const switchStyles = useMemo(() => ({
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      userSelect: 'none'
    },
    switch: {
      position: 'relative',
      width: '44px',
      height: '24px',
      backgroundColor: checked ? 
        (color === 'primary' ? theme.palette.primary.main : theme.palette.secondary.main) : 
        theme.palette.grey[400],
      borderRadius: '12px',
      transition: 'background-color 0.2s ease',
      border: 'none',
      cursor: 'pointer',
      outline: 'none'
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
    // Create a synthetic event that matches MUI Switch structure
    const syntheticEvent = {
      ...e,
      preventDefault: () => e.preventDefault(),
      target: {
        ...e.target,
        checked: !checked
      }
    };
    onChange(syntheticEvent);
  }, [checked, onChange]);

  return (
    <div style={switchStyles.container} onClick={handleClick}>
      <div style={switchStyles.switch}>
        <div style={switchStyles.thumb} />
      </div>
      <span style={switchStyles.label}>{label}</span>
    </div>
  );
});

// Export with React.memo for performance
export default React.memo(ThroughputPage);  