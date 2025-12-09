const express = require('express');
const cors = require('cors'); 
const { pool } = require('./db.js');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

<<<<<<< HEAD
=======
/*#################################################
#    Global Error Handling Setup               #
#    These handlers catch uncaught exceptions  #
#    and unhandled promise rejections to       #
#    prevent the server from crashing          #
#################################################*/

>>>>>>> origin/main
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
});

<<<<<<< HEAD
app.use(cors()); 
app.use(express.json()); 

const functionalTestingRouter = require('./routes/functionalTestingRecords');
app.use('/api/functional-testing', functionalTestingRouter);

const packingRouter = require('./routes/packingRoutes');
app.use('/api/packing', packingRouter);

const sortRecordRouter = require('./routes/sortRecord');
app.use('/api/sort-record', sortRecordRouter);

const tpyRouter = require('./routes/tpyRoutes');
app.use('/api/tpy', tpyRouter);

const snfnRouter = require('./routes/snfnRecords');
app.use('/api/snfn', snfnRouter);

const stationHourlySummaryRouter = require('./routes/stationHourlySummary');
app.use('/api/station-hourly-summary', stationHourlySummaryRouter);

const pchartRouter = require('./routes/pChart');
app.use('/api/pchart', pchartRouter);

const workstationRouter = require('./routes/workstationRoutes');
app.use('/api/workstationRoutes', workstationRouter);

const testboardRouter = require('./routes/testboardRecords');
app.use('/api/testboardRecords', testboardRouter);

try {
    const uploadHandlerRouter = require('./routes/uploadHandler');
    app.use('/api/upload', uploadHandlerRouter);
=======
/*#################################################
#    Middleware Configuration                   #
#    CORS allows frontend to make requests     #
#    express.json() parses JSON request bodies #
#################################################*/
app.use(cors()); 
app.use(express.json()); 

// Temporary role mock for testing
app.use((req, res, next) => {
  req.user = { username: 'superadmin', role: 'superuser' };
  next();
});

/*#################################################
#    API Route Registration (v1)               #
#    All API endpoints are registered here     #
#    Each route file contains multiple         #
#    endpoints for a specific domain           #
#    Format: /api/v1/domain-name/endpoint      #
#    Version: v1 (October 2025)                #
#################################################*/
const functionalTestingRouter = require('./routes/functionalTestingRecords');
app.use('/api/v1/functional-testing', functionalTestingRouter);

const packingRouter = require('./routes/packingRoutes');
app.use('/api/v1/packing', packingRouter);

const sortRecordRouter = require('./routes/sortRecord');
app.use('/api/v1/sort-record', sortRecordRouter);

const tpyRouter = require('./routes/tpyRoutes');
app.use('/api/v1/tpy', tpyRouter);

const snfnRouter = require('./routes/snfnRecords');
app.use('/api/v1/snfn', snfnRouter);

const stationHourlySummaryRouter = require('./routes/stationHourlySummary');
app.use('/api/v1/station-hourly-summary', stationHourlySummaryRouter);

const pchartRouter = require('./routes/pChart');
app.use('/api/v1/pchart', pchartRouter);

const workstationRouter = require('./routes/workstationRoutes');
app.use('/api/v1/workstation-routes', workstationRouter);  // Renamed from workstationRoutes to workstation-routes

const testboardRouter = require('./routes/testboardRecords');
app.use('/api/v1/testboard-records', testboardRouter);  // Renamed from testboardRecords to testboard-records

const spcRouter = require('./routes/spcRoutes');
app.use('/api/v1/spc', spcRouter);

const sqlPortalRouter = require('./routes/sqlPortal');
app.use('/api/v1/sql-portal', sqlPortalRouter);

<<<<<<< HEAD
const fixtureMaintenanceRouter = require('./routes/fixtureMaintenanceRoutes');
app.use('/api/fixtureMaintenance', fixtureMaintenanceRouter);

const fixturesRouter = require('./routes/fixturesRoutes');
app.use('/api/fixtures', fixturesRouter);
=======
const fixturesRouter = require('./routes/fixturesRoutes');
app.use('/api/fixtures', fixturesRouter); // no versioning for now

const usersRoutes = require('./routes/usersRoutes'); 
app.use('/api/users', usersRoutes);

const fixtureMaintenanceRoutes = require('./routes/fixtureMaintenanceRoutes');
app.use('/api/fixture-maintenance', fixtureMaintenanceRoutes);

const healthRoutes   = require('./routes/healthRoutes');   
app.use('/api/health', healthRoutes);    

const usageRoutes    = require('./routes/usageRoutes');    
app.use('/api/usage', usageRoutes);      

const fixturePartsRoutes = require('./routes/fixturePartsRoutes');
app.use('/api/fixture-parts', fixturePartsRoutes);
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3

/*#################################################
#    Optional Route Registration                #
#    Upload handler is wrapped in try-catch    #
#    in case the file doesn't exist or has     #
#    errors - this prevents server startup     #
#    from failing due to missing dependencies  #
#################################################*/
try {
    const uploadHandlerRouter = require('./routes/uploadHandler');
    app.use('/api/v1/upload', uploadHandlerRouter);
>>>>>>> origin/main
} catch (error) {
}


<<<<<<< HEAD
=======
/*#################################################
#    Server Startup and Database Connection     #
#    Server starts on PORT 5000 (or env var)   #
#    Database connection is tested on startup   #
#    to ensure everything is working properly   #
#################################################*/
>>>>>>> origin/main
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Test DB connection after server starts
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Database connected at:', res.rows[0].now);
});