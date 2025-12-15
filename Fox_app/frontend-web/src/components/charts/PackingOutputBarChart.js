import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ReferenceLine, Line, Label } from 'recharts';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getLinearRegressionLine(data) {
  if (!data || data.length < 2) return [];
  // normalize Y
  const y = data.map(d => toNumber(d.value));
  const n = y.length;

  // x = 0..n-1 (evenly spaced)
  const xSum = (n * (n - 1)) / 2;
  const ySum = y.reduce((s, v) => s + v, 0);
  const xxSum = ((n - 1) * n * (2 * n - 1)) / 6;
  const xySum = y.reduce((s, v, i) => s + i * v, 0);

  const denom = n * xxSum - xSum * xSum;
  if (denom === 0) return data.map(d => ({ label: d.label, value: toNumber(d.value) })); // fallback: flat

  const slope = (n * xySum - xSum * ySum) / denom;
  const intercept = (ySum - slope * xSum) / n;

  return data.map((d, i) => ({ label: d.label, value: slope * i + intercept }));
}


const PackingOutputBarChart = ({
  data,
  title,
  color = '#1976d2',
  showTrendLine = false,
  showAvgLine = true,
  excludeZerosInAvg = true, // new toggle
}) => {
  const sanitized = useMemo(
    () => (data ?? []).map(d => ({ ...d, value: toNumber(d.value) })),
    [data]
  );

  const avg = useMemo(() => {
    const source = excludeZerosInAvg
      ? sanitized.filter(d => d.value > 0)
      : sanitized;
    if (source.length === 0) return 0;
    const sum = source.reduce((s, d) => s + d.value, 0);
    return Math.round(sum / source.length);
  }, [sanitized, excludeZerosInAvg]);


  const dataWithTrend = useMemo(() => {
    if (!showTrendLine || (sanitized?.length ?? 0) < 2) return sanitized;
    const trendLine = getLinearRegressionLine(sanitized);
    return sanitized.map((d, i) => ({
      ...d,
      trend: trendLine[i]?.value
    }));
  }, [sanitized, showTrendLine]);


  const theme = useTheme();
  console.log(showTrendLine, data.length,title?.toLowerCase().includes('weekly'))
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 4 }}>
        <Typography variant="h6" gutterBottom style={{ margin: 0 }}>{title}</Typography>
        {showAvgLine && avg > 0 && (
          <span style={{ fontWeight: 700, fontSize: '1.2em', color: '#d32f2f', letterSpacing: 1 }}>
            AVG: {avg}u
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={dataWithTrend} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" angle={-45} textAnchor="end" height={60} tick={{ fill: theme.palette.text.secondary}}/>
          <YAxis tick={{ fill: theme.palette.text.secondary}} domain={[0,'dataMax + 10']}/>
          <Tooltip />
          <Bar dataKey="value" fill={color}>
            <LabelList dataKey="value" position="top" fill={theme.palette.text.secondary} style={{ fontWeight: 'bold', fontSize: '13px', }} />
          </Bar>
          {showAvgLine && avg > 0 && (
            <ReferenceLine y={avg} stroke="red" strokeDasharray="6 3">
              <Label
                value={`AVG = ${avg}u`}
                position="right"
                fill="red"
                style={{ fontWeight: 'bold', fontSize: '13px', }}
              />
            </ReferenceLine>
          )}
          {showTrendLine && title?.toLowerCase().includes('weekly') &&
            Array.isArray(dataWithTrend) &&
            dataWithTrend.filter(d => Number.isFinite(d?.trend)).length >= 2 && (
              <Line
                type="linear"
                dataKey="trend"
                stroke= {theme.palette.mode === 'dark'? "#fff":"#000"}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Trend"
                connectNulls
                label={"Trend"}
              />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PackingOutputBarChart; 