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
// Page Components
import { Dashboard } from './components/pages/Dashboard';
import Home from './components/pages/Home';
// Quality Pages
import PackingPage from './components/pages/quality/PackingPage';
import PerformancePage from './components/pages/quality/performance/PerformancePage';
import TestStationPerformancePage from './components/pages/quality/TestStationPerformancePage';
import ThroughputPage from './components/pages/quality/performance/ThroughputPage';
import SNFNPage from './components/pages/quality/stationReports/SNFNPage';
import PackingCharts from './components/pages/quality/PackingCharts';
import StationHourlySummaryPage from './components/pages/quality/stationReports/StationHourlySummaryPage';
import ParetoPage from './components/pages/quality/ParetoPage';
import QueryPage from './components/pages/quality/QueryPage';
import XbarRPage from './components/pages/quality/performance/XbarRPage';
// Test Engineer Pages
import FixtureDash from './components/pages/te/FixtureDash';
import FixtureDetails from './components/pages/te/FixtureDetails';
import FixtureInventory from './components/pages/te/FixtureInventory';
import FixtureMaintenance from './components/pages/te/FixtureMaintenance';
import FixturesPage from "./components/pages/te/FixturesPage";
import HealthPage from './components/pages/te/HealthPage';
import UsagePage from './components/pages/te/usagePage'; 
import TestboardPage from "./components/pages/te/testboardPage";

// Dev Pages
import UploadPage from './components/pages/dev/uploadPage';
import StationCycleTime from './components/pages/dev/CycleTime';
import MostRecentFail from './components/pages/dev/MostRecentFail';
import ByErrorCode from './components/pages/dev/ByErrorCode';
import JsonToCsv from './components/pages/dev/JsonToCSV';
import DidTheyFail from './components/pages/dev/DidTheyFail';
import { SimplePerformanceMonitor } from './components/debug/SimplePerformanceMonitor';
import { isLowEndDevice, LightweightBackdrop } from './utils/muiOptimizations';
import './components/theme/theme.css';
import { GlobalSettingsProvider } from './data/GlobalSettingsContext';

//Main content component
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
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/dashboard" element={<Dashboard />} /> 
    {/* Quality */}
    <Route path="/packing" element={<PackingPage />} />
    <Route path="/performance" element={<PerformancePage />} />
    <Route path="/throughput" element={<ThroughputPage />} />
    <Route path="/snfn" element={<SNFNPage />} />
    <Route path="/packing-charts" element={<PackingCharts />} />
    <Route path="/station-hourly-summary" element={<StationHourlySummaryPage />} />
    <Route path="/pareto" element={<ParetoPage />} />
    <Route path="/station-performance" element={<TestStationPerformancePage/>}/>
    <Route path="/query-page" element={<QueryPage/>}/>
    <Route path="/xbar-r-chart" element={<XbarRPage/>}/>
    {/* TE */}
    <Route path="/fixture-dash" element={<FixtureDash/>}/>
    <Route path="/fixture-details" element={<FixtureDetails/>}/>
    <Route path="/fixture-inventory" element={<FixtureInventory/>}/>
    <Route path="/fixtures" element={<FixturesPage />} />
    <Route path="/fixture-maintenance" element={<FixtureMaintenance />} />
    <Route path="/health" element={<HealthPage />} />
    <Route path="/usage" element={<UsagePage />} />
    {/* DEV */}
    <Route path="/cycle-time" element={<StationCycleTime />} />
    <Route path="/most-recent-fail" element={<MostRecentFail />} />
    <Route path="/by-error" element={<ByErrorCode/>}/>
    <Route path="/json-to-csv" element={<JsonToCsv/>}/>
    <Route path="/did-they-fail" element={<DidTheyFail/>}/>
    <Route path="/testboard" element={<TestboardPage />} />

    {process.env.NODE_ENV === 'development' && (
      <Route path="/dev/upload" element={<UploadPage />} />
    )}
  </Routes>
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
    <GlobalSettingsProvider>
      <DashboardThemeProvider>
        <CssBaseline />
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
      </DashboardThemeProvider>
    </GlobalSettingsProvider>
  );
}

export default App;