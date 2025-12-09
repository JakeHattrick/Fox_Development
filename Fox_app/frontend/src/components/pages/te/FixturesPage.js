import React, { useEffect, useState } from "react";
import { getFixtures } from "../../../services/api";


export default function FixturesPage() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getFixtures()
      .then((res) => {
        setFixtures(res.data || res); 
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load fixtures");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading fixtures...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Fixtures</h2>
      <ul>
        {fixtures.map((fx) => (
          <li key={fx.id}>{fx.fixture_name}</li>
        ))}
      </ul>
    </div>
  );
}
