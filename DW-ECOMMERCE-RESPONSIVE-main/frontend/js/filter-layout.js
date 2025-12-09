// Filter Layout JavaScript - Handles filter interactions matching dwatsoncosmetics.pk

document.addEventListener('DOMContentLoaded', function() {
    // Initialize filter groups
    initFilterGroups();
    
    // Initialize zoom filter buttons
    initZoomFilter();
    
    // Initialize sort by dropdown
    initSortBy();
    
    // Initialize mobile filter toggle
    initMobileFilterToggle();
});

// Initialize filter group toggles
function initFilterGroups() {
    const filterGroupHeaders = document.querySelectorAll('.filter-group-header');
    
    filterGroupHeaders.forEach(header => {
        // Remove any existing listeners
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        newHeader.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const filterGroup = this.closest('.filter-group');
            const isActive = filterGroup.classList.contains('active');
            
            // Toggle active class
            if (isActive) {
                filterGroup.classList.remove('active');
                this.classList.remove('active');
                // Change chevron icon
                const chevron = this.querySelector('.chevron i');
                if (chevron) {
                    if (chevron.classList.contains('fa-chevron-up')) {
                        chevron.classList.remove('fa-chevron-up');
                        chevron.classList.add('fa-chevron-down');
                    }
                }
            } else {
                filterGroup.classList.add('active');
                this.classList.add('active');
                // Change chevron icon
                const chevron = this.querySelector('.chevron i');
                if (chevron) {
                    if (chevron.classList.contains('fa-chevron-down')) {
                        chevron.classList.remove('fa-chevron-down');
                        chevron.classList.add('fa-chevron-up');
                    }
                }
            }
        });
    });
}

// Initialize zoom filter (layout options)
function initZoomFilter() {
    const zoomFilterBtns = document.querySelectorAll('.zoom-filter-btn');
    const productsGrid = document.getElementById('productsGrid');
    
    if (!productsGrid || zoomFilterBtns.length === 0) return;
    
    zoomFilterBtns.forEach(btn => {
        // Remove any existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            
            // Remove active class from all buttons
            document.querySelectorAll('.zoom-filter-btn').forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update grid classes
            productsGrid.className = 'products-grid';
            
            if (view === 'list') {
                productsGrid.classList.add('view-list');
            } else if (view === 'grid-2') {
                productsGrid.classList.add('view-grid-2');
            } else if (view === 'grid-3') {
                productsGrid.classList.add('view-grid-3');
            } else {
                productsGrid.classList.add('view-grid');
            }
            
            // Save preference to localStorage
            localStorage.setItem('productView', view);
            
            // Trigger product reload - try multiple methods
            setTimeout(() => {
                if (typeof window.reloadProductsForView === 'function') {
                    window.reloadProductsForView();
                } else if (typeof loadProducts === 'function') {
                    loadProducts(1);
                } else {
                    // Try to find and trigger sort by change to reload
                    const sortBy = document.getElementById('sortBy');
                    if (sortBy) {
                        sortBy.dispatchEvent(new Event('change'));
                    }
                }
            }, 100);
        });
    });
    
    // Restore saved view preference
    const savedView = localStorage.getItem('productView');
    if (savedView) {
        const savedBtn = document.querySelector(`.zoom-filter-btn[data-view="${savedView}"]`);
        if (savedBtn) {
            // Update classes without triggering reload
            document.querySelectorAll('.zoom-filter-btn').forEach(b => b.classList.remove('active'));
            savedBtn.classList.add('active');
            productsGrid.className = 'products-grid';
            if (savedView === 'list') {
                productsGrid.classList.add('view-list');
            } else if (savedView === 'grid-2') {
                productsGrid.classList.add('view-grid-2');
            } else if (savedView === 'grid-3') {
                productsGrid.classList.add('view-grid-3');
            } else {
                productsGrid.classList.add('view-grid');
            }
        }
    }
}

// Initialize sort by dropdown
function initSortBy() {
    const sortBySelect = document.getElementById('sortBy');
    if (!sortBySelect) return;
    
    sortBySelect.addEventListener('change', function() {
        // Trigger product reload if loadProducts function exists
        if (typeof window.reloadProductsForSort === 'function') {
            window.reloadProductsForSort();
        }
    });
}

