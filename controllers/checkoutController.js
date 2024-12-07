const Razorpay = require('razorpay');
const Cart = require('../models/Cart');
const Order = require('../models/order');
const Product = require('../models/product');
const logger = require('../config/logger');
const crypto = require('crypto');

// Razorpay configuration
const razorpayConfig = {
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
};

// Check if Razorpay credentials are available
if (!razorpayConfig.key_id || !razorpayConfig.key_secret) {
    logger.error('Razorpay credentials are missing');
    throw new Error('Razorpay credentials are required');
}

// Initialize Razorpay
const razorpay = new Razorpay(razorpayConfig);

// Get checkout page
exports.getCheckout = async (req, res) => {
    try {
        console.log('Checkout Request User:', req.session.user);
        
        if (!req.session.user) {
            console.log('User not authenticated');
            req.flash('error', 'Please log in to proceed');
            return res.redirect('/auth/login');
        }

        const cart = await Cart.findOne({ user: req.session.user._id })
            .populate({
                path: 'items.product',
                select: 'name price stock image'
            });

        console.log('Cart Found:', cart);

        if (!cart || cart.items.length === 0) {
            console.log('Cart is empty');
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // Validate stock availability
        for (const item of cart.items) {
            if (!item.product) {
                console.log('Product not found in cart item:', item);
                req.flash('error', 'Some products are no longer available');
                return res.redirect('/cart');
            }
            if (item.quantity > item.product.stock) {
                console.log(`Insufficient stock for ${item.product.name}`);
                req.flash('error', `Not enough stock available for ${item.product.name}`);
                return res.redirect('/cart');
            }
        }

        // Calculate total
        const total = cart.items.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);
        console.log('Calculated Total:', total);

        // Create Razorpay order
        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.create({
                amount: Math.round(total * 100), // Convert to paise
                currency: 'INR',
                receipt: `checkout_${Date.now()}`,
                payment_capture: 1
            });
            console.log('Razorpay Order Created:', razorpayOrder);
        } catch (razorpayError) {
            console.error('Razorpay Order Creation Error:', razorpayError);
            req.flash('error', 'Failed to create payment order. Please try again.');
            return res.redirect('/cart');
        }

        // Modify cart to include total
        cart.total = total;

        res.render('checkout/index', {
            title: 'Checkout',
            cart,
            user: req.session.user,
            csrfToken: req.csrfToken(),
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            razorpayOrder
        });
    } catch (error) {
        console.error('Error loading checkout:', error);
        req.flash('error', 'Failed to load checkout');
        res.redirect('/cart');
    }
};

