const express = require('express');
const crypto = require('crypto');
const adminAuth = require('../middleware/adminAuth');
const HomepageSection = require('../models/HomepageSection');
const Slider = require('../models/Slider');
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Department = require('../models/Department');
const Subcategory = require('../models/Subcategory');
const Product = require('../models/Product');

const router = express.Router();

// Helper function to generate ETag from data
function generateETag(data) {
    const str = JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex');
}

// Helper function to set cache headers for public API responses
function setCacheHeaders(req, res, data, maxAge = 300) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
        // No caching in development
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        return false; // Don't check ETag in development
    } else {
        // Production caching with ETag
        const etag = generateETag(data);
        res.set({
            'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
            'ETag': `"${etag}"`,
            'Vary': 'Accept-Encoding'
        });
        
        // Check if client has matching ETag (304 Not Modified)
        if (req.headers['if-none-match'] === `"${etag}"`) {
            res.status(304).end();
            return true; // Response already sent
        }
        return false; // Continue with normal response
    }
}

// Public route - Get all active published sections for homepage
router.get('/public', async (req, res) => {
    try {
        console.log('Fetching public homepage sections...');
        const sections = await HomepageSection.find({
            isActive: true,
            isPublished: true
        })
        .sort({ ordering: 1, createdAt: 1 })
        .select('-createdBy -updatedBy') // Exclude unnecessary fields for faster response
        .lean(); // Use lean() for faster queries (returns plain JS objects)
        
        console.log(`Found ${sections.length} active and published sections:`, sections.map(s => ({ 
            id: s._id, 
            name: s.name, 
            type: s.type, 
            ordering: s.ordering,
            isActive: s.isActive,
            isPublished: s.isPublished 
        })));
        
        // Log brand marquee sections with their config
        const brandMarqueeSections = sections.filter(s => s.type === 'brandMarquee');
        if (brandMarqueeSections.length > 0) {
            console.log('Brand Marquee sections found:', brandMarqueeSections.length);
            brandMarqueeSections.forEach(section => {
                console.log(`Brand Marquee Section "${section.name}":`, {
                    id: section._id,
                    hasConfig: !!section.config,
                    hasBrandImages: !!(section.config && section.config.brandImages),
                    brandImagesCount: section.config && section.config.brandImages ? section.config.brandImages.length : 0,
                    brandImages: section.config && section.config.brandImages ? section.config.brandImages.map(img => ({
                        brandName: img.brandName,
                        url: img.url,
                        brandId: img.brandId
                    })) : []
                });
            });
        }
        
        const activeBrands = await Brand.find({ isActive: true })
            .select('name alt _id')
            .lean();
        const brandLookup = new Map();
        activeBrands.forEach(b => {
            const n = String(b.name || '').trim().toLowerCase();
            const a = String(b.alt || '').trim().toLowerCase();
            if (n) brandLookup.set(n, String(b._id));
            if (a) brandLookup.set(a, String(b._id));
        });

        sections.forEach(s => {
            if ((s.type === 'brandSection' || s.type === 'brandsection') && s.config && Array.isArray(s.config.brands)) {
                s.config.brands = s.config.brands.map(b => {
                    const key = String(b.name || '').trim().toLowerCase();
                    const id = brandLookup.get(key);
                    return { ...b, id };
                });
            }
        });

        // Log brand sections with their config
        const brandSections = sections.filter(s => s.type === 'brandSection' || s.type === 'brandsection');
        if (brandSections.length > 0) {
            console.log('🔍 Brand Section(s) found:', brandSections.length);
            brandSections.forEach(section => {
                console.log(`🔍 Brand Section "${section.name}":`, {
                    id: section._id,
                    name: section.name,
                    type: section.type,
                    isActive: section.isActive,
                    isPublished: section.isPublished,
                    hasConfig: !!section.config,
                    hasBrands: !!(section.config && section.config.brands),
                    brandsCount: section.config && section.config.brands ? section.config.brands.length : 0,
                    brands: section.config && section.config.brands ? section.config.brands.map(b => ({
                        name: b.name,
                        imageUrl: b.imageUrl,
                        link: b.link,
                        id: b.id,
                        discount: b.discount,
                        discountText: b.discountText,
                        order: b.order
                    })) : [],
                    location: section.config?.location || 'none',
                    fullConfig: section.config
                });
            });
        } else {
            console.log('⚠️ No Brand Section(s) found in active/published sections');
        }
        
        // Set cache headers with ETag support (5 min cache in production)
        const responseSent = setCacheHeaders(req, res, sections, 300);
        if (!responseSent) {
            res.json(sections);
        }
    } catch (error) {
        console.error('Error fetching public homepage sections:', error);
        res.status(500).json({ message: error.message });
    }
});

