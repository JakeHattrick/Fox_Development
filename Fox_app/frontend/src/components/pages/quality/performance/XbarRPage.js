import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { Box, Container, Typography, Card, CardContent, Grid, FormControl,
  InputLabel, Select, MenuItem, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, TextField, Button, Stack
} from '@mui/material';

import { Header } from '../../../pagecomp/Header';
import { getInitialStartDate, normalizeDate } from '../../../../utils/dateUtils';
import XbarRChart from '../../../charts/XbarRChart';
import { DateRange } from '../../../pagecomp/DateRange';
import { NumberRange } from '../../../pagecomp/NumberRange';
import { gridStyle } from '../../../theme/themes.js';

const API_BASE = process.env.REACT_APP_API_BASE;

const XbarRPage = () => {
    const [startDate, setStartDate] = useState(getInitialStartDate(60));
    const [endDate, setEndDate] = useState(normalizeDate.end(new Date()));
    const handleStartDateChange = useCallback((date) => {
    setStartDate(normalizeDate.start(date));
    }, []);
    const handleEndDateChange = useCallback((date) => {
    setEndDate(normalizeDate.end(date));
    }, []);
    const [errorCode, setErrorCode] = useState('445');
    const [workStation, setWorkStation] = useState('BAT');
    const [sampleNumber, setSampleNumber] = useState(6);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);


    const handleQuery = async () => {
        //console.log(sampleNumber);
        try {
            setLoading(true);

            const response = await fetch(`${API_BASE}/api/v1/testboard-records/x-bar-r`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ec: errorCode,
                startDate,
                endDate,
                station: workStation,
            }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            //console.log('Xbar-R response:', result);

            // Store backend data into state
            setData(result);
        } catch (error) {
            console.error('Xbar-R query error:', error);
            // optional: setData([]); or track an error state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleQuery();
    },[errorCode, workStation, startDate, endDate]);

    // useEffect(() =>{
    //     console.log('data fetched:')
    //     console.log(data);
    // },[data])

    const structuredData = useMemo(() => {
        // Transform data from date, value x, value y to date, value x/value y
        return data.map(item=> ({
            date: item.date,
            value: item.error_code_count/item.test_count * 100
        }))
    },[data])
    
    // useEffect(() =>{
    //     console.log('data structured:')
    //     console.log(structuredData);
    // },[structuredData])


    return (
        <Container maxWidth = "xl">
            <Box sx={{ my: 4}}>
                <Header title="Xbar-R Chart" subTitle="Xbar-R Chart Page" />
            </Box>

            <Divider sx={{ mb: 4 }} />
            <Box>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <DateRange
                        startDate={startDate}
                        endDate={endDate}
                        setStartDate={handleStartDateChange} 
                        setEndDate={handleEndDateChange}
                        normalizeStart={normalizeDate.start} 
                        normalizeEnd={normalizeDate.end}
                        inline= {true}
                    />
                    <NumberRange
                        defaultNumber={sampleNumber}
                        setNumber = {setSampleNumber}
                        minNumber = {2}
                        maxNumber = {12}
                        label = "Subgroup Size"
                    />
                    <TextField
                        label="Input Error Code"
                        value={errorCode}
                        onChange={(e) => setErrorCode(e.target.value)}
                        size = 'small'
                    />
                    <TextField
                        label="Input Station Name"
                        value={workStation}
                        onChange={(e) => setWorkStation(e.target.value)}
                        size = 'small'
                    />
                </Stack>
            </Box>
            <Box sx={gridStyle}>
                <Paper sx={{ p: 2, mb: 4 }}>
                    <XbarRChart
                        title="X Bar Chart"
                        subtitle={`Error Code: ${errorCode} | Station: ${workStation} | Sample Size: ${sampleNumber} | Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
                        data={structuredData}
                        subSize={sampleNumber}
                        isX={true}
                    />
                </Paper>
                <Paper sx={{ p: 2, mb: 4 }}>
                    <XbarRChart
                        title="R Range Chart"
                        subtitle={`Error Code: ${errorCode} | Station: ${workStation} | Sample Size: ${sampleNumber} | Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
                        data={structuredData}
                        subSize={sampleNumber}
                        isX={false}
                    />
                </Paper>
            </Box>
        </Container>
    );
};

export default XbarRPage;