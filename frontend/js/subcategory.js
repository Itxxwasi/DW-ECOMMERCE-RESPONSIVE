$(document).ready(function() {
    // Get subcategory ID from URL
    const pathParts = window.location.pathname.split('/');
    const subcategoryId = pathParts[pathParts.length - 1];
    
    if (!subcategoryId) {
        window.location.href = '/';
        return;
    }

    // Load cart count
    loadCartCount();
    
    // Initialize navbar - wait for main.js to load
    function initNavbar() {
        // Use main.js functions if available
        if (typeof window.loadDepartments === 'function') {
            window.loadDepartments().catch(err => console.warn('Departments loading failed:', err));
        } else {
            loadDepartmentsFallback();
        }
        
        if (typeof window.loadCategoriesForNavbar === 'function') {
            window.loadCategoriesForNavbar().catch(err => console.warn('Categories loading failed:', err));
        } else {
            // Retry after a short delay if main.js hasn't loaded yet
            setTimeout(initNavbar, 300);
        }
    }
    
    // Start navbar initialization
    initNavbar();

    // Load subcategory header
    loadSubcategoryHeader(subcategoryId);
    // Load brands for filter
    loadBrandsForFilter();
    // Load categories for filter
    loadCategoriesForFilter();
    // Initialize filters and products list
    initSubcategoryFilters(subcategoryId);
});

function loadSubcategoryHeader(subcategoryId) {
    $.get(`/api/public/subcategories/${subcategoryId}`)
        .done(function(data) {
            const { subcategory } = data;

            // Update breadcrumb
            const catId = subcategory.category?._id || subcategory.category;
            const catName = subcategory.category?.name || 'Category';
            const deptId = subcategory.category?.department?._id || subcategory.category?.department;
            const deptName = subcategory.category?.department?.name || 'Department';
            
            let breadcrumbHtml = `
                <li class="breadcrumb-item"><a href="/">Home</a></li>
            `;
            
            if (deptId) {
                breadcrumbHtml += `<li class="breadcrumb-item"><a href="/department/${deptId}">${deptName}</a></li>`;
            }
            
            if (catId) {
                breadcrumbHtml += `<li class="breadcrumb-item"><a href="/category/${catId}">${catName}</a></li>`;
            }
            
            breadcrumbHtml += `<li class="breadcrumb-item active">${subcategory.name}</li>`;
            
            $('#breadcrumb').html(breadcrumbHtml);

            // Set subcategory image for filter sidebar
            const subcatImage = subcategory.imageUpload?.url || subcategory.image || 'https://via.placeholder.com/400x300';
            
            // Update filter sidebar image
            if (typeof window.updateFilterSidebarImage === 'function') {
                window.updateFilterSidebarImage(subcatImage, subcategory.name);
            }

            // Category link removed - no longer needed

            // Initial products load handled by filters

            // Update page title
            document.title = `${subcategory.name} - D.Watson Pharmacy`;
        })
        .fail(function(error) {
            console.error('Error loading subcategory:', error);
            if (error.status === 404) {
                alert('Subcategory not found');
                window.location.href = '/';
            } else {
                alert('Error loading subcategory. Please try again.');
            }
        });
}

function initSubcategoryFilters(subcategoryId) {
    $('#filterToggleBtn').click(function() {
        $('#filterSidebar').addClass('active');
        $('#filterOverlay').addClass('active');
        $('body').css('overflow', 'hidden');
    });
    $('#filterCloseBtn, #filterOverlay').click(function() {
        $('#filterSidebar').removeClass('active');
        $('#filterOverlay').removeClass('active');
        $('body').css('overflow', '');
    });

    // Zoom filter buttons are handled by filter-layout.js
    // Sort by is handled by filter-layout.js
    
    // Handle sort by change
    $(document).on('change', '#sortBy', function() {
        loadProducts(subcategoryId, 1);
    });
    
    // Handle availability filter changes (mutually exclusive)
    $(document).on('change', '#availabilityInStock, #availabilityOutOfStock', function() {
        // If one is checked, uncheck the other (mutually exclusive)
        if ($(this).attr('id') === 'availabilityInStock' && $(this).is(':checked')) {
            $('#availabilityOutOfStock').prop('checked', false);
        } else if ($(this).attr('id') === 'availabilityOutOfStock' && $(this).is(':checked')) {
            $('#availabilityInStock').prop('checked', false);
        }
        loadProducts(subcategoryId, 1);
    });
    
    // Handle price filter changes with debounce
    $(document).on('input', '#minPrice, #maxPrice', debounce(function() {
        console.log('Price filter input changed, reloading products...');
        loadProducts(subcategoryId, 1);
    }, 300));
    
    // Also trigger on blur (when user leaves the field)
    $(document).on('blur', '#minPrice, #maxPrice', function() {
        console.log('Price filter field blurred, reloading products...');
        loadProducts(subcategoryId, 1);
    });
    
    // Trigger immediately on Enter key
    $(document).on('keypress', '#minPrice, #maxPrice', function(e) {
        if (e.which === 13) { // Enter key
            console.log('Enter key pressed in price filter, reloading products...');
            loadProducts(subcategoryId, 1);
        }
    });
    
    // Expose reload function for zoom filter
    window.reloadProductsForView = function() {
        loadProducts(subcategoryId, 1);
    };
    
    window.reloadProductsForSort = function() {
        loadProducts(subcategoryId, 1);
    };

    $('#applyFilters').click(function() { loadProducts(subcategoryId, 1); });
    $('#clearFilters').click(function() {
        $('#minPrice').val('');
        $('#maxPrice').val('');
        $('#availabilityInStock').prop('checked', false);
        $('#availabilityOutOfStock').prop('checked', false);
        $('.brand-checkbox').prop('checked', false);
        $('#sortBy').val('name');
        loadProducts(subcategoryId, 1);
    });
    loadProducts(subcategoryId, 1);
}

