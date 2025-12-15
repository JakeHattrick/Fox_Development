// Paused development on this page - waiting on clarity on requirements

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Box, Typography, Button, Divider, TextField, useTheme } from '@mui/material';
import Papa from 'papaparse';
import { Header } from '../../pagecomp/Header.jsx';
import { buttonStyle } from '../../theme/themes.js';
import { DateRange } from '../../pagecomp/DateRange.jsx';
import { getInitialStartDate, normalizeDate } from '../../../utils/dateUtils.js';
import { importQuery } from '../../../utils/queryUtils.js';
import { exportSecureCSV } from '../../../utils/exportUtils.js';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

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

  const theme = useTheme();

  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: async results => {
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
        try {
          const passCheckStations = passCheck
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          // Fetch sn results
            const qs = `?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`;
            console.log('>> Request URL:', API_BASE + '/api/v1/testboard-records/sn-check' + qs);
            console.log('>> Request body:', { sns });
          
          const backendSnData = await importQuery(
            API_BASE,
            '/api/v1/testboard-records/sn-check',
            {  },
            'POST',
            { sns,startDate, endDate, passCheck:passCheckStations }
          );

          // Store backend query results
          setSnData(backendSnData);
        } catch (err) {
          console.error('Failed to fetch Sn:', err);
        }
      },
      error: err => console.error('Error parsing CSV:', err)
    });

    e.target.value = null;
  }, [startDate, endDate, passCheck]);

  function cleanCode(code){
    if(code==='Pass')return;
    try{
        const newCode = code.slice(-3);
        if (newCode.length<3)return('NA');
        if (newCode==='_na')return('NA');
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
      return {
        ...row,
        error_code: match ? cleanCode(match.error_code) : passCheck ? check ? "Passed":sn?"Pending":"Missing": sn?"Passed":"Missing",
        fail_time: match ? match.fail_time : passCheck ? check ? check.pass_time:sn?"Pending":"Missing": sn?"NA":"Missing"
      };
    });
  }, [csvData, codeData, passData]);

    const [exportCooldown, setExportCooldown] = useState(false);

    const getTimestamp = () => {
        const now = new Date();
        return now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
    };

    const exportToCSV = useCallback(() => { 
        try {
          const rows = [];
          mergedDate.forEach((row) => {
              rows.push([row[`sn`],row[`error_code`]
                , row['fail_time']
              ]);
          });
          const headers = [
            'Serial Number',
            'Error Code',
            'Last Fail/Pass Time'
          ];
          const filename = `most_recent_fail_data_${passCheck?passCheck+'_':''}${getTimestamp()}.csv`;
          // Use secure export function
          exportSecureCSV(rows, headers, filename);
        } 
        catch (error) {
          console.error('Export failed:', error);
          alert('Export failed. Please try again.');
        };
    }, [mergedDate]);

    function handleExportCSV() {
        if (exportCooldown) return;
        setExportCooldown(true);
        try {
        exportToCSV();
        } catch(err) {
        console.error(err);
        alert('Export failed');
        } finally {
        // always clear cooldown
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
        <Button sx={buttonStyle} onClick={handleImportClick}>
          Import Serial Numbers (CSV)
        </Button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {mergedDate.length>0 ?(
        <Button sx={buttonStyle} onClick={handleExportCSV}>
          Export Serial Numbers (CSV)
        </Button>):
        <></>}
      </Box>

      <Divider />

      {snData.length > 0 ? (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Typography>Data accepted.</Typography>
          </Box>
          {snData.map(row => (
              <Typography sx={{}}>
                {row['sn']}: {row['workstation_name']}: {row['error_code']}: {row['fail_time']}
              </Typography>
          ))}
        </>
      ) : (
        <Typography>No data available. Import a CSV to get started.</Typography>
      )}
    </Box>
  );
};

export default MostRecentFail;
