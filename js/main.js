/**
 * Florida Sign Solution - Main JavaScript
 * Handles common functionality across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize common elements
    initNavigation();
    initScrollToTop();
    initDynamicUI();
    
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
    const stickyHeader = document.querySelector('.header') || document.querySelector('.navbar');
    const updateHeaderState = function() {
        if (!stickyHeader) {
            return;
        }
        if (window.scrollY > 60) {
            stickyHeader.classList.add('is-scrolled');
            stickyHeader.classList.add('scrolled');
        } else {
            stickyHeader.classList.remove('is-scrolled');
            stickyHeader.classList.remove('scrolled');
        }
    };

    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
}

/**
 * Initialize scroll to top button
 */
function initScrollToTop() {
    const scrollButton = document.getElementById('scrollToTop');
    
    if (scrollButton) {
        scrollButton.classList.add('quote-fab');
        scrollButton.setAttribute('type', 'button');
        scrollButton.setAttribute('data-quote-trigger', 'true');
        scrollButton.setAttribute('aria-label', 'Request a Quote');
        scrollButton.innerHTML = '<i class="bi bi-pencil-square"></i>';

        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
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
 * Initializes visual interactions for icons, cards and pointer movement.
 */
function initDynamicUI() {
    cleanupLegacyHeaderBars();
    preventLegacyBannerInjection();
    initEnhancedNavbar();
    initEnhancedFooterContent();
    initScrollProgress();
    initDynamicPageShowcase();
    initIconChipInteraction();
    initCardTilt();
    initCursorGlow();
    initStatCounters();
    initTrafficTracking();
}

/**
 * Removes previously injected stacked header bars.
 */
function cleanupLegacyHeaderBars() {
    document.querySelectorAll('.iconic-header-bar, .header-toolbar, .quote-banner').forEach(function(node) {
        node.remove();
    });
}

/**
 * Ensures legacy stacked bars stay removed even if injected later.
 */
function preventLegacyBannerInjection() {
    const selector = '.iconic-header-bar, .header-toolbar, .quote-banner';
    const stripLegacyBars = function() {
        document.querySelectorAll(selector).forEach(function(node) {
            node.remove();
        });
    };

    stripLegacyBars();
    const observer = new MutationObserver(stripLegacyBars);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(function() {
        observer.disconnect();
    }, 15000);
}

/**
 * Builds one unified dynamic header inside the existing navbar.
 */
function initEnhancedNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) {
        return;
    }
    document.querySelectorAll('.header-quote-ribbon').forEach(function(node) {
        node.remove();
    });
    nav.classList.add('enhanced-navbar');
    removeLegacyNavContactText(nav);

    const container = nav.querySelector('.container');
    if (!container) {
        return;
    }

    const collapseNav = container.querySelector('.navbar-collapse');
    const navGroup = collapseNav ? collapseNav.querySelector('.nav-and-contact') : null;
    if (navGroup) {
        navGroup.classList.add('enhanced-nav-group');
    }

    const logoImage = container.querySelector('.navbar-brand img');
    if (logoImage) {
        logoImage.classList.add('enhanced-logo');
        if (!/logo2\./i.test(logoImage.getAttribute('src') || '')) {
            logoImage.setAttribute('src', 'images/logo2.png');
        }
    }

    if (!container.querySelector('.nav-command-center')) {
        const commandCenter = document.createElement('div');
        commandCenter.className = 'nav-command-center d-none d-lg-flex';
        commandCenter.innerHTML = [
            '<a class="nav-shortcut-link" href="tel:+17863932372" aria-label="Call Florida Sign Solution"><i class="bi bi-telephone-fill"></i></a>',
            '<a class="nav-shortcut-link primary" href="mailto:floridasignsolution@gmail.com" aria-label="Email Florida Sign Solution"><i class="bi bi-envelope-fill"></i></a>'
        ].join('');

        if (navGroup) {
            navGroup.appendChild(commandCenter);
        } else if (collapseNav) {
            collapseNav.appendChild(commandCenter);
        } else {
            container.appendChild(commandCenter);
        }
    }

    if (collapseNav && !collapseNav.querySelector('.nav-mobile-actions')) {
        const mobileActions = document.createElement('div');
        mobileActions.className = 'nav-mobile-actions d-lg-none';
        mobileActions.innerHTML = [
            '<a href="tel:+17863932372" class="nav-mobile-action-pill" aria-label="Call Florida Sign Solution"><i class="bi bi-telephone-fill"></i></a>',
            '<a href="mailto:floridasignsolution@gmail.com" class="nav-mobile-action-pill primary" aria-label="Email Florida Sign Solution"><i class="bi bi-envelope-fill"></i></a>'
        ].join('');
        collapseNav.insertBefore(mobileActions, collapseNav.firstChild);
    }

}

