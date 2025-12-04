/**
 * Homepage Sections - Mobile-First Dynamic Loading
 * Loads sections from backend API and renders them with data
 */

(function() {
    'use strict';
    
    // CRITICAL: Log immediately to verify script loads
    console.log('🚀 home.js STARTING - Script is loading!');
    console.log('🚀 home.js version: v22');
    console.log('🚀 home.js timestamp:', new Date().toISOString());

    // Section type to template mapping
    const SECTION_TEMPLATES = {
        'scrollingText': 'announcement-bar.html',
        'bannerFullWidth': 'banner.html',
        'heroSlider': 'hero-slider.html',
        'categoryFeatured': 'popular-categories.html',
        'categoryGrid': 'popular-categories.html',
        'categoryCircles': 'popular-categories.html',
        'newArrivals': 'new-arrivals.html',
        'topSelling': 'top-selling-products.html',
        'featuredCollections': 'featured-collections.html',
        'brandSection': 'brand-section.html',
        'newsletterSocial': 'newsletter-social.html',
        'videoBanner': 'video-banner.html'
    };
    
    // Verify videoBanner is in templates (after initialization)
    console.log('✅ SECTION_TEMPLATES initialized with', Object.keys(SECTION_TEMPLATES).length, 'templates');
    console.log('✅ videoBanner template:', SECTION_TEMPLATES['videoBanner']);
    console.log('📋 Available section templates:', Object.keys(SECTION_TEMPLATES));
    if (!SECTION_TEMPLATES['videoBanner']) {
        console.error('❌ CRITICAL: videoBanner template missing from SECTION_TEMPLATES!');
    }

    // Cache for templates
    const templateCache = {};

    /**
     * Load HTML template from file
     */
    async function loadTemplate(templateName) {
        if (templateCache[templateName]) {
            return templateCache[templateName];
        }

        try {
            const url = `/home-sections/${templateName}`;
            console.log(`📥 Fetching template from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`❌ Failed to load template ${templateName}: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to load template: ${templateName} - ${response.status} ${response.statusText}`);
            }
            const html = await response.text();
            if (!html || html.trim().length === 0) {
                console.error(`❌ Template ${templateName} is empty`);
                return null;
            }
            templateCache[templateName] = html;
            console.log(`✅ Template ${templateName} loaded successfully (${html.length} chars)`);
            return html;
        } catch (error) {
            console.error(`❌ Error loading template ${templateName}:`, error);
            return null;
        }
    }

    /**
     * Simple template engine - replace {{variables}} with data
     */
    function renderTemplate(template, data) {
        let html = template;
        
        // Handle {{#each}} loops first
        html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
            const array = data[arrayName] || [];
            if (array.length === 0) return '';
            
            return array.map((item, index) => {
                let itemContent = content;
                
                // Handle {{this}} - if item is a string, use it directly
                if (typeof item === 'string') {
                    itemContent = itemContent.replace(/\{\{this\}\}/g, item);
                }
                
                // Handle @index, @first, @last FIRST (before other replacements)
                itemContent = itemContent.replace(/\{\{@index\}\}/g, index);
                
                // Handle {{#if @first}} conditionals
                itemContent = itemContent.replace(/\{\{#if @first\}\}([\s\S]*?)\{\{\/if\}\}/g, (m, innerContent) => {
                    return index === 0 ? innerContent : '';
                });
                
                // Handle {{#if @last}} conditionals
                itemContent = itemContent.replace(/\{\{#if @last\}\}([\s\S]*?)\{\{\/if\}\}/g, (m, innerContent) => {
                    return index === array.length - 1 ? innerContent : '';
                });
                
                // Replace variables in loop content (object properties)
                // First try to get from item object, then fallback to parent data
                itemContent = itemContent.replace(/\{\{(\w+)\}\}/g, (m, key) => {
                    // Skip if it's {{this}} and we already handled it
                    if (key === 'this' && typeof item === 'string') {
                        return item;
                    }
                    // Skip @index, @first, @last as they're already handled
                    if (key === '@index' || key === '@first' || key === '@last') {
                        return '';
                    }
                    // If item is an object, get the property
                    if (typeof item === 'object' && item !== null) {
                        if (item[key] !== undefined && item[key] !== null) {
                            return String(item[key]);
                        }
                    }
                    // Fallback to parent data if not found in item
                    if (data[key] !== undefined && data[key] !== null) {
                        return String(data[key]);
                    }
                    return '';
                });
                
                return itemContent;
            }).join('');
        });

        // Handle {{#if}} conditionals (process multiple times to handle nested conditionals)
        let changed = true;
        let iterations = 0;
        while (changed && iterations < 10) {
            changed = false;
            iterations++;
            
            html = html.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
                // Trim condition and check for special cases
                condition = condition.trim();
                
                // Handle @first, @last (shouldn't appear here, but handle just in case)
                if (condition === '@first' || condition === '@last') {
                    return '';
                }
                
                // Check if condition is true
                const conditionValue = data[condition];
                const isTrue = conditionValue !== undefined && conditionValue !== null && conditionValue !== false && conditionValue !== '';
                
                if (isTrue) {
                    changed = true;
                    // Process content for nested variables
                    let processedContent = content;
                    // Process nested variables first
                    processedContent = processedContent.replace(/\{\{(\w+)\}\}/g, (m, key) => {
                        if (data[key] !== undefined && data[key] !== null) {
                            return String(data[key]);
                        }
                        return '';
                    });
                    // Process nested conditionals if any
                    processedContent = processedContent.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (m, nestedCondition, nestedContent) => {
                        const nestedValue = data[nestedCondition.trim()];
                        const nestedIsTrue = nestedValue !== undefined && nestedValue !== null && nestedValue !== false && nestedValue !== '';
                        return nestedIsTrue ? nestedContent : '';
                    });
                    return processedContent;
                } else {
                    changed = true;
                    return '';
                }
            });
        }

        // Replace simple variables (do this last)
        html = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            key = key.trim();
            // Skip if it looks like a template tag that wasn't processed
            if (key.startsWith('#') || key.startsWith('/') || key.startsWith('@')) {
                return ''; // Remove unprocessed template tags
            }
            // Check if key exists in data
            if (data[key] !== undefined && data[key] !== null) {
                return String(data[key]); // Convert to string to ensure it's rendered
            }
            // If key doesn't exist, return empty string (don't leave {{key}} in HTML)
            return '';
        });

        // Remove any remaining unprocessed template tags (aggressive cleanup)
        // BUT only remove if they look like unprocessed template tags (start with #, /, @)
        // Don't remove valid variables that might have been missed
        html = html.replace(/\{\{[#\/@][^}]*\}\}/g, '');
        html = html.replace(/\{\{\/[^}]*\}\}/g, '');
        // Remove any stray template syntax that might be incomplete
        html = html.replace(/\{\{[^}]*$/gm, '');
        // DO NOT remove > characters - they are part of valid HTML tags
        // Clean up any whitespace-only lines that might have been left
        html = html.replace(/^\s*$/gm, '');

        return html;
    }

    /**
     * Fetch section data from backend API
     */
    async function fetchSectionData(section) {
        try {
            switch (section.type) {
                case 'scrollingText':
                    // Announcement bar - data comes from config
                    return {
                        sectionId: section._id,
                        sectionName: section.name || '',
                        backgroundColor: section.config.backgroundColor || '#c42525',
                        textColor: section.config.textColor || '#ffffff',
                        items: section.config.items || [],
                        scrollSpeed: section.config.scrollSpeed || 20
                    };

                case 'bannerFullWidth':
                    // Banner - data comes from config
                    const imageUrl = section.config.imageUrl || '';
                    const sizingMode = section.config.sizingMode || 'auto';
                    console.log(`🖼️ Banner config for ${section.name}:`, {
                        imageUrl: imageUrl,
                        altText: section.config.altText,
                        link: section.config.link,
                        sizingMode: sizingMode,
                        customWidth: section.config.customWidth,
                        customHeight: section.config.customHeight,
                        mobileHeight: section.config.mobileHeight,
                        tabletHeight: section.config.tabletHeight,
                        desktopHeight: section.config.desktopHeight,
                        fullConfig: section.config
                    });
                    return {
                        sectionId: section._id,
                        imageUrl: imageUrl,
                        altText: section.config.altText || 'Banner',
                        link: section.config.link || '',
                        sizingMode: sizingMode,
                        customWidth: section.config.customWidth,
                        customHeight: section.config.customHeight,
                        mobileHeight: section.config.mobileHeight,
                        tabletHeight: section.config.tabletHeight,
                        desktopHeight: section.config.desktopHeight
                    };

                case 'heroSlider':
                    // Hero slider - fetch from sliders API
                    console.log('📸 Fetching sliders for hero slider section...');
                    const sliderResponse = await fetch('/api/sliders');
                    if (!sliderResponse.ok) {
                        console.error('❌ Failed to fetch sliders:', sliderResponse.status);
                        return null;
                    }
                    const allSliders = await sliderResponse.json();
                    console.log(`✅ Fetched ${allSliders.length} sliders from API`);
                    
                    // Filter sliders by IDs if specified, otherwise use all active sliders
                    let selectedSliders = [];
                    if (section.config.sliderIds && section.config.sliderIds.length > 0) {
                        console.log(`🔍 Filtering sliders by IDs: ${section.config.sliderIds.join(', ')}`);
                        selectedSliders = allSliders.filter(s => section.config.sliderIds.includes(s._id));
                        console.log(`✅ Found ${selectedSliders.length} matching sliders`);
                    } else {
                        console.log('⚠️ No sliderIds specified, using all active sliders');
                        selectedSliders = allSliders;
                    }
                    
                    if (selectedSliders.length === 0) {
                        console.warn('⚠️ No sliders found for hero slider section');
                        return null;
                    }
                    
                    // Map slider data to slide format
                    const slides = selectedSliders.map(s => {
                        // Get image URL from imageUpload.populated or image field
                        let imageUrl = '';
                        if (s.imageUpload && s.imageUpload.url) {
                            imageUrl = s.imageUpload.url;
                        } else if (s.image) {
                            imageUrl = s.image;
                        } else if (s.imageMobile && s.imageMobileUpload && s.imageMobileUpload.url) {
                            imageUrl = s.imageMobileUpload.url;
                        }
                        
                        return {
                            imageUrl: imageUrl,
                            altText: s.imageAlt || s.title || 'Slider image',
                            title: s.title,
                            subtitle: s.description,
                            buttonText: s.buttonText,
                            buttonLink: s.link || s.buttonLink
                        };
                    });
                    
                    console.log(`✅ Prepared ${slides.length} slides for hero slider`);
                    return {
                        sectionId: section._id,
                        slides: slides,
                        showArrows: section.config.showArrows !== false,
                        showDots: section.config.showDots !== false,
                        autoplay: section.config.autoplay !== false,
                        autoplayInterval: section.config.autoplayInterval || 3000
                    };

                case 'categoryFeatured':
                case 'categoryGrid':
                case 'categoryCircles':
                    // Categories - fetch selected categories or all if no selection
                    let categories = [];
                    if (section.config?.categoryIds && section.config.categoryIds.length > 0) {
                        // Fetch only selected categories
                        const categoryResponse = await fetch('/api/categories');
                        const allCategories = await categoryResponse.json();
                        // Filter to only selected categories, maintaining order
                        const selectedCategoryMap = new Map();
                        allCategories.forEach(cat => {
                            if (section.config.categoryIds.includes(cat._id)) {
                                selectedCategoryMap.set(cat._id, cat);
                            }
                        });
                        // Maintain the order from config.categoryIds
                        categories = section.config.categoryIds
                            .map(id => selectedCategoryMap.get(id))
                            .filter(cat => cat !== undefined);
                    } else {
                        // Fallback: fetch all categories (limit 8)
                        const categoryResponse = await fetch('/api/categories?limit=8');
                        categories = await categoryResponse.json();
                    }
                    return {
                        sectionId: section._id,
                        title: section.title,
                        subtitle: section.subtitle,
                        categories: categories.map(cat => ({
                            id: cat._id,
                            name: cat.name,
                            imageUrl: (cat.imageUpload && cat.imageUpload.url) || cat.image || '/images/placeholder-category.jpg'
                        }))
                    };
                case 'newArrivals':
                    // New Arrivals: use section-specific public endpoint (filters isNewArrival)
                    const naResponse = await fetch(`/api/homepage-sections/${section._id}/data/public`);
                    if (!naResponse.ok) {
                        console.error('❌ Failed to fetch New Arrivals data:', naResponse.status);
                        return null;
                    }
                    const naData = await naResponse.json();
                    const productsArray = Array.isArray(naData?.products) ? naData.products : [];
                    // Debug: Log section fields to check subtitle/description
                    console.log('🔍 New Arrivals Section Data:', {
                        sectionId: section._id,
                        title: section.title,
                        subtitle: section.subtitle,
                        description: section.description,
                        finalSubtitle: section.subtitle || section.description || ''
                    });
                    return {
                        sectionId: section._id,
                        title: section.title,
                        subtitle: section.subtitle || section.description || '',
                        products: productsArray.map(p => ({
                            id: p._id,
                            name: p.name,
                            price: p.price,
                            imageUrl: (p.imageUpload && p.imageUpload.url) || p.image || '/images/placeholder-product.jpg'
                        }))
                    };

                case 'topSelling':
                    // Top Selling: use section-specific public endpoint (filters isTopSelling)
                    const topSellingResponse = await fetch(`/api/homepage-sections/${section._id}/data/public`);
                    if (!topSellingResponse.ok) {
                        console.error('❌ Failed to fetch Top Selling data:', topSellingResponse.status);
                        return null;
                    }
                    const topSellingData = await topSellingResponse.json();
                    const topSellingProducts = Array.isArray(topSellingData?.products) ? topSellingData.products : [];
                    return {
                        sectionId: section._id,
                        title: section.title,
                        subtitle: section.subtitle,
                        products: topSellingProducts.map(p => ({
                            id: p._id,
                            name: p.name,
                            price: p.price,
                            imageUrl: (p.imageUpload && p.imageUpload.url) || p.image || '/images/placeholder-product.jpg'
                        }))
                    };

                case 'featuredCollections':
                    // Featured Collections: show active subcategories in circles
                    // Fetch section-specific public data (subcategories)
                    const fcResponse = await fetch(`/api/homepage-sections/${section._id}/data/public`);
                    if (!fcResponse.ok) {
                        console.error('❌ Failed to fetch Featured Collections data:', fcResponse.status);
                        return null;
                    }
                    const fcData = await fcResponse.json();
                    const subcats = Array.isArray(fcData?.subcategories) ? fcData.subcategories : [];
                    return {
                        sectionId: section._id,
                        title: section.title,
                        subtitle: section.subtitle,
                        showArrows: section.config?.showArrows !== false,
                        collections: subcats.map(sc => ({
                            name: sc.name,
                            imageUrl: (sc.imageUpload && sc.imageUpload.url) || sc.image || '/images/placeholder-category.jpg',
                            linkUrl: `/subcategory/${sc._id}`
                        }))
                    };


                case 'videoBanner':
                    // Video Banner - load data directly from section config (saved in database)
                    {
                        const cfg = section.config || {};
                        
                        console.log('🎥 Video Banner Section Config:', {
                            sectionName: section.name,
                            sectionId: section._id,
                            config: cfg,
                            hasVideoUrl: !!cfg.videoUrl,
                            hasPosterImage: !!cfg.posterImage,
                            isActive: section.isActive,
                            isPublished: section.isPublished
                        });
                        
                        // Get video URL from config (saved from upload or direct URL)
                        const videoUrl = cfg.videoUrl || '';
                        const posterImage = cfg.posterImage || '';
                        
                        // If no video URL and no poster image, show warning but still render (with overlay if exists)
                        if (!videoUrl && !posterImage) {
                            console.warn('⚠️ Video Banner section has no video URL or poster image. Section will still render but may be empty.');
                        }
                        
                        // Get video type from config
                        const videoType = cfg.videoType || 'direct';
                        
                        // Extract video type and prepare embed URLs
                        let youtubeEmbedUrl = '';
                        let vimeoEmbedUrl = '';
                        let isYouTube = false;
                        let isVimeo = false;
                        let isDirectVideo = false;
                        let showPosterOnly = false;
                        
                        if (videoUrl) {
                            if (videoType === 'youtube' || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                                isYouTube = true;
                                // Extract YouTube ID
                                const youtubeIdMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                                const youtubeId = youtubeIdMatch ? youtubeIdMatch[1] : '';
                                if (youtubeId) {
                                    youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeId}`;
                                } else {
                                    console.warn('⚠️ Could not extract YouTube ID from URL:', videoUrl);
                                }
                            } else if (videoType === 'vimeo' || videoUrl.includes('vimeo.com')) {
                                isVimeo = true;
                                // Extract Vimeo ID
                                const vimeoIdMatch = videoUrl.match(/(?:vimeo\.com\/)(\d+)/);
                                const vimeoId = vimeoIdMatch ? vimeoIdMatch[1] : '';
                                if (vimeoId) {
                                    vimeoEmbedUrl = `https://player.vimeo.com/video/${vimeoId}`;
                                } else {
                                    console.warn('⚠️ Could not extract Vimeo ID from URL:', videoUrl);
                                }
                            } else {
                                isDirectVideo = true;
                            }
                        } else if (posterImage) {
                            // If no video URL but poster image exists, show poster only
                            showPosterOnly = true;
                        }
                        
                        // Get overlay content from config
                        const title = cfg.overlayText || section.title || '';
                        const description = cfg.overlayDescription || section.subtitle || '';
                        const ctaText = cfg.ctaText || '';
                        const ctaLink = cfg.ctaLink || '#';
                        
                        // Get video settings from config (defaults if not set)
                        const autoplay = cfg.autoplay !== false ? 1 : 0;
                        const loop = cfg.loop !== false ? 1 : 0;
                        const muted = cfg.muted !== false ? 1 : 0;
                        const controls = cfg.controls === true ? 1 : 0;
                        
                        const videoData = {
                            sectionId: section._id,
                            videoUrl: videoUrl,
                            videoType: videoType,
                            isYouTube: isYouTube,
                            isVimeo: isVimeo,
                            isDirectVideo: isDirectVideo,
                            showPosterOnly: showPosterOnly,
                            youtubeEmbedUrl: youtubeEmbedUrl,
                            vimeoEmbedUrl: vimeoEmbedUrl,
                            posterImage: posterImage,
                            title: title,
                            description: description,
                            ctaText: ctaText,
                            ctaLink: ctaLink,
                            hasOverlay: !!(title || description || ctaText),
                            autoplay: autoplay,
                            loop: loop,
                            muted: muted,
                            controls: controls
                        };
                        
                        console.log('✅ Video Banner Data Prepared:', videoData);
                        return videoData;
                    }

                case 'newsletterSocial':
                    // Newsletter & Social - data comes from config (normalize shapes)
                    {
                        const cfg = section.config || {};
                        const rawLinks = cfg.socialLinks;
                        let socialLinks = [];
                        if (Array.isArray(rawLinks)) {
                            socialLinks = rawLinks;
                        } else if (rawLinks && typeof rawLinks === 'object') {
                            if (rawLinks.facebook) {
                                socialLinks.push({ platform: 'Facebook', url: rawLinks.facebook, iconClass: 'fab fa-facebook-f' });
                            }
                            if (rawLinks.instagram) {
                                socialLinks.push({ platform: 'Instagram', url: rawLinks.instagram, iconClass: 'fab fa-instagram' });
                            }
                        } else {
                            socialLinks = [
                                { platform: 'Facebook', url: '#', iconClass: 'fab fa-facebook-f' },
                                { platform: 'Instagram', url: '#', iconClass: 'fab fa-instagram' }
                            ];
                        }
                        return {
                            sectionId: section._id,
                            title: section.title,
                            subtitle: section.subtitle,
                            backgroundColor: cfg.backgroundColor || '#c42525',
                            textColor: cfg.textColor || '#ffffff',
                            socialLinks,
                            leftTitle: cfg.leftTitle || cfg.socialTitle || "LET'S CONNECT ON SOCIAL MEDIA",
                            leftText: cfg.leftText || cfg.socialDesc || 'Follow us to stay updated on latest looks.',
                            rightTitle: cfg.rightTitle || cfg.newsletterTitle || 'SIGN UP FOR EXCLUSIVE OFFERS & DISCOUNTS',
                            rightText: cfg.rightText || cfg.newsletterDesc || 'Stay updated on new deals and news.'
                        };
                    }

                case 'brandSection':
                    // Brand Section - brands are stored directly in section config
                    console.log('🔍 Brand Section detected:', {
                        sectionName: section.name,
                        sectionId: section._id,
                        hasConfig: !!section.config,
                        configKeys: section.config ? Object.keys(section.config) : [],
                        brandsInConfig: section.config?.brands ? section.config.brands.length : 0,
                        fullConfig: section.config
                    });
                    
                    const brands = section.config?.brands || [];
                    
                    if (brands.length === 0) {
                        console.warn('⚠️ Brand Section has no brands configured', {
                            sectionName: section.name,
                            config: section.config
                        });
                        return {
                            sectionId: section._id,
                            title: section.title || '',
                            subtitle: section.subtitle || '',
                            brands: []
                        };
                    }
                    
                    console.log(`✅ Found ${brands.length} brands in Brand Section config:`, brands);
                    
                    // Sort brands by order
                    const sortedBrands = brands.sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    const brandsData = sortedBrands.map(b => {
                        const logoUrl = b.imageUrl || '/images/placeholder-brand.jpg';
                        const link = b.link && b.link.trim() !== '' ? b.link : '#';
                        
                        let discountText = '';
                        if (b.discountText && b.discountText.trim() !== '') {
                            discountText = b.discountText.trim();
                        } else if (b.discount && b.discount > 0) {
                            discountText = `Flat ${b.discount}% OFF`;
                        } else {
                            discountText = 'Special Offer';
                        }
                        
                        return {
                            name: b.name,
                            imageUrl: logoUrl,
                            link: link,
                            discount: b.discount || 0,
                            discountText: discountText
                        };
                    });
                    
                    console.log(`✅ Loaded ${brandsData.length} brands from Brand Section config`);
                    console.log(`📦 Brand data being passed to template:`, brandsData.map(b => ({
                        name: b.name,
                        imageUrl: b.imageUrl,
                        link: b.link,
                        discount: b.discount,
                        discountText: b.discountText
                    })));
                    
                    return {
                        sectionId: section._id,
                        title: section.title || '',
                        subtitle: section.subtitle || '',
                        brands: brandsData
                    };

                default:
                    console.warn(`Unknown section type: ${section.type}`);
                    return null;
            }
        } catch (error) {
            console.error(`Error fetching data for section ${section.name}:`, error);
            return null;
        }
    }

    /**
     * Render a section with its data
     */
    async function renderSection(section) {
        if (!section.isActive || !section.isPublished) {
            console.log(`⏭️ Skipping section ${section.name}: isActive=${section.isActive}, isPublished=${section.isPublished}`);
            return null;
        }

        // Debug: Log section type and available mappings
        console.log(`🔍 Looking for template for section type: "${section.type}"`, {
            sectionName: section.name,
            sectionType: section.type,
            typeLength: section.type ? section.type.length : 0,
            availableTypes: Object.keys(SECTION_TEMPLATES),
            hasMapping: section.type in SECTION_TEMPLATES,
            mappingValue: SECTION_TEMPLATES[section.type]
        });
        
        // Debug: Log section type lookup
        console.log(`🔍 Template lookup for section type: "${section.type}"`, {
            sectionName: section.name,
            sectionType: section.type,
            typeInTemplates: section.type in SECTION_TEMPLATES,
            templateValue: SECTION_TEMPLATES[section.type],
            allTemplates: Object.keys(SECTION_TEMPLATES)
        });
        
        const templateName = SECTION_TEMPLATES[section.type];
        if (!templateName) {
            console.error(`❌ No template found for section type: "${section.type}"`, {
                availableTypes: Object.keys(SECTION_TEMPLATES),
                sectionType: section.type,
                sectionTypeValue: JSON.stringify(section.type),
                sectionTypeCharCodes: section.type ? Array.from(section.type).map(c => c.charCodeAt(0)) : [],
                templatesObject: SECTION_TEMPLATES
            });
            return null;
        }
        
        console.log(`✅ Template found: ${templateName} for section type: ${section.type}`);
        
        // Special logging for banner sections
        if (section.type === 'bannerFullWidth') {
            console.log(`🚩 BANNER: About to render ${section.name}`, {
                templateName: templateName,
                config: section.config
            });
        }

        // Special logging for brand sections
        if (section.type === 'brandSection') {
            console.log(`🏷️ BRAND SECTION: About to render ${section.name}`, {
                templateName: templateName,
                config: section.config,
                brandsCount: section.config?.brands?.length || 0
            });
        }

        // Special logging for video banner sections
        if (section.type === 'videoBanner') {
            console.log(`🎥 VIDEO BANNER: About to render ${section.name}`, {
                templateName: templateName,
                config: section.config,
                hasVideoUrl: !!section.config?.videoUrl,
                hasPosterImage: !!section.config?.posterImage,
                isActive: section.isActive,
                isPublished: section.isPublished
            });
        }

        console.log(`📄 Loading template: ${templateName} for section type: ${section.type}`);
        const template = await loadTemplate(templateName);
        if (!template) {
            console.error(`❌ Failed to load template: ${templateName}`);
            return null;
        }
        console.log(`✅ Template loaded: ${templateName}`);

        console.log(`📊 Fetching data for section: ${section.name}`);
        // Debug: Log section object to check for subtitle/description
        if (section.type === 'newArrivals') {
            console.log('🔍 New Arrivals Section Object:', {
                _id: section._id,
                name: section.name,
                title: section.title,
                subtitle: section.subtitle,
                description: section.description,
                hasSubtitle: !!section.subtitle,
                hasDescription: !!section.description
            });
        }
        const data = await fetchSectionData(section);
        if (!data) {
            console.warn(`⚠️ No data returned for section: ${section.name}`);
            return null;
        }
        console.log(`✅ Data fetched for section: ${section.name}`, data);

        console.log(`🎨 Rendering template with data...`);
        console.log(`📊 Data being passed to template:`, Object.keys(data), data);
        const html = renderTemplate(template, data);
        if (!html || html.trim().length === 0) {
            console.warn(`⚠️ Rendered HTML is empty for section: ${section.name}`);
            return null;
        }
        console.log(`✅ Template rendered successfully for section: ${section.name}`);
        console.log(`📝 Rendered HTML preview (first 200 chars):`, html.substring(0, 200));
        
        // Debug: Check if sectionType was rendered correctly
        
        return html;
    }

    /**
     * Sort sections by location
     */
    function sortSectionsByLocation(sections) {
        const sorted = [];
        const processed = new Set();
        const sectionMap = new Map(); // Map normalized section IDs to their index in sorted array
        
        // Helper function to normalize IDs for comparison (handle both string and ObjectId)
        const normalizeId = (id) => {
            if (!id) return null;
            return String(id);
        };

        // First, add sections with location 'top'
        sections.forEach(section => {
            const location = section.config && section.config.location;
            if (location === 'top') {
                sorted.push(section);
                processed.add(section._id);
                const normalizedId = normalizeId(section._id);
                if (normalizedId) {
                    sectionMap.set(normalizedId, sorted.length - 1);
                }
            }
        });

        // Add sections without location BEFORE processing "after-section" references
        // This ensures sections that are referenced by others are available
        // BUT: We should NOT add sections with 'after-section-*' locations here
        // IMPORTANT: Add sections that might be targets FIRST (those without location or with 'bottom')
        sections.forEach(section => {
            if (processed.has(section._id)) return;
            const location = section.config && section.config.location;
            // If no location specified OR location is 'bottom', add it now
            // This ensures sections that are targets for other sections are available
            // Skip sections with 'after-section-*' - those will be processed in next step
            if (!location || location === '' || location === 'bottom') {
                // Double-check it's not an 'after-section-*' location
                if (location && location.startsWith('after-section-')) {
                    // Skip - will be processed in next step
                    console.log(`⏳ Deferring section "${section.name}" (${section.type}) with location: ${location}`);
                    return;
                }
                sorted.push(section);
                processed.add(section._id);
                const normalizedId = normalizeId(section._id);
                if (normalizedId) {
                    sectionMap.set(normalizedId, sorted.length - 1);
                }
                console.log(`📍 Added section "${section.name}" (${section.type}) with location: ${location || 'none'}`);
            } else if (location && location.startsWith('after-section-')) {
                // Skip - will be processed in next step
                console.log(`⏳ Deferring section "${section.name}" (${section.type}) with location: ${location}`);
            }
        });

        // Then process sections with 'after-section-{id}' location
        let changed = true;
        let iterations = 0;
        const maxIterations = sections.length * 3; // Increased iterations for complex dependencies
        
        // Build a map of normalized IDs to sections for easier lookup
        const idToSectionMap = new Map();
        sections.forEach(section => {
            const normalizedId = normalizeId(section._id);
            if (normalizedId) {
                idToSectionMap.set(normalizedId, section);
            }
        });
        
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            
            sections.forEach(section => {
                if (processed.has(section._id)) return;

                const location = section.config && section.config.location;
                if (location && location.startsWith('after-section-')) {
                    const targetId = location.replace('after-section-', '');
                    const normalizedTargetId = normalizeId(targetId);
                    
                    // Try to find target by normalized ID
                    let targetIndex = -1;
                    for (let i = 0; i < sorted.length; i++) {
                        const normalizedId = normalizeId(sorted[i]._id);
                        if (normalizedId === normalizedTargetId) {
                            targetIndex = i;
                            break;
                        }
                    }
                    
                    if (targetIndex !== -1) {
                        // Insert after the target section
                        const targetSectionName = sorted[targetIndex].name;
                        sorted.splice(targetIndex + 1, 0, section);
                        processed.add(section._id);
                        
                        // Update all indices in the map
                        sectionMap.clear();
                        sorted.forEach((s, idx) => {
                            const normalizedId = normalizeId(s._id);
                            if (normalizedId) {
                                sectionMap.set(normalizedId, idx);
                            }
                        });
                        
                        changed = true;
                        console.log(`✅ Inserted "${section.name}" (${section.type}) after "${targetSectionName}" at index ${targetIndex + 1}`);
                    } else {
                        // Target not found yet - will try again in next iteration
                        const targetSection = idToSectionMap.get(normalizedTargetId);
                        if (targetSection) {
                            console.warn(`⚠️ Target section "${targetSection.name}" (${normalizedTargetId}) exists but not yet processed. Will retry.`);
                        } else {
                            console.warn(`⚠️ Target section not found for "${section.name}": ${normalizedTargetId} (location: ${location})`);
                        }
                    }
                }
            });
        }

        // Add remaining sections (with 'bottom' location or unprocessed) at the end
        // Note: Sections that are targets should have been added in the previous step
        sections.forEach(section => {
            if (!processed.has(section._id)) {
                const location = section.config && section.config.location;
                // If location is explicitly 'bottom' AND it's not a target, add at end
                if (location === 'bottom') {
                    sorted.push(section);
                    processed.add(section._id);
                    console.log(`📍 Added section "${section.name}" (${section.type}) at bottom (final step)`);
                } else if (location && location.startsWith('after-section-')) {
                    // This section couldn't find its target after all iterations
                    const targetId = location.replace('after-section-', '');
                    const normalizedTargetId = normalizeId(targetId);
                    
                    // Check if target exists in the sections array
                    const targetExists = sections.some(s => normalizeId(s._id) === normalizedTargetId);
                    if (targetExists) {
                        console.error(`❌ Section "${section.name}" (${section.type}) could not find target section with ID: ${normalizedTargetId} in sorted array. Target exists but wasn't processed correctly. Adding at end.`);
                    } else {
                        console.error(`❌ Section "${section.name}" (${section.type}) could not find target section with ID: ${normalizedTargetId}. Target section does not exist. Adding at end.`);
                    }
                    sorted.push(section);
                    processed.add(section._id);
                } else {
                    // This shouldn't happen, but log it for debugging
                    console.warn(`⚠️ Section "${section.name}" (${section.type}) not processed. Location: ${location || 'none'}. Adding at end.`);
                    // Add it anyway to prevent losing sections
                    sorted.push(section);
                    processed.add(section._id);
                }
            }
        });

        console.log('📐 Location sorting result:', sorted.map(s => ({
            name: s.name,
            type: s.type,
            location: s.config?.location || 'none',
            id: normalizeId(s._id)
        })));
        
        // Log any sections that weren't processed
        const unprocessed = sections.filter(s => !processed.has(s._id));
        if (unprocessed.length > 0) {
            console.warn('⚠️ Unprocessed sections:', unprocessed.map(s => ({
                name: s.name,
                type: s.type,
                location: s.config?.location || 'none',
                id: normalizeId(s._id)
            })));
        }

        return sorted;
    }

    /**
     * Initialize sliders
     */
    function initSliders() {
        // Hero sliders
        document.querySelectorAll('.hero-slider').forEach(slider => {
            const container = slider.querySelector('.hero-slider-container');
            const slides = container.querySelectorAll('.hero-slide');
            const dots = slider.querySelectorAll('.hero-slider-dot');
            const prevBtn = slider.querySelector('.hero-slider-arrow.prev');
            const nextBtn = slider.querySelector('.hero-slider-arrow.next');
            const sectionId = slider.dataset.sectionId;
            let currentSlide = 0;
            let autoplayInterval = null;

            function goToSlide(index) {
                currentSlide = index;
                container.style.transform = `translateX(-${currentSlide * 100}%)`;
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentSlide);
                });
            }

            function nextSlide() {
                currentSlide = (currentSlide + 1) % slides.length;
                goToSlide(currentSlide);
            }

            function startAutoplay() {
                // Stop any existing autoplay first
                stopAutoplay();
                
                // Get autoplay config from data attribute or default to true
                const autoplayAttr = slider.getAttribute('data-autoplay');
                const autoplayEnabled = autoplayAttr === null || autoplayAttr === 'true' || autoplayAttr === '';
                const autoplaySpeed = parseInt(slider.getAttribute('data-autoplay-interval')) || 3000;
                
                if (autoplayEnabled && slides.length > 1) {
                    console.log(`🎠 Starting autoplay for slider ${sectionId} with interval ${autoplaySpeed}ms (${slides.length} slides)`);
                    autoplayInterval = setInterval(() => {
                        nextSlide();
                    }, autoplaySpeed);
                } else {
                    console.log(`⏸️ Autoplay disabled or only 1 slide for slider ${sectionId} (enabled: ${autoplayEnabled}, slides: ${slides.length})`);
                }
            }

            function stopAutoplay() {
                if (autoplayInterval) {
                    clearInterval(autoplayInterval);
                    autoplayInterval = null;
                }
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    stopAutoplay();
                    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                    goToSlide(currentSlide);
                    startAutoplay();
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    stopAutoplay();
                    nextSlide();
                    startAutoplay();
                });
            }

            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    stopAutoplay();
                    goToSlide(index);
                    startAutoplay();
                });
            });

            startAutoplay();
        });

        // Product carousels with auto-slide
        document.querySelectorAll('.product-carousel').forEach(carousel => {
            const container = carousel.querySelector('.product-carousel-container');
            const prevBtn = carousel.querySelector('.carousel-arrow.prev');
            const nextBtn = carousel.querySelector('.carousel-arrow.next');
            let autoSlideInterval = null;
            const autoSlideSpeed = 3000; // 3 seconds

            function scrollNext() {
                const scrollAmount = container.offsetWidth * 0.8;
                const maxScroll = container.scrollWidth - container.offsetWidth;
                
                if (container.scrollLeft >= maxScroll - 10) {
                    container.scrollTo({ left: 0, behavior: 'auto' });
                } else {
                    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            }

            function startAutoSlide() {
                stopAutoSlide();
                if (container.scrollWidth > container.offsetWidth) {
                    autoSlideInterval = setInterval(scrollNext, autoSlideSpeed);
                }
            }

            function stopAutoSlide() {
                if (autoSlideInterval) {
                    clearInterval(autoSlideInterval);
                    autoSlideInterval = null;
                }
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    stopAutoSlide();
                    container.scrollBy({ left: -container.offsetWidth * 0.8, behavior: 'smooth' });
                    startAutoSlide();
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    stopAutoSlide();
                    scrollNext();
                    startAutoSlide();
                });
            }

            carousel.addEventListener('mouseenter', stopAutoSlide);
            carousel.addEventListener('mouseleave', startAutoSlide);

            startAutoSlide();
        });
    }

    /**
     * Load and render all homepage sections
     */
    async function loadAndRenderHomepageSections() {
        console.log('🚀 loadAndRenderHomepageSections CALLED!');
        try {
            console.log('🔄 Starting to load homepage sections...');
            const container = document.getElementById('homepage-sections');
            console.log('🔍 Container element:', container);
            if (!container) {
                console.error('❌ Homepage sections container (#homepage-sections) not found in DOM');
                return;
            }
            console.log('✅ Container found:', container);

            // Fetch sections from API (public endpoint - no auth required)
            console.log('📡 Fetching sections from API: /api/homepage-sections/public');
            const response = await fetch('/api/homepage-sections/public');
            console.log('📡 API Response status:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`Failed to fetch homepage sections: ${response.status} ${response.statusText}`);
            }

            const sections = await response.json();
            console.log(`✅ Loaded ${sections.length} sections from API`);
            console.log('📋 All sections:', JSON.stringify(sections, null, 2));
            
            // Check specifically for banner sections
            const bannerSections = sections.filter(s => s.type === 'bannerFullWidth');
            console.log(`🚩 Found ${bannerSections.length} banner sections:`, bannerSections);
            
            if (!Array.isArray(sections) || sections.length === 0) {
                console.warn('⚠️ No sections found or sections is not an array');
                return;
            }

            // Filter active and published sections
            const activeSections = sections.filter(s => s.isActive && s.isPublished);
            console.log(`📋 Found ${activeSections.length} active and published sections`);

            if (activeSections.length === 0) {
                console.warn('⚠️ No active and published sections found');
                return;
            }
            
            // Sort sections by location
            console.log('🔍 Before sorting - All active sections:', activeSections.map(s => ({ 
                name: s.name, 
                type: s.type, 
                location: s.config?.location || 'none',
                id: String(s._id),
                hasConfig: !!s.config
            })));
            
            // Specifically check video banner location
            const videoBannerSection = activeSections.find(s => s.type === 'videoBanner');
            if (videoBannerSection) {
                console.log('🎥 Video Banner Section Details:', {
                    name: videoBannerSection.name,
                    id: String(videoBannerSection._id),
                    location: videoBannerSection.config?.location || 'none',
                    fullConfig: videoBannerSection.config
                });
                
                // Check if target section exists
                if (videoBannerSection.config?.location && videoBannerSection.config.location.startsWith('after-section-')) {
                    const targetId = videoBannerSection.config.location.replace('after-section-', '');
                    const targetSection = activeSections.find(s => String(s._id) === targetId);
                    if (targetSection) {
                        console.log('✅ Target section found:', {
                            name: targetSection.name,
                            type: targetSection.type,
                            id: String(targetSection._id)
                        });
                    } else {
                        console.error('❌ Target section NOT found for video banner. Looking for ID:', targetId);
                        console.log('Available section IDs:', activeSections.map(s => ({ name: s.name, id: String(s._id) })));
                    }
                }
            }
            
            const sortedSections = sortSectionsByLocation(activeSections);
            console.log('📐 After sorting - Sorted sections:', sortedSections.map(s => ({ 
                name: s.name, 
                type: s.type, 
                location: s.config?.location || 'none',
                id: String(s._id)
            })));

            // Render each section
            let renderedCount = 0;
            for (const section of sortedSections) {
                console.log(`🎨 Rendering section: ${section.name} (${section.type})`, {
                    id: section._id,
                    type: section.type,
                    isActive: section.isActive,
                    isPublished: section.isPublished,
                    config: section.config
                });
                
                // Special logging for banner sections
                if (section.type === 'bannerFullWidth') {
                    console.log(`🚩 BANNER SECTION DETECTED: ${section.name}`, {
                        config: section.config,
                        imageUrl: section.config?.imageUrl,
                        hasImageUrl: !!section.config?.imageUrl
                    });
                }
                
                // Special logging for video banner sections
                if (section.type === 'videoBanner') {
                    console.log(`🎥 VIDEO BANNER SECTION DETECTED: ${section.name}`, {
                        config: section.config,
                        videoUrl: section.config?.videoUrl,
                        hasVideoUrl: !!section.config?.videoUrl,
                        hasPosterImage: !!section.config?.posterImage,
                        videoType: section.config?.videoType,
                        location: section.config?.location
                    });
                }
                
                try {
                    const html = await renderSection(section);
                    if (html) {
                        console.log(`🔍 HTML for ${section.name} (first 300 chars):`, html.substring(0, 300));
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html;
                        console.log(`🔍 tempDiv children count:`, tempDiv.children.length);
                        const sectionElement = tempDiv.firstElementChild;
                        console.log(`🔍 sectionElement found:`, sectionElement ? 'YES' : 'NO', sectionElement ? sectionElement.tagName : 'N/A');
                        if (sectionElement) {
                            // Store section config for slider autoplay
                            if (section.type === 'heroSlider' && section.config) {
                                sectionElement.setAttribute('data-autoplay', section.config.autoplay !== false ? 'true' : 'false');
                                sectionElement.setAttribute('data-autoplay-interval', section.config.autoplayInterval || 3000);
                            }
                            
                            // Handle brand marquee vs brand grid display
                            
                            // Apply custom dimensions to banner images if specified
                            if (section.type === 'bannerFullWidth') {
                                const bannerImg = sectionElement.querySelector('img');
                                if (bannerImg) {
                                    // Check if image URL is valid
                                    const imageUrl = bannerImg.getAttribute('src');
                                    console.log(`🖼️ Banner image URL from DOM:`, imageUrl);
                                    
                                    if (!imageUrl || imageUrl === '' || imageUrl === 'null' || imageUrl === 'undefined') {
                                        console.warn(`⚠️ Banner image URL is empty for section: ${section.name}`);
                                        sectionElement.style.display = 'none';
                                    } else {
                                        // Add link if specified
                                        if (section.config && section.config.link && section.config.link.trim() !== '') {
                                            const link = document.createElement('a');
                                            link.href = section.config.link;
                                            link.setAttribute('aria-label', 'Banner link');
                                            bannerImg.parentNode.insertBefore(link, bannerImg);
                                            link.appendChild(bannerImg);
                                        }
                                        
                                        // Ensure banner is visible
                                        sectionElement.style.display = 'block';
                                        sectionElement.style.visibility = 'visible';
                                        sectionElement.style.opacity = '1';
                                        
                                        // Apply custom dimensions if sizing mode is 'custom'
                                        const sizingMode = section.config.sizingMode || 'auto';
                                        if (sizingMode === 'custom') {
                                            const customWidth = sectionElement.getAttribute('data-custom-width');
                                            const customHeight = sectionElement.getAttribute('data-custom-height');
                                            const mobileHeight = sectionElement.getAttribute('data-mobile-height');
                                            const tabletHeight = sectionElement.getAttribute('data-tablet-height');
                                            const desktopHeight = sectionElement.getAttribute('data-desktop-height');
                                            
                                            // Apply custom width (if specified, otherwise 100%)
                                            if (customWidth && customWidth !== 'null' && customWidth !== 'undefined' && customWidth !== '') {
                                                sectionElement.style.maxWidth = customWidth + 'px';
                                                sectionElement.style.margin = '0 auto';
                                            }
                                            
                                            // Apply responsive heights using CSS custom properties
                                            if (mobileHeight && mobileHeight !== 'null' && mobileHeight !== 'undefined' && mobileHeight !== '') {
                                                sectionElement.style.setProperty('--banner-height-mobile', mobileHeight + 'px');
                                            }
                                            if (tabletHeight && tabletHeight !== 'null' && tabletHeight !== 'undefined' && tabletHeight !== '') {
                                                sectionElement.style.setProperty('--banner-height-tablet', tabletHeight + 'px');
                                            }
                                            if (desktopHeight && desktopHeight !== 'null' && desktopHeight !== 'undefined' && desktopHeight !== '') {
                                                sectionElement.style.setProperty('--banner-height-desktop', desktopHeight + 'px');
                                            }
                                            
                                            // Apply default custom height if no responsive heights specified
                                            if (customHeight && customHeight !== 'null' && customHeight !== 'undefined' && customHeight !== '') {
                                                bannerImg.style.height = customHeight + 'px';
                                                bannerImg.style.objectFit = 'cover';
                                            }
                                            
                                            // Add custom-size class for CSS targeting
                                            sectionElement.classList.add('custom-size');
                                        }
                                        
                                        // Ensure image is visible
                                        bannerImg.style.display = 'block';
                                        bannerImg.style.width = '100%';
                                        bannerImg.style.visibility = 'visible';
                                        bannerImg.style.opacity = '1';
                                        
                                        // Handle image load error
                                        bannerImg.onerror = function() {
                                            console.error(`❌ Failed to load banner image: ${imageUrl}`);
                                            sectionElement.style.display = 'none';
                                        };
                                        
                                        // Log successful image load
                                        bannerImg.onload = function() {
                                            console.log(`✅ Banner image loaded successfully: ${imageUrl}`);
                                        };
                                    }
                                } else {
                                    console.error(`❌ No img element found in banner section: ${section.name}`);
                                    console.error(`❌ Banner HTML:`, sectionElement.innerHTML);
                                    sectionElement.style.display = 'none';
                                }
                            }
                            
                            // Apply newsletter colors from config to avoid inline templated styles
                            if (section.type === 'newsletterSocial') {
                                const bg = (section.config && section.config.backgroundColor) || '#c42525';
                                const fg = (section.config && section.config.textColor) || '#ffffff';
                                sectionElement.style.backgroundColor = bg;
                                sectionElement.style.color = fg;
                            }
                            
                            container.appendChild(sectionElement);
                            renderedCount++;
                            console.log(`✅ Successfully rendered section: ${section.name}`);
                        } else {
                            console.warn(`⚠️ No element found in rendered HTML for section: ${section.name}`);
                        }
                    } else {
                        console.warn(`⚠️ No HTML returned for section: ${section.name} (${section.type})`);
                    }
                } catch (sectionError) {
                    console.error(`❌ Error rendering section ${section.name}:`, sectionError);
                }
            }

            console.log(`✅ Successfully rendered ${renderedCount} sections`);

            // Initialize sliders after rendering
            if (renderedCount > 0) {
                initSliders();
                console.log('✅ Sliders initialized');
            }

        } catch (error) {
            console.error('❌ Error loading homepage sections:', error);
            console.error('Error stack:', error.stack);
        }
    }

    // Export function to global scope immediately
    window.loadAndRenderHomepageSections = loadAndRenderHomepageSections;
    console.log('✅ home.js loaded - loadAndRenderHomepageSections function exported');
    console.log('🔍 Script version: v21');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 DOM ready state:', document.readyState);

    // Auto-load when DOM is ready
    if (document.readyState === 'loading') {
        console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ DOMContentLoaded fired, calling loadAndRenderHomepageSections');
            setTimeout(() => loadAndRenderHomepageSections(), 100);
        });
    } else {
        console.log('✅ DOM already ready, calling loadAndRenderHomepageSections immediately');
        setTimeout(() => loadAndRenderHomepageSections(), 100);
    }

    // Newsletter form handler
    window.handleNewsletterSubmit = function(event) {
        event.preventDefault();
        const email = event.target.querySelector('input[type="email"]').value;
        // TODO: Implement newsletter subscription API call
        console.log('Newsletter subscription:', email);
        alert('Thank you for subscribing!');
        event.target.reset();
    };

    // Add to cart handler (placeholder)
    window.addToCart = function(productId) {
        // TODO: Implement add to cart functionality
        console.log('Add to cart:', productId);
        alert('Product added to cart!');
    };

})();
