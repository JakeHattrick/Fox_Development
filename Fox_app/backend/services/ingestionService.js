const { pool } = require('../db');

exports.insertEvent = async ({
  id,
  source,
  received_at,
  event_type,
  payload,
  status
}) => {
  const query = `
    INSERT INTO ingestion_events (
      id,
      source,
      received_at,
      event_type,
      payload,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  const values = [
    id,
    source,
    received_at,
    event_type,
    payload,
    status
  ];

  await pool.query(query, values);
};
