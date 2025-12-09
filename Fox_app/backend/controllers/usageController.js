<<<<<<< HEAD
// controller for usage table

// Import required libraries and modules
//const fixturesModel = require('../models/fixturesModel');
const { pool } = require('../db.js');

// Class for handling usage
class usageController {
   
    //READ all usage
    static async getAllUsage(req, res) {
        try {
            const query = 'SELECT * FROM usage ORDER BY fixture_id ASC;';
            const result = await pool.query(query);
            res.json(result.rows);
        }
        catch (error) {
=======
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
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
            console.error('Database error (getAllUsage):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

<<<<<<< HEAD


    //READ Usage by ID

    static async getUsageById(req, res) {
        try {
            const id = parseInt(req.params.fixture_id, 10);
            if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid or missing id parameter' });

                const query = 'SELECT * FROM usage WHERE fixture_id = $1';

                const result = await pool.query(query, [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: `No result found for id: ${id}` });
                res.json(result.rows[0]);
        } 
        catch (error) {
            console.error('Database error (getUsageById):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
        }

    //CREATE Usage

    static async postUsage(req, res) {
         try {
            //allowed fields
            const allowed = ['fixture_id', 'test_slot', 'test_station', 'test_type', 'gpu_pn', 'gpu_sn', 'log_path', 'creator'];

            //required fields
            const required = ['fixture_id'];
            //check for missing required fields
            const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(req.body, field));
                if (missing.length > 0) {
                return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
                }



            const columns = [];
            const placeholders = [];
            const values = [];
            let paramIndex = 1;

            for (const col of allowed) {
                if (Object.prototype.hasOwnProperty.call(req.body, col)) {
                    placeholders.push(`$${paramIndex}`);
                    values.push(req.body[col]);
                    columns.push(col);
                    paramIndex++;
                }
            }

            if (placeholders.length === 0) {
                return res.status(400).json({ error: 'No valid fields provided for create' });
            }
            
            const query = `
                INSERT INTO usage (${columns.join(', ')}, create_date)
            VALUES(
                ${placeholders.join(', ')},
                NOW()
            )
=======
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
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
                RETURNING *;
            `;

            const result = await pool.query(query, values);
<<<<<<< HEAD
            
            res.status(201).json(result.rows[0]);
          
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Database create failed' });
        }
        }
     
    // UPDATE Usage allowing partial updates
    static async updateUsage(req, res) {
        try {
            const id = parseInt(req.params.fixture_id, 10);
            if (Number.isNaN(id)) {
                 return res.status(400).json({ error: 'Invalid or missing id parameter' });
            }
            const allowed = ['fixture_id', 'test_slot', 'test_station', 'test_type', 'gpu_pn', 'gpu_sn', 'log_path', 'creator', 'create_date'];

            const setClauses = [];
            const values = [];
            let paramIndex = 1;

            for (const col of allowed) {
                if (Object.prototype.hasOwnProperty.call(req.body, col)) {
                    setClauses.push(`${col} = $${paramIndex}`);
                    values.push(req.body[col]);
                    paramIndex++;
                }
            }

            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'No valid fields provided for update' });
            }
            
            //add id 

            values.push(id);
            const query = `
                UPDATE usage
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *;
            `;

            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: `No fixture usage found with id: ${id}` });
            }
            res.json('Sussessfully updated fixture usage with id: ' + id + '. Updated row: ' + result.rows[0]);
          
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Database update failed' });
        }
    }
    // DELETE Usage
    static async deleteUsage(req, res) {
        try {
            const id = parseInt(req.params.fixture_id, 10);
            if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid or missing id parameter' });
            const query = 'DELETE FROM usage WHERE id = $1 RETURNING *;';
            const values = [id];
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: `No fixture usage found with id: ${id}` });
            }
            else {
                res.json({ message: `Fixture Usage with id: ${id} deleted successfully.`, deletedRow: result.rows[0] });
            }
        }
         catch (error) {
                console.error('Database error (deleteUsage):', error);
                res.status(500).json({ error: 'Database delete failed' });
            }
    }
}
    module.exports = usageController;
=======
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
}

module.exports = usageController;
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
