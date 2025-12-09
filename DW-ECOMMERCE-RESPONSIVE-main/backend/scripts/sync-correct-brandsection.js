#!/usr/bin/env node
/**
 * Script: identify-correct-brandsection.js
 * Finds and syncs the BrandSection you're currently using to Brand documents
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BrandSection = require('../models/BrandSection');
const Brand = require('../models/Brand');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI required');
    process.exit(1);
}

async function run() {
    try {
        console.log('🔌 Connecting to DB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.\n');

        // Find all BrandSections
        const sections = await BrandSection.find().lean();
        console.log(`Found ${sections.length} BrandSection(s):\n`);

        sections.forEach((s, i) => {
            console.log(`${i + 1}. ${s.name}`);
            if (s.brands && Array.isArray(s.brands)) {
                s.brands.forEach(b => console.log(`   - ${b.name}`));
            }
            console.log();
        });

        if (sections.length === 0) {
            console.log('❌ No BrandSections found!');
            await mongoose.connection.close();
            process.exit(1);
        }

        // Ask user which one is correct (or assume the one with most brands is current)
        const targetSection = sections.reduce((a, b) => 
            (a.brands?.length || 0) > (b.brands?.length || 0) ? a : b
        );

        console.log(`\n📌 Target BrandSection: ${targetSection.name}`);
        console.log(`   Brands: ${targetSection.brands.map(b => b.name).join(', ')}`);
        console.log('\n⏳ Syncing these brands to Brand model...\n');

        let created = 0;
        let updated = 0;

        for (const brandData of targetSection.brands) {
            if (!brandData.name) continue;

            const result = await Brand.findOneAndUpdate(
                { name: brandData.name.trim() },
                {
                    name: brandData.name.trim(),
                    image: brandData.imageUrl || undefined,
                    link: brandData.link || undefined,
                    order: brandData.order || 0,
                    discount: brandData.discount || 0,
                    discountText: brandData.discountText || '',
                    isActive: true,
                    brandSection: targetSection._id
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (result) {
                console.log(`✅ ${result.isNew ? 'Created' : 'Updated'}: ${brandData.name}`);
                if (result.isNew) created++;
                else updated++;
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Created: ${created}`);
        console.log(`   Updated: ${updated}`);

        // Deactivate brands from OTHER sections
        console.log(`\n🧹 Deactivating brands from OTHER sections...`);
        const otherSectionIds = sections
            .filter(s => s._id.toString() !== targetSection._id.toString())
            .map(s => s._id);

        if (otherSectionIds.length > 0) {
            const otherBrandNames = [];
            for (const sectionId of otherSectionIds) {
                const section = sections.find(s => s._id.toString() === sectionId.toString());
                if (section && section.brands) {
                    section.brands.forEach(b => otherBrandNames.push(b.name.trim()));
                }
            }

            const deactivated = await Brand.updateMany(
                { name: { $in: otherBrandNames }, brandSection: { $in: otherSectionIds } },
                { isActive: false }
            );
            console.log(`✅ Deactivated ${deactivated.modifiedCount} brands from other sections`);
        }

        console.log('\n✅ Done! Product dropdown will now show only brands from your current BrandSection.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        try { await mongoose.connection.close(); } catch (e) {}
        process.exit(1);
    }
}

run();
