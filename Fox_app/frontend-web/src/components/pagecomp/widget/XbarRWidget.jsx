// Widget for X bar and R -Chart (XBR) Reports

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {  Box, Paper, Stack, FormControl, InputLabel, Select,
  MenuItem, Button, Alert, CircularProgress, Typography, TextField
} from '@mui/material';
// Page Components
import { Header } from '../../pagecomp/Header.jsx';
import { NumberRange } from '../../pagecomp/NumberRange.jsx';
// Style Guides
import { buttonStyle, paperStyle } from '../../theme/themes.js';
// Chart Component
import XbarRChart from '../../charts/XbarRChart';
// Global Settings
import { useGlobalSettings } from '../../../data/GlobalSettingsContext.js';

// ===== ENV / CONSTANTS =====
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
    console.error('REACT_APP_API_BASE not set. Please configure it in your .env');
}

export function XbarRWidget({ widgetId }) {
    // ===== Global Settings =====
    const { state, dispatch } = useGlobalSettings();
    const { startDate, endDate } = state || {};
    const [error, setError] = useState('');
    const [dataLoading, setDataLoading] = useState(true);

    if (!state) {
        return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Loading global state...</Box></Paper>;
    }
    if (!widgetId) {
        return <Paper sx={paperStyle}><Box sx={{ p: 2 }}>Widget ID missing</Box></Paper>;
    }
  
    // ===== Widget-scoped persisted settings =====
    const widgetSettings = (state.widgetSettings && state.widgetSettings[widgetId]) || {};
    const loaded       = widgetSettings.loaded || false;
    const selError = widgetSettings.errorCode || '';
    const selStation = widgetSettings.station || '';
    const selXMode = widgetSettings.xMode ?? true;

    const [data, setData] = useState([]);
    
    const handleQuery = async () => {
        //console.log(sampleNumber);
        try {
            setDataLoading(true);
            
            const response = await fetch(`${API_BASE}/api/v1/testboard-records/x-bar-r`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ec: selError,
                startDate,
                endDate,
                station: selStation,
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
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if( !loaded ) return;
        handleQuery();
    },[selError, selStation, startDate, endDate, loaded]);

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

    // bootstrap: ensure settings container exists
    useEffect(() => {
        if (!state.widgetSettings || !state.widgetSettings[widgetId]) {
        dispatch({ type: 'UPDATE_WIDGET_SETTINGS', widgetId, settings: {} });
        }
    }, [dispatch, state.widgetSettings, widgetId]);

    const updateWidgetSettings = (updates) => {
        dispatch({
        type: 'UPDATE_WIDGET_SETTINGS',
        widgetId,
        settings: { ...widgetSettings, ...updates }
        });
    };

    const handleLoadChart = () => updateWidgetSettings({ loaded: true });
    const handleToggleXMode = () => {updateWidgetSettings({ xMode: !selXMode })};

    // ===== Render =====
    if (!loaded) {
        return (
            <Paper sx={paperStyle}>
                <Box sx={{ p: 3 }}>
                    <Header
                        title="Select Filters for X Bar R -Chart"
                        subTitle={`Choose at least Error Code and Workstation`}
                        titleVariant="h6"
                        subTitleVariant="body2"
                        titleColor="text.secondary"
                    />

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    )}

                    <TextField
                        label = "Input Error Code"
                        value={selError}
                        onChange={(e) => updateWidgetSettings({ errorCode: e.target.value })}
                        size = 'small'/>
                    <TextField
                        label = "Input Station Name"
                        value={selStation}
                        onChange={(e) => updateWidgetSettings({ station: e.target.value })}
                        size = 'small'/>

                    <Button
                        label = "X Bar or R Chart"
                        onClick = {handleToggleXMode}
                        sx={buttonStyle}
                        size='small'
                    >
                        {selXMode ? "X Bar Chart" : "R Range Chart"}
                    </Button>

                    
                    <Box sx={{ mt: 3 }}>
                        <Button
                        sx={buttonStyle}
                        disabled={!selError || !selStation}
                        onClick={handleLoadChart}
                        >
                        Load Chart
                        </Button>
                    </Box>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper sx={paperStyle}>
            <Box sx={{ p: 2 }}>
                
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {dataLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 360 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <XbarRChart
                        title={selXMode ? "X Bar Chart" : "R Range Chart"}
                        subtitle={`Error Code: ${selError} | Station: ${selStation} | Sample Size: 6 | Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
                        data={structuredData}
                        subSize={6}
                        isX={selXMode}
                    />
                )}
            </Box>
        </Paper>
    );
}