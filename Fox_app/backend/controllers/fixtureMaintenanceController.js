<<<<<<< HEAD
// Import required libraries and modules
const { pool } = require('../db.js');

// Class for handling fixtures
class fixtureMaintenanceController {
    // Function to GET all the fixtures 
    static getAllMaintenances = async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM fixture_maintenance');
            res.json(result.rows);
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Database query failed' });
        }
    }
    // Function to GET a fixture by it's id
    static getMaintenanceById = async (req, res) => {
        try{
            if (!req.params.id) return res.status(400).json({ error: 'Missing required query parameters: id' });
            
            let params = [req.params.id];
            let query = `
                SELECT *
                FROM fixture_maintenance
                WHERE fixture_id = $1
                `;
            
            const result = await pool.query(query, params);
            if (result.rows.length == 0) return res.status(404).json({ error: `No results found for id: ${req.params.id}`});
            res.json(result.rows);
        } catch (error){
            res.status(500).json({ error: 'Database query failed' });
        }
    }
    // POST function to create maintenance event
    static postMaintenanceById = async (req, res) => {
        try{
            if (!req.params.id) return res.status(400).json({ error: 'Missing required query parameters: id' });
            const fixtureId = parseInt(req.params.id);
            const recivedData = req.body;
            let formattedKeys = '';
            let formattedValues = '';

            // Loop through the properties of the req.body object and build string of fields to update
            for (const key in recivedData) {
                if (Object.prototype.hasOwnProperty.call(recivedData, key)) {
                const value = recivedData[key];

                const lastKeyAt = Object.keys(recivedData).at(-1);
                if (lastKeyAt == key){
                    // Append key-value pair with NO comma
                    formattedKeys += `${key}`;
                    formattedValues += `'${value}'`;
                    continue;
                }
                // Append a key-value pair with a comma
                formattedKeys += `${key},`;
                formattedValues += `'${value}',`;
                }                
            }
            console.log("Keys to INSERT: %s", formattedKeys);
            console.log("Values to INSERT: %s", formattedValues);

            let params = [fixtureId];
            let query = `
                INSERT INTO fixture_maintenance(fixture_id,${formattedKeys})
	            VALUES ($1,${formattedValues})
                RETURNING *
                `;
            
            const result = await pool.query(query, params);
            if (result.rows.length == 0) return res.status(404).json({ error: `No results found for id: ${fixtureId}`});
            res.json(result.rows);
            console.log("Event inserted: %s", JSON.stringify(result.rows));
        } catch (error){            
            res.status(500).json({ error: 'Database query failed' });
        }
    }
    // PUT function to update maintenance event by id
    static putMaintenanceById = async (req, res) => {
        try{
            if (!req.params.id) return res.status(400).json({ error: 'Missing required query parameters: id' });
            
            const fixtureId = parseInt(req.params.id);
            const recivedData = req.body;
            let formattedString = '';

            // Loop through the properties of the req.body object and build string of fields to update
            for (const key in recivedData) {
                if (Object.prototype.hasOwnProperty.call(recivedData, key)) {
                const value = recivedData[key];

                const lastKeyAt = Object.keys(recivedData).at(-1);
                if (lastKeyAt == key){
                    // Append key-value pair with NO comma
                    formattedString += `${key} = '${value}'`;
                    continue;
                }
                // Append a key-value pair with a comma
                formattedString += `${key} = '${value}',`;
                }                
            }
            console.log("Fields to UPDATE: %s", formattedString);

            let params = [fixtureId];
            let query = `
                UPDATE fixture_maintenance 
                SET 
                    ${formattedString}
                WHERE fixture_id = $1
                RETURNING *
                `;
            
            const result = await pool.query(query, params);
            if (result.rows.length == 0) return res.status(404).json({ error: `No results found for id: ${fixtureId}`});
            res.json(result.rows);
            console.log("Event updated: %s", JSON.stringify(result.rows));
        } catch (error){
            res.status(500).json({ error: 'Database query failed' });
        }
    }    
    // DELETE function to remove maintenance by id
    static deleteMaintenanceById = async (req, res) => {
        try{
            if (!req.params.id) return res.status(400).json({ error: 'Missing required query parameters: id' });
            
            let params = [req.params.id];
            let query = `
                DELETE FROM fixture_maintenance 
                WHERE fixture_id = $1
                RETURNING *
                `;
            
            const result = await pool.query(query, params);
            if (result.rows.length == 0) return res.status(404).json({ error: `No results found for id: ${req.params.id}`});
            res.json(result.rows);
            console.log("Event deleted: %s", JSON.stringify(result.rows));
        } catch (error){
            res.status(500).json({ error: 'Database query failed' });
        }
    }

}

module.exports = fixtureMaintenanceController;
=======
// controllers/fixtureMaintenanceController.js
//
// PURPOSE:
//   - Handle all CRUD operations for the fixture_maintenance table.
//   - Accessible by all users (via allowAllMaintenance middleware).
//   - Includes safe query handling, validation, and descriptive error messages.
//
// DEPENDENCIES:
//   - PostgreSQL connection (via pool)
//   - Utility helpers for safe SQL building and UUID validation
//   - Dynamic query builders prevent SQL injection risks

