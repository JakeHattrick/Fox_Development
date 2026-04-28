// ../charts/CombinedChart.js
import React, { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    Paper,
    Box,
    Typography,
    CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
// Styles
import { paperStyle, flexStyle, typeStyle, boxStyle } from '../theme/themes.js';

const formatDate = (d) => {
    // expects ISO yyyy-mm-dd
    try {
        const [y, m, day] = d.split('-').map(Number);
        const dt = new Date(y, m - 1, day); // local time
        if (Number.isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return String(d);
    }
};

// choose a "nice" step of 1, 2, or 5 * 10^k
const niceStep = (range, maxTicks = 6) => {
  if (range <= 0 || !Number.isFinite(range)) return 1;
  const rough = range / Math.max(1, maxTicks);
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 5].map((m) => m * pow10);
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
    ticks.push(Number(Math.abs(t) < 1e-12 ? 0 : t.toFixed(10)));
  }
  return ticks;
};

const getYMinMax = (data, keys) => {
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    for (const { dataKey } of keys) {
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

export const CombinedChart = memo(function CombinedChart({
  label,
  data,
  xKey,
  dateKey = true,
  // Bar series definitions
  barKeys,
  // Line series definitions
  lineKeys,
  // Y-axis config — left axis (bars + lines share by default)
  setRange = true,
  ydomain = [0, 100],
  ticks = [0, 20, 40, 60, 80, 100],
  yAxisLabel = 'Value',
  // Right Y-axis config (optional — used when lines have a separate scale)
  rightAxisKeys = [],          // dataKeys that should use the right axis
  rightYdomain = [0, 100],
  rightTicks = [0, 20, 40, 60, 80, 100],
  rightAxisLabel = '',
  setRightRange = true,
  // Line style
  lineStyle = 'monotone',      // monotone | linear | step
  // Loading state
  loading = false,
  // Bar appearance
  barSize,                     // optional fixed px width per bar
  barGap = 4,                  // gap between bars in a group
  barCategoryGap = '20%',      // gap between groups
  barGroup = true,
}) {

    const theme = useTheme();

  // Auto-calc domain/ticks for left axis
    const { autoDomain, autoTicks } = useMemo(() => {
        const allKeys = [...barKeys, ...lineKeys.filter((l) => !rightAxisKeys.includes(l.dataKey))];
        const { min, max } = getYMinMax(data, allKeys);
        if (min === 0 && max === 0) return { autoDomain: ydomain, autoTicks: ticks };
        const range = max - min || Math.abs(max) || 1;
        const step = niceStep(range, 6);
        const [nMin, nMax] = niceExtent(min, max, step);
        return { autoDomain: [nMin, nMax], autoTicks: buildTicks(nMin, nMax, step) };
    }, [data, barKeys, lineKeys, rightAxisKeys, ydomain, ticks]);

  // Auto-calc domain/ticks for right axis
    const { autoDomainRight, autoTicksRight } = useMemo(() => {
        const rightKeys = lineKeys.filter((l) => rightAxisKeys.includes(l.dataKey));
        if (!rightKeys.length) return { autoDomainRight: rightYdomain, autoTicksRight: rightTicks };
        const { min, max } = getYMinMax(data, rightKeys);
        if (min === 0 && max === 0) return { autoDomainRight: rightYdomain, autoTicksRight: rightTicks };
        const range = max - min || Math.abs(max) || 1;
        const step = niceStep(range, 6);
        const [nMin, nMax] = niceExtent(min, max, step);
        return { autoDomainRight: [nMin, nMax], autoTicksRight: buildTicks(nMin, nMax, step) };
    }, [data, lineKeys, rightAxisKeys, rightYdomain, rightTicks]);

    const hasRightAxis = rightAxisKeys.length > 0;

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
            {/* Header row: title + grouped/stacked toggle */}
            <Box sx={{ ...flexStyle, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={typeStyle}>{label}</Typography>
            </Box>

            <Box sx={{ ...boxStyle, height: 360 }}>
                {loading ? (
                    <CircularProgress />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                    data={data}
                    margin={{ top: 8, right: hasRightAxis ? 48 : 16, bottom: 8, left: 0 }}
                    barGap={barGap}
                    barCategoryGap={barCategoryGap}
                    >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey={xKey}
                            tickFormatter={dateKey ? formatDate : undefined}
                            minTickGap={24}
                            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        />

                        {/* Left Y-axis */}
                        <YAxis
                            yAxisId="left"
                            domain={setRange ? ydomain : autoDomain}
                            ticks={setRange ? ticks : autoTicks}
                            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                            label={{
                            value: yAxisLabel,
                            angle: -90,
                            position: 'insideLeft',
                            dy: 10,
                            fill: theme.palette.text.secondary,
                            }}
                        />

                        {/* Right Y-axis (rendered only when rightAxisKeys provided) */}
                        {hasRightAxis && (
                            <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={setRightRange ? rightYdomain : autoDomainRight}
                            ticks={setRightRange ? rightTicks : autoTicksRight}
                            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                            label={rightAxisLabel ? {
                                value: rightAxisLabel,
                                angle: 90,
                                position: 'insideRight',
                                dy: -10,
                                fill: theme.palette.text.secondary,
                            } : undefined}
                            />
                        )}

                        <Tooltip
                            labelFormatter={dateKey ? (v) => `Date: ${formatDate(v)}` : (v) => `Value: ${v}`}
                        />
                        <Legend />

                        {/* Bar series */}
                        {barKeys.map((bar, idx) => (
                            <Bar
                            key={bar.dataKey}
                            yAxisId="left"
                            dataKey={bar.dataKey}
                            name={bar.name || bar.dataKey}
                            fill={bar.fill || theme.palette.primary.main}
                            stackId={barGroup === false ? 'stack' : undefined}
                            barSize={barSize}
                            radius={barGroup === false ? 0 : [3, 3, 0, 0]}
                            isAnimationActive={false}
                            />
                        ))}

                        {/* Line series */}
                        {lineKeys.map((line, idx) => {
                            const useRight = hasRightAxis && rightAxisKeys.includes(line.dataKey);
                            return (
                            <Line
                                key={line.dataKey}
                                yAxisId={useRight ? 'right' : 'left'}
                                type={lineStyle}
                                dataKey={line.dataKey}
                                name={line.name || line.dataKey}
                                stroke={line.stroke || theme.palette.secondary.main}
                                strokeWidth={2}
                                strokeDasharray={line.strokeDasharray || '0'}
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                            );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
                )}
            </Box>
        </Paper>
    );
});

CombinedChart.propTypes = {
  /** Chart title */
  label: PropTypes.string.isRequired,
  /** Dataset — array of objects */
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  /** Key in data objects for the X axis */
  xKey: PropTypes.string.isRequired,
  /** Whether to format x-axis values as dates */
  dateKey: PropTypes.bool,
  /** Bar series definitions */
  barKeys: PropTypes.arrayOf(
    PropTypes.shape({
      dataKey: PropTypes.string.isRequired,
      name: PropTypes.string,
      fill: PropTypes.string,
    })
  ).isRequired,
  /** Line series definitions */
  lineKeys: PropTypes.arrayOf(
    PropTypes.shape({
      dataKey: PropTypes.string.isRequired,
      name: PropTypes.string,
      stroke: PropTypes.string,
      strokeDasharray: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  /** Toggle between fixed (setRange=true) and auto-calculated domain */
  setRange: PropTypes.bool,
  /** Left Y-axis fixed domain */
  ydomain: PropTypes.arrayOf(PropTypes.number),
  /** Left Y-axis fixed tick values */
  ticks: PropTypes.arrayOf(PropTypes.number),
  /** Left Y-axis label */
  yAxisLabel: PropTypes.string,
  /** dataKeys that should bind to the right Y-axis instead of the left */
  rightAxisKeys: PropTypes.arrayOf(PropTypes.string),
  /** Right Y-axis fixed domain */
  rightYdomain: PropTypes.arrayOf(PropTypes.number),
  /** Right Y-axis fixed tick values */
  rightTicks: PropTypes.arrayOf(PropTypes.number),
  /** Right Y-axis label */
  rightAxisLabel: PropTypes.string,
  /** Toggle between fixed and auto-calculated right domain */
  setRightRange: PropTypes.bool,
  /** Recharts line interpolation type */
  lineStyle: PropTypes.oneOf(['monotone', 'linear', 'step']),
  /** Loading state */
  loading: PropTypes.bool,
  /** Optional fixed bar width in px */
  barSize: PropTypes.number,
  /** Gap between bars within a group (px) */
  barGap: PropTypes.number,
  /** Gap between groups (px or %) */
  barCategoryGap: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

CombinedChart.defaultProps = {
  data: [],
  dateKey: true,
  setRange: true,
  ydomain: [0, 100],
  ticks: [0, 20, 40, 60, 80, 100],
  yAxisLabel: 'Value',
  rightAxisKeys: [],
  rightYdomain: [0, 100],
  rightTicks: [0, 20, 40, 60, 80, 100],
  rightAxisLabel: '',
  setRightRange: true,
  lineStyle: 'monotone',
  loading: false,
  barGap: 4,
  barCategoryGap: '20%',
  barGroup: true,
};