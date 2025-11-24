// ============================================================================
// File: FixturesPage.js (Material React Table Version)
//
// PURPOSE:
//   Frontend page for displaying and managing 'fixtures' using Material React Table (MRT).
//   - Fully rewritten while keeping structure and logic.
//   - Supports full CRUD operations via API.
//   - Create fixture dialog supports dynamic Tester Type selection
//     and parent B Tester selection for LA/RA Slots.
//   - Selecting a Parent B Tester automatically fills IP, MAC, Rack, and Test Type.
//   - Test Type selection works correctly for B Tester; read-only for LA/RA Slots.
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getFixtures,
  createFixture,
  updateFixture,
  deleteFixture,
  getEligibleBTesters,
} from "../../services/api";

import { MaterialReactTable, useMaterialReactTable } from "material-react-table";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";

// ============================================================================
// COMPONENT
// ============================================================================
const FixturesPage = () => {
  // =====================================================
  // STATE
  // =====================================================
  const [fixtures, setFixtures] = useState([]);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  // Form state for new fixture
  const [newFixture, setNewFixture] = useState({
    test_type: "",
    fixture_name: "",
    fixture_sn: "",
    rack: "",
    ip_address: "",
    mac_address: "",
    creator: "",
    parent: null, // For LA/RA Slots
  });

  const [selectedTesterType, setSelectedTesterType] = useState("B Tester");
  const [parentOptions, setParentOptions] = useState([]);

  // =====================================================
  // FETCH FUNCTIONS
  // =====================================================
  const fetchFixtures = async () => {
    try {
      const res = await getFixtures();
      setFixtures(res.data);
    } catch (err) {
      console.error("Error fetching fixtures", err);
    }
  };

  // Fetch parent B Testers dynamically based on selected Tester Type (LA/RA)
  useEffect(() => {
    const fetchParents = async () => {
      if (selectedTesterType === "LA Slot" || selectedTesterType === "RA Slot") {
        try {
          const slot = selectedTesterType === "LA Slot" ? "LA" : "RA";
          const res = await getEligibleBTesters(slot);
          setParentOptions(res.data);
        } catch (err) {
          console.error("Error fetching parent B Testers:", err);
          setParentOptions([]);
        }
      } else {
        setParentOptions([]);
      }
    };
    fetchParents();
  }, [selectedTesterType]);

  useEffect(() => {
    fetchFixtures();
  }, []);

  // =====================================================
  // HANDLE CREATE
  // =====================================================
  const handleCreate = async () => {
    try {
      setError("");

      // Map frontend tester type to DB-compliant value
      const testerTypeDB =
        selectedTesterType === "LA Slot"
          ? "Left A Slot"
          : selectedTesterType === "RA Slot"
          ? "Right A Slot"
          : selectedTesterType; // B Tester stays the same

      const fixtureToCreate = {
        fixture_name: newFixture.fixture_name,
        fixture_sn: newFixture.fixture_sn,
        tester_type: testerTypeDB,
        test_type: newFixture.test_type,
        rack: newFixture.rack,
        ip_address: newFixture.ip_address,
        mac_address: newFixture.mac_address,
        creator: newFixture.creator,
        parent: selectedTesterType === "B Tester" ? null : newFixture.parent,
      };

      await createFixture(fixtureToCreate);

      // Refresh fixtures list
      fetchFixtures();

      // Reset form
      setNewFixture({
        test_type: "",
        fixture_name: "",
        fixture_sn: "",
        rack: "",
        ip_address: "",
        mac_address: "",
        creator: "",
        parent: null,
      });
      setSelectedTesterType("B Tester");
      setOpenCreate(false);
    } catch (err) {
      console.error("Create fixture error", err);
      setError(err.response?.data?.error || "Failed to create fixture");
    }
  };

  // =====================================================
  // HANDLE UPDATE
  // =====================================================
  const handleUpdate = async (id, updates) => {
    try {
      await updateFixture(id, updates);
      fetchFixtures();
    } catch (err) {
      console.error("Update fixture error", err);
    }
  };

  // =====================================================
  // HANDLE DELETE
  // =====================================================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this fixture?")) return;
    try {
      await deleteFixture(id);
      fetchFixtures();
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // =====================================================
  // MRT COLUMNS
  // =====================================================
  const columns = useMemo(
    () => [
      { accessorKey: "tester_type", header: "Tester Type" },
      { accessorKey: "fixture_name", header: "Name" },
      { accessorKey: "fixture_sn", header: "Serial" },
      { accessorKey: "rack", header: "Rack" },
      { accessorKey: "test_type", header: "Test Type" },
      { accessorKey: "ip_address", header: "IP" },
      { accessorKey: "mac_address", header: "MAC" },
      { accessorKey: "creator", header: "Creator" },
    ],
    []
  );

  // =====================================================
  // MRT INSTANCE
  // =====================================================
  const table = useMaterialReactTable({
    columns,
    data: fixtures,
    enableEditing: true,
    onEditingRowSave: async ({ values, row }) => {
      await handleUpdate(row.original.id, values);
    },
    renderRowActions: ({ row }) => (
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <Button size="small" variant="outlined" onClick={() => table.setEditingRow(row)}>
          <EditIcon fontSize="small" />
        </Button>
        <Button size="small" variant="outlined" onClick={() => handleDelete(row.original.id)}>
          <DeleteIcon fontSize="small" />
        </Button>
      </div>
    ),
    positionActionsColumn: "last",
    renderTopToolbarCustomActions: () => (
      <Button variant="contained" onClick={() => setOpenCreate(true)}>
        Create Fixture
      </Button>
    ),
  });

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div style={{ padding: "20px" }}>
      <h1>Fixtures</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <MaterialReactTable table={table} />

      {/* =====================================================
          CREATE FIXTURE DIALOG
      ===================================================== */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth>
        <DialogTitle>Create New Fixture</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>

          {/* TESTER TYPE SELECTION */}
          <FormControl fullWidth>
            <InputLabel>Tester Type</InputLabel>
            <Select
              value={selectedTesterType}
              onChange={(e) => setSelectedTesterType(e.target.value)}
            >
              <MenuItem value="B Tester">B Tester</MenuItem>
              <MenuItem value="LA Slot">LA Slot</MenuItem>
              <MenuItem value="RA Slot">RA Slot</MenuItem>
            </Select>
          </FormControl>

          {/* PARENT DROPDOWN FOR LA/RA SLOT */}
          {(selectedTesterType === "LA Slot" || selectedTesterType === "RA Slot") && (
            <FormControl fullWidth>
              <InputLabel>Select Parent B Tester</InputLabel>
              <Select
                value={newFixture.parent || ""}
                onChange={(e) => {
                  const selectedParentId = e.target.value;
                  const parent = parentOptions.find((p) => p.id === selectedParentId);
                  setNewFixture({
                    ...newFixture,
                    parent: selectedParentId,
                    ip_address: parent?.ip_address || "",
                    mac_address: parent?.mac_address || "",
                    rack: parent?.rack || "",
                    test_type: parent?.test_type || "",
                  });
                }}
              >
                {parentOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.fixture_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* COMMON FIELDS */}
          <TextField
            label="Fixture Name"
            value={newFixture.fixture_name}
            onChange={(e) => setNewFixture({ ...newFixture, fixture_name: e.target.value })}
          />
          <TextField
            label="Serial Number"
            value={newFixture.fixture_sn}
            onChange={(e) => setNewFixture({ ...newFixture, fixture_sn: e.target.value })}
          />
          <TextField
            label="Rack"
            value={newFixture.rack}
            InputProps={{ readOnly: selectedTesterType !== "B Tester" }}
            onChange={(e) => setNewFixture({ ...newFixture, rack: e.target.value })}
          />
          <TextField
            label="IP Address"
            value={newFixture.ip_address}
            InputProps={{ readOnly: selectedTesterType !== "B Tester" }}
            onChange={(e) => setNewFixture({ ...newFixture, ip_address: e.target.value })}
          />
          <TextField
            label="MAC Address"
            value={newFixture.mac_address}
            InputProps={{ readOnly: selectedTesterType !== "B Tester" }}
            onChange={(e) => setNewFixture({ ...newFixture, mac_address: e.target.value })}
          />
          <TextField
            label="Creator"
            value={newFixture.creator}
            onChange={(e) => setNewFixture({ ...newFixture, creator: e.target.value })}
          />

          {/* TEST TYPE */}
          {selectedTesterType === "B Tester" ? (
            <FormControl fullWidth>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={newFixture.test_type}
                onChange={(e) => setNewFixture({ ...newFixture, test_type: e.target.value })}
              >
                <MenuItem value="Refurbish">Refurbish</MenuItem>
                <MenuItem value="Sort">Sort</MenuItem>
                <MenuItem value="Debug">Debug</MenuItem>
              </Select>
            </FormControl>
          ) : (
            <TextField
              label="Test Type"
              value={newFixture.test_type || ""}
              InputProps={{ readOnly: true }}
            />
          )}

        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FixturesPage;
