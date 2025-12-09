require('dotenv').config();
const mongoose = require('mongoose');
const Brand = require('../models/Brand');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('\n✅ Brands available for product dropdown (fromSection=true):\n');
  const brands = await Brand.find({ 
    brandSection: { $exists: true, $ne: null }, 
    isActive: true 
  }).lean();
  
  brands.forEach((b, i) => {
    console.log(`  ${i+1}. ${b.name}`);
  });
  
  console.log(`\nTotal: ${brands.length} brands\n`);
  
  // Also show inactive/section brands for completeness
  console.log('📊 All section-sourced brands (including inactive):');
  const allSectionBrands = await Brand.find({ 
    brandSection: { $exists: true, $ne: null }
  }).lean();
  
  allSectionBrands.forEach((b) => {
    const status = b.isActive ? '✅' : '❌';
    console.log(`  ${status} ${b.name}`);
  });
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
