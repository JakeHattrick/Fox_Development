import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { useTheme } from '@mui/material';

export const ThroughputBarChart = React.memo(({ data }) => {
  const theme = useTheme();
  
  const chartStyles = useMemo(() => ({
    textColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
    labelFill: theme.palette.mode === 'dark' ? '#fff' : '#000'
  }), [theme.palette.mode]);

  const chartData = useMemo(() => {
    return data.map(station => ({
      station: station.station,
      passed: station.passedParts,
      failed: station.failedParts
    }));
  }, [data]);

  const passedLabelFormatter = useMemo(() => (value) => {
    return value > 30 ? value.toLocaleString() : '';
  }, []);

  const failedLabelFormatter = useMemo(() => (value) => {
    return value > 10 ? value.toLocaleString() : '';
  }, []);

  const chartConfig = useMemo(() => ({
    margin: { top: 50, right: 30, left: 20, bottom: 60 },
    animationBegin: 0,
    animationDuration: 0, 
    isAnimationActive: false
  }), []);
  return (
    <ResponsiveContainer 
      width="100%" 
      height="100%"
      debounceMs={50} 
    >
      <BarChart 
        data={chartData} 
        margin={chartConfig.margin}
        animationBegin={chartConfig.animationBegin}
        animationDuration={chartConfig.animationDuration}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          animationDuration={0} 
        />
        <XAxis 
          dataKey="station" 
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
          stroke={chartStyles.textColor}
          tick={{ fill: chartStyles.textColor }}
          animationDuration={0} 
        />
        <YAxis 
          stroke={chartStyles.textColor}
          tick={{ fill: chartStyles.textColor }}
          animationDuration={0} 
        />
        <Tooltip 
          animationDuration={0} 
          isAnimationActive={false}
        />
        <Legend 
          align="right"
          verticalAlign="top"
          layout="horizontal"
          wrapperStyle={{
            fontSize: '14px',
            fontWeight: '500',
            paddingBottom: '10px'
          }}
        />
        <Bar 
          dataKey="passed" 
          stackId="parts" 
          fill="#4caf50" 
          name="Good Parts"
          animationDuration={0} 
          animationBegin={0}
          isAnimationActive={false}
        >
          <LabelList 
            dataKey="passed" 
            position="inside" 
            fill={chartStyles.labelFill}
            style={{ fontWeight: 'bold', fontSize: '12px' }}
            formatter={passedLabelFormatter}
          />
        </Bar>
        <Bar 
          dataKey="failed" 
          stackId="parts" 
          fill="#f44336" 
          name="Defective Parts"
          animationDuration={0} 
          animationBegin={0}
          isAnimationActive={false}
        >
          <LabelList 
            dataKey="failed" 
            position="inside" 
            fill={chartStyles.labelFill}
            style={{ fontWeight: 'bold', fontSize: '12px' }}
            formatter={failedLabelFormatter}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}, (prevProps, nextProps) => {
  if (prevProps.data.length !== nextProps.data.length) return false;
  
  for (let i = 0; i < prevProps.data.length; i++) {
    const prev = prevProps.data[i];
    const next = nextProps.data[i];
    
    if (prev.station !== next.station || 
        prev.passedParts !== next.passedParts || 
        prev.failedParts !== next.failedParts) {
      return false;
    }
  }
  
  return true; 
}); 