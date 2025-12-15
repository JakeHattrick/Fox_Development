import React, { useState, useMemo, useCallback } from 'react';
import { useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PackingPageTable } from '../../pagecomp/packingPage/PackingPageTable';
import { DateRange } from '../../pagecomp/DateRange';
import { tableStyle, divStyle, buttonStyle, subTextStyle } from '../../theme/themes';
import { usePackingTableData as usePackingData } from '../../hooks/packingPage/usePackingTableData';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const PackingPage = () => {
  const [copied, setCopied] = useState({ group: '', date: '' });
  const normalizeStart = (date) => new Date(new Date(date).setHours(0, 0, 0, 0));
  const normalizeEnd = (date) => new Date(new Date(date).setHours(23, 59, 59, 999));
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return normalizeStart(date);
  });
  const [endDate, setEndDate] = useState(normalizeEnd(new Date()));
  
  const { packingData, sortData, lastUpdated } = usePackingData(API_BASE, startDate, endDate);
  const theme = useTheme();
  const navigate = useNavigate();

  // Get dates between start and end date
  const dateRange = useMemo(() => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    // Helper to format date as M/D/YYYY
    const formatDate = (date) => {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    // Add all dates between start and end
    while (current <= end) {
      dates.push(formatDate(new Date(current)));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [startDate, endDate]);

  // Transform our new data structure into groups for the table
  const groups = useMemo(() => {
    if (!packingData || typeof packingData !== 'object') return [];
    try {
      // Define the desired order of groups
      const groupOrder = ['Tesla SXM4', 'Tesla SXM5', 'SXM6', 'RED OCTOBER'];
      
      return Object.entries(packingData)
        .map(([modelName, modelData]) => {
          // Filter parts to only include those with data in our date range
          const activeParts = Object.entries(modelData?.parts || {})
            .filter(([_, partData]) => {
              // Check if this part has any data in our date range
              return dateRange.some(date => partData[date] !== undefined && partData[date] !== null);
            })
            .map(([partNumber]) => partNumber.trim()) // Trim any whitespace
            .sort((a, b) => a.localeCompare(b)); // Sort part numbers alphabetically

          return {
            key: modelName,
            label: modelData?.groupLabel || modelName,
            totalLabel: modelData?.totalLabel || `${modelName} Total`,
            parts: activeParts,
            order: groupOrder.indexOf(modelName) // Will be -1 if not found
          };
        })
        .filter(group => group.parts.length > 0) // Only include groups that have active parts
        .sort((a, b) => {
          // If both groups are in groupOrder, sort by their order
          if (a.order !== -1 && b.order !== -1) {
            return a.order - b.order;
          }
          // If only one is in groupOrder, prioritize it
          if (a.order !== -1) return -1;
          if (b.order !== -1) return 1;
          // If neither is in groupOrder, sort alphabetically
          return a.key.localeCompare(b.key);
        })
    } catch (error) {
      console.error('Error processing packing data:', error);
      return [];
    }
  }, [packingData, dateRange]);

  // Calculate daily totals from the new structure
  const dailyTotals = useMemo(() => {
    if (!packingData || typeof packingData !== 'object') return {};
    try {
      const totals = dateRange.reduce((acc, date) => {
        let total = 0;
        
        // Sum up all parts from all models for this date
        Object.values(packingData).forEach(model => {
          if (model?.parts) {
            Object.values(model.parts).forEach(partData => {
              const value = Number(partData[date] || 0);
              total += value;
            });
          }
        });
        
        // Always add the total (even if zero)
        acc[date] = total;
        return acc;
      }, {});


      return totals;
    } catch (error) {
      console.error('Error calculating daily totals:', error);
      return {};
    }
  }, [dateRange, packingData]);

  const handleCopyColumn = useCallback((group, date) => {
    let values = '';
    
    if (packingData[group]) {
      values = Object.values(packingData[group].parts)
        .map(partData => partData[date] || '')
        .join('\n');
    } else if (group === 'DAILY TOTAL') {
      values = dailyTotals[date]?.toString() || '';
    } else if (group === 'SORT') {
      values = ['506', '520'].map(model => sortData[model]?.[date] || '').join('\n');
    }

    navigator.clipboard.writeText(values).then(() => {
      setCopied({ group, date });
      setTimeout(() => setCopied({ group: '', date: '' }), 1200);
    });
  }, [packingData, sortData, dailyTotals]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={divStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Packing Output</h1>
          <button style={{ ...buttonStyle, marginLeft: '1rem' }} onClick={() => navigate('/packing-charts')}>
            Packing Charts
          </button>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 16,
          position: 'relative',
          zIndex: 1000 // Higher than table elements
        }}>
          <DateRange
            startDate={startDate}
            setStartDate={setStartDate}
            normalizeStart={normalizeStart}
            endDate={endDate}
            setEndDate={setEndDate}
            normalizeEnd={normalizeEnd}
            inline={true}
          />
        </div>
        {lastUpdated && <div style={subTextStyle}>Last updated: {lastUpdated.toLocaleTimeString()}</div>}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 24,
          margin: '0 auto',
        }}
        role="grid"
        aria-label="Packing tables"
      >
        {/* Dynamically render each model group */}
        {groups.map(g => (
          <PackingPageTable
            key={g.key}
            header={g.label}
            headerTwo={g.totalLabel}
            dates={dateRange}
            partLabel={g.key}
            handleOnClick={handleCopyColumn}
            partsMap={g.parts}
            packingData={packingData?.[g.key]?.parts || {}}
            copied={copied}
            spacer
          />
        ))}
        
        {/* Daily Total Section */}
        <PackingPageTable
          header="DAILY TOTAL"
          headerTwo="Total Packed"
          dates={dateRange}
          partLabel="DAILY TOTAL"
          handleOnClick={handleCopyColumn}
          partsMap={[]}
          packingData={{}}
          copied={copied}
          dailyTotals={dailyTotals}
          isTotal={true}
          spacer
        />

        {/* Sort Section */}
        <PackingPageTable
          header="SORT"
          headerTwo=""
          dates={dateRange}
          partLabel="SORT"
          handleOnClick={handleCopyColumn}
          partsMap={['506', '520'].filter(code => 
            dateRange.some(date => sortData?.[code]?.[date] !== undefined)
          )}
          packingData={sortData || {}}
          copied={copied}
          isSort={true}
        />
      </div>
    </div>
  );
};

export default PackingPage;