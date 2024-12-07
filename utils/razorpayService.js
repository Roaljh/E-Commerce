const Razorpay = require('razorpay');

class RazorpayService {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }

    async createOrder(amount, currency = 'INR') {
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            receipt: 'order_' + Date.now(),
            payment_capture: 1
        };

        return this.razorpay.orders.create(options);
    }

    async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        const text = razorpayOrderId + '|' + razorpayPaymentId;
        const crypto = require('crypto');
        const signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(text)
            .digest('hex');

        return signature === razorpaySignature;
    }
}

module.exports = RazorpayService;
