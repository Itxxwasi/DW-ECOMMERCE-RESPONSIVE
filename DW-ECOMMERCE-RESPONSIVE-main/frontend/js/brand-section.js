/**
 * Brand Section JavaScript
 * Mobile-first professional brand display
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiEndpoint: '/api/brand-sections/public',
        sectionId: null, // Will be set from URL or first active section
        animationDelay: 50
    };

    // State
    const state = {
        section: null,
        brands: [],
        loading: false,
        error: null
    };

    /**
     * Initialize brand section
     */
    async function init() {
        console.log('🚀 Initializing Brand Section...');
        
        try {
            // Get section ID from URL or use first active section
            const urlParams = new URLSearchParams(window.location.search);
            const sectionId = urlParams.get('id');
            
            await loadBrandSection(sectionId);
            renderBrands();
        } catch (error) {
            console.error('❌ Error initializing brand section:', error);
            showError('Failed to load brands. Please try again later.');
        }
    }

    /**
     * Load brand section from API
     */
    async function loadBrandSection(sectionId = null) {
        state.loading = true;
        showLoading();

        try {
            const response = await fetch(CONFIG.apiEndpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const sections = await response.json();
            
            if (!sections || sections.length === 0) {
                throw new Error('No brand sections found');
            }

            // Use specified section or first active section
            let selectedSection = null;
            if (sectionId) {
                selectedSection = sections.find(s => s._id === sectionId);
            }
            
            if (!selectedSection) {
                selectedSection = sections.find(s => s.isActive && s.isPublished) || sections[0];
            }

            if (!selectedSection) {
                throw new Error('No active brand section found');
            }

            state.section = selectedSection;
            state.brands = selectedSection.brands || [];
            
            // Sort brands by order
            state.brands.sort((a, b) => (a.order || 0) - (b.order || 0));

            console.log(`✅ Loaded ${state.brands.length} brands from section: ${selectedSection.name}`);
            state.loading = false;
        } catch (error) {
            console.error('❌ Error loading brand section:', error);
            state.error = error.message;
            state.loading = false;
            throw error;
        }
    }

    /**
     * Render brands to the page
     */
    function renderBrands() {
        const grid = document.getElementById('brandGrid');
        if (!grid) {
            console.error('❌ Brand grid element not found');
            return;
        }

        // Clear existing content
        grid.innerHTML = '';

        // Render section header
        renderHeader();

        // Render brands
        if (state.brands.length === 0) {
            grid.innerHTML = '<div class="brand-grid-empty">No brands available at the moment.</div>';
            return;
        }

        state.brands.forEach((brand, index) => {
            const brandCard = createBrandCard(brand, index);
            grid.appendChild(brandCard);
        });

        console.log(`✅ Rendered ${state.brands.length} brand cards`);
    }

    /**
     * Render section header
     */
    function renderHeader() {
        const titleEl = document.getElementById('brandSectionTitle');
        const subtitleEl = document.getElementById('brandSectionSubtitle');

        if (titleEl && state.section) {
            titleEl.textContent = state.section.title || state.section.name || 'Our Brands';
        }

        if (subtitleEl && state.section && state.section.subtitle) {
            subtitleEl.textContent = state.section.subtitle;
        } else if (subtitleEl) {
            subtitleEl.style.display = 'none';
        }
    }

    /**
     * Create brand card element
     */
    function createBrandCard(brand, index) {
        const card = document.createElement('div');
        card.className = 'brand-card';
        card.style.animationDelay = `${index * CONFIG.animationDelay}ms`;

        const link = document.createElement('a');
        if (brand.link && brand.link.trim() !== '') {
            link.href = brand.link;
        } else if (brand.id) {
            link.href = `/brand-products.html?brand=${encodeURIComponent(brand.id)}&name=${encodeURIComponent(brand.name || 'Brand')}`;
        } else {
            link.href = '#';
        }
        link.className = 'brand-card-link';
        if (brand.link) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        } else {
            if (!brand.id) link.onclick = (e) => e.preventDefault();
        }

        // Logo container
        const logoContainer = document.createElement('div');
        logoContainer.className = 'brand-logo-container';

        const img = document.createElement('img');
        img.src = brand.imageUrl || '/images/placeholder-brand.jpg';
        img.alt = brand.name || 'Brand Logo';
        img.loading = index < 6 ? 'eager' : 'lazy';
        img.onerror = function() {
            this.src = '/images/placeholder-brand.jpg';
        };

        logoContainer.appendChild(img);

        // Brand info
        const brandInfo = document.createElement('div');
        brandInfo.className = 'brand-info';

        const brandName = document.createElement('div');
        brandName.className = 'brand-name';
        brandName.textContent = brand.name || 'Brand';

        brandInfo.appendChild(brandName);

        // Discount badge
        if (brand.discountText || (brand.discount && brand.discount > 0)) {
            const discountBadge = document.createElement('div');
            discountBadge.className = 'brand-discount-badge';
            discountBadge.textContent = brand.discountText || `Flat ${brand.discount}% OFF`;
            brandInfo.appendChild(discountBadge);
        }

        // Assemble card
        link.appendChild(logoContainer);
        link.appendChild(brandInfo);
        card.appendChild(link);

        return card;
    }

    /**
     * Show loading state
     */
    function showLoading() {
        const grid = document.getElementById('brandGrid');
        if (grid) {
            grid.innerHTML = '<div class="brand-grid-loading">Loading brands...</div>';
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        const grid = document.getElementById('brandGrid');
        if (grid) {
            grid.innerHTML = `<div class="brand-grid-empty" style="color: #e63946;">${message}</div>`;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for external use
    window.BrandSection = {
        reload: init,
        getState: () => ({ ...state })
    };

})();

