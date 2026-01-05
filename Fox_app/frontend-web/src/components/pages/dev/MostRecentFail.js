import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Box, Typography, Button, Divider, TextField, useTheme, LinearProgress } from '@mui/material';
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

  // Data states: csvData holds imported CSV rows, codeData holds backend results
  const [csvData, setCsvData] = useState([]);
  const [codeData, setCodeData] = useState([]);
  const [passCheck, setPassCheck] = useState('');
  const [passData, setPassData] = useState([]);
  const [snData, setSnData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const theme = useTheme();

  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(async e => {
    if(passCheck)console.log('check',passCheck);
    else console.log("no check");
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: async results => {
        console.log('Parsed CSV:', results.data);

        // Store raw CSV rows
        setCsvData(results.data);

        // Extract SNS
        const sns = results.data
          .map(row => row.sn)
          .filter(v => v !== undefined && v !== null && v !== '');

        if (sns.length === 0) {
          console.warn('No serial numbers found in CSV');
          return;
        }

        setLoading(true);
        setProgress(0);

        // Split SNs into chunks
        const snChunks = chunkArray(sns, CHUNK_SIZE);
        const totalChunks = snChunks.length;
        console.log(`Processing ${sns.length} SNs in ${totalChunks} chunks of up to ${CHUNK_SIZE}`);

        try {
          // Process SN check in chunks
          let allSnData = [];
          for (let i = 0; i < snChunks.length; i++) {
            const chunk = snChunks[i];
            console.log(`Processing SN check chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
            
            const backendSnData = await importQuery(
              API_BASE,
              '/api/v1/testboard-records/sn-check',
              {},
              'POST',
              { sns: chunk, startDate, endDate }
            );
            
            allSnData = allSnData.concat(backendSnData);
            setProgress(((i + 1) / (totalChunks * 3)) * 100);
          }
          console.log('Combined SN data:', allSnData.length, 'records');
          setSnData(allSnData);
        } catch (err) {
          console.error('Failed to fetch SN data:', err);
        }

        try {
          // Process most recent fail in chunks
          let allCodeData = [];
          for (let i = 0; i < snChunks.length; i++) {
            const chunk = snChunks[i];
            console.log(`Processing fail check chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
            
            const backendData = await importQuery(
              API_BASE,
              '/api/v1/testboard-records/most-recent-fail',
              {},
              'POST',
              { sns: chunk, startDate, endDate }
            );
            
            allCodeData = allCodeData.concat(backendData);
            setProgress(((totalChunks + i + 1) / (totalChunks * 3)) * 100);
          }
          console.log('Combined Error data:', allCodeData.length, 'records');
          setCodeData(allCodeData);
        } catch (err) {
          console.error('Failed to fetch error codes:', err);
        }

        if(passCheck){
          const passCheckStations = passCheck
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          
          try {
            // Process pass check in chunks
            let allPassData = [];
            for (let i = 0; i < snChunks.length; i++) {
              const chunk = snChunks[i];
              console.log(`Processing pass check chunk ${i + 1}/${totalChunks} (${chunk.length} SNs)`);
              
              const backendPassData = await importQuery(
                API_BASE,
                '/api/v1/testboard-records/pass-check',
                {},
                'POST',
                { sns: chunk, startDate, endDate, passCheck: passCheckStations }
              );
              
              allPassData = allPassData.concat(backendPassData);
              setProgress(((totalChunks * 2 + i + 1) / (totalChunks * 3)) * 100);
            }
            console.log('Combined Pass data:', allPassData.length, 'records');
            setPassData(allPassData);
          } catch (err) {
            console.error('Failed to fetch pass check:', err);
          }
        }

        setLoading(false);
        setProgress(100);
      },
      error: err => {
        console.error('Error parsing CSV:', err);
        setLoading(false);
      }
    });

    e.target.value = null;
  }, [startDate, endDate, passCheck]);

  function cleanCode(code){
    if(code==='Pass')return;
    try{
        let newCode = code.slice(-3);
        if (newCode.length<3)return('NA');
        if (newCode==='_na'){
          newCode = code.slice(-6,-3);
          if (newCode.length<3)return('NA');
        };
        return('EC'+newCode);
    }catch(err) {
        console.error(err);
        return;}
  }

  const mergedDate = useMemo(()=>{
    if(!Array.isArray(csvData))return [];

    const lookup =codeData.reduce((acc, row) => {
      acc[row.sn] = row;
      return acc;
    }, {});
    const checkup =passData.reduce((acc, row) => {
      acc[row.sn] = row;
      return acc;
    }, {});
    const snup =snData.reduce((acc, row) => {
      acc[row.sn] = row;
      return acc;
    }, {});

    return csvData.map(row => {
      const match = lookup[row.sn];
      const check = checkup[row.sn];
      const sn = snup[row.sn];
      const pn = snup[row.sn]?.pn;
      return {
        ...row,
        pn: pn ? pn : 'NA',
        error_code: match ? cleanCode(match.error_code) : passCheck ? check ? "Passed":sn?"Pending":"Missing": sn?"Passed":"Missing",
        fail_time: match ? match.fail_time : passCheck ? check ? check.pass_time:sn?"Pending":"Missing": sn?"NA":"Missing"
      };
    });
  }, [csvData, codeData, passData, snData, passCheck]);

  const [exportCooldown, setExportCooldown] = useState(false);

  const getTimestamp = () => {
      const now = new Date();
      return now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  };

  const exportToCSV = useCallback(() => { 
      try {
        const rows = [];
        mergedDate.forEach((row) => {
            rows.push([row[`sn`],row[`pn`],row[`error_code`]
              , row['fail_time']
            ]);
        });
        const headers = [
          'Serial Number',
          'Part Number',
          'Error Code',
          'Last Fail/Pass Time'
        ];
        const filename = `most_recent_fail_data_${passCheck?passCheck+'_':''}${getTimestamp()}.csv`;
        exportSecureCSV(rows, headers, filename);
      } 
      catch (error) {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
      };
  }, [mergedDate, passCheck]);

  function handleExportCSV() {
      if (exportCooldown) return;
      setExportCooldown(true);
      try {
      exportToCSV();
      } catch(err) {
      console.error(err);
      alert('Export failed');
      } finally {
      setTimeout(()=>setExportCooldown(false),3000);
      }
  }

  const getBG = (status) => {
    const key = String(status || '').toLowerCase();

    const MAP = {
      passed: theme.palette.mode === 'dark'? theme.palette.info.dark:theme.palette.info.light,
      pending: theme.palette.mode === 'dark'? '#A29415':'#E9DB5D',
      missing: theme.palette.mode === 'dark'? '#e65100':'#ff9800',
    };

    return MAP[key] || (theme.palette.mode === 'dark'? theme.palette.error.dark:theme.palette.error.light);
  };

  const VirtualizedResults = ({ rows, height = 520, rowHeight = 32 }) => {
    const fields = [
      { key: 'sn',        label: 'Serial Number' },
      { key: 'pn',        label: 'Part Number' },
      { key: 'error_code',label: 'Error Code' },
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
  };

  return (
    <Box>
      <Header title="Most Recent Fail" subTitle="Charts most recent fail of imported SNs within a given timeframe" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
          onChange={(e)=>setPassCheck(e.target.value)}
        />
        <Button sx={buttonStyle} onClick={handleImportClick} disabled={loading}>
          Import Serial Numbers (CSV)
        </Button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {mergedDate.length>0 && !loading && (
        <Button sx={buttonStyle} onClick={handleExportCSV}>
          Export Serial Numbers (CSV)
        </Button>)}
      </Box>

      {loading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" sx={{ mt: 1 }}>
            Processing chunks... {Math.round(progress)}%
          </Typography>
        </Box>
      )}

      <Divider />

      {mergedDate.length > 0 ? (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Typography>Data accepted.</Typography>
            <Typography>Total SN: {mergedDate.length}</Typography>
            <Typography>Passed: {mergedDate.filter(i=>i.error_code==="Passed").length}</Typography>
            <Typography>Failed: {
              mergedDate.length - 
              mergedDate.filter(i=>i.error_code==="Missing").length - 
              mergedDate.filter(i=>i.error_code==="Pending").length - 
              mergedDate.filter(i=>i.error_code==="Passed").length
            }</Typography>
            <Typography>Pending: {mergedDate.filter(i=>i.error_code==="Pending").length}</Typography>
            <Typography>Missing: {mergedDate.filter(i=>i.error_code==="Missing").length}</Typography>
          </Box>
          <VirtualizedResults rows={mergedDate}/>
        </>
      ) : (
        <Typography>No data available. Import a CSV to get started.</Typography>
      )}
    </Box>
  );
};

export default MostRecentFail;