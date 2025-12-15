import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Box, Typography, Button, Divider, TextField, useTheme } from '@mui/material';
import Papa from 'papaparse';
import { Header } from '../../pagecomp/Header.jsx';
import { buttonStyle } from '../../theme/themes.js';
import { DateRange } from '../../pagecomp/DateRange.jsx';
import { getInitialStartDate, normalizeDate } from '../../../utils/dateUtils.js';
import { importQuery } from '../../../utils/queryUtils.js';
import { exportSecureCSV } from '../../../utils/exportUtils.js';
import { tableStyle, headerStyle,divStyle, dataTextStyle } from '../../theme/themes.js';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

export const ByErrorCode = () => {
  // Date range state
  const [startDate, setStartDate] = useState(getInitialStartDate());
  const [endDate, setEndDate] = useState(normalizeDate.end(new Date()));
  const handleStartDateChange = useCallback(date => setStartDate(normalizeDate.start(date)), []);
  const handleEndDateChange = useCallback(date => setEndDate(normalizeDate.end(date)), []);

  // Data states: csvData holds imported CSV rows, codeData holds backend results
  const [data, setData] = useState([]);
  const [codeCheck,setCodeCheck]=useState('');
  
  const [tableView, setTableView] = useState(false);

    const theme = useTheme();

    const handleFileChange = useCallback(async e => {
        if(!codeCheck)return;
        console.log('check found: ',codeCheck)
        try{
            console.log('Checking on: ',codeCheck)
            const checkArray = codeCheck
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            const backendData = importQuery(
                API_BASE,
                '/api/v1/testboard-records/by-error',
                {  },
                'POST',
                { checkArray,startDate, endDate, }
            );
            //console.log('Backend query results: ',backendData)
            setData(await(backendData));
            console.log('Backend query results: ',data);
        }
        catch(err){ console.log('Failed to fetch Sn:', err); }
    },[codeCheck,startDate,endDate])

    useEffect(()=>{handleFileChange()},[codeCheck,startDate,endDate])
    
    const [exportCooldown, setExportCooldown] = useState(false);

    const getTimestamp = () => {
        const now = new Date();
        return now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
    };

    const exportToCSV = useCallback(() => { 
        try {
          const rows = [];
          data.forEach((row) => {
              rows.push([row[`sn`],row[`pn`]
                , row['error_code']
              ]);
          });
          const headers = [
            'Serial Number',
            'Part Number',
            'Error Code'
          ];
          const filename = `SNPN_ByError${getTimestamp()}.csv`;
          // Use secure export function
          exportSecureCSV(rows, headers, filename);
        } 
        catch (error) {
          console.error('Export failed:', error);
          alert('Export failed. Please try again.');
        };
    }, [data]);

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

    function handleTable(){setTableView(!tableView)}

    const errorCodes = [...new Set(data.map(item => item.error_code))];

    // Unique part numbers (rows)
    const partNumbers = [...new Set(data.map(item => item.pn))];

    // Lookup { pn: { error_code: count } }
    const counts = data.reduce((acc, { pn, error_code }) => {
    if (!acc[pn]) acc[pn] = {};
    acc[pn][error_code] = (acc[pn][error_code] || 0) + 1;
    return acc;
    }, {});

  return (
    <Box>
      <Header title="Get Serial number and Part number by Error code" subTitle="Retreive Serial number and Partnumber of all parts in a range that failed a certain Error code" />

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
          id="ErrorCodeField" 
          label="Error code" 
          variant="outlined" 
          value={codeCheck}
          onChange={(e)=>setCodeCheck(e.target.value)}
        />
        {data.length>0 ?(
            <>
                <Button sx={buttonStyle} onClick={handleExportCSV}>
                Export Data (CSV)
                </Button>
                <Button sx={buttonStyle} onClick={handleTable}>
                    {tableView?'List View':'Table View'}
                </Button>
            </>):
            <></>}
      </Box>

      <Divider />

      {data.length > 0 ? (
        tableView?(
            <Box sx={{ gap: 3 }}>
                <table>
                    <thead>
                    <tr>
                        <th style={headerStyle}>Part Number</th>
                        {errorCodes.map(code => (
                        <th style={headerStyle} key={code}>{code}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {partNumbers.map(pn => (
                        <tr key={pn}>
                        <td style={dataTextStyle}>{pn}</td>
                        {errorCodes.map(code => (
                            <td style={dataTextStyle} key={code}>
                            {counts[pn]?.[code] || ""}
                            </td>
                        ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
                </Box>
        ):(
            <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    <Typography>Data accepted.</Typography>
                    <Typography>Total SN: {data.length}</Typography>
                    {
                        Object.entries(
                                data.reduce((acc, item) => {
                                const key = item.error_code;
                                acc[key] = (acc[key] || 0) + 1;
                                return acc;
                                }, {})
                            ).map(([code, count]) => (
                                <Typography key={code}>
                                {code}: {count}
                                </Typography>
                            ))
                    }
                </Box>
                {data.map((row,idx) => (
                    <Typography key={idx} sx={{/*backgroundColor:getBG(row['error_code'])*/}}>
                        {row['sn']}: {row['pn']}: {row['error_code']}
                    </Typography>
                ))}
            </>
        )
      ) : (
        <Typography>No data available. Input an error code to get started.</Typography>
      )}
    </Box>
  );
};

export default ByErrorCode;
