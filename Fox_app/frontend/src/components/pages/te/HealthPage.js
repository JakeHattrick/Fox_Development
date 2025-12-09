import React, { useEffect, useState } from "react";
import { getHealth } from "../../../services/api";


export default function HealthPage() {
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth()
      .then((res) => {
        setHealth(res.data || res);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load health data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading health data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Health Status</h2>
      <ul>
        {health.map((h) => (
          <li key={h.id}>{h.status}</li>
        ))}
      </ul>
    </div>
  );
}
