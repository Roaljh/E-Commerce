const User = require('../models/User');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

// Register User
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        
        // Set user session and redirect to home
        req.session.user = newUser;
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        
        // Try to find user by email or username
        const user = await User.findOne({
            $or: [
                { email: emailOrUsername },
                { username: emailOrUsername }
            ]
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('auth/login', {
                error: 'Invalid credentials',
                csrfToken: req.csrfToken()
            });
        }

        req.session.user = user;
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('auth/login', {
            error: 'Server error occurred',
            csrfToken: req.csrfToken()
        });
    }
};

// Logout User
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.redirect('/');
    });
};

// Update Password
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user._id;

        // Validate new password
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                message: 'New password and confirm password do not match' 
            });
        }

        // Get user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Redirect to homepage after successful password update
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Profile Image
exports.updateProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error', 'No file uploaded');
            return res.redirect('/auth/profile');
        }

        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/auth/profile');
        }

        // Delete old profile image if it exists and isn't the default
        if (user.profileImage && user.profileImage !== 'default-picture.jpg') {
            const oldImagePath = path.join(__dirname, '../public/uploads/', user.profileImage);
            try {
                await fs.promises.unlink(oldImagePath);
            } catch (err) {
                console.error('Error deleting old profile image:', err);
                // Continue even if old image deletion fails
            }
        }

        // Update user with new profile image
        user.profileImage = req.file.filename;
        await user.save();

        // Update session user data
        req.session.user = {
            ...req.session.user,
            profileImage: user.profileImage
        };

        req.flash('success', 'Profile image updated successfully');
        res.redirect('/auth/profile');
    } catch (error) {
        console.error('Profile image update error:', error);
        req.flash('error', 'Failed to update profile image');
        res.redirect('/auth/profile');
    }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.session.user._id;

        // Get user to check for profile image
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete profile image if exists
        if (user.profileImage && user.profileImage !== 'default-picture.jpg') {
            const imagePath = path.join(__dirname, '../public/uploads/', user.profileImage);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.error('Error deleting profile image:', err);
            }
        }

        // Delete user
        await User.findByIdAndDelete(userId);
        
        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
            res.redirect('/');
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};