// src/hooks/packingCharts/usePackingData.js
import { useState, useEffect } from 'react';
import {
  parseISO,
  startOfISOWeek,
  endOfISOWeek,
  subWeeks,
  addWeeks,
  getISOWeek,
  getISOWeekYear,
  format,
} from 'date-fns';
import { fetchPackingRecords } from '../../../utils/packingCharts/packingChartsApi';
import { getDateRangeArray } from '../../../utils/dateUtils';

// Process the data structure returned by the API
const processPackingData = (apiData, selectedModelsOrModel) => {
  // Handle both array of models and single model
  const selectedModels = Array.isArray(selectedModelsOrModel) 
    ? selectedModelsOrModel 
    : [selectedModelsOrModel];
  
  const dateMap = {};
  
  // Handle case where apiData might be empty or null
  if (!apiData || typeof apiData !== 'object') {
    return dateMap;
  }
  
  // Process each selected model
  selectedModels.forEach(selectedModel => {
    
    // Look for exact match first, then fuzzy match
    let matchingModelKey = null;
    
    // First try exact match
    if (apiData[selectedModel]) {
      matchingModelKey = selectedModel;
    } else {
      // Try to find a model that contains the selected model name or vice versa
      const modelKeys = Object.keys(apiData);
      
      matchingModelKey = modelKeys.find(key => 
        key.toLowerCase().includes(selectedModel.toLowerCase()) ||
        selectedModel.toLowerCase().includes(key.toLowerCase())
      );
      
      if (!matchingModelKey) {
        console.log('No model match found for:', selectedModel,' Available models were:', modelKeys);
        return; // Skip this model
      }
    }
    
    const modelData = apiData[matchingModelKey];
    
    // Check if modelData has the expected structure
    if (!modelData || !modelData.parts) {
      console.log('Model data missing or no parts:', modelData);
      return; // Skip this model
    }
    
    // Iterate through all parts for this model
    Object.entries(modelData.parts).forEach(([partNumber, partData]) => {
      
      if (!partData || typeof partData !== 'object') {
        console.log('Invalid part data for:', partNumber);
        return;
      }
      
      // partData structure: { "M/D/YYYY": count }
      Object.entries(partData).forEach(([dateStr, count]) => {
        try {
          // Convert "M/D/YYYY" to "YYYY-MM-DD" format
          const dateParts = dateStr.split('/');
          if (dateParts.length !== 3) {
            console.log('Invalid date format:', dateStr);
            return;
          }
          
          const [month, day, year] = dateParts;
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          
          const numericCount = parseInt(count, 10);
          if (isNaN(numericCount)) {
            console.log('Invalid count value:', count, 'for date:', dateStr);
            return;
          }

          // Sum up counts for the same date across all parts and models
          dateMap[isoDate] = (dateMap[isoDate] || 0) + numericCount;
        } catch (error) {
          console.error('Error processing date entry:', dateStr, count, error);
        }
      });
    });
  });
  
  return dateMap;
};

export function usePackingChartData(
  apiBase,
  selectedModelsOrModel,   // Can be either array of models or single model string
  currentISOWeekStart,     // ISO week start as an ISO string or Date
  weeksToShow = 12         // how many weeks for the summary
) {
  // Daily chart state
  const [dailyData, setDailyData]         = useState([]);
  const [loadingDaily, setLoadingDaily]   = useState(false);
  const [errorDaily, setErrorDaily]       = useState(null);

  // Weekly summary state
  const [weeklyData, setWeeklyData]       = useState([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [errorWeekly, setErrorWeekly]     = useState(null);

  // 1️⃣ Fetch & build daily data whenever week or model changes
  useEffect(() => {
    if (!apiBase || !currentISOWeekStart || !selectedModelsOrModel) {
      console.log('Daily data fetch skipped:', { apiBase: !!apiBase, currentISOWeekStart, selectedModelsOrModel });
      return;
    }
    
    setLoadingDaily(true);
    setErrorDaily(null);

    const weekStart = typeof currentISOWeekStart === 'string'
      ? parseISO(currentISOWeekStart)
      : currentISOWeekStart;
    const weekEnd = endOfISOWeek(weekStart);

    fetchPackingRecords(apiBase, '/api/v1/packing/packing-records', weekStart, weekEnd)
      .then(apiData => {
        
        const dateMap = processPackingData(apiData, selectedModelsOrModel);
        
        const allDates = getDateRangeArray(
          format(weekStart, 'yyyy-MM-dd'),
          format(weekEnd,   'yyyy-MM-dd')
        );
        
        const dailyChartData = allDates.map(date => ({
          label: date,
          value: dateMap[date] || 0
        }));
        
        setDailyData(dailyChartData);
      })
      .catch(err => {
        console.error('Daily data fetch error:', err);
        setErrorDaily(err.message);
        setDailyData([]);
      })
      .finally(() => setLoadingDaily(false));
  }, [apiBase, selectedModelsOrModel, currentISOWeekStart]);

  // 2️⃣ Fetch & build weekly summary whenever models or weeksToShow changes
  useEffect(() => {
    if (!apiBase || !selectedModelsOrModel || (Array.isArray(selectedModelsOrModel) && selectedModelsOrModel.length === 0)) return;
    
    setLoadingWeekly(true);
    setErrorWeekly(null);

    const today = new Date();
    const thisWeekStart = startOfISOWeek(today);
    const earliest = subWeeks(thisWeekStart, weeksToShow - 1);

    fetchPackingRecords(apiBase, '/api/v1/packing/packing-records', earliest, thisWeekStart)
      .then(apiData => {
        const dateMap = processPackingData(apiData, selectedModelsOrModel);
        
        // Roll up daily data by ISO week
        const weeklyTotals = {};
        Object.entries(dateMap).forEach(([isoDate, value]) => {
          const date = parseISO(isoDate);
          const week = getISOWeek(date);
          const year = getISOWeekYear(date);
          const weekKey = `${year}-${String(week).padStart(2, '0')}`;
          weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + value;
        });
        
        // Generate labels for the last N weeks in chronological order
        const weekLabels = Array.from({ length: weeksToShow }, (_, i) => {
          const weekDate = addWeeks(thisWeekStart, i - (weeksToShow - 1));
          const week = getISOWeek(weekDate);
          const year = getISOWeekYear(weekDate);
          return `${year}-${String(week).padStart(2, '0')}`;
        });
        
        const weeklyChartData = weekLabels.map(weekLabel => ({
          label: weekLabel,
          value: weeklyTotals[weekLabel] || 0
        }));
        
        setWeeklyData(weeklyChartData);
      })
      .catch(err => {
        console.error('Weekly data fetch error:', err);
        setErrorWeekly(err.message);
        setWeeklyData([]);
      })
      .finally(() => setLoadingWeekly(false));
  }, [apiBase, selectedModelsOrModel, weeksToShow]);

  return {
    dailyData,
    loadingDaily,
    errorDaily,
    weeklyData,
    loadingWeekly,
    errorWeekly
  };
}