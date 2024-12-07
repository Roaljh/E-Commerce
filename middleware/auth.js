const jwt = require('jsonwebtoken');
const User = require('../models/User');
const csrf = require('csurf');

exports.protect = async (req, res, next) => {
  try {
    // 1. Check if token exists
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.session.token) {
      token = req.session.token;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Please log in to access this resource'
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user no longer exists'
      });
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this route'
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Authentication middleware
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please login to continue');
  res.redirect('/auth/login');
};

// Admin middleware
exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  req.flash('error', 'Access denied. Admin privileges required.');
  res.redirect('/');
};

// CSRF Protection middleware
exports.csrfProtection = csrf({ cookie: true });