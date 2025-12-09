require('dotenv').config();
const mongoose = require('mongoose');
const HomepageSection = require('../models/HomepageSection');
const Brand = require('../models/Brand');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('🔄 Syncing brands from HomepageSection to Brand model...\n');
  
  // Get the brand section from HomepageSection
  const section = await HomepageSection.findOne({ type: 'brandSection' }).lean();
  
  if (!section || !section.config || !section.config.brands) {
    console.log('❌ No brand section found');
    process.exit(1);
  }
  
  console.log(`📍 HomepageSection: "${section.name}"\n`);
  console.log('Brands to sync:');
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const brandData of section.config.brands) {
    console.log(`  • ${brandData.name}`);
    
    // Check if brand already exists
    const existingBrand = await Brand.findOne({ name: brandData.name });
    
    if (existingBrand) {
      // Update if it doesn't have brandSection field
      if (!existingBrand.brandSection) {
        await Brand.updateOne(
          { _id: existingBrand._id },
          { brandSection: section._id }
        );
        updated++;
        console.log(`    ✅ Updated with brandSection field`);
      } else {
        skipped++;
        console.log(`    ⏭️  Already synced`);
      }
    } else {
      // Create new Brand
      const newBrand = new Brand({
        name: brandData.name,
        image: brandData.imageUrl || '',
        brandSection: section._id,
        isActive: true
      });
      await newBrand.save();
      created++;
      console.log(`    ✅ Created new Brand document`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  
  // Now deactivate any brands that are NOT in this list
  console.log('\n🧹 Cleaning up brands not in HomepageSection...\n');
  
  const brandsInSection = section.config.brands.map(b => b.name);
  const orphanedBrands = await Brand.find({
    name: { $nin: brandsInSection },
    brandSection: { $exists: true }
  });
  
  let deactivated = 0;
  for (const brand of orphanedBrands) {
    await Brand.updateOne(
      { _id: brand._id },
      { isActive: false }
    );
    deactivated++;
    console.log(`  ✅ Deactivated: ${brand.name}`);
  }
  
  if (deactivated === 0) {
    console.log('  ✅ No orphaned brands to deactivate');
  }
  
  console.log(`\n✨ Sync complete! Product dropdown will now show: ${brandsInSection.join(', ')}`);
  process.exit(0);
  
}).catch(err => { 
  console.error('❌ Error:', err.message);
  process.exit(1); 
});
