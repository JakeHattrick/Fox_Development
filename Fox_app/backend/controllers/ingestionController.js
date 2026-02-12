const ingestionService = require('../services/ingestionService');

exports.receivePayload = async (req, res) => {
  console.log('============================');
  console.log('Incoming ingestion payload:', req.body);
  console.log('Headers:', req.headers);
  console.log('============================');

  // fallback if id or received_at is missing
  const record = {
    id: req.body.id || require('uuid').v4(),
    received_at: req.body.received_at || new Date().toISOString(),
    payload: req.body.payload || req.body
  };

  try {
    await ingestionService.insertEvent(record);
    res.status(200).json({ success: true, id: record.id });
  } catch (err) {
    console.error('Failed to ingest payload:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
