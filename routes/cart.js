const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const isAuth = require('../middleware/isAuth');

// View cart
router.get('/', isAuth, cartController.getCart);

// Add to cart
router.post('/add', isAuth, cartController.addToCart);

// Update cart item quantity
router.post('/update', isAuth, cartController.updateCartItem);

// Remove from cart
router.post('/remove', isAuth, cartController.removeFromCart);

module.exports = router;
