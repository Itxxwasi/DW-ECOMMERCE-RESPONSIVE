document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.loadDepartments === 'function') {
    window.loadDepartments().catch(() => {});
  }
  // Load categories for navbar (desktop navigation)
  if (typeof window.loadCategoriesForNavbar === 'function') {
    window.loadCategoriesForNavbar().then(() => {
      // After categories are loaded, sync mobile menu
      if (typeof window.loadMobileMenu === 'function') {
        setTimeout(() => {
          window.loadMobileMenu();
        }, 300);
      }
    }).catch(() => {});
  }
  loadCategoriesGrid();
  if (typeof window.loadFooter === 'function') {
    setTimeout(() => window.loadFooter(), 1000);
  }
});

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function loadCategoriesGrid() {
  const grid = document.getElementById('shopCategoryGrid');
  if (!grid) return;
  try {
    const categories = await fetchJSON(`/api/categories?_t=${Date.now()}`);
    const active = (categories || []).filter(c => c && c.isActive !== false);
    grid.innerHTML = active.map(cat => {
      const id = cat._id || cat.id;
      const name = cat.name || 'Category';
      const image = (cat.imageUpload && cat.imageUpload.url) || cat.image || 'https://via.placeholder.com/600x400';
      const link = `/category/${id}`;
      return `
        <a href="${link}" class="category-card">
          <img src="${image}" alt="${name}" class="category-card-image" loading="lazy">
          <div class="category-card-title">${name}</div>
        </a>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="text-center text-muted">Failed to load categories.</div>`;
    console.error('loadCategoriesGrid error:', err);
  }
}
