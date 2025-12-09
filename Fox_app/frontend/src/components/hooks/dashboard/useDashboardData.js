import { useState, useCallback, useRef, useEffect } from 'react';
import { dataCache } from '../../../utils/cacheUtils';
import { fetchWorkstationQuery, fetchFixtureQuery } from '../../../utils/queryUtils';

export const useDashboardData = (API_BASE, startDate, endDate) => {
  const [state, setState] = useState({
    testStationData: [],
    testStationDataSXM4: [],
    topFixturesData: [],
    loading: true
  });

  const fetchDataRef = useRef({});

  // Memoize fetch functions
  fetchDataRef.current.fetchModelData = useCallback(({ value, key, setter }) =>
    fetchWorkstationQuery({
      parameters: [{ id: 'model', value }],
      startDate,
      endDate,
      key,
      setDataCache: (data) => setState(prev => ({ ...prev, [setter]: data })),
      API_BASE,
      API_Route: '/api/v1/functional-testing/station-performance?'
    }),
    [startDate, endDate, API_BASE]
  );

  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await Promise.all([
        fetchDataRef.current.fetchModelData({
          value: 'Tesla SXM5',
          key: 'sxm5',
          setter: 'testStationData'
        }),
        fetchDataRef.current.fetchModelData({
          value: 'Tesla SXM4',
          key: 'sxm4',
          setter: 'testStationDataSXM4'
        }),
        fetchFixtureQuery({
          startDate,
          endDate,
          key: 'fixtures',
          setDataCache: (data) => setState(prev => ({ ...prev, topFixturesData: data })),
          API_BASE,
          API_Route: '/api/v1/functional-testing/fixture-performance?'
        })
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [startDate, endDate, API_BASE]);

  return { state, refreshData };
};