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

## Quote Request Banner (Firebase)

This site includes a compact "Get a Quote" banner that submits requests to Firestore.

To enable it:
- Open `js/firebase-config.js` and replace the placeholder values with your Firebase Web App config:

```js
window.FIREBASE_CONFIG = {
  apiKey: "<YOUR_API_KEY>",
  authDomain: "<YOUR_PROJECT_ID>.firebaseapp.com",
  projectId: "<YOUR_PROJECT_ID>",
  appId: "<YOUR_APP_ID>"
};
```

- You can find these in Firebase Console → Project Settings → General → Your Apps → SDK setup and configuration.
- Ensure Firestore is enabled in Firebase Console.

Recommended Firestore Rules (adjust for production):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quotes/{docId} {
      allow create: if true;    // Accept writes from the site
      allow read: if false;     // Keep submissions private
    }
  }
}
```

Security Note:
- Client SDK config (above) is safe to keep in a public repo.
- Do NOT commit Firebase Admin SDK service account JSON to a public repo. If you previously committed one, rotate that key in Firebase and remove it from the repository history.

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
# Florida Sign Solution (Static Site)

## Get a Quote Banner + Firestore Logging

This site adds a slim banner under the header with a "Get a Quote" button. Clicking the button logs a quote request event to Firestore. If Firebase is not configured, events are saved locally in `localStorage`.

### Client Setup

1. In Firebase Console → Project Settings → Your Apps → Add App → Web, copy the Web SDK config values.
2. Open `js/firebase-config.js` and set:
   - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
3. Optional: Enable App Check for the Web app and set `window.FIREBASE_APPCHECK_SITE_KEY` with your reCAPTCHA v3 site key.

### Firestore Rules (required for client writes)

Update Firestore rules to allow public create to `quoteRequests` with strict validation and no reads:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quoteRequests/{docId} {
      allow read: if false; // no public reads
      allow create: if
        request.resource.data.keys().hasOnly(['page','url','timestamp','userAgent','referrer']) &&
        request.resource.data.page is string &&
        request.resource.data.url is string &&
        request.resource.data.timestamp is string &&
        request.resource.data.userAgent is string &&
        request.resource.data.size() <= 6;
      allow update, delete: if false;
    }
  }
}
```

For stronger protection, enable App Check and enforce it in Firebase Console. App Check helps reduce abuse for unauthenticated client writes.

### Notes

- Do NOT use or commit Admin SDK credentials (`*.json`) on a public static site. Those are for server-side environments only.
- If you choose to require authentication instead, adjust rules to `allow create: if request.auth != null;` and add a sign-in flow.
- To inspect local fallback data, open DevTools console and run `JSON.parse(localStorage.getItem('quoteRequests') || '[]')`.
## Deploying to GitHub Pages with Firebase

This site runs as a static app on GitHub Pages. To enable quote submissions with Firebase on GitHub Pages, use the Firebase Web SDK (client-side). The Node/Express server and Firebase Admin SDK have been removed to keep the stack fully static.

### 1) Configure Firebase Web SDK (Client)
- In Firebase Console → Project settings → Your apps → Web app, copy your Web config.
- Update `js/firebase-config.js` with real values:
```
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

window.FIREBASE_APPCHECK_SITE_KEY = ""; // Optional
window.FIREBASE_MEASUREMENT_ID = "";    // Optional
```

### 2) Firestore Rules (Testing vs Production)
- Testing (looser):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quoteRequests/{docId} {
      allow create: if true; // loosen only while testing
    }
  }
}
```
- Production (example tightening): require valid fields and optionally App Check.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quoteRequests/{docId} {
      allow create: if request.time < timestamp.date(2100,1,1)
        && request.resource.data.name is string
        && (request.resource.data.email is string || request.resource.data.phone is string)
        && request.resource.data.timestamp is string;
    }
  }
}
```

### 3) Optional: App Check
- Create a reCAPTCHA v3 site key in Firebase → App Check.
- Set `window.FIREBASE_APPCHECK_SITE_KEY` in `js/firebase-config.js`.

### 4) Local Preview
- Optional: run a simple static server locally to preview the site:
  - `npm install`
  - `npm run preview` (uses `live-server` on port 5510)
  - Open `http://127.0.0.1:5510/`

### 5) Security and Git Hygiene
- This project is client-only. There is no Firebase Admin SDK or Node server.
- Keep `js/firebase-config.js` with Web SDK values; these are safe to publish.
- GitHub Pages deployment includes only static assets (`index.html`, `css/`, `js/`).

### 6) Publish to GitHub Pages
- Push your changes to the default branch (e.g., `main`).
- Enable GitHub Pages under Repository Settings → Pages → Source: `Deploy from a branch` → select the branch and root `/`.
- After Pages builds, visit your site at the provided URL.

### 6) Verify After Deploy
- Open your GitHub Pages URL.
- Click "Get a Quote", fill name + email or phone, then Send.
- Expect success toast if Web SDK config is correct and rules permit writes.
- If you see a local-save toast, update `js/firebase-config.js` with real values.