let currentView = 'grid';
function setView(view) { currentView = view === 'list' ? 'list' : 'grid'; }

// Filters UI removed

function loadCategoriesForFilter() {
    const categorySelect = $('#categoryFilter');
    if (!categorySelect.length) {
        console.log('Category filter select not found');
        return;
    }
    
    categorySelect.html('<option value="">All Categories</option>');
    
    $.get('/api/categories')
        .done(function(categories) {
            console.log('Categories received for filter:', categories);
            const catsArray = Array.isArray(categories) ? categories : (categories.categories || categories.data || []);
            if (catsArray.length === 0) {
                console.log('No categories found');
            }
            catsArray.forEach(cat => {
                const id = cat._id || cat.id;
                const name = cat.name || 'Category';
                categorySelect.append(`<option value="${id}">${name}</option>`);
            });
        })
        .fail(function(error) {
            console.error('Error loading categories for filter:', error);
            categorySelect.html('<option value="">Error loading categories</option>');
        });
}

function updateSubcategoryFilter(categoryId) {
    const subcatSelect = $('#subcategoryFilter');
    if (!subcatSelect.length) {
        console.log('Subcategory filter select not found');
        return;
    }
    subcatSelect.html('<option value="">All Subcategories</option>');
    if (!categoryId) {
        console.log('No categoryId provided for subcategory filter');
        return;
    }
    console.log('Loading subcategories for categoryId:', categoryId);
    $.get(`/api/subcategories?categoryId=${categoryId}`)
        .done(function(subcategories) {
            console.log('Subcategories received:', subcategories);
            const subcatsArray = Array.isArray(subcategories) ? subcategories : [];
            if (subcatsArray.length === 0) {
                console.log('No subcategories found for categoryId:', categoryId);
            }
            subcatsArray.forEach(sc => {
                const id = sc._id || sc.id;
                const name = sc.name || 'Subcategory';
                subcatSelect.append(`<option value="${id}">${name}</option>`);
            });
        })
        .fail(function(error) {
            console.error('Error loading subcategories:', error);
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
                const subcategoryId = window.location.pathname.split('/').pop();
                loadProducts(subcategoryId, 1);
            });
        })
        .fail(function(err) {
            console.warn('Failed to load brands:', err);
            brandList.html('<div class="text-muted" style="padding: 10px; font-size: 14px;">Error loading brands</div>');
        });
}

function loadProducts(subcategoryId, page = 1) {
    const params = { page, limit: 20 };
    // Use subcategory filter if available, otherwise use page's subcategoryId
    const selectedSubcategoryId = $('#subcategoryFilter').val() || subcategoryId;
    if (selectedSubcategoryId) params.subcategoryId = selectedSubcategoryId;
    // Add category filter if selected
    const categoryId = $('#categoryFilter').val();
    if (categoryId) params.categoryId = categoryId;
    const minPrice = $('#minPrice').val(); if (minPrice) params.minPrice = minPrice;
    const maxPrice = $('#maxPrice').val(); if (maxPrice) params.maxPrice = maxPrice;
    const sort = $('#sortBy').val(); if (sort) params.sort = sort;
    if ($('#availabilityInStock').is(':checked')) params.availability = 'in-stock';
    if ($('#availabilityOutOfStock').is(':checked')) params.availability = 'out-of-stock';
    
    // Get selected brands from checkboxes
    const selectedBrands = [];
    $('.brand-checkbox:checked').each(function() {
        selectedBrands.push($(this).val());
    });
    if (selectedBrands.length > 0) params.brandIds = selectedBrands.join(',');

    const queryString = new URLSearchParams(params).toString();
    $.get(`/api/public/products?${queryString}`)
        .done(function(data) {
            const { products, pagination } = data;
            const productCount = pagination.total || products.length;
            $('#productsInfo').text(`${productCount} products`);
            renderProducts(products);
            renderPagination(pagination, subcategoryId);
            const newUrl = `/subcategory/${subcategoryId}?${queryString}`;
            window.history.pushState({}, '', newUrl);
        })
        .fail(function(error) {
            console.error('Error loading products:', error);
            $('#productsGrid').html('<div class="col-12"><div class="alert alert-danger">Error loading products. Please try again.</div></div>');
        });
}

