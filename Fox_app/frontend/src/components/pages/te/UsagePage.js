import React, { useEffect, useState } from "react";
import { getUsage } from "../../../services/api";


export default function UsagePage() {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUsage()
      .then((res) => {
        setUsage(res.data || res);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load usage data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading usage data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Usage</h2>
      <ul>
        {usage.map((u) => (
          <li key={u.id}>{u.usage_type}</li>
        ))}
      </ul>
    </div>
  );
}
