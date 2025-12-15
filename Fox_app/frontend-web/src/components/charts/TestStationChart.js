import React,{memo} from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { useTheme, Paper, Box, Typography, CircularProgress } from '@mui/material';
// Styles
import { paperStyle, flexStyle, typeStyle, boxStyle } from '../theme/themes.js';

export const TestStationChart = memo(({ label, data ,loading, filter = ['TPC']}) => {
    const theme = useTheme();
    const textColor = theme.palette.mode === 'dark' ? '#fff' : '#000';
    
    if (!data || data.length === 0) {
      return (
        <Paper sx={paperStyle}>
          <Box sx={flexStyle}>
            <Typography variant="h6" sx={typeStyle} >
              {label}
            </Typography>
          </Box>
          <Box sx={boxStyle}>
            <Typography variant="body1" color="textSecondary">
              No data available
            </Typography>
          </Box>
        </Paper>
      )
    }

    const filteredData = Array.isArray(data)?
      data.filter(item => {
        const station = item?.station ?? '';
        if (!station) return false;
        if(station.includes('_')) return false;
        return !filter.includes(station);
      }):[];

    return (
      <Paper sx={paperStyle}>
          <Box sx={flexStyle}>
            <Typography variant="h6" sx={typeStyle} >
              {label}
            </Typography>
          </Box>
          <Box sx={boxStyle}>
            {loading ? (
              <CircularProgress />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  margin={{
                    top: 8,
                    right: 8,
                    left: 8,
                    bottom: 1,
                  }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} 
                  />
                  <XAxis 
                    dataKey="station" 
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                    fontSize={12}
                    tickMargin={12}
                    stroke={textColor}
                    style={{ fill: textColor }}
                    tick={{ fill: textColor }}
                  />
                  <YAxis 
                    fontSize={12}
                    tickMargin={4}
                    stroke={textColor}
                    style={{ fill: textColor }}
                    tick={{ fill: textColor }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      fontSize: '12px',
                      padding: '4px',
                      backgroundColor: theme.palette.mode === 'dark' ? '#1e3a5f' : '#fff',
                      color: textColor,
                      border: 'none'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      fontSize: '12px',
                      color: textColor
                    }}
                    formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
                  />
                  <Bar dataKey="pass" stackId="a" fill="#2196f3" name="Pass">
                    <LabelList 
                      dataKey="pass" 
                      position="inside" 
                      fill={theme.palette.mode === 'dark' ? '#fff' : '#000'}
                      style={{ fontWeight: 'bold', fontSize: '12px' }}
                    />
                  </Bar>
                  <Bar dataKey="fail" stackId="a" fill="#ff9800" name="Fail">
                    <LabelList 
                      dataKey="fail" 
                      position="inside" 
                      fill={theme.palette.mode === 'dark' ? '#fff' : '#000'}
                      style={{ fontWeight: 'bold', fontSize: '12px' }}
                    />
                  </Bar>
                  <Bar dataKey="failurerate" stackId="b" fill="transparent" name="Failure Rate">
                    <LabelList 
                      dataKey="failurerate" 
                      position="top" 
                      fill={textColor}
                      formatter={(value) => `${(value * 100).toFixed(1)}%`}
                      style={{ fontWeight: 'bold', fontSize: '12px' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>

    );
}); 