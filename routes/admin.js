const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/auth');

// Admin dashboard - Orders list
router.get('/orders', isAdmin, async (req, res) => {
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

        const total = await Order.countDocuments(query);
        const pages = Math.ceil(total / limit);

        res.render('admin/orders', {
            title: 'Order Management',
            orders,
            currentPage: page,
            pages,
            total,
            status
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        req.flash('error', 'Failed to fetch orders');
        res.redirect('/admin');
    }
});

// View single order
router.get('/orders/:id', isAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.product', 'name price image');

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orders');
        }

        res.render('admin/order-details', {
            title: `Order #${order.invoiceNumber}`,
            order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        req.flash('error', 'Failed to fetch order details');
        res.redirect('/admin/orders');
    }
});

// Update order status
router.post('/orders/:id/status', isAdmin, csrfProtection, adminController.updateOrderStatus);

// Update payment status
router.post('/orders/:id/payment-status', isAdmin, csrfProtection, adminController.updatePaymentStatus);

// Add order notes
router.post('/orders/:id/notes', isAdmin, async (req, res) => {
    try {
        const { notes } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.notes = notes;
        await order.save();

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error updating order notes:', error);
        res.status(500).json({ error: 'Failed to update order notes' });
    }
});

// Download invoice
router.get('/orders/:id/invoice', isAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.product', 'name price');

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orders');
        }

        const InvoiceGenerator = require('../utils/invoiceGenerator');
        const generator = new InvoiceGenerator(order);
        const invoicePath = await generator.generateInvoice();

        res.download(invoicePath);
    } catch (error) {
        console.error('Error generating invoice:', error);
        req.flash('error', 'Failed to generate invoice');
        res.redirect('/admin/orders');
    }
});

// Add tracking number
router.post('/orders/:id/tracking', isAdmin, csrfProtection, adminController.addTrackingNumber);

module.exports = router;