/**
 * Enhances existing footer content with dynamic visuals and icon treatment.
 */
function initEnhancedFooterContent() {
    const footer = document.querySelector('footer.bg-dark, footer');
    if (!footer) {
        return;
    }

    // Remove previously injected footer toolbar from older iteration.
    footer.querySelectorAll('.footer-command-toolbar').forEach(function(node) {
        node.remove();
    });

    footer.classList.add('footer-enhanced');
    const container = footer.querySelector('.container');
    if (!container) {
        return;
    }

    if (!container.querySelector('.footer-content-live')) {
        const companyColumn = container.querySelector('.row .col-lg-3');
        if (companyColumn) {
            const live = document.createElement('div');
            live.className = 'footer-content-live';
            live.innerHTML = '<span class="footer-live-dot"></span><span data-footer-content-rotator>Trusted Sign Partner Since 2005</span>';

            const heading = companyColumn.querySelector('h5');
            if (heading) {
                heading.insertAdjacentElement('afterend', live);
            } else {
                companyColumn.insertBefore(live, companyColumn.firstChild);
            }

            initRotatingTicker(live.querySelector('[data-footer-content-rotator]'), [
                'Trusted Sign Partner Since 2005',
                'Professional sign installation, repair, and development',
                'Serving Miami and businesses across Florida',
                'Licensed, insured, and committed to quality craftsmanship'
            ], 4200);
        }
    }

    const headingIconMap = {
        'Quick Links': 'bi-link-45deg',
        'Our Services': 'bi-grid-1x2-fill',
        'Connect With Us': 'bi-share-fill',
        'Business Hours': 'bi-clock-history',
        'Florida Sign Solution': 'bi-stars'
    };

    container.querySelectorAll('h5.text-uppercase').forEach(function(heading) {
        if (heading.querySelector('i')) {
            return;
        }
        const text = heading.textContent.trim();
        const iconClass = headingIconMap[text];
        if (!iconClass) {
            return;
        }
        heading.innerHTML = '<i class="bi ' + iconClass + ' me-2"></i>' + text;
        heading.classList.add('footer-heading-enhanced');
    });

    container.querySelectorAll('ul.list-unstyled a').forEach(function(link) {
        link.classList.add('footer-link-enhanced');
    });

    const companyColumn = container.querySelector('.row .col-lg-3');
    if (companyColumn) {
        companyColumn.querySelectorAll('p').forEach(function(row) {
            const icon = row.querySelector('i');
            if (!icon) {
                return;
            }

            row.classList.add('footer-contact-row');
            icon.classList.add('footer-contact-icon');

            if (icon.classList.contains('bi-telephone-fill')) {
                row.classList.add('is-phone');
                if (!row.querySelector('a')) {
                    const label = row.textContent.replace(/\s+/g, ' ').trim();
                    const phoneMatch = label.match(/\(\d{3}\)\s*\d{3}-\d{4}/);
                    if (phoneMatch) {
                        const digits = phoneMatch[0].replace(/\D/g, '');
                        row.innerHTML = row.innerHTML.replace(phoneMatch[0], '<a href="tel:+1' + digits + '" class="footer-contact-link">' + phoneMatch[0] + '</a>');
                    }
                }
            } else if (icon.classList.contains('bi-envelope-fill')) {
                row.remove();
                return;
            } else if (icon.classList.contains('bi-geo-alt-fill')) {
                row.classList.add('is-location');
            }

            const link = row.querySelector('a');
            if (link) {
                link.classList.add('footer-contact-link');
            }
        });
    }

    const hoursSection = container.querySelector('.row.mt-4');
    if (hoursSection) {
        hoursSection.querySelectorAll('p').forEach(function(p) {
            p.classList.add('footer-hours-enhanced');
        });
    }

    const legalLine = container.querySelector('.row.align-items-center .col-md-7 p');
    if (legalLine) {
        legalLine.classList.add('footer-legal-enhanced');
    }

    const licenseLine = container.querySelector('.row.align-items-center .col-md-5 p');
    if (licenseLine && !licenseLine.querySelector('i')) {
        licenseLine.innerHTML = '<i class="bi bi-patch-check-fill me-2"></i>' + licenseLine.textContent.trim();
        licenseLine.classList.add('footer-license-enhanced');
    }

    const instagramIcon = container.querySelector('.bi-instagram');
    if (instagramIcon) {
        const instagramLink = instagramIcon.closest('a');
        if (instagramLink) {
            instagramLink.classList.add('footer-instagram-link');
        }

        const instagramCard = instagramIcon.closest('div');
        if (instagramCard) {
            instagramCard.classList.add('footer-social-enhanced', 'footer-instagram-badge');
        }
    }

    const socialWrap = container.querySelector('.col-lg-3 .d-flex');
    if (socialWrap) {
        if (!socialWrap.querySelector('.footer-phone-link')) {
            const phoneNode = container.querySelector('.footer-contact-row.is-phone a[href^="tel:"]');
            const phoneHref = phoneNode ? phoneNode.getAttribute('href') : 'tel:+17863932372';
            const phoneLink = document.createElement('a');
            phoneLink.href = phoneHref || 'tel:+17863932372';
            phoneLink.className = 'footer-phone-link me-3';
            phoneLink.setAttribute('aria-label', 'Call Florida Sign Solution');
            phoneLink.innerHTML = [
                '<div class="footer-social-phone-badge footer-social-enhanced">',
                '  <i class="bi bi-telephone-fill text-white"></i>',
                '</div>'
            ].join('');
            socialWrap.appendChild(phoneLink);
        }

        if (!socialWrap.querySelector('.footer-email-link')) {
            const emailLink = document.createElement('a');
            emailLink.href = 'mailto:floridasignsolution@gmail.com';
            emailLink.className = 'footer-email-link me-3';
            emailLink.setAttribute('aria-label', 'Email Florida Sign Solution');
            emailLink.innerHTML = [
                '<div class="footer-social-email-badge footer-social-enhanced">',
                '  <i class="bi bi-envelope-fill text-white"></i>',
                '</div>'
            ].join('');
            socialWrap.appendChild(emailLink);
        }

        if (!socialWrap.querySelector('.footer-quote-link')) {
            const quoteLink = document.createElement('a');
            quoteLink.href = '#quote';
            quoteLink.className = 'footer-quote-link';
            quoteLink.setAttribute('data-quote-trigger', 'true');
            quoteLink.setAttribute('aria-label', 'Request a Quote');
            quoteLink.innerHTML = [
                '<div class="footer-social-quote-badge footer-social-enhanced">',
                '  <i class="bi bi-pencil-square text-white"></i>',
                '</div>'
            ].join('');
            socialWrap.appendChild(quoteLink);
        }
    }
}

