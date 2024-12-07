const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
    constructor(order) {
        this.order = order;
    }

    async generateInvoice() {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const invoiceName = `invoice-${this.order._id}.pdf`;
                const invoicePath = path.join(__dirname, '../public/invoices', invoiceName);

                // Ensure directory exists
                const dir = path.dirname(invoicePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Pipe PDF to file
                doc.pipe(fs.createWriteStream(invoicePath));

                // Add content to PDF
                this._addHeader(doc);
                this._addCustomerInfo(doc);
                this._addOrderDetails(doc);
                this._addItemsTable(doc);
                this._addTotal(doc);
                this._addFooter(doc);

                // Finalize PDF
                doc.end();

                resolve(invoicePath);
            } catch (error) {
                reject(error);
            }
        });
    }

    _addHeader(doc) {
        doc.fontSize(20)
           .text('INVOICE', { align: 'center' })
           .moveDown();

        doc.fontSize(10)
           .text(`Invoice Date: ${new Date().toLocaleDateString()}`)
           .text(`Order ID: ${this.order._id}`)
           .moveDown();
    }

    _addCustomerInfo(doc) {
        doc.fontSize(12)
           .text('Bill To:')
           .fontSize(10)
           .text(this.order.user.name || 'Customer Name')
           .text(this.order.shippingAddress.address)
           .text(`${this.order.shippingAddress.city}, ${this.order.shippingAddress.state} ${this.order.shippingAddress.zipCode}`)
           .moveDown();
    }

    _addOrderDetails(doc) {
        doc.fontSize(12)
           .text('Order Details:')
           .fontSize(10)
           .text(`Order Date: ${new Date(this.order.orderDate).toLocaleDateString()}`)
           .text(`Payment Method: ${this.order.paymentMethod}`)
           .text(`Order Status: ${this.order.status}`)
           .moveDown();
    }

    _addItemsTable(doc) {
        const tableTop = doc.y;
        const itemCodeX = 50;
        const descriptionX = 150;
        const quantityX = 350;
        const priceX = 400;
        const amountX = 500;

        // Add table headers
        doc.fontSize(10)
           .text('Item', itemCodeX, tableTop)
           .text('Description', descriptionX, tableTop)
           .text('Qty', quantityX, tableTop)
           .text('Price', priceX, tableTop)
           .text('Amount', amountX, tableTop);

        // Add horizontal line
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        let position = tableTop + 30;

        // Add items
        this.order.items.forEach(item => {
            const productName = item.product ? (item.product.name || 'Product') : 'Product';
            const productDesc = item.product ? (item.product.description || '') : '';
            
            doc.text(productName.substring(0, 20), itemCodeX, position)
               .text(productDesc.substring(0, 30), descriptionX, position)
               .text(item.quantity.toString(), quantityX, position)
               .text(this._formatCurrency(item.price), priceX, position)
               .text(this._formatCurrency(item.quantity * item.price), amountX, position);

            position += 20;
        });

        // Add horizontal line
        doc.moveTo(50, position)
           .lineTo(550, position)
           .stroke();

        return position;
    }

    _formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    _addTotal(doc) {
        const totalPosition = doc.y + 30;
        
        doc.fontSize(10)
           .text('Subtotal:', 400, totalPosition)
           .text(`$${this.order.total.toFixed(2)}`, 500, totalPosition)
           .moveDown();

        doc.fontSize(12)
           .text('Total:', 400, doc.y)
           .text(`$${this.order.total.toFixed(2)}`, 500, doc.y);
    }

    _addFooter(doc) {
        doc.fontSize(10)
           .moveDown()
           .text('Thank you for your business!', { align: 'center' })
           .moveDown()
           .text('For any questions about this invoice, please contact our customer service', { align: 'center' });
    }
}

module.exports = InvoiceGenerator;
