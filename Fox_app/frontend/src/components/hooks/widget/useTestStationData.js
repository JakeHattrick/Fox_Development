
import React, { useEffect, useState, useMemo } from 'react';
import { fetchWorkstationQuery } from '../../../utils/queryUtils.js';
import { dataCache } from '../../../utils/cacheUtils';


export function useTestStationData(
  apiBase,
  startDate,
  endDate,
  refreshInterval = 300000 // 5 min
) {
    const [testStationDataSXM4, setTestStationDataSXM4] = useState([]);
    const [testStationDataSXM5, setTestStationDataSXM5] = useState([]);
    const [testStationDataSXM6, setTestStationDataSXM6] = useState([]);
    const [loading, setLoading] = useState(true); 
    
    useEffect(() => {
        try { dataCache?.clear?.(); } catch {}
        let canceled = false;
        setLoading(true);

        const fetchModelData = ({ value, key, setter }) =>
            fetchWorkstationQuery({
            parameters: [{ id: 'model', value: value }],
            startDate,
            endDate,
            key,
            setDataCache: setter,
            API_BASE:apiBase,
            API_Route: '/api/v1/functional-testing/station-performance?'
            }).then(data=>{if (!canceled)setter(data);});

        const fetchSXM5 = () => fetchModelData({value:'Tesla SXM5',key:'sxm5',setter: setTestStationDataSXM5});
        const fetchSXM4 = () => fetchModelData({value:'Tesla SXM4',key:'sxm4',setter: setTestStationDataSXM4});
        const fetchSXM6 = () => fetchModelData({value:'SXM6',key:'sxm6',setter: setTestStationDataSXM6});

        // Promise.all([fetchSXM4(), fetchSXM5(), fetchSXM6()])
        //     .then(() => setLoading(false)) 
        //     .catch(error => {
        //     console.error("Error fetching dashboard data:", error);
        //     setLoading(false); 
        //     });
        const run = async () => {
            try{
                await Promise.all([fetchSXM4(),fetchSXM5(),fetchSXM6()]);
            }finally{
                if(!canceled)setLoading(false);
            }
        };

        run();

        const interval = setInterval(() => {
            dataCache.clear();

            Promise.all([fetchSXM4(), fetchSXM5(), fetchSXM6()])
            .catch(error => console.error("Error refreshing dashboard data:", error));
        }, refreshInterval);

        return () => clearInterval(interval); 
    }, [apiBase, startDate, endDate, refreshInterval]);
    return useMemo(()=>
        ({ testStationData : [testStationDataSXM4,testStationDataSXM5,testStationDataSXM6], loading }),
        [loading,testStationDataSXM4,testStationDataSXM5,testStationDataSXM6]);
}
