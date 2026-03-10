document.addEventListener('DOMContentLoaded', function () {
  const ENABLE_LEGACY_QUOTE_BANNER = false;
  // Insert a slim banner under the header navbar across all pages
  function injectBanner() {
    if (!ENABLE_LEGACY_QUOTE_BANNER) return false;
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
  if (ENABLE_LEGACY_QUOTE_BANNER && !injectBanner()) {
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
      .quote-modal-overlay{position:fixed;inset:0;background:radial-gradient(circle at 20% 20%,rgba(15,123,255,.26),rgba(0,0,0,.76));backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:1050;padding:14px}
      .quote-modal-overlay.show{display:flex;animation:quoteModalFadeIn .24s ease-out both}
      .quote-modal-overlay.show .quote-modal{animation:quoteModalCardIn .28s cubic-bezier(.2,.8,.2,1) both}
      .quote-modal-overlay.is-closing{display:flex;animation:quoteModalFadeOut .2s ease-in both}
      .quote-modal-overlay.is-closing .quote-modal{animation:quoteModalCardOut .2s ease-in both}
      @keyframes quoteModalFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes quoteModalFadeOut{from{opacity:1}to{opacity:0}}
      @keyframes quoteModalCardIn{from{transform:translateY(20px) scale(.96);opacity:.2}to{transform:translateY(0) scale(1);opacity:1}}
      @keyframes quoteModalCardOut{from{transform:translateY(0) scale(1);opacity:1}to{transform:translateY(16px) scale(.97);opacity:.1}}
      .quote-modal{background:linear-gradient(170deg,#ffffff,#f4f9ff 62%,#eef5ff);width:min(620px,96vw);border-radius:18px;box-shadow:0 24px 48px rgba(0,0,0,.28);overflow:hidden;border:1px solid rgba(26,118,232,.22)}
      .quote-modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:15px 16px;border-bottom:1px solid rgba(16,106,216,.16);background:linear-gradient(135deg,#0f7bff,#00b6ff)}
      .quote-modal-title-wrap{display:flex;align-items:flex-start;gap:10px;color:#fff}
      .quote-modal-title-icon{width:34px;height:34px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.24);box-shadow:0 8px 20px rgba(6,48,102,.35)}
      .quote-modal-title-icon i{font-size:16px}
      .quote-modal-header h5{margin:0;color:#fff;font-size:1.04rem}
      .quote-modal-header p{margin:2px 0 0;font-size:.78rem;opacity:.92}
      .quote-modal-body{padding:16px}
      .quote-modal-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
      .quote-modal-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid rgba(12,102,214,.2);background:rgba(255,255,255,.84);font-size:.74rem;font-weight:700;color:#17447a}
      .quote-modal form .form-label{font-weight:700;color:#214873;font-size:.88rem}
      .quote-modal .form-control{border-radius:12px;border:1px solid rgba(15,123,255,.22);background:rgba(255,255,255,.9)}
      .quote-modal .form-control:focus{border-color:rgba(15,123,255,.56);box-shadow:0 0 0 .2rem rgba(15,123,255,.16)}
      .quote-modal-close{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);font-size:22px;line-height:1;cursor:pointer;color:#fff}
      .quote-modal-close:hover{background:rgba(255,255,255,.32)}
      .quote-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
      .quote-modal-actions .btn{border-radius:999px;font-weight:700;padding:.54rem 1.05rem}
      #quoteSubmitBtn{background:linear-gradient(135deg,#0f7bff,#00b4ff);border:none;box-shadow:0 10px 18px rgba(7,70,153,.3)}
      #quoteSubmitBtn:hover{transform:translateY(-1px)}
      #quoteCancelBtn{border:1px solid rgba(12,82,171,.24)}
      @media (max-width:576px){.quote-modal{width:96vw}.quote-modal-title-wrap{gap:8px}.quote-modal-chip{font-size:.7rem}}
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
          <div class="quote-modal-title-wrap">
            <span class="quote-modal-title-icon"><i class="bi bi-stars"></i></span>
            <div>
              <h5 id="quoteModalTitle" class="m-0">Request a Quote</h5>
              <p>Share your sign details and get a fast estimate.</p>
            </div>
          </div>
          <button type="button" class="quote-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="quote-modal-body">
          <div class="quote-modal-chip-row">
            <span class="quote-modal-chip"><i class="bi bi-lightning-fill"></i> Fast response</span>
            <span class="quote-modal-chip"><i class="bi bi-shield-check"></i> Licensed & insured</span>
            <span class="quote-modal-chip"><i class="bi bi-building-check"></i> Florida-wide service</span>
          </div>
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
    if (overlay._closeTimer) {
      clearTimeout(overlay._closeTimer);
      overlay._closeTimer = null;
    }
    overlay.classList.remove('is-closing');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    // Autofocus name field for convenience
    const nameInput = overlay.querySelector('#quoteName');
    if (nameInput) nameInput.focus();
  }

  function closeQuoteModal() {
    const overlay = document.getElementById('quoteModal');
    if (!overlay || !overlay.classList.contains('show')) return;
    overlay.classList.add('is-closing');
    if (overlay._closeTimer) {
      clearTimeout(overlay._closeTimer);
    }
    overlay._closeTimer = setTimeout(function () {
      overlay.classList.remove('show', 'is-closing');
      overlay._closeTimer = null;
    }, 210);
    document.body.style.overflow = '';
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

  async function submitQuoteViaFallback(payload, reason) {
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
          showToast('Quote request sent. We will contact you soon!', 'success');
          closeQuoteModal();
          return true;
        }
        const text = await res.text();
        throw new Error('Server error ' + res.status + ' ' + text);
      } catch (serverErr) {
        console.warn('Server submission failed, falling back to local storage:', serverErr);
      }
    }

    // Local fallback if server is disabled (GitHub Pages) or unreachable
    try {
      const existing = JSON.parse(localStorage.getItem('quoteRequests') || '[]');
      existing.push(payload);
      localStorage.setItem('quoteRequests', JSON.stringify(existing));

      if (reason && String(reason.code || '').toLowerCase() === 'permission-denied') {
        showToast('Saved locally because Firebase write is blocked by rules.', 'warning');
      } else {
        const hint = isGitHubPages
          ? 'Saved locally. Configure Firebase Web SDK for GitHub Pages to enable sending.'
          : 'Saved locally. Configure Firebase or start server to enable sending.';
        showToast(hint, 'warning');
      }
      closeQuoteModal();
      return true;
    } catch (e) {
      console.warn('Local storage logging failed:', e);
      alert('Quote request recorded. Configure Firebase Web SDK or start server to enable sending.');
      closeQuoteModal();
      return false;
    }
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
        return;
      } catch (e) {
        console.error('Firestore write error:', e);
        const code = String((e && e.code) || '').toLowerCase();
        if (
          code === 'permission-denied' &&
          (
            quoteFirebaseAuthWarmupErrorCode.includes('operation-not-allowed') ||
            quoteFirebaseAuthWarmupErrorCode.includes('admin-restricted-operation') ||
            quoteFirebaseAuthWarmupErrorCode.includes('configuration-not-found')
          )
        ) {
          showToast('Firebase Anonymous Auth is not configured. Saving with fallback.', 'warning');
          await submitQuoteViaFallback(payload, e);
          return;
        }
        const usedFallback = await submitQuoteViaFallback(payload, e);
        if (usedFallback) return;
        const msg = (code === 'permission-denied')
          ? 'Permission denied. Update Firestore rules or enable App Check.'
          : 'Unable to send now. Please try again later.';
        showToast(msg, 'error');
        return;
      }
    }

    await submitQuoteViaFallback(payload, null);
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

  async function dataUrlToCanvas(dataUrl, maxW = 800, maxH = 800) {
    return new Promise((resolve, reject) => {
      const img = new Image();
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

  async function compressCanvasToDataUrl(canvas, quality) {
    try {
      return canvas.toDataURL('image/jpeg', quality);
    } catch (e) {
      // Fallback to PNG if JPEG fails
      return canvas.toDataURL('image/png');
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

    const initial = await readFileAsDataURL(file);
    let quality = config.initialQuality;
    let maxW = config.maxW;
    let maxH = config.maxH;
    let attempts = 0;
    let out = '';
    while (attempts < 6) {
      const canvas = await dataUrlToCanvas(initial, maxW, maxH);
      out = await compressCanvasToDataUrl(canvas, quality);
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
        console.warn('Skipping too-large image:', e);
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

  let quoteFirebaseAuthWarmupPromise = null;
  let quoteFirebaseAuthWarmupErrorCode = '';

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(script);
    });
  }

  // Dynamically load Firebase libraries (compat for simplicity)
  async function loadFirebaseLibs() {
    await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
    await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
    await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
    // Load App Check only if configured (non-critical if missing)
    if (hasValidAppCheckKey()) {
      try {
        await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js');
      } catch (_) {}
    } else if (window.FIREBASE_APPCHECK_SITE_KEY) {
      console.warn('App Check site key is a placeholder. Skipping App Check.');
    }
  }

  async function ensureFirebaseAuthSession() {
    if (!window.firebase || typeof window.firebase.auth !== 'function') return false;
    if (!quoteFirebaseAuthWarmupPromise) {
      quoteFirebaseAuthWarmupPromise = (async () => {
        try {
          quoteFirebaseAuthWarmupErrorCode = '';
          const auth = window.firebase.auth();
          if (auth.currentUser) return true;
          await auth.signInAnonymously();
          return true;
        } catch (e) {
          quoteFirebaseAuthWarmupErrorCode = String((e && (e.code || e.name)) || '').toLowerCase();
          console.warn('Quote auth warmup failed:', e);
          return false;
        }
      })();
    }
    return quoteFirebaseAuthWarmupPromise;
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
      await ensureFirebaseAuthSession();
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

  function isQuoteTriggerElement(target) {
    if (!target) return false;
    if (target.matches('#getQuoteBtn, .get-quote-btn, [data-quote-trigger]')) {
      return true;
    }

    const textBlob = [
      target.textContent,
      target.getAttribute('aria-label'),
      target.getAttribute('title'),
      target.value
    ].filter(Boolean).join(' ').toLowerCase();

    if (!/\bquote\b/.test(textBlob)) {
      return false;
    }

    if (target.matches('button, [role="button"]')) {
      return true;
    }

    if (target.tagName === 'A') {
      const href = String(target.getAttribute('href') || '').trim().toLowerCase();
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return false;
      }
      return href === 'contact.html' || href.endsWith('/contact.html') || href.startsWith('contact.html#') || href === '#quote' || href === '#get-quote';
    }

    return false;
  }

  // Event delegation ensures quote triggers work even when content is re-rendered.
  document.addEventListener('click', function (e) {
    const target = e.target.closest('button, a, [role="button"]');
    if (!isQuoteTriggerElement(target)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    handleQuoteClick();
  });
});
