document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    initSubcategoryPage();
});

function initSubcategoryPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const subcategoryId = urlParams.get('id');
    const page = urlParams.get('page') || 1;
    const limit = urlParams.get('limit') || 24;
    const sortBy = urlParams.get('sortBy') || 'createdAt';
    const order = urlParams.get('order') || 'desc';

    if (!subcategoryId) {
        window.location.href = '/products.html'; // Redirect if no ID
        return;
    }

    // Load Brands for Filter
    loadBrandsForFilter();

    // Load initial data
    loadSubcategoryData(subcategoryId, page, limit, sortBy, order);
    
    // Initialize Event Listeners
    setupEventListeners(subcategoryId);
}

function setupEventListeners(subcategoryId) {
    // Sort dropdown
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => reloadData(subcategoryId));
    }

    // View toggles (Grid/List)
    const viewButtons = document.querySelectorAll('.zoom-btn');
    const productsGrid = document.getElementById('productsGrid');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const viewType = btn.dataset.view;
            productsGrid.className = 'products-grid'; 
            productsGrid.classList.add(`view-${viewType}`);
        });
    });

    // Filter Event Listeners
    // Availability
    const inStockCheckbox = document.getElementById('availabilityInStock');
    if (inStockCheckbox) {
        inStockCheckbox.addEventListener('change', () => reloadData(subcategoryId));
    }

    // Price Inputs (Debounced slightly or just on change/blur)
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    if (minPriceInput) minPriceInput.addEventListener('change', () => reloadData(subcategoryId));
    if (maxPriceInput) maxPriceInput.addEventListener('change', () => reloadData(subcategoryId));

    // Mobile Filter Toggle
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterSidebar = document.getElementById('filterSidebar');
    const filterCloseBtn = document.getElementById('filterCloseBtn');
    const filterOverlay = document.getElementById('filterOverlay');

    if (filterToggleBtn) {
        filterToggleBtn.addEventListener('click', () => {
            document.body.classList.add('filter-sidebar-open');
        });
    }

    if (filterCloseBtn) {
        filterCloseBtn.addEventListener('click', () => {
            document.body.classList.remove('filter-sidebar-open');
        });
    }

    if (filterOverlay) {
        filterOverlay.addEventListener('click', () => {
            document.body.classList.remove('filter-sidebar-open');
        });
    }
}

function reloadData(subcategoryId, page = 1) {
    const sortSelect = document.getElementById('sortBy');
    let sortField = 'createdAt';
    let sortOrder = 'desc';

    if (sortSelect) {
        const value = sortSelect.value;
        if (value.startsWith('-')) {
            sortField = value.substring(1);
            sortOrder = 'desc';
        } else {
            sortField = value;
            sortOrder = 'asc';
        }
    }

    loadSubcategoryData(subcategoryId, page, 24, sortField, sortOrder);
}

function loadBrandsForFilter() {
    const brandList = document.getElementById('brandFilterList');
    if (!brandList) return;
    
    // Fetch brands (using the existing API endpoint for public brands)
    fetch('/api/brands/public')
        .then(res => res.json())
        .then(data => {
            const brands = Array.isArray(data) ? data : (data.brands || data.data || []);
            if (brands.length === 0) {
                brandList.innerHTML = '<div class="text-muted small p-2">No brands available</div>';
                return;
            }

            brandList.innerHTML = brands.map(brand => `
                <div class="form-check brand-item">
                    <input class="form-check-input brand-checkbox" type="checkbox" value="${brand._id}" id="brand-${brand._id}">
                    <label class="form-check-label" for="brand-${brand._id}">
                        ${brand.name}
                    </label>
                </div>
            `).join('');

            // Add event listeners to new checkboxes
            document.querySelectorAll('.brand-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    const urlParams = new URLSearchParams(window.location.search);
                    reloadData(urlParams.get('id'));
                });
            });
        })
        .catch(err => console.warn('Failed to load brands:', err));
}

