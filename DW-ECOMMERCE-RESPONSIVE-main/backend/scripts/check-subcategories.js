// Script to check subcategories in database
const mongoose = require('mongoose');
const Subcategory = require('../models/Subcategory');
const Category = require('../models/Category');
require('dotenv').config();

async function checkSubcategories() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/dw-ecommerce');
        console.log('✓ Connected to MongoDB\n');

        // Get all categories
        const categories = await Category.find();
        console.log(`Found ${categories.length} categories:\n`);

        for (const category of categories) {
            const subcats = await Subcategory.find({ category: category._id });
            console.log(`Category: ${category.name} (ID: ${category._id})`);
            console.log(`  - Subcategories: ${subcats.length}`);
            subcats.forEach(sc => {
                console.log(`    * ${sc.name} (ID: ${sc._id}) - Active: ${sc.isActive}`);
            });
            console.log();
        }

        // Also check the specific category from your screenshot
        const electronicCategory = categories.find(c => c.name === 'Electronic');
        if (electronicCategory) {
            console.log('\n--- ELECTRONIC CATEGORY DETAILS ---');
            console.log(`ID: ${electronicCategory._id}`);
            const subcats = await Subcategory.find({ 
                category: electronicCategory._id,
                isActive: true
            }).populate('category');
            console.log(`Active Subcategories: ${subcats.length}`);
            subcats.forEach(sc => {
                console.log(`  - ${sc.name}`);
            });
        }

        // Test the API query directly
        console.log('\n--- TESTING API QUERIES ---');
        
        // Test 1: All active subcategories
        const allSubcats = await Subcategory.find({ isActive: true });
        console.log(`Total active subcategories in DB: ${allSubcats.length}`);
        
        // Test 2: Subcategories for Electronic category  
        if (electronicCategory) {
            const electronicSubcats = await Subcategory.find({
                category: electronicCategory._id,
                isActive: true
            }).populate('category', 'name _id');
            console.log(`Subcategories for "Electronic" category: ${electronicSubcats.length}`);
            electronicSubcats.forEach(sc => {
                console.log(`  - ${sc.name} | Category: ${sc.category?.name} | Active: ${sc.isActive}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSubcategories();
