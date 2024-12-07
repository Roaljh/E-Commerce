module.exports = {
    formatDate: function(date) {
        if (!date) return '';
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString('en-US', options);
    },
    gt: function(a, b) {
        return a > b;
    },
    multiply: function(a, b) {
        return (a * b).toFixed(2);
    },
    eq: function(a, b) {
        return a === b;
    },
    getStatusColor: function(status) {
        const colors = {
            'pending': 'warning',
            'processing': 'info',
            'shipped': 'primary',
            'delivered': 'success',
            'cancelled': 'danger'
        };
        return colors[status.toLowerCase()] || 'secondary';
    },
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },
    times: function(n, block) {
        let accum = '';
        for(let i = 1; i <= n; i++)
            accum += block.fn(i);
        return accum;
    },
    add: function(a, b) {
        return a + b;
    },
    subtract: function(a, b) {
        return a - b;
    },
    lt: function(a, b) {
        return a < b;
    },
    and: function() {
        return Array.prototype.every.call(arguments, Boolean);
    },
    or: function() {
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    },
    capitalize: function(str) {
        if (typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    calculateSubtotal: function(price, quantity) {
        if (!price || !quantity) return 0;
        return (parseFloat(price) * parseInt(quantity)).toFixed(2);
    },
    default: function(value, defaultValue) {
        return value || defaultValue;
    },
    calculateTotal: function(items) {
        if (!items || !Array.isArray(items)) return 0;
        return items.reduce((total, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 0;
            return total + (price * quantity);
        }, 0).toFixed(2);
    },
    section: function(name, options) {
        if (!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
    }
};
