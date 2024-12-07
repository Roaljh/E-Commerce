const Product = require('../models/product');
const path = require('path');
const fs = require('fs');

// Get all products with optional search
exports.getAllProducts = async (req, res) => {
    try {
        const searchQuery = req.query.search;
        let query = {};

        if (searchQuery) {
            query = {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } },
                    { category: { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'username')
            .lean();

        res.render('products/index', {
            title: 'Products',
            products,
            searchQuery,
            user: req.session.user || null,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error', 'Failed to fetch products');
        res.redirect('/');
    }
};

exports.getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'username')
            .lean();

        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        res.render('products/details', {
            title: product.name,
            product,
            user: req.session.user || null,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        req.flash('error', 'Failed to fetch product details');
        res.redirect('/products');
    }
};

exports.getEditProductForm = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        // Check if user is authorized to edit
        if (product.createdBy.toString() !== req.session.user._id.toString() && !req.session.user.isAdmin) {
            req.flash('error', 'Unauthorized to edit this product');
            return res.redirect('/products');
        }

        res.render('products/edit', {
            title: 'Edit Product',
            product,
            csrfToken: req.csrfToken(),
            user: req.session.user || null,
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        req.flash('error', 'Failed to load edit form');
        res.redirect('/products');
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category, stock } = req.body;

        // Validate input
        if (!name || !description || !price || !category) {
            req.flash('error', 'All fields are required');
            return res.redirect(`/products/edit/${productId}`);
        }

        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock) || 0;

        if (isNaN(parsedPrice) || parsedPrice < 0) {
            req.flash('error', 'Invalid price value');
            return res.redirect(`/products/edit/${productId}`);
        }

        if (isNaN(parsedStock) || parsedStock < 0) {
            req.flash('error', 'Invalid stock value');
            return res.redirect(`/products/edit/${productId}`);
        }

        // Get existing product
        const product = await Product.findById(productId);
        
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        // Check authorization
        if (product.createdBy.toString() !== req.session.user._id.toString() && !req.session.user.isAdmin) {
            req.flash('error', 'Unauthorized to edit this product');
            return res.redirect('/products');
        }

        // Handle image upload
        let imagePath = product.image; // Keep existing image by default
        if (req.file) {
            imagePath = '/uploads/products/' + req.file.filename;
            
            // Delete old image if it exists and isn't the default
            if (product.image && !product.image.includes('default-product.jpg')) {
                const oldImagePath = path.join(__dirname, '..', 'public', product.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {
                name: name.trim(),
                description: description.trim(),
                price: parsedPrice,
                image: imagePath,
                category: category.trim(),
                stock: parsedStock
            },
            { new: true }
        );

        req.flash('success', 'Product updated successfully');
        res.redirect(`/products/${updatedProduct._id}`);
    } catch (error) {
        console.error('Error updating product:', error);
        req.flash('error', error.message || 'Failed to update product');
        res.redirect(`/products/edit/${req.params.id}`);
    }
};

exports.getProductDetailsApi = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'username')
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product details',
            error: error.message
        });
    }
};

exports.getAddProductForm = (req, res) => {
    res.render('products/add', {
        title: 'Add Product',
        user: req.session.user || null,
        error: req.flash('error')
    });
};

exports.addProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock } = req.body;

        if (!name || !description || !price || !category) {
            req.flash('error', 'All fields are required');
            return res.redirect('/products/add');
        }

        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock) || 0;

        if (isNaN(parsedPrice) || parsedPrice < 0) {
            req.flash('error', 'Invalid price value');
            return res.redirect('/products/add');
        }

        if (isNaN(parsedStock) || parsedStock < 0) {
            req.flash('error', 'Invalid stock value');
            return res.redirect('/products/add');
        }

        let imagePath = '/images/default-product.jpg';
        if (req.file) {
            imagePath = '/uploads/products/' + req.file.filename;
        }

        const product = new Product({
            name: name.trim(),
            description: description.trim(),
            price: parsedPrice,
            image: imagePath,
            category: category.trim(),
            stock: parsedStock,
            createdBy: req.session.user._id
        });

        await product.save();
        req.flash('success', 'Product added successfully');
        res.redirect('/products');
    } catch (error) {
        console.error('Error adding product:', error);
        req.flash('error', error.message || 'Failed to add product');
        res.redirect('/products/add');
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        if (product.createdBy.toString() !== req.session.user._id.toString() && !req.session.user.isAdmin) {
            req.flash('error', 'Unauthorized to delete this product');
            return res.redirect('/products');
        }

        // Delete product image if it's not the default
        if (product.image && !product.image.includes('default-product.jpg')) {
            const imagePath = path.join(__dirname, '..', 'public', product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Product.findByIdAndDelete(productId);
        req.flash('success', 'Product deleted successfully');
        res.redirect('/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.flash('error', 'Failed to delete product');
        res.redirect('/products');
    }
};
