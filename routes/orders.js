const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { isAuthenticated } = require('../middleware/auth');

// Get user's orders
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const orders = await Order.find({ user: req.session.user._id })
            .populate('items.product')
            .sort({ orderDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Order.countDocuments({ user: req.session.user._id });
        const pages = Math.ceil(total / limit);

        res.render('orders/index', {
            title: 'My Orders',
            orders,
            currentPage: page,
            pages,
            total
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        req.flash('error', 'Failed to fetch orders');
        res.redirect('/');
    }
});

// Get single order details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.session.user._id
        }).populate('items.product');

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        res.render('orders/details', {
            title: `Order #${order.invoiceNumber}`,
            order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        req.flash('error', 'Failed to fetch order details');
        res.redirect('/orders');
    }
});

// Download invoice
router.get('/:id/invoice', isAuthenticated, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.session.user._id
        }).populate('items.product');

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }

        const InvoiceGenerator = require('../utils/invoiceGenerator');
        const generator = new InvoiceGenerator(order);
        const invoicePath = await generator.generateInvoice();

        res.download(invoicePath);
    } catch (error) {
        console.error('Error generating invoice:', error);
        req.flash('error', 'Failed to generate invoice');
        res.redirect(`/orders/${req.params.id}`);
    }
});

module.exports = router;