/**
 * Removes the default navbar contact text blocks to avoid duplicated contact rows.
 */
function removeLegacyNavContactText(nav) {
    nav.querySelectorAll('.contact-info-row').forEach(function(node) {
        node.remove();
    });

    nav.querySelectorAll('.d-lg-none .contact-link').forEach(function(link) {
        link.remove();
    });

    nav.querySelectorAll('.d-lg-none').forEach(function(wrapper) {
        if (!wrapper.textContent.trim() && !wrapper.children.length) {
            wrapper.remove();
        }
    });

    nav.querySelectorAll('.nav-context-pill, .nav-live-strip').forEach(function(node) {
        node.remove();
    });
}

/**
 * Injects a dynamic content block customized for each page.
 */
function initDynamicPageShowcase() {
    if (document.querySelector('.dynamic-page-showcase')) {
        return;
    }

    const pageName = getCurrentPageName();
    const contentMap = {
        'index.html': {
            kicker: 'Brand Visibility Accelerator',
            title: 'Turn More Walk-By Traffic Into Paying Customers',
            subtitle: 'Every project is engineered for visibility, compliance, and long-term durability so your sign keeps working every day.',
            cards: [
                { icon: 'bi-eye-fill', title: 'Visibility-First Design', text: 'We optimize readability and placement so your sign gets noticed from key traffic angles.' },
                { icon: 'bi-shield-check', title: 'Code-Ready Delivery', text: 'Our process prioritizes permit alignment and compliance to avoid costly project delays.' },
                { icon: 'bi-lightning-fill', title: 'Rapid Execution', text: 'From concept to install, we keep momentum high with fast, transparent updates.' },
                { icon: 'bi-gear-wide-connected', title: 'Long-Term Support', text: 'Maintenance and repairs keep your signage looking sharp and performing reliably.' }
            ],
            ctaPrimary: { href: 'contact.html', label: 'Request Your Free Quote' },
            ctaSecondary: { href: 'portfolio.html', label: 'See Recent Projects' },
            ticker: [
                'Most clients start with a free visibility strategy call.',
                'Need urgent repairs? Ask about rapid-response support.',
                'Multi-location signage programs available across Florida.'
            ]
        },
        'about.html': {
            kicker: 'Why Teams Trust Us',
            title: 'Family Ownership With Enterprise-Level Sign Execution',
            subtitle: 'You get direct communication, craftsmanship, and accountable timelines from a team invested in your results.',
            cards: [
                { icon: 'bi-people-fill', title: 'Hands-On Leadership', text: 'Ownership stays close to each project from planning through final inspection.' },
                { icon: 'bi-award-fill', title: 'Proven Craftsmanship', text: 'Our quality standards are built on years of field-tested sign construction.' },
                { icon: 'bi-chat-left-dots-fill', title: 'Clear Communication', text: 'Expect proactive updates, realistic timelines, and direct decision support.' },
                { icon: 'bi-heart-fill', title: 'Client-First Service', text: 'We prioritize your growth, timeline, and budget with practical recommendations.' }
            ],
            ctaPrimary: { href: 'contact.html', label: 'Talk With Our Team' },
            ctaSecondary: { href: 'services.html', label: 'Explore Services' },
            ticker: [
                'Personalized service without sacrificing technical excellence.',
                'We treat every signage investment like it is our own brand.',
                'From local businesses to multi-site rollouts, we stay accountable.'
            ]
        },
        'services.html': {
            kicker: 'Full-Service Sign Pipeline',
            title: 'Everything Needed To Launch High-Impact Signage',
            subtitle: 'Design, permitting, fabrication, installation, and maintenance coordinated in one streamlined process.',
            cards: [
                { icon: 'bi-brush-fill', title: 'Design + Strategy', text: 'Brand-driven concepts built to perform in real-world street and storefront conditions.' },
                { icon: 'bi-building', title: 'Permits + Compliance', text: 'We navigate local codes and permitting requirements to keep your launch moving.' },
                { icon: 'bi-hammer', title: 'Fabrication + Install', text: 'Durable production and precision installation by experienced sign professionals.' },
                { icon: 'bi-tools', title: 'Maintenance + Repair', text: 'Protect your investment with scheduled maintenance and responsive repair support.' }
            ],
            ctaPrimary: { href: 'contact.html', label: 'Book a Sign Consultation' },
            ctaSecondary: { href: 'portfolio.html', label: 'View Service Results' },
            ticker: [
                'Need design help? We can develop concept options quickly.',
                'Permitting challenges handled by our experienced team.',
                'Ask about preventive sign maintenance programs.'
            ]
        },
        'portfolio.html': {
            kicker: 'Real Results',
            title: 'See How Strategic Signage Improves Business Visibility',
            subtitle: 'Our portfolio highlights practical, high-performing sign solutions across industries and Florida markets.',
            cards: [
                { icon: 'bi-shop-window', title: 'Retail Visibility', text: 'Storefront systems that improve curb appeal and drive more first-time visits.' },
                { icon: 'bi-cup-hot-fill', title: 'Restaurant Branding', text: 'Memorable exterior signage that supports traffic during day and evening hours.' },
                { icon: 'bi-building-check', title: 'Commercial Sign Systems', text: 'Durable multi-sign packages for offices, centers, and business campuses.' },
                { icon: 'bi-signpost-split-fill', title: 'Wayfinding + Identity', text: 'Directional and identity signage that improves customer flow and confidence.' }
            ],
            ctaPrimary: { href: 'contact.html', label: 'Start Your Project' },
            ctaSecondary: { href: 'services.html', label: 'Compare Sign Options' },
            ticker: [
                'Every project shown reflects custom client goals and site constraints.',
                'Need a similar style? We can adapt it to your brand and location.',
                'From simple storefront updates to complete sign packages.'
            ]
        },
        'contact.html': {
            kicker: 'Start Your Sign Project',
            title: 'Get a Fast, Actionable Plan for Your Business Signage',
            subtitle: 'Share your goals and location. We will recommend the highest-impact sign strategy for your timeline and budget.',
            cards: [
                { icon: 'bi-telephone-inbound-fill', title: 'Quick Response', text: 'We respond quickly so you can move from idea to execution without delays.' },
                { icon: 'bi-clipboard-check-fill', title: 'Clear Next Steps', text: 'You receive a structured plan covering design, approvals, and installation.' },
                { icon: 'bi-geo-alt-fill', title: 'Florida-Wide Service', text: 'Coverage includes Miami, Fort Lauderdale, Orlando, Tampa, and more.' },
                { icon: 'bi-currency-dollar', title: 'Budget Clarity', text: 'Transparent recommendations and pricing options aligned with your goals.' }
            ],
            ctaPrimary: { href: 'tel:+17863932372', label: 'Call (786) 393-2372' },
            ctaSecondary: { href: 'services.html', label: 'Review Services First' },
            ticker: [
                'Tell us your location and desired completion date.',
                'Need emergency sign repair? Mention urgency in your request.',
                'Planning a rebrand? Ask for a phased rollout strategy.'
            ]
        }
    };

    const content = contentMap[pageName] || contentMap['index.html'];
    const footer = document.querySelector('footer');
    if (!footer) {
        return;
    }

    const cardsMarkup = content.cards.map(function(card) {
        return [
            '<article class="dynamic-showcase-card tilt-card">',
            '  <div class="dynamic-showcase-icon"><i class="bi ' + card.icon + '"></i></div>',
            '  <h3>' + card.title + '</h3>',
            '  <p>' + card.text + '</p>',
            '</article>'
        ].join('');
    }).join('');

    const section = document.createElement('section');
    section.className = 'dynamic-page-showcase';
    section.innerHTML = [
        '<div class="container">',
        '  <div class="dynamic-showcase-top">',
        '    <span class="dynamic-showcase-kicker"><i class="bi bi-stars"></i> ' + content.kicker + '</span>',
        '    <div class="dynamic-showcase-live"><span class="dynamic-live-dot"></span><span data-dynamic-rotator>' + content.ticker[0] + '</span></div>',
        '  </div>',
        '  <h2>' + content.title + '</h2>',
        '  <p class="dynamic-showcase-subtitle">' + content.subtitle + '</p>',
        '  <div class="dynamic-showcase-grid">' + cardsMarkup + '</div>',
        '  <div class="dynamic-showcase-actions">',
        '    <a href="' + content.ctaPrimary.href + '" class="btn btn-primary">' + content.ctaPrimary.label + '</a>',
        '    <a href="' + content.ctaSecondary.href + '" class="btn btn-outline-primary">' + content.ctaSecondary.label + '</a>',
        '  </div>',
        '</div>'
    ].join('');

    footer.insertAdjacentElement('beforebegin', section);
    initRotatingTicker(section.querySelector('[data-dynamic-rotator]'), content.ticker, 4500);
}

