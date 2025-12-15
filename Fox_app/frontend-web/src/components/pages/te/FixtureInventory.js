import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Container,
  Divider, FormControl, InputLabel, MenuItem,
  Select, Typography, Alert, Stack
} from '@mui/material';
import { DateRange } from '../../pagecomp/DateRange.jsx';
import { useNavigate } from 'react-router-dom';
import PChart from '../../charts/PChart.js';
import { Header } from '../../pagecomp/Header.jsx';
import { normalizeDate, getInitialStartDate } from '../../../utils/dateUtils.js';

const FixtureInventory = () => {


    return (
        <Container maxWidth="xl">
            <Box>
                <Header
                title="Fixture Station Inventory"
                subTitle={`Inventory Report for Fixture Stations`}
                />
            </Box>

            <Divider />

           
        </Container>
    );
};

export default FixtureInventory;
