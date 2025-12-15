// FixturesPage.js
// ======================================================================
// Parent (fixtures) + Child (fixture_parts) MRT tables
// Fixed: Save button unclickable (z-index + overlay capture bug) + edit cloning
// ======================================================================

import React, { useState, useEffect, useMemo } from "react";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";

import {
  getFixtures,
  getFixtureParts,
  createFixture,
  createFixtureParts,
  updateFixture,
  updateFixtureParts,
  deleteFixture,
  deleteFixtureParts,
} from "../../../services/api";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";

const FixturesPage = () => {
  // ======================================================================
  // STATE
  // ======================================================================
  const [fixtures, setFixtures] = useState([]);
  const [fixtureParts, setFixtureParts] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [openCreateFixture, setOpenCreateFixture] = useState(false);
  const [openCreateFixturePart, setOpenCreateFixturePart] = useState(false);

  const [newFixture, setNewFixture] = useState({
    fixture_name: "",
    rack: "",
    fixture_sn: "",
    test_type: "",
    gen_type: "",
    ip_address: "",
    mac_address: "",
    creator: "",
  });

  const [newFixturePart, setNewFixturePart] = useState({
    parent_fixture_id: "",
    tester_type: "",
    fixture_name: "",
    fixture_sn: "",
    gen_type: "",
    test_type: "",
    ip_address: "",
    mac_address: "",
    rack: "",
    creator: "",
  });

  // ======================================================================
  // LOAD DATA
  // ======================================================================
  const loadData = async () => {
    try {
      const f = await getFixtures();
      const fp = await getFixtureParts();
      setFixtures(f.data);
      setFixtureParts(fp.data);
    } catch (err) {
      console.error("Error loading fixtures:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ======================================================================
// FILTER LOGIC FOR PARENT FIXTURE SELECTION BASED ON TESTER TYPE
// ======================================================================
const filteredParentFixtures = useMemo(() => {
  const testerType = newFixturePart.tester_type;

  if (!testerType) return fixtures; // nothing selected yet → show all

  return fixtures.filter((fx) => {
    const children = fixtureParts.filter((p) => p.parent_fixture_id === fx.id);

    const hasLA = children.some((p) => p.tester_type === "LA Slot");
    const hasRA = children.some((p) => p.tester_type === "RA Slot");

    // CASE: selecting LA Slot child
    if (testerType === "LA Slot") {
      return (
        children.length === 0 || // no children → OK
        (hasRA && !hasLA)        // has RA but no LA → OK
      );
    }

    // CASE: selecting RA Slot child
    if (testerType === "RA Slot") {
      return (
        children.length === 0 || // no children → OK
        (hasLA && !hasRA)        // has LA but no RA → OK
      );
    }

    return true;
  });
}, [fixtures, fixtureParts, newFixturePart.tester_type]);


  // ======================================================================
  // EDIT LOGIC
  // ======================================================================
  // IMPORTANT: clone the object when editing so React detects changes
  const handleEditFixture = (fixture) => {
    setEditMode("fixture");
    setSelectedItem({ ...fixture }); // clone to avoid mutating MRT internal object
    setOpenDialog(true);
  };

  const handleEditFixturePart = (part) => {
    setEditMode("fixturePart");
    setSelectedItem({ ...part }); // clone to avoid mutating MRT internal object
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (!selectedItem) return; // safety
      if (editMode === "fixture") {
        await updateFixture(selectedItem.id, selectedItem);
      } else {
        await updateFixtureParts(selectedItem.id, selectedItem);
      }
      setOpenDialog(false);
      setSelectedItem(null);
      loadData();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // ======================================================================
  // DELETE LOGIC
  // ======================================================================
  const handleDeleteFixture = async (id) => {
    if (!window.confirm("Delete this fixture?")) return;
    await deleteFixture(id);
    loadData();
  };

  const handleDeleteFixturePart = async (id) => {
    if (!window.confirm("Delete this fixture part?")) return;
    await deleteFixtureParts(id);
    loadData();
  };

  // ======================================================================
  // CREATE FIXTURE
  // ======================================================================
  const handleCreateFixture = async () => {
    try {
      await createFixture(newFixture);
      setOpenCreateFixture(false);

      setNewFixture({
        fixture_name: "",
        rack: "",
        fixture_sn: "",
        test_type: "",
        gen_type: "",
        ip_address: "",
        mac_address: "",
        creator: "",
      });

      loadData();
    } catch (err) {
      console.error("Create fixture error:", err);
    }
  };

  // ======================================================================
  // CREATE FIXTURE PART
  // ======================================================================
  const handleFixturePartChange = (e) => {
    const { name, value } = e.target;
    setNewFixturePart((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateFixturePart = async () => {
    if (!newFixturePart.parent_fixture_id) {
      alert("Select a parent fixture first.");
      return;
    }

    try {
      await createFixtureParts(newFixturePart);
      setOpenCreateFixturePart(false);

      setNewFixturePart({
        parent_fixture_id: "",
        tester_type: "",
        fixture_name: "",
        fixture_sn: "",
        gen_type: "",
        test_type: "",
        ip_address: "",
        mac_address: "",
        rack: "",
        creator: "",
      });

      loadData();
    } catch (err) {
      console.error("Create fixture part error:", err);
    }
  };

  // ======================================================================
  // AUTO-FILL CHILD WHEN PARENT SELECTED
  // ======================================================================
  const handleSelectParent = (parentId) => {
    const parent = fixtures.find((f) => f.id === parentId);
    if (!parent) return;

    setNewFixturePart((prev) => ({
      ...prev,
      parent_fixture_id: parentId,
      fixture_name: parent.fixture_name,
      fixture_sn: parent.fixture_sn,
      gen_type: parent.gen_type,
      test_type: parent.test_type,
      ip_address: parent.ip_address,
      mac_address: parent.mac_address,
      rack: parent.rack,
    }));
  };

  // ======================================================================
  // COLUMNS: FIXTURES
  // ======================================================================
  const fixtureColumns = useMemo(
    () => [
      { header: "Fixture Name", accessorKey: "fixture_name" },
      { header: "Rack", accessorKey: "rack" },
      { header: "Gen Type", accessorKey: "gen_type" },
      { header: "Serial Number", accessorKey: "fixture_sn" },
      { header: "Test Type", accessorKey: "test_type" },
      { header: "IP Address", accessorKey: "ip_address" },
      { header: "MAC Address", accessorKey: "mac_address" },
      { header: "Creator", accessorKey: "creator" },

      {
        header: "Actions",
        accessorKey: "id",
        Cell: ({ row }) => (
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="contained"
              type="button" 
              size="small"
              onClick={() => handleEditFixture(row.original)}
            >
              Edit
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => handleDeleteFixture(row.original.id)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  // ======================================================================
  // COLUMNS: FIXTURE PARTS
  // ======================================================================
  const partsColumns = [
    { header: "Fixture Part Name", accessorKey: "fixture_name" },
    { header: "Tester Type", accessorKey: "tester_type" },
    { header: "Gen Type", accessorKey: "gen_type" },
    { header: "Serial Number", accessorKey: "fixture_sn" },
    { header: "Test Type", accessorKey: "test_type" },
    { header: "IP Address", accessorKey: "ip_address" },
    { header: "MAC Address", accessorKey: "mac_address" },
    { header: "Creator", accessorKey: "creator" },

    {
      header: "Actions",
      accessorKey: "id",
      Cell: ({ row }) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleEditFixturePart(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => handleDeleteFixturePart(row.original.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // ======================================================================
  // MRT TABLE CONFIG
  // ======================================================================
  const table = useMaterialReactTable({
    columns: fixtureColumns,
    data: fixtures,
    enableExpanding: true,

    getSubRows: (parent) =>
      fixtureParts.filter((child) => child.parent_fixture_id === parent.id),

    renderDetailPanel: ({ row }) => {
      const children = fixtureParts.filter(
        (p) => p.parent_fixture_id === row.original.id
      );

      return (
        <MaterialReactTable
          columns={partsColumns}
          data={children}
          enablePagination={false}
          enableColumnActions={false}
          enableSorting={false}
          enableTopToolbar={false}
        />
      );
    },
  });

  // ======================================================================
  // RENDER
  // ======================================================================
  return (
  <div style={{ padding: "20px" }}>
    {/* FIX: Force dialog above MRT overlays */}
    <style>
      {`
        .MuiDialog-root {
          z-index: 999999 !important;
        }

        /* FIX: force MUI Select menus above dialogs and MRT overlays */
        .MuiPopover-root,
        .MuiMenu-root {
           z-index: 1000000 !important;
        }
      `}
    </style>

    <h2>Fixtures </h2>

    {/* CREATE BUTTONS */}
    <div style={{ marginBottom: "15px", display: "flex", gap: "10px" }}>
      <Button variant="contained" onClick={() => setOpenCreateFixture(true)}>
        + Create Fixture
      </Button>


        <Button
          variant="contained"
          color="secondary"
          onClick={() => setOpenCreateFixturePart(true)}
        >
          + Create Fixture Part
        </Button>
      </div>

      {/* IMPORTANT FIX: z-index wrapper so dialogs are clickable above MRT overlays */}
      <div style={{ position: "relative", zIndex: 0 }}>
        <MaterialReactTable table={table} />
      </div>

      {/* CREATE FIXTURE */}
      <Dialog
        open={openCreateFixture}
        onClose={() => setOpenCreateFixture(false)}
        fullWidth
        slotProps={{ paper: { sx: { zIndex: 999999 } } }}
      >
        <DialogTitle>Create Fixture</DialogTitle>

        <DialogContent>
          <TextField
            margin="dense"
            label="Fixture Name"
            fullWidth
            value={newFixture.fixture_name}
            onChange={(e) =>
              setNewFixture({ ...newFixture, fixture_name: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Rack"
            fullWidth
            value={newFixture.rack}
            onChange={(e) => setNewFixture({ ...newFixture, rack: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Serial Number"
            fullWidth
            value={newFixture.fixture_sn}
            onChange={(e) =>
              setNewFixture({ ...newFixture, fixture_sn: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Test Type"
            fullWidth
            value={newFixture.test_type}
            onChange={(e) =>
              setNewFixture({ ...newFixture, test_type: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Gen Type"
            fullWidth
            value={newFixture.gen_type}
            onChange={(e) =>
              setNewFixture({ ...newFixture, gen_type: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="IP Address"
            fullWidth
            value={newFixture.ip_address}
            onChange={(e) =>
              setNewFixture({ ...newFixture, ip_address: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="MAC Address"
            fullWidth
            value={newFixture.mac_address}
            onChange={(e) =>
              setNewFixture({ ...newFixture, mac_address: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Creator"
            fullWidth
            value={newFixture.creator}
            onChange={(e) =>
              setNewFixture({ ...newFixture, creator: e.target.value })
            }
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreateFixture(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFixture}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* CREATE FIXTURE PART */}
      <Dialog
        open={openCreateFixturePart}
        onClose={() => setOpenCreateFixturePart(false)}
        fullWidth
        slotProps={{ paper: { sx: { zIndex: 99999 } } }}
      >
        <DialogTitle>Create Fixture Part</DialogTitle>

        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel id="tester-type-label">Tester Type</InputLabel>
            <Select
              labelId="tester-type-label"
              name="tester_type"
              label="Tester Type"
              value={newFixturePart.tester_type}
              onChange={handleFixturePartChange}
            >
              <MenuItem value="LA Slot">LA Slot</MenuItem>
              <MenuItem value="RA Slot">RA Slot</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>Select Parent Fixture</InputLabel>
            <Select
              value={newFixturePart.parent_fixture_id}
              label="Select Parent Fixture"
              onChange={(e) => handleSelectParent(e.target.value)}
            >
              {filteredParentFixtures.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.fixture_name}
                </MenuItem>
              ))}

            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="Fixture Part Name"
            fullWidth
            value={newFixturePart.fixture_name}
            onChange={(e) =>
              setNewFixturePart({
                ...newFixturePart,
                fixture_name: e.target.value,
              })
            }
          />

          <TextField
            margin="dense"
            label="Gen Type"
            fullWidth
            value={newFixturePart.gen_type}
            InputProps={{ readOnly: true }}
          />
          <TextField
            margin="dense"
            label="Serial Number"
            fullWidth
            value={newFixturePart.fixture_sn}
            InputProps={{ readOnly: true }}
          />
          <TextField
            margin="dense"
            label="Test Type"
            fullWidth
            value={newFixturePart.test_type}
            InputProps={{ readOnly: true }}
          />
          <TextField
            margin="dense"
            label="IP Address"
            fullWidth
            value={newFixturePart.ip_address}
            InputProps={{ readOnly: true }}
          />
          <TextField
            margin="dense"
            label="MAC Address"
            fullWidth
            value={newFixturePart.mac_address}
            InputProps={{ readOnly: true }}
          />
          <TextField
            margin="dense"
            label="Rack"
            fullWidth
            value={newFixturePart.rack}
            InputProps={{ readOnly: true }}
          />

          <TextField
            margin="dense"
            label="Creator"
            fullWidth
            value={newFixturePart.creator}
            onChange={(e) =>
              setNewFixturePart({
                ...newFixturePart,
                creator: e.target.value,
              })
            }
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreateFixturePart(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFixturePart}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedItem(null);
        }}
        fullWidth
        slotProps={{ paper: { sx: { zIndex: 99999 } } }}
      >

        <DialogTitle>
          {editMode === "fixture" ? "Edit Fixture" : "Edit Fixture Part"}
        </DialogTitle>

        <DialogContent>
          {selectedItem && editMode === "fixture" && (
            <>
              <TextField
                margin="dense"
                label="Fixture Name"
                fullWidth
                value={selectedItem.fixture_name || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, fixture_name: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Rack"
                fullWidth
                value={selectedItem.rack || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, rack: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Gen Type"
                fullWidth
                value={selectedItem.gen_type || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, gen_type: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Serial Number"
                fullWidth
                value={selectedItem.fixture_sn || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, fixture_sn: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Test Type"
                fullWidth
                value={selectedItem.test_type || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, test_type: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="IP Address"
                fullWidth
                value={selectedItem.ip_address || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, ip_address: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="MAC Address"
                fullWidth
                value={selectedItem.mac_address || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, mac_address: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Creator"
                fullWidth
                value={selectedItem.creator || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, creator: e.target.value }))
                }
              />
            </>
          )}

          {selectedItem && editMode === "fixturePart" && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel id="edit-tester-type-label">Tester Type</InputLabel>
                <Select
                  labelId="edit-tester-type-label"
                  name="tester_type"
                  label="Tester Type"
                  value={selectedItem.tester_type || ""}
                  onChange={(e) =>
                    setSelectedItem((prev) => ({ ...prev, tester_type: e.target.value }))
                  }
                >
                  <MenuItem value="LA Slot">LA Slot</MenuItem>
                  <MenuItem value="RA Slot">RA Slot</MenuItem>
                </Select>
              </FormControl>

              <TextField
                margin="dense"
                label="Fixture Part Name"
                fullWidth
                value={selectedItem.fixture_name || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, fixture_name: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Gen Type"
                fullWidth
                value={selectedItem.gen_type || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, gen_type: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Serial Number"
                fullWidth
                value={selectedItem.fixture_sn || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, fixture_sn: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Test Type"
                fullWidth
                value={selectedItem.test_type || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, test_type: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="IP Address"
                fullWidth
                value={selectedItem.ip_address || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, ip_address: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="MAC Address"
                fullWidth
                value={selectedItem.mac_address || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, mac_address: e.target.value }))
                }
              />

              <TextField
                margin="dense"
                label="Creator"
                fullWidth
                value={selectedItem.creator || ""}
                onChange={(e) =>
                  setSelectedItem((prev) => ({ ...prev, creator: e.target.value }))
                }
              />
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button
          type="button" 
            onClick={() => {
              setOpenDialog(false);
              setSelectedItem(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            // keep clickable — state updates above ensure selectedItem changes are detected
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FixturesPage;
