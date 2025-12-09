require('dotenv').config();
const mongoose = require('mongoose');
const HomepageSection = require('../models/HomepageSection');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const section = await HomepageSection.findOne({ type: 'brandSection' }).lean();
  if (section) {
    console.log('💫 Brand Section from HomepageSection:');
    console.log('\nID:', section._id);
    console.log('Name:', section.name);
    console.log('\nBrands in config.brands:');
    if (section.config && section.config.brands) {
      section.config.brands.forEach((b, i) => {
        console.log(`  ${i+1}. ${b.name} (ID: ${b.id || 'NO ID'})`);
      });
    }
  } else {
    console.log('No brand section found in HomepageSection');
  }
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
