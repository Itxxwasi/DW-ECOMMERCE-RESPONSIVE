const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Department = require('../models/Department');
const Category = require('../models/Category');

// Get homepage products (lightweight, fast)
router.get('/home', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 20;

        const products = await Product.find({ isActive: true })
            .select('name price discount image imageUpload createdAt')
            .populate('imageUpload', 'url')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.set({
            'Cache-Control': 'public, max-age=60, s-maxage=120',
            'Vary': 'Accept-Encoding'
        });

        res.json({ products });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all products with filters
router.get('/', async (req, res) => {
    try {
        const { 
            departmentId, 
            categoryId,
            subcategoryId,
            brandId,
            search,
            minPrice,
            maxPrice,
            filter,
            sort = 'name',
            availability,
            page = 1,
            limit = 20
        } = req.query;

        const query = { isActive: true };
        
        // Debug logging for section filter
        if (req.query.section) {
            console.log('🔍 Public API - Section filter:', req.query.section);
        }

        if (departmentId) {
            query.department = departmentId;
        }

        if (categoryId) {
            query.category = categoryId;
        }

        if (subcategoryId) {
            query.subcategory = subcategoryId;
        }

        // Handle brandId (single) or brandIds (comma-separated)
        if (brandId) {
            query.brand = brandId;
        } else if (req.query.brandIds) {
            // If brandIds is provided as comma-separated string, convert to array
            const brandIdsArray = req.query.brandIds.split(',').filter(id => id.trim());
            if (brandIdsArray.length > 0) {
                query.brand = { $in: brandIdsArray };
            }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Price filter - filter by final price (after discount)
        // We need to use aggregation or filter after fetching since final price = price * (1 - discount/100)
        // For now, we'll filter by base price and then filter by final price in the application
        // This is a limitation - ideally we'd use MongoDB aggregation for this
        let priceFilter = null;
        if (minPrice || maxPrice) {
            priceFilter = {
                minPrice: minPrice ? parseFloat(minPrice) : null,
                maxPrice: maxPrice ? parseFloat(maxPrice) : null
            };
            // Also filter by base price as a rough filter (will refine after)
            query.price = {};
            if (minPrice) {
                // If minPrice is provided, we need to account for discount
                // For products with discount, final price = price * (1 - discount/100)
                // So price >= minPrice / (1 - maxDiscount/100) where maxDiscount is typically 100
                // For simplicity, we'll use minPrice as the minimum base price
                query.price.$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                // For maxPrice, we use it directly as max base price
                query.price.$lte = parseFloat(maxPrice);
            }
        }

        // Availability filter (in-stock or out-of-stock)
        // in-stock: stock >= 1 (stock greater than or equal to 1)
        // out-of-stock: stock <= 0 (stock less than or equal to 0)
        if (availability === 'in-stock') {
            query.stock = { $gte: 1 };
            console.log('🔍 Availability filter: in-stock (stock >= 1)');
        } else if (availability === 'out-of-stock') {
            query.stock = { $lte: 0 };
            console.log('🔍 Availability filter: out-of-stock (stock <= 0)');
        }

        // Filter by section if provided (sections is an array, use $in)
        // This is CRITICAL - must filter products by section
        // When section is specified, ONLY use section filter - ignore other filters
        if (req.query.section) {
            const sectionValue = req.query.section.trim();
            query.sections = { $in: [sectionValue] };
            console.log(`🔍 Public API - Section filter applied: "${sectionValue}" (section filter only, ignoring other filters)`);
            console.log(`🔍 Public API - Query before find:`, JSON.stringify(query, null, 2));
        } else {
            // Only apply other filters if section is NOT specified
            // Handle filter parameter (trending, discounted, new, best-selling, top-selling)
            if (filter === 'trending') {
                query.isTrending = true;
            } else if (filter === 'discounted') {
                // Support minDiscount parameter for sale events (e.g., 10.10 sale)
                const minDiscount = req.query.minDiscount ? parseFloat(req.query.minDiscount) : 0;
                query.discount = { $gt: minDiscount };
            } else if (filter === 'new') {
                query.isNewArrival = true;
            } else if (filter === 'best-selling') {
                query.isBestSelling = true;
            } else if (filter === 'top-selling') {
                query.isTopSelling = true;
            }
        }
        
        // Backward compatibility: also support collection filter
        if (req.query.collection) {
            query.collectionName = req.query.collection;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let sortQuery = {};
        switch(String(sort)) {
            case 'price-asc':
                sortQuery = { price: 1 };
                break;
            case 'price-desc':
                sortQuery = { price: -1 };
                break;
            case 'name-desc':
                sortQuery = { name: -1 };
                break;
            case 'newest':
                sortQuery = { createdAt: -1 };
                break;
            case 'oldest':
                sortQuery = { createdAt: 1 };
                break;
            case 'name':
            default:
                sortQuery = { name: 1 };
        }

        // Use lean() for faster queries and select only needed fields
        let products = await Product.find(query)
            .select('name description price discount image imageUpload category department stock isFeatured isTrending isNewArrival isBestSelling isTopSelling sections collectionName createdAt')
            .populate('category', 'name _id')
            .populate('department', 'name _id')
            .populate('imageUpload', 'url')
            .sort(sortQuery)
            .skip(skip)
            .limit(parseInt(limit) * 2) // Get more to account for price filtering
            .lean(); // Faster - returns plain JS objects

        // Apply filters after fetching (for price and availability to ensure accuracy)
        const originalCount = products.length;
        
        // Filter by final price (after discount) if price filter is provided
        if (priceFilter) {
            console.log('🔍 Price filter applied:', priceFilter);
            products = products.filter(product => {
                const finalPrice = product.price * (1 - (product.discount || 0) / 100);
                if (priceFilter.minPrice && finalPrice < parseFloat(priceFilter.minPrice)) {
                    return false;
                }
                if (priceFilter.maxPrice && finalPrice > parseFloat(priceFilter.maxPrice)) {
                    return false;
                }
                return true;
            });
            console.log(`🔍 Price filter: ${originalCount} products before, ${products.length} products after`);
        }
        
        // Apply availability filter after fetching (double check to ensure accuracy)
        if (availability === 'in-stock') {
            const beforeCount = products.length;
            products = products.filter(product => {
                const stock = product.stock || 0;
                return stock >= 1;
            });
            console.log(`🔍 In-stock filter: ${beforeCount} products before, ${products.length} products after (stock >= 1)`);
        } else if (availability === 'out-of-stock') {
            const beforeCount = products.length;
            products = products.filter(product => {
                const stock = product.stock || 0;
                return stock <= 0;
            });
            console.log(`🔍 Out-of-stock filter: ${beforeCount} products before, ${products.length} products after (stock <= 0)`);
        }
        
        // Limit to requested limit after all filtering
        products = products.slice(0, parseInt(limit));

        // Get total count - need to recalculate if price or availability filter was applied after fetching
        let total;
        if (priceFilter || availability) {
            // For accurate count with price/availability filter, we need to fetch all and count
            const countQuery = { ...query };
            // Remove stock filter from count query since we apply it after fetch
            if (availability) {
                delete countQuery.stock;
            }
            // Remove price filter from count query since we apply it after fetch
            if (priceFilter) {
                delete countQuery.price;
            }
            
            const allProducts = await Product.find(countQuery)
                .select('price discount stock')
                .lean();
            
            let filteredProducts = allProducts;
            
            // Apply price filter
            if (priceFilter) {
                filteredProducts = filteredProducts.filter(product => {
                    const finalPrice = product.price * (1 - (product.discount || 0) / 100);
                    if (priceFilter.minPrice && finalPrice < parseFloat(priceFilter.minPrice)) return false;
                    if (priceFilter.maxPrice && finalPrice > parseFloat(priceFilter.maxPrice)) return false;
                    return true;
                });
            }
            
            // Apply availability filter
            if (availability === 'in-stock') {
                filteredProducts = filteredProducts.filter(product => (product.stock || 0) >= 1);
            } else if (availability === 'out-of-stock') {
                filteredProducts = filteredProducts.filter(product => (product.stock || 0) <= 0);
            }
            
            total = filteredProducts.length;
            console.log(`🔍 Total count after filters: ${total}`);
        } else {
            total = await Product.countDocuments(query);
        }
        
        // Debug logging
        if (req.query.section) {
            console.log(`📊 Public API - Found ${total} products for section: ${req.query.section}`);
            console.log(`📊 Public API - Returning ${products.length} products (limit: ${limit})`);
            // Log product names to verify they match the section
            if (products.length > 0) {
                console.log(`📊 Public API - Product names:`, products.map(p => p.name).join(', '));
                console.log(`📊 Public API - Product sections:`, products.map(p => p.sections || []).join(' | '));
            }
        }

        // Get all departments and categories for filters (cached separately)
        const departments = await Department.find({ isActive: true }).select('name _id').sort({ name: 1 }).lean();
        const categories = await Category.find({ isActive: true }).select('name _id department').populate('department', 'name').sort({ name: 1 }).lean();

        // Add aggressive cache headers
        res.set({
            'Cache-Control': 'public, max-age=120, s-maxage=300', // 2 min browser, 5 min CDN
            'Vary': 'Accept-Encoding'
        });
        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filters: {
                departments,
                categories
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name _id department')
            .populate('department', 'name _id')
            .populate('imageUpload');
        
        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Validate and fix department-category relationship if needed
        if (product.category && product.department) {
            const categoryDeptId = product.category.department?.toString() || product.category.department;
            const productDeptId = product.department._id?.toString() || product.department.toString();
            
            if (categoryDeptId !== productDeptId) {
                // Fix the mismatch - use category's department
                console.warn(`⚠️  Product ${product._id} has department mismatch. Auto-fixing...`);
                product.department = product.category.department;
                await product.save();
                // Re-populate after save
                await product.populate('department', 'name _id');
            }
        } else if (!product.department && product.category?.department) {
            // Missing department - set it from category
            console.warn(`⚠️  Product ${product._id} missing department. Auto-fixing from category...`);
            product.department = product.category.department;
            await product.save();
            await product.populate('department', 'name _id');
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get products by brand name
router.get('/by-brand', async (req, res) => {
    try {
        const { brand, minPrice, maxPrice, sort = 'newest' } = req.query;

        if (!brand) {
            return res.status(400).json({ message: 'Brand parameter is required' });
        }

        // Build the query to match products by brandSection field
        const query = { 
            isActive: true,
            brandSection: brand  // Match the brandSection ID
        };

        // Add price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseInt(minPrice);
            if (maxPrice) query.price.$lte = parseInt(maxPrice);
        }

        // Determine sort order
        let sortOption = { createdAt: -1 }; // Default: newest first
        switch (sort) {
            case 'price-low':
                sortOption = { price: 1 };
                break;
            case 'price-high':
                sortOption = { price: -1 };
                break;
            case 'name-asc':
                sortOption = { name: 1 };
                break;
            case 'name-desc':
                sortOption = { name: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const products = await Product.find(query)
            .select('name price discount image imageUpload description isNewArrival isTopSelling')
            .populate('imageUpload', 'url')
            .sort(sortOption)
            .lean();

        res.json(products);
    } catch (err) {
        console.error('Error fetching products by brand:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;


