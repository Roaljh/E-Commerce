const hbs = require('hbs');
const moment = require('moment');

// Helpers object to export
const helpers = {
    formatDate: function(date) {
        if (!date) return '';
        return moment(date).format('MMMM D, YYYY [at] hh:mm A');
    },
    
    multiply: function(a, b) {
        return (parseFloat(a || 0) * parseFloat(b || 0)).toFixed(2);
    },

    calculateSubtotal: function(items) {
        if (!items) return '0.00';
        let subtotal = 0;
        items.forEach(item => {
            subtotal += parseFloat(item.quantity || 0) * parseFloat(item.price || 0);
        });
        return subtotal.toFixed(2);
    },

    calculateTotal: function(items, shippingCost = 0) {
        if (!items) return '0.00';
        let subtotal = 0;
        items.forEach(item => {
            subtotal += parseFloat(item.quantity || 0) * parseFloat(item.price || 0);
        });
        return (subtotal + parseFloat(shippingCost || 0)).toFixed(2);
    },

    default: function(value, defaultValue) {
        return parseFloat(value || defaultValue || 0).toFixed(2);
    },

    eq: function(v1, v2) {
        return v1 === v2;
    },

    or: function() {
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    },

    getStatusColor: function(status) {
        const colors = {
            'pending': 'warning',
            'processing': 'info',
            'shipped': 'primary',
            'delivered': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    },

    getPaymentStatusColor: function(status) {
        const colors = {
            'pending': 'warning',
            'paid': 'success',
            'failed': 'danger'
        };
        return colors[status] || 'secondary';
    },

    capitalize: function(str) {
        if (typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    gt: function(a, b) {
        return a > b;
    },

    lt: function(a, b) {
        return a < b;
    },

    times: function(n, block) {
        var accum = '';
        for(var i = 1; i <= n; i++)
            accum += block.fn(i);
        return accum;
    },

    add: function(a, b) {
        return a + b;
    },

    subtract: function(a, b) {
        return a - b;
    },

    includes: function(array, value) {
        return array && array.includes(value);
    },

    formatCurrency: function(number) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(number);
    },

    ifCond: function(v1, operator, v2, options) {
        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    },

    orCond: function(a, b, options) {
        return a || b ? options.fn(this) : options.inverse(this);
    },
};

// Register helpers with Handlebars
Object.keys(helpers).forEach(key => {
    hbs.registerHelper(key, helpers[key]);
});

// Export helpers for use with express-handlebars
module.exports = helpers;
