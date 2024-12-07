const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    total: {
        type: Number,
        required: true
    },
    shippingAddress: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        }
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online'],
        required: true
    },
    paymentDetails: {
        razorpayPaymentId: String,
        razorpayOrderId: String,
        razorpaySignature: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['pending', 'payment_pending', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    statusHistory: [{
        status: {
            type: String,
            enum: ['pending', 'payment_pending', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled'],
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        note: String
    }],
    orderDate: {
        type: Date,
        default: Date.now
    },
    deliveryDate: Date,
    trackingNumber: String,
    invoiceNumber: {
        type: String,
        unique: true
    },
    notes: String
}, {
    timestamps: true
});

// Generate invoice number before saving
orderSchema.pre('save', async function(next) {
    if (!this.invoiceNumber) {
        const count = await mongoose.model('Order').countDocuments();
        this.invoiceNumber = `INV${new Date().getFullYear()}${(count + 1).toString().padStart(6, '0')}`;
    }
    next();
});

// Add methods to the order schema
orderSchema.methods.canCancel = function() {
    return ['pending', 'payment_pending', 'payment_failed', 'processing'].includes(this.status);
};

orderSchema.methods.canUpdate = function() {
    return this.status !== 'cancelled' && this.status !== 'delivered';
};

// Check if model exists before compiling
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
