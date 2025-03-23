/**
 * Portfolio Gallery Slider
 * Handles the functionality of the project gallery slider on the portfolio page
 */

document.addEventListener('DOMContentLoaded', function() {
    initProjectGallery();
});

function initProjectGallery() {
    const galleryContainer = document.querySelector('.project-gallery');
    const prevBtn = document.querySelector('.gallery-nav.prev-btn');
    const nextBtn = document.querySelector('.gallery-nav.next-btn');
    
    if (!galleryContainer) return;
    
    // Gallery images - add all project images here
    const galleryImages = [
        { src: 'images/about11.jpg', alt: 'Sign Project 1', title: 'Channel Letter Installation' },
        { src: 'images/about12.jpg', alt: 'Sign Project 2', title: 'LED Sign Conversion' },
        { src: 'images/about13.jpg', alt: 'Sign Project 3', title: 'Monument Sign' },
        { src: 'images/about14.jpg', alt: 'Sign Project 4', title: 'Storefront Signage' },
        { src: 'images/about15.jpg', alt: 'Sign Project 5', title: 'Window Graphics' },
        { src: 'images/about16.jpg', alt: 'Sign Project 6', title: 'Dimensional Letters' },
        { src: 'images/about17.jpg', alt: 'Sign Project 7', title: 'Vehicle Graphics' },
        { src: 'images/about21.jpg', alt: 'Sign Project 8', title: 'ADA Compliant Signs' },
        { src: 'images/about22.jpg', alt: 'Sign Project 9', title: 'Restaurant Signage' },
        { src: 'images/about31.jpg', alt: 'Sign Project 10', title: 'Corporate Signage' },
        { src: 'images/about32.jpg', alt: 'Sign Project 11', title: 'Office Building Sign' },
        { src: 'images/about33.jpg', alt: 'Sign Project 12', title: 'Directory Signs' }
    ];
    
    // Create gallery items with animation delay
    galleryImages.forEach((image, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.style.setProperty('--item-index', index);
        galleryItem.innerHTML = `
            <img src="${image.src}" alt="${image.alt}" class="gallery-img">
            <div class="gallery-item-caption">
                <h5>${image.title}</h5>
            </div>
        `;
        galleryContainer.appendChild(galleryItem);
    });
    
    // Add animation to newly loaded items
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    // Animate items once page has loaded
    setTimeout(() => {
        galleryItems.forEach(item => {
            item.classList.add('animate-visible');
        });
    }, 300);
    
    // Handle navigation functionality
    let scrollAmount = 0;
    const itemWidth = 300; // Width of each gallery item including margin
    
    // Show/hide navigation buttons based on scroll position
    function updateNavVisibility() {
        prevBtn.style.display = scrollAmount <= 0 ? 'none' : 'flex';
        nextBtn.style.display = scrollAmount >= galleryContainer.scrollWidth - galleryContainer.clientWidth ? 'none' : 'flex';
    }
    
    // Initial visibility check
    updateNavVisibility();
    
    // Handle previous button click
    prevBtn.addEventListener('click', function() {
        scrollAmount = Math.max(scrollAmount - itemWidth * 2, 0);
        galleryContainer.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateNavVisibility, 400);
    });
    
    // Handle next button click
    nextBtn.addEventListener('click', function() {
        scrollAmount = Math.min(scrollAmount + itemWidth * 2, galleryContainer.scrollWidth - galleryContainer.clientWidth);
        galleryContainer.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateNavVisibility, 400);
    });
    
    // Handle scroll event to update navigation visibility
    galleryContainer.addEventListener('scroll', function() {
        scrollAmount = galleryContainer.scrollLeft;
        updateNavVisibility();
    });
    
    // Add lightbox functionality
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            const imgSrc = this.querySelector('img').getAttribute('src');
            const imgAlt = this.querySelector('img').getAttribute('alt');
            const imgTitle = this.querySelector('h5').textContent;
            
            // Create lightbox elements
            const lightbox = document.createElement('div');
            lightbox.className = 'gallery-lightbox';
            
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <button class="lightbox-close">&times;</button>
                    <img src="${imgSrc}" alt="${imgAlt}" class="animate-on-scroll animate-visible">
                    <div class="lightbox-caption">
                        <h5>${imgTitle}</h5>
                    </div>
                </div>
            `;
            
            document.body.appendChild(lightbox);
            
            // Animate lightbox entrance
            setTimeout(() => {
                lightbox.style.opacity = "1";
            }, 10);
            
            // Prevent page scrolling when lightbox is open
            document.body.style.overflow = 'hidden';
            
            // Handle close button click
            lightbox.querySelector('.lightbox-close').addEventListener('click', function() {
                lightbox.style.opacity = "0";
                setTimeout(() => {
                    document.body.removeChild(lightbox);
                    document.body.style.overflow = '';
                }, 300);
            });
            
            // Close lightbox when clicking outside the image
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    lightbox.style.opacity = "0";
                    setTimeout(() => {
                        document.body.removeChild(lightbox);
                        document.body.style.overflow = '';
                    }, 300);
                }
            });
        });
    });
} 