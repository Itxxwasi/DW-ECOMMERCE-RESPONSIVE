/**
 * Mobile Fixes and Scroll Management
 * This script handles mobile menu, scroll locking, and other mobile-specific fixes
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMain = document.querySelector('.nav-main');
    const overlay = document.querySelector('.overlay');
    
    // Toggle mobile menu
    function toggleMobileMenu() {
        const isOpen = navMain.classList.toggle('active');
        document.body.classList.toggle('no-scroll', isOpen);
        
        if (overlay) {
            overlay.classList.toggle('active', isOpen);
        }
        
        // Toggle aria-expanded for accessibility
        if (mobileMenuToggle) {
            const expanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true' || false;
            mobileMenuToggle.setAttribute('aria-expanded', !expanded);
        }
    }
    
    // Close mobile menu when clicking outside
    function closeMobileMenu() {
        navMain.classList.remove('active');
        document.body.classList.remove('no-scroll');
        
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        if (mobileMenuToggle) {
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }
    }
    
    // Event listeners
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMobileMenu();
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeMobileMenu);
    }
    
    // Close menu when clicking on a nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 992) {
                closeMobileMenu();
            }
        });
    });
    
    // Handle dropdown toggles on mobile
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth < 992) {
                e.preventDefault();
                const dropdown = this.nextElementSibling;
                if (dropdown && dropdown.classList.contains('dropdown-menu')) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            }
        });
    });
    
    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth >= 992) {
                // Reset mobile menu on desktop
                closeMobileMenu();
                // Ensure all dropdowns are visible on desktop
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = '';
                });
            }
        }, 250);
    });
    
    // Fix for iOS elastic scrolling
    document.body.addEventListener('touchmove', function(e) {
        if (document.body.classList.contains('no-scroll')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Fix for iOS viewport height issue
    function fixViewportHeight() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    // Initial call
    fixViewportHeight();
    
    // Recalculate on resize
    window.addEventListener('resize', fixViewportHeight);
    window.addEventListener('orientationchange', fixViewportHeight);
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                // Close mobile menu if open
                closeMobileMenu();
                
                // Scroll to target
                const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL without jumping
                if (history.pushState) {
                    history.pushState(null, null, targetId);
                } else {
                    location.hash = targetId;
                }
            }
        });
    });
    
    // Fix for iOS viewport height when keyboard is open
    if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
        document.body.addEventListener('focusin', function() {
            setTimeout(fixViewportHeight, 100);
        });
        
        document.body.addEventListener('focusout', function() {
            setTimeout(fixViewportHeight, 100);
        });
    }
    
    // Prevent multiple form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            const submitButton = this.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = 'Processing...';
            }
        });
    });
    
    // Initialize tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

// Handle page transitions
window.addEventListener('beforeunload', function() {
    document.body.classList.add('page-transition-out');
});

// Fix for iOS viewport height on load
window.addEventListener('load', function() {
    // Fix for iOS viewport height
    const fixViewportHeight = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    fixViewportHeight();
    
    // Remove loading class
    document.documentElement.classList.remove('is-loading');
    
    // Remove loading screen
    const loadingScreen = document.querySelector('.page-loading');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            loadingScreen.remove();
        }, 300);
    }
});

// Polyfill for matches() for older browsers
if (!Element.prototype.matches) {
    Element.prototype.matches = 
        Element.prototype.matchesSelector || 
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector || 
        Element.prototype.oMatchesSelector || 
        Element.prototype.webkitMatchesSelector ||
        function(s) {
            const matches = (this.document || this.ownerDocument).querySelectorAll(s);
            let i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;            
        };
}

// Polyfill for closest() for older browsers
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        let el = this;
        if (!document.documentElement.contains(el)) return null;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1); 
        return null;
    };
}
