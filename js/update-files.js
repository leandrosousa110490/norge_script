/**
 * This script will be run manually to update all HTML files with the new animations
 * CSS and JavaScript references.
 */

// List of files to update
const filesToUpdate = [
    'index.html',
    'about.html',
    'services.html',
    'portfolio.html',
    'contact.html'
];

filesToUpdate.forEach(file => {
    fetch(file)
        .then(response => response.text())
        .then(html => {
            // Add animations.css reference if not exists
            if (!html.includes('animations.css')) {
                html = html.replace(
                    '<link rel="stylesheet" href="css/lightbox.css">',
                    '<link rel="stylesheet" href="css/lightbox.css">\n    <link rel="stylesheet" href="css/animations.css">'
                );
            }
            
            // Add animations.js reference if not exists
            if (!html.includes('animations.js')) {
                html = html.replace(
                    '<script src="js/main.js"></script>',
                    '<script src="js/main.js"></script>\n    <script src="js/animations.js"></script>'
                );
            }
            
            // Add animation classes to key elements
            
            // 1. Add classes to section elements
            html = html.replace(/<section/g, '<section class="reveal-section"');
            
            // 2. Add classes to card elements
            html = html.replace(/<div class="card/g, '<div class="card animate-on-scroll"');
            
            // 3. Add classes to hero content elements
            html = html.replace(
                /<div class="hero-content">/g,
                '<div class="hero-content">\n            <h2 class="hero-animate">',
            );
            
            html = html.replace(
                /<\/h2>\s*<p>/g,
                '</h2>\n            <p class="hero-animate">'
            );
            
            // 4. Add classes to service cards
            html = html.replace(
                /<div class="service-card/g,
                '<div class="service-card animate-on-scroll"'
            );
            
            // 5. Add classes to portfolio cards
            html = html.replace(
                /<div class="portfolio-card/g,
                '<div class="portfolio-card animate-on-scroll"'
            );
            
            // 6. Add body class for page transitions
            html = html.replace(
                /<body class="/g,
                '<body class="page-transition '
            );
            
            // Save the updated HTML
            // In a real scenario, this would write to a file
            console.log(`Updated ${file}`);
            console.log(html.substring(0, 500) + '...');
        })
        .catch(error => console.error(`Error processing ${file}:`, error));
}); 