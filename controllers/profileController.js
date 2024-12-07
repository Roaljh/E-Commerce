const User = require('../models/user');
const Order = require('../models/order');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id).select('-password');
        const recentOrders = await Order.find({ user: req.session.user._id })
            .sort({ orderDate: -1 })
            .limit(5)
            .populate('items.product');

        res.render('profile/index', {
            title: 'My Profile',
            user,
            recentOrders
        });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.session.user._id);

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/profile');
        }

        // Update basic info
        user.name = name;
        user.email = email;

        // If password change is requested
        if (newPassword) {
            if (!currentPassword) {
                req.flash('error', 'Current password is required to change password');
                return res.redirect('/profile');
            }

            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                req.flash('error', 'Current password is incorrect');
                return res.redirect('/profile');
            }

            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();

        // Update session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin
        };

        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/profile');
    }
};