/**
 * Rotates concise value propositions in ticker nodes.
 */
function initRotatingTicker(tickerNode, messages, intervalMs) {
    if (!tickerNode || !messages || !messages.length) {
        return;
    }

    let messageIndex = 0;
    window.setInterval(function() {
        messageIndex = (messageIndex + 1) % messages.length;
        tickerNode.style.opacity = '0';
        tickerNode.style.transform = 'translateY(4px)';
        window.setTimeout(function() {
            tickerNode.textContent = messages[messageIndex];
            tickerNode.style.opacity = '1';
            tickerNode.style.transform = 'translateY(0)';
        }, 220);
    }, intervalMs || 4200);
}

/**
 * Returns normalized page filename for routing behavior.
 */
function getCurrentPageName() {
    const rawName = window.location.pathname.split('/').pop();
    return (rawName && rawName.trim()) ? rawName.toLowerCase() : 'index.html';
}

/**
 * Displays a top progress indicator based on scroll position.
 */
function initScrollProgress() {
    if (document.querySelector('.header-progress')) {
        return;
    }

    const progress = document.createElement('div');
    progress.className = 'header-progress';
    progress.innerHTML = '<span class="header-progress-bar" data-scroll-progress></span>';
    document.body.appendChild(progress);

    const bar = progress.querySelector('[data-scroll-progress]');
    const updateBar = function() {
        if (!bar) {
            return;
        }
        const scrollTop = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const percent = total <= 0 ? 0 : (scrollTop / total) * 100;
        bar.style.width = Math.max(0, Math.min(percent, 100)).toFixed(2) + '%';
    };

    updateBar();
    window.addEventListener('scroll', updateBar, { passive: true });
    window.addEventListener('resize', updateBar);
}

