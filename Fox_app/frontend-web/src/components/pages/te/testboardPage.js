// ============================================================================
// File: TestboardPage.js
//
// PURPOSE:
//   Testboard dashboard styled to MATCH UsagePage layout:
//    - KPI area (left)
//    - Big bordered station activity line chart (center)
//    - Big bordered status pie chart (right)
//    - Big bordered weekly activity line chart
//    - Table area (same framed Paper container)
//
// NOTE:
//   Frontend-only change. Uses existing, already-working backend APIs.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Container,
  IconButton,
  Stack,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";

import {
  getTestboardSummary,
  getTestboardStatus,
  getTestboardWeeklyActivity,
} from "../../../services/api";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

// Status colors (kept simple & consistent)
const STATUS_COLORS = {
  Running: "#1976d2",
  Passed: "#2e7d32",
  Failed: "#d32f2f",
  Unknown: "#9e9e9e",
};

export default function TestboardPage() {
  // Summary + KPIs
  const [summary, setSummary] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Weekly activity
  const [weekly, setWeekly] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const range = "7d"; // locked to match manager requirement

  // --------------------------------------------------------------------------
  // Fetch summary + KPIs
  // --------------------------------------------------------------------------
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, statusRes] = await Promise.all([
        getTestboardSummary(range),
        getTestboardStatus(range),
      ]);

      setSummary(Array.isArray(summaryRes.data) ? summaryRes.data : []);
      setStatus(statusRes.data || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load testboard data");
      setSummary([]);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // --------------------------------------------------------------------------
  // Fetch weekly station activity
  // --------------------------------------------------------------------------
  const fetchWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const res = await getTestboardWeeklyActivity(30);
      setWeekly(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Weekly activity error:", err);
      setWeekly([]);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchWeekly();
  }, [fetchSummary, fetchWeekly]);

  // --------------------------------------------------------------------------
  // KPI widgets
  // --------------------------------------------------------------------------
  const widgets = useMemo(() => {
    if (!status) return null;
    return {
      total: status.total_fixtures_seen,
      running: status.running,
      passed: status.passed,
      failed: status.failed,
    };
  }, [status]);

  // --------------------------------------------------------------------------
  // Pie chart data (status distribution)
  // --------------------------------------------------------------------------
  const pieData = useMemo(() => {
    if (!widgets) return [];
    return [
      { name: "Running", value: widgets.running },
      { name: "Passed", value: widgets.passed },
      { name: "Failed", value: widgets.failed },
    ].map((d) => ({
      ...d,
      fill: STATUS_COLORS[d.name] || STATUS_COLORS.Unknown,
    }));
  }, [widgets]);

  // --------------------------------------------------------------------------
  // Weekly activity line data (grouped by week)
  // --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Station activity (aggregated per station, line chart)
// --------------------------------------------------------------------------
  const stationLineData = useMemo(() => {
    if (!weekly || weekly.length === 0) return [];

    const map = {};

    weekly.forEach((row) => {
      const station = row.workstation_name || "Unknown";
      if (!map[station]) {
        map[station] = {
          workstation_name: station,
          run_count: 0,
        };
      }
      map[station].run_count += Number(row.run_count || 0);
    });

    // Sort by activity (low → high looks best for vertical line)
    return Object.values(map).sort((a, b) => a.run_count - b.run_count);
  }, [weekly]);


  return (
    <Container maxWidth={false} sx={{ px: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Testboard Dashboard</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Fixture-level testboard activity, station throughput, and status trends.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* KPI (left) */}
        <Grid item xs={12} md={3} lg={3}>
          <Stack spacing={2}>
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2">Total Fixtures</Typography>
                <Typography variant="h4" align="center">
                  {widgets ? widgets.total : "–"}
                </Typography>
              </Box>
            </Paper>

            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2">Status Snapshot</Typography>
                {widgets && (
                  <>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography>Running</Typography>
                      <b>{widgets.running}</b>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography>Passed</Typography>
                      <b>{widgets.passed}</b>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography>Failed</Typography>
                      <b>{widgets.failed}</b>
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* Weekly station activity (center) */}
        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Weekly Station Activity</Typography>

            <Box
              sx={{
                width: 700,
                height: 450,
                mx: "auto",
                mt: 2,
                border: "2px solid #ddd",
                borderRadius: 2,
                background: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {weeklyLoading ? (
                <CircularProgress />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stationLineData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="workstation_name"
                      width={160}
                    />
                    <ReTooltip />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="run_count"
                      name="Total Runs"
                      stroke="#1976d2"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

              )}
            </Box>
          </Paper>
        </Grid>

        {/* Status pie (right) */}
        <Grid item xs={12} md={3} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Fixture Status</Typography>

            <Box
              sx={{
                width: 700,
                height: 450,
                mx: "auto",
                mt: 2,
                border: "2px solid #ddd",
                borderRadius: 2,
                background: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {loading ? (
                <CircularProgress />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={80}
                      outerRadius={150}
                      paddingAngle={4}
                      label={(e) => `${e.name} (${e.value})`}
                    >
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.fill} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* TABLE */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              mt: 2,
              width: "100%",
              maxWidth: "2000px",
              mx: "auto",
              border: "2px solid #ddd",
              borderRadius: 2,
              background: "white",
            }}
          >
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Grid item>
                <Typography variant="h6">Fixtures</Typography>
              </Grid>

              <Grid item>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => { fetchSummary(); fetchWeekly(); }} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>

            <Box sx={{ width: "100%", height: "600px", overflow: "auto" }}>
              {loading ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fixture No</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Workstation</TableCell>
                      <TableCell>Process</TableCell>
                      <TableCell>Model</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell>Duration (min)</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {summary.map((row) => (
                      <TableRow key={row.fixture_no} hover>
                        <TableCell>{row.fixture_no}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: "bold", color: STATUS_COLORS[row.status] || "#616161" }}>
                            {row.status}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.workstation_name}</TableCell>
                        <TableCell>{row.work_station_process}</TableCell>
                        <TableCell>{row.model}</TableCell>
                        <TableCell>{row.operator}</TableCell>
                        <TableCell>{row.start_time}</TableCell>
                        <TableCell>{row.end_time}</TableCell>
                        <TableCell>{row.duration_minutes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
