// src/hooks/usePackingData.js
import { useEffect, useReducer, useRef, useMemo, useCallback, useState } from 'react';
import { rollupWeekendCounts } from '../../../utils/packingPage/packingDataUtils';
import { rollupSortData      } from '../../../utils/packingPage/sortDataUtils';

const initialState = {
  packingData: {}, 
  dates:       [], 
  sortData:    { '506': {}, '520': {} }, 
  lastUpdated: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ALL':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

/**
 * Custom hook to fetch & roll‑up packing + sort data.
 * @param {string} apiBase    – base URL for your API
 * @param {number} daysBack   – how many days back to fetch
 * @param {number} pollInterval – ms between automatic refreshes
 */
export function usePackingTableData(
  apiBase,
  startDate = null,
  endDate = null,
  pollInterval = 300_000,
  opts={}
) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef(null);

  const {enabled=true,refreshKey} = opts;
  const [loading, setLoading] = useState(false);
  const [error,setError] = useState(null);
  const [tick,setTick] = useState(0);
  const refetch = useCallback(()=>setTick(t => t+1),[]);

  // If no dates provided, use last 7 days
  const computedStartDate = useMemo(() => {
    if (startDate) return new Date(startDate);
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, [startDate]);

  const computedEndDate = useMemo(() => {
    if (endDate) return new Date(endDate);
    return new Date();
  }, [endDate]);

  useEffect(() => {
    if (!apiBase || !enabled) {
      console.log("no API found");
      if(timerRef.current) clearInterval(timerRef.current);
      return;
    };

    const startIso = computedStartDate.toISOString();
    const endIso = computedEndDate.toISOString();
    const query    = `?startDate=${startIso}&endDate=${endIso}`;

    const controller = new AbortController();
    const { signal } = controller;

    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);
        // fire both calls in parallel
        const [pRes, sRes] = await Promise.all([
          fetch(`${apiBase}/api/v1/packing/packing-records${query}`, { signal }),
          fetch(`${apiBase}/api/v1/sort-record/sort-data${query}`, { signal })
        ]);
        if (!pRes.ok || !sRes.ok) throw new Error('Network response was not ok.');

        const [rawPacking, rawSort] = await Promise.all([ pRes.json(), sRes.json() ]);

        // roll‑up weekend counts and sort‑code counts
        const { rolledUp, sortedDates } = rollupWeekendCounts(rawPacking);
        const rolledSort                = rollupSortData(rawSort);

        // batch into one update
        dispatch({
          type: 'SET_ALL',
          payload: {
            packingData: rolledUp,
            dates:       sortedDates,
            sortData:    rolledSort,
            lastUpdated: new Date()
          }
        });
        setLoading(false);
      } catch (err) {
        // ignore abort errors
        if (err.name !== 'AbortError'){ 
          console.error('usePackingData:', err);
          setError(err.message || 'Fetch failed');
        }
        setLoading(false);
      }
    }

    // initial fetch + set up polling
    fetchAll();
    timerRef.current = setInterval(fetchAll, pollInterval);

    return () => {
      controller.abort();
      clearInterval(timerRef.current);
    };
  }, [apiBase, computedStartDate, computedEndDate, pollInterval,enabled,refreshKey,tick]);

  //return state; // { packingData, dates, sortData, lastUpdated }
  return {...state,loading,error,refetch};
}
