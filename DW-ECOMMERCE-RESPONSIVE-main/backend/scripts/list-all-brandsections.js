require('dotenv').config();
const mongoose = require('mongoose');
const BrandSection = require('../models/BrandSection');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(async () => {
  const sections = await BrandSection.find().lean();
  console.log('\n📋 All BrandSections:\n');
  
  sections.forEach((s, i) => {
    console.log(`${i+1}. "${s.name}" (ID: ${s._id})`);
    if (s.config && s.config.brands) {
      console.log('   Brands:');
      s.config.brands.forEach(b => {
        console.log(`     - ${b.name}${b.id ? ` (${b.id})` : ' (no ID)'}`);
      });
    }
    console.log();
  });
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