// Initialize mobile filter toggle
function initMobileFilterToggle() {
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterSidebar = document.getElementById('filterSidebar');
    const filterOverlay = document.getElementById('filterOverlay');
    const filterCloseBtn = document.getElementById('filterCloseBtn');
    
    if (!filterToggleBtn || !filterSidebar) return;
    
    // Open filter sidebar
    // Use touchstart for mobile, click for desktop
    const handleFilterToggle = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent rapid toggling
        if (filterToggleBtn.dataset.processing === 'true') {
            return;
        }
        filterToggleBtn.dataset.processing = 'true';
        setTimeout(() => {
            filterToggleBtn.dataset.processing = 'false';
        }, 300);
        
        filterSidebar.classList.add('active');
        if (filterOverlay) {
            filterOverlay.classList.add('active');
        }
        // Use CSS class instead of inline style
        if (window.innerWidth < 992) {
            document.body.classList.add('filter-sidebar-open');
        }
    };
    
    filterToggleBtn.addEventListener('touchstart', handleFilterToggle, { passive: false });
    filterToggleBtn.addEventListener('click', handleFilterToggle);
    
    // Close filter sidebar
    function closeFilter() {
        filterSidebar.classList.remove('active');
        if (filterOverlay) {
            filterOverlay.classList.remove('active');
        }
        // Reset using CSS class
        if (window.innerWidth < 992) {
            document.body.classList.remove('filter-sidebar-open');
        }
    }
    
    if (filterCloseBtn) {
        filterCloseBtn.addEventListener('touchstart', closeFilter, { passive: false });
        filterCloseBtn.addEventListener('click', closeFilter);
    }
    
    if (filterOverlay) {
        filterOverlay.addEventListener('touchstart', closeFilter, { passive: false });
        filterOverlay.addEventListener('click', closeFilter);
    }
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && filterSidebar.classList.contains('active')) {
            closeFilter();
        }
    });
    
    // Reset body styles on window resize (in case user rotates device or resizes)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (!filterSidebar.classList.contains('active')) {
                // Only reset if sidebar is closed
                document.body.classList.remove('filter-sidebar-open');
            }
        }, 100);
    }, { passive: true });
}

// Function to update filter sidebar image
function updateFilterSidebarImage(imageUrl, altText) {
    const filterImageContainer = document.getElementById('filterSidebarImage');
    const filterImage = document.getElementById('filterSidebarImageSrc');
    
    if (!filterImageContainer || !filterImage) return;
    
    if (imageUrl) {
        filterImage.src = imageUrl;
        filterImage.alt = altText || '';
        filterImageContainer.classList.add('has-image');
        
        // Hide header images when filter sidebar image is shown
        hideHeaderImages();
    } else {
        filterImageContainer.classList.remove('has-image');
        // Show header images when filter sidebar image is removed
        showHeaderImages();
    }
}

// Hide header images when filter sidebar has image
function hideHeaderImages() {
    // Hide category image
    const categoryImage = document.getElementById('categoryImage');
    if (categoryImage) {
        const imageColumn = categoryImage.closest('.col-md-4');
        if (imageColumn) {
            imageColumn.classList.add('header-image-hidden');
        }
    }
    
    // Hide department image
    const departmentImage = document.getElementById('departmentImage');
    if (departmentImage) {
        const imageColumn = departmentImage.closest('.col-md-4');
        if (imageColumn) {
            imageColumn.classList.add('header-image-hidden');
        }
    }
    
    // Hide subcategory image
    const subcategoryImage = document.getElementById('subcategoryImage');
    if (subcategoryImage) {
        const imageColumn = subcategoryImage.closest('.col-md-4');
        if (imageColumn) {
            imageColumn.classList.add('header-image-hidden');
        }
    }
}

// Show header images when filter sidebar image is removed
function showHeaderImages() {
    // Show category image
    const categoryImage = document.getElementById('categoryImage');
    if (categoryImage) {
        const imageColumn = categoryImage.closest('.col-md-4');
        if (imageColumn) {
            imageColumn.classList.remove('header-image-hidden');
        }
    }
    
    // Show department image
    const departmentImage = document.getElementById('departmentImage');
    if (departmentImage) {
        const imageColumn = departmentImage.closest('.col-md-4');
        if (imageColumn) {
            imageColumn.classList.remove('header-image-hidden');
        }
    }
    
    // Show subcategory image
    const subcategoryImage = document.getElementById('subcategoryImage');
    if (subcategoryImage) {
        const imageColumn = subcategoryImage.closest('.col-md-4');
        if (imageColumn) {
            imageColumn.classList.remove('header-image-hidden');
        }
    }
}

// Export function for use in other scripts
window.updateFilterSidebarImage = updateFilterSidebarImage;

