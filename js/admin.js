document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('adminLoginForm');
  const errorBox = document.getElementById('loginError');
  const loginSuccess = document.getElementById('loginSuccess');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const refreshBtn = document.getElementById('refreshQuotesBtn');
  const quotesStatus = document.getElementById('quotesStatus');
  const quotesTableBody = document.getElementById('quotesTableBody');
  const quotesEmpty = document.getElementById('quotesEmpty');
  const requestListSection = document.getElementById('requestListSection');
  const requestDetailSection = document.getElementById('requestDetailSection');
  const requestDetailBackBtn = document.getElementById('requestDetailBackBtn');
  const requestDetailViewedBadge = document.getElementById('requestDetailViewedBadge');
  const requestDetailTitle = document.getElementById('requestDetailTitle');
  const detailName = document.getElementById('detailName');
  const detailTimestamp = document.getElementById('detailTimestamp');
  const detailEmail = document.getElementById('detailEmail');
  const detailPhone = document.getElementById('detailPhone');
  const detailMessage = document.getElementById('detailMessage');
  const detailImages = document.getElementById('detailImages');
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');

  let activeSource = null; // 'firestore' | 'server' | 'local'
  let lastQuotes = [];
  let authWarmupPromise = null;
  let authWarmupErrorCode = '';
  let selectedRequest = null;
  const VIEWED_STORAGE_KEY = 'ADMIN_VIEWED_QUOTES';
  let viewedRequestIds = loadViewedRequestIds();

  function loadViewedRequestIds() {
    try {
      const raw = JSON.parse(localStorage.getItem(VIEWED_STORAGE_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw.map((x) => String(x)) : []);
    } catch (_) {
      return new Set();
    }
  }

  function saveViewedRequestIds() {
    try {
      localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(Array.from(viewedRequestIds)));
    } catch (_) {}
  }

  function getRequestId(q) {
    return String((q && q.id) || '').trim();
  }

  function isRequestViewed(q) {
    if (!q) return false;
    if (q.viewedAt) return true;
    const id = getRequestId(q);
    return !!(id && viewedRequestIds.has(id));
  }

  function statusPillHtml(isViewed) {
    return `<span class="request-status-pill ${isViewed ? 'viewed' : 'new'}">${isViewed ? 'Viewed' : 'New'}</span>`;
  }

  function contactIconSvg(kind) {
    if (kind === 'email') {
      return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Zm1.89-.25L12 12.11 19.11 6.5H4.89Zm14.61 1.92-7.04 5.56a.75.75 0 0 1-.92 0L4.5 8.42v8.83c0 .41.34.75.75.75h14.5c.41 0 .75-.34.75-.75V8.42Z" fill="currentColor"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.62 2.75A2.25 2.25 0 0 1 8.77 4.4l.62 2.23a2.25 2.25 0 0 1-.55 2.15l-1.1 1.1a14.26 14.26 0 0 0 6.38 6.38l1.1-1.1a2.25 2.25 0 0 1 2.15-.55l2.23.62a2.25 2.25 0 0 1 1.65 2.15V20A2.25 2.25 0 0 1 19 22.25h-1C9.03 22.25 1.75 14.97 1.75 6v-1A2.25 2.25 0 0 1 4 2.75h2.62Z" fill="currentColor"/></svg>';
  }

  function createContactIconLink(kind, href, label) {
    const a = document.createElement('a');
    a.className = 'contact-icon-link';
    a.href = href;
    a.setAttribute('aria-label', label);
    a.title = label;
    a.innerHTML = contactIconSvg(kind);
    return a;
  }

  function getQuoteImages(q) {
    const arr = Array.isArray(q?.images) ? q.images : (q?.imageData ? [q.imageData] : []);
    return arr.filter((src) => typeof src === 'string' && src.startsWith('data:image'));
  }

  function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    errorBox.textContent = '';
  }

  function showDashboard(user) {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    if (loginSuccess) {
      const label = (user && user.username) ? user.username : (sessionStorage.getItem('ADMIN_AUTH_USER') || 'admin');
      loginSuccess.textContent = 'Authenticated as ' + label + '.';
    }
    showRequestList();
    loadQuoteRequests();
  }

  function showRequestList() {
    if (requestListSection) requestListSection.hidden = false;
    if (requestDetailSection) requestDetailSection.hidden = true;
  }

  function updateQuotesStatusSummary() {
    if (!quotesStatus) return;
    const total = Array.isArray(lastQuotes) ? lastQuotes.length : 0;
    const newCount = (Array.isArray(lastQuotes) ? lastQuotes : []).filter((q) => !isRequestViewed(q)).length;
    quotesStatus.textContent = `Source: ${activeSource || 'none'} | ${total} request(s) | ${newCount} new`;
  }

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

  async function ensureFirebaseAuthSession() {
    if (!window.firebase || typeof firebase.auth !== 'function') return false;
    if (!authWarmupPromise) {
      authWarmupPromise = (async () => {
        try {
          authWarmupErrorCode = '';
          const auth = firebase.auth();
          if (auth.currentUser) return true;
          await auth.signInAnonymously();
          return true;
        } catch (e) {
          authWarmupErrorCode = String((e && (e.code || e.name)) || '').toLowerCase();
          console.warn('Anonymous auth warmup failed:', e);
          return false;
        }
      })();
    }
    return authWarmupPromise;
  }

  async function initFirestoreClient() {
    const cfg = window.FIREBASE_CONFIG;
    if (!isValidFirebaseConfig(cfg)) return null;
    try {
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      const appCheckKey = String(window.FIREBASE_APPCHECK_SITE_KEY || '').trim();
      if (appCheckKey) {
        try {
          await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js');
        } catch (_) {}
      }
      if (!window.firebase) throw new Error('Firebase not available');
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      await ensureFirebaseAuthSession();
      if (appCheckKey) {
        try {
          const appCheck = firebase.appCheck();
          appCheck.activate(appCheckKey, true);
        } catch (e) {
          console.warn('App Check activation failed:', e);
        }
      }
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

  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
  }

  function timingSafeEqual(a, b) {
    const x = String(a || '');
    const y = String(b || '');
    let mismatch = x.length ^ y.length;
    const len = Math.min(x.length, y.length);
    for (let i = 0; i < len; i++) {
      mismatch |= x.charCodeAt(i) ^ y.charCodeAt(i);
    }
    return mismatch === 0;
  }

  function base64ToBytes(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function bytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  async function derivePasswordHash(password, saltB64, iterations, digest) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API unavailable in this browser.');
    }
    const material = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: base64ToBytes(saltB64),
        iterations: Number(iterations) || 210000,
        hash: String(digest || 'SHA-256')
      },
      material,
      256
    );
    return bytesToBase64(new Uint8Array(bits));
  }

  async function verifyAdminCredential(username, password) {
    const usernameKey = normalizeUsername(username);
    if (!usernameKey || !password) {
      return { ok: false, message: 'Enter username and password.' };
    }

    const db = await initFirestoreClient();
    if (!db) {
      return { ok: false, message: 'Unable to connect to admin database.' };
    }

    try {
      await ensureFirebaseAuthSession();
      const doc = await db.collection('adminUsers').doc(usernameKey).get();
      if (!doc.exists) {
        return { ok: false, message: 'Invalid username or password.' };
      }

      const data = doc.data() || {};
      if (data.isActive === false) {
        return { ok: false, message: 'This admin account is disabled.' };
      }

      const passwordHash = String(data.passwordHash || '');
      const passwordSalt = String(data.passwordSalt || '');
      if (!passwordHash || !passwordSalt) {
        return { ok: false, message: 'Admin account is missing password setup.' };
      }

      const computed = await derivePasswordHash(password, passwordSalt, data.iterations, data.digest);
      if (!timingSafeEqual(computed, passwordHash)) {
        return { ok: false, message: 'Invalid username or password.' };
      }

      return {
        ok: true,
        user: {
          username: String(data.username || usernameKey)
        }
      };
    } catch (e) {
      console.warn('Admin lookup failed:', e);
      const code = String((e && (e.code || e.name)) || '').toLowerCase();
      if (code.includes('permission-denied') || code.includes('unauthenticated')) {
        if (
          authWarmupErrorCode.includes('operation-not-allowed') ||
          authWarmupErrorCode.includes('admin-restricted-operation') ||
          authWarmupErrorCode.includes('configuration-not-found')
        ) {
          return {
            ok: false,
            message: 'Firebase Anonymous Auth is not configured. Enable it in Firebase Console (Authentication > Sign-in method).'
          };
        }
        return {
          ok: false,
          message: 'Login blocked by Firebase rules for adminUsers. Enable anonymous auth or allow get access to adminUsers docs.'
        };
      }
      if (code.includes('network') || code.includes('unavailable')) {
        return { ok: false, message: 'Network error while checking login. Please try again.' };
      }
      return { ok: false, message: 'Login failed due to configuration or access error.' };
    }
  }

  // Restore session using username/password table auth
  (function () {
    const isAuthed = sessionStorage.getItem('ADMIN_AUTH') === 'true';
    const username = sessionStorage.getItem('ADMIN_AUTH_USER');
    if (isAuthed && username) {
      showDashboard({ username });
    } else {
      showLogin();
    }
  })();

  // Force readable input colors at runtime in case browser/theme CSS overrides static rules.
  [document.getElementById('adminCredential'), document.getElementById('adminPassword')].forEach((el) => {
    if (!el) return;
    el.style.backgroundColor = '#ffffff';
    el.style.color = '#0f172a';
    el.style.caretColor = '#0f172a';
    el.style.setProperty('-webkit-text-fill-color', '#0f172a');
    el.style.setProperty('opacity', '1');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const credential = String(formData.get('credential') || '').trim();
    const password = String(formData.get('password') || '').trim();

    errorBox.textContent = '';

    const result = await verifyAdminCredential(credential, password);
    if (result.ok) {
      sessionStorage.setItem('ADMIN_AUTH', 'true');
      sessionStorage.setItem('ADMIN_AUTH_USER', result.user.username);
      showDashboard(result.user);
      return;
    }

    errorBox.textContent = result.message || 'Login failed.';
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('ADMIN_AUTH');
    sessionStorage.removeItem('ADMIN_AUTH_USER');
    showLogin();
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadQuoteRequests();
    });
  }

  if (requestDetailBackBtn) {
    requestDetailBackBtn.addEventListener('click', () => {
      selectedRequest = null;
      showRequestList();
    });
  }

  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener('click', async () => {
      if (!selectedRequest) return;
      detailDeleteBtn.disabled = true;
      try {
        await handleDelete(selectedRequest, -1);
        selectedRequest = null;
        showRequestList();
      } finally {
        detailDeleteBtn.disabled = false;
      }
    });
  }

  // ---------- Quote fetching and rendering ----------
  const host = String(window.location.hostname || '').toLowerCase();
  const isLocalDev = host === 'localhost' || host === '127.0.0.1';
  const isGitHubPages = /github\.io$/.test(host) || !!document.querySelector('link[rel="canonical"][href*="floridasignsolution.com"]');

  async function fetchFromFirestore() {
    try {
      const db = await initFirestoreClient();
      if (!db) return null;
      const snap = await db
        .collection('quoteRequests')
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get();
      return snap.docs.map((doc) => ({ id: doc.id, _source: 'firestore', ...doc.data() }));
    } catch (e) {
      console.warn('Firestore fetch failed:', e);
      return null;
    }
  }
  async function fetchFromServer() {
    if (isGitHubPages) return null;
    const apiUrl = (window.API_URL && String(window.API_URL)) || (isLocalDev ? 'http://localhost:3000/api/quotes' : '');
    if (!apiUrl) return null;
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('Server responded ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data.quotes)) return null;
      return data.quotes.map((row) => Object.assign({ _source: 'server' }, row || {}));
    } catch (e) {
      console.warn('Server fetch failed:', e);
      return null;
    }
  }

  function fetchFromLocalStorage() {
    try {
      const raw = JSON.parse(localStorage.getItem('quoteRequests') || '[]');
      if (!Array.isArray(raw)) return null;
      let mutated = false;
      raw.forEach((row) => {
        if (!row || typeof row !== 'object') return;
        const existingId = String(row.id || '').trim();
        if (existingId) return;
        row.id = 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        mutated = true;
      });
      if (mutated) {
        localStorage.setItem('quoteRequests', JSON.stringify(raw));
      }
      const normalized = raw.map((row) => {
        const existingId = String((row && row.id) || '').trim();
        return Object.assign({}, row || {}, { id: existingId, _source: 'local' });
      });
      normalized.sort((a, b) => {
        const at = normalizeTimestamp(a && a.timestamp);
        const bt = normalizeTimestamp(b && b.timestamp);
        return Number(bt ? bt.getTime() : 0) - Number(at ? at.getTime() : 0);
      });
      return normalized;
    } catch (e) {
      console.warn('Local quoteRequests parse failed:', e);
      return null;
    }
  }

  function localQuoteFingerprint(row) {
    const name = String((row && row.name) || '').trim().toLowerCase();
    const email = String((row && row.email) || '').trim().toLowerCase();
    const phone = String((row && row.phone) || '').replace(/[^\d+]/g, '');
    const timestamp = String((row && row.timestamp) || '').trim();
    const message = String((row && (row.message || row.details)) || '').trim().toLowerCase();
    return [name, email, phone, timestamp, message].join('|');
  }

  function removeLocalQuoteById(id, targetRow) {
    const key = String(id || '').trim();
    const targetFingerprint = localQuoteFingerprint(targetRow || {});
    if (!key && !targetFingerprint) return;
    try {
      const raw = JSON.parse(localStorage.getItem('quoteRequests') || '[]');
      if (!Array.isArray(raw)) return;
      let changed = false;
      const next = raw.filter((row) => {
        const rowId = String((row && row.id) || '').trim();
        if (key && rowId === key) {
          changed = true;
          return false;
        }
        if (!rowId && targetFingerprint && localQuoteFingerprint(row) === targetFingerprint) {
          changed = true;
          return false;
        }
        return true;
      });
      if (changed) {
        localStorage.setItem('quoteRequests', JSON.stringify(next));
      }
    } catch (_) {}
  }

  async function markRequestViewed(q) {
    if (!q) return;
    const id = getRequestId(q);
    if (id && !viewedRequestIds.has(id)) {
      viewedRequestIds.add(id);
      saveViewedRequestIds();
    }
    if (!q.viewedAt) {
      q.viewedAt = new Date().toISOString();
    }
    if (String(q._source || '') === 'firestore' && id) {
      try {
        const db = await initFirestoreClient();
        if (db) {
          const value = (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString();
          await db.collection('quoteRequests').doc(id).set({ viewedAt: value }, { merge: true });
        }
      } catch (e) {
        console.warn('Unable to persist viewed status:', e);
      }
    }
  }

  function renderRequestDetail(q) {
    if (!q) return;
    const viewed = isRequestViewed(q);
    requestDetailViewedBadge.className = `request-status-pill ${viewed ? 'viewed' : 'new'}`;
    requestDetailViewedBadge.textContent = viewed ? 'Viewed' : 'New';

    requestDetailTitle.textContent = `${String(q.name || 'Request')} - Details`;
    detailName.textContent = String(q.name || '-');
    detailTimestamp.textContent = formatDateTime(q.timestamp);

    const emailValue = String(q.email || '').trim();
    if (emailValue) {
      detailEmail.innerHTML = '';
      const a = document.createElement('a');
      a.href = `mailto:${emailValue}`;
      a.textContent = emailValue;
      detailEmail.appendChild(a);
    } else {
      detailEmail.textContent = '-';
    }

    const phoneValue = String(q.phone || '').trim();
    if (phoneValue) {
      detailPhone.innerHTML = '';
      const a = document.createElement('a');
      a.href = `tel:${phoneValue.replace(/[^\d+]/g, '')}`;
      a.textContent = phoneValue;
      detailPhone.appendChild(a);
    } else {
      detailPhone.textContent = '-';
    }

    detailMessage.textContent = String(q.message || q.details || 'No message provided.');

    detailImages.innerHTML = '';
    const imgs = getQuoteImages(q);
    if (!imgs.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No images attached.';
      detailImages.appendChild(empty);
    } else {
      imgs.forEach((src, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'detail-image-btn';
        btn.setAttribute('aria-label', `Open attached image ${idx + 1}`);
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Attached image ${idx + 1}`;
        img.loading = 'lazy';
        btn.appendChild(img);
        btn.addEventListener('click', () => openImageViewer(imgs, idx));
        detailImages.appendChild(btn);
      });
    }
  }

  async function openRequestDetail(q) {
    selectedRequest = q;
    renderRequestDetail(q);
    if (requestListSection) requestListSection.hidden = true;
    if (requestDetailSection) requestDetailSection.hidden = false;
    renderQuotes(lastQuotes);
    updateQuotesStatusSummary();
    // Persist viewed state in background to keep the UI responsive.
    markRequestViewed(q).then(() => {
      renderQuotes(lastQuotes);
      renderRequestDetail(q);
      updateQuotesStatusSummary();
    });
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
      const viewed = isRequestViewed(q);
      tr.className = `request-row ${viewed ? 'is-viewed' : ''}`;

      const statusCell = document.createElement('td');
      statusCell.innerHTML = statusPillHtml(viewed);
      tr.appendChild(statusCell);

      const nameCell = document.createElement('td');
      const nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'request-name-btn';
      nameBtn.textContent = String(q.name || 'Unknown');
      nameBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openRequestDetail(q);
      });
      nameCell.appendChild(nameBtn);
      tr.appendChild(nameCell);

      const contactCell = document.createElement('td');
      const contactIcons = document.createElement('div');
      contactIcons.className = 'contact-icons';
      const emailValue = String(q.email || '').trim();
      const phoneValue = String(q.phone || '').trim();
      if (emailValue) {
        contactIcons.appendChild(
          createContactIconLink('email', `mailto:${emailValue}`, `Email ${String(q.name || 'requester')}`)
        );
      }
      if (phoneValue) {
        contactIcons.appendChild(
          createContactIconLink('phone', `tel:${phoneValue.replace(/[^\d+]/g, '')}`, `Call ${String(q.name || 'requester')}`)
        );
      }
      if (!emailValue && !phoneValue) {
        contactIcons.textContent = '—';
      }
      contactCell.appendChild(contactIcons);
      tr.appendChild(contactCell);

      const receivedCell = document.createElement('td');
      receivedCell.textContent = formatDateTime(q.timestamp);
      tr.appendChild(receivedCell);

      const actions = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.className = 'btn-danger btn-icon';
      delBtn.setAttribute('aria-label', 'Delete this quote');
      delBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        delBtn.disabled = true;
        handleDelete(q, i).finally(() => {
          delBtn.disabled = false;
        });
      });
      actions.appendChild(delBtn);
      tr.appendChild(actions);

      tr.addEventListener('click', (ev) => {
        if (ev.target.closest('a,button,[role="button"]')) return;
        openRequestDetail(q);
      });

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

  function formatDateTime(ts) {
    const d = normalizeTimestamp(ts);
    if (!d || isNaN(d.getTime())) return '-';
    return d.toLocaleString();
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
          <button class="image-viewer-download" aria-label="Download">⬇</button>
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

  function sourcePriority(source) {
    const value = String(source || '').toLowerCase();
    if (value === 'firestore') return 3;
    if (value === 'server') return 2;
    if (value === 'local') return 1;
    return 0;
  }

  function quoteFingerprint(q) {
    const name = String((q && q.name) || '').trim().toLowerCase();
    const email = String((q && q.email) || '').trim().toLowerCase();
    const phone = String((q && q.phone) || '').replace(/[^\d+]/g, '');
    const timestamp = String((q && q.timestamp) || '').trim();
    const message = String((q && (q.message || q.details)) || '').trim().toLowerCase();
    if (!name && !email && !phone) return '';
    return [name, email, phone, timestamp, message].join('|');
  }

  function mergeQuoteSources(firestoreRows, serverRows, localRows) {
    const map = new Map();
    const addRows = (rows, sourceName) => {
      (rows || []).forEach((row) => {
        const candidate = Object.assign({}, row || {}, { _source: sourceName });
        const keyById = candidate.id ? ('id:' + String(candidate.id)) : '';
        const keyByFingerprint = quoteFingerprint(candidate);
        const key = keyById || ('fp:' + keyByFingerprint);
        if (!key || key === 'fp:') return;
        const existing = map.get(key);
        if (!existing || sourcePriority(candidate._source) >= sourcePriority(existing._source)) {
          map.set(key, candidate);
        }
      });
    };
    addRows(localRows, 'local');
    addRows(serverRows, 'server');
    addRows(firestoreRows, 'firestore');

    return Array.from(map.values()).sort((a, b) => {
      const at = normalizeTimestamp(a && a.timestamp);
      const bt = normalizeTimestamp(b && b.timestamp);
      return Number(bt ? bt.getTime() : 0) - Number(at ? at.getTime() : 0);
    });
  }

  function summarizeSources(quotes) {
    const values = Array.from(new Set((quotes || []).map((q) => String((q && q._source) || '').trim()).filter(Boolean)));
    if (!values.length) return 'none';
    return values.join('+');
  }

  async function loadQuoteRequests() {
    quotesStatus.textContent = 'Loading...';
    const firestoreQuotes = await fetchFromFirestore();
    const serverQuotes = await fetchFromServer();
    const localQuotes = fetchFromLocalStorage();
    let quotes = mergeQuoteSources(firestoreQuotes, serverQuotes, localQuotes);
    activeSource = summarizeSources(quotes);

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
    updateQuotesStatusSummary();

    if (selectedRequest) {
      const selectedId = getRequestId(selectedRequest);
      const fresh = quotes.find((q) => getRequestId(q) === selectedId);
      if (fresh) {
        selectedRequest = fresh;
        renderRequestDetail(fresh);
      } else {
        selectedRequest = null;
        showRequestList();
      }
    }
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

  async function handleDelete(requestRow, index) {
    const row = (requestRow && typeof requestRow === 'object')
      ? requestRow
      : { id: requestRow, _source: String(activeSource || '') };
    const id = String((row && row.id) || '').trim();
    const rowSource = String((row && row._source) || '').trim().toLowerCase();
    const ok = await showConfirmDialog({
      title: 'Delete this request?',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel'
    });
    if (!ok) return;
    quotesStatus.textContent = 'Deleting...';
    try {
      if (rowSource === 'firestore') {
        const db = await initFirestoreClient();
        if (!db || !id) throw new Error('Missing Firestore or id');
        await db.collection('quoteRequests').doc(id).delete();
      } else if (rowSource === 'server') {
        if (!id) throw new Error('Missing id for server delete');
        const apiBase = (window.API_URL && String(window.API_URL)) || (isLocalDev ? 'http://localhost:3000' : '');
        if (!apiBase) throw new Error('Missing API base URL');
        const res = await fetch(`${apiBase}/api/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Server responded ' + res.status);
      } else if (rowSource === 'local') {
        removeLocalQuoteById(id, row);
      } else {
        throw new Error('No database source available');
      }
      await loadQuoteRequests();
      const idKey = String(id || '').trim();
      if (idKey) {
        viewedRequestIds.delete(idKey);
        saveViewedRequestIds();
      }
      quotesStatus.textContent = 'Deleted.';
    } catch (e) {
      console.warn('Delete failed:', e);
      quotesStatus.textContent = 'Delete failed.';
      alert('Unable to delete this quote.');
    }
  }
});



