const Order = require('../models/order');
const logger = require('../config/logger');

// Get all orders
exports.getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        
        let query = {};
        if (status) {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate('user', 'name email')
            .sort({ orderDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages,
            status,
            isAdmin: true
        });
    } catch (error) {
        logger.error('Error in getOrders:', error);
        req.flash('error', 'Failed to fetch orders');
        res.redirect('/admin');
    }
};

// Get single order details
exports.getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.product');

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orders');
        }

        res.render('admin/order-details', {
            order,
            isAdmin: true
        });
    } catch (error) {
        logger.error('Error in getOrderDetails:', error);
        req.flash('error', 'Failed to fetch order details');
        res.redirect('/admin/orders');
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note, paymentStatus } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Validate status transition
        const validStatuses = ['pending', 'payment_pending', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Initialize statusHistory array if it doesn't exist
        if (!order.statusHistory) {
            order.statusHistory = [];
        }

        // Add new status to history
        order.statusHistory.push({
            status,
            date: new Date(),
            updatedBy: req.session.user ? req.session.user._id : null,
            note: note || `Status updated to ${status}`
        });

        // Update current status
        order.status = status;

        // Update payment status if provided
        if (paymentStatus && ['pending', 'paid', 'failed'].includes(paymentStatus)) {
            order.paymentStatus = paymentStatus;
        }

        // Update delivery date if status is delivered
        if (status === 'delivered') {
            order.deliveryDate = new Date();
        }

        await order.save();

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: {
                status: order.status,
                paymentStatus: order.paymentStatus
            }
        });
    } catch (error) {
        logger.error('Error in updateOrderStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;

        // Validate payment status
        if (!paymentStatus || !['pending', 'paid', 'failed'].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update payment status
        order.paymentStatus = paymentStatus;
        
        // Add to status history
        if (!order.statusHistory) {
            order.statusHistory = [];
        }
        
        order.statusHistory.push({
            status: order.status,
            date: new Date(),
            updatedBy: req.session.user ? req.session.user._id : null,
            note: `Payment status updated to ${paymentStatus}`
        });

        await order.save();

        res.json({
            success: true,
            message: 'Payment status updated successfully',
            order: {
                status: order.status,
                paymentStatus: order.paymentStatus
            }
        });
    } catch (error) {
        logger.error('Error in updatePaymentStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
    }
};

// Add tracking number
exports.addTrackingNumber = async (req, res) => {
    try {
        const { id } = req.params;
        const { trackingNumber } = req.body;

        if (!trackingNumber || trackingNumber.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Tracking number is required'
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Add tracking number and update status to shipped if not already
        order.trackingNumber = trackingNumber.trim();
        if (order.status === 'processing') {
            order.status = 'shipped';
            order.statusHistory.push({
                status: 'shipped',
                date: new Date(),
                updatedBy: req.session.user ? req.session.user._id : null,
                note: `Order shipped with tracking number: ${trackingNumber}`
            });
        }

        await order.save();

        res.json({
            success: true,
            message: 'Tracking number added successfully',
            order: {
                status: order.status,
                trackingNumber: order.trackingNumber
            }
        });
    } catch (error) {
        logger.error('Error in addTrackingNumber:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add tracking number',
            error: error.message
        });
    }
};