// Admin routes - Get all sections
router.get('/', adminAuth, async (req, res) => {
    try {
        const { type, active, published } = req.query;
        const filters = {};
        
        if (type) filters.type = type;
        if (active !== undefined) filters.isActive = active === 'true' || active === true;
        if (published !== undefined) filters.isPublished = published === 'true' || published === true;
        
        const sections = await HomepageSection.find(filters)
            .sort({ ordering: 1, createdAt: 1 })
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');
        
        res.json(sections);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin route - Get section by ID
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const section = await HomepageSection.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');
        
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }
        
        res.json(section);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin route - Create section
router.post('/', adminAuth, async (req, res) => {
    try {
        const payload = {
            name: req.body.name,
            type: req.body.type,
            title: req.body.title,
            subtitle: req.body.subtitle,
            description: req.body.description,
            config: req.body.config || {},
            ordering: req.body.ordering,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            isPublished: req.body.isPublished !== undefined ? req.body.isPublished : false,
            displayOn: req.body.displayOn || {
                desktop: true,
                tablet: true,
                mobile: true
            },
            createdBy: req.user?.id,
            updatedBy: req.user?.id
        };
        
        // Auto-generate ordering if not provided
        if (payload.ordering === undefined || payload.ordering === null) {
            const lastSection = await HomepageSection.findOne().sort({ ordering: -1 });
            payload.ordering = lastSection ? lastSection.ordering + 1 : 0;
        }
        
        // Validate required fields
        if (!payload.name || !payload.type) {
            return res.status(400).json({ 
                message: 'Name and type are required fields',
                details: { name: payload.name, type: payload.type }
            });
        }
        
        // Validate type enum
            const validTypes = ['heroSlider', 'scrollingText', 'categoryFeatured', 'categoryGrid', 'categoryCircles', 'departmentGrid', 'productTabs', 'productCarousel', 'newArrivals', 'topSelling', 'featuredCollections', 'subcategoryGrid', 'bannerFullWidth', 'videoBanner', 'collectionLinks', 'newsletterSocial', 'brandSection', 'customHTML'];
        if (!validTypes.includes(payload.type)) {
            return res.status(400).json({ 
                message: `Invalid section type: ${payload.type}. Valid types are: ${validTypes.join(', ')}`,
                receivedType: payload.type
            });
        }
        
        console.log('Creating homepage section with payload:', JSON.stringify(payload, null, 2));
        
        // Log brandImages if present
        if (payload.config && payload.config.brandImages) {
            console.log('Brand images in config:', JSON.stringify(payload.config.brandImages, null, 2));
        }
        
        // Log brands if present (for brandSection)
        if (payload.config && payload.config.brands) {
            console.log('Brands in config:', JSON.stringify(payload.config.brands, null, 2));
            console.log('Number of brands:', payload.config.brands.length);
        }
        
        const section = new HomepageSection(payload);
        await section.save();
        
        console.log('Section saved successfully. ID:', section._id);
        console.log('Saved config:', JSON.stringify(section.config, null, 2));
        
        res.status(201).json(section);
    } catch (error) {
        console.error('Error creating homepage section:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            Object.keys(error.errors).forEach(key => {
                validationErrors[key] = error.errors[key].message;
            });
            return res.status(400).json({ 
                message: 'Validation error',
                errors: validationErrors,
                details: error.message
            });
        }
        
        // Handle duplicate key error (unique constraint)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                message: `A section with this ${field} already exists`,
                field: field,
                value: error.keyValue[field]
            });
        }
        
        res.status(400).json({ 
            message: error.message || 'Error creating homepage section',
            error: error.name,
            details: error.toString()
        });
    }
});

