const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendOrderConfirmation(order, invoicePath) {
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: order.user.email,
            subject: `Order Confirmation - Order #${order._id}`,
            html: this._generateOrderConfirmationEmail(order),
            attachments: [
                {
                    filename: `invoice-${order._id}.pdf`,
                    path: invoicePath
                }
            ]
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendOrderNotificationToAdmin(order) {
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `New Order Received - Order #${order._id}`,
            html: this._generateAdminNotificationEmail(order)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendOrderStatusUpdate(order) {
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: order.user.email,
            subject: `Order Status Update - Order #${order.invoiceNumber}`,
            html: this._generateOrderStatusEmail(order)
        };

        return this.transporter.sendMail(mailOptions);
    }

    _generateOrderConfirmationEmail(order) {
        return `
            <h1>Thank you for your order!</h1>
            <p>Dear ${order.user.name},</p>
            <p>Your order has been successfully placed.</p>
            
            <h2>Order Details:</h2>
            <p>Order ID: ${order._id}</p>
            <p>Order Date: ${new Date(order.orderDate).toLocaleDateString()}</p>
            <p>Total Amount: $${order.total.toFixed(2)}</p>
            
            <h3>Shipping Address:</h3>
            <p>${order.shippingAddress.address}</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
            
            <h3>Order Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Item</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Total</th>
                </tr>
                ${order.items.map(item => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.product.name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${item.price.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </table>
            
            <p>Please find your invoice attached to this email.</p>
            
            <p>If you have any questions about your order, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>Your E-commerce Team</p>
        `;
    }

    _generateAdminNotificationEmail(order) {
        return `
            <h1>New Order Received</h1>
            <h2>Order Details:</h2>
            <p>Order ID: ${order._id}</p>
            <p>Order Date: ${new Date(order.orderDate).toLocaleDateString()}</p>
            <p>Customer: ${order.user.name} (${order.user.email})</p>
            <p>Total Amount: $${order.total.toFixed(2)}</p>
            
            <h3>Shipping Address:</h3>
            <p>${order.shippingAddress.address}</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
            
            <h3>Order Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Item</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Total</th>
                </tr>
                ${order.items.map(item => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.product.name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${item.price.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </table>
            
            <p>Please process this order as soon as possible.</p>
        `;
    }

    _generateOrderStatusEmail(order) {
        let statusMessage = '';
        switch(order.status) {
            case 'processing':
                statusMessage = 'We are currently processing your order.';
                break;
            case 'shipped':
                statusMessage = `Your order has been shipped! Track your package with tracking number: ${order.trackingNumber}`;
                break;
            case 'delivered':
                statusMessage = 'Your order has been delivered. Thank you for shopping with us!';
                break;
            case 'cancelled':
                statusMessage = 'Your order has been cancelled. If you have any questions, please contact our support team.';
                break;
            default:
                statusMessage = 'There has been an update to your order.';
        }

        return `
            <h1>Order Status Update</h1>
            <p>Dear ${order.user.name},</p>
            <p>${statusMessage}</p>
            
            <h2>Order Details:</h2>
            <p>Order ID: ${order.invoiceNumber}</p>
            <p>Order Date: ${new Date(order.orderDate).toLocaleDateString()}</p>
            <p>Current Status: ${order.status}</p>
            
            <h3>Order Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Item</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Total</th>
                </tr>
                ${order.items.map(item => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.product.name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${item.price.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </table>
            
            <p>Total Amount: $${order.total.toFixed(2)}</p>
            
            <p>If you have any questions about your order, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>Your E-commerce Team</p>
        `;
    }
}

module.exports = EmailService;
