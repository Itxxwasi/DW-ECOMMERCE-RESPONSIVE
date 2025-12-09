// Performance optimization: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance optimization: Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Lazy load images - optimized for performance
let imageObserver = null;
function lazyLoadImages() {
    if ('IntersectionObserver' in window) {
        if (!imageObserver) {
            imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset && img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px' // Start loading 50px before image enters viewport
            });
        }
        
        // Only observe new images
        document.querySelectorAll('img[data-src]').forEach(img => {
            if (!img.dataset.observed) {
                imageObserver.observe(img);
                img.dataset.observed = 'true';
            }
        });
    } else {
        // Fallback for browsers without IntersectionObserver
        document.querySelectorAll('img[data-src]').forEach(img => {
            if (img.dataset && img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
        });
    }
}

$(document).ready(function() {
    // CRITICAL: Reset body overflow on page load to ensure scrolling works
    try {
        document.body.classList.remove('filter-sidebar-open', 'menu-open');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
    } catch (e) {
        console.warn('Error resetting body styles:', e);
    }
    
    // Use requestIdleCallback for non-critical operations
    const loadNonCritical = (callback) => {
        try {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(callback, { timeout: 2000 });
            } else {
                setTimeout(callback, 100);
            }
        } catch (e) {
            console.warn('Error in loadNonCritical:', e);
            setTimeout(callback, 100);
        }
    };
    
    // Load critical content first - with error handling
    try {
        // Some pages (brand-products.html) include this file for filter helpers
        // but should not load the global products list. Pages can set
        // `window.SKIP_PRODUCTS_LOAD = true` to prevent loading all products.
        if (!window.SKIP_PRODUCTS_LOAD) {
            loadProducts();
        }
    } catch (e) {
        console.error('Error loading products:', e);
        // Show error message instead of hanging
        $('#productsGrid').html('<div class="alert alert-danger">Error loading products. Please refresh the page.</div>');
    }
    
    // Load non-critical content after page is interactive
    loadNonCritical(() => {
        localLoadCartCount();
        localLoadDepartments();
        loadDepartmentsForFilter();
        loadBrandsForFilter();
        updateCategoryFilter('');
        
        // Check if there's a categoryId in URL params and load subcategories
        const urlParams = new URLSearchParams(window.location.search);
        let categoryId = urlParams.get('categoryId');
        
        // Also check if categoryId is in URL path (e.g., /category/123456)
        if (!categoryId) {
            const pathMatch = window.location.pathname.match(/\/category\/([a-f0-9]{24})/i);
            if (pathMatch && pathMatch[1]) {
                categoryId = pathMatch[1];
                console.log(`[Category Filter] Extracted category ID from URL path: ${categoryId}`);
            }
        }
        
        if (categoryId) {
            console.log(`[Category Filter] Setting category dropdown and loading subcategories for: ${categoryId}`);
            $('#categoryFilter').val(categoryId);
            updateSubcategoryFilter(categoryId);
        }
    });
    
    // Check URL parameters for filters
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    if (filter) {
        // Set filter based on URL
        if (filter === 'trending') {
            // Products will be filtered by isTrending on backend
        } else if (filter === 'discounted') {
            // Products will be filtered by discount > 0 on backend
        } else if (filter === 'new') {
            // Products will be filtered by isNewArrival on backend
        }
    }
    
    $(document).on('click', '#filterToggleBtn', function() {
        $('#filterSidebar').addClass('active');
        $('#filterOverlay').addClass('active');
        // Only set overflow hidden on mobile (when sidebar is fixed) - Use CSS class
        if (window.innerWidth < 992) {
            document.body.classList.add('filter-sidebar-open');
        }
    });
    $(document).on('click', '#filterCloseBtn, #filterOverlay', function() {
        $('#filterSidebar').removeClass('active');
        $('#filterOverlay').removeClass('active');
        // Reset using CSS class
        if (window.innerWidth < 992) {
            document.body.classList.remove('filter-sidebar-open');
        }
    });

    $(document).on('click', '#applyFilters', function() { loadProducts(1); });
    $(document).on('click', '#clearFilters', function() {
        $('#departmentFilter').val('');
        $('#categoryFilter').val('');
        $('#subcategoryFilter').val('');
        $('#minPrice').val('');
        $('#maxPrice').val('');
        $('#availabilityInStock').prop('checked', false);
        $('#availabilityOutOfStock').prop('checked', false);
        $('.brand-checkbox').prop('checked', false);
        $('#sortBy').val('name');
        updateCategoryFilter('');
        updateSubcategoryFilter('');
        loadProducts(1);
    });

    $(document).on('change', '#departmentFilter', function() {
        const deptId = $(this).val();
        updateCategoryFilter(deptId);
        updateSubcategoryFilter('');
        $('#subcategoryFilter').val('');
        loadProducts(1);
    });
    
    $(document).on('change', '#categoryFilter', function() {
        const catId = $(this).val();
        updateSubcategoryFilter(catId);
        $('#subcategoryFilter').val('');
        loadProducts(1);
    });
    
    // Also check categoryFilter value on page load
    $(document).ready(function() {
        setTimeout(function() {
            const categoryId = $('#categoryFilter').val();
            if (categoryId) {
                updateSubcategoryFilter(categoryId);
            }
        }, 500);
    });
    
    $(document).on('change', '#subcategoryFilter', function() {
        loadProducts(1);
    });
    $(document).on('change', '#availabilityInStock, #availabilityOutOfStock', function() {
        // If one is checked, uncheck the other (mutually exclusive)
        if ($(this).attr('id') === 'availabilityInStock' && $(this).is(':checked')) {
            $('#availabilityOutOfStock').prop('checked', false);
        } else if ($(this).attr('id') === 'availabilityOutOfStock' && $(this).is(':checked')) {
            $('#availabilityInStock').prop('checked', false);
        }
        loadProducts(1);
    });
    $(document).on('change', '#sortBy', function() { loadProducts(1); });
    
    // Handle price filter changes with debounce
    $(document).on('input', '#minPrice, #maxPrice', debounce(function() {
        console.log('Price filter input changed, reloading products...');
        loadProducts(1);
    }, 300));
    
    // Also trigger on blur (when user leaves the field)
    $(document).on('blur', '#minPrice, #maxPrice', function() {
        console.log('Price filter field blurred, reloading products...');
        loadProducts(1);
    });
    
    // Trigger immediately on Enter key
    $(document).on('keypress', '#minPrice, #maxPrice', function(e) {
        if (e.which === 13) { // Enter key
            console.log('Enter key pressed in price filter, reloading products...');
            loadProducts(1);
        }
    });

    // Zoom filter buttons are handled by filter-layout.js
    // Sort by is handled by filter-layout.js and triggers loadProducts
    
    // Handle sort by change
    $(document).on('change', '#sortBy', function() {
        loadProducts(1);
    });
    
    // Expose reload function for zoom filter
    window.reloadProductsForView = function() {
        loadProducts(1);
    };
    
    window.reloadProductsForSort = function() {
        loadProducts(1);
    };
});

