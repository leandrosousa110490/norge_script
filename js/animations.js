/**
 * Florida Sign Solution - Page Animations
 * Handles dynamic loading, page transitions, and animations
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initPreloader();
    initPageTransitions();
    initScrollAnimations();
    initContentReveal();
});

/**
 * Initialize page preloader
 */
function initPreloader() {
    const preloader = document.createElement('div');
    preloader.className = 'page-preloader';
    preloader.innerHTML = `
        <div class="preloader-content">
            <img src="images/logo.png" alt="Florida Sign Solution Logo" class="preloader-logo">
            <div class="preloader-spinner"></div>
        </div>
    `;
    document.body.appendChild(preloader);
    
    // Show preloader
    document.body.classList.add('loading');
    
    // Hide preloader once page is loaded
    window.addEventListener('load', function() {
        setTimeout(function() {
            document.body.classList.remove('loading');
            setTimeout(function() {
                preloader.remove();
            }, 500);
        }, 500);
    });
}

/**
 * Initialize page transitions
 */
function initPageTransitions() {
    // Add page transition overlay with transparent background
    const transitionOverlay = document.createElement('div');
    transitionOverlay.className = 'page-transition-overlay';
    document.body.appendChild(transitionOverlay);
    
    // Add entrance animation class when page loads
    setTimeout(function() {
        document.body.classList.add('page-loaded');
    }, 100);
    
    // We're not using the slide-in page transition anymore,
    // so we'll just use standard browser navigation for links
}

/**
 * Initialize scroll-based animations
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.card, .service-card, .portfolio-card, .gallery-item, .about-content, .cta-section, .section-header, h2, .info-box, .accordion-item');
    
    // Set initial states
    animatedElements.forEach(function(element) {
        element.classList.add('animate-on-scroll');
    });
    
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        
        animatedElements.forEach(function(element) {
            observer.observe(element);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        animatedElements.forEach(function(element) {
            element.classList.add('animate-visible');
        });
    }
}

/**
 * Initialize content reveal animations for page sections
 */
function initContentReveal() {
    const sections = document.querySelectorAll('section');
    
    sections.forEach(function(section, index) {
        section.style.setProperty('--section-index', index);
        section.classList.add('reveal-section');
    });
    
    // Sequence hero elements if they exist
    const heroElements = document.querySelectorAll('.hero-content h2, .hero-content p, .hero-content .btn, .hero-content .cta-buttons');
    
    heroElements.forEach(function(element, index) {
        element.style.setProperty('--hero-index', index);
        element.classList.add('hero-animate');
    });
} 