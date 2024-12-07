const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const isAuth = require('../middleware/isAuth');
const { createOrder, placeOrder } = require('../controllers/checkoutController');

// Get checkout page
router.get('/', isAuth, checkoutController.getCheckout);

// Process checkout
router.post('/process', isAuth, checkoutController.processCheckout);

// Buy now
router.post('/buy-now', isAuth, checkoutController.buyNow);

// Create order
router.post('/create-order', createOrder);

// Place order
router.post('/place-order', placeOrder);

module.exports = router;
