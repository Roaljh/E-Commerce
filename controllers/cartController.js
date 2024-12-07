const Cart = require('../models/cart');
const Product = require('../models/product');

// Get cart
exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.session.user._id })
            .populate({
                path: 'items.product',
                model: 'Product',
                select: 'name image price stock category'
            });

        if (!cart) {
            cart = new Cart({
                user: req.session.user._id,
                items: [],
                total: 0,
                itemCount: 0
            });
            await cart.save();
        }

        // Ensure all cart items have valid products
        if (cart.items && cart.items.length > 0) {
            const originalLength = cart.items.length;
            cart.items = cart.items.filter(item => item.product != null);
            if (cart.items.length !== originalLength) {
                await cart.save();
            }
        }

        res.render('cart/index', {
            title: 'Shopping Cart',
            cart,
            user: req.session.user,
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        req.flash('error', 'Failed to fetch cart');
        res.redirect('/');
    }
};

// Add to cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        const requestedQuantity = parseInt(quantity) || 1;
        if (requestedQuantity < 1) {
            req.flash('error', 'Invalid quantity');
            return res.redirect(`/products/${productId}`);
        }

        if (product.stock < requestedQuantity) {
            req.flash('error', 'Not enough stock available');
            return res.redirect(`/products/${productId}`);
        }

        let cart = await Cart.findOne({ user: req.session.user._id });

        if (!cart) {
            cart = new Cart({
                user: req.session.user._id,
                items: []
            });
        }

        const existingItem = cart.items.find(item => 
            item.product && item.product.toString() === productId
        );

        if (existingItem) {
            if (existingItem.quantity + requestedQuantity > product.stock) {
                req.flash('error', 'Cannot add more items than available in stock');
                return res.redirect(`/products/${productId}`);
            }
            existingItem.quantity += requestedQuantity;
        } else {
            cart.items.push({
                product: productId,
                quantity: requestedQuantity,
                price: product.price
            });
        }

        await cart.save();
        req.flash('success', 'Product added to cart');
        res.redirect('/cart');
    } catch (error) {
        console.error('Error adding to cart:', error);
        req.flash('error', 'Failed to add to cart');
        res.redirect('/products');
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const newQuantity = parseInt(quantity);

        // Validate quantity
        if (isNaN(newQuantity) || newQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity'
            });
        }

        // Find cart
        const cart = await Cart.findOne({ user: req.session.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // If quantity is 0, remove the item
        if (newQuantity === 0) {
            cart.items = cart.items.filter(item => 
                item.product.toString() !== productId
            );
            await cart.save();
            
            return res.json({
                success: true,
                message: 'Item removed from cart',
                cart: {
                    items: cart.items,
                    total: cart.total,
                    itemCount: cart.itemCount
                }
            });
        }

        // Find product and validate stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check stock availability
        if (newQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available in stock`
            });
        }

        // Update cart item
        const cartItem = cart.items.find(item => 
            item.product.toString() === productId
        );

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        // Update quantity and price
        cartItem.quantity = newQuantity;
        cartItem.price = product.price;

        await cart.save();

        // Populate product details for response
        await cart.populate('items.product');

        res.json({
            success: true,
            message: 'Cart updated successfully',
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.itemCount
            }
        });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update cart'
        });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const cart = await Cart.findOne({ user: req.session.user._id });

        if (!cart) {
            req.flash('error', 'Cart not found');
            return res.redirect('/cart');
        }

        // Remove item from cart
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();

        // Send JSON response for AJAX requests
        if (req.xhr) {
            return res.json({
                success: true,
                message: 'Item removed from cart',
                cart: {
                    total: cart.total,
                    itemCount: cart.itemCount,
                    items: cart.items
                }
            });
        }

        req.flash('success', 'Item removed from cart');
        res.redirect('/cart');
    } catch (error) {
        console.error('Error removing item from cart:', error);
        if (req.xhr) {
            return res.status(500).json({
                success: false,
                message: 'Failed to remove item'
            });
        }
        req.flash('error', 'Failed to remove item from cart');
        res.redirect('/cart');
    }
};
