// ======================================================================
// HEALTH PAGE 
// ======================================================================
// Notes:
// - All logic unchanged
// - Only documentation added
// ======================================================================

// ======================================================================
// A. IMPORTS
// ======================================================================
// React + hooks
import React, { useEffect, useMemo, useState, useCallback } from "react";

// MUI components used across layout and tables
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Grid,
  TextField,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Stack,
  Container,
} from "@mui/material";

// Icons
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";

// Recharts components — used for Pie + Line charts
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

// API service wrappers
import {
  getHealthSummaryAll,
  getAllHealth,
  getAllMaintenance,
  getHealthSummaryByFixture,
} from "../../../services/api";

// ======================================================================
// B. HELPER UTILITIES (colors, date formatting, aggregation)
// ======================================================================
// Map fixture statuses → consistent colors
const STATUS_COLORS = {
  active: "#2e7d32",
  no_response: "#d32f2f",
  under_maintenance: "#f57c00",
  RMA: "#616161",
  unknown: "#1976d2",
};

function colorForStatus(status) {
  // fallback ensures unknown/new statuses still get a color
  return STATUS_COLORS[status] || "#1976d2";
}

function scoreColor(score) {
  // MUI Chip color categories
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "error";
}

// Human‑friendly short date (M/D)
function shortDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// Build event count trend for last N days
function buildDailyCounts(events = [], days = 30) {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const map = new Map();

  // Pre‑populate date slots (ensures empty days still chart)
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(now - i * dayMs);
    const key = dt.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  // Count events
  for (const ev of events) {
    const created =
      ev.create_date ||
      ev.createDate ||
      ev.create_time ||
      ev.createAt ||
      ev.created_at;

    if (!created) continue;
    const dateKey = new Date(created).toISOString().slice(0, 10);
    if (map.has(dateKey)) map.set(dateKey, map.get(dateKey) + 1);
  }

  // Convert to chart‑friendly array
  return Array.from(map.entries()).map(([date, count]) => ({
    date,
    count,
    label: shortDate(date),
  }));
}

