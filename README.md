# Florida Sign Solution - Website

A responsive, modern website for Florida Sign Solution, a company specializing in sign building, repair, and installation services.

## Features

- Fully responsive design that works on all devices (mobile, tablet, desktop)
- Modern, visually appealing UI with smooth animations and transitions
- Interactive elements including:
  - Portfolio filtering
  - Testimonial slider
  - Animated statistics counters
  - Form validation
  - Mobile-friendly navigation
- Accessibility-friendly features
- Optimized for performance

## Technical Information

This is a static website built with:
- HTML5
- CSS3 (with CSS variables and flexbox/grid layouts)
- Vanilla JavaScript (no frameworks)

## File Structure

```
├── index.html           # Main HTML file
├── css/
│   └── styles.css       # Main stylesheet
├── js/
│   └── main.js          # JavaScript functionality
├── images/              # Image assets
│   ├── portfolio/       # Portfolio images
│   └── testimonials/    # Testimonial author images
└── favicons/            # Favicon files
```

## Getting Started

1. Clone or download this repository
2. Open `index.html` in your web browser
3. To make changes, edit the HTML, CSS, or JavaScript files as needed
4. For production, you may want to minify the CSS and JavaScript files for better performance

## Customization

### Adding Portfolio Items

To add more portfolio items, duplicate the existing portfolio item structure in the HTML and update the content:

```html
<div class="portfolio-item" data-category="category-name">
    <div class="portfolio-img">
        <img src="images/portfolio/new-image.jpg" alt="Description">
    </div>
    <div class="portfolio-info">
        <h3>Project Title</h3>
        <p>Project Description</p>
    </div>
</div>
```

### Modifying Services

To add or modify services, edit the service cards in the services section:

```html
<div class="service-card" data-aos="fade-up">
    <div class="icon-container">
        <i class="fas fa-icon-name"></i>
    </div>
    <h3>Service Name</h3>
    <p>Service description goes here</p>
    <a href="#contact" class="learn-more">Learn More</a>
</div>
```

### Changing Colors

To change the color scheme, edit the CSS variables in the `:root` selector in `styles.css`:

```css
:root {
    --primary-color: #0056b3;
    --primary-dark: #003c7e;
    --primary-light: #4d8ad6;
    --secondary-color: #ff8c00;
    --secondary-dark: #e67a00;
    --secondary-light: #ffa940;
    /* ... */
}
```

## Contact Information

For more information or to request custom changes, please contact:

**Florida Sign Solution**
- Phone: (305) 555-1234
- Email: info@floridasignsolution.com
- Address: 123 Sign Boulevard, Miami, FL 33101

## License

This project is licensed under the MIT License 