import React, { useEffect, useState } from "react";
import { getAllUsage } from "../../services/api";

const UsagePage = () => {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await getAllUsage();
        setUsage(res.data);
      } catch (error) {
        console.error("Failed to fetch usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  if (loading) return <p>Loading Usage Data...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Usage Page</h2>
      <p>This page shows all fixtures and which tests they are currently running.</p>

      <ul>
        {usage.map((item) => (
          <li key={item.id}>
            <strong>Fixture:</strong> {item.fixtureName} &nbsp; | &nbsp;
            <strong>Running Test:</strong> {item.testName}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsagePage;
