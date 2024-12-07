require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const exphbs = require('express-handlebars');
const helpers = require('./helpers/handlebars-helpers');
const session = require('express-session');
const helmet = require('helmet');
const csrf = require('csurf');
const winston = require('winston');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const Razorpay = require('razorpay');
const fs = require('fs');
const pdf = require('pdfkit');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// Initialize express
const app = express();

// Configure Handlebars
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: require('./helpers/handlebars-helpers'),
  // Add sections support
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 
        "https://cdn.jsdelivr.net",
        "https://checkout.razorpay.com",
        "https://api.razorpay.com",
        "https://code.jquery.com"],
      scriptSrcAttr: ["'unsafe-inline'"],  
      styleSrc: ["'self'", "'unsafe-inline'", 
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", 
        "https://checkout.razorpay.com",
        "https://api.razorpay.com",
        "https://*.razorpay.com"],
      frameSrc: ["'self'", 
        "https://api.razorpay.com",
        "https://checkout.razorpay.com"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/products', express.static(path.join(__dirname, 'uploads', 'products')));

// Flash messages middleware
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// CSRF Protection
const csrfProtection = csrf({ cookie: true });
app.use((req, res, next) => {
  // Skip CSRF for file uploads
  if ((req.path === '/products/add' || req.path.startsWith('/products/edit/')) && req.method === 'POST') {
    next();
  } else {
    csrfProtection(req, res, next);
  }
});

// Make CSRF token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  next();
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const cartRoutes = require('./routes/cart');
const indexRoutes = require('./routes/index');
const profileRoutes = require('./routes/profile');
const checkoutRoutes = require('./routes/checkout');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/checkout', checkoutRoutes);

// Razorpay payment route
app.post('/create-order', async (req, res) => {
  const { amount, currency, receipt } = req.body;
  try {
    const order = await razorpay.orders.create({ amount, currency, receipt });
    res.json(order);
  } catch (error) {
    logger.error('Razorpay Order Creation Error:', error);
    res.status(500).send('Error creating order');
  }
});

// Order placement route
app.post('/place-order', async (req, res) => {
  const { order_id, payment_id, signature, user, cart, amount } = req.body;
  // Verify payment signature
  const isValid = razorpay.utils.verifyPaymentSignature({
    order_id,
    payment_id,
    signature
  });

  if (!isValid) {
    req.flash('error', 'Payment verification failed');
    return res.redirect('/cart');
  }

  try {
    // Generate invoice
    const invoicePath = path.join(__dirname, 'invoices', `${order_id}.pdf`);
    const doc = new pdf();
    doc.pipe(fs.createWriteStream(invoicePath));
    doc.text(`Invoice for Order ${order_id}`);
    doc.text(`User: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.end();

    // Clear the cart after successful order
    await Cart.findOneAndUpdate(
      { userId: user._id },
      { $set: { items: [] } }
    );

    // Redirect to success page with order details
    res.render('orders/success', {
      orderId: order_id,
      paymentId: payment_id,
      amount: amount
    });
  } catch (error) {
    console.error('Order processing error:', error);
    req.flash('error', 'Error processing your order');
    res.redirect('/cart');
  }
});

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  
  // Handle CSRF token errors
  console.error('CSRF token validation failed');
  req.flash('error', 'Form validation failed. Please try again.');
  res.status(403);
  res.location(req.get('Referrer') || '/');
  res.redirect(req.get('Referrer') || '/');
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('MongoDB Connected'))
.catch(err => {
  logger.error('MongoDB Connection Error:', err);
  process.exit(1);
});

mongoose.set('strictQuery', true);

// Home route
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Welcome to E-Commerce',
    user: req.session.user,
    csrfToken: req.csrfToken()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;