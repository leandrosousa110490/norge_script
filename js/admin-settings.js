document.addEventListener('DOMContentLoaded', function () {
  const authGate = document.getElementById('authGate');
  const settingsApp = document.getElementById('settingsApp');
  const statusEl = document.getElementById('settingsStatus');
  const refreshBtn = document.getElementById('refreshSettingsBtn');

  const passwordForm = document.getElementById('passwordForm');
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  const defaultsForm = document.getElementById('paymentDefaultsForm');
  const notifyEmailInput = document.getElementById('notifyEmail');
  const preferredSourceIdInput = document.getElementById('preferredSourceId');
  const quotePrefixInput = document.getElementById('quotePrefix');
  const footerNoteInput = document.getElementById('footerNote');

  const paymentSourceForm = document.getElementById('paymentSourceForm');
  const paymentSourceIdInput = document.getElementById('paymentSourceId');
  const paymentSourceNameInput = document.getElementById('paymentSourceName');
  const paymentSourceTypeInput = document.getElementById('paymentSourceType');
  const paymentSourceLookupValueInput = document.getElementById('paymentSourceLookupValue');
  const paymentSourceDetailsInput = document.getElementById('paymentSourceDetails');
  const paymentSourceQrFileInput = document.getElementById('paymentSourceQrFile');
  const paymentSourceQrPublicUrlInput = document.getElementById('paymentSourceQrPublicUrl');
  const paymentSourceQrDataInput = document.getElementById('paymentSourceQrData');
  const paymentSourceQrPreview = document.getElementById('paymentSourceQrPreview');
  const paymentSourceQrPreviewImage = document.getElementById('paymentSourceQrPreviewImage');
  const paymentSourceEmailTemplateInput = document.getElementById('paymentSourceEmailTemplate');
  const paymentSourceSmsTemplateInput = document.getElementById('paymentSourceSmsTemplate');
  const clearPaymentSourceBtn = document.getElementById('clearPaymentSourceBtn');
  const deletePaymentSourceBtn = document.getElementById('deletePaymentSourceBtn');
  const showPaymentSourceEditorBtn = document.getElementById('showPaymentSourceEditorBtn');
  const cancelPaymentSourceEditorBtn = document.getElementById('cancelPaymentSourceEditorBtn');
  const paymentSourceEditorWrap = document.getElementById('paymentSourceEditorWrap');
  const paymentSourceEditorTitle = document.getElementById('paymentSourceEditorTitle');
  const paymentSourcesList = document.getElementById('paymentSourcesList');

  const exportAdminDataBtn = document.getElementById('exportAdminDataBtn');
  const clearLocalCacheBtn = document.getElementById('clearLocalCacheBtn');
  const utilitiesInfo = document.getElementById('utilitiesInfo');
  const sessionInfo = document.getElementById('sessionInfo');
  const modalOpenTriggers = document.querySelectorAll('[data-settings-modal-open]');
  const settingsModals = document.querySelectorAll('.settings-modal');

  const LOCAL_PAYMENT_SOURCES_KEY = 'ADMIN_PAYMENT_SOURCES_LOCAL_V1';
  const LOCAL_DEFAULTS_KEY = 'ADMIN_PAYMENT_PORTAL_DEFAULTS_V1';
  const LOCAL_CUSTOMERS_KEY = 'ADMIN_CUSTOMERS_LOCAL_V1';
  const LOCAL_TEMPLATES_KEY = 'ADMIN_CUSTOMER_TEMPLATES_LOCAL_V1';

  const DEFAULTS_DOC_PATH = { collection: 'adminSettings', doc: 'paymentPortal' };
  const BUSINESS_CONTEXT = {
    businessName: 'Florida Sign Solution',
    contactPhone: '(786) 393-2372',
    contactEmail: 'floridasignsolution@gmail.com'
  };

  let appStarted = false;
  let dbClientPromise = null;
  let authWarmupPromise = null;
  let authWarmupErrorCode = '';
  let activeSource = 'none';
  let paymentSources = [];
  let selectedPaymentSourceId = '';
  let paymentSourcesReadDenied = false;
  let paymentSourcesWriteDenied = false;
  let paymentDefaultsReadDenied = false;
  let paymentDefaultsWriteDenied = false;
  let paymentDefaults = {
    notifyEmail: '',
    preferredSourceId: '',
    quotePrefix: '',
    footerNote: ''
  };
  let activeModalId = '';

  function setStatus(message, isOk, isError) {
    statusEl.textContent = message;
    statusEl.className = 'muted';
    if (isOk) statusEl.classList.add('ok');
    if (isError) statusEl.classList.add('error');
  }

  function showGate(message) {
    authGate.classList.remove('hidden');
    settingsApp.classList.add('hidden');
    const gateText = authGate.querySelector('.muted');
    if (gateText && message) gateText.textContent = message;
  }

  function showApp() {
    authGate.classList.add('hidden');
    settingsApp.classList.remove('hidden');
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (id === 'sourcesModal') {
      hidePaymentSourceEditor();
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    activeModalId = id;
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = true;
    if (activeModalId === id) activeModalId = '';
    const stillOpen = Array.from(settingsModals).some(function (node) { return !node.hidden; });
    if (!stillOpen) {
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    settingsModals.forEach(function (modal) {
      modal.hidden = true;
    });
    activeModalId = '';
    document.body.style.overflow = '';
  }

  function isValidFirebaseConfig(cfg) {
    return !!(cfg && cfg.apiKey && cfg.projectId && cfg.appId && cfg.messagingSenderId);
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(script);
    });
  }

  async function ensureFirebaseAuthSession() {
    if (!window.firebase || typeof window.firebase.auth !== 'function') return false;
    if (!authWarmupPromise) {
      authWarmupPromise = (async function () {
        try {
          authWarmupErrorCode = '';
          const auth = window.firebase.auth();
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
      if (!window.firebase) return null;
      if (!window.firebase.apps.length) window.firebase.initializeApp(cfg);
      await ensureFirebaseAuthSession();
      if (appCheckKey) {
        try {
          const appCheck = window.firebase.appCheck();
          appCheck.activate(appCheckKey, true);
        } catch (_) {}
      }
      try {
        const tmp = window.firebase.firestore();
        tmp.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
      } catch (_) {}
      return window.firebase.firestore();
    } catch (e) {
      console.warn('Failed to init Firestore:', e);
      return null;
    }
  }

  async function getDb() {
    if (!dbClientPromise) dbClientPromise = initFirestoreClient();
    return dbClientPromise;
  }

  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
  }

  function timingSafeEqual(a, b) {
    const x = String(a || '');
    const y = String(b || '');
    let mismatch = x.length ^ y.length;
    const len = Math.min(x.length, y.length);
    for (let i = 0; i < len; i++) mismatch |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return mismatch === 0;
  }

  function bytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToBytes(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function createRandomSaltBase64(byteLength) {
    const size = Number(byteLength) || 16;
    const bytes = new Uint8Array(size);
    window.crypto.getRandomValues(bytes);
    return bytesToBase64(bytes);
  }

  async function derivePasswordHash(password, saltB64, iterations, digest) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API unavailable.');
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

  function readLocalJSON(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '');
      return parsed || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeLocalJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function makeLocalId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function getErrorCode(error) {
    return String((error && (error.code || error.name)) || '').toLowerCase();
  }

  function isPermissionDenied(error) {
    const code = getErrorCode(error);
    return code.includes('permission-denied') || code.includes('unauthenticated');
  }

  function toSortedRows(rows) {
    return (rows || []).slice().sort(function (a, b) {
      return Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0);
    });
  }

  async function fetchPaymentSources() {
    const db = await getDb();
    if (db && !paymentSourcesReadDenied) {
      try {
        const snap = await db.collection('adminPaymentSources').orderBy('updatedAtMs', 'desc').limit(300).get();
        return { source: 'firestore', rows: snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }) };
      } catch (e) {
        if (isPermissionDenied(e)) {
          paymentSourcesReadDenied = true;
        } else {
          console.warn('Payment sources fetch failed (firestore):', e);
        }
      }
    }
    return { source: 'local', rows: toSortedRows(readLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, [])) };
  }

  async function savePaymentSourceRecord(source) {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const payload = {
      name: String(source.name || '').trim(),
      type: String(source.type || 'other').trim().toLowerCase(),
      lookupValue: String(source.lookupValue || '').trim(),
      details: String(source.details || '').trim(),
      qrImageData: String(source.qrImageData || '').trim(),
      qrPublicUrl: String(source.qrPublicUrl || '').trim(),
      paymentEmailTemplate: String(source.paymentEmailTemplate || '').trim(),
      paymentSmsTemplate: String(source.paymentSmsTemplate || '').trim(),
      updatedAt: nowIso,
      updatedAtMs: nowMs
    };
    const db = await getDb();
    if (db && !paymentSourcesWriteDenied) {
      try {
        if (source.id) {
          await db.collection('adminPaymentSources').doc(source.id).set(payload, { merge: true });
          return source.id;
        }
        payload.createdAt = nowIso;
        payload.createdAtMs = nowMs;
        const ref = await db.collection('adminPaymentSources').add(payload);
        return ref.id;
      } catch (e) {
        if (isPermissionDenied(e)) {
          paymentSourcesWriteDenied = true;
        } else {
          console.warn('Payment source save failed (firestore):', e);
        }
      }
    }
    const rows = readLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, []);
    if (source.id) {
      const idx = rows.findIndex(function (x) { return String(x.id) === String(source.id); });
      if (idx >= 0) rows[idx] = Object.assign({}, rows[idx], payload);
      else rows.push(Object.assign({ id: source.id, createdAt: nowIso, createdAtMs: nowMs }, payload));
      writeLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, rows);
      return source.id;
    }
    const id = makeLocalId('pay');
    rows.push(Object.assign({ id: id, createdAt: nowIso, createdAtMs: nowMs }, payload));
    writeLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, rows);
    return id;
  }

  async function deletePaymentSourceRecord(id) {
    if (!id) return;
    const db = await getDb();
    if (db && !paymentSourcesWriteDenied) {
      try {
        await db.collection('adminPaymentSources').doc(id).delete();
        return;
      } catch (e) {
        if (isPermissionDenied(e)) {
          paymentSourcesWriteDenied = true;
        } else {
          console.warn('Payment source delete failed (firestore):', e);
        }
      }
    }
    const rows = readLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, []);
    writeLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, rows.filter(function (x) { return String(x.id) !== String(id); }));
  }

  async function fetchPaymentDefaults() {
    const db = await getDb();
    if (db && !paymentDefaultsReadDenied) {
      try {
        const doc = await db.collection(DEFAULTS_DOC_PATH.collection).doc(DEFAULTS_DOC_PATH.doc).get();
        if (doc.exists) {
          return { source: 'firestore', data: Object.assign({}, paymentDefaults, doc.data() || {}) };
        }
      } catch (e) {
        if (isPermissionDenied(e)) {
          paymentDefaultsReadDenied = true;
        } else {
          console.warn('Payment defaults fetch failed (firestore):', e);
        }
      }
    }
    return { source: 'local', data: Object.assign({}, paymentDefaults, readLocalJSON(LOCAL_DEFAULTS_KEY, {})) };
  }

  async function savePaymentDefaults(data) {
    const payload = Object.assign({}, data, {
      updatedAt: new Date().toISOString(),
      updatedAtMs: Date.now()
    });
    const db = await getDb();
    if (db && !paymentDefaultsWriteDenied) {
      try {
        await db.collection(DEFAULTS_DOC_PATH.collection).doc(DEFAULTS_DOC_PATH.doc).set(payload, { merge: true });
        return;
      } catch (e) {
        if (isPermissionDenied(e)) {
          paymentDefaultsWriteDenied = true;
        } else {
          console.warn('Payment defaults save failed (firestore):', e);
        }
      }
    }
    writeLocalJSON(LOCAL_DEFAULTS_KEY, payload);
  }

  function updatePreferredSourceSelect() {
    preferredSourceIdInput.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'No default source';
    preferredSourceIdInput.appendChild(none);
    paymentSources.forEach(function (source) {
      const opt = document.createElement('option');
      opt.value = String(source.id);
      opt.textContent = String(source.name || 'Payment Source') + ' (' + String(source.type || 'other') + ')';
      preferredSourceIdInput.appendChild(opt);
    });
    preferredSourceIdInput.value = String(paymentDefaults.preferredSourceId || '');
  }

  function applyDefaultsToForm() {
    notifyEmailInput.value = String(paymentDefaults.notifyEmail || '');
    preferredSourceIdInput.value = String(paymentDefaults.preferredSourceId || '');
    quotePrefixInput.value = String(paymentDefaults.quotePrefix || '');
    footerNoteInput.value = String(paymentDefaults.footerNote || '');
  }

  function readDefaultsFromForm() {
    return {
      notifyEmail: String(notifyEmailInput.value || '').trim(),
      preferredSourceId: String(preferredSourceIdInput.value || '').trim(),
      quotePrefix: String(quotePrefixInput.value || '').trim(),
      footerNote: String(footerNoteInput.value || '').trim()
    };
  }

  function typeToLabel(type) {
    const value = String(type || '').toLowerCase();
    if (value === 'venmo') return 'Venmo';
    if (value === 'zelle') return 'Zelle';
    if (value === 'cashapp') return 'Cash App';
    return 'Payment Source';
  }

  function defaultLookupValue(type) {
    const value = String(type || '').toLowerCase();
    if (value === 'zelle') return BUSINESS_CONTEXT.contactPhone;
    return '@floridasignsolution';
  }

  function showPaymentSourceEditor(titleText) {
    if (!paymentSourceEditorWrap) return;
    paymentSourceEditorWrap.classList.remove('hidden');
    if (paymentSourceEditorTitle) {
      paymentSourceEditorTitle.textContent = titleText || 'Add Payment Source';
    }
  }

  function hidePaymentSourceEditor() {
    if (!paymentSourceEditorWrap) return;
    paymentSourceEditorWrap.classList.add('hidden');
  }

  function syncPaymentSourceQrPreview() {
    if (!paymentSourceQrPreview || !paymentSourceQrPreviewImage) return;
    const qrData = String(paymentSourceQrDataInput.value || '').trim();
    const qrPublicUrl = String(paymentSourceQrPublicUrlInput.value || '').trim();
    const qr = qrData || qrPublicUrl;
    if (qr.startsWith('data:image') || /^https?:\/\//i.test(qr)) {
      paymentSourceQrPreviewImage.src = qr;
      paymentSourceQrPreview.classList.remove('hidden');
      return;
    }
    paymentSourceQrPreviewImage.removeAttribute('src');
    paymentSourceQrPreview.classList.add('hidden');
  }

  function hydrateDefaultsFromBusinessContext(defaults) {
    const next = Object.assign({}, defaults || {});
    if (!String(next.notifyEmail || '').trim()) {
      next.notifyEmail = BUSINESS_CONTEXT.contactEmail;
    }
    if (!String(next.quotePrefix || '').trim()) {
      next.quotePrefix = 'Thanks for contacting ' + BUSINESS_CONTEXT.businessName + '. Please review your estimate below. We are ready to assist with design, fabrication, installation, and service throughout Florida.';
    }
    if (!String(next.footerNote || '').trim()) {
      next.footerNote = 'Licensed & insured | FL License | ' + BUSINESS_CONTEXT.contactPhone + ' | ' + BUSINESS_CONTEXT.contactEmail;
    }
    return next;
  }

  function buildContextDefaults(type, name) {
    const label = String(name || '').trim() || typeToLabel(type);
    const lookupValue = defaultLookupValue(type);
    const details = [
      'Business: ' + BUSINESS_CONTEXT.businessName,
      'Source: ' + label,
      'Find Me As: ' + lookupValue,
      'Contact Phone: ' + BUSINESS_CONTEXT.contactPhone,
      'Contact Email: ' + BUSINESS_CONTEXT.contactEmail,
      'Payment Reference: {{name}} / {{today}}',
      'Instructions: Add customer name in the payment note and send confirmation after transfer.'
    ].join('\n');
    const emailTemplate = [
      'Hi {{name}},',
      '',
      'Please submit payment of {{quotedPrice}} to ' + label + '.',
      'Find Me As: {{paymentLookupValue}}',
      'Payment details:',
      '{{paymentDetails}}',
      'QR Code: {{paymentQrInfo}}',
      'Payment Page: {{paymentPageUrl}}',
      '',
      'After sending payment, reply with your confirmation screenshot.',
      '',
      BUSINESS_CONTEXT.businessName
    ].join('\n');
    const smsTemplate = 'Hi {{name}}, please send {{quotedPrice}} via ' + label + '. Find Me As: {{paymentLookupValue}}. Details: {{paymentDetails}}. QR: {{paymentQrInfo}}. Payment Page: {{paymentPageUrl}}. Reply with confirmation. - ' + BUSINESS_CONTEXT.businessName;
    return { label: label, lookupValue: lookupValue, details: details, emailTemplate: emailTemplate, smsTemplate: smsTemplate };
  }

  function applyContextDefaultsToPaymentSourceForm(forceAll) {
    if (!forceAll && String(paymentSourceIdInput.value || '').trim()) return;
    const type = String(paymentSourceTypeInput.value || 'venmo').trim().toLowerCase();
    const context = buildContextDefaults(type, paymentSourceNameInput.value);

    if (forceAll || !String(paymentSourceNameInput.value || '').trim()) {
      paymentSourceNameInput.value = context.label;
    }
    if (forceAll || !String(paymentSourceLookupValueInput.value || '').trim()) {
      paymentSourceLookupValueInput.value = context.lookupValue;
    }
    if (forceAll || !String(paymentSourceDetailsInput.value || '').trim()) {
      paymentSourceDetailsInput.value = context.details;
    }
    if (forceAll || !String(paymentSourceEmailTemplateInput.value || '').trim()) {
      paymentSourceEmailTemplateInput.value = context.emailTemplate;
    }
    if (forceAll || !String(paymentSourceSmsTemplateInput.value || '').trim()) {
      paymentSourceSmsTemplateInput.value = context.smsTemplate;
    }
  }

  function clearPaymentSourceForm() {
    paymentSourceIdInput.value = '';
    paymentSourceTypeInput.value = 'venmo';
    paymentSourceQrDataInput.value = '';
    paymentSourceQrFileInput.value = '';
    paymentSourceQrPublicUrlInput.value = '';
    paymentSourceNameInput.value = '';
    paymentSourceLookupValueInput.value = '';
    paymentSourceDetailsInput.value = '';
    paymentSourceEmailTemplateInput.value = '';
    paymentSourceSmsTemplateInput.value = '';
    applyContextDefaultsToPaymentSourceForm(true);
    syncPaymentSourceQrPreview();
    showPaymentSourceEditor('Add Payment Source');
  }

  function populatePaymentSourceForm(source) {
    if (!source) return;
    paymentSourceIdInput.value = String(source.id || '');
    paymentSourceNameInput.value = String(source.name || '');
    paymentSourceTypeInput.value = String(source.type || 'other');
    paymentSourceLookupValueInput.value = String(source.lookupValue || '');
    paymentSourceDetailsInput.value = String(source.details || '');
    paymentSourceQrDataInput.value = String(source.qrImageData || '');
    paymentSourceQrPublicUrlInput.value = String(source.qrPublicUrl || '');
    paymentSourceEmailTemplateInput.value = String(source.paymentEmailTemplate || '');
    paymentSourceSmsTemplateInput.value = String(source.paymentSmsTemplate || '');
    paymentSourceQrFileInput.value = '';
    selectedPaymentSourceId = String(source.id || '');
    syncPaymentSourceQrPreview();
    showPaymentSourceEditor('Edit Payment Source');
    renderPaymentSourcesList();
  }

  function renderPaymentSourcesList() {
    paymentSourcesList.innerHTML = '';
    if (!paymentSources.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No payment sources yet.';
      paymentSourcesList.appendChild(empty);
      return;
    }

    paymentSources.forEach(function (source) {
      const item = document.createElement('article');
      item.className = 'source-item' + (String(source.id) === String(selectedPaymentSourceId) ? ' active' : '');

      const title = document.createElement('h3');
      title.textContent = String(source.name || 'Payment Source') + ' (' + String(source.type || 'other') + ')';
      item.appendChild(title);

      const detail = document.createElement('p');
      const lookupLine = String(source.lookupValue || '').trim() ? ('Find Me As: ' + String(source.lookupValue || '').trim() + '\n') : '';
      detail.textContent = lookupLine + String(source.details || 'No details added.');
      item.appendChild(detail);

      const qr = String(source.qrImageData || source.qrPublicUrl || '');
      if (qr.startsWith('data:image') || /^https?:\/\//i.test(qr)) {
        const wrap = document.createElement('div');
        wrap.className = 'qr-preview';
        const img = document.createElement('img');
        img.src = qr;
        img.alt = String(source.name || 'Payment source') + ' QR code';
        wrap.appendChild(img);
        item.appendChild(wrap);
      }

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'ghost';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () {
        populatePaymentSourceForm(source);
      });
      actions.appendChild(editBtn);

      const useBtn = document.createElement('button');
      useBtn.type = 'button';
      useBtn.textContent = 'Set Default';
      useBtn.addEventListener('click', function () {
        paymentDefaults.preferredSourceId = String(source.id);
        preferredSourceIdInput.value = paymentDefaults.preferredSourceId;
        selectedPaymentSourceId = String(source.id);
        renderPaymentSourcesList();
      });
      actions.appendChild(useBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async function () {
        const ok = window.confirm('Delete this payment source?');
        if (!ok) return;
        await deletePaymentSourceRecord(source.id);
        if (String(paymentDefaults.preferredSourceId) === String(source.id)) {
          paymentDefaults.preferredSourceId = '';
        }
        if (String(selectedPaymentSourceId) === String(source.id)) {
          selectedPaymentSourceId = '';
        }
        await loadWorkspace();
        setStatus('Payment source deleted.', true, false);
      });
      actions.appendChild(delBtn);

      item.appendChild(actions);
      paymentSourcesList.appendChild(item);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('Could not read file')); };
      reader.readAsDataURL(file);
    });
  }

  function buildSessionInfo() {
    const authUser = String(sessionStorage.getItem('ADMIN_AUTH_USER') || 'unknown');
    const isAuthed = sessionStorage.getItem('ADMIN_AUTH') === 'true';
    const now = new Date().toLocaleString();
    sessionInfo.textContent = [
      'User: ' + authUser,
      'Authenticated: ' + (isAuthed ? 'Yes' : 'No'),
      'Data Source: ' + activeSource,
      'Firebase Auth Warmup: ' + (authWarmupErrorCode ? ('Error - ' + authWarmupErrorCode) : 'OK'),
      'Loaded: ' + now
    ].join('\n');
  }

  async function changePassword() {
    const username = normalizeUsername(sessionStorage.getItem('ADMIN_AUTH_USER') || '');
    const current = String(currentPasswordInput.value || '');
    const next = String(newPasswordInput.value || '');
    const confirm = String(confirmPasswordInput.value || '');

    if (!username) {
      setStatus('Missing admin session. Please log in again.', false, true);
      return;
    }
    if (!current || !next || !confirm) {
      setStatus('Fill in all password fields.', false, true);
      return;
    }
    if (next.length < 8) {
      setStatus('New password must be at least 8 characters.', false, true);
      return;
    }
    if (next !== confirm) {
      setStatus('New password and confirmation do not match.', false, true);
      return;
    }

    const db = await getDb();
    if (!db) {
      setStatus('Cannot connect to admin database.', false, true);
      return;
    }

    try {
      const userDoc = await db.collection('adminUsers').doc(username).get();
      if (!userDoc.exists) {
        setStatus('Admin user record not found.', false, true);
        return;
      }
      const userData = userDoc.data() || {};
      const salt = String(userData.passwordSalt || '');
      const storedHash = String(userData.passwordHash || '');
      const digest = String(userData.digest || 'SHA-256');
      const iterations = Number(userData.iterations || 210000);
      if (!salt || !storedHash) {
        setStatus('Admin record is missing password hash data.', false, true);
        return;
      }

      const currentHash = await derivePasswordHash(current, salt, iterations, digest);
      if (!timingSafeEqual(currentHash, storedHash)) {
        setStatus('Current password is incorrect.', false, true);
        return;
      }

      const newSalt = createRandomSaltBase64(16);
      const newHash = await derivePasswordHash(next, newSalt, iterations, digest);
      await db.collection('adminUsers').doc(username).set({
        passwordSalt: newSalt,
        passwordHash: newHash,
        iterations: iterations,
        digest: digest,
        passwordUpdatedAt: new Date().toISOString(),
        updatedAtMs: Date.now()
      }, { merge: true });

      passwordForm.reset();
      setStatus('Password updated successfully.', true, false);
      closeModal('passwordModal');
    } catch (error) {
      console.warn('Password update failed:', error);
      const code = String((error && (error.code || error.name)) || '').toLowerCase();
      if (code.includes('permission-denied') || code.includes('unauthenticated')) {
        setStatus('Password update blocked by Firestore rules for adminUsers.', false, true);
      } else {
        setStatus('Password update failed. Check settings and try again.', false, true);
      }
    }
  }

  async function exportAdminData() {
    let payload = {
      exportedAt: new Date().toISOString(),
      source: activeSource,
      adminUser: String(sessionStorage.getItem('ADMIN_AUTH_USER') || ''),
      paymentDefaults: paymentDefaults,
      paymentSources: paymentSources
    };

    const db = await getDb();
    if (db) {
      try {
        const [customersSnap, sourcesSnap, quotesSnap, settingsDoc] = await Promise.all([
          db.collection('adminCustomers').orderBy('updatedAtMs', 'desc').limit(1200).get().catch(() => null),
          db.collection('adminPaymentSources').orderBy('updatedAtMs', 'desc').limit(500).get().catch(() => null),
          db.collection('quoteRequests').orderBy('timestamp', 'desc').limit(1200).get().catch(() => null),
          db.collection(DEFAULTS_DOC_PATH.collection).doc(DEFAULTS_DOC_PATH.doc).get().catch(() => null)
        ]);

        payload = Object.assign({}, payload, {
          source: 'firestore',
          customers: customersSnap ? customersSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }) : [],
          paymentSources: sourcesSnap ? sourcesSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }) : [],
          quoteRequests: quotesSnap ? quotesSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }) : [],
          paymentDefaults: settingsDoc && settingsDoc.exists ? settingsDoc.data() : paymentDefaults
        });
      } catch (error) {
        console.warn('Firestore export fallback to local:', error);
      }
    } else {
      payload.customers = readLocalJSON(LOCAL_CUSTOMERS_KEY, []);
      payload.paymentSources = readLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, []);
      payload.customerTemplates = readLocalJSON(LOCAL_TEMPLATES_KEY, {});
      payload.paymentDefaults = readLocalJSON(LOCAL_DEFAULTS_KEY, paymentDefaults);
    }

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = 'admin-export-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2500);
    utilitiesInfo.textContent = 'Export complete. Keep this file as a backup snapshot.';
    setStatus('Admin data exported.', true, false);
  }

  function clearLocalCache() {
    const keys = [
      LOCAL_CUSTOMERS_KEY,
      LOCAL_PAYMENT_SOURCES_KEY,
      LOCAL_TEMPLATES_KEY,
      LOCAL_DEFAULTS_KEY,
      'siteTrafficFallback',
      'quoteRequests',
      'ADMIN_VIEWED_QUOTES'
    ];
    keys.forEach(function (key) {
      localStorage.removeItem(key);
    });
    utilitiesInfo.textContent = 'Local cache cleared. Cloud records were not changed.';
    setStatus('Local cache cleared.', true, false);
  }

  async function loadWorkspace() {
    setStatus('Loading admin settings...', false, false);

    const paymentSourcesResult = await fetchPaymentSources();
    paymentSources = toSortedRows(paymentSourcesResult.rows || []);

    const defaultsResult = await fetchPaymentDefaults();
    paymentDefaults = hydrateDefaultsFromBusinessContext(Object.assign({}, paymentDefaults, defaultsResult.data || {}));

    activeSource = (paymentSourcesResult.source === 'firestore' || defaultsResult.source === 'firestore') ? 'firestore' : 'local';

    updatePreferredSourceSelect();
    applyDefaultsToForm();
    renderPaymentSourcesList();
    if (!String(paymentSourceIdInput.value || '').trim()) {
      applyContextDefaultsToPaymentSourceForm(!paymentSources.length);
    }
    buildSessionInfo();

    if (authWarmupErrorCode.includes('operation-not-allowed') || authWarmupErrorCode.includes('configuration-not-found')) {
      setStatus('Loaded from local fallback. Enable Firebase Anonymous Auth for cloud sync.', false, true);
      return;
    }

    if (paymentSourcesReadDenied || paymentSourcesWriteDenied || paymentDefaultsReadDenied || paymentDefaultsWriteDenied) {
      setStatus('Source: ' + activeSource + ' | ' + paymentSources.length + ' payment source(s) configured | Local fallback active for blocked Firestore collections', true, false);
      return;
    }

    setStatus(
      'Source: ' + activeSource + ' | ' + paymentSources.length + ' payment source(s) configured',
      true,
      false
    );
  }

  function bindEvents() {
    refreshBtn.addEventListener('click', function () {
      loadWorkspace();
    });

    passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      changePassword();
    });

    defaultsForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      paymentDefaults = readDefaultsFromForm();
      await savePaymentDefaults(paymentDefaults);
      buildSessionInfo();
      setStatus('Payment defaults saved.', true, false);
      closeModal('defaultsModal');
    });

    paymentSourceQrFileInput.addEventListener('change', async function () {
      const file = paymentSourceQrFileInput.files && paymentSourceQrFileInput.files[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        paymentSourceQrDataInput.value = dataUrl;
        syncPaymentSourceQrPreview();
        setStatus('QR image loaded for this payment source.', true, false);
      } catch (_) {
        setStatus('Could not read QR image.', false, true);
      }
    });

    if (paymentSourceQrPublicUrlInput) {
      paymentSourceQrPublicUrlInput.addEventListener('input', function () {
        syncPaymentSourceQrPreview();
      });
    }

    paymentSourceTypeInput.addEventListener('change', function () {
      applyContextDefaultsToPaymentSourceForm(false);
    });

    paymentSourceForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const source = {
        id: String(paymentSourceIdInput.value || '').trim(),
        name: String(paymentSourceNameInput.value || '').trim(),
        type: String(paymentSourceTypeInput.value || 'other').trim(),
        lookupValue: String(paymentSourceLookupValueInput.value || '').trim(),
        details: String(paymentSourceDetailsInput.value || '').trim(),
        qrImageData: String(paymentSourceQrDataInput.value || '').trim(),
        qrPublicUrl: String(paymentSourceQrPublicUrlInput.value || '').trim(),
        paymentEmailTemplate: String(paymentSourceEmailTemplateInput.value || '').trim(),
        paymentSmsTemplate: String(paymentSourceSmsTemplateInput.value || '').trim()
      };
      if (!source.name) {
        setStatus('Payment source name is required.', false, true);
        return;
      }
      if (!source.details) {
        if (source.lookupValue) {
          source.details = 'Find Me As: ' + source.lookupValue;
        } else {
          setStatus('Payment source details are required.', false, true);
          return;
        }
      }
      const id = await savePaymentSourceRecord(source);
      selectedPaymentSourceId = id;
      clearPaymentSourceForm();
      hidePaymentSourceEditor();
      await loadWorkspace();
      setStatus('Payment source saved.', true, false);
    });

    clearPaymentSourceBtn.addEventListener('click', function () {
      clearPaymentSourceForm();
      setStatus('Ready to add a new payment source.', true, false);
    });

    deletePaymentSourceBtn.addEventListener('click', async function () {
      const id = String(paymentSourceIdInput.value || '').trim();
      if (!id) {
        setStatus('Select/Edit a payment source first.', false, true);
        return;
      }
      const ok = window.confirm('Delete this payment source?');
      if (!ok) return;
      await deletePaymentSourceRecord(id);
      if (String(paymentDefaults.preferredSourceId) === id) paymentDefaults.preferredSourceId = '';
      clearPaymentSourceForm();
      hidePaymentSourceEditor();
      await loadWorkspace();
      setStatus('Payment source deleted.', true, false);
    });

    if (showPaymentSourceEditorBtn) {
      showPaymentSourceEditorBtn.addEventListener('click', function () {
        clearPaymentSourceForm();
        showPaymentSourceEditor('Add Payment Source');
      });
    }

    if (cancelPaymentSourceEditorBtn) {
      cancelPaymentSourceEditorBtn.addEventListener('click', function () {
        hidePaymentSourceEditor();
      });
    }

    exportAdminDataBtn.addEventListener('click', function () {
      exportAdminData();
    });

    clearLocalCacheBtn.addEventListener('click', function () {
      const ok = window.confirm('Clear local cache only? Cloud database records will not be deleted.');
      if (!ok) return;
      clearLocalCache();
    });

    modalOpenTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        const targetId = String(trigger.getAttribute('data-settings-modal-open') || '').trim();
        if (!targetId) return;
        openModal(targetId);
      });
    });

    settingsModals.forEach(function (modal) {
      modal.querySelectorAll('[data-settings-modal-close]').forEach(function (closer) {
        closer.addEventListener('click', function () {
          closeModal(modal.id);
        });
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && activeModalId) {
        closeModal(activeModalId);
      }
    });
  }

  function startApp() {
    if (appStarted) return;
    appStarted = true;
    showApp();
    bindEvents();
    loadWorkspace();
  }

  (function gateAccess() {
    const isAuthed = sessionStorage.getItem('ADMIN_AUTH') === 'true';
    const authUser = String(sessionStorage.getItem('ADMIN_AUTH_USER') || '').trim();
    if (!isAuthed || !authUser) {
      showGate('Please login from the admin page with your username and password.');
      return;
    }
    startApp();
  })();
});
