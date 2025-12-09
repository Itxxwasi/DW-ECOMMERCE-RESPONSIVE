/**
 * Brand Products Page - Load and display products for a specific brand
 */

$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    let brandId = urlParams.get('brand');
    const brandName = urlParams.get('name');

    async function resolveBrandIdByName(name) {
        try {
            const list = await $.get('/api/brands/public');
            const arr = Array.isArray(list) ? list : (list.brands || list.data || []);
            const key = String(name || '').trim().toLowerCase();
            const match = arr.find(b => String(b.name || b.alt || '').trim().toLowerCase() === key);
            return match ? (match._id || match.id) : null;
        } catch (e) {
            return null;
        }
    }

    (async function init() {
        if (!brandId && brandName) {
            brandId = await resolveBrandIdByName(brandName);
        }

        if (!brandId) {
            window.location.href = '/';
            return;
        }

        loadNavbarAndFooter();
        loadDepartments();
        loadCartCount();
        loadBrandProducts(brandId, brandName);

        $('#sortBy').on('change', function() {
            loadBrandProducts(brandId, brandName);
        });

        $('#applyPriceFilter').on('click', function() {
            loadBrandProducts(brandId, brandName);
        });

        $('#clearFilters').on('click', function() {
            $('#minPrice').val(0);
            $('#maxPrice').val(10000);
            $('#minPriceInput').val(0);
            $('#maxPriceInput').val(10000);
            loadBrandProducts(brandId, brandName);
        });

        $(document).on('click', '.view-toggle', function() {
            $('.view-toggle').removeClass('active');
            $(this).addClass('active');
            const view = $(this).data('view');
            localStorage.setItem('productView', view);
            updateProductsView(view);
        });
    })();
});

function loadBrandProducts(brandId, brandName) {
    const minPrice = parseInt($('#minPrice').val() || 0);
    const maxPrice = parseInt($('#maxPrice').val() || 10000);
    const sortBy = $('#sortBy').val() || 'newest';
    const view = localStorage.getItem('productView') || 'grid';

    console.log(`Loading products for brand ID: ${brandId} (${brandName || ''})`);

    $.ajax({
        url: `/api/brands/${brandId}/products`,
        method: 'GET',
        success: function(data) {
            const products = Array.isArray(data?.products) ? data.products : [];
            const brand = data?.brand || {};

            const displayName = brand.name || brandName || 'Brand';
            $('#brandNameBreadcrumb').text(displayName);
            $('#brandTitle').text(`${displayName} Products`);

            // Client-side price filter and sort
            const filtered = products.filter(p => {
                const price = parseFloat(p.price || 0);
                const discount = parseFloat(p.discount || 0);
                const finalPrice = price * (1 - discount / 100);
                return finalPrice >= minPrice && finalPrice <= maxPrice;
            });

            const sorted = filtered.sort((a, b) => {
                const pa = parseFloat(a.price || 0) * (1 - (parseFloat(a.discount || 0)) / 100);
                const pb = parseFloat(b.price || 0) * (1 - (parseFloat(b.discount || 0)) / 100);
                switch (sortBy) {
                    case 'price-low': return pa - pb;
                    case 'price-high': return pb - pa;
                    case 'name-asc': return String(a.name || '').localeCompare(String(b.name || ''));
                    case 'name-desc': return String(b.name || '').localeCompare(String(a.name || ''));
                    default: return 0; // keep created order
                }
            });

            // Discount badge
            const productWithDiscount = sorted.find(p => p.discount && p.discount > 0);
            if (productWithDiscount) {
                const discountPercent = productWithDiscount.discount;
                $('#discountText').text(`Up to ${discountPercent}% OFF`);
                $('#brandDiscount').show();
            } else {
                $('#brandDiscount').hide();
            }

            if (sorted.length > 0) {
                displayProducts(sorted, view);
                $('#noProductsMessage').hide();
            } else {
                $('#productsContainer').html('');
                $('#noProductsMessage').show();
            }
        },
        error: function(error) {
            console.error('Error loading brand products:', error);
            $('#productsContainer').html('<div class="alert alert-danger">Error loading products. Please try again.</div>');
        }
    });
}

function displayProducts(products, view = 'grid') {
    const container = $('#productsContainer');
    container.html('');

    if (!products || products.length === 0) {
        $('#noProductsMessage').show();
        return;
    }

    products.forEach(product => {
        const card = createProductCard(product, view);
        container.append(card);
    });

    // Initialize cart handlers
    initializeCartHandlers();
    updateProductsView(view);
}

