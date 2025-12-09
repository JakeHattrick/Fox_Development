<<<<<<< HEAD
// Import required libraries and modules
const fixturesModel = require('../models/fixturesModel');
const { pool } = require('../db.js');

// Class for handling fixtures
class fixturesController {
   
    //READ all fixtures
=======
// ============================================================================
// File: controllers/fixturesController.js
//
// PURPOSE:
//   Handles all CRUD operations for the 'fixtures' table.
//
// NOTES:
//   - RBAC handled by middlewares (allowReadUpdate, isSuperuser).
//   - All database interactions use parameterized queries to prevent SQL injection.
//   - Updated to include new column: gen_type
// ============================================================================

const { pool } = require('../db.js'); // PostgreSQL connection pool
const { uuidRegex, dynamicQuery, dynamicPostQuery } = require('./controllerUtilities.js');

class fixturesController {

    // =====================================================
    // READ — Get all fixture records
    // =====================================================
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
    static async getAllFixtures(req, res) {
        try {
            const query = 'SELECT * FROM fixtures ORDER BY id ASC;';
            const result = await pool.query(query);
<<<<<<< HEAD
            res.json(result.rows);
        }
        catch (error) {
=======
            res.status(200).json(result.rows);
        } catch (error) {
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
            console.error('Database error (getAllFixtures):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

<<<<<<< HEAD


    //READ Fixtures by ID

    static async getFixtureById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid or missing id parameter' });

                const query = 'SELECT * FROM fixtures WHERE id = $1';

                const result = await pool.query(query, [id]);
                if (result.rows.length === 0) return res.status(404).json({ error: `No result found for id: ${id}` });
                res.json(result.rows[0]);
        } 
        catch (error) {
            console.error('Database error (getFixtureById):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
        }

    //CREATE Fixtures

    static async postFixture(req, res) {
         try {
            //allowed fields
            const allowed = ['tester_type', 'fixture_id', 'rack', 'fixture_sn', 'test_type', 'ip_address', 'mac_address', 'parent', 'creator'];

            //required fields
            const required = ['tester_type'];
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
                INSERT INTO fixtures (${columns.join(', ')}, create_date)
            VALUES(
                ${placeholders.join(', ')},
                NOW()
            )
=======
    // =====================================================
    // READ — Get fixture by ID
    // =====================================================
    static async getFixtureById(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid id format' });

            const query = 'SELECT * FROM fixtures WHERE id = $1';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No fixture found with id: ${id}` });

            res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (getFixtureById):', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }

    // =====================================================
    // CREATE — Add new fixture (superuser only)
    // =====================================================
    static async postFixture(req, res) {
        try {
            const allowed = [
                'fixture_name',
                'gen_type',        // NEW FIELD
                'rack',
                'fixture_sn',
                'test_type',
                'ip_address',
                'mac_address',
                'creator'
            ];

            const required = ['fixture_name', 'gen_type']; // gen_type is NOT NULL

            // Validate required fields
            const missing = required.filter(f => !Object.prototype.hasOwnProperty.call(req.body, f));
            if (missing.length > 0)
                return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

            // Validate gen_type
            const validGenTypes = ['Gen3 B Tester', 'Gen5 B Tester'];
            if (req.body.gen_type && !validGenTypes.includes(req.body.gen_type)) {
                return res.status(400).json({ error: 'Invalid gen_type value' });
            }

            // Validate test_type
            const validTestTypes = ['Refurbish', 'Sort', 'Debug'];
            if (req.body.test_type && !validTestTypes.includes(req.body.test_type)) {
                return res.status(400).json({ error: 'Invalid test_type value' });
            }

            const { columns, placeholders, values } = dynamicPostQuery(allowed, req);
            if (placeholders.length === 0)
                return res.status(400).json({ error: 'No valid fields provided' });

            const query = `
                INSERT INTO fixtures (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
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
     
    // UPDATE Fixtures allowing partial updates
    static async updateFixture(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) {
                 return res.status(400).json({ error: 'Invalid or missing id parameter' });
            }
            const allowed = ['tester_type', 'fixture_id', 'rack', 'fixture_sn', 'test_type', 'ip_address', 'mac_address', 'parent', 'create_date'];

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
=======
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Database error (postFixture):', error);
            res.status(500).json({ error: 'Database create failed' });
        }
    }

    // =====================================================
    // UPDATE — Modify fixture record (PATCH)
    // =====================================================
    static async updateFixtures(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid id format' });

            const allowed = [
                'fixture_name',
                'gen_type',        // NEW FIELD
                'rack',
                'fixture_sn',
                'test_type',
                'ip_address',
                'mac_address',
                'creator'
            ];

            // Validate gen_type
            const validGenTypes = ['Gen3 B Tester', 'Gen5 B Tester'];
            if (req.body.gen_type && !validGenTypes.includes(req.body.gen_type)) {
                return res.status(400).json({ error: 'Invalid gen_type value' });
            }

            // Validate test_type
            const validTestTypes = ['Refurbish', 'Sort', 'Debug'];
            if (req.body.test_type && !validTestTypes.includes(req.body.test_type)) {
                return res.status(400).json({ error: 'Invalid test_type value' });
            }

            const { setClauses, values, paramIndex } = dynamicQuery(allowed, req);

            if (setClauses.length === 0)
                return res.status(400).json({ error: 'No valid fields provided for update' });

            values.push(id);

>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
            const query = `
                UPDATE fixtures
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *;
            `;

            const result = await pool.query(query, values);
<<<<<<< HEAD
            if (result.rows.length === 0) {
                return res.status(404).json({ error: `No fixture found with id: ${id}` });
            }
            res.json('Sussessfully updated fixture with id: ' + id + '. Updated row: ' + result.rows[0]);
          
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Database update failed' });
        }
    }
    // DELETE Fixtures
    static async deleteFixture(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid or missing id parameter' });
            const query = 'DELETE FROM fixtures WHERE id = $1 RETURNING *;';
            const values = [id];
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: `No fixture found with id: ${id}` });
            }
            else {
                res.json({ message: `Fixture with id: ${id} deleted successfully.`, deletedRow: result.rows[0] });
            }
        }
         catch (error) {
                console.error('Database error (deleteFixture):', error);
                res.status(500).json({ error: 'Database delete failed' });
            }
    }
}
    module.exports = fixturesController;
=======

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No fixture found with id: ${id}` });

            res.status(200).json({
                message: 'Fixture updated',
                updatedRow: result.rows[0]
            });
        } catch (error) {
            console.error('Database error (updateFixtures):', error);
            res.status(500).json({ error: 'Database update failed' });
        }
    }

    // =====================================================
    // DELETE — Remove fixture (superuser only)
    // =====================================================
    static async deleteFixture(req, res) {
        try {
            const id = req.params.id;
            if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid id format' });

            const query = 'DELETE FROM fixtures WHERE id = $1 RETURNING *;';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0)
                return res.status(404).json({ error: `No fixture found with id: ${id}` });

            res.status(200).json({
                message: 'Fixture deleted',
                deletedRow: result.rows[0]
            });
        } catch (error) {
            console.error('Database error (deleteFixture):', error);
            res.status(500).json({ error: 'Database delete failed' });
        }
    }
}

module.exports = fixturesController;
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
