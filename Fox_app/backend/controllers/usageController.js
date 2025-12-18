// ============================================================================
// File: controllers/usageController.js
//
// PURPOSE:
//   Handles CRUD operations for the 'usage' table.
//
// NOTES:
//   - RBAC handled via middlewares (allowReadUpdate for GET/PATCH, isSuperuser for POST/DELETE).
//   - Parameterized queries are used to prevent SQL injection.
// ============================================================================

const { pool } = require('../db.js');
const { uuidRegex, dynamicQuery, dynamicPostQuery } = require('./controllerUtilities.js');
const UsageService = require("../services/usageService.js");

class usageController {

    // =====================================================
    // READ — Get all usage records
    // =====================================================
    static async getAllUsage(req, res) {
        try {
            const query = 'SELECT * FROM usage ORDER BY id ASC;';
            const result = await pool.query(query);
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Database error (getAllUsage):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

    // =====================================================
    // READ — Get a usage record by ID
    // =====================================================
    static async getUsageById(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const query = 'SELECT * FROM usage WHERE id = $1';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No usage record found with id: ${id}` });

            res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (getUsageById):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

    // =====================================================
    // CREATE — Add new usage record (superuser only)
    // =====================================================
    static async postUsage(req, res) {
        try {
            const allowed = [
                'fixture_part_id',
                'test_slot',
                'test_station',
                'test_type',
                'gpu_pn',
                'gpu_sn',
                'log_path',
                'creator'
            ];

            const required = ['fixture_part_id', 'test_slot', 'test_type'];

            // Validate required fields
            const missing = required.filter(f => !Object.prototype.hasOwnProperty.call(req.body, f));
            if (missing.length > 0)
                return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

            // Validate ENUM fields
            const validSlots = ['LA', 'RA'];
            const validTypes = ['Refurbish', 'Sort', 'Debug'];

            if (!validSlots.includes(req.body.test_slot))
                return res.status(400).json({ error: 'Invalid test_slot value (LA or RA only)' });

            if (!validTypes.includes(req.body.test_type))
                return res.status(400).json({ error: 'Invalid test_type value' });

            const { columns, placeholders, values } = dynamicPostQuery(allowed, req);
            if (placeholders.length === 0)
                return res.status(400).json({ error: 'No valid fields provided' });

            const query = `
                INSERT INTO usage (${columns.join(', ')}, create_date)
                VALUES (${placeholders.join(', ')}, NOW())
                RETURNING *;
            `;

            const result = await pool.query(query, values);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (postUsage):', error);
            res.status(500).json({ error: 'Database create failed' });
        }
    }

    // =====================================================
    // UPDATE — Partially update usage record (PATCH)
    // =====================================================
    static async updateUsage(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const allowed = [
                'fixture_part_id',
                'test_slot',
                'test_station',
                'test_type',
                'gpu_pn',
                'gpu_sn',
                'log_path',
                'creator'
            ];

            // ENUM validation if provided
            if (req.body.test_slot) {
                const validSlots = ['LA', 'RA'];
                if (!validSlots.includes(req.body.test_slot))
                    return res.status(400).json({ error: 'Invalid test_slot value (LA or RA only)' });
            }

            if (req.body.test_type) {
                const validTypes = ['Refurbish', 'Sort', 'Debug'];
                if (!validTypes.includes(req.body.test_type))
                    return res.status(400).json({ error: 'Invalid test_type value' });
            }

            const { setClauses, values, paramIndex } = dynamicQuery(allowed, req);
            if (setClauses.length === 0)
                return res.status(400).json({ error: 'No valid fields provided for update' });

            values.push(id);
            const query = `UPDATE usage SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *;`;

            const result = await pool.query(query, values);
            if (result.rows.length === 0)
                return res.status(404).json({ error: `No usage record found with id: ${id}` });

            res.status(200).json({
                message: 'Usage record updated',
                updatedRow: result.rows[0]
            });
        } catch (error) {
            console.error('Database error (updateUsage):', error);
            res.status(500).json({ error: 'Database update failed' });
        }
    }

    // =====================================================
    // DELETE — Remove usage record (superuser only)
    // =====================================================
    static async deleteUsage(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const query = 'DELETE FROM usage WHERE id = $1 RETURNING *;';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No usage record found with id: ${id}` });

            res.status(200).json({
                message: 'Usage record deleted',
                deletedRow: result.rows[0]
            });
        } catch (error) {
            console.error('Database error (deleteUsage):', error);
            res.status(500).json({ error: 'Database delete failed' });
        }
    }

    // =====================================================
    // READ — Fixture testing summary (business logic)
    // =====================================================
    static async getUsageSummary(req, res) {
        try {
            const summary = await UsageService.getFixtureUsageSummary();
            res.status(200).json(summary);
        } catch (err) {
            console.error("Usage summary error:", err);
            res.status(500).json({ error: "Failed to calculate usage summary" });
        }
    }

    // =====================================================
    // READ — Fixture Usage Status
    // =====================================================
    static async getUsageStatus(req, res) {
        try{
            const data = await UsageService.getFixtureUsageStatus();
            res.json(data);
        } catch (err) {
            console.error("Error in getUsageStatus:", err);
            res.status(500).json({ error: "Failed to fetch status"});
        }
    }

    // =====================================================
    // READ — Fixture Usage History
    // =====================================================
    //static async getUsageHistory(req, res) {
    //try {
    //    const data = await UsageService.getUsageHistory();  // data is an ARRAY
    //    res.json(data);                                     // return the data
    //} catch (err){
    //    console.error("Error in getUsageHistory:", err);
    //    res.status(500).json({error: "Failed to fetch usage history" });
     //   }
    //}

    // =====================================================
    // READ — Station Summary (last 7d, 30d, 24h, etc.)
    // =====================================================
    static async getStationSummary(req, res) {
    try {
        const range = req.query.range || "7d";
        const data = await UsageService.getStationSummary(range);
        return res.status(200).json(data);   // <-- FIXED
    } catch (err) {
        console.error("Error in getStationSummary:", err);
        return res.status(500).json({ error: "Failed to fetch station summary" });
    }
}

        // =====================================================
    // READ — Fixture Status Over Time (by usage.create_date)
    // =====================================================
    static async getFixtureStatusOverTime(req, res) {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                error: "startDate and endDate query params are required",
            });
        }

        try {
            const data = await UsageService.getFixtureStatusOverTime(
                startDate,
                endDate
            );

            return res.status(200).json(data);
        } catch (err) {
            console.error("Error in getFixtureStatusOverTime:", err);
            return res.status(500).json({
                error: "Failed to fetch fixture status over time",
            });
        }
    }

}

module.exports = usageController;