/**
 * Adds subtle magnetic movement for icon chips on hover.
 */
function initIconChipInteraction() {
    const chips = document.querySelectorAll('[data-icon-chip]');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (!chips.length || !canHover) {
        return;
    }

    chips.forEach(function(chip) {
        chip.addEventListener('mousemove', function(event) {
            const rect = chip.getBoundingClientRect();
            const shiftX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
            const shiftY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
            chip.style.transform = 'translate(' + (shiftX * 5).toFixed(1) + 'px, ' + (shiftY * 4).toFixed(1) + 'px)';
        });

        chip.addEventListener('mouseleave', function() {
            chip.style.transform = '';
        });
    });
}

/**
 * Applies lightweight 3D tilt to cards on desktop pointers.
 */
function initCardTilt() {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) {
        return;
    }

    const cards = document.querySelectorAll('.tilt-card, .card');
    cards.forEach(function(card) {
        if (card.dataset.tiltBound === 'true' || card.classList.contains('no-tilt') || card.closest('.no-tilt')) {
            return;
        }

        card.dataset.tiltBound = 'true';
        card.classList.add('tilt-enabled');

        let rafId = null;
        let isActive = false;
        let pointerX = 0;
        let pointerY = 0;
        let bounds = null;
        let currentRotateX = 0;
        let currentRotateY = 0;
        let targetRotateX = 0;
        let targetRotateY = 0;

        const setTilt = function(rotateX, rotateY) {
            card.style.transform = 'perspective(900px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg)';
        };

        const stopTiltFrame = function() {
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }
        };

        const tick = function() {
            if (!isActive || !bounds) {
                return;
            }

            const relativeX = (pointerX - bounds.left) / bounds.width;
            const relativeY = (pointerY - bounds.top) / bounds.height;
            const inset = 0.06;
            const clampedX = Math.max(inset, Math.min(1 - inset, relativeX));
            const clampedY = Math.max(inset, Math.min(1 - inset, relativeY));
            const normalizedX = ((clampedX - 0.5) / (0.5 - inset));
            const normalizedY = ((clampedY - 0.5) / (0.5 - inset));
            const easedX = Math.abs(normalizedX) < 0.08 ? 0 : normalizedX;
            const easedY = Math.abs(normalizedY) < 0.08 ? 0 : normalizedY;
            targetRotateY = easedX * 4.2;
            targetRotateX = easedY * -3.8;

            currentRotateX += (targetRotateX - currentRotateX) * 0.24;
            currentRotateY += (targetRotateY - currentRotateY) * 0.24;
            setTilt(currentRotateX, currentRotateY);

            rafId = window.requestAnimationFrame(tick);
        };

        const startTiltFrame = function() {
            if (rafId === null) {
                rafId = window.requestAnimationFrame(tick);
            }
        };

        const onPointerEnter = function(event) {
            isActive = true;
            bounds = card.getBoundingClientRect();
            pointerX = event.clientX;
            pointerY = event.clientY;
            card.classList.remove('tilt-resetting');
            card.classList.add('tilt-active');
            startTiltFrame();
        };

        const onPointerMove = function(event) {
            if (!isActive) {
                return;
            }
            pointerX = event.clientX;
            pointerY = event.clientY;
            // Keep the same bounding box during hover to avoid edge jitter feedback.
        };

        const resetTilt = function() {
            isActive = false;
            bounds = null;
            stopTiltFrame();
            card.classList.remove('tilt-active');
            card.classList.add('tilt-resetting');
            currentRotateX = 0;
            currentRotateY = 0;
            targetRotateX = 0;
            targetRotateY = 0;
            card.style.transform = '';
            window.setTimeout(function() {
                card.classList.remove('tilt-resetting');
            }, 220);
        };

        card.addEventListener('pointerenter', onPointerEnter);
        card.addEventListener('pointermove', onPointerMove, { passive: true });
        card.addEventListener('pointerleave', resetTilt);
        card.addEventListener('pointercancel', resetTilt);
    });
}