// ======================================================================
// C. MAIN COMPONENT — HealthPage
// ======================================================================
export default function HealthPage() {
  // ------------------------------------------------------------------
  // C1. State — core data
  // ------------------------------------------------------------------
  const [summary, setSummary] = useState([]); // health summary for all fixtures
  const [rawHealthEvents, setRawHealthEvents] = useState([]); // unfiltered events
  const [maintenanceEvents, setMaintenanceEvents] = useState([]); // maintenance logs

  const [loading, setLoading] = useState(true); // initial page load
  const [loadingDetail, setLoadingDetail] = useState(false); // modal load
  const [error, setError] = useState(""); // general fetch error

  // ------------------------------------------------------------------
  // C2. Auto‑refresh toggle
  // ------------------------------------------------------------------
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshIntervalMs] = useState(30000); // 30 seconds

  // ------------------------------------------------------------------
  // C3. Filters
  // ------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genTypeFilter, setGenTypeFilter] = useState("all");
  const [scoreRange, setScoreRange] = useState([0, 100]);

  // ------------------------------------------------------------------
  // C4. Detail modal state
  // ------------------------------------------------------------------
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFixtureId, setDetailFixtureId] = useState(null);
  const [detailFixture, setDetailFixture] = useState(null);
  const [detailEvents, setDetailEvents] = useState([]);
  const [detailMaintenance, setDetailMaintenance] = useState([]);

  // ==================================================================
  // D. DATA FETCHING
  // ==================================================================

  // Fetch all aggregated data for the main dashboard
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch all required datasets concurrently
      const [summaryRes, rawHealthRes, maintenanceRes] = await Promise.all([
        getHealthSummaryAll(),
        getAllHealth(),
        getAllMaintenance(),
      ]);

      // Defensive: ensure array
      setSummary(Array.isArray(summaryRes.data) ? summaryRes.data : []);
      setRawHealthEvents(Array.isArray(rawHealthRes.data) ? rawHealthRes.data : []);
      setMaintenanceEvents(Array.isArray(maintenanceRes.data) ? maintenanceRes.data : []);
    } catch (err) {
      console.error("Health fetch error:", err);
      setError(err?.message || "Failed to load health data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto‑refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchAll, refreshIntervalMs);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll, refreshIntervalMs]);

  // ==================================================================
  // E. DERIVED DATA (widgets, charts, filters)
  // ==================================================================

  // E1. KPI widgets (active count, avg health, etc.)
  const widgets = useMemo(() => {
    const total = summary.length;

    const counts = summary.reduce(
      (acc, s) => {
        const st = s.recent_status || "unknown";
        acc.byStatus[st] = (acc.byStatus[st] || 0) + 1;

        if (st === "active") acc.active++;
        if (st === "under_maintenance") acc.maintenance++;
        if (st === "no_response") acc.offline++;

        acc.sumScore += Number(s.health_score || 0);
        return acc;
      },
      { byStatus: {}, active: 0, maintenance: 0, offline: 0, sumScore: 0 }
    );

    return {
      total,
      active: counts.active,
      offline: counts.offline,
      maintenance: counts.maintenance,
      avgScore: total > 0 ? Math.round((counts.sumScore / total) * 10) / 10 : 0,
      capacityPercent: total > 0 ? Math.round((counts.active / total) * 100) : 0,
      byStatus: counts.byStatus,
    };
  }, [summary]);

  // E2. Pie chart data
  const statusPieData = useMemo(() => {
    const arr = [];
    Object.entries(widgets.byStatus).forEach(([status, count]) => {
      arr.push({ name: status, value: count, fill: colorForStatus(status) });
    });
    return arr.length ? arr : [{ name: "none", value: 1, fill: "#ccc" }];
  }, [widgets.byStatus]);

  // E3. Line Chart Trend (last 30 days)
  const uptimeTrend = useMemo(() => {
    return buildDailyCounts(rawHealthEvents, 30).map((d) => ({
      name: d.label,
      events: d.count,
    }));
  }, [rawHealthEvents]);

  // E4. Filtered summary for table
  const filteredSummary = useMemo(() => {
    return summary.filter((s) => {
      // Search by ID or name
      if (
        search &&
        !String(s.fixture_name || s.fixture_id)
          .toLowerCase()
          .includes(search.toLowerCase())
      ) return false;

      // Status filter
      if (statusFilter !== "all" && (s.recent_status || "unknown") !== statusFilter)
        return false;

      // Gen type
      if (genTypeFilter !== "all" && s.gen_type && s.gen_type !== genTypeFilter)
        return false;

      // Score range
      const score = Number(s.health_score || 0);
      if (score < scoreRange[0] || score > scoreRange[1]) return false;

      return true;
    });
  }, [summary, search, statusFilter, genTypeFilter, scoreRange]);

  // ==================================================================
  // F. DETAIL MODAL FETCH & HANDLING
  // ==================================================================

  const openDetail = async (fixtureId) => {
    setDetailOpen(true);
    setDetailFixtureId(fixtureId);
    setLoadingDetail(true);

    // Reset old data
    setDetailFixture(null);
    setDetailEvents([]);
    setDetailMaintenance([]);

    try {
      // Fetch fixture summary + global events/maintenance
      const [detailRes, allHealthRes, maintRes] = await Promise.all([
        getHealthSummaryByFixture(fixtureId),
        getAllHealth(),
        getAllMaintenance(),
      ]);

      // Fixture metadata
      const detailData = detailRes.data || detailRes;
      setDetailFixture(detailData);

      // Last 10 health events
      const allEvents = Array.isArray(allHealthRes.data) ? allHealthRes.data : [];
      const eventsFor = allEvents
        .filter((e) => e.fixture_id === fixtureId)
        .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
        .slice(0, 10);
      setDetailEvents(eventsFor);

      // Last 10 maintenance records
      const allMaint = Array.isArray(maintRes.data) ? maintRes.data : [];
      const maintFor = allMaint
        .filter((m) => m.fixture_id === fixtureId)
        .sort((a, b) => new Date(b.start_date_time) - new Date(a.start_date_time))
        .slice(0, 10);
      setDetailMaintenance(maintFor);
    } catch (err) {
      console.error("Detail fetch error:", err);
      setError("Failed to load fixture detail");
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailFixtureId(null);
    setDetailFixture(null);
    setDetailEvents([]);
    setDetailMaintenance([]);
  };

  // ==================================================================
  // G. RENDER — MAIN LAYOUT
  // ==================================================================

  const currentHealth = widgets.avgScore || 0;
  const currentUsage = widgets.capacityPercent || 0;

  return (
    <Container maxWidth={false} sx={{ px: 3 }}>
      {/* -------------------------------------------------------------- */}
      {/* Header */}
      {/* -------------------------------------------------------------- */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Fixture Health Dashboard</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Dashboard for monitoring fixture fleet — health scores, uptime trends and
          maintenance history.
        </Typography>
      </Box>

      <Grid container spacing={3}>

        {/* ============================================================= */}
        {/* KPI LEFT COLUMN */}
        {/* ============================================================= */}
        <Grid item xs={2} md={5} lg={5}>
          <Stack spacing={2}>
            {/* Current Health */}
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2">Current Health</Typography>
                <Typography
                  align="center"
                  variant="h4"
                  component="div"
                  color={
                    currentHealth > 90 ? "green" : currentHealth > 75 ? "orange" : "red"
                  }
                >
                  {currentHealth}%
                </Typography>
              </Box>
            </Paper>

            {/* Current Usage */}
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2">Current Usage</Typography>
                <Typography
                  align="center"
                  variant="h4"
                  component="div"
                  color={
                    currentUsage > 90 ? "red" : currentUsage > 75 ? "orange" : "green"
                  }
                >
                  {currentUsage}%
                </Typography>
              </Box>
            </Paper>

            {/* Summary counts */}
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2">Summary</Typography>
                <Typography variant="body2">
                  Total fixtures: <b>{widgets.total}</b>
                </Typography>
                <Typography variant="body2">
                  Active: <b>{widgets.active}</b>
                </Typography>
                <Typography variant="body2">
                  Offline: <b>{widgets.offline}</b>
                </Typography>
                <Typography variant="body2">
                  Maintenance: <b>{widgets.maintenance}</b>
                </Typography>
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* ============================================================= */}
        {/* LINE CHART — Uptime Trend */}
        {/* ============================================================= */}
        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">
              Uptime/Event Trend (last 30 days)
            </Typography>

            {/* Large bordered rectangle container */}
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={uptimeTrend}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke="#1976d2"
                    dot={false}
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* ============================================================= */}
        {/* PIE CHART — Status Distribution */}
        {/* ============================================================= */}
        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Status Distribution</Typography>

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
            </Box>
          </Paper>
        </Grid>

        {/* ============================================================= */}
        {/* TABLE SECTION — Filter + Fixture List */}
        {/* ============================================================= */}
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
            {/* Header row: title + refresh */}
            <Grid
              container
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Grid item>
                <Typography variant="h6">Fixtures</Typography>
              </Grid>

              <Grid item>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Refresh now">
                    <IconButton onClick={fetchAll} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                      />
                    }
                    label="Auto-refresh 30s"
                    labelPlacement="start"
                    sx={{ mr: 0 }}
                  />
                </Stack>
              </Grid>
            </Grid>

            {/* Filters Row */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                {/* Search */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Search by name or ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                  />
                </Grid>

                {/* Status filter */}
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="no_response">No Response</MenuItem>
                      <MenuItem value="under_maintenance">Under Maintenance</MenuItem>
                      <MenuItem value="RMA">RMA</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Gen Type filter */}
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="gentype-label">Gen Type</InputLabel>
                    <Select
                      labelId="gentype-label"
                      value={genTypeFilter}
                      label="Gen Type"
                      onChange={(e) => setGenTypeFilter(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="Gen3 B Tester">Gen3 B Tester</MenuItem>
                      <MenuItem value="Gen5 B Tester">Gen5 B Tester</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Score range filter */}
                <Grid item xs={12} md={4}>
                  <Typography variant="caption">Health Score Range</Typography>
                  <Slider
                    value={scoreRange}
                    onChange={(e, v) => setScoreRange(v)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={100}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Main table */}
            <Box
              sx={{
                width: "100%",
                height: "600px",
                overflow: "auto",
              }}
            >
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
                      <TableCell sx={{ minWidth: 140 }}>Uptime %</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>Days Since Maint</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>Score</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filteredSummary.map((row) => (
                      <TableRow key={row.fixture_id} hover>
                        <TableCell>{row.fixture_name || row.fixture_id}</TableCell>

                        <TableCell>
                          <Chip
                            label={row.recent_status || "unknown"}
                            size="small"
                            sx={{
                              backgroundColor: colorForStatus(row.recent_status),
                              color: "white",
                            }}
                          />
                        </TableCell>

                        <TableCell>{row.uptime_percentage}%</TableCell>
                        <TableCell>{row.last_maintenance_days}</TableCell>

                        <TableCell>
                          <Chip
                            label={row.health_score}
                            color={scoreColor(row.health_score)}
                          />
                        </TableCell>

                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openDetail(row.fixture_id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ============================================================= */}
      {/* DETAIL MODAL */}
      {/* ============================================================= */}
      <Dialog fullWidth maxWidth="md" open={detailOpen} onClose={closeDetail}>
        <DialogTitle>
          Fixture Detail
          <IconButton
            aria-label="close"
            onClick={closeDetail}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loadingDetail ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : detailFixture ? (
            <>
              <Grid container spacing={2}>
                {/* Left column: basic info */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">
                    {detailFixture.fixture_name || detailFixture.fixture_id}
                  </Typography>

                  <Chip
                    label={detailFixture.recent_status}
                    sx={{
                      backgroundColor: colorForStatus(detailFixture.recent_status),
                      color: "white",
                      mt: 1,
                    }}
                  />

                  <Typography sx={{ mt: 1 }}>
                    Health Score: <b>{detailFixture.health_score}</b>
                  </Typography>
                  <Typography>
                    Uptime: <b>{detailFixture.uptime_percentage}%</b>
                  </Typography>
                  <Typography>
                    Days Since Maintenance: <b>{detailFixture.last_maintenance_days}</b>
                  </Typography>
                </Grid>

                {/* Right column: recent health events */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Recent Health Events</Typography>
                  <Divider sx={{ mb: 1 }} />

                  {detailEvents.length === 0 ? (
                    <Typography>No recent events</Typography>
                  ) : (
                    detailEvents.map((ev) => (
                      <Paper key={ev.id} sx={{ p: 1, mb: 1 }}>
                        <Typography variant="body2">
                          <b>{ev.status}</b> — {ev.comments || "No comment"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ev.create_date
                            ? new Date(ev.create_date).toLocaleString()
                            : ""}
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Grid>

                {/* Maintenance history */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Maintenance History
                  </Typography>
                  <Divider sx={{ mb: 1 }} />

                  {detailMaintenance.length === 0 ? (
                    <Typography>No maintenance history</Typography>
                  ) : (
                    detailMaintenance.map((m) => (
                      <Paper key={m.id} sx={{ p: 1, mb: 1 }}>
                        <Typography variant="body2">
                          <b>{m.event_type}</b> — {m.comments || "No comments"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.start_date_time
                            ? new Date(m.start_date_time).toLocaleString()
                            : "N/A"}
                          {m.end_date_time
                            ? ` — ${new Date(m.end_date_time).toLocaleString()}`
                            : ""}
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Grid>
              </Grid>
            </>
          ) : (
            <Typography>No detail found</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDetail}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
