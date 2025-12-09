// ============================================================================
// File: App.js
//
// PURPOSE:
//   Main application entry point. Integrates MUI theming, global settings,
//   header, side drawer navigation, and main page routing. 
//   - Maintains all existing routes for other teams.
// ============================================================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { DashboardThemeProvider } from './components/theme/ThemeContext';
import { SideDrawer } from './components/navigation/SideDrawer';
import { AppHeader } from './components/navigation/AppHeader';
import { Dashboard } from './components/dashboard/Dashboard';
import PackingPage from './components/pages/PackingPage';
import PerformancePage from './components/pages/PerformancePage';
import TestStationPerformancePage from './components/pages/TestStationPerformancePage';
import ThroughputPage from './components/pages/ThroughputPage';
import SNFNPage from './components/pages/SNFNPage';
import PackingCharts from './components/pages/PackingCharts';
import UploadPage from './components/pages/uploadPage';
import StationHourlySummaryPage from './components/pages/StationHourlySummaryPage';
import StationCycleTime from './components/pages/CycleTime';
import MostRecentFail from './components/pages/MostRecentFail';
import ParetoPage from './components/pages/ParetoPage';
import ByErrorCode from './components/pages/ByErrorCode';
import JsonToCsv from './components/pages/JsonToCSV';
import DidTheyFail from './components/pages/DidTheyFail';
import FixtureDash from './components/pages/FixtureDash';
import FixtureDetails from './components/pages/FixtureDetails';
import FixtureInventory from './components/pages/FixtureInventory';
import FixtureMaintenance from './components/pages/FixtureMaintenance';
import { SimplePerformanceMonitor } from './components/debug/SimplePerformanceMonitor';
import { isLowEndDevice, LightweightBackdrop } from './utils/muiOptimizations';
import './components/theme/theme.css';
import { GlobalSettingsProvider } from './data/GlobalSettingsContext';
import FixturesPage from "./components/pages/FixturesPage";
import FixtureMaintenance from './components/pages/FixtureMaintenance';
import HealthPage from './components/pages/healthPage';

<<<<<<< HEAD
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

=======
//Main content component
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
const MainContent = React.memo(({ children }) => {
  const mainContentStyle = useMemo(() => ({
    flexGrow: 1,
    p: 3,
    minHeight: '100vh',
    paddingTop: '64px',
    backgroundColor: 'background.default'
  }), []);

  return (
    <Box component="main" sx={mainContentStyle}>
      {children}
    </Box>
  );
});

//App Route components
const AppRoutes = React.memo(() => (
  <GlobalSettingsProvider>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/packing" element={<PackingPage />} />
      <Route path="/performance" element={<PerformancePage />} />
      <Route path="/throughput" element={<ThroughputPage />} />
      <Route path="/snfn" element={<SNFNPage />} />
      <Route path="/packing-charts" element={<PackingCharts />} />
      <Route path="/station-hourly-summary" element={<StationHourlySummaryPage />} />
      <Route path="/cycle-time" element={<StationCycleTime />} />
      <Route path="/most-recent-fail" element={<MostRecentFail />} />
      <Route path="/pareto" element={<ParetoPage />} />
      <Route path="/station-performance" element={<TestStationPerformancePage/>}/>
      <Route path="/by-error" element={<ByErrorCode/>}/>
      <Route path="/json-to-csv" element={<JsonToCsv/>}/>
      <Route path="/did-they-fail" element={<DidTheyFail/>}/>
      <Route path="/fixture-dash" element={<FixtureDash/>}/>
      <Route path="/fixture-details" element={<FixtureDetails/>}/>
      <Route path="/fixture-inventory" element={<FixtureInventory/>}/>
<<<<<<< HEAD
      <Route path="/fixture-maintenance" element={<FixtureMaintenance/>}/>
=======
      <Route path="/fixtures" element={<FixturesPage />} />
      <Route path="/fixture-maintenance" element={<FixtureMaintenance />} />
      <Route path="/health" element={<HealthPage />} />
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
      {process.env.NODE_ENV === 'development' && (
        <Route path="/dev/upload" element={<UploadPage />} />
      )}
    </Routes>
  </GlobalSettingsProvider>
));

//App component
function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    setIsLowEnd(isLowEndDevice());
  }, []);

  const handlersRef = useRef({
    toggleDrawer: () => setDrawerOpen(prev => !prev),
    closeDrawer: () => setDrawerOpen(false)
  });

  const backdrop = useMemo(() => {
    if (isLowEnd && drawerOpen) {
      return <LightweightBackdrop open={drawerOpen} onClose={handlersRef.current.closeDrawer} />;
    }
    return null;
  }, [drawerOpen, isLowEnd]);

  return (
    <DashboardThemeProvider>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ display: 'flex' }}>
          <AppHeader onMenuClick={handlersRef.current.toggleDrawer} />
          {backdrop}
          <SideDrawer 
            open={drawerOpen} 
            onClose={handlersRef.current.closeDrawer} 
          />
          <MainContent>
            <AppRoutes />
          </MainContent>
          <SimplePerformanceMonitor />
        </Box>
      </LocalizationProvider>
    </DashboardThemeProvider>
  );
}

export default App;
