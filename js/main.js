/**
 * Florida Sign Solution - Main JavaScript
 * Handles common functionality across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize common elements
    initNavigation();
    initScrollToTop();
    
    // Initialize page-specific elements
    if (document.querySelector('.testimonial-slider')) {
        initTestimonialSlider();
    }
    
    if (document.querySelector('.portfolio-filters')) {
        initPortfolioFilters();
    }
    
    if (document.querySelector('.stats-container')) {
        initCounterAnimation();
    }
    setActiveNavLink();
});

/**
 * Initialize mobile navigation
 */
function initNavigation() {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            const target = document.getElementById('navbarNav');
            if (target && bootstrap.Collapse.getInstance(target)) {
                // Let Bootstrap handle it, or add custom logic if needed
            } else if (navLinks) {
                navLinks.classList.toggle('show');
            }
            this.classList.toggle('active');
        });
    }
    
    // Add scrolled class to header on scroll
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (header) {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });
}

/**
 * Initialize scroll to top button
 */
function initScrollToTop() {
    const scrollButton = document.getElementById('scrollToTop');
    
    if (scrollButton) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        });
        
        scrollButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

/**
 * Initialize testimonial slider
 */
function initTestimonialSlider() {
    const slides = document.querySelectorAll('.testimonial-slide');
    const prevBtn = document.querySelector('.prev-testimonial');
    const nextBtn = document.querySelector('.next-testimonial');
    const dots = document.querySelectorAll('.dot');
    
    let currentSlide = 0;
    
    // Set initial state
    showSlide(currentSlide);
    
    // Previous button
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        });
    }
    
    // Next button
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        });
    }
    
    // Dot navigation
    dots.forEach(function(dot, index) {
        dot.addEventListener('click', function() {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });
    
    // Auto-advance slides every 5 seconds
    setInterval(function() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }, 5000);
    
    // Show the specified slide
    function showSlide(index) {
        slides.forEach(function(slide, i) {
            if (i === index) {
                slide.classList.add('active');
                slide.style.display = 'block';
                
                // Fade in animation
                setTimeout(function() {
                    slide.style.opacity = 1;
                }, 50);
            } else {
                slide.classList.remove('active');
                slide.style.opacity = 0;
                
                // Hide after fade out
                setTimeout(function() {
                    slide.style.display = 'none';
                }, 300);
            }
        });
        
        // Update dots
        dots.forEach(function(dot, i) {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

/**
 * Initialize portfolio filters
 */
function initPortfolioFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    filterButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(function(btn) {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            
            // Filter portfolio items
            portfolioItems.forEach(function(item) {
                if (filter === 'all' || item.getAttribute('data-category') === filter) {
                    item.style.display = 'block';
                    setTimeout(function() {
                        item.style.opacity = 1;
                    }, 50);
                } else {
                    item.style.opacity = 0;
                    setTimeout(function() {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

/**
 * Initialize counter animation for stats
 */
function initCounterAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const count = parseInt(target.getAttribute('data-count'));
                    animateCounter(target, count);
                    observer.unobserve(target);
                }
            });
        }, { threshold: 0.5 });
        
        statNumbers.forEach(function(stat) {
            observer.observe(stat);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        statNumbers.forEach(function(stat) {
            const count = parseInt(stat.getAttribute('data-count'));
            animateCounter(stat, count);
        });
    }
    
    function animateCounter(element, target) {
        let current = 0;
        const increment = target > 100 ? Math.ceil(target / 50) : 1;
        const duration = 2000; // 2 seconds
        const interval = duration / (target / increment);
        
        const timer = setInterval(function() {
            current += increment;
            element.textContent = current;
            
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, interval);
    }
}

/**
 * Form submission handling (can be expanded with actual form submission)
 */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // In a real application, this would send the form data to a server
        alert('Thank you for your message! We will get back to you soon.');
        this.reset();
    });
}

/**
 * Newsletter form submission
 */
const newsletterForms = document.querySelectorAll('.newsletter-form');
newsletterForms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        // In a real application, this would send the form data to a server
        alert('Thank you for subscribing to our newsletter!');
        this.reset();
    });
});

/**
 * Sets the active class on the current navigation link.
 */
function setActiveNavLink() {
    const currentPageUrl = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
        const linkUrl = link.getAttribute('href').split('/').pop();
        if (linkUrl === currentPageUrl) {
            link.classList.add('active');
        }
    });
} 