// Admin route - Update section
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const payload = {
            name: req.body.name,
            type: req.body.type,
            title: req.body.title,
            subtitle: req.body.subtitle,
            description: req.body.description,
            config: req.body.config,
            ordering: req.body.ordering,
            isActive: req.body.isActive,
            isPublished: req.body.isPublished,
            displayOn: req.body.displayOn,
            updatedBy: req.user?.id
        };
        
        // Validate type enum if type is being updated
        if (payload.type !== undefined) {
            const validTypes = ['heroSlider', 'scrollingText', 'categoryFeatured', 'categoryGrid', 'categoryCircles', 'departmentGrid', 'productTabs', 'productCarousel', 'newArrivals', 'topSelling', 'featuredCollections', 'subcategoryGrid', 'bannerFullWidth', 'videoBanner', 'collectionLinks', 'newsletterSocial', 'brandSection', 'customHTML'];
            if (!validTypes.includes(payload.type)) {
                return res.status(400).json({ 
                    message: `Invalid section type: ${payload.type}. Valid types are: ${validTypes.join(', ')}`,
                    receivedType: payload.type
                });
            }
        }
        
        // Remove undefined fields
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) {
                delete payload[key];
            }
        });
        
        console.log('Updating homepage section with payload:', JSON.stringify(payload, null, 2));
        
        // Log brandImages if present
        if (payload.config && payload.config.brandImages) {
            console.log('Brand images in config:', JSON.stringify(payload.config.brandImages, null, 2));
        }
        
        // Log brands if present (for brandSection)
        if (payload.config && payload.config.brands) {
            console.log('Brands in config:', JSON.stringify(payload.config.brands, null, 2));
            console.log('Number of brands:', payload.config.brands.length);
        }
        
        const section = await HomepageSection.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );
        
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }
        
        console.log('Section updated successfully. ID:', section._id);
        console.log('Updated config:', JSON.stringify(section.config, null, 2));
        
        res.json(section);
    } catch (error) {
        console.error('Error updating homepage section:', error);
        console.error('Error stack:', error.stack);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            Object.keys(error.errors).forEach(key => {
                validationErrors[key] = error.errors[key].message;
            });
            return res.status(400).json({ 
                message: 'Validation error',
                errors: validationErrors,
                details: error.message
            });
        }
        
        // Handle duplicate key error (unique constraint)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                message: `A section with this ${field} already exists`,
                field: field,
                value: error.keyValue[field]
            });
        }
        
        res.status(400).json({ 
            message: error.message || 'Error updating homepage section',
            error: error.name,
            details: error.toString()
        });
    }
});