function createProductCard(product, view = 'grid') {
    const imageUrl = product.image || product.imageUpload?.url || '/images/placeholder-product.jpg';
    const price = parseFloat(product.price || 0);
    const discount = product.discount || 0;
    const finalPrice = price - (price * discount / 100);
    
    const isNewArrival = product.isNewArrival ? '<span class="badge bg-success">New</span>' : '';
    const isTopSelling = product.isTopSelling ? '<span class="badge bg-primary">Top Selling</span>' : '';

    if (view === 'list') {
        return `
            <div class="col-12 product-list-item mb-3">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="row g-0">
                        <div class="col-md-3">
                            <img src="${imageUrl}" alt="${product.name}" class="img-fluid h-100 object-fit-cover" style="height: 200px;">
                        </div>
                        <div class="col-md-9">
                            <div class="card-body">
                                <div class="mb-2">
                                    ${isNewArrival} ${isTopSelling}
                                </div>
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-text text-muted" style="max-height: 60px; overflow: hidden;">${product.description || ''}</p>
                                <div class="d-flex align-items-center gap-3 mb-3">
                                    <div>
                                        <span class="fs-5 fw-bold text-primary">Rs. ${finalPrice.toFixed(2)}</span>
                                        ${discount > 0 ? `<span class="text-muted text-decoration-line-through ms-2">Rs. ${price.toFixed(2)}</span>` : ''}
                                    </div>
                                    ${discount > 0 ? `<span class="badge bg-danger">${Math.round(discount)}% OFF</span>` : ''}
                                </div>
                                <div class="d-flex gap-2">
                                    <button class="btn btn-primary btn-sm add-to-cart-btn" data-product-id="${product._id}" data-product-name="${product.name}" data-product-price="${finalPrice}">
                                        <i class="fas fa-cart-plus"></i> Add to Cart
                                    </button>
                                    <a href="/product/${product._id}" class="btn btn-outline-secondary btn-sm">
                                        <i class="fas fa-eye"></i> View Details
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Grid view
        return `
            <div class="col-md-6 col-lg-4 col-xl-3 mb-4 product-grid-item">
                <div class="card h-100 border-0 shadow-sm product-card">
                    <div class="position-relative">
                        <img src="${imageUrl}" alt="${product.name}" class="card-img-top object-fit-cover" style="height: 220px;">
                        <div class="position-absolute top-0 end-0 m-2">
                            ${isNewArrival} ${isTopSelling}
                        </div>
                        ${discount > 0 ? `<div class="position-absolute bottom-0 end-0 m-2"><span class="badge bg-danger fs-6">${Math.round(discount)}% OFF</span></div>` : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title" style="min-height: 50px;">${product.name}</h5>
                        <div class="mt-auto">
                            <div class="d-flex gap-2 mb-3">
                                <span class="fs-5 fw-bold text-primary">Rs. ${finalPrice.toFixed(2)}</span>
                                ${discount > 0 ? `<span class="text-muted text-decoration-line-through">Rs. ${price.toFixed(2)}</span>` : ''}
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-primary btn-sm w-100 add-to-cart-btn" data-product-id="${product._id}" data-product-name="${product.name}" data-product-price="${finalPrice}">
                                    <i class="fas fa-cart-plus"></i> Add
                                </button>
                                <a href="/product/${product._id}" class="btn btn-outline-secondary btn-sm">
                                    <i class="fas fa-eye"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function updateProductsView(view) {
    localStorage.setItem('productView', view);
    $('[data-view]').removeClass('active');
    $(`[data-view="${view}"]`).addClass('active');
}

function initializeCartHandlers() {
    $('.add-to-cart-btn').off('click').on('click', function(e) {
        e.preventDefault();
        const productId = $(this).data('product-id');
        const productName = $(this).data('product-name');
        const price = parseFloat($(this).data('product-price'));
        
        handleAddToCart(productId, productName, price);
    });
}

function handleAddToCart(productId, productName, price) {
    if (typeof addToGuestCart === 'function') {
        addToGuestCart(productId, 1, price, 0);
        localLoadCartCount();
        
        // Show confirmation
        alert(`"${productName}" has been added to your cart!`);
    } else {
        console.error('Cart functions not available');
    }
}

// Load navbar
function loadNavbarAndFooter() {
    localLoadDepartments();
    // Footer and navbar are loaded by main.js
}

// Helper functions (from main.js)
function getGuestCart() {
    const cart = localStorage.getItem('guestCart');
    return cart ? JSON.parse(cart) : {};
}

function saveGuestCart(cart) {
    localStorage.setItem('guestCart', JSON.stringify(cart));
}

function addToGuestCart(productId, quantity = 1, price = 0, discount = 0) {
    const cart = getGuestCart();
    
    if (cart[productId]) {
        cart[productId].quantity += quantity;
    } else {
        cart[productId] = { quantity, price, discount };
    }
    
    saveGuestCart(cart);
}

function localLoadCartCount() {
    const cart = getGuestCart();
    const count = Object.keys(cart).length;
    $('[data-cart-count]').text(count);
}

function localLoadDepartments() {
    $.get('/api/departments-public').done(function(departments) {
        // Departments loaded (for navbar)
    });
}

function loadDepartments() {
    localLoadDepartments();
}

function loadCartCount() {
    localLoadCartCount();
}
