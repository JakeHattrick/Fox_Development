// ============================================================================
// FixturesPage.js — Minimal Version (READ ONLY)
// Shows parent fixtures + child fixture parts using MRT detail panel
// ============================================================================

import React, { useState, useEffect, useMemo } from "react";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";

import {
  getFixtures
} from "../../services/api";

import { getFixtureParts } from "../../services/api";

import { Button } from "@mui/material";

// ============================================================================
// COMPONENT
// ============================================================================
const FixturesPage = () => {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  // ========================================================================
  // LOAD PARENT + CHILD DATA
  // ========================================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        const parentRes = await getFixtures();
        const childRes = await getFixtureParts();

        console.log("PARENT FIXTURES:", parentRes.data);
        console.log("CHILD FIXTURE PARTS:", childRes.data);

        const parents = parentRes.data || [];
        const children = childRes.data || [];

        // ---------------------------------------------------------------
        // MERGE CHILDREN WITH PARENTS
        // ---------------------------------------------------------------
        const merged = parents.map((p) => ({
          ...p,
          children: children.filter((c) => c.parent_fixture_id === p.id),
        }));

        console.log("MERGED RESULT:", merged);
        setFixtures(merged);
      } catch (err) {
        console.error("Error loading fixtures:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ========================================================================
  // PARENT COLUMNS (fixtures)
  // ========================================================================
  const parentColumns = useMemo(
    () => [
      { accessorKey: "fixture_name", header: "Fixture Name" },
      { accessorKey: "tester_type", header: "Tester Type" },
      { accessorKey: "rack", header: "Rack" },
      { accessorKey: "test_type", header: "Test Type" },
      { accessorKey: "ip_address", header: "IP" },
    ],
    []
  );

  // ========================================================================
  // CHILD COLUMNS (fixture_parts)
  // ========================================================================
  const childColumns = useMemo(
    () => [
      { accessorKey: "fixture_name", header: "Child Name" },
      { accessorKey: "tester_type", header: "Type" },
      { accessorKey: "fixture_sn", header: "Serial" },
      { accessorKey: "rack", header: "Rack" },
      { accessorKey: "ip_address", header: "IP" },
      { accessorKey: "mac_address", header: "MAC" },
    ],
    []
  );

  // ========================================================================
  // MRT INSTANCE
  // ========================================================================
  const table = useMaterialReactTable({
    columns: parentColumns,
    data: fixtures,
    enableExpanding: true,
    getSubRows: (row) => row.children, // <--- THIS MAKES CHILDREN SHOW
    renderDetailPanel: ({ row }) => {
      const children = row.original.children;
      if (!children?.length) return <div style={{ padding: 10 }}>No child parts</div>;

      return (
        <div style={{ padding: 10 }}>
          <MaterialReactTable
            columns={childColumns}
            data={children}
            enableTopToolbar={false}
            enableSorting={false}
            enablePagination={false}
            enableBottomToolbar={false}
          />
        </div>
      );
    },
    initialState: { expanded: true }, // show children by default
  });

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div style={{ padding: "20px" }}>
      <h2>Fixtures (Parent → Child)</h2>

      {loading && <p>Loading...</p>}

      <MaterialReactTable table={table} />
    </div>
  );
};

export default FixturesPage;