// Process checkout
exports.processCheckout = async (req, res) => {
    try {
        console.log('Checkout Process Request Body:', req.body);
        const { 
            shippingAddress, 
            city, 
            state, 
            zipCode, 
            paymentMethod,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature
        } = req.body;

        // Validate required fields
        if (!shippingAddress || !city || !state || !zipCode || !paymentMethod) {
            console.log('Missing required checkout fields');
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const cart = await Cart.findOne({ user: req.session.user._id })
            .populate('items.product');

        if (!cart || cart.items.length === 0) {
            console.log('Cart is empty for user:', req.session.user._id);
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Validate stock and calculate total
        let total = 0;
        for (const item of cart.items) {
            const product = item.product;
            if (!product) {
                console.log('Product not found for item:', item);
                return res.status(400).json({
                    success: false,
                    message: 'Some products are no longer available'
                });
            }
            if (item.quantity > product.stock) {
                console.log(`Insufficient stock for product ${product.name}. Stock: ${product.stock}, Requested: ${item.quantity}`);
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for ${product.name}`
                });
            }
            total += item.quantity * product.price;
        }

        // Create order
        const newOrder = new Order({
            user: req.session.user._id,
            items: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price
            })),
            total: total,
            shippingAddress: {
                address: shippingAddress,
                city: city,
                state: state,
                zipCode: zipCode
            },
            paymentMethod: paymentMethod,
            status: paymentMethod === 'cod' ? 'pending' : 'payment_pending',
            paymentStatus: 'pending'
        });

        // Handle online payment
        if (paymentMethod === 'online') {
            if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
                console.log('Missing Razorpay payment details');
                return res.status(400).json({
                    success: false,
                    message: 'Payment details are missing'
                });
            }

            try {
                // Store Razorpay payment details
                newOrder.paymentDetails = {
                    razorpayPaymentId,
                    razorpayOrderId,
                    razorpaySignature
                };

                // Verify payment signature
                const hmac = crypto.createHmac('sha256', razorpayConfig.key_secret);
                hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
                const generatedSignature = hmac.digest('hex');

                if (generatedSignature === razorpaySignature) {
                    newOrder.paymentStatus = 'paid';
                    newOrder.status = 'processing';
                } else {
                    console.log('Razorpay signature verification failed');
                    return res.status(400).json({
                        success: false,
                        message: 'Payment verification failed'
                    });
                }
            } catch (paymentError) {
                console.error('Razorpay payment verification error:', paymentError);
                return res.status(400).json({
                    success: false,
                    message: 'Payment verification failed',
                    error: paymentError.message
                });
            }
        }

        // Save the order
        await newOrder.save();

        // Update product stock
        for (const item of cart.items) {
            const product = item.product;
            product.stock -= item.quantity;
            await product.save();
        }

        // Clear the cart
        await Cart.findByIdAndDelete(cart._id);

        res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            orderId: newOrder._id
        });

    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process checkout',
            error: error.message
        });
    }
};

// Buy Now
exports.buyNow = async (req, res) => {
    try {
        console.log('Buy Now Request:', req.body);
        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            console.log('Product not found:', productId);
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        const requestedQuantity = parseInt(quantity) || 1;
        if (requestedQuantity < 1) {
            console.log('Invalid quantity:', requestedQuantity);
            req.flash('error', 'Invalid quantity');
            return res.redirect(`/products/${productId}`);
        }

        if (product.stock < requestedQuantity) {
            console.log('Insufficient stock:', product.stock, 'requested:', requestedQuantity);
            req.flash('error', 'Not enough stock available');
            return res.redirect(`/products/${productId}`);
        }

        // Create a temporary cart for buy now
        let cart = await Cart.findOne({ user: req.session.user._id });
        if (cart) {
            // Clear existing cart
            cart.items = [];
        } else {
            cart = new Cart({
                user: req.session.user._id,
                items: []
            });
        }

        // Add the single product
        cart.items.push({
            product: productId,
            quantity: requestedQuantity,
            price: product.price
        });

        await cart.save();
        console.log('Buy Now Cart Created:', cart);

        res.redirect('/checkout');
    } catch (error) {
        console.error('Buy now error:', error);
        req.flash('error', 'Failed to process buy now request');
        res.redirect('/products');
    }
};

exports.createOrder = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    console.log('Create Order Request:', { amount, currency });

    if (!amount || !currency) {
      console.log('Missing amount or currency');
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency || 'INR',
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    console.log('Razorpay Order Created:', order);

    res.json(order);
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    res.status(500).json({ error: 'Error creating order', details: error.message });
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    
    // For COD orders, we don't need to verify payment
    const paymentMethod = req.body.paymentMethod;
    
    if (paymentMethod === 'online') {
      const isValid = razorpay.utils.verifyPaymentSignature({
        order_id: razorpayOrderId,
        payment_id: razorpayPaymentId,
        signature: razorpaySignature
      });

      if (!isValid) {
        req.flash('error', 'Payment verification failed');
        return res.redirect('/cart');
      }
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.session.user._id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/cart');
    }

    // Calculate total
    const total = cart.items.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);

    // Create order in database
    const order = new Order({
      user: req.session.user._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      })),
      total: total,
      paymentMethod: paymentMethod === 'online' ? 'online' : 'cod',
      paymentDetails: paymentMethod === 'online' ? {
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature
      } : undefined,
      paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
      status: 'pending',
      shippingAddress: {
        address: req.body.shippingAddress,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode
      },
      statusHistory: [{
        status: 'pending',
        date: new Date(),
        note: `Order placed via ${paymentMethod === 'online' ? 'online payment' : 'cash on delivery'}`
      }]
    });

    await order.save();

    // Clear the cart
    await Cart.findOneAndUpdate(
      { user: req.session.user._id },
      { $set: { items: [] } }
    );

    // Render success page
    res.render('orders/success', {
      title: 'Order Successful',
      orderId: order._id,
      paymentId: razorpayPaymentId || 'COD',
      amount: total
    });
  } catch (error) {
    console.error('Order processing error:', error);
    req.flash('error', 'Error processing your order');
    res.redirect('/cart');
  }
};
