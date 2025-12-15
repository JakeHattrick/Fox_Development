import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Container, Divider, FormControl, InputLabel, MenuItem, Select, Typography, Alert, Stack, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton
} from '@mui/material';
import {LineChart} from '../../charts/LineChart.js';
import { PieChart } from '../../charts/PieChart.js';
import { Header } from '../../pagecomp/Header.jsx';
import { testFixtureData,testFixtureStatusData } from '../../../data/sampleData.js';
import { headerStyle, dataTextStyle } from '../../theme/themes.js';
import { useTheme } from '@mui/material/styles';
import SquareIcon from '@mui/icons-material/Square';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import FolderIcon from '@mui/icons-material/Folder';
import ArticleIcon from '@mui/icons-material/Article';

const clampPct = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
};

const iconStyle = { fontSize: '20px' };

const FixtureDash = () => {
    const theme = useTheme();

    // Placeholder Data - replace with real data fetching logic
    const chartData = testFixtureData;
    const tableData = testFixtureStatusData;

    // Prepare data for LineChart and PieChart
    const lineData = useMemo(() => {
        if (!Array.isArray(chartData)) return [];
        // minimal sanitation + normalization
        return chartData
          .map((row) => ({
            date: row?.date ?? row?.name ?? '',
            health: clampPct(row?.health),
            usage: clampPct(row?.usage),
            healthKPI: clampPct(row?.healthKPI),
          }))
          .filter((r) => r.date && (r.health !== null || r.usage !== null || r.healthKPI !== null));
      }, [chartData]);

    const pieData = useMemo(() => {
        if (!Array.isArray(tableData)) return [];
        const counts = tableData.reduce((acc, item) => {
            const key = item.status || 'Unknown';
            console.log(key);
            if (['Maintenance'].includes(key)) return acc; // skip Maintenance
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([status, value]) => ({ status, value }));
    }, [tableData]);

    // Define xKey and yKeys for LineChart
    const xKey = 'date';
    const yKeys = [
        {dataKey:'health', name:'Health', stroke: theme.palette.success.main},
        {dataKey:'usage', name:'Usage', stroke: theme.palette.info.main},
        {dataKey:'healthKPI', name:'Health KPI', stroke: theme.palette.warning.main, strokeDasharray: '3 4'},
    ];

    // Placeholder current health and usage values
    const currentHealth = 99;
    const currentUsage = 75;

    // Handlers for action buttons - replace with real logic
    const handleOnClick0 = () => {};
    const handleOnClick1 = () => {};
    const handleOnClick2 = () => {};
    const handleOnClick3 = () => {};

    const getColorForStatus = (status) => {
        switch (status) {
            case 'Active':
                return theme.palette.success.main;
            case 'No Response':
            case 'Repair':
                return theme.palette.error.main;
            case 'Partial':
            case 'Maintenance':
                return theme.palette.warning.main;
            default:
                return 'gray';
        }
    };

    return (
        <Container maxWidth="xl">
            <Box>
                <Header
                title="Fixture Station Dashboard"
                subTitle={`Dashboard for Monitoring Fixture Stations`}
                />
            </Box>

            <Grid container spacing={3} >
                <Grid size={2}>
                    <Stack spacing={2} >
                        <Card>
                            <CardHeader title="Current Health" />
                            <CardContent>
                                <Typography align='center' variant="h4" component="div" color={currentHealth > 90 ? 'green' : currentHealth > 75 ? 'orange' : 'red' }>
                                    {currentHealth}%
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader title="Current Usage" />
                            <CardContent>
                                <Typography align='center' variant="h4" component="div" color={currentUsage > 90 ? 'red' : currentUsage > 75 ? 'orange' : 'green'}>
                                    {currentUsage}%
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent>
                                <Typography variant="body4" color="text.secondary">
                                    Placeholder for additional info or controls.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
                <Grid size={5}>
                    <LineChart 
                        label="Fixture Station Status Over Time"
                        data={lineData} 
                        xKey={xKey}
                        yKeys={yKeys}
                    />
                </Grid>
                <Grid size={5}>
                    <PieChart
                        label="Fixture Station Current Status"
                        data={pieData}
                    />
                </Grid>
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell align="center" sx={headerStyle}>Fixture Name</TableCell>
                                <TableCell align="center" sx={headerStyle}>Rack</TableCell>
                                <TableCell align="center" sx={headerStyle}>Fixture SN</TableCell>
                                <TableCell align="center" sx={headerStyle}>Current Status</TableCell>
                                <TableCell align="center" sx={headerStyle}>Last Heartbeat Time</TableCell>
                                <TableCell align="center" sx={headerStyle}>Test Type</TableCell>
                                <TableCell align="center" sx={headerStyle}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        {testFixtureStatusData.map((row) => (
                            <TableRow key={row.name}>
                                <TableCell component="th" scope="row">{row.name}</TableCell>
                                <TableCell align="center" sx={dataTextStyle}>{row.rack}</TableCell>
                                <TableCell align="center" sx={dataTextStyle}>{row.sn}</TableCell>
                                <TableCell align="center" sx={{...dataTextStyle,bgcolor:getColorForStatus(row.status)}}>{row.status}</TableCell>
                                <TableCell align="center" sx={dataTextStyle}>{row.lastBeat}</TableCell>
                                <TableCell align="center" sx={dataTextStyle}>{row.type}</TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOnClick0} >
                                        <SquareIcon sx={iconStyle} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleOnClick1} >
                                        <MarkunreadMailboxIcon sx={iconStyle} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleOnClick2} >
                                        <FolderIcon sx={iconStyle} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleOnClick3} >
                                        <ArticleIcon sx={iconStyle} />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>

           
        </Container>
    );
};

export default FixtureDash;
