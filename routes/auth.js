const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authController = require('../controllers/authController');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// GET routes for rendering pages
router.get('/login', (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        csrfToken: req.csrfToken()
    });
});

router.get('/register', (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        csrfToken: req.csrfToken()
    });
});

router.get('/profile', isAuthenticated, (req, res) => {
    res.render('auth/profile', {
        title: 'Profile',
        user: req.session.user,
        csrfToken: req.csrfToken()
    });
});

// Logout routes - support both GET and POST for flexibility
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/');
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/');
    });
});

// POST routes for handling authentication
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/update-password', isAuthenticated, authController.updatePassword);
router.post('/update-profile-image', isAuthenticated, upload.single('profileImage'), authController.updateProfileImage);
router.post('/delete-account', isAuthenticated, authController.deleteAccount);

module.exports = router;