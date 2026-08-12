// ../charts/LineChart.js
import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Box, Typography, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
// Styles
import { paperStyle, flexStyle, typeStyle, boxStyle } from '../theme/themes.js';

const formatDate = (d) => {
  // expects ISO yyyy-mm-dd;
  try {
    const [y, m, day] = d.split('-').map(Number);
    const dt = new Date(y, m - 1, day); // local time
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return String(d);
  }
};

export const LineChart = memo(function LineChart({ 
  label, yLabel = 'Percent', data, xKey, dateKey = true, yKeys, setRange = true, setDomain = true,
  ydomain = [0,100],
  ticks = [0,20,40,60,80,100], 
  loading = false,
  lineStyle = 'monotone'  //  monotone = wavy, linear = straight, step = stair-step
}) {
  const theme = useTheme();

  // dynamic range calculation
  const getYMinMax = (data, yKeys) => {
    let min = Infinity;
    let max = -Infinity;

    for (const row of data) {
      for (const { dataKey } of yKeys) {
        const v = Number(row?.[dataKey]);
        if (Number.isFinite(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (min === Infinity || max === -Infinity) return { min: 0, max: 0 };
    return { min, max };
  };

  // choose a "nice" step of 1, 2, or 5 * 10^k
  const niceStep = (range, maxTicks = 6) => {
    if (range <= 0 || !Number.isFinite(range)) return 1;
    const rough = range / Math.max(1, maxTicks);
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const candidates = [1, 2, 5].map((m) => m * pow10);
    // pick the smallest candidate >= rough
    return candidates.find((s) => s >= rough) ?? pow10 * 10;
  };

  const niceExtent = (min, max, step) => {
    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;
    return [niceMin, niceMax];
  };

  const buildTicks = (min, max, step) => {
    const ticks = [];
    for (let t = min; t <= max + 1e-9; t += step) {
      // avoid -0
      ticks.push(Number(Math.abs(t) < 1e-12 ? 0 : t.toFixed(10)));
    }
    return ticks;
  };

  // auto-calc domain and ticks if not explicitly provided
  const { autoDomain, autoTicks } = useMemo(() => {

    const { min, max } = getYMinMax(data, yKeys);

    // fallback if no data to default domain and ticks
    if (min === 0 && max === 0) {
      return { autoDomain: ydomain, autoTicks: ticks };
    }

    const range = max - min || Math.abs(max) || 1; // guard against zero range
    const step = niceStep(range, 6);               // target ~6 ticks
    const [nMin, nMax] = niceExtent(min, max, step);
    const tks = buildTicks(nMin, nMax, step);

    return { autoDomain: [nMin, nMax], autoTicks: tks };
  }, [data, yKeys, ticks, ydomain]);



  if (!data.length && !loading) {
    return (
      <Paper sx={paperStyle}>
        <Box sx={flexStyle}>
          <Typography variant="h6" sx={typeStyle}>{label}</Typography>
        </Box>
        <Box sx={boxStyle}>
          <Typography variant="body1" color="text.secondary">No data available</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={paperStyle}>
      <Box sx={flexStyle}>
        <Typography variant="h6" sx={typeStyle}>{label}</Typography>
      </Box>
      <Box sx={{ ...boxStyle, height: 360 }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={xKey}
                tickFormatter={dateKey ? formatDate : undefined} //check later
                minTickGap={24}
                tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
              />
              <YAxis
                domain={setDomain ? ydomain : autoDomain}
                ticks={setRange ? ticks : autoTicks}
                tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', dy: 10, fill: theme.palette.text.secondary }}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                labelFormatter={dateKey ? (v) => `Date: ${formatDate(v)}` : (v) => `Value: ${v}`}
              />
              <Legend />
              {yKeys.map((line,idx) => (
                <Line
                  key={idx}
                  type={lineStyle}
                  dataKey={line.dataKey}
                  name={line.name || line.dataKey}
                  stroke={line.stroke || theme.palette.primary.main}
                  strokeWidth = {2}
                  strokeDasharray={line.strokeDasharray || '0'}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
});

LineChart.propTypes = {
  // Chart title
  label: PropTypes.string.isRequired,
  // The dataset for the chart ({...} objects)
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  // The key in `data` objects for the X axis
  xKey: PropTypes.string.isRequired,
  // Whether to format x-axis as a date
  dateKey: PropTypes.bool,
  // Line definitions (array of config objects)
  yKeys: PropTypes.arrayOf(
    PropTypes.shape({
      dataKey: PropTypes.string.isRequired,
      name: PropTypes.string,
      stroke: PropTypes.string,
      strokeDasharray: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]),
    })
  ).isRequired,
  // Y axis domain
  ydomain: PropTypes.arrayOf(PropTypes.number),
  // Y axis tick values
  ticks: PropTypes.arrayOf(PropTypes.number),
  // toggle between set domain or dynamic range
  setRange: PropTypes.bool,
  // Loading state
  loading: PropTypes.bool,
};


LineChart.defaultProps = {
  data: [],
  dateKey: true,
  ydomain: [0, 100],
  ticks: [0, 20, 40, 60, 80, 100],
  setRange: true,
  loading: false,
};
