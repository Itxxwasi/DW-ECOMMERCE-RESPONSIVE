(async () => {
  try {
    const base = 'http://localhost:5000';
    const email = 'admin@dwatson.pk';
    const password = 'admin123';

    console.log('Attempting login...');
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error('Login failed:', loginRes.status, loginData);
      process.exit(1);
    }
    const token = loginData.token;
    console.log('Login OK, token length:', token ? token.length : 0);

    console.log('Fetching admin brands...');
    const brandsRes = await fetch(base + '/api/admin/brands', {
      headers: { 'x-auth-token': token }
    });
    const brands = await brandsRes.json();
    if (!brandsRes.ok) {
      console.error('Failed to fetch brands:', brandsRes.status, brands);
      process.exit(1);
    }
    const brandId = Array.isArray(brands) && brands.length ? brands[0]._id : (brands._id || null);
    console.log('Using brand id:', brandId);

    const payload = {
      name: 'Automated Test Brand Product',
      description: 'Test product created by automated script',
      price: 9.99,
      stock: 10,
      discount: 0,
      image: 'https://via.placeholder.com/300',
      brand: brandId,
      isNewArrival: true
    };

    console.log('\n📤 Payload being sent:', JSON.stringify(payload, null, 2));
    console.log('\nPosting product...');
    const postRes = await fetch(base + '/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify(payload)
    });
    const postData = await postRes.text();
    console.log('POST status:', postRes.status);
    try {
      console.log('POST response JSON:', JSON.parse(postData));
    } catch(e) {
      console.log('POST response text:', postData);
    }
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
})();
