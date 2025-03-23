document.addEventListener('DOMContentLoaded', function() {
    // Function to load HTML content
    async function loadHTML(url, elementId) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // For header
            if (elementId === 'header-placeholder') {
                const header = doc.querySelector('header');
                if (header) {
                    document.getElementById(elementId).outerHTML = header.outerHTML;
                }
            }
            
            // For footer
            if (elementId === 'footer-placeholder') {
                const footer = doc.querySelector('footer');
                if (footer) {
                    document.getElementById(elementId).outerHTML = footer.outerHTML;
                }
            }
            
            // Get current page URL
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            
            // Set active class based on current page
            const navLinks = document.querySelectorAll('.nav-links a');
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
            
        } catch (error) {
            console.error('Error loading template:', error);
        }
    }
    
    // Load header and footer
    loadHTML('base.html', 'header-placeholder');
    loadHTML('base.html', 'footer-placeholder');
}); 