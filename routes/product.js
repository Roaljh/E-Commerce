const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');
const productController = require('../controllers/productController');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Admin routes (specific routes first)
router.get('/add', isAuth, isAdmin, productController.getAddProductForm);
router.post('/add', isAuth, isAdmin, upload.single('image'), productController.addProduct);
router.get('/edit/:id', isAuth, isAdmin, productController.getEditProductForm);
router.post('/edit/:id', isAuth, isAdmin, upload.single('image'), productController.updateProduct);
router.post('/delete/:id', isAuth, isAdmin, productController.deleteProduct);

// API routes
router.get('/api/:id', isAuth, productController.getProductDetailsApi);

// Generic routes (must be last)
router.get('/', isAuth, productController.getAllProducts);
router.get('/:id', isAuth, productController.getProductDetails);

module.exports = router;
