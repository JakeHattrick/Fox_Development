import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Container, Divider, FormControl, InputLabel, MenuItem, Select, Typography, Alert, Stack, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, TextField, Menu, ListItemText, Checkbox, Button
} from '@mui/material';
import {LineChart} from '../../../charts/LineChart.js';
import { CombinedChart } from '../../../charts/CombinedChart.js';
import { Header } from '../../../pagecomp/Header.jsx';
import { DateRange } from '../../../pagecomp/DateRange.jsx';
import { headerStyle, dataTextStyle, toolbarStyle } from '../../../theme/themes.js';
import { useTheme } from '@mui/material/styles';
import { normalizeDate, getInitialStartDate } from '../../../../utils/dateUtils.js';
import { fetchYieldData } from '../../../../utils/queryUtils.js';

// Check for environment variable for API base
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const clampPct = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
};

const iconStyle = { fontSize: '20px' };

const FirstPassPage = () => {
    const theme = useTheme();
    // Date handling
    const [startDate, setStartDate] = useState(getInitialStartDate(60));
    const [endDate, setEndDate] = useState(normalizeDate.end(new Date()));

    const [rawData,setRawData] = useState([]);
    const [filteredData,setFilteredData] = useState([]);
    const [chartData,setChartData] = useState([]);

    const fileInputRef = useRef(null);
    const [importSns,setImportSns] = useState([]);

    //Filter Management
    const [filters, setFilters] = useState({
        selected: {
            model: [],
            partNumber: []
        },
        available: {
            models: [],
            partNumbers: []
        }
    });
    
    // Generic filter change handler
    const handleFilterChange = useCallback((filterKey, value) => {
        setFilters(prev => ({
            ...prev,
            selected: {
                ...prev.selected,
                [filterKey]: value,
                ...(filterKey === 'model'&& {partNumber:[]})
            }
        }));
    }, []);

    const normalizeSN = (value) => String(value ?? '').trim().toUpperCase();

    const parseCsvLine = (line) => {
        // splits on commas that are not inside quotes
        return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell =>
            cell.trim().replace(/^"|"$/g, '')
        );
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleCsvImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lines = text
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);

            if (!lines.length) {
                setImportSns([]);
                return;
            }

            const headers = parseCsvLine(lines[0]).map(h =>
                h.replace(/^\uFEFF/, '').trim().toLowerCase()
            );

            const snIndex = headers.findIndex(h =>
                h === 'sn' ||
                h === 'serial number' ||
                h === 'serial_number' ||
                h === 'serialnumber'
            );

            if (snIndex === -1) {
                console.error('CSV import failed: no sn column found.');
                setImportSns([]);
                event.target.value = '';
                return;
            }

            const sns = lines
                .slice(1)
                .map(line => parseCsvLine(line)[snIndex])
                .map(normalizeSN)
                .filter(Boolean);

            setImportSns([...new Set(sns)]);
        } catch (err) {
            console.error('Failed to import CSV:', err);
            setImportSns([]);
        } finally {
            // allows re-importing the same file
            event.target.value = '';
        }
    };

    // Placeholder Data - replace with real data fetching logic
    useEffect(() => {
        let cancelled = false;
        
        async function loadData() {
            //setLoading(true);
            //setError(null);
            try {
                const result = await fetchYieldData(API_BASE, startDate, endDate);
                setRawData(result);
                //console.log(result);
            } catch (err) {
                if (!cancelled) {
                    //setError(err);
                }
            } finally {
                if (!cancelled) {
                    //setLoading(false);
                }
            }
        }
        
        loadData();
        
        return () => {
            cancelled = true;
        };
    }, [startDate, endDate]);

    useEffect(()=>{
        //console.log('raw data');
        //console.log(rawData);
        // set filters
        if (!Array.isArray(rawData) || rawData.length === 0) return;

        const models = [...new Set(rawData.map(r => r.model).filter(Boolean))].sort();
        const partNumbers = [...new Set(
            rawData
                .filter(r => !filters.selected.model.length || filters.selected.model.includes(r.model))
                .map(r => r.pn)
                .filter(Boolean)
        )].sort();

        setFilters(prev => ({
            ...prev,
            available: {
                ...prev.available,
                models,
                partNumbers
            }
        }));
    },[rawData,filters.selected.model])

    useEffect(() => {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            setFilteredData([]);
            return;
        }

        const { model, partNumber } = filters.selected;
        const importSnSet = new Set(importSns.map(normalizeSN));

        const result = rawData.filter(r => {
            const matchesModel = !model.length || model.includes(r.model);
            const matchesPart  = !partNumber.length || partNumber.includes(r.pn);
            const matchSN = importSnSet.size === 0 || importSnSet.has(normalizeSN(r.sn));
            return matchesModel && matchesPart && matchSN;
        });

        setFilteredData(result);
    }, [rawData, filters, importSns]);

    useEffect(() => {
        if (!Array.isArray(filteredData) || filteredData.length === 0) {
            setChartData([]);
            return;
        }

        // Group rows by week_of
        const grouped = filteredData.reduce((acc, row) => {
            const week = row.week_of;
            if (!acc[week]) {
                acc[week] = { vi1: 0, receive: 0, fla: 0, assy2: 0, fqc_pass: 0, fqc: 0, repair_input: 0, repair_output: 0, repair_scrap: 0, fqc_fail: 0, vi_pass: 0, vi_fail: 0, fla_pass: 0, fla_fail: 0 };
            }
            acc[week].vi1           += Number(row.vi1)               || 0;
            acc[week].receive       += Number(row.receive)           || 0;
            acc[week].fla           += Number(row.fla)               || 0;
            acc[week].assy2         += Number(row.assy2)             || 0;
            acc[week].fqc_pass      += Number(row.fqc_pass)          || 0;
            acc[week].fqc_fail      += Number(row.fqc_fail)          || 0;
            acc[week].fqc           += Number(row.fqc)               || 0;
            acc[week].repair_input  += Number(row.repair_input)      || 0;
            acc[week].repair_output += Number(row.repair_output)     || 0;
            acc[week].repair_scrap  += Number(row.repair_scrap)      || 0;
            acc[week].vi_pass       += Number(row.vi_pass)           || 0;
            acc[week].vi_fail       += Number(row.vi_fail)           || 0;
            acc[week].fla_pass      += Number(row.fla_pass)          || 0;
            acc[week].fla_fail      += Number(row.fla_fail)          || 0;
            return acc;
        }, {});

        // Transform into chart rows, sorted chronologically
        const transformed = Object.entries(grouped)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([week, totals]) => ({
            date: week,
            iqc:  totals.receive > 0 
                ? Math.min(Number(((totals.vi1 / totals.receive) * 100).toFixed(2)),100) : null,
            post: totals.fla > 0 
                ? Math.min(Number(((totals.assy2 / totals.fla) * 100).toFixed(2)),100) : null,
            fqc:  totals.fqc > 0 
                ? Math.min(Number(((totals.fqc_pass / totals.fqc) * 100).toFixed(2)),100) : null,
            apy:  totals.repair_input > 0
                ? Math.min(Number(((totals.repair_output / totals.repair_input) * 100).toFixed(2)),100): null,

            repair_input: totals.repair_input,
            repair_output: totals.repair_output,
            repair_failed: totals.repair_input - (totals.repair_output + totals.repair_scrap),
            repair_scrap: totals.repair_scrap,

            fqc_pass: totals.fqc_pass,
            fqc_fail: totals.fqc_fail,

            vi_pass: totals.vi_pass,
            vi_fail: totals.vi_fail,

            fla_pass: totals.fla_pass,
            fla_fail: totals.fla_fail,
        }));

        setChartData(transformed);
    }, [filteredData]);

    // Prepare data for LineChart
    const fpyData = useMemo(() => {
        if (!Array.isArray(chartData)) return [];
        return chartData.filter(r => r.date && (r.iqc !== null || r.post !== null || r.fqc !== null || r.apy !== null));
    }, [chartData]);

    const apyData = useMemo(()=>{
        if (!Array.isArray(chartData)) return [];
        return chartData.filter(r => r.date && (r.repair_input >0 || r.repair_output >0 || r.repair_scrap >0 || r.apy !==null));
    },[chartData]);
    
    const fqcData = useMemo(() => {
        if (!Array.isArray(chartData)) return [];
        return chartData.filter(r => r.date && (r.fqc_pass >0 || r.fqc_fail >0));
    }, [chartData]);
    
    const viData = useMemo(() => {
        if (!Array.isArray(chartData)) return [];
        return chartData.filter(r => r.date && (r.vi_pass >0 || r.vi_fail >0));
    }, [chartData]);
    
    const flaData = useMemo(() => {
        if (!Array.isArray(chartData)) return [];
        return chartData.filter(r => r.date && (r.fla_pass >0 || r.fla_fail >0));
    }, [chartData]);

    // Define xKey and yKeys for LineChart and combined chart
    const yKeys = [
        {dataKey:'iqc', name:'IQC (vi1)', stroke: theme.palette.success.main},           // IQC
        {dataKey:'post', name:'Post Test', stroke: theme.palette.info.main},
        {dataKey:'fqc', name:'FQC', stroke: theme.palette.warning.main},           // FQC
        {dataKey:'apy', name:'LPY', stroke: theme.palette.error.main},             // REPAIR
        //{dataKey:'healthKPI', name:'Health KPI', stroke: theme.palette.warning.main, strokeDasharray: '3 4'},
    ];

    const repairYKey=[
        {dataKey:'apy', name:'LPY Yield %', stroke: theme.palette.error.main},
    ];
    const repairBKey=[
        {dataKey:'repair_input',name:'Input',fill: theme.palette.success.light},
        {dataKey:'repair_output',name:'Passed',fill: theme.palette.info.light},
        //{dataKey:'repair_failed',name:'Failed',fill: theme.palette.error.light},
        {dataKey:'repair_scrap',name:'Scrapped',fill: theme.palette.warning.light},
    ];

    const fqcYKey=[
        {dataKey:'fqc', name:'FQC Yield %', stroke: theme.palette.warning.main},
    ];
    const fqcBKey=[
        {dataKey:'fqc_pass',name:'Passed',fill: theme.palette.info.light},
        {dataKey:'fqc_fail',name:'Failed',fill: theme.palette.warning.light},
    ];

    const viYKey=[
        {dataKey:'iqc', name:'IQC Yield %', stroke: theme.palette.success.main},
    ];
    const viBKey=[
        {dataKey:'vi_pass',name:'Passed',fill: theme.palette.info.light},
        {dataKey:'vi_fail',name:'Failed',fill: theme.palette.warning.light},
    ];

    const flaYKey=[
        {dataKey:'post', name:'Post Test Yield %', stroke: theme.palette.info.main},
    ];
    const flaBKey=[
        {dataKey:'fla_pass',name:'Passed',fill: theme.palette.info.light},
        {dataKey:'fla_fail',name:'Failed',fill: theme.palette.warning.light},
    ];

    // Filter Logic here model, pn, sn

    return (
        <Container maxWidth="xl">
            <Box>
                <Header
                title="Yield Report"
                subTitle={`Weekly yield analysis`}
                />
                
                <Box sx={toolbarStyle} >
                    <DateRange
                        startDate={startDate}
                        setStartDate={setStartDate}
                        normalizeStart={normalizeDate.start}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        normalizeEnd={normalizeDate.end}
                        inline = {true}
                    />
                    <FormControl size="small" sx={{minWidth:200}}>
                        <InputLabel>Model</InputLabel>
                        <Select multiple
                            label="Model"
                            value={filters.selected.model}
                            onChange={(e) => handleFilterChange('model',e.target.value)}
                            renderValue={(selected) => selected.join(', ')}
                        >
                            {filters.available.models.map(m => (
                                <MenuItem key={m} value={m}>
                                    <Checkbox checked={filters.selected.model.includes(m)} />
                                    <ListItemText primary={m}/>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{minWidth:200}}>
                        <InputLabel>Part Number</InputLabel>
                        <Select multiple
                            label="Part Number"
                            value={filters.selected.partNumber}
                            onChange={(e) => handleFilterChange('partNumber',e.target.value)}
                            renderValue={(selected) => selected.join(', ')}
                        >
                            {filters.available.partNumbers.map(m => (
                                <MenuItem key={m} value={m}>
                                    <Checkbox checked={filters.selected.partNumber.includes(m)} />
                                    <ListItemText primary={m}/>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant='contained'
                        onClick={handleImportClick}
                    >
                        Import
                    </Button>
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='.csv,text/csv'
                        hidden
                        onChange={handleCsvImport}
                    />
                    {importSns.length > 0 && (
                        <Typography variant='body2' sx={{ml:1}}>{importSns.length} SNs</Typography>
                    )}
                </Box>
            </Box>

            <Box >
                <Grid size={5}>
                    <LineChart 
                        label="Weekly Yield Overview"
                        data={fpyData} 
                        xKey={'date'}
                        yKeys={yKeys}
                        lineStyle={'monotone'}
                    />
                    <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 500, minWidth: 120 }}>Metric</TableCell>
                                    {fpyData.map(r => (
                                        <TableCell key={r.date} align="right" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            {r.date}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[
                                    { key: 'iqc',  label: 'IQC (VI1)' },
                                    { key: 'post', label: 'Post Test' },
                                    { key: 'fqc',  label: 'FQC' },
                                    { key: 'apy',  label: 'LPY' },
                                ].map(({ key, label }) => (
                                    <TableRow key={key} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                                        {fpyData.map(r => (
                                            <TableCell key={r.date} align="right">
                                                {r[key] != null ? `${r[key]}%` : '—'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <CombinedChart 
                        label="IQC Weekly Overview"
                        data={viData} 
                        xKey={'date'}
                        lineKeys={viYKey}
                        barKeys={viBKey}
                        lineStyle={'monotone'}
                        barGroup={false}
                        rightAxisKeys = {['iqc']}
                        setRange={false}
                        setRightRange={true}
                        rightAxisLabel = 'Percent'
                    />
                    <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 500, minWidth: 120 }}>Metric</TableCell>
                                    {viData.map(r => (
                                        <TableCell key={r.date} align="right" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            {r.date}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[
                                    { key: 'vi_pass',  label: 'Pass' },
                                    { key: 'vi_fail', label: 'Failed' },
                                ].map(({ key, label }) => (
                                    <TableRow key={key} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                                        {viData.map(r => (
                                            <TableCell key={r.date} align="right">
                                                {r[key] != null ? `${r[key]}` : '—'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <CombinedChart 
                        label="Post Test Weekly Overview"
                        data={flaData} 
                        xKey={'date'}
                        lineKeys={flaYKey}
                        barKeys={flaBKey}
                        lineStyle={'monotone'}
                        barGroup={false}
                        rightAxisKeys = {['post']}
                        setRange={false}
                        setRightRange={true}
                        rightAxisLabel = 'Percent'
                    />
                    <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 500, minWidth: 120 }}>Metric</TableCell>
                                    {flaData.map(r => (
                                        <TableCell key={r.date} align="right" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            {r.date}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[
                                    { key: 'fla_pass',  label: 'Passed' },
                                    { key: 'fla_fail', label: 'Failed' },
                                ].map(({ key, label }) => (
                                    <TableRow key={key} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                                        {flaData.map(r => (
                                            <TableCell key={r.date} align="right">
                                                {r[key] != null ? `${r[key]}` : '—'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <CombinedChart 
                        label="FQC Weekly Overview"
                        data={fqcData} 
                        xKey={'date'}
                        lineKeys={fqcYKey}
                        barKeys={fqcBKey}
                        lineStyle={'monotone'}
                        barGroup={false}
                        rightAxisKeys = {['fqc']}
                        setRange={false}
                        setRightRange={true}
                        rightAxisLabel = 'Percent'
                    />
                    <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 500, minWidth: 120 }}>Metric</TableCell>
                                    {fqcData.map(r => (
                                        <TableCell key={r.date} align="right" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            {r.date}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[
                                    { key: 'fqc_pass',  label: 'Passed' },
                                    { key: 'fqc_fail', label: 'Failed' },
                                ].map(({ key, label }) => (
                                    <TableRow key={key} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                                        {fqcData.map(r => (
                                            <TableCell key={r.date} align="right">
                                                {r[key] != null ? `${r[key]}` : '—'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <CombinedChart 
                        label="LPY Weekly Overview"
                        data={apyData} 
                        xKey={'date'}
                        lineKeys={repairYKey}
                        barKeys={repairBKey}
                        lineStyle={'monotone'}
                        barGroup={true}
                        rightAxisKeys = {['apy']}
                        setRange={false}
                        setRightRange={true}
                        rightAxisLabel = 'Percent'
                    />
                    <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 500, minWidth: 120 }}>Metric</TableCell>
                                    {apyData.map(r => (
                                        <TableCell key={r.date} align="right" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            {r.date}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[
                                    { key: 'repair_input',  label: 'Repair Input' },
                                    { key: 'repair_output', label: 'Repair Output' },
                                    { key: 'repair_scrap',  label: 'Scrapped' },
                                ].map(({ key, label }) => (
                                    <TableRow key={key} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                                        {apyData.map(r => (
                                            <TableCell key={r.date} align="right">
                                                {r[key] != null ? `${r[key]}` : '—'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Box>

           
        </Container>
    );
};

export default FirstPassPage;