/**
 * Logs page-traffic events for admin analytics.
 */
function initTrafficTracking() {
    if (window.location.pathname.indexOf('/admin') === 0) {
        return;
    }

    const dedupeKey = 'fss-traffic-logged:' + (window.location.pathname || '/');
    if (sessionStorage.getItem(dedupeKey) === '1') {
        return;
    }
    sessionStorage.setItem(dedupeKey, '1');

    const payload = {
        page: getCurrentPageName(),
        path: window.location.pathname || '/',
        url: window.location.href,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        day: new Date().toISOString().slice(0, 10)
    };

    sendTrafficEvent(payload).catch(function(error) {
        console.warn('Traffic tracking failed:', error);
    });
}

function hasValidTrafficFirebaseConfig() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || typeof cfg !== 'object') {
        return false;
    }
    const required = ['apiKey', 'projectId', 'appId', 'messagingSenderId'];
    return required.every(function(key) {
        const value = cfg[key];
        return value && String(value).trim() && !/REPLACE/i.test(String(value));
    });
}

let trafficAuthWarmupPromise = null;
let trafficAuthWarmupErrorCode = '';

async function ensureTrafficAuthSession() {
    if (!window.firebase || typeof window.firebase.auth !== 'function') {
        return false;
    }
    if (!trafficAuthWarmupPromise) {
        trafficAuthWarmupPromise = (async function() {
            try {
                trafficAuthWarmupErrorCode = '';
                const auth = window.firebase.auth();
                if (auth.currentUser) {
                    return true;
                }
                await auth.signInAnonymously();
                return true;
            } catch (error) {
                trafficAuthWarmupErrorCode = String((error && (error.code || error.name)) || '').toLowerCase();
                console.warn('Traffic auth warmup failed:', error);
                return false;
            }
        })();
    }
    return trafficAuthWarmupPromise;
}

