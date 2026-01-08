import express from 'express';
import { pool } from './db.js';


const router = express.Router();

// Routes
// Define routes on the router

router.get('/', (req, res) => {
    res.send('Server is running!');
});

router.get('/list', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fixtures');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM fixtures WHERE id = $1', [id]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { id, fixture, test_slot, test_station, test_type, create_date } = req.body;
    try {
        const result = await pool.query(
        `INSERT INTO fixtures (id, fixture, test_slot, test_station, test_type, create_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [id, fixture, test_slot, test_station, test_type, create_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { tester_type, fixture_id, rack, fixture_sn, test_type, ip_address, mac_address, parent, creator } = req.body;

    try {
        const result = await pool.query(
        `UPDATE fixtures
            SET tester_type = $1, fixture_id = $2, rack = $3, fixture_sn = $4,
            test_type = $5, ip_address = $6, mac_address = $7, parent = $8, creator = $9
            WHERE id = $10
            RETURNING *`,
        [tester_type, fixture_id, rack, fixture_sn, test_type, ip_address, mac_address, parent, creator, id]
    );
    res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM fixtures WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).send('Not found');
        }
        else {
            res.status(200).send('Deleted successfully');
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Export the router to be used in your main server file
export default router;
