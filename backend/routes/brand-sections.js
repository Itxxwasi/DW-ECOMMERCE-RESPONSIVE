const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const BrandSection = require('../models/BrandSection');
const Media = require('../models/Media');

// Get all brand sections (public)
router.get('/public', async (req, res) => {
    try {
        const sections = await BrandSection.find({
            isActive: true,
            isPublished: true
        })
        .sort({ ordering: 1, createdAt: 1 })
        .select('-createdAt -updatedAt')
        .lean();

        res.json(sections);
    } catch (error) {
        console.error('Error fetching public brand sections:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all brand sections (admin)
router.get('/', adminAuth, async (req, res) => {
    try {
        const sections = await BrandSection.find()
            .sort({ ordering: 1, createdAt: -1 })
            .lean();

        res.json(sections);
    } catch (error) {
        console.error('Error fetching brand sections:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single brand section (admin)
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const section = await BrandSection.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: 'Brand section not found' });
        }
        res.json(section);
    } catch (error) {
        console.error('Error fetching brand section:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create brand section
router.post('/', adminAuth, async (req, res) => {
    try {
        const { name, title, subtitle, brands, displaySettings, isActive, isPublished, ordering } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Section name is required' });
        }

        // Validate brands array
        if (!Array.isArray(brands) || brands.length === 0) {
            return res.status(400).json({ message: 'At least one brand is required' });
        }

        // Validate each brand
        for (let i = 0; i < brands.length; i++) {
            const brand = brands[i];
            if (!brand.name || !brand.name.trim()) {
                return res.status(400).json({ message: `Brand ${i + 1}: Name is required` });
            }
            if (!brand.imageUrl || !brand.imageUrl.trim()) {
                return res.status(400).json({ message: `Brand ${i + 1}: Image URL is required` });
            }
        }

        const section = new BrandSection({
            name: name.trim(),
            title: title ? title.trim() : undefined,
            subtitle: subtitle ? subtitle.trim() : undefined,
            brands: brands.map(b => ({
                name: b.name.trim(),
                imageUrl: b.imageUrl.trim(),
                imageFileId: b.imageFileId || undefined,
                link: b.link ? b.link.trim() : undefined,
                discount: b.discount ? parseFloat(b.discount) : 0,
                discountText: b.discountText ? b.discountText.trim() : '',
                order: b.order ? parseInt(b.order, 10) : 0
            })),
            displaySettings: displaySettings || {
                columns: 5,
                gap: 15
            },
            isActive: isActive !== undefined ? isActive : true,
            isPublished: isPublished !== undefined ? isPublished : false,
            ordering: ordering !== undefined ? parseInt(ordering, 10) : 0
        });

        await section.save();
        res.status(201).json(section);
    } catch (error) {
        console.error('Error creating brand section:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Section name already exists' });
        }
        res.status(500).json({ message: error.message });
    }
});

// Update brand section
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const section = await BrandSection.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: 'Brand section not found' });
        }

        const { name, title, subtitle, brands, displaySettings, isActive, isPublished, ordering } = req.body;

        if (name !== undefined) {
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Section name is required' });
            }
            section.name = name.trim();
        }

        if (title !== undefined) {
            section.title = title ? title.trim() : undefined;
        }

        if (subtitle !== undefined) {
            section.subtitle = subtitle ? subtitle.trim() : undefined;
        }

        if (brands !== undefined) {
            if (!Array.isArray(brands) || brands.length === 0) {
                return res.status(400).json({ message: 'At least one brand is required' });
            }

            // Validate each brand
            for (let i = 0; i < brands.length; i++) {
                const brand = brands[i];
                if (!brand.name || !brand.name.trim()) {
                    return res.status(400).json({ message: `Brand ${i + 1}: Name is required` });
                }
                if (!brand.imageUrl || !brand.imageUrl.trim()) {
                    return res.status(400).json({ message: `Brand ${i + 1}: Image URL is required` });
                }
            }

            section.brands = brands.map(b => ({
                name: b.name.trim(),
                imageUrl: b.imageUrl.trim(),
                imageFileId: b.imageFileId || undefined,
                link: b.link ? b.link.trim() : undefined,
                discount: b.discount ? parseFloat(b.discount) : 0,
                discountText: b.discountText ? b.discountText.trim() : '',
                order: b.order ? parseInt(b.order, 10) : 0
            }));
        }

        if (displaySettings !== undefined) {
            section.displaySettings = displaySettings;
        }

        if (isActive !== undefined) {
            section.isActive = isActive;
        }

        if (isPublished !== undefined) {
            section.isPublished = isPublished;
        }

        if (ordering !== undefined) {
            section.ordering = parseInt(ordering, 10);
        }

        await section.save();
        res.json(section);
    } catch (error) {
        console.error('Error updating brand section:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Section name already exists' });
        }
        res.status(500).json({ message: error.message });
    }
});

// Delete brand section
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const section = await BrandSection.findByIdAndDelete(req.params.id);
        if (!section) {
            return res.status(404).json({ message: 'Brand section not found' });
        }
        res.json({ message: 'Brand section deleted successfully' });
    } catch (error) {
        console.error('Error deleting brand section:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

