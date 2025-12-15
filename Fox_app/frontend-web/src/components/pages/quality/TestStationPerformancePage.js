// React Core
import React, { useEffect, useState, useRef } from 'react';
// Material UI Components
import { Box} from '@mui/material';
// Third Party Libraries
import 'react-datepicker/dist/react-datepicker.css';
// Custom Charts
import { TestStationChart } from '../../charts/TestStationChart.js';
import { FixtureFailParetoChart } from '../../charts/FixtureFailParetoChart.js';
//import { ParetoChart } from '../charts/ParetoChart';
// Page Components
import { Header } from '../../pagecomp/Header.jsx';
import { DateRange } from '../../pagecomp/DateRange.jsx';
// Utilities and Helpers
import { dataCache } from '../../../utils/cacheUtils.js';
import { gridStyle } from '../../theme/themes.js';
import { fetchFixtureQuery, fetchWorkstationQuery } from '../../../utils/queryUtils.js';
import { ALL_MODELS } from '../../../data/dataTables.js';

const ReadOnlyInput = React.forwardRef((props, ref) => (
  <input {...props} ref={ref} readOnly />
));
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}
console.log('API_BASE:', API_BASE);

const refreshInterval = 300000; // 5 minutes

export const TestStationPerformancePage = () => {
  const [testStationDataSXM4, setTestStationDataSXM4] = useState([]);
  const [testStationDataSXM5, setTestStationDataSXM5] = useState([]);
  const [testStationDataSXM6, setTestStationDataSXM6] = useState([]);
  const [topFixturesData, setTopFixturesData] = useState([]);
  //const [failStationsData, setFailStationsData] = useState([]);
  //const [defectCodesData, setDefectCodesData] = useState([]);
  const normalizeStart = (date) => new Date(new Date(date).setHours(0, 0, 0, 0));
  const normalizeEnd = (date) => new Date(new Date(date).setHours(23, 59, 59, 999));
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return normalizeStart(date);
  });
  const [endDate, setEndDate] = useState(normalizeEnd(new Date()));
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    setLoading(true);

    const fetchModelData = ({ value, key, setter }) =>
      fetchWorkstationQuery({
        parameters: [{ id: 'model', value: value }],
        startDate,
        endDate,
        key,
        setDataCache: setter,
        API_BASE,
        API_Route: '/api/v1/functional-testing/station-performance?'
      });

    const fetchSXM5 = () => fetchModelData({value:'Tesla SXM5',key:'sxm5',setter: setTestStationDataSXM5});
    const fetchSXM4 = () => fetchModelData({value:'Tesla SXM4',key:'sxm4',setter: setTestStationDataSXM4});
    const fetchSXM6 = () => fetchModelData({value:'SXM6',key:'sxm6',setter: setTestStationDataSXM6});

    const fetchFixtures = () => 
      fetchFixtureQuery({
        startDate,
        endDate,
        key: 'fixtures',
        setDataCache: setTopFixturesData,
        API_BASE,
        API_Route: '/api/v1/functional-testing/fixture-performance?'
      });

    Promise.all([fetchSXM4(), fetchSXM5(), fetchSXM6(), fetchFixtures()])
      .then(() => setLoading(false)) 
      .catch(error => {
        console.error("Error fetching dashboard data:", error);
        setLoading(false); 
      });

    const interval = setInterval(() => {
      dataCache.clear();

      Promise.all([fetchSXM4(), fetchSXM5(), fetchSXM6, fetchFixtures()])
        .catch(error => console.error("Error refreshing dashboard data:", error));
    }, refreshInterval);

    return () => clearInterval(interval); 
  }, [startDate, endDate]);

  return (
    <Box p={1}>
      <Header title="Test Station Performance Charts" />
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <DateRange
          startDate={startDate}
          setStartDate={setStartDate}
          normalizeStart={normalizeStart}
          endDate={endDate}
          setEndDate={setEndDate}
          normalizeEnd={normalizeEnd}
          inline= {true}
        />
      </div>
      <Box sx={gridStyle}>
        <TestStationChart 
          label={"SXM4 Test Station Performance"}
          data={testStationDataSXM4} 
          loading={loading}
          filter = {ALL_MODELS.find(m => m.value === 'SXM4')?.filter || []}
          />
        <TestStationChart 
          label="SXM5 Test Station Performance"
          data={testStationDataSXM5}
          loading={loading} 
          filter = {ALL_MODELS.find(m => m.value === 'SXM5')?.filter || []}
          />
        <TestStationChart 
          label="SXM6 Test Station Performance"
          data={testStationDataSXM6}
          loading={loading} 
          filter = {ALL_MODELS.find(m => m.value === 'SXM6')?.filter || []}
          />
        <FixtureFailParetoChart 
          label={"Fixture Performance"}
          data={topFixturesData}
          loading={loading} />
      </Box>
    </Box>
  );
};
export default TestStationPerformancePage;