const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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
    },
    name: String,
    image: String
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    total: {
        type: Number,
        default: 0
    },
    itemCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Calculate total and item count before saving
cartSchema.pre('save', function(next) {
    this.total = this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    
    this.itemCount = this.items.reduce((count, item) => {
        return count + item.quantity;
    }, 0);
    
    next();
});

// Check if model exists before compiling
module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
