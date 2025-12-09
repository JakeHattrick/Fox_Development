// ======================================================================
// File: middlewares/roleCheck.js
//
// PURPOSE:
//   Implements Role-Based Access Control (RBAC) for the backend.
//   Controls which users can access or modify specific resources.
//
// ASSUMPTIONS:
//   - req.user is set by authentication middleware (e.g., JWT verification).
//   - req.user.role is one of: 'superuser', 'user', or other custom roles.
//
// ROLES SUMMARY:
//   Superuser: Full CRUD on all tables.
//   Regular User:
//       - Can READ and UPDATE: users (own info), fixtures, health, usage.
//       - Can FULLY CRUD: fixture_maintenance table.
//
// ======================================================================

// ----------------------------------------------------------------------
// Middleware: isSuperuser
// PURPOSE: Allow only superusers to proceed. Blocks everyone else.
// ----------------------------------------------------------------------
function isSuperuser(req, res, next) {
  // Ensure user info exists
  if (!req.user) {
    return res.status(401).json({ error: 'No value entered for user' });
  }

  // Check if role matches 'superuser'
  if (req.user.role === 'superuser') {
    return next(); //  Allow superuser to continue
  }

  // Deny access for non-superusers
  return res.status(403).json({ error: 'Forbidden: Superuser access required' });
}

// ----------------------------------------------------------------------
//  Middleware: allowReadUpdate
// PURPOSE:
//   - Allow all users to READ (GET) and UPDATE (PATCH) data.
//   - Restrict CREATE (POST) and DELETE operations to superusers only.
// USAGE EXAMPLE:
//   router.get('/', allowReadUpdate, controller.getSomething);
//   router.patch('/:id', allowReadUpdate, controller.updateSomething);
// ----------------------------------------------------------------------
function allowReadUpdate(req, res, next) {
  // If user not authenticated, deny access
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  // Superusers bypass all restrictions
  if (req.user.role === 'superuser') return next();

  // Allow GET (read) and PATCH (update) requests for all users
  if (req.method === 'GET' || req.method === 'PATCH') return next();

  // Block POST, PUT, DELETE for non-superusers
  return res.status(403).json({
    error: 'Forbidden: Only superuser can perform this action'
  });
}

// ----------------------------------------------------------------------
//  Middleware: allowAllMaintenance
// PURPOSE:
//   - Allow all users (superuser or regular) to perform full CRUD
//     on fixture_maintenance table.
//   - This table is explicitly open for collaboration.
// ----------------------------------------------------------------------
function allowAllMaintenance(req, res, next) {
  // Note: You could add audit logging here if needed.
  // For example: console.log(`${req.user.username} performed ${req.method} on maintenance`);
  return next(); //  Everyone can proceed
}

// ----------------------------------------------------------------------
// Middleware: allowSuperUserOnly
// PURPOSE:
//   - Blocks *all* users except those with role 'superuser'.
//   - Useful for sensitive tables like system config, admin users, etc.
// ----------------------------------------------------------------------
function allowSuperUserOnly(req, res, next) {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  // Check if user is superuser
  if (req.user.role === 'superuser') {
    return next(); // Allow
  }

  // Deny everyone else
  return res.status(403).json({
    error: 'Forbidden: Only superuser can access this resource'
  });
}

// ----------------------------------------------------------------------
//  Export all middlewares
// ----------------------------------------------------------------------
module.exports = {
  isSuperuser,         // Check for superuser privileges only
  allowReadUpdate,     // Allow GET/PATCH for all; restrict POST/DELETE
  allowAllMaintenance, // Allow all CRUD actions on fixture_maintenance
  allowSuperUserOnly   // Allow only superuser for highly restricted routes
};