let currentPage = 1;
let currentView = 'grid';

function loadFilters() {
    // Load will be done when products load
}

// Filters UI removed

// Filters UI removed

function loadProducts(page = 1) {
    currentPage = page;
    
    // Show loading state
    const container = $('#productsGrid');
    const skeletonHTML = Array(6).fill('<div class="product-loading-skeleton"></div>').join('');
    container.html(skeletonHTML);
    
    const params = { page: page, limit: 20 };

    // Check URL for filter parameter
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    const searchParam = urlParams.get('search');
    if (searchParam) params.search = searchParam.trim();
    if (filter) params.filter = filter;

    const departmentId = $('#departmentFilter').val(); if (departmentId) params.departmentId = departmentId;
    const categoryId = $('#categoryFilter').val(); if (categoryId) params.categoryId = categoryId;
    const subcategoryId = $('#subcategoryFilter').val(); if (subcategoryId) params.subcategoryId = subcategoryId;
    
    // Price filter - filter by final price (after discount)
    const minPrice = $('#minPrice').val();
    const maxPrice = $('#maxPrice').val();
    if (minPrice) {
        params.minPrice = minPrice;
        console.log('Price filter - min:', minPrice);
    }
    if (maxPrice) {
        params.maxPrice = maxPrice;
        console.log('Price filter - max:', maxPrice);
    }
    
    const sort = $('#sortBy').val(); if (sort) params.sort = sort;
    
    // Availability filter - mutually exclusive
    if ($('#availabilityInStock').is(':checked')) {
        params.availability = 'in-stock';
        console.log('Availability filter: in-stock (stock > 0)');
    } else if ($('#availabilityOutOfStock').is(':checked')) {
        params.availability = 'out-of-stock';
        console.log('Availability filter: out-of-stock (stock <= 0)');
    }
    
    // Get selected brands from checkboxes
    const selectedBrands = [];
    $('.brand-checkbox:checked').each(function() {
        selectedBrands.push($(this).val());
    });
    if (selectedBrands.length > 0) params.brandIds = selectedBrands.join(',');

    const queryString = new URLSearchParams(params).toString();

    // Use AbortController for request cancellation if needed
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    $.ajax({
        url: `/api/public/products?${queryString}`,
        method: 'GET',
        timeout: 30000, // 30 second timeout
        beforeSend: function() {
            // Prevent multiple simultaneous requests
            if (window.productsLoading) {
                return false;
            }
            window.productsLoading = true;
        }
    })
        .done(function(data) {
            clearTimeout(timeoutId);
            window.productsLoading = false;
            
            const { products, pagination, filters } = data;

            const productCount = pagination.total || products.length;
            $('#productsCount').text(`${productCount} products`);
            if (filters) { updateFilterDropdowns(filters); }

            // Render products with requestAnimationFrame for smooth rendering
            renderProducts(products);

            // Render pagination
            renderPagination(pagination);

            // Update URL without reload - use replaceState to avoid history bloat
            const newUrl = `/products?${queryString}`;
            window.history.replaceState({}, '', newUrl);
        })
        .fail(function(error) {
            clearTimeout(timeoutId);
            window.productsLoading = false;
            
            console.error('Error loading products:', error);
            container.html('<div class="col-12"><div class="alert alert-danger">Error loading products. Please try again.</div></div>');
        });
}

