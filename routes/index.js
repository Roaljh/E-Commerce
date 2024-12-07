const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Home page route
router.get('/', async (req, res) => {
    try {
        // Get featured or recent products
        const recentProducts = await Product.find()
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();

        res.render('home', {
            title: 'Welcome to E-Commerce',
            products: recentProducts,
            user: req.session.user || null,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('home', {
            title: 'Welcome to E-Commerce',
            error: 'Failed to load recent products',
            user: req.session.user || null
        });
    }
});

module.exports = router;
