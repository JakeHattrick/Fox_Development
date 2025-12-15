// React Core
import React, { useEffect, useState, useCallback } from 'react';
// Material UI Components
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
// Third Party Libraries
import 'react-datepicker/dist/react-datepicker.css';
// Custom Charts
import { ParetoChart } from '../../charts/ParetoChart.js';
// Page Components
import { Header } from '../../pagecomp/Header.jsx';
import { DateRange } from '../../pagecomp/DateRange.jsx';
// Utilities and Helpers
import { dataCache } from '../../../utils/cacheUtils.js';
import { gridStyle } from '../../theme/themes.js';
import { fetchErrorQuery } from '../../../utils/queryUtils.js';
import { getInitialStartDate, normalizeDate } from '../../../utils/dateUtils.js';
import { NumberRange } from '../../pagecomp/NumberRange.jsx'

const ReadOnlyInput = React.forwardRef((props, ref) => (
  <input {...props} ref={ref} readOnly />
));
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}
console.log('API_BASE:', API_BASE);

const refreshInterval = 300000; // 5 minutes

export const ParetoPage = () => {
  const [errorcodeDataSXM4, setErrorcodeDataSXM4] = useState([]);
  const [errorcodeDataSXM5, setErrorcodeDataSXM5] = useState([]);
  const [errorcodeDataSXM6, setErrorcodeDataSXM6] = useState([]);
  const [errocodeDataAll,setErrorcodeDataAll] = useState([]);
  const [startDate, setStartDate] = useState(getInitialStartDate());
  const [endDate, setEndDate] = useState(normalizeDate.end(new Date()));
  const handleStartDateChange = useCallback((date) => {
    setStartDate(normalizeDate.start(date));
  }, []);
  const handleEndDateChange = useCallback((date) => {
    setEndDate(normalizeDate.end(date));
  }, []);
  const [loading, setLoading] = useState(true); 
  const [cutoff, setCutoff] = useState(7);

  useEffect(() => {
    setLoading(true);

    const fetchErrorData = ({ value, key, setter }) =>
      fetchErrorQuery({
        parameters: [{ id: 'model', value: value }],
        startDate,
        endDate,
        key,
        setDataCache: setter,
        API_BASE,
        API_Route: '/api/v1/snfn/model-errors?'
      });

    const codesSXM4 = () => fetchErrorData({value:'Tesla SXM4',key:'sxm4',setter: setErrorcodeDataSXM4});
    const codesSXM5 = () => fetchErrorData({value:'Tesla SXM5',key:'sxm5',setter: setErrorcodeDataSXM5});
    const codesSXM6 = () => fetchErrorData({value:'SXM6',key:'sxm6',setter: setErrorcodeDataSXM6});
    const codesALL = () => fetchErrorData({value:'ALL',key:'ALL',setter: setErrorcodeDataAll});

    Promise.all([codesSXM4(), codesSXM5(), codesSXM6(), codesALL()])
      .then(() => setLoading(false)) 
      .catch(error => {
        console.error("Error fetching Pareto data:", error);
        setLoading(false); 
      });

    const interval = setInterval(() => {
      dataCache.clear();

      Promise.all([codesSXM4(), codesSXM5(), codesSXM6, codesALL()])
        .catch(error => console.error("Error refreshing Pareto data:", error));
    }, refreshInterval);

    return () => clearInterval(interval); 
  }, [startDate, endDate]);

  return (
    <Box p={1}>
      <Header title="Pareto Charts" subTitle="Pareto error codes by model" />
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <DateRange
          startDate={startDate}
          endDate={endDate}
          setStartDate={handleStartDateChange} 
          setEndDate={handleEndDateChange}
          normalizeStart={normalizeDate.start} 
          normalizeEnd={normalizeDate.end}
          inline= {true}
        />
        <NumberRange defaultNumber={cutoff} setNumber={setCutoff} label="# Codes" />
      </div>
      <Box sx={gridStyle}>
        <ParetoChart 
          label={"SXM4 Test Station Performance"}
          data={errorcodeDataSXM4} 
          loading={loading}
          limit={cutoff}/>
        <ParetoChart 
          label="SXM5 Test Station Performance"
          data={errorcodeDataSXM5}
          loading={loading} 
          limit={cutoff}/>
        <ParetoChart 
          label="SXM6 Test Station Performance"
          data={errorcodeDataSXM6}
          loading={loading} 
          limit={cutoff}/>
        <ParetoChart 
          label={"All Performance"}
          data={errocodeDataAll}
          loading={loading} 
          limit={cutoff}/>
      </Box>
    </Box>
  );
};

export default ParetoPage;