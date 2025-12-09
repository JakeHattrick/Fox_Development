import React, { useEffect, useState } from "react";
import {
  getFixtures,
  getUsers,
  getHealth,
  getUsage,
  getMaintenance,
} from "../../../services/api";


export default function SummaryPage() {
  const [summary, setSummary] = useState({
    fixtures: [],
    users: [],
    health: [],
    usage: [],
    maintenance: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getFixtures(),
      getUsers(),
      getHealth(),
      getUsage(),
      getMaintenance(),
    ])
      .then(([fx, us, hl, usg, mtc]) => {
        setSummary({
          fixtures: fx.data || fx,
          users: us.data || us,
          health: hl.data || hl,
          usage: usg.data || usg,
          maintenance: mtc.data || mtc,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Summary error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading summary...</p>;

  return (
    <div>
      <h2>Summary</h2>
      <p>Total Fixtures: {summary.fixtures.length}</p>
      <p>Total Users: {summary.users.length}</p>
      <p>Health Items: {summary.health.length}</p>
      <p>Usage Records: {summary.usage.length}</p>
      <p>Maintenance Records: {summary.maintenance.length}</p>
    </div>
  );
}