async function loadSubcategoryData(id, page, limit, sortBy, order) {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.remove('hidden');

    try {
        // Build Query String with Filters
        const params = new URLSearchParams({
            page,
            limit,
            sortBy,
            order
        });

        // Add Filters
        const brandCheckboxes = document.querySelectorAll('.brand-checkbox:checked');
        if (brandCheckboxes.length > 0) {
            const brandIds = Array.from(brandCheckboxes).map(cb => cb.value).join(',');
            params.append('brands', brandIds);
        }

        const minPrice = document.getElementById('minPrice')?.value;
        const maxPrice = document.getElementById('maxPrice')?.value;
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);

        const inStock = document.getElementById('availabilityInStock')?.checked;
        if (inStock) params.append('inStock', 'true');

        const response = await fetch(`/api/public/subcategories/${id}?${params.toString()}`);
        const result = await response.json();

        if (result.success && result.data) {
            updatePageMeta(result.data.subcategory);
            renderProducts(result.data.products);
            renderPagination(result.data.pagination, id, sortBy, order);
            updateProductCount(result.data.pagination.total);
        } else {
            console.error('Failed to load subcategory data:', result.message);
            document.getElementById('productsGrid').innerHTML = '<div class="col-12 text-center py-5"><h3>Subcategory not found</h3></div>';
        }
    } catch (error) {
        console.error('Error fetching subcategory:', error);
        document.getElementById('productsGrid').innerHTML = '<div class="col-12 text-center py-5"><h3>Error loading products</h3></div>';
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

function updatePageMeta(subcategory) {
    if (!subcategory) return;

    // Update Title
    document.title = `${subcategory.name} - D.Watson Pharmacy`;
    
    // Update Header
    const nameEl = document.getElementById('subcategory-name');
    const descEl = document.getElementById('subcategory-description');
    const breadcrumbEl = document.getElementById('breadcrumb-subcategory');
    const headerSection = document.getElementById('subcategory-header');

    if (nameEl) nameEl.textContent = subcategory.name;
    if (descEl) descEl.textContent = subcategory.description || '';
    if (breadcrumbEl) breadcrumbEl.textContent = subcategory.name;
    
    if (headerSection) headerSection.style.display = 'block';
}

function updateProductCount(total) {
    const countEl = document.getElementById('productsCount');
    if (countEl) countEl.textContent = `${total} products`;
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5"><p>No products found matching your criteria.</p></div>';
        return;
    }

    grid.innerHTML = products.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    // Handle image URL
    let imageUrl = '/images/placeholder.jpg';
    if (product.imageUpload && product.imageUpload.url) {
        imageUrl = product.imageUpload.url;
    } else if (product.image) {
        imageUrl = product.image;
    }

    // Handle Price
    const price = typeof product.price === 'number' ? `Rs. ${product.price.toFixed(2)}` : 'Rs. 0.00';
    const oldPrice = product.oldPrice ? `<span class="old-price">Rs. ${product.oldPrice.toFixed(2)}</span>` : '';
    const discount = product.discount ? `<span class="discount-badge">-${product.discount}%</span>` : '';

    return `
        <div class="product-card">
            <div class="product-image-wrapper">
                ${discount}
                <a href="/product/${product._id}">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                </a>
                <button class="wishlist-btn" onclick="addToWishlist('${product._id}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category?.name || 'Category'}</div>
                <h3 class="product-title">
                    <a href="/product/${product._id}">${product.name}</a>
                </h3>
                <div class="product-price">
                    <span class="current-price">${price}</span>
                    ${oldPrice}
                </div>
                <button class="btn btn-primary btn-sm add-to-cart" data-id="${product._id}" data-product-id="${product._id}">
                    Add to Cart
                </button>
            </div>
        </div>
    `;
}

function renderPagination(pagination, subcategoryId, sortBy, order) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl || !pagination || pagination.pages <= 1) {
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    const currentPage = pagination.page;
    const totalPages = pagination.pages;

    // Previous
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}, '${subcategoryId}'); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        // Show first, last, current, and surrounding pages
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}, '${subcategoryId}'); return false;">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Next
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}, '${subcategoryId}'); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

    paginationEl.innerHTML = html;
}

// Global function for pagination clicks
window.changePage = function(page, id) {
    if (page < 1) return;
    reloadData(id, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Prevent conflict with main.js functions
window.localLoadDepartments = async function() {
    console.log('Local load departments called');
};

window.localLoadCartCount = async function() {
     console.log('Local load cart count called');
};
