// Main JavaScript file

// Handle quantity updates in cart
function updateQuantity(productId, change) {
    fetch(`/cart/update/${productId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ quantity: change })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert(data.message || 'Error updating quantity');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update quantity');
    });
}

// Handle item removal from cart
function removeFromCart(productId) {
    if (confirm('Are you sure you want to remove this item?')) {
        fetch(`/cart/remove/${productId}`, {
            method: 'POST',
            headers: {
                'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'Error removing item');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to remove item');
        });
    }
}

// Add to cart functionality
function addToCart(productId) {
    fetch('/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ productId, quantity: 1 })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Product added to cart successfully!');
        } else {
            alert(data.message || 'Error adding product to cart');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to add product to cart');
    });
}

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    // Initialize any Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Add any other initialization code here
});

function initializeRazorpay(orderId, amount, email, contact) {
    const options = {
        key: razorpayKeyId,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        name: 'E-Commerce Store',
        description: 'Order Payment',
        order_id: orderId,
        handler: function (response) {
            document.getElementById('razorpayPaymentId').value = response.razorpay_payment_id;
            document.getElementById('razorpayOrderId').value = response.razorpay_order_id;
            document.getElementById('razorpaySignature').value = response.razorpay_signature;
            document.getElementById('checkoutForm').submit();
        },
        prefill: {
            email: email,
            contact: contact
        },
        notes: {
            address: 'E-Commerce Store'
        },
        theme: {
            color: '#007bff'
        }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
}