function updateFilterDropdowns(filters) {
    // Update department filter
    const deptSelect = $('#departmentFilter');
    const currentDept = deptSelect.val();
    deptSelect.html('<option value="">All Departments</option>');
    if (filters.departments) {
        filters.departments.forEach(dept => {
            const deptId = dept._id || dept.id;
            const selected = currentDept === deptId ? 'selected' : '';
            deptSelect.append(`<option value="${deptId}" ${selected}>${dept.name}</option>`);
        });
    }

    // Update category filter based on selected department
    updateCategoryFilter(currentDept);

    const colorSelect = $('#colorFilter');
    colorSelect.html('<option value="">All Colors</option>');
    if (filters.colors) {
        filters.colors.forEach(color => {
            const val = color.value || color.name || color;
            colorSelect.append(`<option value="${val}">${val}</option>`);
        });
    }
}

function renderProducts(products) {
    const container = $('#productsGrid');
    const noProducts = $('#noProducts');
    
    if (!products || products.length === 0) {
        container.html('');
        noProducts.show();
        return;
    }

    noProducts.hide();
    
    // Show loading state
    container.addClass('product-loading');
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
        container.toggleClass('list-view', currentView === 'list');
        
        // Build HTML string more efficiently
        const productsHTML = products.map(product => {
            const productId = product._id || product.id;
            const productImage = product.imageUpload?.url || product.image || 'https://via.placeholder.com/300x300';
            const finalPrice = product.price * (1 - (product.discount || 0) / 100);
            const categoryName = product.category?.name || 'Uncategorized';
            const departmentName = product.department?.name || '';
            const hasDiscount = product.discount > 0;
            const isSoldOut = !product.stock || product.stock <= 0;
            
            if (currentView === 'list') {
                return `
                <div class="product-card list">
                    <div class="product-list-row">
                        <a href="/product/${productId}" class="product-list-image">
                            <img data-src="${productImage}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" alt="${product.name}" loading="lazy">
                            ${hasDiscount ? `<span class="badge bg-danger" style="position: absolute; top: 8px; right: 8px; padding: 4px 8px;">-${product.discount}%</span>` : ''}
                            ${isSoldOut ? `<span class="badge bg-dark" style="position: absolute; bottom: 8px; left: 8px; padding: 4px 8px;">Sold Out</span>` : ''}
                        </a>
                        <div class="product-list-info">
                            <a href="/product/${productId}" style="text-decoration: none; color: inherit;">
                                <h3 class="product-card-title">${product.name}</h3>
                            </a>
                            <small class="text-muted d-block mb-2" style="font-size: 12px;">${categoryName}${departmentName ? ` • ${departmentName}` : ''}</small>
                            <div class="product-card-price mb-2">
                                Rs. ${finalPrice.toFixed(2)}
                                ${hasDiscount ? `<small class="text-muted text-decoration-line-through" style="margin-left: 8px;">Rs. ${product.price.toFixed(2)}</small>` : ''}
                            </div>
                            ${!isSoldOut ? `<small class="text-muted d-block mb-2">Availability: ${product.stock} In stock</small>` : `<small class="text-danger d-block mb-2">Out of Stock</small>`}
                            ${!isSoldOut ? `<button class="product-card-button add-to-cart" data-id="${productId}" data-product-id="${productId}">Add to Cart</button>` : `<button class="product-card-button" disabled>Sold Out</button>`}
                        </div>
                    </div>
                </div>`;
            }
            return `
                <div class="product-card">
                    <a href="/product/${productId}" style="position: relative; display: block;">
                        <img data-src="${productImage}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" alt="${product.name}" class="product-card-image" loading="lazy">
                        ${hasDiscount ? `<span class="badge bg-danger" style="position: absolute; top: 8px; right: 8px; padding: 4px 8px;">-${product.discount}%</span>` : ''}
                        ${isSoldOut ? `<span class="badge bg-dark" style="position: absolute; bottom: 8px; left: 8px; padding: 4px 8px;">Sold Out</span>` : ''}
                    </a>
                    <div class="product-card-info">
                        <small class="text-muted d-block mb-1" style="font-size: 12px;">${categoryName}${departmentName ? ` • ${departmentName}` : ''}</small>
                        <a href="/product/${productId}" style="text-decoration: none; color: inherit;">
                            <h3 class="product-card-title">${product.name}</h3>
                        </a>
                        <div class="product-card-price">
                            Rs. ${finalPrice.toFixed(2)}
                            ${hasDiscount ? `<small class="text-muted text-decoration-line-through" style="margin-left: 8px;">Rs. ${product.price.toFixed(2)}</small>` : ''}
                        </div>
                        ${!isSoldOut ? `<small class="text-muted d-block mb-2">Availability: ${product.stock} In stock</small>` : `<small class="text-danger d-block mb-2">Out of Stock</small>`}
                        ${!isSoldOut ? `<button class="product-card-button add-to-cart" data-id="${productId}" data-product-id="${productId}">Add to Cart</button>` : `<button class="product-card-button" disabled>Sold Out</button>`}
                    </div>
                </div>
            `;
        }).join('');
        
        container.html(productsHTML);
        container.removeClass('product-loading');
        
        // Lazy load images after rendering
        lazyLoadImages();
        
        // Attach event handlers using event delegation (more efficient)
        $(document).off('click.cart', '.add-to-cart').on('click.cart', '.add-to-cart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = $(this).attr('data-id') || $(this).attr('data-product-id') || $(this).data('id') || $(this).data('product-id');
            if (productId) {
                handleAddToCart(String(productId).trim());
            } else {
                console.error('Product ID not found on button:', this);
                alert('Unable to add product to cart. Product ID is missing.');
            }
        });
    });
}

