// ============================================================================
// File: controllers/fixturePartsController.js
//
// PURPOSE:
//   Handles all CRUD operations for the 'fixture_parts' table.
//
// NOTES:
//   - RBAC handled by middlewares (allowReadUpdate, isSuperuser).
//   - All database interactions use parameterized queries to prevent SQL injection.
//   - Trigger auto-populates inherited fields from parent fixtures.
// ============================================================================

const { pool } = require('../db.js'); // PostgreSQL connection pool
const { uuidRegex, dynamicQuery, dynamicPostQuery } = require('./controllerUtilities.js');

class fixturePartsController {

    // =====================================================
    // READ — Get all fixture part records
    // =====================================================
    static async getAllFixtureParts(req, res) {
        try {
            const query = 'SELECT * FROM fixture_parts ORDER BY id ASC;';
            const result = await pool.query(query);
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Database error (getAllFixtureParts):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

    // =====================================================
    // READ — Get fixture part by ID
    // =====================================================
    static async getFixturePartById(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const query = 'SELECT * FROM fixture_parts WHERE id = $1';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No fixture part found with id: ${id}` });

            res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (getFixturePartById):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

    // =====================================================
    // CREATE — Add new fixture part (superuser only)
    // =====================================================
    static async postFixturePart(req, res) {
        try {
            const allowed = [
                'parent_fixture_id',
                'tester_type',
                'creator'
            ];

            const required = ['parent_fixture_id', 'tester_type'];

            // Validate required fields
            const missing = required.filter(f => !Object.prototype.hasOwnProperty.call(req.body, f));
            if (missing.length > 0)
                return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

            // Validate UUID format for parent_fixture_id
            if (!uuidRegex.test(req.body.parent_fixture_id)) {
                return res.status(400).json({ error: 'Invalid parent_fixture_id format' });
            }

            // Validate tester_type
            const validTesterTypes = ['Gen3 B Tester', 'Gen5 B Tester', 'LA Slot', 'RA Slot'];
            if (!validTesterTypes.includes(req.body.tester_type)) {
                return res.status(400).json({ error: 'Invalid tester_type value' });
            }

            const { columns, placeholders, values } = dynamicPostQuery(allowed, req);
            if (placeholders.length === 0)
                return res.status(400).json({ error: 'No valid fields provided' });

            const query = `
                INSERT INTO fixture_parts (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
                RETURNING *;
            `;

            const result = await pool.query(query, values);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (postFixturePart):', error);
            res.status(500).json({ error: 'Database create failed' });
        }
    }

    // =====================================================
    // UPDATE — Modify fixture part record (PATCH)
    // =====================================================
    static async updateFixturePart(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const allowed = [
                'tester_type',
                'creator'
            ];

            // Validate tester_type if provided
            const validTesterTypes = ['Gen3 B Tester', 'Gen5 B Tester', 'LA Slot', 'RA Slot'];
            if (req.body.tester_type && !validTesterTypes.includes(req.body.tester_type)) {
                return res.status(400).json({ error: 'Invalid tester_type value' });
            }

            const { setClauses, values, paramIndex } = dynamicQuery(allowed, req);

            if (setClauses.length === 0)
                return res.status(400).json({ error: 'No valid fields provided for update' });

            values.push(id);

            const query = `
                UPDATE fixture_parts
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *;
            `;

            const result = await pool.query(query, values);

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No fixture part found with id: ${id}` });

            res.status(200).json({
                message: 'Fixture part updated',
                updatedRow: result.rows[0]
            });
        } catch (error) {
            console.error('Database error (updateFixturePart):', error);
            res.status(500).json({ error: 'Database update failed' });
        }
    }

    // =====================================================
    // DELETE — Remove fixture part (superuser only)
    // =====================================================
    static async deleteFixturePart(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const query = 'DELETE FROM fixture_parts WHERE id = $1 RETURNING *;';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No fixture part found with id: ${id}` });

            res.status(200).json({
                message: 'Fixture part deleted',
                deletedRow: result.rows[0]
            });
        } catch (error) {
            console.error('Database error (deleteFixturePart):', error);
            res.status(500).json({ error: 'Database delete failed' });
        }
    }
}

module.exports = fixturePartsController;
