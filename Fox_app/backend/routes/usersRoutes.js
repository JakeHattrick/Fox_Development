const express = require('express');
const router = express.Router();

// Import all controller functions including deleteUser
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/usersController');

// Import role-based access middleware
const { allowReadUpdate, isSuperuser } = require('../middlewares/roleCheck');

// ============================================================
// Superuser-only routes (CREATE and DELETE users)
// ============================================================
router.post('/', isSuperuser, createUser);       // Create new user
router.delete('/:id', isSuperuser, deleteUser);  // Delete user by ID

// ============================================================
// Routes accessible to all users (READ and UPDATE)
// ============================================================
router.get('/', allowReadUpdate, getUsers);          // Get all users
router.get('/:id', allowReadUpdate, getUserById);    // Get single user by ID
router.patch('/:id', allowReadUpdate, updateUser);   // Update existing user

module.exports = router;
