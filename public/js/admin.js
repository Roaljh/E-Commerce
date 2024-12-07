// Admin panel JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Status filter handling
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function(e) {
            filterOrders(e.target.value);
        });
    }

    // Order status update handling
    const orderStatusButtons = document.querySelectorAll('[data-order-status]');
    orderStatusButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const orderId = this.getAttribute('data-order-id');
            const status = this.getAttribute('data-order-status');
            updateOrderStatus(orderId, status);
        });
    });

    // Tracking number modal handling
    const trackingForm = document.getElementById('trackingForm');
    if (trackingForm) {
        trackingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveTrackingNumber();
        });
    }

    // Open tracking modal handling
    const trackingModalButtons = document.querySelectorAll('[data-order-id]');
    trackingModalButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const orderId = this.getAttribute('data-order-id');
            openTrackingModal(orderId);
        });
    });
});

// Filter orders by status
function filterOrders(status) {
    window.location.href = status ? `/admin/orders?status=${status}` : '/admin/orders';
}

// Update order status
function updateOrderStatus(orderId, status) {
    if (!confirm(`Are you sure you want to update the order status to ${status}?`)) return;

    // Get payment status if status is being updated to 'processing'
    let paymentStatus = null;
    if (status === 'processing') {
        paymentStatus = 'paid';
    }

    fetch(`/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ status, paymentStatus })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert(data.message || 'Error updating order status');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update order status: ' + error.message);
    });
}

// Update payment status
function updatePaymentStatus(orderId, status) {
    if (!confirm(`Are you sure you want to update the payment status to ${status}?`)) return;

    fetch(`/admin/orders/${orderId}/payment-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ paymentStatus: status })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert(data.message || 'Error updating payment status');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update payment status: ' + error.message);
    });
}

// Save tracking number
function saveTrackingNumber() {
    const trackingNumber = document.getElementById('trackingNumberInput').value.trim();
    const orderId = document.getElementById('currentOrderId').value;
    
    if (!trackingNumber) {
        alert('Please enter a tracking number');
        return;
    }

    fetch(`/admin/orders/${orderId}/tracking`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ trackingNumber })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('trackingNumberModal'));
            if (modal) {
                modal.hide();
            }
            window.location.reload();
        } else {
            alert(data.message || 'Error saving tracking number');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to save tracking number: ' + error.message);
    });
}

// Open tracking modal
function openTrackingModal(orderId) {
    document.getElementById('currentOrderId').value = orderId;
    document.getElementById('trackingNumberInput').value = '';
    const modal = new bootstrap.Modal(document.getElementById('trackingNumberModal'));
    modal.show();
}
