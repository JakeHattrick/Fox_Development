import { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Pagination } from '@mui/material';
import { useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import 'react-datepicker/dist/react-datepicker.css';

// Page components
import { Header } from '../../../pagecomp/Header.jsx';
import { SnFnDataTable } from '../../../pagecomp/snfn/SnFnDataTable.jsx';
import { SnfnModal } from '../../../pagecomp/snfn/SnfnModal.jsx';
import { SnFnToolbar } from '../../../pagecomp/snfn/SnFnToolbar.jsx';

// Hooks
import { useSnFnData } from '../../../hooks/snfn/useSnFnData.js';
import { useSnFnFilters } from '../../../hooks/snfn/useSnFnFilters.js';
import { useSnFnExport } from '../../../hooks/snfn/useSnFnExport.js';

// Utilities & Styles
import { processStationData } from '../../../../utils/snfn/snfnDataUtils.js';
import { normalizeDate,getInitialStartDate } from '../../../../utils/dateUtils.js';
import { modalStyle } from '../../../theme/themes.js';
import { useGlobalSettings } from '../../../../data/GlobalSettingsContext.js';

// Check for environment variable for API base
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const SnFnPage = () => {
  const location = useLocation();
  const { state, dispatch } = useGlobalSettings();

  // Date range state
  const [startDate, setStartDate] = useState(getInitialStartDate());
  const [endDate, setEndDate] = useState(normalizeDate.end(new Date()));
  const handleStartDateChange = useCallback((date) => {
    setStartDate(normalizeDate.start(date));
  }, []);
  const handleEndDateChange = useCallback((date) => {
    setEndDate(normalizeDate.end(date));
  }, []);

  // Modal and pagination state
  const [modalInfo, setModalInfo] = useState([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  // UI state
  const [itemsPerPage, setItemsPer] = useState(6);
  const [maxErrorCodes, setMaxErrors] = useState(5);
  const [sortAsc, setSortAsc] = useState(true);
  const [sortByCount, setByCount] = useState(false);
  const [groupByWorkstation, setGroupByWorkstation] = useState(false);

  // Data from API
  const {
    data: dataBase,
    allErrorCodes,
    allStations: allStationsCodes,
    allModels,
    allCodeDesc,
  } = useSnFnData(API_BASE, startDate, endDate, groupByWorkstation);

  // Filters
  const {
    stationFilter, errorCodeFilter, modelFilter,
    onStationChange, onSearchStations, onErrorCodeChange, onSearchErrorCodes,
    onSearchModels, onModelChange, filters
  } = useSnFnFilters(allStationsCodes, allErrorCodes, allModels, groupByWorkstation);

  // Menu anchors
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [exportAnchor, setExportAnchor] = useState(null);

  // Menu handlers
  const sortMenuOpen = useCallback(e => setSortAnchorEl(e.currentTarget), []);
  const sortMenuClose = useCallback(() => setSortAnchorEl(null), []);
  const openExport = useCallback(e => setExportAnchor(e.currentTarget), []);
  const closeExport = useCallback(() => setExportAnchor(null), []);

  // Toggle handlers
  const toggleGroup = useCallback(() => setGroupByWorkstation(x => !x), []);
  const toggleAsc = useCallback(() => setSortAsc(x => !x), []);
  const toggleByCount = useCallback(() => setByCount(x => !x), []);


  // Sort options for menu
  const sortOptions = useMemo(() => [
    {
      id: 'groupBy',
      handleClick: toggleGroup,
      label: groupByWorkstation ? 'Workstation' : 'Fixture',
    },
    {
      id: 'sortOrder',
      handleClick: toggleAsc,
      label: sortAsc ? 'Asc' : 'Dec',
    },
    {
      id: 'sortByCount',
      handleClick: toggleByCount,
      label: sortByCount ? 'Count' : 'Station',
    },
  ], [toggleGroup, groupByWorkstation, toggleAsc, sortAsc, toggleByCount, sortByCount]);

  // Modal handlers
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Row click handler for modal
  const getRowClick = (row) => {
    setModalInfo(row);
    handleOpen();
  };

  // Reset filters to default
  const clearFilters = () => {
    setStartDate(getInitialStartDate());
    setEndDate(normalizeDate.end(new Date()));
    onErrorCodeChange({ target: { value: ['__CLEAR__'] } });
    onStationChange({ target: { value: ['__CLEAR__'] } });
    onModelChange({ target: { value: ['__CLEAR__'] } });
    setPage(1);
  };

  // Reset station filter on group toggle
  useEffect(() => {
    onStationChange({ target: { value: ['__CLEAR__'] } });
  }, [groupByWorkstation]);

  // Handle navigation from chart
  useEffect(()=>{
    if(location.state?.autoFilled){
      if(location.state?.stationFilter) onStationChange({ target:{ value: location.state.stationFilter } });

      if(location.state?.errorCodeFilter) onErrorCodeChange({ target:{ value: location.state.errorCodeFilter } });

      setSortAsc(location.state?.sortAsc ?? sortAsc);
      setByCount(location.state?.sortByCount ?? sortByCount);

      handleStartDateChange(state.startDate)
      handleEndDateChange(state.endDate)
      window.history.replaceState({},document.title);
    }
  },[location.state]);

  // Pagination handler
  const handleChangePage = (event, value) => setPage(value);

  // Data processing
  const filteredData = useMemo(() => (
    processStationData(
      dataBase,
      stationFilter,
      modelFilter,
      errorCodeFilter,
      sortByCount,
      sortAsc
    )
  ), [dataBase, stationFilter, errorCodeFilter, modelFilter, sortAsc, sortByCount]);

  const paginatedData = useMemo(() => (
    filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  ), [filteredData, page, itemsPerPage]);

  // Export options
  const { exportOptions, exportCooldown } = useSnFnExport({
    paginatedData,
    groupByWorkstation,
    codeDescMap: useMemo(() => new Map(allCodeDesc), [allCodeDesc]),
    filteredData,
    closeExport
  });

  // Theme and style
  const theme = useTheme();
  const style = useMemo(() => ({
    border: 'solid',
    padding: '10px 8px',
    borderColor: theme.palette.divider,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light,
    fontSize: '14px',
    left: 0,
    zIndex: 5,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
  }), [theme]);

  const scrollThreshold = 5;

  // Render
  return (
    <Box p={1}>
      <Header
        title="SNFN Reports"
        subTitle="Real-time Error Code Tracking"
      />
      <SnFnToolbar
        itemsPerPage={itemsPerPage} setItemsPer={setItemsPer}
        maxErrorCodes={maxErrorCodes} setMaxErrors={setMaxErrors}
        sortMenuOpen={sortMenuOpen}
        sortMenuClose={sortMenuClose}
        openExport={openExport}
        closeExport={closeExport}
        clearFilters={clearFilters}
        exportCooldown={exportCooldown}
        exportAnchor={exportAnchor}
        exportOptions={exportOptions}
        sortAnchorEl={sortAnchorEl}
        sortOptions={sortOptions}
        startDate={startDate} endDate={endDate}
        setStartDate={handleStartDateChange} setEndDate={handleEndDateChange}
        normalizeStart={normalizeDate.start} normalizeEnd={normalizeDate.end}
        filters={filters}
      />
      <SnFnDataTable
        paginatedData={paginatedData}
        maxErrorCodes={maxErrorCodes}
        codeDescMap={useMemo(() => new Map(allCodeDesc), [allCodeDesc])}
        onRowClick={getRowClick}
        groupByWorkstation={groupByWorkstation}
        style={style}
      />
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={Math.ceil(filteredData.length / itemsPerPage)}
          page={page}
          onChange={handleChangePage}
          color="primary"
        />
      </Box>
      {open && (<SnfnModal
          open={open}
          onClose={handleClose}
          stationData={modalInfo[0]}
          codeData={modalInfo[1]}
          allCodeDesc={allCodeDesc}
          groupByWorkstation={groupByWorkstation}
          style={modalStyle}
          scrollThreshold={scrollThreshold}
        />
      )}
    </Box>
  );
};

export default SnFnPage;