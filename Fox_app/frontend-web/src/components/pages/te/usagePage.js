// ============================================================================
// File: usagePage.js
//
// PURPOSE:
//   Usage dashboard styled to match HealthPage:
//    - KPI area (small)
//    - Big bordered Station-based stacked bar chart (LA + RA)
//    - Big bordered Pie chart (status distribution)
//    - New: Gen5 vs Gen3 daily usage line chart (last 7 days by default)
//    - Table area (same framed Paper container)
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
import { getUsageSummaryAll, getDailyUsage } from "../../../services/api";

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

// Pie color mapping
const PIE_COLORS = {
  Idle: "#9e9e9e",
  Partial: "#f57c00",
  Inactive: "#bdbdbd",
  Error: "#d32f2f",
  Finished: "#2e7d32",
  Testing: "#1976d2",
  Unknown: "#9e9e9e",
};

// Safe accessor for slot fields
const field = (slot, key) => (slot && slot[key] ? slot[key] : null);

export default function UsageSummaryPage() {
  // Summary / table state
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Daily usage (Gen3 / Gen5) state
  const [dailyUsage, setDailyUsage] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");

  //Date range for daily usage chart
  const[startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate()-7);
    return d.toISOString().slice(0, 10);
  });

  const[endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Fetch usage summary (existing)
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getUsageSummaryAll();
      setUsageData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching usage summary:", err);
      setError(err?.message || "Failed to fetch usage summary");
      setUsageData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch daily usage (Gen5 vs Gen3) — default last 7 days
  const fetchDailyUsage = useCallback(async () => {
    setDailyLoading(true);
    setDailyError("");
    try {
      
      const res = await getDailyUsage({ startDate, endDate });

      // Be defensive about response shape (some backends return rows, some return array directly)
      const payload = res?.data;
      if (Array.isArray(payload)) {
        setDailyUsage(payload);
      } else if (Array.isArray(payload?.rows)) {
        setDailyUsage(payload.rows);
      } else if (Array.isArray(payload?.result)) {
        setDailyUsage(payload.result);
      } else {
        setDailyUsage([]); // fallback
      }
    } catch (err) {
      console.error("daily-usage error:", err);
      setDailyError(err?.message || "Failed to fetch daily usage");
      setDailyUsage([]);
    } finally {
      setDailyLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSummary();
    fetchDailyUsage();
  }, [fetchSummary, fetchDailyUsage]);

  // KPI top-left
  const widgets = useMemo(() => {
    const total = usageData.length;
    const byStatus = usageData.reduce((acc, row) => {
      const s = row.status || "Unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return { total, byStatus };
  }, [usageData]);

  // Pie chart data
  const statusPieData = useMemo(() => {
    const statuses = ["Idle", "Partial", "Inactive", "Error", "Finished", "Testing"];
    const map = {};
    statuses.forEach((s) => (map[s] = 0));

    usageData.forEach((row) => {
      const s = row.status || "Unknown";
      if (map.hasOwnProperty(s)) map[s] += 1;
      else map[s] = (map[s] || 0) + 1;
    });

    return statuses.map((s) => ({
      name: s,
      value: map[s] || 0,
      fill: PIE_COLORS[s] || PIE_COLORS.Unknown,
    }));
  }, [usageData]);

  // ============================================================
  // ⭐ Station-based stacked bar chart (LA vs RA) — unchanged
  // ============================================================
  const stationLineData = useMemo(() => {
    if (!usageData || usageData.length === 0) return [];

    const map = {};

    usageData.forEach((row) => {
      const la = row.slots?.LA?.test_station;
      const ra = row.slots?.RA?.test_station;

      if (la) {
        if (!map[la]) map[la] = { station: la, LA: 0, RA: 0 };
        map[la].LA += 1;
      }
      if (ra) {
        if (!map[ra]) map[ra] = { station: ra, LA: 0, RA: 0 };
        map[ra].RA += 1;
      }
    });

    return Object.values(map);
  }, [usageData]);

  // ============================================================
  // GEN5 vs GEN3 Usage (line chart) — derive from dailyUsage
  // dailyUsage expected shape: [{ date: 'YYYY-MM-DD', tester_type: 'Gen5 Tester', avg_usage_percent: 72.8 }, ...]
  // ============================================================
  const testerUsageLineData = useMemo(() => {
    if (!dailyUsage || dailyUsage.length === 0) return [];

    const map = {};
    dailyUsage.forEach((row) => {
      // normalize date to YYYY-MM-DD if needed
      const rawDate = row.date || row.day || row.Date || "";
      const day = typeof rawDate === "string" ? rawDate.slice(0, 10) : rawDate;

      if (!map[day]) {
        map[day] = { date: day, Gen3: 0, Gen5: 0 };
      }

      if (row.tester_type === "Gen5 Tester") {
        map[day].Gen5 = Number(row.avg_usage_percent ?? row.avg_usage ?? 0);
      } else if (row.tester_type === "Gen3 Tester") {
        map[day].Gen3 = Number(row.avg_usage_percent ?? row.avg_usage ?? 0);
      }
    });

    // Ensure sorted by date
    const arr = Object.values(map).sort((a, b) => (a.date > b.date ? 1 : -1));
    return arr;
  }, [dailyUsage]);

  return (
    <Container maxWidth={false} sx={{ px: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Usage Dashboard</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Overview of fixture usage by station, slot activity, and status distribution.
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
                  {widgets.total}
                </Typography>
              </Box>
            </Paper>

            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2">Status Snapshot</Typography>
                {Object.entries(widgets.byStatus).map(([k, v]) => (
                  <Box key={k} sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                    <Typography variant="body2">{k}</Typography>
                    <Typography variant="body2">
                      <b>{v}</b>
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* Station Usage (stacked bar) */}
        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Station Usage (LA + RA)</Typography>

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
                  <LineChart
                    data={stationLineData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20}}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="station" />
                    <YAxis />
                    <ReTooltip />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="LA"
                      name="LA Runs"
                      strokeWidth={3}
                      stroke="#1976d2"
                      dot={{ r:4 }}
                    />

                    <Line
                      type="monotype"
                      dataKey="RA"
                      name="RA Runs"
                      stroke="#2e7d32"
                      strokeWidth={3}
                      dot={{ r:4 }}
                    />
                  
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Slot / Fixture Status (pie) */}
        <Grid item xs={12} md={3} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Slot / Fixture Status</Typography>

            <Box
              sx={{
                width: 700,
                height: 450,
                mx: "auto",
                mt: 2,
                border: "2px solid #ddd",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "white",
              }}
            >
              {loading ? (
                <CircularProgress />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={80}
                      outerRadius={150}
                      paddingAngle={4}
                      label={(entry) => `${entry.name} (${entry.value})`}
                    >
                      {statusPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
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

        {/* NEW: Line Chart — Gen5 vs Gen3 Daily Usage */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Gen5 vs Gen3 Daily Usage (Last 7 days)</Typography>

            <Stack direction = "row" spacing={2} alignItems="center" sx={{  mt: 1}}>
              <Box>
                <Typography variant="caption">Start Date</Typography>
                <input
                  type="date"
                  value={startDate}
                  onChange={((e) => setStartDate(e.target.value))}
                  />
              </Box>

              <Box>
                <Typography variant="caption">End Date</Typography>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  />
              </Box>

              <IconButton
                color="primary"
                onClick={fetchDailyUsage}
                sx={{mt:2}}
              >

                <RefreshIcon />
              </IconButton>
            </Stack>

            <Box
              sx={{
                width: "100%",
                height: 400,
                mt: 2,
                border: "2px solid #ddd",
                borderRadius: 2,
                background: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {dailyLoading ? (
                <CircularProgress />
              ) : dailyError ? (
                <Typography color="error">{dailyError}</Typography>
              ) : testerUsageLineData.length === 0 ? (
                <Typography>No data</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={testerUsageLineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ReTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Gen5" name="Gen5 Tester" stroke="#1976d2" strokeWidth={3} />
                    <Line type="monotone" dataKey="Gen3" name="Gen3 Tester" stroke="#2e7d32" strokeWidth={3} />
                  </LineChart>
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
                <Tooltip title="Refresh now">
                  <IconButton
                    onClick={() => {
                      fetchSummary();
                      fetchDailyUsage(); // refresh both
                    }}
                    size="small"
                  >
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
                      <TableCell sx={{ minWidth: 200 }}>Fixture</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>LA Station</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>RA Station</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>LA GPU PN</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>RA GPU PN</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {usageData.map((row) => (
                      <TableRow key={row.fixture_id} hover>
                        <TableCell>{row.fixture_name || row.fixture_id}</TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color:
                                row.status === "Error"
                                  ? "#d32f2f"
                                  : row.status === "Testing"
                                  ? "#1976d2"
                                  : row.status === "Finished"
                                  ? "#2e7d32"
                                  : "#616161",
                            }}
                          >
                            {row.status}
                          </Typography>
                        </TableCell>
                        <TableCell>{field(row.slots?.LA, "test_station") || "-"}</TableCell>
                        <TableCell>{field(row.slots?.RA, "test_station") || "-"}</TableCell>
                        <TableCell>{field(row.slots?.LA, "gpu_pn") || "-"}</TableCell>
                        <TableCell>{field(row.slots?.RA, "gpu_pn") || "-"}</TableCell>
                        <TableCell>{row.notes || ""}</TableCell>
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
