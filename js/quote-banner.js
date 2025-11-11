document.addEventListener('DOMContentLoaded', function () {
  // Insert a slim banner under the header navbar across all pages
  function injectBanner() {
    if (document.querySelector('.quote-banner')) return true; // already injected
    const navbar = document.querySelector('nav.navbar');
    if (!navbar) return false;
    const banner = document.createElement('div');
    banner.className = 'quote-banner';
    banner.innerHTML = `
      <div class="container d-flex justify-content-center">
        <button id="getQuoteBtn" type="button" class="btn btn-primary get-quote-btn" aria-label="Get a Quote">
          Get a Quote
        </button>
      </div>
    `;
    navbar.insertAdjacentElement('afterend', banner);
    // Attach a direct click handler to be extra robust
    const btn = banner.querySelector('#getQuoteBtn');
    if (btn) {
      btn.addEventListener('click', function(){
        handleQuoteClick();
      });
    }
    return true;
  }

  // Try immediate inject, then observe for late-loaded headers
  if (!injectBanner()) {
    const observer = new MutationObserver(() => {
      if (injectBanner()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Safety: stop observing after 10s
    setTimeout(() => observer.disconnect(), 10000);
  }

  // Simple toast/notification helper
  function ensureToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      // Ensure the toast is visible on all pages
      container.style.position = 'fixed';
      container.style.top = '80px'; // below navbar
      container.style.right = '16px';
      container.style.zIndex = '2000';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.padding = '0.75rem 1rem';
    toast.style.borderRadius = '6px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
    toast.style.background = type === 'error' ? '#fff1f0' : type === 'warning' ? '#fff8e1' : '#e8f5e9';
    toast.style.border = '1px solid ' + (type === 'error' ? '#ffe0e0' : type === 'warning' ? '#ffe8b3' : '#c8e6c9');
    toast.style.color = '#333';
    toast.style.pointerEvents = 'auto';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 300ms';
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  }

  // Ensure modal styles are available (injected once)
  function ensureQuoteModalStyles() {
    if (document.getElementById('quote-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'quote-modal-styles';
    style.textContent = `
      .quote-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:1050}
      .quote-modal-overlay.show{display:flex}
      .quote-modal{background:#fff;width:min(560px,92vw);border-radius:8px;box-shadow:0 8px 16px rgba(0,0,0,.1);overflow:hidden}
      .quote-modal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #eee}
      .quote-modal-body{padding:16px}
      .quote-modal-close{background:transparent;border:none;font-size:22px;line-height:1;cursor:pointer}
      .quote-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
      @media (max-width:576px){.quote-modal{width:94vw}}
    `;
    document.head.appendChild(style);
  }

  // Quote modal: create on demand and manage open/close
  function ensureQuoteModal() {
    ensureQuoteModalStyles();
    let overlay = document.getElementById('quoteModal');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'quoteModal';
    overlay.className = 'quote-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'quoteModalTitle');
    overlay.innerHTML = `
      <div class="quote-modal">
        <div class="quote-modal-header">
          <h5 id="quoteModalTitle" class="m-0">Request a Quote</h5>
          <button type="button" class="quote-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="quote-modal-body">
          <form id="quoteForm">
            <div class="mb-3">
              <label for="quoteName" class="form-label">Name</label>
              <input type="text" id="quoteName" class="form-control" placeholder="Your name" required>
            </div>
            <div class="mb-3">
              <label for="quoteEmail" class="form-label">Email</label>
              <input type="email" id="quoteEmail" class="form-control" placeholder="you@example.com">
            </div>
            <div class="mb-3">
              <label for="quotePhone" class="form-label">Phone</label>
              <input type="tel" id="quotePhone" class="form-control" placeholder="(555) 123-4567">
            </div>
            <div class="mb-3">
              <label for="quoteMessage" class="form-label">Project details</label>
              <textarea id="quoteMessage" class="form-control" rows="4" placeholder="Describe your sign needs..."></textarea>
            </div>
            <div class="mb-3">
              <label for="quoteImages" class="form-label">Attach pictures (optional, up to 3)</label>
              <input type="file" id="quoteImages" class="form-control" accept="image/*" multiple />
              <small class="form-text text-muted">We store compressed images directly in the database, not Storage.</small>
              <div id="quoteImagesError" class="form-text" style="color:#dc2626; display:none;">Please select up to 3 images.</div>
            </div>
            <div class="quote-modal-actions">
              <button type="button" class="btn btn-secondary" id="quoteCancelBtn">Cancel</button>
              <button type="submit" class="btn btn-primary" id="quoteSubmitBtn">Send Request</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const closeBtn = overlay.querySelector('.quote-modal-close');
    const cancelBtn = overlay.querySelector('#quoteCancelBtn');
    const form = overlay.querySelector('#quoteForm');
    const imagesInput = overlay.querySelector('#quoteImages');
    const imagesError = overlay.querySelector('#quoteImagesError');
    const submitBtn = overlay.querySelector('#quoteSubmitBtn');
    closeBtn.addEventListener('click', closeQuoteModal);
    cancelBtn.addEventListener('click', closeQuoteModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeQuoteModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeQuoteModal();
    });
    form.addEventListener('submit', submitQuoteForm);

    // Enforce max 3 images at selection time
    if (imagesInput) {
      imagesInput.addEventListener('change', function () {
        const count = imagesInput.files ? imagesInput.files.length : 0;
        if (count > 3) {
          if (imagesError) {
            imagesError.style.display = 'block';
            imagesError.textContent = `Please select up to 3 images. You selected ${count}.`;
          }
          if (submitBtn) submitBtn.disabled = true;
        } else {
          if (imagesError) imagesError.style.display = 'none';
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
    return overlay;
  }

  function openQuoteModal() {
    const overlay = ensureQuoteModal();
    overlay.classList.add('show');
    // Autofocus name field for convenience
    const nameInput = overlay.querySelector('#quoteName');
    if (nameInput) nameInput.focus();
  }

  function closeQuoteModal() {
    const overlay = document.getElementById('quoteModal');
    if (overlay) overlay.classList.remove('show');
  }

  async function submitQuoteForm(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#quoteName').value.trim();
    const email = form.querySelector('#quoteEmail').value.trim();
    const phone = form.querySelector('#quotePhone').value.trim();
    const message = form.querySelector('#quoteMessage').value.trim();
    const imageFiles = Array.from(form.querySelector('#quoteImages')?.files || []).slice(0, 3);

    // Guard: prevent submit if user selected more than 3 images
    const selectedCount = (form.querySelector('#quoteImages')?.files?.length) || 0;
    if (selectedCount > 3) {
      showToast('Please select up to 3 images.', 'error');
      return;
    }

    if (!name || (!email && !phone)) {
      showToast('Please enter your name and email or phone.', 'error');
      return;
    }

    const submitBtn = form.querySelector('#quoteSubmitBtn');
    const prevText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    let images = [];
    if (imageFiles.length) {
      try {
        images = await prepareImages(imageFiles);
      } catch (imgErr) {
        console.warn('Image processing failed:', imgErr);
        showToast('Could not process some images. Sending what we can.', 'warning');
      }
    }

    await processQuoteRequest({ name, email: email || null, phone: phone || null, message: message || null, images });

    submitBtn.disabled = false;
    submitBtn.textContent = prevText;
  }

  async function processQuoteRequest(details) {
    const db = await initFirestore();
    const payload = {
      ...details,
      page: window.location.pathname || 'index.html',
      url: window.location.href,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    if (db) {
      try {
        await db.collection('quoteRequests').add(payload);
        showToast('Quote request sent. We will contact you soon!', 'success');
        closeQuoteModal();
      } catch (e) {
        console.error('Firestore write error:', e);
        const msg = (e && e.code === 'permission-denied')
          ? 'Permission denied. Update Firestore rules or enable App Check.'
          : 'Unable to send now. Please try again later.';
        showToast(msg, 'error');
      }
    } else {
      // Detect GitHub Pages and decide whether to use server fallback
      const isGitHubPages = /github\.io$/.test(window.location.hostname);
      const apiUrl = window.API_URL || 'http://localhost:3000/api/quote';
      const canUseServer = !isGitHubPages && !!apiUrl;

      if (canUseServer) {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            showToast('Quote request sent via server. We will contact you soon!', 'success');
            closeQuoteModal();
            return;
          } else {
            const text = await res.text();
            throw new Error('Server error ' + res.status + ' ' + text);
          }
        } catch (serverErr) {
          console.warn('Server submission failed, falling back to local storage:', serverErr);
        }
      }

      // Local fallback if server is disabled (GitHub Pages) or unreachable
      try {
        const existing = JSON.parse(localStorage.getItem('quoteRequests') || '[]');
        existing.push(payload);
        localStorage.setItem('quoteRequests', JSON.stringify(existing));
        const hint = isGitHubPages
          ? 'Saved locally. Configure Firebase Web SDK for GitHub Pages to enable sending.'
          : 'Saved locally. Configure Firebase or start server to enable sending.';
        showToast(hint, 'warning');
        closeQuoteModal();
      } catch (e) {
        console.warn('Local storage logging failed:', e);
        alert('Quote request recorded. Configure Firebase Web SDK or start server to enable sending.');
        closeQuoteModal();
      }
    }
  }

  // Image helpers: read, resize, and compress to keep under Firestore doc limits
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Try decoding images using createImageBitmap first (better support, fixes EXIF orientation),
  // and fall back to <img src="data:"> when unavailable.
  async function fileToCanvas(file, maxW = 800, maxH = 800) {
    // Preferred path: createImageBitmap (handles more formats on mobile like HEIC/HEIF)
    if (typeof createImageBitmap === 'function') {
      try {
        // imageOrientation honors EXIF rotation automatically where supported
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
        const width = Math.floor(bitmap.width * ratio);
        const height = Math.floor(bitmap.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, width, height);
        try { bitmap.close && bitmap.close(); } catch (_) {}
        return canvas;
      } catch (_) {
        // Fall through to data URL decode
      }
    }
    // Fallback: decode via <img src="data:"> using FileReader
    const dataUrl = await readFileAsDataURL(file);
    return dataUrlToCanvas(dataUrl, maxW, maxH);
  }

  async function dataUrlToCanvas(dataUrl, maxW = 800, maxH = 800) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Not strictly necessary for data URLs, but harmless
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function pickTargetMime(fileType) {
    const t = String(fileType || '').toLowerCase();
    // Prefer PNG for formats that benefit from lossless or may have transparency
    if (/(png|gif|bmp|tiff|webp)/.test(t)) return 'image/png';
    // Default to JPEG for camera photos (jpeg/heic/heif)
    return 'image/jpeg';
  }

  async function compressCanvasToDataUrl(canvas, quality, targetMime) {
    try {
      if (targetMime === 'image/png') {
        return canvas.toDataURL('image/png');
      }
      return canvas.toDataURL('image/jpeg', quality);
    } catch (_) {
      try {
        return canvas.toDataURL('image/png');
      } catch (e2) {
        // Final fallback to a slightly lower JPEG quality
        return canvas.toDataURL('image/jpeg', Math.max(0.6, (quality || 0.75) - 0.2));
      }
    }
  }

  async function prepareImageData(file, cfg) {
    // Adaptive compression based on number of images
    const config = Object.assign({
      maxW: 800,
      maxH: 800,
      initialQuality: 0.75,
      minQuality: 0.6,
      perImageLimit: 300 * 1024 // characters (base64 length)
    }, cfg || {});
    const targetMime = pickTargetMime(file && file.type);
    let quality = config.initialQuality;
    let maxW = config.maxW;
    let maxH = config.maxH;
    let attempts = 0;
    let out = '';
    while (attempts < 6) {
      let canvas;
      try {
        canvas = await fileToCanvas(file, maxW, maxH);
      } catch (decodeErr) {
        // If the browser cannot decode this format to canvas, try storing the original data URL
        try {
          const initial = await readFileAsDataURL(file);
          if (typeof initial === 'string' && initial.length <= config.perImageLimit) {
            return initial; // Store as-is (e.g., HEIC on Safari)
          }
        } catch (_) {}
        throw decodeErr;
      }
      out = await compressCanvasToDataUrl(canvas, quality, targetMime);
      if (out.length <= config.perImageLimit) break;
      // Reduce quality first, then dimensions if needed
      if (quality > config.minQuality) {
        quality = Math.max(config.minQuality, quality - 0.08);
      } else {
        maxW = Math.floor(maxW * 0.88);
        maxH = Math.floor(maxH * 0.88);
      }
      attempts++;
    }
    if (out.length > config.perImageLimit) {
      throw new Error('Image too large after compression');
    }
    return out;
  }

  async function prepareImages(files) {
    const picked = files.slice(0, 3);
    const count = picked.length;
    // Adaptive settings: higher quality when fewer images
    const cfgByCount = (
      count === 1 ? { maxW: 1600, maxH: 1600, initialQuality: 0.88, minQuality: 0.72, perImageLimit: 900 * 1024 } :
      count === 2 ? { maxW: 1200, maxH: 1200, initialQuality: 0.82, minQuality: 0.68, perImageLimit: 450 * 1024 } :
                    { maxW: 900,  maxH: 900,  initialQuality: 0.75, minQuality: 0.60, perImageLimit: 300 * 1024 }
    );
    const results = [];
    for (const f of picked) {
      try {
        const data = await prepareImageData(f, cfgByCount);
        results.push(data);
      } catch (e) {
        console.warn('Skipping unsupported/too-large image:', e);
      }
    }
    return results;
  }

  // Helper: validate App Check site key (skip placeholders)
  function hasValidAppCheckKey() {
    const key = window.FIREBASE_APPCHECK_SITE_KEY;
    return typeof key === 'string' && key.trim() && !/REPLACE/i.test(key);
  }

  // Helper: validate Firebase Web SDK config (skip placeholders/incomplete)
  function hasValidFirebaseConfig() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || typeof cfg !== 'object') return false;
    const required = ['apiKey', 'projectId', 'appId', 'messagingSenderId'];
    for (const k of required) {
      const v = cfg[k];
      if (!v || String(v).trim() === '' || /REPLACE/i.test(String(v))) {
        return false;
      }
    }
    return true;
  }

  // Dynamically load Firebase libraries (compat for simplicity)
  function loadFirebaseLibs() {
    return new Promise((resolve, reject) => {
      if (window.firebase && window.firebase.firestore) {
        resolve();
        return;
      }
      const appScript = document.createElement('script');
      const firestoreScript = document.createElement('script');
      const appCheckScript = document.createElement('script');
      appScript.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
      firestoreScript.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js';
      appCheckScript.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js';
      appScript.onload = () => {
        firestoreScript.onload = () => {
          // Load App Check only if configured (non-critical if missing)
          if (hasValidAppCheckKey()) {
            appCheckScript.onload = () => resolve();
            appCheckScript.onerror = () => resolve();
            document.head.appendChild(appCheckScript);
          } else {
            if (window.FIREBASE_APPCHECK_SITE_KEY) {
              console.warn('App Check site key is a placeholder. Skipping App Check.');
            }
            resolve();
          }
        };
        firestoreScript.onerror = reject;
        document.head.appendChild(firestoreScript);
      };
      appScript.onerror = reject;
      document.head.appendChild(appScript);
    });
  }

  async function initFirestore() {
    try {
      await loadFirebaseLibs();
      if (!hasValidFirebaseConfig()) {
        console.warn('Firebase config is missing or has placeholders. Falling back to local logging.');
        return null;
      }
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      // Improve network compatibility (proxies, older browsers) by forcing long polling
      try {
        const dbTmp = window.firebase.firestore();
        dbTmp.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
      } catch (e) {
        // settings must be applied before first use; if this throws, we'll still return db
      }
      // Activate App Check if a valid key is provided
      if (hasValidAppCheckKey() && window.firebase.appCheck) {
        try {
          window.firebase.appCheck().activate(window.FIREBASE_APPCHECK_SITE_KEY);
        } catch (e) {
          console.warn('App Check activation failed:', e);
        }
      }
      return window.firebase.firestore();
    } catch (err) {
      console.error('Failed to load Firebase libraries:', err);
      return null;
    }
  }

  function handleQuoteClick() {
    openQuoteModal();
  }

  // Event delegation ensures clicks work even if the button is re-rendered
  document.addEventListener('click', function (e) {
    const target = e.target.closest('#getQuoteBtn');
    if (target) {
      handleQuoteClick();
    }
  });
});