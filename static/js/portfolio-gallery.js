document.addEventListener('DOMContentLoaded', function() {
    // Simple array of gallery images with display names
    const galleryImages = [
        { src: 'about1.jpg', title: 'Commercial Sign Installation' },
        { src: 'about2.jpg', title: 'Retail Storefront Signage' },
        { src: 'about3.jpg', title: 'LED Channel Letters' },
        { src: 'about4.jpg', title: 'Monument Sign Design' },
        { src: 'about5.jpg', title: 'Illuminated Building Signs' },
        { src: 'about6.jpg', title: 'Restaurant Exterior Signage' },
        { src: 'about10.jpg', title: 'Mall Directory Kiosk' },
        { src: 'about15.jpg', title: 'Vehicle Graphics Installation' },
        { src: 'about17.jpg', title: 'Food Truck Branding' },
        { src: 'about22.jpg', title: 'Cuban Restaurant Sign' },
        { src: 'about31.jpg', title: 'Office Building Signage' },
        { src: 'about32.jpg', title: 'Corporate Identity Signage' },
        { src: 'about34.jpg', title: 'Retail Store Branding' },
        { src: 'about36.jpg', title: 'Wine Store Custom Sign' },
        { src: 'about38.jpg', title: 'Hotel Entrance Signage' },
        { src: 'about39.jpg', title: 'Design Process Documentation' },
        { src: 'about41.jpg', title: 'Business Center Monument' },
        { src: 'about42.jpg', title: 'Seafood Restaurant Signage' }
    ];

    // Initialize the gallery
    initializeGallery();

    // Handle portfolio filtering
    initializeFiltering();

    // Initialize card click handlers
    initializeCardGallery();

    /**
     * Initialize the main gallery
     */
    function initializeGallery() {
        console.log('Initializing gallery...');
        const galleryContainer = document.querySelector('.project-gallery');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');

        if (!galleryContainer) {
            console.error('Gallery container not found! Selector: .project-gallery');
            // Try to find container with any alternative selectors
            const alternativeContainer = document.querySelector('[class*="gallery"]');
            if (alternativeContainer) {
                console.log('Found alternative gallery container:', alternativeContainer);
            }
            return;
        }

        console.log('Gallery container found:', galleryContainer);

        // Force horizontal layout with inline styles to overcome any CSS conflicts
        galleryContainer.style.display = 'flex';
        galleryContainer.style.flexDirection = 'row';
        galleryContainer.style.flexWrap = 'nowrap';
        galleryContainer.style.overflowX = 'auto';
        galleryContainer.style.width = '100%';
        galleryContainer.style.padding = '20px';
        
        // Check computed style to verify flex direction
        const computedStyle = window.getComputedStyle(galleryContainer);
        console.log('Gallery flex direction:', computedStyle.flexDirection);
        console.log('Gallery display:', computedStyle.display);
        console.log('Gallery overflow-x:', computedStyle.overflowX);
        
        // Clear and populate gallery
        galleryContainer.innerHTML = '';
        
        // Create gallery items
        galleryImages.forEach((image, index) => {
            console.log(`Creating gallery item for image: ${image.src}`);
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.setAttribute('data-index', index);
            
            // Force item to stay as flex item with inline styles
            item.style.flex = '0 0 auto';
            item.style.minWidth = '280px';
            item.style.height = '350px';
            item.style.marginRight = '20px';
            
            // Correct image path based on file structure inspection
            // We found that images are directly in the images folder
            const img = document.createElement('img');
            img.alt = image.title;
            img.loading = 'lazy';
            
            // Set the correct path based on our file structure inspection
            img.src = `images/${image.src}`;
            console.log(`Loading image from path: ${img.src}`);
            
            // Handle loading error with fallback
            img.onerror = function() {
                console.error(`Failed to load image: ${image.src}`);
                img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22288%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20288%20225%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_189b3ff3108%20text%20%7B%20fill%3A%23eceeef%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A14pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_189b3ff3108%22%3E%3Crect%20width%3D%22288%22%20height%3D%22225%22%20fill%3D%22%2355595c%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2296.83333206176758%22%20y%3D%22118.83333320617676%22%3ESign%20Project%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
                img.classList.add('placeholder-img');
            };

            // Create caption
            const caption = document.createElement('div');
            caption.className = 'gallery-caption';
            caption.textContent = image.title;
            caption.style.opacity = '1'; // Make caption always visible for clarity
            
            // Add click handler for lightbox
            item.addEventListener('click', function() {
                openLightbox(index);
            });
            
            // Add to gallery
            item.appendChild(img);
            item.appendChild(caption);
            galleryContainer.appendChild(item);
        });

        console.log(`Added ${galleryImages.length} items to gallery`);
        
        // Ensure scrolling is visible by applying scroll indicator
        // (usually appears in Chrome/Firefox but not all browsers)
        galleryContainer.classList.add('scrollable-indicator');
        
        // Check gallery content width to ensure it's scrollable
        setTimeout(() => {
            const totalItemsWidth = galleryImages.length * 300; // approx width with margins
            console.log(`Total gallery content width should be around: ${totalItemsWidth}px`);
            console.log(`Gallery container width: ${galleryContainer.clientWidth}px`);
            console.log(`Gallery scroll width: ${galleryContainer.scrollWidth}px`);
            
            // If scroll width is not greater than client width, something's wrong
            if (galleryContainer.scrollWidth <= galleryContainer.clientWidth && galleryImages.length > 3) {
                console.warn('Gallery may not be scrollable! Forcing inline layout...');
                
                // Force inline layout with a wrapper div
                const wrapper = document.createElement('div');
                wrapper.style.display = 'inline-flex';
                wrapper.style.width = 'max-content';
                
                // Move all items to the wrapper
                while (galleryContainer.firstChild) {
                    wrapper.appendChild(galleryContainer.firstChild);
                }
                
                // Add wrapper to container
                galleryContainer.appendChild(wrapper);
            }
        }, 1000);

        // Navigation handlers
        if (prevBtn && nextBtn) {
            console.log('Setting up navigation buttons');
            // Previous button handler
            prevBtn.addEventListener('click', function(e) {
                e.preventDefault();
                galleryContainer.scrollBy({
                    left: -galleryContainer.offsetWidth / 2,
                    behavior: 'smooth'
                });
                console.log('Clicked prev button, scrolling left');
            });

            // Next button handler
            nextBtn.addEventListener('click', function(e) {
                e.preventDefault();
                galleryContainer.scrollBy({
                    left: galleryContainer.offsetWidth / 2,
                    behavior: 'smooth'
                });
                console.log('Clicked next button, scrolling right');
            });
        } else {
            console.error('Navigation buttons not found!');
        }

        // Handle touch swipe
        let touchStartX = 0;
        let touchEndX = 0;
        
        galleryContainer.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        galleryContainer.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchStartX - touchEndX;
            
            if (Math.abs(swipeDistance) > 50) { // Minimum swipe distance
                if (swipeDistance > 0) {
                    // Swipe left, show next
                    nextBtn.click();
                } else {
                    // Swipe right, show previous
                    prevBtn.click();
                }
            }
        }, { passive: true });
    }

    /**
     * Create fallback content if images fail to load
     */
    function addFallbackGalleryContent(container) {
        for (let i = 0; i < 6; i++) {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            // Create placeholder image
            const placeholderColor = ['#f44336', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#607D8B'][i % 6];
            const placeholderSvg = `
                <svg width="280" height="350" xmlns="http://www.w3.org/2000/svg">
                    <rect width="280" height="350" fill="${placeholderColor}" />
                    <text x="50%" y="50%" font-family="Arial" font-size="18" fill="white" text-anchor="middle">
                        Sign Project ${i+1}
                    </text>
                </svg>
            `;
            
            // Create image element with SVG data URL
            const img = document.createElement('img');
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(placeholderSvg);
            img.alt = `Example Sign Project ${i+1}`;
            
            // Create caption
            const caption = document.createElement('div');
            caption.className = 'gallery-caption';
            caption.textContent = `Example Project ${i+1}`;
            caption.style.opacity = '1'; // Make caption visible
            
            // Add to container
            item.appendChild(img);
            item.appendChild(caption);
            container.appendChild(item);
        }
        
        console.log('Added fallback content to gallery');
    }

    /**
     * Lightbox functionality
     */
    function createLightbox() {
        // Check if lightbox already exists
        if (document.getElementById('portfolio-lightbox')) {
            return document.getElementById('portfolio-lightbox');
        }
        
        // Create lightbox elements
        const lightbox = document.createElement('div');
        lightbox.id = 'portfolio-lightbox';
        lightbox.className = 'portfolio-lightbox';
        
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close">&times;</button>
                <button class="lightbox-prev">&lt;</button>
                <button class="lightbox-next">&gt;</button>
                <div class="lightbox-image-container">
                    <img src="" class="lightbox-image" alt="">
                </div>
                <div class="lightbox-caption"></div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(lightbox);
        
        // Add event listeners
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        
        closeBtn.addEventListener('click', closeLightbox);
        prevBtn.addEventListener('click', showPrevImage);
        nextBtn.addEventListener('click', showNextImage);
        
        // Close when clicking outside the image
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
        
        return lightbox;
    }
    
    let currentLightboxIndex = 0;
    
    function openLightbox(index) {
        console.log(`Opening lightbox for image index: ${index}`);
        // Make sure lightbox exists
        const lightbox = createLightbox();
        
        // Update current index
        currentLightboxIndex = index;
        
        // Get image data
        const imageData = galleryImages[index];
        if (!imageData) {
            console.error('No image data found for index:', index);
            return;
        }
        
        console.log(`Loading image: ${imageData.src}`);
        
        // Get elements
        const image = lightbox.querySelector('.lightbox-image');
        const caption = lightbox.querySelector('.lightbox-caption');
        
        // Try to find a successful image path from the gallery
        const galleryItem = document.querySelector(`.gallery-item[data-index="${index}"] img`);
        if (galleryItem && !galleryItem.classList.contains('placeholder-img')) {
            // Use the already loaded image's src if it's not a placeholder
            image.src = galleryItem.src;
            console.log(`Using already loaded image src: ${image.src}`);
        } else {
            // Set the correct path based on our file structure inspection
            image.src = `images/${imageData.src}`;
            console.log(`Setting image src to: ${image.src}`);
            
            // Handle loading error
            image.onerror = function() {
                console.error(`Failed to load image in lightbox: ${imageData.src}`);
                image.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_189b3ff3108%20text%20%7B%20fill%3A%23ffffff%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A40pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_189b3ff3108%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23373940%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22289.71875%22%20y%3D%22317.75%22%3EImage%20Not%20Available%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
            };
        }
        
        // Update caption
        caption.textContent = imageData.title;
        console.log(`Set caption to: ${imageData.title}`);
        
        // Update navigation buttons
        updateLightboxNav();
        
        // Reset pointer-events and ensure lightbox is visible
        lightbox.style.pointerEvents = 'all';
        
        // Show lightbox - ensure it gets displayed
        lightbox.style.display = 'flex';
        console.log('Lightbox display set to flex');
        
        setTimeout(() => {
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('Lightbox activated');
        }, 10);
    }
    
    function closeLightbox() {
        console.log('Closing lightbox');
        const lightbox = document.getElementById('portfolio-lightbox');
        if (!lightbox) {
            console.error('No lightbox found to close');
            return;
        }
        
        // Remove active class first (for animation)
        lightbox.classList.remove('active');
        console.log('Removed active class from lightbox');
        
        // After animation completes, reset other properties
        setTimeout(() => {
            document.body.style.overflow = '';
            // Don't remove from DOM, just hide it
            lightbox.style.display = 'none';
            lightbox.style.pointerEvents = 'none';
            console.log('Lightbox hidden');
        }, 300); // Match transition duration in CSS
    }
    
    function showPrevImage() {
        if (currentLightboxIndex > 0) {
            openLightbox(currentLightboxIndex - 1);
        }
    }
    
    function showNextImage() {
        if (currentLightboxIndex < galleryImages.length - 1) {
            openLightbox(currentLightboxIndex + 1);
        }
    }
    
    function updateLightboxNav() {
        const lightbox = document.getElementById('portfolio-lightbox');
        if (!lightbox) return;
        
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        
        prevBtn.style.visibility = currentLightboxIndex > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = currentLightboxIndex < galleryImages.length - 1 ? 'visible' : 'hidden';
    }

    /**
     * Portfolio filtering functionality
     */
    function initializeFiltering() {
        const filterButtons = document.querySelectorAll('[data-filter]');
        const portfolioCards = document.querySelectorAll('.portfolio-card');
        
        if (!filterButtons.length || !portfolioCards.length) return;
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                
                // Filter the cards
                portfolioCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category') || '';
                    
                    if (filter === 'all' || cardCategory.includes(filter)) {
                        card.style.display = 'block';
                        setTimeout(() => {
                            card.style.opacity = '1';
                        }, 50);
                    } else {
                        card.style.opacity = '0';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 500);
                    }
                });
            });
        });
    }

    /**
     * Handle portfolio card clicks
     */
    function initializeCardGallery() {
        const cards = document.querySelectorAll('.portfolio-card');
        
        cards.forEach(card => {
            card.addEventListener('click', function() {
                const img = this.querySelector('.card-img-top');
                const title = this.querySelector('.card-title');
                
                if (img && title) {
                    // Create a temporary object similar to our gallery images
                    const tempImageData = {
                        src: img.src,
                        title: title.textContent
                    };
                    
                    // Find if this image exists in our gallery
                    const galleryIndex = galleryImages.findIndex(image => 
                        img.src.includes(image.src) || image.title === title.textContent
                    );
                    
                    if (galleryIndex !== -1) {
                        openLightbox(galleryIndex);
                    } else {
                        // Add to the gallery array temporarily
                        galleryImages.push(tempImageData);
                        openLightbox(galleryImages.length - 1);
                    }
                }
            });
        });
    }

    // Set up keyboard navigation - attaching to document to ensure it works no matter when lightbox is created
    document.addEventListener('keydown', function(e) {
        const lightbox = document.getElementById('portfolio-lightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            showPrevImage();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        }
    });
}); 