function renderPagination(pagination, subcategoryId) {
    const nav = $('#paginationNav');
    const ul = $('#pagination');
    if (pagination.pages <= 1) { nav.hide(); return; }
    nav.show(); ul.html('');
    if (pagination.page > 1) ul.append(`<li class="page-item"><a class="page-link" href="#" data-page="${pagination.page - 1}">Previous</a></li>`);
    for (let i = 1; i <= pagination.pages; i++) {
        const active = i === pagination.page ? 'active' : '';
        ul.append(`<li class="page-item ${active}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
    }
    if (pagination.page < pagination.pages) ul.append(`<li class="page-item"><a class="page-link" href="#" data-page="${pagination.page + 1}">Next</a></li>`);
    $('.page-link').click(function(e) { e.preventDefault(); const p = $(this).data('page'); loadProducts(subcategoryId, p); $('html, body').animate({ scrollTop: 0 }, 'slow'); });
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
    
    container.toggleClass('list-view', currentView === 'list');
    container.html(products.map(product => {
        const productId = product._id || product.id;
        const productImage = product.imageUpload?.url || product.image || 'https://via.placeholder.com/300x300';
        const finalPrice = product.price * (1 - (product.discount || 0) / 100);
        const departmentName = product.department?.name || 'Uncategorized';
        if (currentView === 'list') {
            return `
            <div class="product-card list">
                <div class="product-list-row">
                    <a href="/product/${productId}" class="product-list-image">
                        <img src="${productImage}" alt="${product.name}">
                        ${product.discount > 0 ? `<span class="badge bg-danger" style="position: absolute; top: 8px; right: 8px; padding: 4px 8px;">-${product.discount}%</span>` : ''}
                        ${(!product.stock || product.stock <= 0) ? `<span class="badge bg-dark" style="position: absolute; bottom: 8px; left: 8px; padding: 4px 8px;">Sold Out</span>` : ''}
                    </a>
                    <div class="product-list-info">
                        <a href="/product/${productId}" style="text-decoration: none; color: inherit;">
                            <h3 class="product-card-title">${product.name}</h3>
                        </a>
                        <small class="text-muted d-block mb-2" style="font-size: 12px;">${departmentName}</small>
                        <div class="product-card-price mb-2">
                            Rs. ${finalPrice.toFixed(2)}
                            ${product.discount > 0 ? `<small class="text-muted text-decoration-line-through" style="margin-left: 8px;">Rs. ${product.price.toFixed(2)}</small>` : ''}
                        </div>
                        ${product.stock && product.stock > 0 ? `<small class="text-muted d-block mb-2">Availability: ${product.stock} In stock</small>` : `<small class="text-danger d-block mb-2">Out of Stock</small>`}
                        ${product.stock && product.stock > 0 ? `<button class="product-card-button add-to-cart" data-id="${productId}" data-product-id="${productId}">Add to Cart</button>` : `<button class="product-card-button" disabled>Sold Out</button>`}
                    </div>
                </div>
            </div>`;
        }
        return `
            <div class="product-card">
                <a href="/product/${productId}" style="position: relative; display: block;">
                    <img src="${productImage}" alt="${product.name}" class="product-card-image">
                    ${product.discount > 0 ? `<span class="badge bg-danger" style="position: absolute; top: 8px; right: 8px; padding: 4px 8px;">-${product.discount}%</span>` : ''}
                    ${(!product.stock || product.stock <= 0) ? `<span class="badge bg-dark" style="position: absolute; bottom: 8px; left: 8px; padding: 4px 8px;">Sold Out</span>` : ''}
                </a>
                <div class="product-card-info">
                    <small class="text-muted d-block mb-1" style="font-size: 12px;">${departmentName}</small>
                    <a href="/product/${productId}" style="text-decoration: none; color: inherit;">
                        <h3 class="product-card-title">${product.name}</h3>
                    </a>
                    <div class="product-card-price">
                        Rs. ${finalPrice.toFixed(2)}
                        ${product.discount > 0 ? `<small class="text-muted text-decoration-line-through" style="margin-left: 8px;">Rs. ${product.price.toFixed(2)}</small>` : ''}
                    </div>
                    ${product.stock && product.stock > 0 ? `<small class="text-muted d-block mb-2">Availability: ${product.stock} In stock</small>` : `<small class="text-danger d-block mb-2">Out of Stock</small>`}
                    ${product.stock && product.stock > 0 ? `<button class="product-card-button add-to-cart" data-id="${productId}" data-product-id="${productId}">Add to Cart</button>` : `<button class="product-card-button" disabled>Sold Out</button>`}
                </div>
            </div>
        `;
    }).join(''));

    // Attach event handlers - use attr instead of data to get actual string value
    $('.add-to-cart').off('click.cart').on('click.cart', function(e) {
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
        loadCartCount();
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

function loadCartCount() {
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

// loadDepartments is now handled by main.js, but keeping this as fallback
function loadDepartmentsFallback() {
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

