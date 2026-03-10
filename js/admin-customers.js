document.addEventListener('DOMContentLoaded', function () {
  const authGate = document.getElementById('authGate');
  const customersApp = document.getElementById('customersApp');
  const statusEl = document.getElementById('customersStatus');

  const refreshBtn = document.getElementById('refreshCustomersBtn');
  const addCustomerBtn = document.getElementById('addCustomerBtn');
  const backToCustomersBtn = document.getElementById('backToCustomersBtn');

  const customerListSection = document.getElementById('customerListSection');
  const customerDetailSection = document.getElementById('customerDetailSection');
  const customerDetailTitle = document.getElementById('customerDetailTitle');
  const customerActionsPanel = document.getElementById('customerActionsPanel');
  const customerActionsNotice = document.getElementById('customerActionsNotice');
  const customersTableBody = document.getElementById('customersTableBody');
  const customersEmpty = document.getElementById('customersEmpty');

  const customerForm = document.getElementById('customerDetailForm');
  const customerIdInput = document.getElementById('customerId');
  const customerNameInput = document.getElementById('customerName');
  const customerPhoneInput = document.getElementById('customerPhone');
  const customerEmailInput = document.getElementById('customerEmail');
  const customerQuotedPriceInput = document.getElementById('customerQuotedPrice');
  const customerPaidStatusInput = document.getElementById('customerPaidStatus');
  const customerNotesInput = document.getElementById('customerNotes');
  const deleteCustomerBtn = document.getElementById('deleteCustomerBtn');

  const selectedPaymentSourceInput = document.getElementById('selectedPaymentSource');
  const paymentSourcePreview = document.getElementById('paymentSourcePreview');
  const paymentSourceQrPreview = document.getElementById('paymentSourceQrPreview');
  const paymentSourceQrImage = document.getElementById('paymentSourceQrImage');
  const triggerModal = document.getElementById('triggerModal');
  const triggerCustomerIdInput = document.getElementById('triggerCustomerId');
  const triggerModalCustomer = document.getElementById('triggerModalCustomer');
  const triggerActionTypeInput = document.getElementById('triggerActionType');
  const triggerPaymentSourceRow = document.getElementById('triggerPaymentSourceRow');
  const triggerPaymentSourceInput = document.getElementById('triggerPaymentSource');
  const triggerQrPreview = document.getElementById('triggerQrPreview');
  const triggerQrImage = document.getElementById('triggerQrImage');
  const triggerEmailServiceRow = document.getElementById('triggerEmailServiceRow');
  const triggerEmailServiceInput = document.getElementById('triggerEmailService');
  const triggerRunBtn = document.getElementById('triggerRunBtn');
  const triggerCloseNodes = document.querySelectorAll('[data-trigger-close]');

  const sendQuoteEmailBtn = document.getElementById('sendQuoteEmailBtn');
  const sendQuoteSmsBtn = document.getElementById('sendQuoteSmsBtn');
  const sendPaymentEmailBtn = document.getElementById('sendPaymentEmailBtn');
  const sendPaymentSmsBtn = document.getElementById('sendPaymentSmsBtn');

  const LOCAL_CUSTOMERS_KEY = 'ADMIN_CUSTOMERS_LOCAL_V1';
  const LOCAL_PAYMENT_SOURCES_KEY = 'ADMIN_PAYMENT_SOURCES_LOCAL_V1';
  const LOCAL_TEMPLATES_KEY = 'ADMIN_CUSTOMER_TEMPLATES_LOCAL_V1';
  const TEMPLATES_DOC_PATH = { collection: 'adminSettings', doc: 'customersMessaging' };

  const TEMPLATE_DEFAULTS = {
    quoteEmailSubject: 'Quote from Florida Sign Solution for {{name}}',
    quoteEmailBody: [
      'Hi {{name}},',
      '',
      'Thank you for choosing Florida Sign Solution.',
      'Your quoted price is {{quotedPrice}}.',
      '',
      'Project notes:',
      '{{notes}}',
      '',
      '- Florida Sign Solution'
    ].join('\n'),
    quoteSmsBody: 'Hi {{name}}, your quote from Florida Sign Solution is {{quotedPrice}}.',
    paymentEmailSubject: 'Payment request for {{name}} - Florida Sign Solution',
    paymentEmailBody: [
      'Hi {{name}},',
      '',
      'This is your payment request for {{quotedPrice}}.',
      'Payment method: {{paymentMethodName}} ({{paymentMethodType}})',
      'Find Me As: {{paymentLookupValue}}',
      'Payment details: {{paymentDetails}}',
      'QR Code: {{paymentQrInfo}}',
      'Payment Page: {{paymentPageUrl}}',
      '',
      '- Florida Sign Solution'
    ].join('\n'),
    paymentSmsBody: 'Hi {{name}}, please send payment of {{quotedPrice}} via {{paymentMethodName}}. Find Me As: {{paymentLookupValue}}. QR: {{paymentQrInfo}}. Payment Page: {{paymentPageUrl}}'
  };

  let customers = [];
  let paymentSources = [];
  let templates = Object.assign({}, TEMPLATE_DEFAULTS);
  let selectedCustomerId = '';
  let selectedPaymentSourceId = '';
  let selectedTriggerCustomerId = '';
  let appStarted = false;
  let activeDataSource = 'none';
  let dbClientPromise = null;
  let authWarmupPromise = null;
  let authWarmupErrorCode = '';
  let customersReadDenied = false;
  let customersWriteDenied = false;
  let paymentSourcesReadDenied = false;
  let templatesReadDenied = false;

  function setStatus(message, isOk, isError) {
    statusEl.textContent = message;
    statusEl.className = 'muted';
    if (isOk) statusEl.classList.add('ok');
    if (isError) statusEl.classList.add('error');
  }

  function showGate(message) {
    authGate.classList.remove('hidden');
    customersApp.classList.add('hidden');
    const gateText = authGate.querySelector('.muted');
    if (gateText && message) gateText.textContent = message;
  }

  function showApp() {
    authGate.classList.add('hidden');
    customersApp.classList.remove('hidden');
  }

  function showCustomerList() {
    customerDetailSection.classList.add('hidden');
    customerListSection.classList.remove('hidden');
  }

  function showCustomerDetail() {
    customerListSection.classList.add('hidden');
    customerDetailSection.classList.remove('hidden');
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

  function readLocalJSON(key, fallbackValue) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '');
      return parsed || fallbackValue;
    } catch (_) {
      return fallbackValue;
    }
  }

  function writeLocalJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function toSortedRows(rows) {
    return (rows || []).slice().sort(function (a, b) {
      return Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0);
    });
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

  function normalizeTimestamp(ts) {
    try {
      if (!ts) return null;
      if (typeof ts === 'object') {
        if (typeof ts.toDate === 'function') return ts.toDate();
        if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
      }
      if (typeof ts === 'number') return new Date(ts < 1e12 ? ts * 1000 : ts);
      const d = new Date(String(ts));
      if (!isNaN(d.getTime())) return d;
      return null;
    } catch (_) {
      return null;
    }
  }

  function formatDateTime(ts) {
    const d = normalizeTimestamp(ts);
    return d ? d.toLocaleString() : '-';
  }

  function formatCurrency(value) {
    const num = Number(value);
    if (!isFinite(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }

  async function fetchCustomers() {
    const db = await getDb();
    if (db && !customersReadDenied) {
      try {
        const snap = await db.collection('adminCustomers').orderBy('updatedAtMs', 'desc').limit(800).get();
        return { source: 'firestore', rows: snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }) };
      } catch (e) {
        if (isPermissionDenied(e)) {
          customersReadDenied = true;
        } else {
          console.warn('Customers fetch failed (firestore):', e);
        }
      }
    }
    return { source: 'local', rows: toSortedRows(readLocalJSON(LOCAL_CUSTOMERS_KEY, [])) };
  }

  async function saveCustomerRecord(customer) {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const payload = {
      name: String(customer.name || '').trim(),
      phone: String(customer.phone || '').trim(),
      email: String(customer.email || '').trim(),
      quotedPrice: Number.isFinite(Number(customer.quotedPrice)) ? Number(customer.quotedPrice) : 0,
      paymentStatus: customer.paymentStatus === 'paid' ? 'paid' : 'not_paid',
      notes: String(customer.notes || '').trim(),
      updatedAt: nowIso,
      updatedAtMs: nowMs
    };
    const db = await getDb();
    if (db && !customersWriteDenied) {
      try {
        if (customer.id) {
          await db.collection('adminCustomers').doc(customer.id).set(payload, { merge: true });
          return customer.id;
        }
        payload.createdAt = nowIso;
        payload.createdAtMs = nowMs;
        const ref = await db.collection('adminCustomers').add(payload);
        return ref.id;
      } catch (e) {
        if (isPermissionDenied(e)) {
          customersWriteDenied = true;
        } else {
          console.warn('Customers save failed (firestore):', e);
        }
      }
    }

    const rows = readLocalJSON(LOCAL_CUSTOMERS_KEY, []);
    if (customer.id) {
      const idx = rows.findIndex(function (x) { return String(x.id) === String(customer.id); });
      if (idx >= 0) rows[idx] = Object.assign({}, rows[idx], payload);
      else rows.push(Object.assign({ id: customer.id, createdAt: nowIso, createdAtMs: nowMs }, payload));
      writeLocalJSON(LOCAL_CUSTOMERS_KEY, rows);
      return customer.id;
    }
    const id = makeLocalId('cust');
    rows.push(Object.assign({ id: id, createdAt: nowIso, createdAtMs: nowMs }, payload));
    writeLocalJSON(LOCAL_CUSTOMERS_KEY, rows);
    return id;
  }

  async function deleteCustomerRecord(id) {
    if (!id) return;
    const db = await getDb();
    if (db && !customersWriteDenied) {
      try {
        await db.collection('adminCustomers').doc(id).delete();
        return;
      } catch (e) {
        if (isPermissionDenied(e)) {
          customersWriteDenied = true;
        } else {
          console.warn('Customers delete failed (firestore):', e);
        }
      }
    }
    const rows = readLocalJSON(LOCAL_CUSTOMERS_KEY, []);
    writeLocalJSON(LOCAL_CUSTOMERS_KEY, rows.filter(function (x) { return String(x.id) !== String(id); }));
  }

  async function fetchPaymentSources() {
    const db = await getDb();
    if (db && !paymentSourcesReadDenied) {
      try {
        const snap = await db.collection('adminPaymentSources').orderBy('updatedAtMs', 'desc').limit(400).get();
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

  async function fetchTemplates() {
    const db = await getDb();
    if (db && !templatesReadDenied) {
      try {
        const doc = await db.collection(TEMPLATES_DOC_PATH.collection).doc(TEMPLATES_DOC_PATH.doc).get();
        if (doc.exists) return { source: 'firestore', data: Object.assign({}, TEMPLATE_DEFAULTS, doc.data() || {}) };
      } catch (e) {
        if (isPermissionDenied(e)) {
          templatesReadDenied = true;
        } else {
          console.warn('Templates fetch failed (firestore):', e);
        }
      }
    }
    return { source: 'local', data: Object.assign({}, TEMPLATE_DEFAULTS, readLocalJSON(LOCAL_TEMPLATES_KEY, {})) };
  }

  function buildTokens(customer, source) {
    const safeCustomer = customer || {};
    const safeSource = source || {};
    const rawDataQr = String(safeSource.qrImageData || '').trim();
    const rawPublicQr = String(safeSource.qrPublicUrl || '').trim();
    const rawQr = rawDataQr || rawPublicQr;
    let paymentQrInfo = 'No QR code provided.';
    if (rawDataQr.startsWith('data:image')) {
      paymentQrInfo = 'Exact source QR is available on the payment page.';
    } else if (/^https?:\/\//i.test(rawQr)) {
      paymentQrInfo = rawQr;
    }

    const baseTokens = {
      name: String(safeCustomer.name || ''),
      email: String(safeCustomer.email || ''),
      phone: String(safeCustomer.phone || ''),
      quotedPrice: formatCurrency(safeCustomer.quotedPrice || 0),
      paymentStatus: safeCustomer.paymentStatus === 'paid' ? 'Paid' : 'Not Paid',
      notes: String(safeCustomer.notes || 'No additional notes.'),
      paymentMethodName: String(safeSource.name || ''),
      paymentMethodType: String(safeSource.type || ''),
      paymentLookupValue: String(safeSource.lookupValue || ''),
      today: new Date().toLocaleDateString('en-US'),
      paymentQrInfo: paymentQrInfo,
      paymentPageUrl: ''
    };

    return Object.assign({}, baseTokens, {
      paymentDetails: fillTemplate(String(safeSource.details || ''), baseTokens)
    });
  }

  function fillTemplate(template, tokens) {
    return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(tokens, key) ? String(tokens[key]) : '';
    });
  }

  function toSmsUrl(phone, body) {
    const number = String(phone || '').replace(/[^\d+]/g, '');
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    if (!number) return 'sms:' + separator + 'body=' + encodeURIComponent(body);
    return 'sms:' + number + separator + 'body=' + encodeURIComponent(body);
  }

  function buildEmailUrl(email, subject, body, service) {
    const to = String(email || '').trim();
    const safeSubject = String(subject || '');
    const safeBody = String(body || '');
    const selectedService = String(service || 'default').toLowerCase();
    if (selectedService === 'gmail') {
      return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) +
        '&su=' + encodeURIComponent(safeSubject) +
        '&body=' + encodeURIComponent(safeBody);
    }
    if (selectedService === 'outlook') {
      return 'https://outlook.live.com/mail/0/deeplink/compose?to=' + encodeURIComponent(to) +
        '&subject=' + encodeURIComponent(safeSubject) +
        '&body=' + encodeURIComponent(safeBody);
    }
    if (selectedService === 'yahoo') {
      return 'https://mail.yahoo.com/d/compose?to=' + encodeURIComponent(to) +
        '&subject=' + encodeURIComponent(safeSubject) +
        '&body=' + encodeURIComponent(safeBody);
    }
    return 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(safeSubject) +
      '&body=' + encodeURIComponent(safeBody);
  }

  function sendMailto(email, subject, body, service) {
    if (!email) {
      setStatus('Customer email is missing.', false, true);
      return false;
    }
    const url = buildEmailUrl(email, subject, body, service || 'default');
    window.location.assign(url);
    return true;
  }

  function sendSms(phone, body) {
    if (!phone) {
      setStatus('Customer phone number is missing.', false, true);
      return false;
    }
    window.location.href = toSmsUrl(phone, body);
    return true;
  }

  function resolvePublicSiteBaseUrl() {
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal) return window.location.origin;
    return 'https://floridasignsolution.com';
  }

  function cleanupLocalQrShareCache() {
    try {
      const now = Date.now();
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      Object.keys(localStorage).forEach(function (key) {
        if (key.indexOf('PAYMENT_QR_SHARE_V1:') !== 0) return;
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const createdAt = Number(parsed && parsed.createdAt || 0);
          if (!createdAt || (now - createdAt) > maxAgeMs) {
            localStorage.removeItem(key);
          }
        } catch (_) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
  }

  function stashQrDataForPaymentPage(qrData) {
    const dataUrl = String(qrData || '').trim();
    if (!dataUrl.startsWith('data:image')) return '';
    try {
      cleanupLocalQrShareCache();
      const key = 'qr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      const storageKey = 'PAYMENT_QR_SHARE_V1:' + key;
      localStorage.setItem(storageKey, JSON.stringify({
        dataUrl: dataUrl,
        createdAt: Date.now()
      }));
      return key;
    } catch (_) {
      return '';
    }
  }

  function buildPaymentInstructionsUrl(source, tokens) {
    const pageUrl = new URL('/payment-instructions.html', resolvePublicSiteBaseUrl());
    pageUrl.searchParams.set('source', String(tokens.paymentMethodName || 'Payment Source'));
    pageUrl.searchParams.set('type', String(tokens.paymentMethodType || ''));
    pageUrl.searchParams.set('lookup', String(tokens.paymentLookupValue || ''));
    pageUrl.searchParams.set('details', String(tokens.paymentDetails || ''));
    pageUrl.searchParams.set('amount', String(tokens.quotedPrice || ''));
    pageUrl.searchParams.set('customer', String(tokens.name || ''));
    pageUrl.searchParams.set('source_id', String(source && source.id || ''));

    const qrData = String(source && source.qrImageData || '').trim();
    const qrPublic = String(source && source.qrPublicUrl || '').trim();
    if (qrData.startsWith('data:image')) {
      const qrKey = stashQrDataForPaymentPage(qrData);
      if (qrKey) {
        pageUrl.searchParams.set('qr_key', qrKey);
      } else {
        pageUrl.searchParams.set('qr_note', 'QR exists but could not be shared from this device.');
      }
      if (/^https?:\/\//i.test(qrPublic)) {
        pageUrl.searchParams.set('qr_fallback', qrPublic);
      }
    } else if (/^https?:\/\//i.test(qrPublic)) {
      pageUrl.searchParams.set('qr', qrPublic);
    }
    const qrPayload = [
      'Source: ' + String(tokens.paymentMethodName || ''),
      'Type: ' + String(tokens.paymentMethodType || ''),
      'Find Me As: ' + String(tokens.paymentLookupValue || ''),
      'Amount: ' + String(tokens.quotedPrice || ''),
      'Customer: ' + String(tokens.name || ''),
      'Details: ' + String(tokens.paymentDetails || '')
    ].join('\n');
    pageUrl.searchParams.set('qr_text', qrPayload);
    return pageUrl.toString();
  }

  function ensurePaymentPageInMessage(message, pageUrl) {
    const text = String(message || '');
    if (!pageUrl) return text;
    if (text.indexOf(pageUrl) !== -1) return text;
    return text + '\n\nPayment Page URL:\n' + pageUrl;
  }

  function getSelectedCustomer() {
    return customers.find(function (c) { return String(c.id) === String(selectedCustomerId); }) || null;
  }

  function getSelectedPaymentSource() {
    return paymentSources.find(function (s) { return String(s.id) === String(selectedPaymentSourceId); }) || null;
  }

  function updatePaymentSourceSelect() {
    selectedPaymentSourceInput.innerHTML = '';
    if (!paymentSources.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No payment source configured';
      selectedPaymentSourceInput.appendChild(opt);
      selectedPaymentSourceId = '';
      updatePaymentSourcePreview();
      return;
    }
    paymentSources.forEach(function (source) {
      const opt = document.createElement('option');
      opt.value = String(source.id);
      opt.textContent = String(source.name || 'Payment Source') + ' (' + String(source.type || 'other') + ')';
      selectedPaymentSourceInput.appendChild(opt);
    });
    if (!paymentSources.some(function (s) { return String(s.id) === String(selectedPaymentSourceId); })) {
      selectedPaymentSourceId = String(paymentSources[0].id);
    }
    selectedPaymentSourceInput.value = selectedPaymentSourceId;
    updatePaymentSourcePreview();
  }

  function updatePaymentSourcePreview() {
    const source = getSelectedPaymentSource();
    if (!source) {
      paymentSourcePreview.value = 'No payment source selected.';
      paymentSourceQrPreview.classList.add('hidden');
      paymentSourceQrImage.removeAttribute('src');
      return;
    }
    paymentSourcePreview.value = [
      String(source.name || ''),
      'Type: ' + String(source.type || 'other'),
      'Details:',
      String(source.details || '')
    ].join('\n');
    const qrDisplay = String(source.qrImageData || source.qrPublicUrl || '');
    if (qrDisplay.startsWith('data:image') || /^https?:\/\//i.test(qrDisplay)) {
      paymentSourceQrImage.src = qrDisplay;
      paymentSourceQrPreview.classList.remove('hidden');
    } else {
      paymentSourceQrPreview.classList.add('hidden');
      paymentSourceQrImage.removeAttribute('src');
    }
  }

  function isPaymentTriggerAction(actionType) {
    return actionType === 'payment_email' || actionType === 'payment_sms';
  }

  function isEmailTriggerAction(actionType) {
    return actionType === 'quote_email' || actionType === 'payment_email';
  }

  function populateTriggerPaymentSources() {
    if (!triggerPaymentSourceInput) return;
    triggerPaymentSourceInput.innerHTML = '';
    if (!paymentSources.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No payment source configured';
      triggerPaymentSourceInput.appendChild(opt);
      return;
    }
    paymentSources.forEach(function (source) {
      const opt = document.createElement('option');
      opt.value = String(source.id || '');
      opt.textContent = String(source.name || 'Payment Source') + ' (' + String(source.type || 'other') + ')';
      triggerPaymentSourceInput.appendChild(opt);
    });
    triggerPaymentSourceInput.value = String(selectedPaymentSourceId || paymentSources[0].id || '');
    syncTriggerQrPreview();
  }

  function syncTriggerFieldsByAction() {
    const actionType = String((triggerActionTypeInput && triggerActionTypeInput.value) || '');
    const showPaymentSource = isPaymentTriggerAction(actionType);
    const showEmailService = isEmailTriggerAction(actionType);
    if (triggerPaymentSourceRow) triggerPaymentSourceRow.classList.toggle('hidden', !showPaymentSource);
    if (triggerEmailServiceRow) triggerEmailServiceRow.classList.toggle('hidden', !showEmailService);
    if (!showPaymentSource && triggerQrPreview) {
      triggerQrPreview.classList.add('hidden');
    }
  }

  function syncTriggerQrPreview() {
    if (!triggerQrPreview || !triggerQrImage) return;
    const sourceId = String((triggerPaymentSourceInput && triggerPaymentSourceInput.value) || '');
    const source = paymentSources.find(function (row) { return String(row.id) === sourceId; }) || null;
    const qr = String(source && (source.qrImageData || source.qrPublicUrl) || '').trim();
    if (qr.startsWith('data:image') || /^https?:\/\//i.test(qr)) {
      triggerQrImage.src = qr;
      triggerQrPreview.classList.remove('hidden');
      return;
    }
    triggerQrImage.removeAttribute('src');
    triggerQrPreview.classList.add('hidden');
  }

  function closeTriggerModal() {
    if (!triggerModal) return;
    triggerModal.classList.add('hidden');
    triggerModal.setAttribute('aria-hidden', 'true');
    if (triggerQrImage) triggerQrImage.removeAttribute('src');
    if (triggerQrPreview) triggerQrPreview.classList.add('hidden');
    document.body.style.overflow = '';
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

  function showConfirmDialog(options) {
    const overlay = ensureConfirmOverlay();
    overlay.innerHTML = [
      '<div class="confirm-dialog" role="dialog" aria-modal="true" aria-label="Confirm deletion">',
      '  <h3 style="margin:0 0 8px;font-size:16px;">' + String((options && options.title) || 'Delete this customer?') + '</h3>',
      '  <p class="muted" style="margin:0 0 12px;">' + String((options && options.message) || 'This action cannot be undone.') + '</p>',
      '  <div class="confirm-actions">',
      '    <button class="btn-danger" id="confirmDeleteBtn">' + String((options && options.confirmText) || 'Yes, Delete') + '</button>',
      '    <button class="secondary" id="confirmCancelBtn">' + String((options && options.cancelText) || 'Cancel') + '</button>',
      '  </div>',
      '</div>'
    ].join('');
    overlay.classList.add('show');
    return new Promise(function (resolve) {
      const onCancel = function () { cleanup(); resolve(false); };
      const onConfirm = function () { cleanup(); resolve(true); };
      const cleanup = function () {
        overlay.classList.remove('show');
        overlay.innerHTML = '';
        overlay.removeEventListener('click', backdropClick);
        document.removeEventListener('keydown', onKeyDown);
      };
      const backdropClick = function (event) {
        if (event.target === overlay) onCancel();
      };
      const onKeyDown = function (event) {
        if (event.key === 'Escape') onCancel();
      };
      overlay.addEventListener('click', backdropClick);
      document.addEventListener('keydown', onKeyDown);
      const confirmBtn = overlay.querySelector('#confirmDeleteBtn');
      const cancelBtn = overlay.querySelector('#confirmCancelBtn');
      if (cancelBtn) cancelBtn.onclick = onCancel;
      if (confirmBtn) confirmBtn.onclick = onConfirm;
      if (confirmBtn) confirmBtn.focus();
    });
  }

  function openTriggerModal(customer) {
    if (!triggerModal || !customer) return;
    selectedTriggerCustomerId = String(customer.id || '');
    triggerCustomerIdInput.value = selectedTriggerCustomerId;
    triggerModalCustomer.textContent = 'Customer: ' + String(customer.name || 'Unknown');
    triggerActionTypeInput.value = 'quote_email';
    if (triggerEmailServiceInput) triggerEmailServiceInput.value = 'default';
    populateTriggerPaymentSources();
    syncTriggerFieldsByAction();
    syncTriggerQrPreview();
    triggerModal.classList.remove('hidden');
    triggerModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function getTriggerCustomer() {
    return customers.find(function (c) {
      return String(c.id) === String(selectedTriggerCustomerId || triggerCustomerIdInput.value || '');
    }) || null;
  }

  function clearCustomerForm() {
    customerForm.reset();
    customerIdInput.value = '';
    customerPaidStatusInput.value = 'not_paid';
    selectedCustomerId = '';
    customerDetailTitle.textContent = 'Add New Customer';
    updateCustomerActionsState();
  }

  function populateCustomerForm(customer) {
    if (!customer) return;
    customerIdInput.value = String(customer.id || '');
    customerNameInput.value = String(customer.name || '');
    customerPhoneInput.value = String(customer.phone || '');
    customerEmailInput.value = String(customer.email || '');
    customerQuotedPriceInput.value = Number.isFinite(Number(customer.quotedPrice)) ? String(customer.quotedPrice) : '';
    customerPaidStatusInput.value = customer.paymentStatus === 'paid' ? 'paid' : 'not_paid';
    customerNotesInput.value = String(customer.notes || '');
    selectedCustomerId = String(customer.id || '');
    customerDetailTitle.textContent = String(customer.name || 'Customer') + ' - Details';
    updateCustomerActionsState();
  }

  function updateCustomerActionsState() {
    const hasSavedCustomer = !!String(customerIdInput.value || selectedCustomerId || '').trim();
    if (customerActionsPanel) {
      customerActionsPanel.classList.toggle('hidden', !hasSavedCustomer);
    }
    if (customerActionsNotice) {
      customerActionsNotice.classList.toggle('hidden', hasSavedCustomer);
    }
    if (!hasSavedCustomer) {
      paymentSourcePreview.value = 'Save this customer first to access payment source actions.';
      if (paymentSourceQrPreview) paymentSourceQrPreview.classList.add('hidden');
      if (paymentSourceQrImage) paymentSourceQrImage.removeAttribute('src');
    } else {
      updatePaymentSourcePreview();
    }
  }

  function renderCustomersTable() {
    customersTableBody.innerHTML = '';
    if (!customers.length) {
      customersEmpty.classList.remove('hidden');
      return;
    }
    customersEmpty.classList.add('hidden');

    customers.forEach(function (customer) {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      const nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'name-btn';
      nameBtn.textContent = String(customer.name || 'Unknown');
      nameBtn.addEventListener('click', function () {
        populateCustomerForm(customer);
        showCustomerDetail();
      });
      nameTd.appendChild(nameBtn);
      tr.appendChild(nameTd);

      const emailTd = document.createElement('td');
      emailTd.textContent = String(customer.email || '-');
      tr.appendChild(emailTd);

      const phoneTd = document.createElement('td');
      phoneTd.textContent = String(customer.phone || '-');
      tr.appendChild(phoneTd);

      const quoteTd = document.createElement('td');
      quoteTd.textContent = formatCurrency(customer.quotedPrice || 0);
      tr.appendChild(quoteTd);

      const statusTd = document.createElement('td');
      const pill = document.createElement('span');
      const paid = customer.paymentStatus === 'paid';
      pill.className = 'pill ' + (paid ? 'paid' : 'not-paid');
      pill.textContent = paid ? 'Paid' : 'Not Paid';
      statusTd.appendChild(pill);
      tr.appendChild(statusTd);

      const updatedTd = document.createElement('td');
      updatedTd.textContent = formatDateTime(customer.updatedAt || customer.updatedAtMs);
      tr.appendChild(updatedTd);

      const actionsTd = document.createElement('td');
      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'actions';
      const triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.className = 'trigger-btn';
      triggerBtn.textContent = 'Trigger';
      triggerBtn.addEventListener('click', function () {
        openTriggerModal(customer);
      });
      actionsWrap.appendChild(triggerBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger trigger-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async function () {
        const id = String(customer && customer.id || '').trim();
        if (!id) {
          setStatus('Unable to delete: customer ID is missing.', false, true);
          return;
        }
        const ok = await showConfirmDialog({
          title: 'Delete this customer?',
          message: 'Are you sure you want to delete customer "' + String(customer.name || 'Unknown') + '"? This action cannot be undone.',
          confirmText: 'Yes, Delete',
          cancelText: 'Cancel'
        });
        if (!ok) return;
        await deleteCustomerRecord(id);
        if (String(selectedCustomerId || '') === id) {
          clearCustomerForm();
          showCustomerList();
        }
        await loadWorkspace();
        setStatus('Customer deleted.', true, false);
      });
      actionsWrap.appendChild(deleteBtn);

      actionsTd.appendChild(actionsWrap);
      tr.appendChild(actionsTd);

      customersTableBody.appendChild(tr);
    });
  }

  async function loadWorkspace() {
    setStatus('Loading customer workspace...', false, false);
    const results = await Promise.all([fetchCustomers(), fetchPaymentSources(), fetchTemplates()]);
    const customerResult = results[0];
    const sourceResult = results[1];
    const templateResult = results[2];

    customers = toSortedRows(customerResult.rows || []);
    paymentSources = toSortedRows(sourceResult.rows || []);
    templates = Object.assign({}, TEMPLATE_DEFAULTS, templateResult.data || {});
    activeDataSource = (
      customerResult.source === 'firestore' ||
      sourceResult.source === 'firestore' ||
      templateResult.source === 'firestore'
    ) ? 'firestore' : 'local';

    renderCustomersTable();
    updatePaymentSourceSelect();
    populateTriggerPaymentSources();

    if (selectedCustomerId) {
      const fresh = customers.find(function (c) { return String(c.id) === String(selectedCustomerId); });
      if (fresh) {
        populateCustomerForm(fresh);
      } else {
        clearCustomerForm();
        showCustomerList();
      }
    }

    if (authWarmupErrorCode.includes('operation-not-allowed') || authWarmupErrorCode.includes('configuration-not-found')) {
      setStatus('Loaded from local fallback. Enable Firebase Anonymous Auth for cloud sync.', false, true);
      return;
    }
    if (customersReadDenied || customersWriteDenied || paymentSourcesReadDenied || templatesReadDenied) {
      setStatus('Source: ' + activeDataSource + ' | ' + customers.length + ' customer(s) | Local fallback active for blocked Firestore collections', true, false);
      return;
    }
    setStatus('Source: ' + activeDataSource + ' | ' + customers.length + ' customer(s)', true, false);
  }

  function getCustomerFromForm() {
    return {
      id: String(customerIdInput.value || '').trim(),
      name: String(customerNameInput.value || '').trim(),
      phone: String(customerPhoneInput.value || '').trim(),
      email: String(customerEmailInput.value || '').trim(),
      quotedPrice: Number(customerQuotedPriceInput.value || 0),
      paymentStatus: customerPaidStatusInput.value === 'paid' ? 'paid' : 'not_paid',
      notes: String(customerNotesInput.value || '').trim()
    };
  }

  function requireSelectedCustomer() {
    const customer = getSelectedCustomer();
    if (!customer) {
      setStatus('Open a customer details page first.', false, true);
      return null;
    }
    return customer;
  }

  function requireSelectedPaymentSource() {
    const source = getSelectedPaymentSource();
    if (!source) {
      setStatus('Select a payment source first.', false, true);
      return null;
    }
    return source;
  }

  function sendQuoteEmail() {
    const customer = requireSelectedCustomer();
    if (!customer) return;
    const tokens = buildTokens(customer, null);
    const subject = fillTemplate(templates.quoteEmailSubject, tokens);
    const body = fillTemplate(templates.quoteEmailBody, tokens);
    if (sendMailto(customer.email, subject, body)) {
      setStatus('Opened quote email draft for ' + customer.name + '.', true, false);
    }
  }

  function sendQuoteSms() {
    const customer = requireSelectedCustomer();
    if (!customer) return;
    const tokens = buildTokens(customer, null);
    const body = fillTemplate(templates.quoteSmsBody, tokens);
    if (sendSms(customer.phone, body)) {
      setStatus('Opened quote SMS draft for ' + customer.name + '.', true, false);
    }
  }

  function sendPaymentEmail() {
    const customer = requireSelectedCustomer();
    if (!customer) return;
    const source = requireSelectedPaymentSource();
    if (!source) return;
    const tokens = buildTokens(customer, source);
    tokens.paymentPageUrl = buildPaymentInstructionsUrl(source, tokens);
    const subject = fillTemplate(templates.paymentEmailSubject, tokens);
    const template = source.paymentEmailTemplate || templates.paymentEmailBody;
    const body = ensurePaymentPageInMessage(fillTemplate(template, tokens), tokens.paymentPageUrl);
    if (sendMailto(customer.email, subject, body)) {
      setStatus('Opened payment email draft for ' + customer.name + ' with payment page link.', true, false);
    }
  }

  function sendPaymentSms() {
    const customer = requireSelectedCustomer();
    if (!customer) return;
    const source = requireSelectedPaymentSource();
    if (!source) return;
    const tokens = buildTokens(customer, source);
    tokens.paymentPageUrl = buildPaymentInstructionsUrl(source, tokens);
    const template = source.paymentSmsTemplate || templates.paymentSmsBody;
    const body = ensurePaymentPageInMessage(fillTemplate(template, tokens), tokens.paymentPageUrl);
    if (sendSms(customer.phone, body)) {
      setStatus('Opened payment SMS draft for ' + customer.name + '.', true, false);
    }
  }

  function runTriggerAction() {
    const customer = getTriggerCustomer();
    if (!customer) {
      setStatus('Select a valid customer for trigger actions.', false, true);
      return;
    }

    const actionType = String((triggerActionTypeInput && triggerActionTypeInput.value) || '');
    const emailService = String((triggerEmailServiceInput && triggerEmailServiceInput.value) || 'default');
    const paymentSourceId = String((triggerPaymentSourceInput && triggerPaymentSourceInput.value) || '');

    if (actionType === 'quote_email') {
      const quoteTokens = buildTokens(customer, null);
      const quoteSubject = fillTemplate(templates.quoteEmailSubject, quoteTokens);
      const quoteBody = fillTemplate(templates.quoteEmailBody, quoteTokens);
      if (sendMailto(customer.email, quoteSubject, quoteBody, emailService)) {
        setStatus('Trigger opened quote email draft for ' + customer.name + '.', true, false);
        closeTriggerModal();
      }
      return;
    }

    if (actionType === 'quote_sms') {
      const quoteSmsTokens = buildTokens(customer, null);
      const quoteSmsBody = fillTemplate(templates.quoteSmsBody, quoteSmsTokens);
      if (sendSms(customer.phone, quoteSmsBody)) {
        setStatus('Trigger opened quote message draft for ' + customer.name + '.', true, false);
        closeTriggerModal();
      }
      return;
    }

    const source = paymentSources.find(function (s) { return String(s.id) === paymentSourceId; }) || null;
    if (!source) {
      setStatus('Select a payment source for payment triggers.', false, true);
      return;
    }

    const paymentTokens = buildTokens(customer, source);
    paymentTokens.paymentPageUrl = buildPaymentInstructionsUrl(source, paymentTokens);
    if (actionType === 'payment_email') {
      const paymentSubject = fillTemplate(templates.paymentEmailSubject, paymentTokens);
      const paymentEmailTemplate = source.paymentEmailTemplate || templates.paymentEmailBody;
      const paymentBody = ensurePaymentPageInMessage(fillTemplate(paymentEmailTemplate, paymentTokens), paymentTokens.paymentPageUrl);
      if (sendMailto(customer.email, paymentSubject, paymentBody, emailService)) {
        setStatus('Trigger opened payment email draft for ' + customer.name + ' with payment page link.', true, false);
        closeTriggerModal();
      }
      return;
    }

    if (actionType === 'payment_sms') {
      const paymentSmsTemplate = source.paymentSmsTemplate || templates.paymentSmsBody;
      const paymentSmsBody = ensurePaymentPageInMessage(fillTemplate(paymentSmsTemplate, paymentTokens), paymentTokens.paymentPageUrl);
      if (sendSms(customer.phone, paymentSmsBody)) {
        setStatus('Trigger opened payment message draft for ' + customer.name + '.', true, false);
        closeTriggerModal();
      }
      return;
    }

    setStatus('Select a trigger action.', false, true);
  }

  function bindEvents() {
    refreshBtn.addEventListener('click', function () { loadWorkspace(); });

    addCustomerBtn.addEventListener('click', function () {
      clearCustomerForm();
      showCustomerDetail();
    });

    backToCustomersBtn.addEventListener('click', function () {
      showCustomerList();
    });

    customerForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const customer = getCustomerFromForm();
      if (!customer.name) {
        setStatus('Customer name is required.', false, true);
        return;
      }
      if (!customer.email && !customer.phone) {
        setStatus('Add at least an email or phone number.', false, true);
        return;
      }
      const id = await saveCustomerRecord(customer);
      selectedCustomerId = id;
      await loadWorkspace();
      const fresh = customers.find(function (c) { return String(c.id) === String(id); });
      if (fresh) populateCustomerForm(fresh);
      setStatus('Customer saved.', true, false);
    });

    deleteCustomerBtn.addEventListener('click', async function () {
      const id = String(customerIdInput.value || '').trim();
      if (!id) {
        setStatus('No customer selected.', false, true);
        return;
      }
      const name = String(customerNameInput.value || 'Unknown').trim() || 'Unknown';
      const ok = await showConfirmDialog({
        title: 'Delete this customer?',
        message: 'Are you sure you want to delete customer "' + name + '"? This action cannot be undone.',
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel'
      });
      if (!ok) return;
      await deleteCustomerRecord(id);
      clearCustomerForm();
      await loadWorkspace();
      showCustomerList();
      setStatus('Customer deleted.', true, false);
    });

    selectedPaymentSourceInput.addEventListener('change', function () {
      selectedPaymentSourceId = String(selectedPaymentSourceInput.value || '');
      updatePaymentSourcePreview();
    });

    if (triggerActionTypeInput) {
      triggerActionTypeInput.addEventListener('change', function () {
        syncTriggerFieldsByAction();
        syncTriggerQrPreview();
      });
    }

    if (triggerPaymentSourceInput) {
      triggerPaymentSourceInput.addEventListener('change', function () {
        selectedPaymentSourceId = String(triggerPaymentSourceInput.value || '');
        syncTriggerQrPreview();
      });
    }

    if (triggerRunBtn) {
      triggerRunBtn.addEventListener('click', function () {
        runTriggerAction();
      });
    }

    triggerCloseNodes.forEach(function (node) {
      node.addEventListener('click', function () {
        closeTriggerModal();
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && triggerModal && !triggerModal.classList.contains('hidden')) {
        closeTriggerModal();
      }
    });

    sendQuoteEmailBtn.addEventListener('click', sendQuoteEmail);
    sendQuoteSmsBtn.addEventListener('click', sendQuoteSms);
    sendPaymentEmailBtn.addEventListener('click', sendPaymentEmail);
    sendPaymentSmsBtn.addEventListener('click', sendPaymentSms);
  }

  function startApp() {
    if (appStarted) return;
    appStarted = true;
    showApp();
    bindEvents();
    showCustomerList();
    updateCustomerActionsState();
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
