// ============================================================================
// File: FixtureMaintenance.js
//
// PURPOSE:
//   Frontend page for managing Fixture Maintenance tickets.
//   - Tab 1: Fixture List (existing MRT table)
//   - Tab 2: Scheduled Maintenance (grouped by event_type, only fixtures with maintenance)
//   - Single and multi-select ticket creation supported
//   - Drawer ticket creation preserved
//   - CRUD (Edit/Delete/Close) implemented for Maintenance tickets
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
  Tabs,
  Tab,
} from '@mui/material';
import { Header } from '../../pagecomp/Header.jsx';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import {
  getFixtures,
  getAllMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from "../../../services/api";

const FixtureMaintenance = () => {
  // ------------------------------
  // STATE
  // ------------------------------
  const [fixturesData, setFixturesData] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [selectedRows, setSelectedRows] = useState({});

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
  const [drawerEditingTicket, setDrawerEditingTicket] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

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
  // Top Form - Single Fixture Create
  // ------------------------------
  const handleCreate = async () => {
    if (!selectedFixture) {
      alert("Please select a fixture first!");
      return;
    }

    const newEvent = {
      fixture_id: selectedFixture.id,
      event_type: eventType,
      start_date_time: dateTimeStartValue.toISOString(),
      end_date_time: dateTimeEndValue.toISOString(),
      occurance: occurrence,
      comments: comments,
      is_completed: false,
      creator: "current_user",
    };

    try {
      await createMaintenance(newEvent);
      fetchMaintenance();
      alert(`Maintenance ticket created for fixture ${selectedFixture.fixture_name}`);
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
  // Multi-Select Ticket Creation
  // ------------------------------
  const selectedFixturesArray = Object.keys(selectedRows).map(
    (id) => fixturesData.find((f) => f.id === id)
  );

  const handleCreateForSelected = async () => {
    if (selectedFixturesArray.length === 0) {
      alert("No fixtures selected.");
      return;
    }
    if (!window.confirm(`Create tickets for ${selectedFixturesArray.length} fixtures?`)) return;

    try {
      for (const fixture of selectedFixturesArray) {
        const payload = {
          fixture_id: fixture.id,
          event_type: eventType,
          start_date_time: dateTimeStartValue.toISOString(),
          end_date_time: dateTimeEndValue.toISOString(),
          occurance: occurrence,
          comments: comments,
          is_completed: false,
          creator: "current_user",
        };
        await createMaintenance(payload);
      }
      fetchMaintenance();
      alert(`Created ${selectedFixturesArray.length} maintenance tickets.`);
      setSelectedFixture(null);
      setSelectedRows({});
      setComments('');
      setDateTimeStartValue(dayjs());
      setDateTimeEndValue(dayjs());
    } catch (err) {
      console.error("Error creating multi-tickets:", err);
    }
  };

  // ------------------------------
  // Drawer Handlers (Create/Edit)
  // ------------------------------
  const openDrawerForFixture = (fixture) => {
    setDrawerFixture(fixture);
    setDrawerEditingTicket(null); // new ticket
    setDrawerStart(dayjs());
    setDrawerEnd(dayjs());
    setDrawerEventType('Scheduled Maintenance');
    setDrawerOccurrence('Monthly');
    setDrawerComments('');
    setDrawerOpen(true);
  };

  const openDrawerForEdit = (ticket) => {
    setDrawerEditingTicket(ticket); // editing existing
    setDrawerFixture({ fixture_name: ticket.fixture_name, id: ticket.fixture_id });
    setDrawerStart(dayjs(ticket.start_date_time));
    setDrawerEnd(dayjs(ticket.end_date_time));
    setDrawerEventType(ticket.event_type);
    setDrawerOccurrence(ticket.occurance);
    setDrawerComments(ticket.comments);
    setDrawerOpen(true);
  };

  const handleDrawerCreateOrUpdate = async () => {
    if (!drawerFixture) return;

    const payload = {
      fixture_id: drawerFixture.id,
      event_type: drawerEventType,
      start_date_time: drawerStart.toISOString(),
      end_date_time: drawerEnd.toISOString(),
      occurance: drawerOccurrence,
      comments: drawerComments,
      is_completed: drawerEditingTicket?.is_completed ?? false,
      creator: "current_user",
    };

    try {
      if (drawerEditingTicket) {
        await updateMaintenance(drawerEditingTicket.id, payload);
        alert(`Maintenance ticket updated for fixture ${drawerFixture.fixture_name}`);
      } else {
        await createMaintenance(payload);
        alert(`Maintenance ticket created for fixture ${drawerFixture.fixture_name}`);
      }
      fetchMaintenance();
      setDrawerOpen(false);
      setDrawerEditingTicket(null);
    } catch (err) {
      console.error('Error creating/updating maintenance:', err);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setDrawerEditingTicket(null);
  };

  // ------------------------------
  // Delete / Close Ticket
  // ------------------------------
  const handleDelete = async (ticket) => {
    if (!window.confirm(`Delete maintenance ticket for ${ticket.fixture_name}?`)) return;
    try {
      await deleteMaintenance(ticket.id);
      fetchMaintenance();
    } catch (err) {
      console.error('Error deleting ticket:', err);
    }
  };

  const handleCloseTicket = async (ticket) => {
    if (!window.confirm(`Mark ticket as completed for ${ticket.fixture_name}?`)) return;
    try {
      await updateMaintenance(ticket.id, { is_completed: true });
      fetchMaintenance();
    } catch (err) {
      console.error('Error closing ticket:', err);
    }
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
      ),
    },
  ], []);

  const maintenanceColumns = useMemo(() => [
    { accessorKey: 'fixture_name', header: 'Fixture Name' },
    { accessorKey: 'event_type', header: 'Event Type' },
    { accessorKey: 'occurance', header: 'Occurrence' },
    { 
      accessorKey: 'start_date_time', 
      header: 'Start Time',
      Cell: ({ cell }) => cell.getValue() ? dayjs(cell.getValue()).format('YYYY-MM-DD HH:mm') : '',
    },
    { 
      accessorKey: 'end_date_time', 
      header: 'End Time',
      Cell: ({ cell }) => cell.getValue() ? dayjs(cell.getValue()).format('YYYY-MM-DD HH:mm') : '',
    },
    { accessorKey: 'comments', header: 'Comments' },
    {
      id: 'actions',
      header: 'Actions',
      Cell: ({ row }) => {
        const ticket = row.original;
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => openDrawerForEdit(ticket)}>
              Edit
            </Button>
            <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(ticket)}>
              Delete
            </Button>
            {!ticket.is_completed && (
              <Button size="small" variant="contained" color="success" onClick={() => handleCloseTicket(ticket)}>
                Close
              </Button>
            )}
          </Box>
        );
      },
    },
  ], []);

  // ------------------------------
  // MRT Table Config
  // ------------------------------
  const fixtureTable = useMaterialReactTable({
    columns: fixtureColumns,
    data: fixturesData,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    state: { rowSelection: selectedRows },
    onRowSelectionChange: setSelectedRows,
  });

  const maintenanceTableData = useMemo(() => maintenanceData, [maintenanceData]);

  const maintenanceTable = useMaterialReactTable({
    columns: maintenanceColumns,
    data: maintenanceTableData,
    getRowId: (row) => row.id,
    enableGrouping: true,
    initialState: { grouping: ['event_type'] },
    enableSorting: true,
    enableColumnFilters: true,
  });

  // ------------------------------
  // Dropdown Options
  // ------------------------------
  const fixtureEventTypes = [
    { value: 'Scheduled Maintenance', label: 'Scheduled Maintenance' },
    { value: 'Emergency Maintenance', label: 'Emergency Maintenance' },
    { value: 'Unknown Outage', label: 'Unknown Outage' },
  ];

  const fixtureEventOccurrence = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Once', label: 'Once' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Yearly', label: 'Yearly' },
  ];

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Header
          title="Fixture Maintenance"
          subTitle="Create and manage maintenance tickets for fixtures"
        />

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
          >
            <Tab label="Fixture List" />
            <Tab label="Scheduled Maintenance" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {activeTab === 0 && (
          <>
            {selectedFixture && (
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                Creating Ticket for: {selectedFixture.fixture_name}
              </Typography>
            )}

            <Box component="form" sx={{ '& .MuiTextField-root': { m: 1 } }} noValidate>
              <div>
                <TextField
                  select
                  label="Select Event Type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  sx={{ minWidth: '30ch' }}
                >
                  {fixtureEventTypes.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </div>
              <div>
                <DateTimePicker
                  label="Event Start Date & Time"
                  value={dateTimeStartValue}
                  onChange={(newValue) => setDateTimeStartValue(newValue)}
                  disablePast
                  minutesStep={15}
                  sx={{ m: 1, minWidth: '30ch' }}
                />
                <DateTimePicker
                  label="Event End Date & Time"
                  value={dateTimeEndValue}
                  onChange={(newValue) => setDateTimeEndValue(newValue)}
                  disablePast
                  minutesStep={15}
                  sx={{ m: 1, minWidth: '30ch' }}
                />
                <TextField
                  select
                  label="Select Occurrence"
                  value={occurrence}
                  onChange={(e) => setOccurrence(e.target.value)}
                  sx={{ minWidth: '30ch' }}
                >
                  {fixtureEventOccurrence.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </div>
              <div>
                <TextField
                  multiline
                  rows={3}
                  label="Comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  sx={{ minWidth: '94ch' }}
                />
              </div>
              <Grid>
                <Button variant="contained" sx={{ m: 1 }} onClick={handleCreate}>
                  Create Ticket
                </Button>
                {selectedFixturesArray.length > 0 && (
                  <Button variant="outlined" sx={{ m: 1 }} onClick={handleCreateForSelected}>
                    Create Ticket for {selectedFixturesArray.length} Selected Fixtures
                  </Button>
                )}
              </Grid>
            </Box>

            <Box mt={4}>
              <MaterialReactTable table={fixtureTable} />
            </Box>
          </>
        )}

        {activeTab === 1 && (
          <Box mt={4}>
            <MaterialReactTable table={maintenanceTable} />
          </Box>
        )}

        {/* Drawer */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={handleDrawerClose}
          PaperProps={{ sx: { width: 450, p: 2 } }}
        >
          {drawerFixture && (
            <>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                {drawerEditingTicket ? 'Edit Ticket for:' : 'Create Ticket for:'} {drawerFixture.fixture_name}
              </Typography>
              <TextField
                select
                fullWidth
                label="Event Type"
                sx={{ mb: 2 }}
                value={drawerEventType}
                onChange={(e) => setDrawerEventType(e.target.value)}
              >
                {fixtureEventTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <DateTimePicker
                label="Start Date & Time"
                value={drawerStart}
                onChange={(newValue) => setDrawerStart(newValue)}
                disablePast
                minutesStep={15}
                sx={{ mb: 2 }}
              />
              <DateTimePicker
                label="End Date & Time"
                value={drawerEnd}
                onChange={(newValue) => setDrawerEnd(newValue)}
                disablePast
                minutesStep={15}
                sx={{ mb: 2 }}
              />
              <TextField
                select
                fullWidth
                label="Occurrence"
                sx={{ mb: 2 }}
                value={drawerOccurrence}
                onChange={(e) => setDrawerOccurrence(e.target.value)}
              >
                {fixtureEventOccurrence.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                multiline
                fullWidth
                rows={4}
                label="Comments"
                sx={{ mb: 2 }}
                value={drawerComments}
                onChange={(e) => setDrawerComments(e.target.value)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={handleDrawerClose}>Cancel</Button>
                <Button variant="contained" onClick={handleDrawerCreateOrUpdate}>
                  {drawerEditingTicket ? 'Update Ticket' : 'Create Ticket'}
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
