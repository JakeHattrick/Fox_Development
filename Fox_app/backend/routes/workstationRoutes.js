const express = require('express');
const router = express.Router();
const { pool } = require('../db.js');

// Get workstation times
// Group by serial number and workstationnames
router.post('/station-times', async (req, res) => {
    try {
        const { sns } = req.body;
        if (!sns || !Array.isArray(sns) || sns.length === 0 ) {
            return res.status(400).json({ error: 'Missing or invalid sns array in request body' });
        }
        const query = `
            SELECT 
                sn,
                workstation_name,
                SUM(EXTRACT(EPOCH FROM (history_station_end_time - history_station_start_time))) / 3600.0::double precision AS "total_time"
            FROM workstation_master_log
            WHERE sn = ANY($1)
            GROUP BY sn, workstation_name
            ORDER BY sn, workstation_name;
        `;
        const params = [sns];
        const result = await pool.query(query,params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/filtered-yields', async (req, res) => {
    try {
        let { dates, sns } = req.body;

        
        if (typeof dates === 'string') dates = dates.split(',').map(s => s.trim()).filter(Boolean);

        if (!Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({ error: 'Missing required query parameters: dates' });
        }
        
        if (typeof sns === 'string') {
            sns = sns.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (!sns || !Array.isArray(sns) || sns.length === 0 ) {
            return res.status(400).json({ error: 'Missing or invalid sns array in request body' });
        }
        const query = `
            SELECT
                Model,
                SUM(CASE WHEN LOWER(workstation_name) = 'assy2' THEN 1 ELSE 0 END) AS ASSY2,
                SUM(CASE WHEN LOWER(workstation_name) = 'fla' THEN 1 ELSE 0 END) AS FLA,
                SUM(CASE WHEN LOWER(workstation_name) = 'fct' THEN 1 ELSE 0 END) AS FCT,
                ROUND(
                    SUM(CASE WHEN LOWER(workstation_name) = 'assy2' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(SUM(CASE WHEN LOWER(workstation_name) = 'fla' THEN 1 ELSE 0 END), 0),
                2) AS test_yield_FLA,
                ROUND(
                    SUM(CASE WHEN LOWER(workstation_name) = 'assy2' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(SUM(CASE WHEN LOWER(workstation_name) = 'fct' THEN 1 ELSE 0 END), 0),
                2) AS test_yield_FCT
            FROM workstation_master_log
            WHERE history_station_end_time::date = ANY($1::date[])
            AND sn = ANY($2::text[])
            group by model;
        `;
        const params = [dates, sns];
        const result = await pool.query(query,params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;