#!/usr/bin/env node
/**
 * Script to populate sample brand sections in the database
 * These are used for the brand-only product creation feature
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BrandSection = require('../models/BrandSection');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env file');
    process.exit(1);
}

const sampleBrandSections = [
    {
        name: 'Beauty & Cosmetics',
        title: 'Premium Beauty Brands',
        subtitle: 'Top cosmetics and beauty care brands',
        brands: [
            {
                name: 'Garnier',
                imageUrl: 'https://via.placeholder.com/150?text=Garnier',
                link: '/brand/garnier',
                discount: 0,
                discountText: '',
                order: 1
            },
            {
                name: 'FLORMAR',
                imageUrl: 'https://via.placeholder.com/150?text=FLORMAR',
                link: '/brand/flormar',
                discount: 15,
                discountText: '15% OFF',
                order: 2
            },
            {
                name: 'Maybelline',
                imageUrl: 'https://via.placeholder.com/150?text=Maybelline',
                link: '/brand/maybelline',
                discount: 10,
                discountText: '10% OFF',
                order: 3
            }
        ],
        displaySettings: {
            columns: 5,
            gap: 15
        },
        isActive: true,
        isPublished: true,
        ordering: 1
    },
    {
        name: 'Skincare Brands',
        title: 'Professional Skincare',
        subtitle: 'Dermatologist approved skincare products',
        brands: [
            {
                name: 'Neutrogena',
                imageUrl: 'https://via.placeholder.com/150?text=Neutrogena',
                link: '/brand/neutrogena',
                discount: 0,
                discountText: '',
                order: 1
            },
            {
                name: 'CeraVe',
                imageUrl: 'https://via.placeholder.com/150?text=CeraVe',
                link: '/brand/cerave',
                discount: 5,
                discountText: '5% OFF',
                order: 2
            }
        ],
        displaySettings: {
            columns: 5,
            gap: 15
        },
        isActive: true,
        isPublished: true,
        ordering: 2
    },
    {
        name: 'Hair Care',
        title: 'Hair Care Specialists',
        subtitle: 'Professional hair care brands',
        brands: [
            {
                name: 'Pantene',
                imageUrl: 'https://via.placeholder.com/150?text=Pantene',
                link: '/brand/pantene',
                discount: 0,
                discountText: '',
                order: 1
            },
            {
                name: 'Head & Shoulders',
                imageUrl: 'https://via.placeholder.com/150?text=Head+Shoulders',
                link: '/brand/head-shoulders',
                discount: 12,
                discountText: '12% OFF',
                order: 2
            }
        ],
        displaySettings: {
            columns: 5,
            gap: 15
        },
        isActive: true,
        isPublished: true,
        ordering: 3
    }
];

async function populateBrandSections() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Database connected successfully\n');

        // Check existing brand sections
        const existingSections = await BrandSection.find();
        console.log(`Found ${existingSections.length} existing brand sections in database\n`);

        if (existingSections.length > 0) {
            console.log('Existing brand sections:');
            existingSections.forEach(section => {
                console.log(`  - ${section.name} (${section.brands.length} brands)`);
                section.brands.forEach(brand => {
                    console.log(`    • ${brand.name}`);
                });
            });
            console.log('\n⚠️  Brand sections already exist.');
            console.log('   To add new sections, use the admin dashboard or modify this script.');
        } else {
            console.log('📝 No brand sections found. Creating sample brand sections...\n');

            for (const sectionData of sampleBrandSections) {
                const section = new BrandSection(sectionData);
                await section.save();
                console.log(`✅ Created brand section: ${section.name}`);
                section.brands.forEach(brand => {
                    console.log(`   • ${brand.name}`);
                });
            }

            console.log(`\n✅ Successfully created ${sampleBrandSections.length} brand sections!`);
            console.log('\n📌 Next steps:');
            console.log('   1. Refresh your admin dashboard');
            console.log('   2. Open the "Add Product" modal');
            console.log('   3. The brand dropdown should now show the brands');
            console.log('   4. Select a brand to create a brand-only product (no category/department required)');
        }

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 11000) {
            console.error('\n⚠️  Duplicate key error - some brand sections might already exist.');
        }
        process.exit(1);
    }
}

populateBrandSections();
