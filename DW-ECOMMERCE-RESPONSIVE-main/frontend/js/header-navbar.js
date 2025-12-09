/**
 * Header Navbar - Category Menu Loading and Dropdown Handling
 */

(function() {
    'use strict';
    
    let categoriesData = [];
    
    /**
     * Load categories for navbar
     */
    async function loadCategoriesForNavbar() {
        const categoryMenu = document.getElementById('categoryMenu');
        if (!categoryMenu) {
            console.warn('Category menu container not found');
            return;
        }
        
        try {
            // Fetch categories
            const categoriesResponse = await fetch('/api/categories');
            if (!categoriesResponse.ok) {
                throw new Error(`HTTP ${categoriesResponse.status}`);
            }
            
            const categories = await categoriesResponse.json();
            categoriesData = categories.filter(cat => cat.isActive);
            
            // Sort by ordering, then name
            categoriesData.sort((a, b) => {
                if (a.ordering !== b.ordering) {
                    return (a.ordering || 0) - (b.ordering || 0);
                }
                return (a.name || '').localeCompare(b.name || '');
            });
            
            // Fetch subcategories for each category
            await Promise.all(categoriesData.map(async (category) => {
                try {
                    // Use the correct API endpoint (was subcategories-v2, now subcategories)
                    const response = await fetch(`/api/public/subcategories?category=${category._id}&limit=50`);
                    if (response.ok) {
                        const result = await response.json();
                        // API returns { success: true, data: [...] }
                        category.subcategories = result.data || [];
                    }
                } catch (error) {
                    console.warn('Error loading subcategories:', error);
                }
            }));
            
            renderCategoryMenu(categoriesData);
            initializeNavbarDropdowns();
            initializeMobileMenuToggle();
        } catch (error) {
            console.error('Error loading categories for navbar:', error);
            categoryMenu.innerHTML = '<li><a href="/products.html">Shop</a></li>';
        }
    }
    
    /**
     * Render category menu HTML
     */
    function renderCategoryMenu(categories) {
        const categoryMenu = document.getElementById('categoryMenu');
        if (!categoryMenu) return;
        
        categoryMenu.innerHTML = '';
        
        categories.forEach(category => {
            const li = document.createElement('li');
            
            // Check if category has subcategories
            const hasSubcategories = category.subcategories && category.subcategories.length > 0;
            
            if (hasSubcategories) {
                li.classList.add('has-dropdown');
                
                const link = document.createElement('a');
                link.href = `/category.html?id=${category._id}`;
                link.textContent = category.name;
                
                const dropdown = document.createElement('ul');
                dropdown.className = 'category-dropdown';
                
                // Sort subcategories
                const subcategories = [...category.subcategories].sort((a, b) => {
                    if (a.ordering !== b.ordering) {
                        return (a.ordering || 0) - (b.ordering || 0);
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });
                
                subcategories.forEach(subcategory => {
                    const subLi = document.createElement('li');
                    const subLink = document.createElement('a');
                    subLink.href = `/subcategory.html?id=${subcategory._id}`;
                    subLink.textContent = subcategory.name;
                    subLi.appendChild(subLink);
                    dropdown.appendChild(subLi);
                });
                
                li.appendChild(link);
                li.appendChild(dropdown);
            } else {
                const link = document.createElement('a');
                link.href = `/category.html?id=${category._id}`;
                link.textContent = category.name;
                li.appendChild(link);
            }
            
            categoryMenu.appendChild(li);
        });
    }
    
    /**
     * Handle mobile category click (Delegated)
     */
    function handleMobileCategoryClick(e) {
        // Only run on mobile
        if (window.innerWidth >= 992) return;

        const item = e.target.closest('.category-menu > li.has-dropdown');
        if (!item) return;
        
        const link = item.querySelector('a');
        if (!link) return;
        
        // Only toggle if clicking the link itself, not navigating
        const isDropdownClick = e.target === link || link.contains(e.target);
        if (isDropdownClick && !e.target.closest('.category-dropdown')) {
            e.preventDefault();
            e.stopPropagation();
            
            // Prevent rapid toggling
            if (item.dataset.processing === 'true') {
                return;
            }
            item.dataset.processing = 'true';
            setTimeout(() => {
                item.dataset.processing = 'false';
            }, 300);
            
            item.classList.toggle('dropdown-open');
            
            // Close other dropdowns
            document.querySelectorAll('.category-menu > li.dropdown-open').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('dropdown-open');
                }
            });
        }
    }

    /**
     * Initialize mobile menu toggle
     */
    function initializeMobileMenuToggle() {
        const toggleButton = document.getElementById('categoryNavToggle');
        const categoryNav = document.querySelector('.category-nav');
        const categoryMenu = document.getElementById('categoryMenu');
        const overlay = document.getElementById('categoryNavOverlay');
        const closeButton = document.getElementById('categoryNavClose');
        const menuSearchInput = document.getElementById('categoryMenuSearch');
        const menuSearchResults = document.getElementById('categoryMenuSearchResults');
        const menuSearchBtn = document.getElementById('categoryMenuSearchBtn');
        
        if (!toggleButton || !categoryNav || !categoryMenu) {
            console.warn('Mobile menu toggle elements not found');
            return;
        }

        // Initialize mobile category click listener (Once)
        // Use a flag to ensure we don't attach it multiple times if this function is called again
        if (!categoryMenu.dataset.mobileListenerAttached) {
            categoryMenu.addEventListener('click', handleMobileCategoryClick, { passive: false });
            categoryMenu.dataset.mobileListenerAttached = 'true';
        }
        
        // Initialize menu search functionality
        if (menuSearchInput && menuSearchResults && window.initializeSearch) {
            let searchTimeout;
            let searchAbortController = null;
            
            menuSearchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                // Clear previous timeout
                clearTimeout(searchTimeout);
                
                // Cancel previous request
                if (searchAbortController) {
                    searchAbortController.abort();
                }
                
                if (query.length < 2) {
                    menuSearchResults.classList.remove('active');
                    menuSearchResults.innerHTML = '';
                    return;
                }
                
                // Debounce search
                searchTimeout = setTimeout(async () => {
                    try {
                        searchAbortController = new AbortController();
                        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`, {
                            signal: searchAbortController.signal
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        // Use the existing renderSearchResults function
                        if (window.renderSearchResults) {
                            window.renderSearchResults(data, menuSearchResults);
                        } else {
                            // Fallback rendering
                            renderMenuSearchResults(data, menuSearchResults);
                        }
                        
                        menuSearchResults.classList.add('active');
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            return;
                        }
                        console.error('Menu search error:', error);
                        menuSearchResults.innerHTML = '<div class="search-error">Error searching. Please try again.</div>';
                        menuSearchResults.classList.add('active');
                    }
                }, 300);
            });
            
            // Clear search on close
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    menuSearchInput.value = '';
                    menuSearchResults.classList.remove('active');
                    menuSearchResults.innerHTML = '';
                });
            }
            
            // Close search results when clicking outside - Use passive listener
            const handleSearchOutsideClick = (e) => {
                if (!menuSearchInput.contains(e.target) && !menuSearchResults.contains(e.target)) {
                    menuSearchResults.classList.remove('active');
                }
            };
            document.addEventListener('click', handleSearchOutsideClick, { passive: true });
        }
        
        // Function to open menu
        function openMenu() {
            categoryNav.classList.add('menu-open');
            if (overlay) overlay.classList.add('active');
            if (toggleButton) toggleButton.classList.add('active');
            // Prevent body scroll when menu is open - Use CSS class instead of inline style
            document.body.classList.add('menu-open');
        }
        
        // Function to close menu
        function closeMenu() {
            categoryNav.classList.remove('menu-open');
            if (overlay) overlay.classList.remove('active');
            if (toggleButton) toggleButton.classList.remove('active');
            // Restore body scroll
            document.body.classList.remove('menu-open');
        }
        
        // Toggle menu on button click - Use touchstart for mobile, click for desktop
        const handleMenuToggle = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Prevent rapid toggling
            if (toggleButton.dataset.processing === 'true') {
                return;
            }
            toggleButton.dataset.processing = 'true';
            
            setTimeout(() => {
                toggleButton.dataset.processing = 'false';
            }, 300);
            
            if (categoryNav.classList.contains('menu-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        };
        
        // Use both touchstart and click for better mobile support
        toggleButton.addEventListener('touchstart', handleMenuToggle, { passive: false });
        toggleButton.addEventListener('click', handleMenuToggle);
        
        // Close button - Use touchstart for mobile
        if (closeButton) {
            const handleClose = function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
            };
            closeButton.addEventListener('touchstart', handleClose, { passive: false });
            closeButton.addEventListener('click', handleClose);
        }
        
        // Close menu when clicking overlay - Use touchstart for mobile
        if (overlay) {
            const handleOverlayClose = function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
            };
            overlay.addEventListener('touchstart', handleOverlayClose, { passive: false });
            overlay.addEventListener('click', handleOverlayClose);
        }
        
        // Close menu when clicking outside (on document) - Use passive listener and debounce
        let clickTimeout;
        const handleOutsideClick = function(e) {
            if (categoryNav.classList.contains('menu-open')) {
                if (!categoryNav.contains(e.target) && 
                    !toggleButton.contains(e.target) && 
                    (!overlay || !overlay.contains(e.target))) {
                    // Debounce to prevent rapid firing
                    clearTimeout(clickTimeout);
                    clickTimeout = setTimeout(() => {
                        closeMenu();
                    }, 50);
                }
            }
        };
        document.addEventListener('click', handleOutsideClick, { passive: true });
        
        // Close menu on window resize to desktop - Use passive listener
        let resizeTimeout;
        const handleResize = function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                if (window.innerWidth > 767) {
                    closeMenu();
                }
            }, 200); // Increased timeout to reduce frequency
        };
        window.addEventListener('resize', handleResize, { passive: true });
        
        // Close menu on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && categoryNav.classList.contains('menu-open')) {
                closeMenu();
            }
        });
    }
    
    /**
     * Initialize navbar dropdowns
     */
    function initializeNavbarDropdowns() {
        const isMobile = window.innerWidth < 992;
        
        if (!isMobile) {
            // Desktop: Hover to show
            document.querySelectorAll('.category-menu > li.has-dropdown').forEach(item => {
                item.addEventListener('mouseenter', () => {
                    item.classList.add('dropdown-open');
                });
                
                item.addEventListener('mouseleave', () => {
                    item.classList.remove('dropdown-open');
                });
            });
        }
        
        // Close dropdowns when clicking outside - Use passive listener
        const handleDropdownOutsideClick = (e) => {
            if (!e.target.closest('.category-menu > li.has-dropdown')) {
                document.querySelectorAll('.category-menu > li.dropdown-open').forEach(item => {
                    item.classList.remove('dropdown-open');
                });
            }
        };
        // Remove existing listener if any (although anonymous function makes it hard, so rely on idempotent behavior or ignore for now)
        // Ideally we should use a named function for outside click too, but for now this is less critical than the toggle loop.
        document.addEventListener('click', handleDropdownOutsideClick, { passive: true });
    }
    
    /**
     * Handle window resize
     */
    function handleResize() {
        const isMobile = window.innerWidth < 992;
        const wasMobile = document.body.classList.contains('mobile-view');
        
        if (isMobile !== wasMobile) {
            document.body.classList.toggle('mobile-view', isMobile);
            
            // Re-render menu to clean up state and listeners
            if (categoriesData.length > 0) {
                renderCategoryMenu(categoriesData);
                initializeNavbarDropdowns();
            }
        }
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // CRITICAL: Reset body overflow on page load to ensure scrolling works
            document.body.classList.remove('filter-sidebar-open', 'menu-open');
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
            loadCategoriesForNavbar();
            initializeMobileMenuToggle();
            window.addEventListener('resize', handleResize);
        });
    } else {
        // CRITICAL: Reset body overflow on page load to ensure scrolling works
        document.body.classList.remove('filter-sidebar-open', 'menu-open');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        loadCategoriesForNavbar();
        initializeMobileMenuToggle();
        window.addEventListener('resize', handleResize);
    }
    
    /**
     * Render search results in mobile menu (fallback if main function not available)
     */
    function renderMenuSearchResults(data, dropdown) {
        const { products = [], categories = [], departments = [], subcategories = [], total = 0 } = data;
        
        if (!products || products.length === 0) {
            if (total === 0) {
                dropdown.innerHTML = '<div class="search-no-results">No results found</div>';
                dropdown.classList.add('active');
                return;
            }
        }
        
        let html = '';
        
        // Products - Show first (main focus like reference image)
        if (products && products.length > 0) {
            products.forEach(product => {
                const imageUrl = product.image || product.images?.[0]?.url || window.globalFallbackImage || '/images/placeholder.png';
                const productPrice = product.price || 0;
                const productDiscount = product.discount || 0;
                const finalPrice = productPrice * (1 - (productDiscount || 0) / 100);
                const productId = product._id || product.id;
                const productUrl = product.url || `/product.html?id=${productId}`;
                
                let priceHtml = '';
                if (productDiscount > 0 && productPrice > 0) {
                    priceHtml = `
                        <div class="category-nav-search-result-price">
                            Rs.${finalPrice.toFixed(2)}
                            <span class="original-price">Rs.${productPrice.toFixed(2)}</span>
                        </div>
                    `;
                } else if (productPrice > 0) {
                    priceHtml = `<div class="category-nav-search-result-price">Rs.${productPrice.toFixed(2)}</div>`;
                } else {
                    priceHtml = '<div class="category-nav-search-result-price">Price not available</div>';
                }
                
                html += `
                    <a href="${productUrl}" class="category-nav-search-result-item">
                        <img src="${imageUrl}" alt="${(product.name || '').replace(/"/g, '&quot;')}" onerror="this.src='/images/placeholder.png'">
                        <div class="category-nav-search-result-content">
                            <div class="category-nav-search-result-name">${(product.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                            ${priceHtml}
                        </div>
                    </a>
                `;
            });
        }
        
        dropdown.innerHTML = html;
        dropdown.classList.add('active');
    }
    
    // Export function for external use
    window.loadCategoriesForNavbar = loadCategoriesForNavbar;
    
})();