const { pool } = require('../db'); // Import database connection pool
const { uuidRegex, dynamicQuery, dynamicPostQuery } = require('./controllerUtilities'); // Import helper functions

// ======================================================================
//  GET ALL MAINTENANCE RECORDS
//    - Fetch all rows from fixture_maintenance table.
// ======================================================================
exports.getAllMaintenance = async (req, res) => {
  try {
    // Execute SQL query to select all columns of fixture_maintenance
    // Ordered by create_date descending
    const result = await pool.query(`
      SELECT id, fixture_id, event_type, start_date_time, end_date_time, occurance,
             comments, creator, create_date, is_completed
      FROM fixture_maintenance
      ORDER BY create_date DESC;
    `);

    // Send back the query result as JSON with HTTP status 200
    res.status(200).json(result.rows);
  } catch (error) {
    // Log detailed error on server
    console.error('Error fetching maintenance records:', error);

    // Respond with safe message to client
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ======================================================================
//  GET MAINTENANCE RECORD BY ID
//    - Fetch a single maintenance record using its UUID
// ======================================================================
exports.getMaintenanceById = async (req, res) => {
  const { id } = req.params; // Extract record ID from request parameters

  // Validate UUID format to prevent SQL injection or invalid requests
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid maintenance record ID format' });
  }

  try {
    // Query fixture_maintenance table for the specific record
    const result = await pool.query(
      'SELECT * FROM fixture_maintenance WHERE id = $1;',
      [id] // Parameterized query to prevent SQL injection
    );

    // If no record found, respond with 404
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    // Return the found record as JSON
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching maintenance record by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ======================================================================
//  POST (CREATE) MAINTENANCE RECORD
//    - Insert a new maintenance record safely into the DB
// ======================================================================
exports.postMaintenance = async (req, res) => {
  // Define which fields from the request body are allowed to be inserted
  const allowed = [
    'fixture_id',       // UUID of the fixture
    'event_type',       // Type of event (Scheduled, Emergency, Unknown)
    'start_date_time',  // When the maintenance started
    'end_date_time',    // When the maintenance ended
    'occurance',        // How often maintenance occurs (Daily, Weekly...)
    'comments',         // Optional notes/comments
    'is_completed',     // Boolean flag if maintenance is completed
    'creator'           // Who created the record
  ];

  // Use helper to dynamically build columns, placeholders, and values
  const { columns, placeholders, values } = dynamicPostQuery(allowed, req);

  // If no valid fields are provided, return 400 error
  if (columns.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for maintenance creation' });
  }

  // Construct parameterized SQL INSERT query
  const query = `
    INSERT INTO fixture_maintenance (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *;  -- Return the newly inserted row
  `;

  try {
    // Execute the INSERT query with values
    const result = await pool.query(query, values);

    // Return the newly created maintenance record
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ======================================================================
//  PATCH (UPDATE) MAINTENANCE RECORD
//    - Modify existing record fields dynamically
// ======================================================================
exports.updateMaintenance = async (req, res) => {
  const { id } = req.params; // Extract record ID from URL

  // Validate UUID to prevent invalid queries
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid maintenance record ID format' });
  }

  // Fields that can be updated
  const allowed = [
    'event_type',       // Update the event type
    'start_date_time',  // Update start time
    'end_date_time',    // Update end time
    'occurance',        // Update occurrence frequency
    'comments',         // Update comments
    'is_completed',     // Update completion status
    'creator'           // Update who modified it
  ];

  // Build dynamic SET clause and values array
  const { setClauses, values } = dynamicQuery(allowed, req);

  // If no valid update fields provided, return 400
  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  // Construct SQL UPDATE query
  const query = `
    UPDATE fixture_maintenance
    SET ${setClauses.join(', ')}  -- dynamically set the allowed columns
    WHERE id = $${values.length + 1}  -- parameterized ID
    RETURNING *;  -- Return the updated row
  `;

  try {
    // Execute the UPDATE query
    const result = await pool.query(query, [...values, id]);

    // If no record found, return 404
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    // Return the updated record
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ======================================================================
//  DELETE MAINTENANCE RECORD
//    - Remove one record permanently from DB
// ======================================================================
exports.deleteMaintenance = async (req, res) => {
  const { id } = req.params; // Extract record ID from URL

  // Validate UUID format
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid maintenance record ID format' });
  }

  try {
    // Execute DELETE query safely with parameterized ID
    const result = await pool.query(
      'DELETE FROM fixture_maintenance WHERE id = $1 RETURNING *;',
      [id]
    );

    // If no record found, return 404
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    // Return confirmation along with deleted row
    res.status(200).json({ message: 'Maintenance record deleted successfully', deletedRow: result.rows[0] });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
