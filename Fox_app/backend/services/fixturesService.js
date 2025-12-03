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

   // ===============================
// AVAILABLE PARENTS — FOR LA SLOT
// ===============================
static async getAvailableParents_LA() {
    const query = `
        SELECT b.id, b.fixture_name, b.rack, b.test_type, b.ip_address, b.mac_address,
               -- Flags for frontend to disable ineligible parents
               NOT EXISTS (
                   SELECT 1
                   FROM fixtures f
                   WHERE f.parent = b.id AND f.tester_type = 'Left A Slot'
               ) AS canCreateLA,
               NOT EXISTS (
                   SELECT 1
                   FROM fixtures f
                   WHERE f.parent = b.id AND f.tester_type = 'Right A Slot'
               ) AS canCreateRA
        FROM fixtures b
        WHERE b.tester_type = 'B Tester'
        AND (
            SELECT COUNT(*)
            FROM fixtures f
            WHERE f.parent = b.id
        ) < 2
        AND NOT EXISTS (
            SELECT 1
            FROM fixtures f
            WHERE f.parent = b.id
            AND f.tester_type = 'Left A Slot'
        )
        ORDER BY fixture_name;
    `;
    const result = await pool.query(query);
    return result.rows;
}

// ===============================
// AVAILABLE PARENTS — FOR RA SLOT
// ===============================
static async getAvailableParents_RA() {
    const query = `
        SELECT b.id, b.fixture_name, b.rack, b.test_type, b.ip_address, b.mac_address,
               NOT EXISTS (
                   SELECT 1
                   FROM fixtures f
                   WHERE f.parent = b.id AND f.tester_type = 'Left A Slot'
               ) AS canCreateLA,
               NOT EXISTS (
                   SELECT 1
                   FROM fixtures f
                   WHERE f.parent = b.id AND f.tester_type = 'Right A Slot'
               ) AS canCreateRA
        FROM fixtures b
        WHERE b.tester_type = 'B Tester'
        AND (
            SELECT COUNT(*)
            FROM fixtures f
            WHERE f.parent = b.id
        ) < 2
        AND NOT EXISTS (
            SELECT 1
            FROM fixtures f
            WHERE f.parent = b.id
            AND f.tester_type = 'Right A Slot'
        )
        ORDER BY fixture_name;
    `;
    const result = await pool.query(query);
    return result.rows;
}

}

module.exports = FixturesService;
