require('dotenv').config();
const mongoose = require('mongoose');
const Brand = require('../models/Brand');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('\n📊 Detailed Brand Analysis:\n');
  const all = await Brand.find({}).lean();
  
  console.log('ALL BRANDS:');
  all.forEach(b => {
    const status = b.isActive ? '✅' : '❌';
    const section = b.brandSection ? '📌' : '  ';
    console.log(`  ${status} ${section} ${b.name.padEnd(20)} | brandSection: ${b.brandSection || 'NULL'} | isActive: ${b.isActive}`);
  });
  
  console.log('\n\n🔍 FILTER: brandSection EXISTS AND isActive = true');
  const filtered = await Brand.find({ 
    brandSection: { $exists: true, $ne: null }, 
    isActive: true 
  }).lean();
  
  console.log(`Found ${filtered.length} brands matching filter:`);
  filtered.forEach(b => {
    console.log(`  ✅ ${b.name} (${b.brandSection})`);
  });
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
