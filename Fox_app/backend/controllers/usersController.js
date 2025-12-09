// controllers/userController.js
//
// PURPOSE: Handle all CRUD operations for the "users" table.
// NOTE: Role-based access is enforced at the route level using "roleCheck" middleware.
//       The controller assumes that requests reaching here are already authorized.

const { pool } = require('../db'); 
const { uuidRegex, dynamicQuery, dynamicPostQuery } = require('./controllerUtilities');
const bcrypt = require('bcrypt'); 


// ============================================================
// GET ALL USERS  (admin-only via route middleware)
// ============================================================
exports.getUsers = async (req, res) => {
  try {
    // Select all users, newest first
    const result = await pool.query('SELECT * FROM users ORDER BY create_date DESC');

    // Return users in JSON format
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ============================================================
// GET SINGLE USER BY ID  (admin-only via route middleware)
// ============================================================
exports.getUserById = async (req, res) => {
  const { id } = req.params; // Extract user ID from route

  // Validate UUID format
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  try {
    // Query user by ID
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length  !== 1) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ============================================================
// CREATE NEW USER  (admin-only via route middleware)
// ============================================================

exports.createUser = async (req, res) => {
  try {

    // Allowed columns for insertion (include password now)
    const allowed = ['username', 'email', 'role', 'password'];
    const required = ['username', 'role'];

    // Check for missing required fields
    const missingFields = required.filter(field => !req.body[field]);
    if (missingFields.length) {
      return res.status(400).json({
        error: `Missing required field(s): ${missingFields.join(', ')}`
      });
    }

    // Build dynamic insert query using helper
    const { columns, placeholders, values } = dynamicPostQuery(allowed, req);

    if (!columns.length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    // Hash password if it was provided
    if (req.body.password) {
      try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const passwordIndex = columns.indexOf('password');
        values[passwordIndex] = hashedPassword;
      } catch (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ error: 'Password hashing failed' });
      }
    }

    // Construct safe SQL query
    const query = `
      INSERT INTO users (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ============================================================
// UPDATE EXISTING USER  (admin-only via route middleware)
// ============================================================
exports.updateUser = async (req, res) => {
  const { id } = req.params;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  // Allowed fields for update
  const allowed = ['username', 'email', 'role'];

  // Build dynamic SET clause
  const { setClauses, values } = dynamicQuery(allowed, req);

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  // Construct safe SQL query
  const query = `
    UPDATE users
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length + 1}
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [...values, id]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ============================================================
// DELETE USER  (admin-only via route middleware)
// ============================================================
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  try {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: `User with id ${id} deleted successfully`, deletedRow: result.rows[0] });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
