document.addEventListener('DOMContentLoaded', function() {
    // Get current page URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Set active class on appropriate navigation item
    const pathToElement = {
        'index.html': document.getElementById('nav-home'),
        'services.html': document.getElementById('nav-services'),
        'portfolio.html': document.getElementById('nav-portfolio'),
        'about.html': document.getElementById('nav-about'),
        'contact.html': document.getElementById('nav-contact')
    };
    
    // Remove any existing active classes
    Object.values(pathToElement).forEach(link => {
        if (link) link.classList.remove('active');
    });
    
    // Add active class to current page link
    if (pathToElement[currentPage]) {
        pathToElement[currentPage].classList.add('active');
    }
}); 