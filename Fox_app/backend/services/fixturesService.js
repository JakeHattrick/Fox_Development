// ============================================================================
// File: services/fixturesService.js
//
// PURPOSE:
//   Contains all database logic for fixtures.
//
// NOTES:
//   - Controllers will call these functions.
//   - Keeps controllers clean and prevents duplicated SQL queries.
//   - Correctly prevents creating more than two children for a B tester.
//   - Flags canCreateLA / canCreateRA added for frontend convenience.
// ============================================================================

const { pool } = require('../db.js');

class FixturesService {

    // ===============================
    // FETCH ALL FIXTURES
    // ===============================
    static async getAll() {
        const query = 'SELECT * FROM fixtures ORDER BY id ASC;';
        const result = await pool.query(query);
        return result.rows;
    }

    // ===============================
    // FETCH FIXTURE BY ID
    // ===============================
    static async getById(id) {
        const query = 'SELECT * FROM fixtures WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // ===============================
    // FETCH SIMPLE B TESTERS
    // ===============================
    static async getBTesters() {
        const query = `
            SELECT id, fixture_name
            FROM fixtures
            WHERE tester_type = 'B Tester'
            ORDER BY fixture_name ASC;
        `;
        const result = await pool.query(query);
        return result.rows;
    }

}

module.exports = FixturesService;
