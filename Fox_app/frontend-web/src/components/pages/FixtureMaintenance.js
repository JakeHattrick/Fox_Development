// ============================================================================
// File: FixtureMaintenance.js
//
// PURPOSE:
//   Frontend page for managing Fixture Maintenance tickets.
//   - Top MRT table lists all fixtures
//   - Top form allows creating tickets directly
//   - Each fixture has a "Create Ticket" button that opens a right-side drawer
//   - Submitting either form creates entry in fixture_maintenance table only
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Drawer,
} from '@mui/material';
import { Header } from '../pagecomp/Header.jsx';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import {
  getFixtures,
  getAllMaintenance,
  createMaintenance,
} from '../../services/api';

const FixtureMaintenance = () => {
  // ------------------------------
  // STATE
  // ------------------------------
  const [fixturesData, setFixturesData] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null); // top form selection

  // Top form fields
  const [dateTimeStartValue, setDateTimeStartValue] = useState(dayjs());
  const [dateTimeEndValue, setDateTimeEndValue] = useState(dayjs());
  const [eventType, setEventType] = useState('Scheduled Maintenance');
  const [occurrence, setOccurrence] = useState('Monthly');
  const [comments, setComments] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFixture, setDrawerFixture] = useState(null);

  // Drawer form fields
  const [drawerStart, setDrawerStart] = useState(dayjs());
  const [drawerEnd, setDrawerEnd] = useState(dayjs());
  const [drawerEventType, setDrawerEventType] = useState('Scheduled Maintenance');
  const [drawerOccurrence, setDrawerOccurrence] = useState('Monthly');
  const [drawerComments, setDrawerComments] = useState('');

  // ------------------------------
  // Fetch data
  // ------------------------------
  useEffect(() => {
    fetchFixtures();
    fetchMaintenance();
  }, []);

  const fetchFixtures = async () => {
    try {
      const response = await getFixtures();
      setFixturesData(response.data);
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const response = await getAllMaintenance();
      setMaintenanceData(response.data);
    } catch (error) {
      console.error('Error fetching maintenance:', error);
    }
  };

  // ------------------------------
  // Top form handlers
  // ------------------------------
  const handleSelectFixture = (fixture) => {
    setSelectedFixture(fixture);
    setDateTimeStartValue(dayjs());
    setDateTimeEndValue(dayjs());
    setEventType('Scheduled Maintenance');
    setOccurrence('Monthly');
    setComments('');
  };

  const handleCreate = async () => {
    if (!selectedFixture) {
      alert("Please select a fixture first!");
      return;
    }

    const newEvent = {
      fixture_id: selectedFixture.id,
      start_date: dateTimeStartValue.toISOString(),
      end_date: dateTimeEndValue.toISOString(),
      event_type: eventType,
      occurrence: occurrence,
      comments: comments,
    };

    try {
      await createMaintenance(newEvent);
      fetchMaintenance();
      alert(`Maintenance ticket created for fixture ${selectedFixture.fixture_name}`);
      // Reset top form fields
      setSelectedFixture(null);
      setEventType('Scheduled Maintenance');
      setOccurrence('Monthly');
      setComments('');
      setDateTimeStartValue(dayjs());
      setDateTimeEndValue(dayjs());
    } catch (err) {
      console.error('Error creating maintenance:', err);
    }
  };

  // ------------------------------
  // Drawer Handlers
  // ------------------------------
  const openDrawerForFixture = (fixture) => {
    setDrawerFixture(fixture);
    setDrawerStart(dayjs());
    setDrawerEnd(dayjs());
    setDrawerEventType('Scheduled Maintenance');
    setDrawerOccurrence('Monthly');
    setDrawerComments('');
    setDrawerOpen(true);
  };

  const handleDrawerCreate = async () => {
    if (!drawerFixture) return;

    const newEvent = {
      fixture_id: drawerFixture.id,
      start_date: drawerStart.toISOString(),
      end_date: drawerEnd.toISOString(),
      event_type: drawerEventType,
      occurrence: drawerOccurrence,
      comments: drawerComments,
    };

    try {
      await createMaintenance(newEvent);
      fetchMaintenance();
      alert(`Maintenance ticket created for ${drawerFixture.fixture_name}`);
      setDrawerOpen(false);
    } catch (err) {
      console.error('Error creating maintenance:', err);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  // ------------------------------
  // MRT Columns
  // ------------------------------
  const fixtureColumns = useMemo(() => [
    { accessorKey: 'fixture_name', header: 'Fixture Name' },
    { accessorKey: 'rack', header: 'Rack' },
    { accessorKey: 'tester_type', header: 'Tester Type' },
    {
      id: 'create_ticket',
      header: 'Create Ticket',
      Cell: ({ row }) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => openDrawerForFixture(row.original)}
        >
          Create Ticket
        </Button>
      )
    }
  ], []);

  const fixtureTable = useMaterialReactTable({
    columns: fixtureColumns,
    data: fixturesData,
    enableRowSelection: false,
    getRowId: (row) => row.id,
  });

  // ------------------------------
  // Dropdown options
  // ------------------------------
  const fixtureEventTypes = [
    { value: 'Scheduled Maintenance', label: 'Scheduled Maintenance' },
    { value: 'Emergency Maintenance', label: 'Emergency Maintenance' },
    { value: 'Unknown Outage', label: 'Unknown Outage' },
  ];

  const fixtureEventOccurrence = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Yearly', label: 'Yearly' },
  ];

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box>
          <Header
            title="Fixture Maintenance"
            subTitle="Create and manage maintenance tickets for fixtures"
          />
        </Box>

        {/* =========================
              Top Form (manager's original)
        ========================= */}
        {selectedFixture && (
          <Box mb={2}>
            <Typography variant="subtitle1" fontWeight="bold">
              Creating Ticket for: {selectedFixture.fixture_name} - {selectedFixture.rack}
            </Typography>
          </Box>
        )}

        <Box
          component="form"
          sx={{ '& .MuiTextField-root': { m: 1 } }}
          noValidate
          autoComplete="off"
        >
          <div>
            <TextField
              id="fixture-event-type"
              sx={{ m: 1, minWidth: '30ch' }}
              select
              label="Select Event Type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {fixtureEventTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div>
            <DateTimePicker
              label="Event Start Date & Time"
              sx={{ m: 1, minWidth: '30ch' }}
              value={dateTimeStartValue}
              onChange={(newValue) => setDateTimeStartValue(newValue)}
              disablePast
              minutesStep={15}
            />
            <DateTimePicker
              label="Event End Date & Time"
              sx={{ m: 1, minWidth: '30ch' }}
              value={dateTimeEndValue}
              onChange={(newValue) => setDateTimeEndValue(newValue)}
              disablePast
              minutesStep={15}
            />
            <TextField
              id="event-occurance"
              sx={{ minWidth: '30ch' }}
              select
              label="Select Occurrence"
              value={occurrence}
              onChange={(e) => setOccurrence(e.target.value)}
            >
              {fixtureEventOccurrence.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div>
            <TextField
              id="fixture-comments"
              multiline
              rows={4}
              sx={{ minWidth: '94ch' }}
              label="Add comments here"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          {/* Functional top form button */}
          <Grid>
            <Button variant="contained" sx={{ m: 1 }} onClick={handleCreate}>
              Create Ticket
            </Button>
          </Grid>
        </Box>

        {/* =========================
              Fixtures MRT Table
        ========================= */}
        <Box mt={4}>
          <MaterialReactTable table={fixtureTable} />
        </Box>

        {/* =========================
              Right-side Drawer for row-level ticket creation
        ========================= */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={handleDrawerClose}
          PaperProps={{ sx: { width: 450, padding: 2 } }}
        >
          {drawerFixture && (
            <>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Create Ticket for: {drawerFixture.fixture_name} - {drawerFixture.rack}
              </Typography>

              <TextField
                select
                label="Event Type"
                fullWidth
                sx={{ mb: 2 }}
                value={drawerEventType}
                onChange={(e) => setDrawerEventType(e.target.value)}
              >
                {fixtureEventTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>

              <DateTimePicker
                label="Start Date & Time"
                value={drawerStart}
                onChange={(newVal) => setDrawerStart(newVal)}
                disablePast
                minutesStep={15}
                sx={{ mb: 2 }}
              />
              <DateTimePicker
                label="End Date & Time"
                value={drawerEnd}
                onChange={(newVal) => setDrawerEnd(newVal)}
                disablePast
                minutesStep={15}
                sx={{ mb: 2 }}
              />

              <TextField
                select
                label="Occurrence"
                fullWidth
                sx={{ mb: 2 }}
                value={drawerOccurrence}
                onChange={(e) => setDrawerOccurrence(e.target.value)}
              >
                {fixtureEventOccurrence.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Comments"
                multiline
                rows={4}
                fullWidth
                sx={{ mb: 2 }}
                value={drawerComments}
                onChange={(e) => setDrawerComments(e.target.value)}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="outlined" onClick={handleDrawerClose}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleDrawerCreate}>
                  Create Ticket
                </Button>
              </Box>
            </>
          )}
        </Drawer>
      </Container>
    </LocalizationProvider>
  );
};

export default FixtureMaintenance;
