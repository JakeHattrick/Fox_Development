// ============================================================================
// File: UsageSummaryPage.js
//
// PURPOSE:
//   Usage dashboard styled to match HealthPage:
//    - KPI area (small)
//    - Big bordered Station-based stacked bar chart (LA + RA)
//    - Big bordered Pie chart (status distribution)
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
import { getUsageSummaryAll } from "../../services/api";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
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
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch data
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

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

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
  // ⭐ Station-based stacked bar chart (LA vs RA)
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

        {/* ⭐ Stacked Bar Chart (station usage) */}
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
                  <BarChart
                    data={stationLineData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="station" type="category" width={100} />
                    <ReTooltip />
                    <Legend />

                    <Bar dataKey="LA" stackId="usage" name="LA Runs" fill="#1976d2" />
                    <Bar dataKey="RA" stackId="usage" name="RA Runs" fill="#2e7d32" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Pie Chart */}
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
                  <IconButton onClick={fetchSummary} size="small">
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
