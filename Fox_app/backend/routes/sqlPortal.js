const express = require('express');
const router = express.Router();
const { Pool, types } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

/*#################################################
#    SQL Portal Route - Read-Only Access         #
#    Uses dedicated fox_observer user             #
#    Provides SQL query interface for analysts   #
#    Version: v1 (October 2025)                   #
#################################################*/

types.setTypeParser(1114, (val) => val);
types.setTypeParser(1184, (val) => val);

// Create dedicated read-only connection pool
const observerPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.SQL_PORTAL_USER,
    password: process.env.SQL_PORTAL_PASSWORD
});

observerPool.on('error', (err) => {
    console.error('Observer pool error:', err);
});

/*#################################################
#    GET /api/v1/sql-portal/tables               #
#    Returns list of all available tables        #
#################################################*/
router.get('/tables', async (req, res) => {
    try {
        const query = `
            SELECT 
                table_name,
                (SELECT COUNT(*) 
                 FROM information_schema.columns 
                 WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;
        
        const result = await observerPool.query(query);
        res.json({
            success: true,
            tables: result.rows
        });
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tables',
            message: error.message
        });
    }
});

/*#################################################
#    GET /api/v1/sql-portal/table-info/:table    #
#    Returns detailed table structure            #
#################################################*/
router.get('/table-info/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        
        // Validate table name to prevent SQL injection
        const tableCheck = await observerPool.query(
            `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = $1`,
            [tableName]
        );
        
        if (tableCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        
        // Get column information
        const columnQuery = `
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position;
        `;
        
        const columns = await observerPool.query(columnQuery, [tableName]);
        
        // Get row count
        const countQuery = `SELECT COUNT(*) as row_count FROM ${tableName}`;
        const count = await observerPool.query(countQuery);
        
        // Get sample data (5 rows)
        const sampleQuery = `SELECT * FROM ${tableName} LIMIT 5`;
        const sample = await observerPool.query(sampleQuery);
        
        res.json({
            success: true,
            tableName,
            rowCount: parseInt(count.rows[0].row_count),
            columns: columns.rows,
            sampleData: sample.rows
        });
    } catch (error) {
        console.error('Error fetching table info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch table information',
            message: error.message
        });
    }
});

/*#################################################
#    POST /api/v1/sql-portal/query               #
#    Execute custom SQL query (SELECT only)      #
#    Body: { sql: "SELECT * FROM table..." }     #
#################################################*/
router.post('/query', async (req, res) => {
    try {
        const { sql } = req.body;
        
        if (!sql || typeof sql !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'SQL query is required'
            });
        }
        
        // Basic validation - only allow SELECT queries
        const trimmedSql = sql.trim().toUpperCase();
        if (!trimmedSql.startsWith('SELECT')) {
            return res.status(403).json({
                success: false,
                error: 'Only SELECT queries are allowed'
            });
        }
        
        // Check for dangerous keywords
        const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
        const hasDangerousKeyword = dangerousKeywords.some(keyword => 
            trimmedSql.includes(keyword)
        );
        
        if (hasDangerousKeyword) {
            return res.status(403).json({
                success: false,
                error: 'Query contains restricted keywords'
            });
        }
        
        // Execute query with timeout
        const startTime = Date.now();
        const result = await observerPool.query(sql);
        const executionTime = Date.now() - startTime;
        
        res.json({
            success: true,
            rowCount: result.rowCount,
            rows: result.rows,
            executionTime: `${executionTime}ms`,
            fields: result.fields.map(f => ({
                name: f.name,
                dataType: f.dataTypeID
            }))
        });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({
            success: false,
            error: 'Query execution failed',
            message: error.message,
            detail: error.detail || null
        });
    }
});

/*#################################################
#    POST /api/v1/sql-portal/serial-lookup       #
#    Lookup serial numbers across tables         #
#    Body: { serialNumbers: ["SN123", "SN456"] } #
#################################################*/
router.post('/serial-lookup', async (req, res) => {
    try {
        const { serialNumbers } = req.body;
        
        if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'serialNumbers array is required'
            });
        }
        
        // Query both master logs
        const testboardQuery = `
            SELECT 
                'testboard' as source,
                sn,
                pn,
                model,
                workstation_name,
                history_station_start_time,
                history_station_end_time,
                history_station_passing_status,
                operator,
                failure_reasons,
                fixture_no
            FROM testboard_master_log
            WHERE sn = ANY($1)
            ORDER BY history_station_start_time DESC;
        `;
        
        const workstationQuery = `
            SELECT 
                'workstation' as source,
                sn,
                pn,
                model,
                workstation_name,
                history_station_start_time,
                history_station_end_time,
                history_station_passing_status,
                operator,
                service_flow
            FROM workstation_master_log
            WHERE sn = ANY($1)
            ORDER BY history_station_start_time DESC;
        `;
        
        const [testboardResults, workstationResults] = await Promise.all([
            observerPool.query(testboardQuery, [serialNumbers]),
            observerPool.query(workstationQuery, [serialNumbers])
        ]);
        
        res.json({
            success: true,
            serialNumbers,
            testboard: {
                count: testboardResults.rowCount,
                records: testboardResults.rows
            },
            workstation: {
                count: workstationResults.rowCount,
                records: workstationResults.rows
            }
        });
    } catch (error) {
        console.error('Error in serial lookup:', error);
        res.status(500).json({
            success: false,
            error: 'Serial lookup failed',
            message: error.message
        });
    }
});

/*#################################################
#    POST /api/v1/sql-portal/serial-history      #
#    Get full production history for SNs         #
#    Body: { serialNumbers: ["SN123"],           #
#            startDate: "2025-01-01",            #
#            endDate: "2025-12-31" }             #
#################################################*/
router.post('/serial-history', async (req, res) => {
    try {
        const { serialNumbers, startDate, endDate } = req.body;
        
        if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'serialNumbers array is required'
            });
        }
        
        const whereClause = startDate && endDate 
            ? `AND history_station_start_time >= $2 AND history_station_end_time <= $3`
            : '';
        
        const params = startDate && endDate 
            ? [serialNumbers, startDate, endDate]
            : [serialNumbers];
        
        const query = `
            SELECT 
                sn,
                pn,
                model,
                workstation_name,
                history_station_start_time,
                history_station_end_time,
                history_station_passing_status,
                operator,
                failure_reasons,
                failure_code,
                'testboard' as source
            FROM testboard_master_log
            WHERE sn = ANY($1) ${whereClause}
            
            UNION ALL
            
            SELECT 
                sn,
                pn,
                model,
                workstation_name,
                history_station_start_time,
                history_station_end_time,
                history_station_passing_status,
                operator,
                NULL as failure_reasons,
                NULL as failure_code,
                'workstation' as source
            FROM workstation_master_log
            WHERE sn = ANY($1) ${whereClause}
            
            ORDER BY history_station_start_time DESC;
        `;
        
        const result = await observerPool.query(query, params);
        
        res.json({
            success: true,
            serialNumbers,
            recordCount: result.rowCount,
            history: result.rows
        });
    } catch (error) {
        console.error('Error fetching serial history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch serial history',
            message: error.message
        });
    }
});

/*#################################################
#    POST /api/v1/sql-portal/failure-lookup      #
#    Search by failure reasons/codes             #
#    Body: { failureCodes: ["ERR123"],           #
#            startDate: "2025-01-01",            #
#            endDate: "2025-12-31" }             #
#################################################*/
router.post('/failure-lookup', async (req, res) => {
    try {
        const { failureCodes, startDate, endDate } = req.body;
        
        if (!Array.isArray(failureCodes) || failureCodes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'failureCodes array is required'
            });
        }
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required'
            });
        }
        
        const query = `
            SELECT 
                sn,
                pn,
                model,
                workstation_name,
                history_station_start_time,
                failure_reasons,
                failure_code,
                operator,
                fixture_no
            FROM testboard_master_log
            WHERE (failure_reasons = ANY($1) OR failure_code = ANY($1))
            AND history_station_start_time >= $2
            AND history_station_end_time <= $3
            AND history_station_passing_status = 'Fail'
            ORDER BY history_station_start_time DESC;
        `;
        
        const result = await observerPool.query(query, [failureCodes, startDate, endDate]);
        
        res.json({
            success: true,
            failureCodes,
            dateRange: { startDate, endDate },
            recordCount: result.rowCount,
            failures: result.rows
        });
    } catch (error) {
        console.error('Error in failure lookup:', error);
        res.status(500).json({
            success: false,
            error: 'Failure lookup failed',
            message: error.message
        });
    }
});

module.exports = router;