function setView(view) {
    currentView = view === 'list' ? 'list' : 'grid';
}

function renderPagination(pagination) {
    const nav = $('#paginationNav');
    const ul = $('#pagination');
    
    if (pagination.pages <= 1) {
        nav.hide();
        return;
    }

    nav.show();
    ul.html('');

    // Previous button
    if (pagination.page > 1) {
        ul.append(`<li class="page-item"><a class="page-link" href="#" data-page="${pagination.page - 1}">Previous</a></li>`);
    }

    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        const active = i === pagination.page ? 'active' : '';
        ul.append(`<li class="page-item ${active}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
    }

    // Next button
    if (pagination.page < pagination.pages) {
        ul.append(`<li class="page-item"><a class="page-link" href="#" data-page="${pagination.page + 1}">Next</a></li>`);
    }

    // Attach click handlers
    $('.page-link').click(function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        loadProducts(page);
        $('html, body').animate({ scrollTop: 0 }, 'slow');
    });
}

function updateCategoryFilter(departmentId) {
    const categorySelect = $('#categoryFilter');
    categorySelect.html('<option value="">All Categories</option>');

    if (!departmentId) {
        $.get('/api/categories')
            .done(function(categories) {
                categories.forEach(cat => {
                    const catId = cat._id || cat.id;
                    categorySelect.append(`<option value="${catId}">${cat.name}</option>`);
                });
            });
        return;
    }

    $.get(`/api/categories/department/${departmentId}`)
        .done(function(categories) {
            categories.forEach(cat => {
                const catId = cat._id || cat.id;
                categorySelect.append(`<option value="${catId}">${cat.name}</option>`);
            });
        });
}

function updateSubcategoryFilter(categoryId) {
    const subcatSelect = $('#subcategoryFilter');
    if (!subcatSelect.length) {
        console.warn('Subcategory filter element not found');
        return;
    }
    
    subcatSelect.html('<option value="">All Subcategories</option>');
    if (!categoryId) {
        console.log('No category ID provided, subcategory filter cleared');
        return;
    }
    
    console.log(`[Subcategory Filter] Loading subcategories for category: ${categoryId}`);
    
    // Try the main endpoint first
    $.get(`/api/subcategories?categoryId=${categoryId}`, function(subcategories) {
        console.log(`[Subcategory Filter] ✓ Received ${(subcategories || []).length} subcategories`);
        
        if (!subcategories || subcategories.length === 0) {
            console.warn(`[Subcategory Filter] ⚠ No subcategories found for category ${categoryId}`);
            // Don't reset - keep "All Subcategories" option visible
            return;
        }
        
        subcategories.forEach(sc => {
            const id = sc._id || sc.id;
            const name = sc.name || 'Subcategory';
            console.log(`[Subcategory Filter]   - Adding: ${name} (${id})`);
            subcatSelect.append(`<option value="${id}">${name}</option>`);
        });
    })
    .fail(function(error) {
        console.error(`[Subcategory Filter] ✗ Failed to load subcategories for category ${categoryId}:`, error);
        console.error('[Subcategory Filter] Error status:', error.status);
        console.error('[Subcategory Filter] Error response:', error.responseText);
        
        // Try fallback endpoint
        console.log('[Subcategory Filter] Trying fallback endpoint...');
        $.get(`/api/subcategories/category/${categoryId}`, function(subcategories) {
            console.log(`[Subcategory Filter] ✓ Fallback: Received ${(subcategories || []).length} subcategories`);
            
            if (!subcategories || subcategories.length === 0) {
                console.warn(`[Subcategory Filter] ⚠ No subcategories found via fallback for category ${categoryId}`);
                return;
            }
            
            subcategories.forEach(sc => {
                const id = sc._id || sc.id;
                const name = sc.name || 'Subcategory';
                subcatSelect.append(`<option value="${id}">${name}</option>`);
            });
        })
        .fail(function(fallbackError) {
            console.error('[Subcategory Filter] ✗ Fallback also failed:', fallbackError);
        });
    });
}

function loadDepartmentsForFilter() {
    const deptSelect = $('#departmentFilter');
    if (!deptSelect.length) return;
    
    $.get('/api/public/departments')
        .done(function(departments) {
            const deptsArray = Array.isArray(departments) ? departments : (departments.departments || departments.data || []);
            deptSelect.html('<option value="">All Departments</option>');
            
            deptsArray.forEach(dept => {
                const id = dept._id || dept.id;
                const name = dept.name || 'Department';
                deptSelect.append(`<option value="${id}">${name}</option>`);
            });
        })
        .fail(function(err) {
            console.warn('Failed to load departments:', err);
        });
}

function loadBrandsForFilter() {
    const brandList = $('#brandFilterList');
    if (!brandList.length) return;
    brandList.html('');
    
    $.get('/api/brands/public')
        .done(function(brands) {
            const brandsArray = Array.isArray(brands) ? brands : (brands.brands || brands.data || []);
            if (brandsArray.length === 0) {
                brandList.html('<div class="text-muted" style="padding: 10px; font-size: 14px;">No brands available</div>');
                return;
            }
            
            brandsArray.forEach(b => {
                const id = b._id || b.id;
                const name = b.name || 'Brand';
                brandList.append(`
                    <div class="brand-item">
                        <input type="checkbox" class="form-check-input brand-checkbox" id="brand-${id}" value="${id}" data-brand-id="${id}">
                        <label class="form-check-label" for="brand-${id}">${name}</label>
                    </div>
                `);
            });
            
            // Attach change handlers
            $('.brand-checkbox').on('change', function() {
                loadProducts(1);
            });
        })
        .fail(function(err) {
            console.warn('Failed to load brands:', err);
            brandList.html('<div class="text-muted" style="padding: 10px; font-size: 14px;">Error loading brands</div>');
        });
}

// Guest cart helper functions
function getGuestCart() {
    try {
        const cartStr = localStorage.getItem('guestCart');
        return cartStr ? JSON.parse(cartStr) : { items: [] };
    } catch (e) {
        return { items: [] };
    }
}

function saveGuestCart(cart) {
    localStorage.setItem('guestCart', JSON.stringify(cart));
}

function getGuestCartCount() {
    const cart = getGuestCart();
    return cart.items.reduce((total, item) => total + (item.quantity || 0), 0);
}

function addToGuestCart(productId, quantity = 1, price = 0, discount = 0) {
    const cart = getGuestCart();
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
        cart.items[existingItemIndex].quantity += quantity;
    } else {
        cart.items.push({
            productId: productId,
            quantity: quantity,
            price: price,
            discount: discount
        });
    }
    
    saveGuestCart(cart);
    return getGuestCartCount();
}

function handleAddToCart(productId) {
    // Validate productId
    if (!productId) {
        console.error('handleAddToCart: No productId provided');
        alert('Product ID is missing. Cannot add to cart.');
        return;
    }
    
    // Ensure productId is a string
    productId = String(productId).trim();
    
    if (!productId || productId === 'undefined' || productId === 'null' || productId === '') {
        console.error('handleAddToCart: Invalid productId:', productId);
        alert('Invalid product ID. Cannot add to cart.');
        return;
    }
    
    console.log('handleAddToCart called with productId:', productId);
    
    const token = localStorage.getItem('token');
    
    // If not logged in, add to guest cart
    if (!token) {
        console.log('handleAddToCart: No token found, adding to guest cart');
        // Fetch product details to get price - use public API endpoint
        $.get(`/api/public/products/${productId}`)
            .done(function(product) {
                if (product) {
                    const cartCount = addToGuestCart(
                        productId,
                        1,
                        product.price || 0,
                        product.discount || 0
                    );
                    $('.cart-count').text(cartCount);
                    alert('Product added to cart! Sign in to save your cart.');
                } else {
                    alert('Product not found.');
                }
            })
            .fail(function(error) {
                console.error('Error fetching product for guest cart:', error);
                // Add to guest cart with default values if API call fails
                const cartCount = addToGuestCart(productId, 1, 0, 0);
                $('.cart-count').text(cartCount);
                alert('Product added to cart! Sign in to save your cart.');
            });
        return;
    }

    console.log('handleAddToCart: Making API call with productId:', productId);

    $.ajaxSetup({
        headers: {
            'x-auth-token': token
        }
    });

    $.ajax({
        url: '/api/cart/add',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ 
            productId: productId, 
            quantity: 1 
        })
    })
    .done(function(data) {
        console.log('handleAddToCart: Success response:', data);
        alert('Product added to cart!');
        localLoadCartCount();
    })
    .fail(function(error) {
        console.error('Error adding to cart:', error);
        console.error('Error status:', error.status);
        console.error('Error responseText:', error.responseText);
        
        let errorMessage = 'Error adding product to cart. Please try again.';
        
        if (error.status === 400) {
            try {
                const errorData = JSON.parse(error.responseText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = 'Invalid request. Please check the product details.';
            }
        } else if (error.status === 401) {
            errorMessage = 'Please log in to add products to cart.';
            localStorage.removeItem('token');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);
        } else if (error.status === 404) {
            errorMessage = 'Product not found.';
        }
        
        alert(errorMessage);
    });
}

function localLoadCartCount() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Show guest cart count if not logged in
        const guestCount = getGuestCartCount();
        $('.cart-count').text(guestCount);
        return;
    }

    $.ajaxSetup({
        headers: {
            'x-auth-token': token
        }
    });

    $.get('/api/cart/count')
        .done(function(data) {
            $('.cart-count').text(data.count || 0);
        })
        .fail(function() {
            // If API fails, show guest cart count
            const guestCount = getGuestCartCount();
            $('.cart-count').text(guestCount);
        });
}

function localLoadDepartments() {
    $.get('/api/departments')
        .done(function(departments) {
            const menu = $('#departmentsMenu');
            const footer = $('#footerDepartments');
            
            if (menu.length) {
                menu.html(departments.map(dept => {
                    const deptId = dept._id || dept.id;
                    return `<li><a class="dropdown-item" href="/department/${deptId}">${dept.name}</a></li>`;
                }).join(''));
            }
            
            if (footer.length) {
                footer.html(departments.map(dept => {
                    const deptId = dept._id || dept.id;
                    return `<li><a href="/department/${deptId}">${dept.name}</a></li>`;
                }).join(''));
            }
        })
        .fail(function() {
            console.error('Error loading departments');
        });
}

function updateColorsFromProducts() {
    const colorSelect = $('#colorFilter');
    if (!colorSelect.length) return;
    const colors = new Set();
    $('.product-card').each(function() {
        const c = $(this).attr('data-color') || $(this).data('color');
        if (c) colors.add(String(c));
    });
    if (colors.size) {
        colorSelect.html('<option value="">All Colors</option>');
        Array.from(colors).sort().forEach(c => colorSelect.append(`<option value="${c}">${c}</option>`));
    }
}

/**
 * Debug function for subcategory filter
 * Run from browser console: debugSubcategoryFilter()
 */
window.debugSubcategoryFilter = function() {
    const categoryId = $('#categoryFilter').val();
    console.log('=== SUBCATEGORY FILTER DEBUG ===');
    console.log('Selected Category ID:', categoryId || 'NONE');
    
    if (!categoryId) {
        console.warn('No category selected. Please select a category first.');
        return;
    }
    
    console.log('\n--- Testing Primary Endpoint ---');
    $.get(`/api/subcategories?categoryId=${categoryId}`, function(data) {
        console.log('✓ Primary endpoint success');
        console.log('Response type:', typeof data);
        console.log('Is Array:', Array.isArray(data));
        console.log('Count:', (data || []).length);
        if (data && data.length > 0) {
            console.log('First item structure:', data[0]);
            console.log('\nAll items:');
            data.forEach((item, i) => {
                console.log(`  [${i}] ${item.name} (ID: ${item._id || item.id})`);
            });
        } else {
            console.warn('Response is empty - no subcategories found');
        }
    }).fail(function(error) {
        console.error('✗ Primary endpoint failed');
        console.error('Status:', error.status);
        console.error('Status Text:', error.statusText);
        console.error('Response:', error.responseText);
        
        console.log('\n--- Testing Fallback Endpoint ---');
        $.get(`/api/subcategories/category/${categoryId}`, function(data) {
            console.log('✓ Fallback endpoint success');
            console.log('Response type:', typeof data);
            console.log('Is Array:', Array.isArray(data));
            console.log('Count:', (data || []).length);
            if (data && data.length > 0) {
                console.log('First item structure:', data[0]);
            }
        }).fail(function(fallbackError) {
            console.error('✗ Fallback endpoint also failed');
            console.error('Status:', fallbackError.status);
            console.error('Response:', fallbackError.responseText);
        });
    });
};

/**
 * Helper to check all filter data
 * Run from browser console: debugAllFilters()
 */
window.debugAllFilters = function() {
    console.log('=== ALL FILTERS DEBUG ===');
    console.log('Department:', $('#departmentFilter').val() || 'None');
    console.log('Category:', $('#categoryFilter').val() || 'None');
    console.log('Subcategory:', $('#subcategoryFilter').val() || 'None');
    console.log('Min Price:', $('#minPrice').val() || 'None');
    console.log('Max Price:', $('#maxPrice').val() || 'None');
    console.log('\nSubcategory dropdown options:');
    $('#subcategoryFilter').find('option').each(function() {
        console.log(`  - ${$(this).text()} (value: ${$(this).val()})`);
    });
};
