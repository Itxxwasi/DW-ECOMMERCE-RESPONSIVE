const express = require('express');
const router = express.Router();
const Subcategory = require('../models/Subcategory');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// GET /api/public/subcategories/:id - Get subcategory with products
router.get('/:id', async (req, res) => {
    const subcategoryId = req.params.id;
    console.log(`🔍 API: Fetching subcategory with ID: ${subcategoryId}`);
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
        console.error(`❌ Invalid subcategory ID format: ${subcategoryId}`);
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid subcategory ID format'
        });
    }
    
    try {
        // Find subcategory with populated fields
        const subcategory = await Subcategory.findById(subcategoryId)
            .populate({
                path: 'category',
                select: 'name _id slug department',
                populate: {
                    path: 'department',
                    select: 'name _id slug'
                }
            })
            .populate('imageUpload')
            .lean()
            .exec();
        
        if (!subcategory) {
            console.warn(`⚠️ Subcategory not found in DB for ID: ${subcategoryId}`);
            return res.status(404).json({ 
                success: false, 
                message: 'Subcategory not found'
            });
        }
        
        console.log(`✅ Found subcategory: ${subcategory.name}`);

        // Get query parameters for pagination and sorting
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 24));
        const skip = (page - 1) * limit;
        const sortField = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.order === 'asc' ? 1 : -1;
        
        // Build product query
        const query = { 
            subcategory: new mongoose.Types.ObjectId(subcategoryId),
            isActive: true 
        };

        // Filter by Brands
        if (req.query.brands) {
            const brandIds = req.query.brands.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (brandIds.length > 0) {
                query.brand = { $in: brandIds };
            }
        }
        
        // Filter by Price Range
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
        }

        // Filter by Availability
        if (req.query.inStock === 'true') {
            query.countInStock = { $gt: 0 };
        }
        
        // Find products
        const [products, total] = await Promise.all([
            Product.find(query)
                .populate('category', 'name _id')
                .populate('subcategory', 'name _id')
                .populate('imageUpload')
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Product.countDocuments(query).exec()
        ]);
        
        return res.json({
            success: true,
            data: {
                subcategory: {
                    _id: subcategory._id,
                    name: subcategory.name,
                    description: subcategory.description,
                    image: subcategory.imageUpload?.url || subcategory.image,
                    category: subcategory.category,
                    department: subcategory.category?.department
                },
                products: products || [],
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error in subcategory API:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message
        });
    }
});

// GET /api/public/subcategories - List all (optional, for menus if needed)
router.get('/', async (req, res) => {
    try {
        const query = { isActive: true };
        
        // Filter by category if provided
        if (req.query.category) {
            query.category = req.query.category;
        }

        const subcategories = await Subcategory.find(query)
            .select('name _id category image ordering')
            .sort({ ordering: 1, name: 1 }) // Sort by ordering then name
            .limit(100)
            .lean();
            
        res.json({ success: true, data: subcategories });
    } catch (err) {
        console.error('Error fetching subcategories list:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