function loadTrafficScriptOnce(src) {
    return new Promise(function(resolve, reject) {
        if (document.querySelector('script[src="' + src + '"]')) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = function() {
            reject(new Error('Failed to load ' + src));
        };
        document.head.appendChild(script);
    });
}

async function initTrafficFirestore() {
    if (!hasValidTrafficFirebaseConfig()) {
        return null;
    }

    try {
        await loadTrafficScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
        await loadTrafficScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
        await loadTrafficScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
        const appCheckKey = String(window.FIREBASE_APPCHECK_SITE_KEY || '').trim();
        if (appCheckKey) {
            try {
                await loadTrafficScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js');
            } catch (_) {}
        }
        if (!window.firebase) {
            return null;
        }

        if (!window.firebase.apps.length) {
            window.firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        await ensureTrafficAuthSession();
        if (appCheckKey) {
            try {
                const appCheck = window.firebase.appCheck();
                appCheck.activate(appCheckKey, true);
            } catch (error) {
                console.warn('Traffic App Check activation failed:', error);
            }
        }

        try {
            const dbTmp = window.firebase.firestore();
            dbTmp.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
        } catch (_) {}

        return window.firebase.firestore();
    } catch (_) {
        return null;
    }
}

async function sendTrafficEvent(payload) {
    const db = await initTrafficFirestore();
    if (db) {
        try {
            await db.collection('siteTraffic').add(payload);
            return;
        } catch (error) {
            const code = String((error && (error.code || error.name)) || '').toLowerCase();
            if (code.includes('permission-denied') || code.includes('unauthenticated')) {
                if (
                    trafficAuthWarmupErrorCode.includes('operation-not-allowed') ||
                    trafficAuthWarmupErrorCode.includes('admin-restricted-operation') ||
                    trafficAuthWarmupErrorCode.includes('configuration-not-found')
                ) {
                    console.warn('Traffic write blocked: Firebase Anonymous Auth is not enabled.');
                } else {
                    console.warn('Traffic write blocked by Firestore rules for siteTraffic.');
                }
            } else {
                console.warn('Traffic write error:', error);
            }
        }
    }

    try {
        const existing = JSON.parse(localStorage.getItem('siteTrafficFallback') || '[]');
        existing.push(payload);
        localStorage.setItem('siteTrafficFallback', JSON.stringify(existing.slice(-500)));
    } catch (_) {}
}

/**
 * Adds a soft cursor glow on pointer-capable devices.
 */
function initCursorGlow() {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover || document.querySelector('.cursor-glow')) {
        return;
    }

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    document.addEventListener('mousemove', function(event) {
        glow.style.left = event.clientX + 'px';
        glow.style.top = event.clientY + 'px';
        glow.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('mouseleave', function() {
        glow.style.opacity = '0';
    });
}

/**
 * Animates homepage stat numbers when they become visible.
 */
function initStatCounters() {
    const counters = document.querySelectorAll('.stats-showcase .display-4');
    if (!counters.length) {
        return;
    }

    const runCounter = function(counter) {
        const label = counter.textContent.trim();
        const numericValue = parseInt(label.replace(/\D/g, ''), 10);
        if (!numericValue) {
            return;
        }

        const hasPlus = label.indexOf('+') !== -1;
        const duration = 1600;
        const startTime = performance.now();

        const step = function(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(numericValue * eased);
            counter.textContent = value + (hasPlus ? '+' : '');
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    runCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.45 });

        counters.forEach(function(counter) {
            observer.observe(counter);
        });
    } else {
        counters.forEach(runCounter);
    }
}

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
