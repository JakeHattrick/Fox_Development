import React, { useEffect, useState } from "react";
import { getMaintenance } from "../../../services/api";


export default function MaintenancePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMaintenance()
      .then((res) => {
        setItems(res.data || res);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load maintenance data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading maintenance...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Maintenance</h2>
      <ul>
        {items.map((m) => (
          <li key={m.id}>{m.fixture_id}</li>
        ))}
      </ul>
    </div>
  );
}
