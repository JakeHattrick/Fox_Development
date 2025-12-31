import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Box, Typography, Button, Divider, TextField, useTheme, LinearProgress, Alert } from '@mui/material';
import Papa from 'papaparse';
import { Header } from '../../pagecomp/Header.jsx';
import { buttonStyle } from '../../theme/themes.js';
import { DateRange } from '../../pagecomp/DateRange.jsx';
import { getInitialStartDate, normalizeDate } from '../../../utils/dateUtils.js';
import { importQuery } from '../../../utils/queryUtils.js';
import { exportSecureCSV } from '../../../utils/exportUtils.js';
import { FixedSizeList as List } from 'react-window';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const CHUNK_SIZE = 2000;

// Status constants
const STATUS = {
  PASSED: 'Passed',
  PENDING: 'Pending',
  MISSING: 'Missing',
  NA: 'NA'
};

// Helper function to split array into chunks
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const MostRecentFail = () => {
  // Date range state
  const [startDate, setStartDate] = useState(getInitialStartDate());
  const [endDate, setEndDate] = useState(normalizeDate.end(new Date()));
  const handleStartDateChange = useCallback(date => setStartDate(normalizeDate.start(date)), []);
  const handleEndDateChange = useCallback(date => setEndDate(normalizeDate.end(date)), []);

  // Data states
  const [csvData, setCsvData] = useState([]);
  const [codeData, setCodeData] = useState([]);
  const [passCheck, setPassCheck] = useState('');
  const [passData, setPassData] = useState([]);
  const [snData, setSnData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Memoized cleanCode function
  const cleanCode = useCallback((code) => {
    if (!code || code === 'Pass') return STATUS.PASSED;
    
    try {
      let newCode = code.slice(-3);
      if (newCode.length < 3) return STATUS.NA;
      
      if (newCode === '_na') {
        newCode = code.slice(-6, -3);
        if (newCode.length < 3) return STATUS.NA;
      }
      
      return 'EC' + newCode;
    } catch (err) {
      console.error('Error cleaning code:', err);
      return STATUS.NA;
    }
  }, []);

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

        // Store raw CSV rows
        setCsvData(results.data);

        // Extract and validate SNs
        const sns = results.data
          .map(row => row.sn)
          .filter(v => v !== undefined && v !== null && v !== '');

        if (sns.length === 0) {
          setError('No serial numbers found in CSV');
          console.warn('No serial numbers found in CSV');
          return;
        }

        setLoading(true);
        setProgress(0);
        setError(null);

        // Determine if pass check mode is active
        const hasPassCheck = Boolean(passCheck?.trim());
        const totalOperations = hasPassCheck ? 3 : 2;

        try {
          // Split SNs into chunks
          const snChunks = chunkArray(sns, CHUNK_SIZE);
          const totalChunks = snChunks.length;
          
          console.log(`Processing ${sns.length} SNs in ${totalChunks} chunks of up to ${CHUNK_SIZE}`);
          if (hasPassCheck) {
            console.log('Pass check mode enabled:', passCheck);
          }

          // Accumulate results in local arrays for atomic state update
          const allSnData = [];
          const allCodeData = [];
          const allPassData = [];

          // Process SN check in chunks
          for (let i = 0; i < snChunks.length; i++) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Import cancelled');
            }

            const chunk = snChunks[i];
            console.log(`Processing SN check chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
            
            const backendSnData = await importQuery(
              API_BASE,
              '/api/v1/testboard-records/sn-check',
              {},
              'POST',
              { sns: chunk, startDate, endDate }
            );
            
            allSnData.push(...backendSnData);
            setProgress(((i + 1) / (totalChunks * totalOperations)) * 100);
          }
          console.log('Combined SN data:', allSnData.length, 'records');

          // Process most recent fail in chunks
          for (let i = 0; i < snChunks.length; i++) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Import cancelled');
            }

            const chunk = snChunks[i];
            console.log(`Processing fail check chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
            
            const backendData = await importQuery(
              API_BASE,
              '/api/v1/testboard-records/most-recent-fail',
              {},
              'POST',
              { sns: chunk, startDate, endDate }
            );
            
            allCodeData.push(...backendData);
            setProgress(((totalChunks + i + 1) / (totalChunks * totalOperations)) * 100);
          }
          console.log('Combined Error data:', allCodeData.length, 'records');

          // Process pass check if needed
          if (hasPassCheck) {
            const passCheckStations = passCheck
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
            
            for (let i = 0; i < snChunks.length; i++) {
              if (abortControllerRef.current?.signal.aborted) {
                throw new Error('Import cancelled');
              }

              const chunk = snChunks[i];
              console.log(`Processing pass check chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
              
              const backendPassData = await importQuery(
                API_BASE,
                '/api/v1/testboard-records/pass-check',
                {},
                'POST',
                { sns: chunk, startDate, endDate, passCheck: passCheckStations }
              );
              
              allPassData.push(...backendPassData);
              setProgress(((totalChunks * 2 + i + 1) / (totalChunks * totalOperations)) * 100);
            }
            console.log('Combined Pass data:', allPassData.length, 'records');
          }

          // Atomic state update - all at once
          setSnData(allSnData);
          setCodeData(allCodeData);
          setPassData(allPassData);
          setProgress(100);

        } catch (err) {
          if (err.message === 'Import cancelled') {
            console.log('Import was cancelled by user');
          } else {
            console.error('Failed to process data:', err);
            setError(`Failed to process data: ${err.message}`);
          }
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
        setError(`Failed to parse CSV: ${err.message}`);
        setLoading(false);
      }
    });

    e.target.value = null;
  }, [startDate, endDate, passCheck]);

  // Memoize lookup maps separately for better performance
  const lookup = useMemo(() => 
    codeData.reduce((acc, row) => {
      acc[row.sn] = row;
      return acc;
    }, {})
  , [codeData]);

  const checkup = useMemo(() => 
    passData.reduce((acc, row) => {
      acc[row.sn] = row;
      return acc;
    }, {})
  , [passData]);

  const snup = useMemo(() => 
    snData.reduce((acc, row) => {
      acc[row.sn] = row;
      return acc;
    }, {})
  , [snData]);

  // Main data merging logic - refactored for clarity
  const mergedDate = useMemo(() => {
    if (!Array.isArray(csvData) || csvData.length === 0) return [];

    const hasPassCheck = Boolean(passCheck?.trim());

    return csvData.map(row => {
      const match = lookup[row.sn];
      const check = checkup[row.sn];
      const sn = snup[row.sn];
      const pn = sn?.pn || STATUS.NA;

      // Determine error_code and fail_time
      let error_code;
      let fail_time;

      if (match) {
        // Has a fail record - fail takes precedence
        error_code = cleanCode(match.error_code);
        fail_time = match.fail_time;
      } else if (hasPassCheck) {
        // Pass check mode: verify device passed required stations
        if (check) {
          error_code = STATUS.PASSED;
          fail_time = check.pass_time;
        } else if (sn) {
          error_code = STATUS.PENDING;
          fail_time = STATUS.PENDING;
        } else {
          error_code = STATUS.MISSING;
          fail_time = STATUS.MISSING;
        }
      } else {
        // Standard mode: no fail = pass (if device exists)
        if (sn) {
          error_code = STATUS.PASSED;
          fail_time = STATUS.NA;
        } else {
          error_code = STATUS.MISSING;
          fail_time = STATUS.MISSING;
        }
      }

      return {
        ...row,
        pn,
        error_code,
        fail_time
      };
    });
  }, [csvData, lookup, checkup, snup, passCheck, cleanCode]);

  const [exportCooldown, setExportCooldown] = useState(false);

  const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  };

  const exportToCSV = useCallback(() => {
    try {
      const rows = mergedDate.map(row => [
        row.sn,
        row.pn,
        row.error_code,
        row.fail_time
      ]);

      const headers = [
        'Serial Number',
        'Part Number',
        'Error Code',
        'Last Fail/Pass Time'
      ];

      const filename = `most_recent_fail_data_${passCheck ? passCheck.replace(/[,\s]+/g, '_') + '_' : ''}${getTimestamp()}.csv`;
      exportSecureCSV(rows, headers, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [mergedDate, passCheck]);

  const handleExportCSV = useCallback(() => {
    if (exportCooldown) return;
    setExportCooldown(true);
    try {
      exportToCSV();
    } catch (err) {
      console.error(err);
      alert('Export failed');
    } finally {
      setTimeout(() => setExportCooldown(false), 3000);
    }
  }, [exportCooldown, exportToCSV]);

  const getBG = useCallback((status) => {
    const key = String(status || '').toLowerCase();

    const colorMap = {
      passed: theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.light,
      pending: theme.palette.mode === 'dark' ? '#A29415' : '#E9DB5D',
      missing: theme.palette.mode === 'dark' ? '#e65100' : '#ff9800',
    };

    return colorMap[key] || (theme.palette.mode === 'dark' ? theme.palette.error.dark : theme.palette.error.light);
  }, [theme.palette]);

  // Memoize statistics for efficiency
  const stats = useMemo(() => {
    const total = mergedDate.length;
    const passed = mergedDate.filter(i => i.error_code === STATUS.PASSED).length;
    const pending = mergedDate.filter(i => i.error_code === STATUS.PENDING).length;
    const missing = mergedDate.filter(i => i.error_code === STATUS.MISSING).length;
    const failed = total - passed - pending - missing;

    return { total, passed, pending, missing, failed };
  }, [mergedDate]);

  const VirtualizedResults = useCallback(({ rows, height = 520, rowHeight = 32 }) => {
    const fields = [
      { key: 'sn', label: 'Serial Number' },
      { key: 'pn', label: 'Part Number' },
      { key: 'error_code', label: 'Error Code' },
      { key: 'fail_time', label: 'Last Fail/Pass Time' },
    ];

    const colMin = 180;
    const gridMinWidth = fields.length * colMin;
    const colTemplate = `repeat(${fields.length}, minmax(${colMin}px, 1fr))`;

    const Row = ({ index, style }) => {
      const row = rows[index];
      if (!row) return null;

      return (
        <Box
          role="row"
          style={style}
          sx={{
            display: 'grid',
            gridTemplateColumns: colTemplate,
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            px: 1,
            whiteSpace: 'nowrap',
            backgroundColor: getBG(row.error_code),
          }}
        >
          {fields.map((f) => (
            <Box
              key={f.key}
              role="cell"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pr: 1,
                fontFamily: 'monospace',
              }}
              title={row[f.key] != null ? String(row[f.key]) : ''}
            >
              {row[f.key] != null ? String(row[f.key]) : ''}
            </Box>
          ))}
        </Box>
      );
    };

    return (
      <Box
        sx={{
          width: '100%',
          overflow: 'auto',
          border: '1px solid #ddd',
          borderRadius: 1,
          mt: 2,
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: 'grey.100',
            borderBottom: '1px solid #ddd',
          }}
        >
          <Box
            role="row"
            sx={{
              display: 'grid',
              gridTemplateColumns: colTemplate,
              fontWeight: 'bold',
              px: 1,
              py: 1,
              minWidth: gridMinWidth,
            }}
          >
            {fields.map((f) => (
              <Box key={f.key} role="columnheader" sx={{ pr: 1 }}>
                {f.label}
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ height, minWidth: gridMinWidth }}>
          <List
            height={height}
            itemCount={rows.length}
            itemSize={rowHeight}
            width="100%"
          >
            {Row}
          </List>
        </Box>
      </Box>
    );
  }, [getBG]);

  return (
    <Box>
      <Header title="Most Recent Fail" subTitle="Charts most recent fail of imported SNs within a given timeframe" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <DateRange
          startDate={startDate}
          endDate={endDate}
          setStartDate={handleStartDateChange}
          setEndDate={handleEndDateChange}
          normalizeStart={normalizeDate.start}
          normalizeEnd={normalizeDate.end}
        />
        <TextField
          id="passCheckField"
          label="Pass Check"
          variant="outlined"
          value={passCheck}
          onChange={(e) => setPassCheck(e.target.value)}
          disabled={loading}
          placeholder="Station1, Station2"
        />
        <Button sx={buttonStyle} onClick={handleImportClick} disabled={loading}>
          {loading ? 'Processing...' : 'Import Serial Numbers (CSV)'}
        </Button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {mergedDate.length > 0 && !loading && (
          <Button sx={buttonStyle} onClick={handleExportCSV} disabled={exportCooldown}>
            {exportCooldown ? 'Exporting...' : 'Export Serial Numbers (CSV)'}
          </Button>
        )}
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

      {mergedDate.length > 0 ? (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, my: 2 }}>
            <Typography>Data accepted.</Typography>
            <Typography>Total SN: {stats.total}</Typography>
            <Typography sx={{ color: theme.palette.info.main }}>Passed: {stats.passed}</Typography>
            <Typography sx={{ color: theme.palette.error.main }}>Failed: {stats.failed}</Typography>
            <Typography sx={{ color: '#A29415' }}>Pending: {stats.pending}</Typography>
            <Typography sx={{ color: theme.palette.warning.main }}>Missing: {stats.missing}</Typography>
          </Box>
          <VirtualizedResults rows={mergedDate} />
        </>
      ) : (
        <Typography sx={{ mt: 2 }}>No data available. Import a CSV to get started.</Typography>
      )}
    </Box>
  );
};

export default MostRecentFail;