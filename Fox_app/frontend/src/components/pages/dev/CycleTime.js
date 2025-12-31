import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Box, Typography, Button, Divider, FormControl, InputLabel, Select, MenuItem, Fade, Paper, LinearProgress, Alert } from '@mui/material';
import Papa from 'papaparse';
import { Header } from '../../pagecomp/Header.jsx';
import { BoxChart } from '../../charts/BoxChart.js';
import { ViolinChart } from '../../charts/ViolinChart.js';
import { gridStyle, buttonStyle } from '../../theme/themes.js';
import { importQuery } from '../../../utils/queryUtils.js';
import { stationBuckets } from '../../../data/dataTables.js';
import * as d3 from 'd3';
import { exportSecureCSV } from '../../../utils/exportUtils.js';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) console.error('REACT_APP_API_BASE is not set');

const CHUNK_SIZE = 2000;

// Helper function to split array into chunks
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const StationCycleTime = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [useBuckets, setUseBuckets] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('');

  const fileInputRef = useRef(null);
  const boxChartRef = useRef(null);
  const violinChartRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: async (results) => {
        console.log('Parsed CSV:', results.data.length, 'rows');

        // Extract and validate SNs
        const sns = results.data.map(r => r.sn).filter(Boolean);
        
        if (!sns.length) {
          setError('No serial numbers found in CSV');
          console.warn('No SNs found in CSV');
          return;
        }

        setLoading(true);
        setProgress(0);
        setError(null);

        try {
          // Split SNs into chunks
          const snChunks = chunkArray(sns, CHUNK_SIZE);
          const totalChunks = snChunks.length;
          
          console.log(`Processing ${sns.length} SNs in ${totalChunks} chunks of up to ${CHUNK_SIZE}`);

          // Accumulate results in local array for atomic state update
          const allData = [];

          // Process chunks sequentially
          for (let i = 0; i < snChunks.length; i++) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Import cancelled');
            }

            const chunk = snChunks[i];
            console.log(`Processing chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
            
            const backendData = await importQuery(
              API_BASE,
              '/api/v1/workstation-routes/station-times',
              {},
              'POST',
              { sns: chunk }
            );
            
            allData.push(...backendData);
            setProgress(((i + 1) / totalChunks) * 100);
          }

          console.log('Combined data:', allData.length, 'records');

          // Atomic state update
          setRawData(allData);
          setProgress(100);

        } catch (err) {
          if (err.message === 'Import cancelled') {
            console.log('Import was cancelled by user');
          } else {
            console.error('Fetch error:', err);
            setError(`Failed to fetch data: ${err.message}`);
          }
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error('Parse error:', err);
        setError(`Failed to parse CSV: ${err.message}`);
        setLoading(false);
      }
    });

    e.target.value = null;
  }, []);

  // Build lookup from stationBuckets - memoized
  const stationBucketLookup = useMemo(() => {
    const lookup = {};
    const bucketsObj = stationBuckets || {};
    Object.entries(bucketsObj).forEach(([bucket, stations]) => {
      stations.forEach(st => {
        lookup[st] = bucket;
      });
    });
    return lookup;
  }, []);

  // bucketData: array of objects matching rawData schema
  const bucketData = useMemo(() => {
    if (!rawData.length) return [];

    // Map stations to buckets and combine
    const combined = rawData.reduce((acc, item) => {
      const bucketName = stationBucketLookup[item.workstation_name] || 'Unbucketed';
      const key = `${item.sn}-${bucketName}`;
      
      if (!acc[key]) {
        acc[key] = {
          sn: item.sn,
          workstation_name: bucketName,
          total_time: 0
        };
      }
      
      acc[key].total_time += item.total_time;
      return acc;
    }, {});

    return Object.values(combined);
  }, [rawData, stationBucketLookup]);

  const data = useBuckets ? bucketData : rawData;

  // Extract unique filter options
  const filterOptions = useMemo(
    () => [...new Set(data.map(r => r.workstation_name).filter(Boolean))].sort(),
    [data]
  );

  // Filter data based on selection
  const filteredData = useMemo(() => {
    if (!selectedFilter) return [];
    return data
      .filter(r => r.workstation_name === selectedFilter)
      .map(r => r.total_time)
      .filter(v => v != null);
  }, [data, selectedFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredData.length) return [];
    
    const sorted = filteredData.slice().sort(d3.ascending);
    const q1 = d3.quantile(sorted, 0.25);
    const q3 = d3.quantile(sorted, 0.75);
    
    return [
      { label: 'Minimum', value: d3.min(sorted).toFixed(2) },
      { label: 'Q1', value: q1.toFixed(2) },
      { label: 'Median', value: d3.quantile(sorted, 0.5).toFixed(2) },
      { label: 'Q3', value: q3.toFixed(2) },
      { label: 'Maximum', value: d3.max(sorted).toFixed(2) },
      { label: 'IQR', value: (q3 - q1).toFixed(2) },
      { label: 'Mean', value: d3.mean(sorted).toFixed(2) }
    ];
  }, [filteredData]);

  const exportSelection = useCallback((selection, filename) => {
    const exportData = data
      .filter(item => selection.includes(item.total_time))
      .map(item => structuredClone(item));
    
    console.log('Exporting', exportData.length, 'records');
    
    try {
      const rows = exportData.map(row => [
        row.sn,
        row.workstation_name,
        row.total_time
      ]);
      
      const headers = [
        'Serial Number',
        'Station Name',
        'Total Time (Hours)'
      ];
      
      exportSecureCSV(rows, headers, `${filename}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [data]);

  const handleExportSVG = useCallback((svgNode, filename, lowerBound, upperBound, chartData) => {
    if (!svgNode) return;
    
    console.log('Export params:', {
      filename,
      lowerBound,
      upperBound,
      dataPoints: chartData.length
    });

    // Filter data within bounds
    const limitedData = chartData.filter(v => v >= lowerBound && v <= upperBound);
    console.log('Filtered to', limitedData.length, 'points');
    
    const fullName = `${filename}_${Number(lowerBound).toFixed(0)}_${Number(upperBound).toFixed(0)}`;
    exportSelection(limitedData, fullName);
  }, [exportSelection]);

  const handleToggleBuckets = useCallback(() => {
    setSelectedFilter('');
    setUseBuckets(prev => !prev);
  }, []);

  return (
    <Box>
      <Header title="Station Cycle Time" subTitle="Charting station cycle times" />
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }} disabled={!filterOptions.length || loading}>
          <InputLabel>Filter</InputLabel>
          <Select 
            value={selectedFilter} 
            onChange={e => setSelectedFilter(e.target.value)}
          >
            {filterOptions.map((opt, i) => (
              <MenuItem key={i} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button 
          sx={buttonStyle} 
          onClick={handleImportClick}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Import CSV'}
        </Button>
        
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        <Button 
          sx={buttonStyle} 
          onClick={handleToggleBuckets}
          disabled={!data.length || loading}
        >
          {useBuckets ? 'Use Workstations' : 'Use Buckets'}
        </Button>
      </Box>

      {loading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Processing chunks... {Math.round(progress)}%
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Divider />

      {!data.length ? (
        <Typography sx={{ mt: 2 }}>No data available. Import a CSV to get started.</Typography>
      ) : selectedFilter ? (
        <>
          <Fade in={true}>
            <Paper sx={{ mt: 2, p: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Station Details (Hours) - {selectedFilter}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {stats.map(({ label, value }) => (
                  <Typography key={label} variant="body2">
                    <strong>{label}:</strong> {value}
                  </Typography>
                ))}
              </Box>
            </Paper>
          </Fade>
          
          <Box sx={gridStyle}>
            <BoxChart
              ref={boxChartRef}
              data={filteredData}
              width={600}
              height={400}
              axisLabel="Cycle Time in Hours"
              onExport={(node, lb, ub) => 
                handleExportSVG(node, `${selectedFilter}-box`, lb, ub, filteredData)
              }
            />
            <ViolinChart
              ref={violinChartRef}
              data={filteredData}
              width={600}
              height={400}
              isHorizontal={true}
              onExport={(node, lb, ub) => 
                handleExportSVG(node, `${selectedFilter}-violin`, lb, ub, filteredData)
              }
            />
          </Box>
        </>
      ) : (
        <Typography sx={{ mt: 2 }}>Select a filter to view charts</Typography>
      )}
    </Box>
  );
};

export default StationCycleTime;