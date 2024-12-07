const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { isAuthenticated } = require('../middleware/auth');

// Get profile page
router.get('/', isAuthenticated, profileController.getProfile);

// Update profile
router.post('/update', isAuthenticated, profileController.updateProfile);

module.exports = router;
