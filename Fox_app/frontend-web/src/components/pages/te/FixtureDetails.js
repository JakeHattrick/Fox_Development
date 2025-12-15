import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Container, Divider, FormControl, InputLabel, MenuItem, Select, Typography, Alert, Stack, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab, IconButton
} from '@mui/material';
import { DateRange } from '../../pagecomp/DateRange.jsx';
import { useNavigate } from 'react-router-dom';
import PChart from '../../charts/PChart.js';
import { Header } from '../../pagecomp/Header.jsx';
import {LineChart} from '../../charts/LineChart.js';
import { PieChart } from '../../charts/PieChart.js';
import { testFixtureData,testFixtureStatusData, testFixtureAvailabilityData,testFixtureUsageData,testFixtureFailureData } from '../../../data/sampleData.js';
import { headerStyle, dataTextStyle } from '../../theme/themes.js';
import SquareIcon from '@mui/icons-material/Square';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import FolderIcon from '@mui/icons-material/Folder';
import ArticleIcon from '@mui/icons-material/Article';

const iconStyle = { fontSize: '20px' };

const FixtureDetails = () => {

    const availability = 99;
    const usage = 75;
    const failureRate = 2.5;
    const slot = 0

    const tableData = testFixtureStatusData;

    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    
    const handleOnClick0 = () => {};
    const handleOnClick1 = () => {};
    const handleOnClick2 = () => {};
    const handleOnClick3 = () => {};

    return (
        <Container maxWidth="xl">
            <Box>
                <Header
                title="Fixture Station Details"
                subTitle={`Detail Reports for Monitoring Fixture Stations`}
                />
            </Box>


            <Grid container spacing={4}>
                <Grid size={1.5}>
                <Card>
                    <CardHeader title="Current Health" />
                    <CardContent>
                        <Typography variant="h4" component="div" color={availability > 90 ? 'green' : availability > 75 ? 'orange' : 'red'}>
                            {availability}%
                        </Typography>
                    </CardContent>
                </Card>
                </Grid>
                <Grid size={1.5}>
                <Card>
                    <CardHeader title="Current Usage" />
                    <CardContent>
                        <Typography variant="h4" component="div" color={usage > 90 ? 'red' : usage > 75 ? 'orange' : 'green'}>
                            {usage}%
                        </Typography>
                    </CardContent>
                </Card>
                </Grid>
                <Grid size={1.5}>
                <Card>
                    <CardHeader title="Failure Rate" />
                    <CardContent>
                        <Typography variant="h4" component="div" color={failureRate > 90 ? 'red' : failureRate > 75 ? 'orange' : 'green'}>
                            {failureRate}%
                        </Typography>
                    </CardContent>
                </Card>
                </Grid>
                <Grid size={7.5}>
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Fixture_Name</TableCell>
                                <TableCell align="right">Rack</TableCell>
                                <TableCell align="right">Fixture_SN</TableCell>
                                <TableCell align="right">Current_Status</TableCell>
                                <TableCell align="right">Last_Heartbeat_Time</TableCell>
                                <TableCell align="right">Test_Type</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow
                            key={testFixtureStatusData[slot].name}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                            <TableCell component="th" scope="row">
                                {testFixtureStatusData[slot].name}
                            </TableCell>
                            <TableCell align="right">{testFixtureStatusData[slot].rack}</TableCell>
                            <TableCell align="right">{testFixtureStatusData[slot].sn}</TableCell>
                            <TableCell align="right">{testFixtureStatusData[slot].status}</TableCell>
                            <TableCell align="right">{testFixtureStatusData[slot].lastBeat}</TableCell>
                            <TableCell align="right">{testFixtureStatusData[slot].type}</TableCell>
                            <TableCell align="right">placeholder</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
                </Grid>
            </Grid>
            <Tabs value={value} onChange={handleChange} centered>
                <Tab label="Availability" />
                <Tab label="Usage" />
                <Tab label="Failure Rate" />
            </Tabs>
            {value === 0 && <Box p={3}>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={headerStyle}>Date</TableCell>
                            <TableCell align="center" sx={headerStyle}>Fixture ID</TableCell>
                            <TableCell align="center" sx={headerStyle}>Event Type</TableCell>
                            <TableCell align="center" sx={headerStyle}>Outage Time</TableCell>
                            <TableCell align="center" sx={headerStyle}>Comments</TableCell>
                            <TableCell align="center" sx={headerStyle}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                    {testFixtureAvailabilityData.map((row,idx) => (
                        <TableRow key={idx}>
                        <TableCell component="th" scope="row">{row.date}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.id}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.eventType}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.outTime}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.comments}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>
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
            </Box>}
            {value === 1 && <Box p={3}>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={headerStyle}>Date</TableCell>
                            <TableCell align="center" sx={headerStyle}>Fixture ID</TableCell>
                            <TableCell align="center" sx={headerStyle}>Test Type</TableCell>
                            <TableCell align="center" sx={headerStyle}>Usage</TableCell>
                            <TableCell align="center" sx={headerStyle}>Alarm</TableCell>
                            <TableCell align="center" sx={headerStyle}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                    {testFixtureUsageData.map((row,idx) => (
                        <TableRow key={idx}>
                        <TableCell component="th" scope="row">{row.date}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.id}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.testType}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.usage}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.alarm}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>
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
            </Box>}
            {value === 2 && <Box p={3}>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={headerStyle}>Date</TableCell>
                            <TableCell align="center" sx={headerStyle}>Fixture ID</TableCell>
                            <TableCell align="center" sx={headerStyle}>Test Type</TableCell>
                            <TableCell align="center" sx={headerStyle}>Top Error</TableCell>
                            <TableCell align="center" sx={headerStyle}>Count</TableCell>
                            <TableCell align="center" sx={headerStyle}>Failure Rate</TableCell>
                            <TableCell align="center" sx={headerStyle}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                    {testFixtureFailureData.map((row,idx) => (
                        <TableRow key={idx}>
                        <TableCell component="th" scope="row">{row.date}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.id}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.testType}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.topError}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.count}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>{row.rate}</TableCell>
                        <TableCell align="center" sx={dataTextStyle}>
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
            </Box>}
           
        </Container>
    );
};

export default FixtureDetails;