// Admin route - Reorder sections
router.patch('/reorder', adminAuth, async (req, res) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            return res.status(400).json({ message: 'Order payload must be an array' });
        }
        
        const updates = order.map(item => {
            if (!item?.id) return null;
            return HomepageSection.findByIdAndUpdate(
                item.id,
                { ordering: item.ordering },
                { new: true }
            );
        }).filter(Boolean);
        
        await Promise.all(updates);
        res.json({ updated: updates.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin route - Delete section
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const section = await HomepageSection.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }
        
        await section.deleteOne();
        res.json({ message: 'Section deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Public route - Get section data for published sections
router.get('/:id/data/public', async (req, res) => {
    try {
        const section = await HomepageSection.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }
        
        // Only allow access to published and active sections
        if (!section.isActive || !section.isPublished) {
            return res.status(403).json({ message: 'Section is not published' });
        }
        
        let data = {};
        
        switch (section.type) {
            case 'newArrivals':
                // Get new arrival products from ALL categories (don't filter by categoryId)
                const newArrivalFilters = { isActive: true, isNewArrival: true };
                // Removed categoryId filter to show products from all categories
                // if (section.config?.categoryId) {
                //     newArrivalFilters.category = section.config.categoryId;
                // }
                const newArrivalProducts = await Product.find(newArrivalFilters)
                    .populate('category', 'name _id')
                    .populate('department', 'name _id')
                    .populate('imageUpload')
                    .limit(section.config?.limit || 100) // Increased limit to get products from all categories
                    .sort({ createdAt: -1 });
                console.log(`New Arrivals (Admin): Found ${newArrivalProducts.length} products from all categories`);
                data = { products: newArrivalProducts };
                break;
                
            case 'topSelling':
                // Get top selling products
                const topSellingFilters = { isActive: true, isTopSelling: true };
                if (section.config?.categoryId) {
                    topSellingFilters.category = section.config.categoryId;
                }
                const topSellingProducts = await Product.find(topSellingFilters)
                    .populate('category', 'name')
                    .populate('department', 'name')
                    .populate('imageUpload')
                    .limit(section.config?.limit || 20)
                    .sort({ createdAt: -1 });
                data = { products: topSellingProducts };
                break;
                
            case 'featuredCollections':
                // Get all active subcategories
                const subcategories = await Subcategory.find({ isActive: true })
                    .populate('category', 'name _id')
                    .populate('imageUpload')
                    .sort({ ordering: 1, name: 1 });
                data = { subcategories };
                break;
                
            case 'subcategoryGrid':
                // Get selected subcategories for grid (6 boxes) and button strip
                const gridSubcategoryIds = section.config?.subcategoryIds || [];
                const buttonSubcategoryIds = section.config?.buttonSubcategoryIds || [];
                
                // Fetch grid subcategories (limit to 6)
                const gridSubcategories = gridSubcategoryIds.length > 0
                    ? await Subcategory.find({ 
                        _id: { $in: gridSubcategoryIds },
                        isActive: true 
                    })
                    .populate('category', 'name _id')
                    .populate('imageUpload')
                    .limit(6)
                    .lean()
                    : [];
                
                // Fetch button subcategories (for red strip below)
                const buttonSubcategories = buttonSubcategoryIds.length > 0
                    ? await Subcategory.find({ 
                        _id: { $in: buttonSubcategoryIds },
                        isActive: true 
                    })
                    .populate('category', 'name _id')
                    .sort({ name: 1 })
                    .lean()
                    : await Subcategory.find({ isActive: true })
                    .populate('category', 'name _id')
                    .sort({ name: 1 })
                    .limit(20)
                    .lean();
                
                data = { 
                    gridSubcategories: gridSubcategories.slice(0, 6), // Ensure max 6
                    buttonSubcategories 
                };
                break;
                
            default:
                // For other section types, return empty data
                data = {};
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin route - Get section data (sliders, categories, products, etc.)
router.get('/:id/data', adminAuth, async (req, res) => {
    try {
        const section = await HomepageSection.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }
        
        let data = {};
        
        switch (section.type) {
            case 'heroSlider':
                // Get active sliders
                const sliders = await Slider.find({ isActive: true }).sort({ order: 1 });
                data = { sliders };
                break;
                
            case 'categoryFeatured':
            case 'categoryGrid':
            case 'categoryCircles':
                // Get featured categories
                const categories = await Category.find({ isActive: true })
                    .populate('department', 'name')
                    .populate('imageUpload')
                    .sort({ name: 1 });
                data = { categories };
                break;
                
            case 'departmentGrid':
                // Get active departments
                const departments = await Department.find({ isActive: true })
                    .populate('imageUpload')
                    .sort({ name: 1 });
                data = { departments };
                break;
                
            case 'productTabs':
            case 'productCarousel':
                // Get products based on filters
                const productFilters = {};
                if (section.config?.categoryId) {
                    productFilters.category = section.config.categoryId;
                }
                // Section filter has highest priority - if section is specified, filter by it
                if (section.config?.section) {
                    productFilters.sections = { $in: [section.config.section] };
                    console.log(`🔍 Homepage Section Data - Filtering by section: "${section.config.section}"`);
                } else if (section.config?.isFeatured) {
                    productFilters.isFeatured = true;
                } else if (section.config?.isNewArrival) {
                    productFilters.isNewArrival = true;
                } else if (section.config?.isTrending) {
                    productFilters.isTrending = true;
                }
                productFilters.isActive = true;
                
                const products = await Product.find(productFilters)
                    .populate('category', 'name')
                    .populate('department', 'name')
                    .populate('imageUpload')
                    .limit(section.config?.limit || 20)
                    .sort({ createdAt: -1 });
                data = { products };
                break;
                
            case 'newArrivals':
                // Get new arrival products from ALL categories (don't filter by categoryId)
                const newArrivalFilters = { isActive: true, isNewArrival: true };
                // Removed categoryId filter to show products from all categories
                // if (section.config?.categoryId) {
                //     newArrivalFilters.category = section.config.categoryId;
                // }
                const newArrivalProducts = await Product.find(newArrivalFilters)
                    .populate('category', 'name _id')
                    .populate('department', 'name _id')
                    .populate('imageUpload')
                    .limit(section.config?.limit || 100) // Increased limit to get products from all categories
                    .sort({ createdAt: -1 });
                console.log(`New Arrivals (Admin): Found ${newArrivalProducts.length} products from all categories`);
                data = { products: newArrivalProducts };
                break;
                
            case 'topSelling':
                // Get top selling products
                const topSellingFilters = { isActive: true, isTopSelling: true };
                if (section.config?.categoryId) {
                    topSellingFilters.category = section.config.categoryId;
                }
                const topSellingProducts = await Product.find(topSellingFilters)
                    .populate('category', 'name')
                    .populate('department', 'name')
                    .populate('imageUpload')
                    .limit(section.config?.limit || 20)
                    .sort({ createdAt: -1 });
                data = { products: topSellingProducts };
                break;
                
            case 'featuredCollections':
                // Get all active subcategories
                const subcategories = await Subcategory.find({ isActive: true })
                    .populate('category', 'name _id')
                    .populate('imageUpload')
                    .sort({ ordering: 1, name: 1 });
                data = { subcategories };
                break;
                
            case 'subcategoryGrid':
                // Get selected subcategories for grid (6 boxes) and button strip
                const gridSubcategoryIds = section.config?.subcategoryIds || [];
                const buttonSubcategoryIds = section.config?.buttonSubcategoryIds || [];
                
                // Fetch grid subcategories (limit to 6)
                const gridSubcategories = gridSubcategoryIds.length > 0
                    ? await Subcategory.find({ 
                        _id: { $in: gridSubcategoryIds },
                        isActive: true 
                    })
                    .populate('category', 'name _id')
                    .populate('imageUpload')
                    .limit(6)
                    .lean()
                    : [];
                
                // Fetch button subcategories (for red strip below)
                const buttonSubcategories = buttonSubcategoryIds.length > 0
                    ? await Subcategory.find({ 
                        _id: { $in: buttonSubcategoryIds },
                        isActive: true 
                    })
                    .populate('category', 'name _id')
                    .sort({ name: 1 })
                    .lean()
                    : await Subcategory.find({ isActive: true })
                    .populate('category', 'name _id')
                    .sort({ name: 1 })
                    .limit(20)
                    .lean();
                
                data = { 
                    gridSubcategories: gridSubcategories.slice(0, 6), // Ensure max 6
                    buttonSubcategories 
                };
                break;
                
            case 'bannerFullWidth':
                // Get active banners
                const banners = await Banner.find({ isActive: true, position: 'middle' })
                    .populate('imageUpload')
                    .sort({ createdAt: -1 });
                data = { banners };
                break;
                
            default:
                data = {};
        }
        
        // Set cache headers with ETag support (2 min cache in production)
        const responseSent = setCacheHeaders(req, res, data, 120);
        if (!responseSent) {
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

