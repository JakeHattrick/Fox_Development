<<<<<<< HEAD
// controller for health table

// Import required libraries and modules
//const fixturesModel = require('../models/fixturesModel');
const { pool } = require('../db.js');

// Class for handling health
class healthController {
   
    //READ all health
    static async getAllHealth(req, res) {
        try {
            const query = 'SELECT * FROM health ORDER BY fixture_id ASC;';
            const result = await pool.query(query);
            res.json(result.rows);
        }
        catch (error) {
=======
// ============================================================================
// File: controllers/healthController.js
//
// PURPOSE:
//   Handles CRUD operations for the 'health' table.
//
// NOTES:
//   - RBAC handled by middlewares (allowReadUpdate for GET/PATCH, isSuperuser for POST/DELETE).
//   - Uses parameterized queries for security against SQL injection.
// ============================================================================

const { pool } = require('../db.js');
const { uuidRegex, dynamicQuery, dynamicPostQuery } = require('./controllerUtilities.js');

class healthController {

    // =====================================================
    // READ — Get all health records
    // =====================================================
    static async getAllHealth(req, res) {
        try {
            const result = await pool.query('SELECT * FROM health ORDER BY create_date DESC;');
            res.status(200).json(result.rows);
        } catch (error) {
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
            console.error('Database error (getAllHealth):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

<<<<<<< HEAD


    //READ Health by ID

    static async getHealthById(req, res) {
        try {
            const id = parseInt(req.params.fixture_id, 10);
            if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid or missing id parameter' });

                const query = 'SELECT * FROM health WHERE fixture_id = $1';

                const result = await pool.query(query, [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: `No result found for id: ${id}` });
                res.json(result.rows[0]);
        } 
        catch (error) {
            console.error('Database error (getHealthById):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
        }

    //CREATE Health

    static async postHealth(req, res) {
         try {
            //allowed fields
            const allowed = ['fixture_id', 'status', 'comments', 'creator'];

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
                INSERT INTO health (${columns.join(', ')}, create_date)
            VALUES(
                ${placeholders.join(', ')},
                NOW()
            )
=======
    // =====================================================
    // READ — Get health record by ID
    // =====================================================
    static async getHealthById(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id)) 
                return res.status(400).json({ error: 'Invalid id format' });

            const result = await pool.query('SELECT * FROM health WHERE id = $1', [id]);
            if (result.rows.length === 0)
                return res.status(404).json({ error: `No health record found with id: ${id}` });

            res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (getHealthById):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

    // =====================================================
    // CREATE — Add new health record (superuser only)
    // =====================================================
    static async postHealth(req, res) {
        try {
            const allowed = ['fixture_id', 'status', 'comments', 'creator'];
            const required = ['fixture_id', 'status'];

            // Check missing required fields
            const missing = required.filter(f => !req.body[f]);
            if (missing.length > 0)
                return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

            const { columns, placeholders, values } = dynamicPostQuery(allowed, req);

            const query = `
                INSERT INTO health (${columns.join(', ')}, create_date)
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
    
     
    // UPDATE Fixtures allowing partial updates should be PATCH
    static async updateHealth(req, res) {
        try {
            const id = parseInt(req.params.primary_key, 10);
            if (Number.isNaN(id)) {
                 return res.status(400).json({ error: 'Invalid or missing id parameter' });
            }
            const allowed = ['fixture_id', 'status', 'comments', 'creator',];

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
                UPDATE health
                SET ${setClauses.join(', ')}
                WHERE primary_key = $${paramIndex}
=======
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (postHealth):', error);
            res.status(500).json({ error: 'Database create failed' });
        }
    }

    // =====================================================
    // UPDATE — Modify health record
    // =====================================================
    static async updateHealth(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const allowed = ['fixture_id', 'status', 'comments', 'creator'];
            const { setClauses, values, paramIndex } = dynamicQuery(allowed, req);

            if (setClauses.length === 0)
                return res.status(400).json({ error: 'No valid fields provided for update' });

            values.push(id);

            const query = `
                UPDATE health 
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex}
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
                RETURNING *;
            `;

            const result = await pool.query(query, values);
<<<<<<< HEAD
            if (result.rows.length === 0) {
                return res.status(404).json({ error: `No fixture health found with id: ${id}` });
            }
            res.json('Sussessfully updated fixture health with id: ' + id + '. Updated row: ' + result.rows[0]);
          
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Database update failed' });
        }
    }
    // DELETE Health
    static async deleteHealth(req, res) {
        try {
            const id = parseInt(req.params.primary_key, 10);
            if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid or missing id parameter' });
            const query = 'DELETE FROM health WHERE primary_key = $1 RETURNING *;';
            const values = [id];
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: `No fixture health found with id: ${id}` });
            }
            else {
                res.json({ message: `Fixture Health with primary_key: ${id} deleted successfully.`, deletedRow: result.rows[0] });
            }
        }
         catch (error) {
                console.error('Database error (deleteHealth):', error);
                res.status(500).json({ error: 'Database delete failed' });
            }
    }
}
    module.exports = healthController;
=======
            if (result.rows.length === 0)
                return res.status(404).json({ error: `No health record found with id: ${id}` });

            res.status(200).json({
                message: 'Health record updated',
                updatedRow: result.rows[0]
            });

        } catch (error) {
            console.error('Database error (updateHealth):', error);
            res.status(500).json({ error: 'Database update failed' });
        }
    }

    // =====================================================
    // DELETE — Remove health record
    // =====================================================
    static async deleteHealth(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id))
                return res.status(400).json({ error: 'Invalid id format' });

            const result = await pool.query('DELETE FROM health WHERE id = $1 RETURNING *;', [id]);
            if (!result.rows.length)
                return res.status(404).json({ error: `No health record found with id: ${id}` });

            res.status(200).json({
                message: 'Health record deleted',
                deletedRow: result.rows[0]
            });
        } catch (error) {
            console.error('Database error (deleteHealth):', error);
            res.status(500).json({ error: 'Database delete failed' });
        }
    }

    // ======================================================================
    // NEW: Get computed health summary (all fixtures)
    // ======================================================================
    static async getHealthSummary(req, res) {
        try {
            const service = require("../services/healthService");
            const summary = await service.getHealthSummary();
            res.status(200).json(summary);
        } catch (err) {
            console.error("Health summary failed:", err);
            res.status(500).json({ error: "Health summary failed" });
        }
    }

    // ======================================================================
    // NEW: Get computed health summary for one fixture
    // ======================================================================
    static async getHealthSummaryByFixture(req, res) {
        try {
            const { fixtureId } = req.params;
            const service = require("../services/healthService");

            const summary = await service.getHealthSummaryById(fixtureId);
            if (!summary)
                return res.status(404).json({ error: "Fixture summary not found" });

            res.status(200).json(summary);
        } catch (err) {
            console.error("Health detail failed:", err);
            res.status(500).json({ error: "Health detail failed" });
        }
    }


}

module.exports = healthController;
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
