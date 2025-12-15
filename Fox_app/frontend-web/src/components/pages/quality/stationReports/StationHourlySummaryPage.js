import React, { useEffect, useState } from 'react';

const STATIONS = ['RECEIVE', 'VI2', 'FLA', 'BAT', 'FCT', 'ASSY2'];

const StationHourlySummaryPage = () => {
  const [data, setData] = useState([]);
  const [hours, setHours] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2025-07-07');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || '';

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/v1/station-hourly-summary?startDate=${selectedDate}&endDate=${selectedDate}`)
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(json => {
        setData(json);
        const uniqueHours = [...new Set(json.map(row => row.hour))].sort((a, b) => a - b);
        setHours(uniqueHours);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch data. Please check your connection and try again.');
        setLoading(false);
      });
  }, [selectedDate, API_BASE]);

  const getCount = (hour, station) => {
    const found = data.find(row => row.hour === hour && row.workstation_name === station);
    return found ? found.part_count : '';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Station Hourly Summary</h2>
      <label>
        Select Date:{' '}
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </label>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red', marginTop: 16 }}>{error}</div>
      ) : (
        <table border="1" cellPadding="4" style={{ borderCollapse: 'collapse', minWidth: 600, marginTop: 16 }}>
          <thead>
            <tr>
              <th>Hour</th>
              {STATIONS.map(station => (
                <th key={station}>{station}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(hour => (
              <tr key={hour}>
                <td>{hour}:00</td>
                {STATIONS.map(station => (
                  <td key={station}>{getCount(hour, station)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StationHourlySummaryPage; 