/**
 * Mobile Scroll Helper
 * Adds horizontal scrolling classes to product grids for mobile devices
 * Works with global-responsive.css to ensure proper horizontal scrolling
 */

(function() {
    'use strict';
    
    // Check if mobile/tablet
    function isMobile() {
        return window.innerWidth <= 991;
    }
    
    // Add classes to product rows
    function addProductScrollClasses() {
        // Find all rows with product cards
        const productRows = document.querySelectorAll('.row');
        productRows.forEach(row => {
            const hasProductCard = row.querySelector('.product-card') || 
                                  row.querySelector('[class*="product"]') ||
                                  row.id === 'productsGrid' ||
                                  row.querySelector('.category-card') ||
                                  row.querySelector('.department-card');
            
            if (hasProductCard && !row.classList.contains('has-product-cards')) {
                row.classList.add('has-product-cards', 'product-row-scroll');
            }
        });
        
        // Also add to direct product grids
        const productGrids = document.querySelectorAll('#productsGrid, .products-grid');
        productGrids.forEach(grid => {
            if (!grid.classList.contains('product-row-scroll')) {
                grid.classList.add('product-row-scroll');
            }
        });
        
        // Add to product carousel wrappers
        const carouselWrappers = document.querySelectorAll('.product-carousel__wrapper');
        carouselWrappers.forEach(wrapper => {
            if (isMobile() && !wrapper.classList.contains('horizontal-scroll')) {
                wrapper.classList.add('horizontal-scroll');
            } else if (!isMobile() && wrapper.classList.contains('horizontal-scroll')) {
                wrapper.classList.remove('horizontal-scroll');
            }
        });
    }
    
    // Remove horizontal scroll classes on desktop
    function removeDesktopScrollClasses() {
        if (!isMobile()) {
            const scrollElements = document.querySelectorAll('.product-row-scroll, .row.has-product-cards');
            scrollElements.forEach(el => {
                // Only remove if it's not a product carousel wrapper
                if (!el.classList.contains('product-carousel__wrapper')) {
                    // Keep classes but CSS will handle the overflow
                }
            });
        }
    }
    
    // Ensure body doesn't have horizontal scroll - Optimized version
    // Uses CSS-only approach and only checks specific problematic elements
    let preventScrollTimeout = null;
    function preventBodyHorizontalScroll() {
        // Debounce to prevent frequent calls
        clearTimeout(preventScrollTimeout);
        preventScrollTimeout = setTimeout(() => {
            // CSS handles most overflow prevention, only check specific containers
            const containers = document.querySelectorAll('.container, .container-fluid, main, section');
            containers.forEach(container => {
                // Only check if container itself is causing overflow (not children)
                if (container.scrollWidth > window.innerWidth && 
                    !container.classList.contains('product-carousel__wrapper') &&
                    !container.classList.contains('product-row-scroll') &&
                    !container.classList.contains('row.has-product-cards') &&
                    !container.classList.contains('table-responsive')) {
                    const style = window.getComputedStyle(container);
                    const computedWidth = parseInt(style.width);
                    if (computedWidth > window.innerWidth) {
                        container.style.maxWidth = '100%';
                    }
                }
            });
        }, 100); // Debounce delay
    }
    
    // Initialize
    function init() {
        addProductScrollClasses();
        removeDesktopScrollClasses();
        preventBodyHorizontalScroll();
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Re-run when content is dynamically loaded - Optimized MutationObserver
    let mutationTimeout = null;
    let pendingMutations = false;
    
    const observer = new MutationObserver(function(mutations) {
        // Debounce mutations to prevent excessive calls
        pendingMutations = true;
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(function() {
            if (pendingMutations) {
                // Use requestIdleCallback for non-critical updates
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(function() {
                        init();
                        pendingMutations = false;
                    }, { timeout: 500 });
                } else {
                    setTimeout(function() {
                        init();
                        pendingMutations = false;
                    }, 200);
                }
            }
        }, 300); // Debounce delay
    });
    
    // Observe changes to main content - Reduced scope
    const mainContent = document.querySelector('main');
    if (mainContent) {
        // Only observe direct children, not entire subtree
        observer.observe(mainContent, {
            childList: true,
            subtree: false, // Changed from true to false - only watch direct children
            attributes: false // Removed attribute observation
        });
    }
    
    // Re-run on window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            init();
            preventBodyHorizontalScroll();
        }, 250);
    });
    
    // Also check after images load (they might cause overflow)
    window.addEventListener('load', function() {
        setTimeout(init, 100);
        preventBodyHorizontalScroll();
    });
})();

