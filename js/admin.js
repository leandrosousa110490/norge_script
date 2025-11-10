document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('adminLoginForm');
  const errorBox = document.getElementById('loginError');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const refreshBtn = document.getElementById('refreshQuotesBtn');
  const quotesStatus = document.getElementById('quotesStatus');
  const quotesTableBody = document.getElementById('quotesTableBody');
  const quotesEmpty = document.getElementById('quotesEmpty');

  let activeSource = null; // 'firestore' | 'server' | 'local'
  let lastQuotes = [];

  const USERNAME = 'NORGE';
  const PASSWORD = 'NORGE';

  function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    errorBox.textContent = '';
  }

  function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    loadQuoteRequests();
  }

  // Firebase Auth integration for secure cross‑device access
  function isValidFirebaseConfig(cfg) {
    return cfg && typeof cfg === 'object' && cfg.apiKey && cfg.projectId;
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function initFirebaseAuth() {
    const cfg = window.FIREBASE_CONFIG;
    if (!isValidFirebaseConfig(cfg)) return null;
    try {
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
      if (!window.firebase) throw new Error('Firebase not available');
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      return firebase.auth();
    } catch (e) {
      console.warn('Failed to init Firebase Auth:', e);
      return null;
    }
  }

  // Restore session using Firebase Auth if available, else fall back
  (async () => {
    const auth = await initFirebaseAuth();
    if (auth) {
      auth.onAuthStateChanged((user) => {
        if (user) {
          sessionStorage.setItem('ADMIN_AUTH', 'true');
          showDashboard();
        } else {
          sessionStorage.removeItem('ADMIN_AUTH');
          showLogin();
        }
      });
    } else {
      const isAuthed = sessionStorage.getItem('ADMIN_AUTH') === 'true';
      if (isAuthed) showDashboard(); else showLogin();
    }
  })();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const credential = String(formData.get('credential') || '').trim();
    const password = String(formData.get('password') || '').trim();

    // Always allow static admin credentials, regardless of Firebase Auth availability
    if (credential === USERNAME && password === PASSWORD) {
      sessionStorage.setItem('ADMIN_AUTH', 'true');
      showDashboard();
      return;
    }

    const auth = await initFirebaseAuth();
    if (auth) {
      try {
        await auth.signInWithEmailAndPassword(credential, password);
        sessionStorage.setItem('ADMIN_AUTH', 'true');
        showDashboard();
      } catch (err) {
        console.warn('Auth sign-in failed:', err);
        errorBox.textContent = 'Login failed. Check email and password.';
      }
    } else {
      if (credential === USERNAME && password === PASSWORD) {
        sessionStorage.setItem('ADMIN_AUTH', 'true');
        showDashboard();
      } else {
        errorBox.textContent = 'Invalid credentials.';
      }
    }
  });

  logoutBtn.addEventListener('click', async () => {
    sessionStorage.removeItem('ADMIN_AUTH');
    try {
      const auth = await initFirebaseAuth();
      if (auth) await auth.signOut();
    } catch (_) {}
    showLogin();
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadQuoteRequests();
    });
  }

  // ---------- Quote fetching and rendering ----------
  const isGitHubPages = /github\.io$/.test(window.location.hostname) || !!document.querySelector('link[rel="canonical"][href*="floridasignsolution.com"]');

  async function initFirestoreClient() {
    const cfg = window.FIREBASE_CONFIG;
    if (!isValidFirebaseConfig(cfg)) return null;
    try {
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      if (!window.firebase) throw new Error('Firebase not available');
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      // Improve network compatibility behind restrictive proxies
      try {
        const dbTmp = firebase.firestore();
        dbTmp.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
      } catch (_) {}
      return firebase.firestore();
    } catch (e) {
      console.warn('Failed to init Firestore client:', e);
      return null;
    }
  }

  async function fetchFromFirestore() {
    try {
      const db = await initFirestoreClient();
      if (!db) return null;
      const snap = await db
        .collection('quoteRequests')
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn('Firestore fetch failed:', e);
      return null;
    }
  }

  async function fetchFromServer() {
    if (isGitHubPages) return null;
    const apiUrl = (window.API_URL && String(window.API_URL)) || 'http://localhost:3000/api/quotes';
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('Server responded ' + res.status);
      const data = await res.json();
      return Array.isArray(data.quotes) ? data.quotes : null;
    } catch (e) {
      console.warn('Server fetch failed:', e);
      return null;
    }
  }

  function renderQuotes(quotes) {
    quotesTableBody.innerHTML = '';
    if (!quotes || quotes.length === 0) {
      quotesEmpty.hidden = false;
      return;
    }
    quotesEmpty.hidden = true;
    quotes.forEach((q, i) => {
      const tr = document.createElement('tr');
      const td = (text) => {
        const cell = document.createElement('td');
        cell.textContent = text ?? '';
        return cell;
      };
      const linkCell = (value, kind, nameLabel) => {
        const cell = document.createElement('td');
        const s = String(value || '').trim();
        if (!s) {
          cell.textContent = '—';
          return cell;
        }
        const a = document.createElement('a');
        if (kind === 'email') {
          a.href = `mailto:${s}`;
          a.setAttribute('aria-label', `Email ${nameLabel || ''}`.trim());
        } else {
          const tel = s.replace(/[^\d+]/g, '');
          a.href = `tel:${tel}`;
          a.setAttribute('aria-label', `Call ${nameLabel || ''}`.trim());
        }
        a.textContent = s;
        a.rel = 'noopener';
        cell.appendChild(a);
        return cell;
      };
      tr.appendChild(td(q.name));
      tr.appendChild(linkCell(q.email, 'email', q.name));
      tr.appendChild(linkCell(q.phone, 'phone', q.name));
      const msgCell = td(q.message || q.details);
      msgCell.className = 'cell-message';
      tr.appendChild(msgCell);

      // Image thumbnails (if present, up to 3)
      const imgCell = document.createElement('td');
      imgCell.className = 'cell-images';
      const imgs = Array.isArray(q.images) ? q.images : (q.imageData ? [q.imageData] : []);
      const first = (imgs || []).find((src) => typeof src === 'string' && src.startsWith('data:image'));
      if (first) {
        const img = document.createElement('img');
        img.src = first;
        img.alt = 'Attached image preview';
        img.loading = 'lazy';
        imgCell.appendChild(img);
        // Count badge
        const badge = document.createElement('span');
        badge.className = 'image-count-badge';
        badge.textContent = String((imgs || []).length);
        badge.setAttribute('aria-label', `${(imgs || []).length} image(s) attached`);
        imgCell.appendChild(badge);
        // Make the whole cell clickable/focusable to open viewer
        imgCell.style.cursor = 'zoom-in';
        imgCell.setAttribute('role', 'button');
        imgCell.setAttribute('tabindex', '0');
        imgCell.setAttribute('aria-label', `View ${imgs.length} image(s)`);
        imgCell.addEventListener('click', () => openImageViewer(imgs, 0));
        imgCell.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            openImageViewer(imgs, 0);
          }
        });
      } else {
        // No images
        imgCell.textContent = '—';
      }
      tr.appendChild(imgCell);

      const dateCell = td(formatDateOnly(q.timestamp));
      tr.appendChild(dateCell);

      const actions = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.className = 'btn-danger btn-icon';
      delBtn.setAttribute('aria-label', 'Delete this quote');
      // Single-step: rely on browser confirm from handleDelete
      delBtn.addEventListener('click', () => {
        delBtn.disabled = true;
        handleDelete(q.id || null, i).finally(() => {
          delBtn.disabled = false;
        });
      });
      actions.appendChild(delBtn);
      tr.appendChild(actions);
      quotesTableBody.appendChild(tr);
    });
  }

  // Plot requests per year/month as a line chart using Plotly
  function normalizeTimestamp(ts) {
    try {
      if (!ts) return null;
      // Firestore Timestamp object
      if (typeof ts === 'object') {
        if (typeof ts.toDate === 'function') return ts.toDate();
        if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
      }
      // Numeric epoch
      if (typeof ts === 'number') {
        const val = ts < 1e12 ? ts * 1000 : ts; // seconds vs ms
        return new Date(val);
      }
      // ISO/date string
      const d = new Date(String(ts));
      if (!isNaN(d.getTime())) return d;
      return null;
    } catch (_) {
      return null;
    }
  }

  function renderQuotesChart(quotes) {
    const chartEl = document.getElementById('quotesChart');
    if (!chartEl) return;
    if (!quotes || quotes.length === 0) {
      chartEl.innerHTML = '<p class="muted">No data to chart.</p>';
      return;
    }
    if (!(window.Plotly && typeof window.Plotly.newPlot === 'function')) {
      chartEl.innerHTML = '<p class="muted">Chart library not loaded.</p>';
      return;
    }
    const counts = {};
    for (const q of quotes) {
      const d = normalizeTimestamp(q && q.timestamp);
      if (!d) continue;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      counts[ym] = (counts[ym] || 0) + 1;
    }
    const months = Object.keys(counts).sort();
    if (!months.length) {
      chartEl.innerHTML = '<p class="muted">No data to chart.</p>';
      return;
    }
    const y = months.map((m) => counts[m]);
    const x = months.map((m) => `${m}-01`); // first of month for date axis
    const data = [{
      x,
      y,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#06b6d4', width: 2 },
      marker: { color: '#06b6d4', size: 6 },
      hovertemplate: '%{x}<br>Requests: %{y}<extra></extra>'
    }];
    const layout = {
      margin: { l: 40, r: 20, t: 10, b: 40 },
      paper_bgcolor: '#111827',
      plot_bgcolor: '#0b1220',
      xaxis: { title: 'Month', type: 'date', tickformat: '%Y-%m', dtick: 'M1', gridcolor: '#1f2937' },
      yaxis: { title: 'Requests', gridcolor: '#1f2937', rangemode: 'tozero' },
      font: { color: '#e5e7eb' },
    };
    const config = { displayModeBar: false, responsive: true };
    window.Plotly.newPlot(chartEl, data, layout, config);
  }

  // Fullscreen image viewer (lightbox) for admin
  function openImageViewer(images, startIndex) {
    const imgs = Array.isArray(images) ? images.filter((s) => typeof s === 'string' && s.startsWith('data:image')) : [];
    if (!imgs.length) return;
    let index = Math.max(0, Math.min(startIndex || 0, imgs.length - 1));

    let overlay = document.getElementById('adminImageViewer');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'adminImageViewer';
      overlay.className = 'image-viewer-overlay';
      overlay.innerHTML = `
        <div class="image-viewer-content" role="dialog" aria-modal="true" aria-label="Image viewer">
          <button class="image-viewer-download" aria-label="Download">⤓</button>
          <button class="image-viewer-close" aria-label="Close">×</button>
          <button class="image-viewer-prev" aria-label="Previous">‹</button>
          <img class="image-viewer-img" alt="Quote image" />
          <button class="image-viewer-next" aria-label="Next">›</button>
          <div class="image-viewer-counter" aria-live="polite"></div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeViewer(); });
      overlay.querySelector('.image-viewer-close').addEventListener('click', closeViewer);
      document.addEventListener('keydown', keyHandler);
    }

    const prevBtn = overlay.querySelector('.image-viewer-prev');
    const nextBtn = overlay.querySelector('.image-viewer-next');
    const downloadBtn = overlay.querySelector('.image-viewer-download');
    function keyHandler(e) {
      if (!overlay || overlay.style.display !== 'flex') return;
      if (e.key === 'Escape') { closeViewer(); return; }
      if (imgs.length <= 1) return; // disable arrows when single image
      if (e.key === 'ArrowLeft') prevBtn.click();
      if (e.key === 'ArrowRight') nextBtn.click();
    }
    function update() {
      const imgEl = overlay.querySelector('.image-viewer-img');
      const counter = overlay.querySelector('.image-viewer-counter');
      imgEl.src = imgs[index];
      counter.textContent = `${index + 1} / ${imgs.length}`;
      const hasMultiple = imgs.length > 1;
      prevBtn.style.display = hasMultiple ? 'grid' : 'none';
      nextBtn.style.display = hasMultiple ? 'grid' : 'none';
    }
    function closeViewer() {
      if (overlay) overlay.style.display = 'none';
    }

    // Bind navigation handlers to current invocation
    prevBtn.onclick = () => {
      if (imgs.length <= 1) return;
      index = (index - 1 + imgs.length) % imgs.length;
      update();
    };
    nextBtn.onclick = () => {
      if (imgs.length <= 1) return;
      index = (index + 1) % imgs.length;
      update();
    };

    overlay.style.display = 'flex';
    update();
    // Bind download to current image
    downloadBtn.onclick = async () => {
      const dataUrl = imgs[index];
      const mime = (dataUrl.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg';
      const ext = (mime.split('/')[1] || 'jpeg').replace('jpeg','jpg');
      const filename = `attachment-${index + 1}.${ext}`;
      try {
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (err) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    };
  }

  function formatDateOnly(ts) {
    try {
      const d = normalizeTimestamp(ts);
      if (d && !isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      const s = String(ts || '');
      const tIndex = s.indexOf('T');
      return tIndex > 0 ? s.slice(0, tIndex) : s;
    } catch (_) {
      const s = String(ts || '');
      return s.split('T')[0];
    }
  }

  async function loadQuoteRequests() {
    quotesStatus.textContent = 'Loading…';
    let quotes = await fetchFromFirestore();
    activeSource = quotes ? 'firestore' : null;
    if (!quotes) {
      quotes = await fetchFromServer();
      activeSource = quotes ? 'server' : null;
    }

    // Show only records that exist in the actual DB and have essential fields
    quotes = (quotes || []).filter((q) => {
      const hasId = !!q && !!q.id; // ensure only DB docs
      const hasName = !!String(q?.name || '').trim();
      const hasContact = !!String(q?.email || '').trim() || !!String(q?.phone || '').trim();
      return hasId && hasName && hasContact;
    });

    lastQuotes = quotes;
    renderQuotes(quotes);
    // Update chart with current data
    try { renderQuotesChart(quotes); } catch (_) {}
    quotesStatus.textContent = `Source: ${activeSource || 'none'} | Showing ${quotes.length} request(s)`;
  }

  function ensureConfirmOverlay() {
    let overlay = document.getElementById('adminConfirmOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'adminConfirmOverlay';
    overlay.className = 'confirm-overlay';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showConfirmDialog(opts) {
    const overlay = ensureConfirmOverlay();
    overlay.innerHTML = `
      <div class="confirm-dialog" role="dialog" aria-modal="true" aria-label="Confirm deletion">
        <h3 style="margin:0 0 8px;font-size:16px">${opts?.title || 'Delete this request?'}</h3>
        <p class="muted" style="margin:0 0 12px">${opts?.message || 'This action cannot be undone.'}</p>
        <div class="confirm-actions">
          <button class="btn-danger" id="confirmDeleteBtn">${opts?.confirmText || 'Delete'}</button>
          <button class="secondary" id="confirmCancelBtn">${opts?.cancelText || 'Cancel'}</button>
        </div>
      </div>`;
    overlay.classList.add('show');
    return new Promise((resolve) => {
      const onCancel = () => { cleanup(); resolve(false); };
      const onConfirm = () => { cleanup(); resolve(true); };
      const cleanup = () => {
        overlay.classList.remove('show');
        overlay.innerHTML = '';
        overlay.removeEventListener('click', backdropClick);
        document.removeEventListener('keydown', onKeyDown);
      };
      const backdropClick = (e) => {
        if (e.target === overlay) onCancel();
      };
      const onKeyDown = (e) => {
        if (e.key === 'Escape') onCancel();
      };
      overlay.addEventListener('click', backdropClick);
      document.addEventListener('keydown', onKeyDown);
      const del = overlay.querySelector('#confirmDeleteBtn');
      const cancel = overlay.querySelector('#confirmCancelBtn');
      if (cancel) cancel.onclick = onCancel;
      if (del) del.onclick = onConfirm;
      if (del) del.focus();
    });
  }

  async function handleDelete(id, index) {
    const ok = await showConfirmDialog({ title: 'Delete this request?', message: 'Are you sure you want to delete this quote request?' });
    if (!ok) return;
    quotesStatus.textContent = 'Deleting…';
    try {
      if (activeSource === 'firestore') {
        const db = await initFirestoreClient();
        if (!db || !id) throw new Error('Missing Firestore or id');
        await db.collection('quoteRequests').doc(id).delete();
      } else if (activeSource === 'server') {
        if (!id) throw new Error('Missing id for server delete');
        const apiBase = (window.API_URL && String(window.API_URL)) || 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Server responded ' + res.status);
      } else {
        throw new Error('No database source available');
      }
      await loadQuoteRequests();
      quotesStatus.textContent = 'Deleted.';
    } catch (e) {
      console.warn('Delete failed:', e);
      quotesStatus.textContent = 'Delete failed.';
      alert('Unable to delete this quote.');
    }
  }
});