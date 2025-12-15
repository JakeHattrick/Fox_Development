const express = require('express');
const router = express.Router();
const { pool } = require('../db.js');

router.get('/hulk-smash', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                  *
            FROM testboard_master_log
            LIMIT 1;`
        );
        
        res.json(result.rows);
    } catch (error) {
    }
});

router.post('/most-recent-fail', async (req, res) => {
  try {
    const { sns,startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: 'Missing required query parameters: startDate, endDate' });
    }
    if (!Array.isArray(sns) || sns.length === 0) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid sns array in request body' });
    }

    const query = `
      SELECT DISTINCT ON (sn)
        sn,
        failure_reasons AS error_code,
        history_station_start_time AS fail_time
      FROM testboard_master_log
      WHERE sn = ANY($1)
        AND history_station_start_time >= $2
        AND history_station_end_time <= $3
        AND history_station_passing_status = 'Fail'
      ORDER BY
        sn,
        history_station_start_time DESC;
    `;

    const params = [sns, startDate, endDate];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('most-recent-fail error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/pass-check', async (req, res) => {
  try {
    const { sns,startDate, endDate,passCheck } = req.body;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: 'Missing required query parameters: startDate, endDate' });
    }
    if (!Array.isArray(sns) || sns.length === 0) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid sns array in request body' });
    }
    if(!passCheck){
      return res.status(400).json({error: ' Missing require query parameters: passCheck'});
    }

    const query = `
      SELECT DISTINCT ON (sn)
        sn,
        history_station_start_time AS pass_time
      FROM testboard_master_log
      WHERE sn = ANY($1)
        AND history_station_start_time >= $2
        AND history_station_end_time <= $3
        AND history_station_passing_status = 'Pass'
        AND workstation_name = ANY($4)
      ORDER BY
        sn,
        history_station_start_time DESC;
    `;

    const params = [sns, startDate, endDate, passCheck];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('pass-check:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/sn-check', async (req, res) => {
  try {
    const { sns,startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: 'Missing required query parameters: startDate, endDate' });
    }
    if (!Array.isArray(sns) || sns.length === 0) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid sns array in request body' });
    }

    const query = `
      SELECT DISTINCT ON (sn)
        sn,
        history_station_start_time AS pass_time
      FROM testboard_master_log
      WHERE sn = ANY($1)
        AND history_station_start_time >= $2
        AND history_station_end_time <= $3
      ORDER BY
        sn,
        history_station_start_time DESC;
    `;

    const params = [sns, startDate, endDate];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('sn-check:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/by-error', async (req, res) => {
  try {
    const { checkArray,startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: 'Missing required query parameters: startDate, endDate' });
    }
    if (!Array.isArray(checkArray) || checkArray.length === 0) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid error code array in request body' });
    }

    const query = `
      SELECT 
        sn,
        pn,
        failure_reasons as error_code
      FROM testboard_master_log
      WHERE failure_reasons = ANY($1)
        AND history_station_start_time >= $2
        AND history_station_end_time <= $3
      ORDER BY
        failure_reasons,
        pn,
        history_station_start_time DESC;
    `;

    const params = [checkArray, startDate, endDate];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('by-error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/daily-usage', async (req,res) => {
  try {
    const { startDate, endDate} = req.body;

    if(!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate are required"
      });
    }

    const query = `
      WITH fixed AS (
        SELECT
          fixture_no,
          DATE (history_station_start_time) AS date,
          history_station_start_time AS start_time,
          history_station_end_time AS end_time,
          LAG (history_station_end_time) OVER (
              PARTITION BY fixture_no
              ORDER BY history_station_start_time
          ) AS prev_end
          FROM testboard_master_log 
      ),
      calc_start AS (
        SELECT
          date,
          fixture_no,
          start_time,
          end_time,
          CASE
            WHEN prev_end IS NULL OR start_time > prev_end
              THEN start_time
            ELSE LEAST (prev_end, end_time)
          END AS real_start
        FROM fixed
      ),
      usage_calc AS (
         SELECT
              date,
              CASE  
                  WHEN SPLIT_PART (fixture_no, '-', 1) IN (
                    'NCT011','NCT012','NCT013','NCT014','NCT015',
                    'NCT020','NCT021','NCT022','NCT023','NCT024',
                    'NCT025','NCT026','NCT027','NCT028',
                    'NCB029','NCB030','NCB031','NCB032',
                    'NCB044','NCB045','NCB046','NCB047',
                    'NCB048','NCB049'
                  ) THEN 'Gen5 Tester'
                  ELSE 'Gen3 Tester'
                END AS tester_type,
                fixture_no,
                CASE
                    WHEN(SUM(EXTRACT(EPOCH FROM(end_time - real_start)) / 86400) * 100) > 100
                      THEN 100
                    ELSE ROUND (SUM(EXTRACT(EPOCH FROM (end_time - real_start)) / 86400 ) * 100, 2)
                END AS usage_percent
            FROM calc_start
            WHERE date >= $1 AND date < $2
            GROUP BY date, fixture_no
      )
      SELECT
          date,
          tester_type,
          ROUND (AVG(usage_percent), 2) AS avg_usage_percent
      FROM usage_calc
      GROUP BY date, tester_type
      ORDER BY date, tester_type;
    `;

    const params = [startDate, endDate];
    const result = await pool.query(query, params);

    return res.json(result.rows);

  } catch (err) {
      console.error("daily-usage error:", err);
      return res.status(500).json({error: err.message});
  }
});

module.exports = router; 