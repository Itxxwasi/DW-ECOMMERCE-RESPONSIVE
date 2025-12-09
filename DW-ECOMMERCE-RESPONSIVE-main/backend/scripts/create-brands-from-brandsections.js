#!/usr/bin/env node
/**
 * Script: create-brands-from-brandsections.js
 *
 * Reads all BrandSection documents and creates (or updates) Brand documents
 * for each nested brand entry so that the Brand model contains entries for
 * brands defined inside BrandSection sections.
 *
 * Usage: node scripts/create-brands-from-brandsections.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BrandSection = require('../models/BrandSection');
const Brand = require('../models/Brand');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is required in .env');
    process.exit(1);
}

async function upsertBrandFromSection(section, brandEntry) {
    const name = (brandEntry.name || '').trim();
    if (!name) return null;

    // Try to find a Brand by exact name (case sensitive); you may want to change
    // this to case-insensitive matching if required.
    let existing = await Brand.findOne({ name: name });
    const brandData = {
        name: name,
        image: brandEntry.imageUrl || undefined,
        link: brandEntry.link || undefined,
        order: brandEntry.order !== undefined ? parseInt(brandEntry.order, 10) : 0,
        discount: brandEntry.discount !== undefined ? parseFloat(brandEntry.discount) : 0,
        discountText: brandEntry.discountText || '',
        isActive: true
    };

    if (existing) {
        // Update fields that are sensible to update from BrandSection
        existing.image = brandData.image || existing.image;
        existing.link = brandData.link || existing.link;
        existing.order = brandData.order || existing.order;
        existing.discount = brandData.discount || existing.discount;
        existing.discountText = brandData.discountText || existing.discountText;
        existing.isActive = true;
        // Mark this brand as coming from the section
        existing.brandSection = section._id;
        await existing.save();
        return { type: 'updated', brand: existing };
    }

    // Create a new Brand document
    const b = new Brand(Object.assign({}, brandData, { brandSection: section._id }));
    await b.save();
    return { type: 'created', brand: b };
}

async function run() {
    try {
        console.log('🔌 Connecting to DB...');
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅ Connected.');

        const sections = await BrandSection.find().lean();
        console.log(`Found ${sections.length} BrandSection(s)`);

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const createdBrands = [];
        const updatedBrands = [];

        for (const section of sections) {
            const brands = Array.isArray(section.brands) ? section.brands : [];
            for (const br of brands) {
                const result = await upsertBrandFromSection(section, br);
                if (!result) { skipped++; continue; }
                if (result.type === 'created') {
                    created++;
                    createdBrands.push(result.brand.name);
                } else if (result.type === 'updated') {
                    updated++;
                    updatedBrands.push(result.brand.name);
                }
            }
        }

        console.log('\nSummary:');
        console.log(`  Created: ${created}`);
        if (createdBrands.length) console.log('   - ' + createdBrands.join(', '));
        console.log(`  Updated: ${updated}`);
        if (updatedBrands.length) console.log('   - ' + updatedBrands.join(', '));
        console.log(`  Skipped(empty name): ${skipped}`);

        await mongoose.connection.close();
        console.log('\n✅ Done. Closed DB connection.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        try { await mongoose.connection.close(); } catch (e) {}
        process.exit(1);
    }
}

run();
