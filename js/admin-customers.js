document.addEventListener('DOMContentLoaded', function () {
  const authGate = document.getElementById('authGate');
  const customersApp = document.getElementById('customersApp');
  const statusEl = document.getElementById('customersStatus');
  const refreshBtn = document.getElementById('refreshCustomersBtn');

  const customerForm = document.getElementById('customerForm');
  const customerIdInput = document.getElementById('customerId');
  const customerNameInput = document.getElementById('customerName');
  const customerPhoneInput = document.getElementById('customerPhone');
  const customerEmailInput = document.getElementById('customerEmail');
  const customerQuotedPriceInput = document.getElementById('customerQuotedPrice');
  const customerPaidStatusInput = document.getElementById('customerPaidStatus');
  const customerNotesInput = document.getElementById('customerNotes');
  const clearCustomerBtn = document.getElementById('clearCustomerBtn');
  const deleteCustomerBtn = document.getElementById('deleteCustomerBtn');

  const selectedPaymentSourceInput = document.getElementById('selectedPaymentSource');
  const paymentSourcePreview = document.getElementById('paymentSourcePreview');
  const paymentSourceQrPreview = document.getElementById('paymentSourceQrPreview');
  const paymentSourceQrImage = document.getElementById('paymentSourceQrImage');

  const quoteEmailSubjectInput = document.getElementById('quoteEmailSubject');
  const quoteEmailBodyInput = document.getElementById('quoteEmailBody');
  const quoteSmsBodyInput = document.getElementById('quoteSmsBody');
  const paymentEmailSubjectInput = document.getElementById('paymentEmailSubject');
  const paymentEmailBodyInput = document.getElementById('paymentEmailBody');
  const paymentSmsBodyInput = document.getElementById('paymentSmsBody');
  const saveTemplatesBtn = document.getElementById('saveTemplatesBtn');

  const sendQuoteEmailBtn = document.getElementById('sendQuoteEmailBtn');
  const sendQuoteSmsBtn = document.getElementById('sendQuoteSmsBtn');
  const sendPaymentEmailBtn = document.getElementById('sendPaymentEmailBtn');
  const sendPaymentSmsBtn = document.getElementById('sendPaymentSmsBtn');

  const paymentSourceForm = document.getElementById('paymentSourceForm');
  const paymentSourceIdInput = document.getElementById('paymentSourceId');
  const paymentSourceQrDataInput = document.getElementById('paymentSourceQrData');
  const paymentSourceNameInput = document.getElementById('paymentSourceName');
  const paymentSourceTypeInput = document.getElementById('paymentSourceType');
  const paymentSourceDetailsInput = document.getElementById('paymentSourceDetails');
  const paymentSourceQrFileInput = document.getElementById('paymentSourceQrFile');
  const paymentSourceEmailTemplateInput = document.getElementById('paymentSourceEmailTemplate');
  const paymentSourceSmsTemplateInput = document.getElementById('paymentSourceSmsTemplate');
  const clearPaymentSourceBtn = document.getElementById('clearPaymentSourceBtn');
  const deletePaymentSourceBtn = document.getElementById('deletePaymentSourceBtn');
  const paymentSourcesList = document.getElementById('paymentSourcesList');

  const customersTableBody = document.getElementById('customersTableBody');
  const customersEmpty = document.getElementById('customersEmpty');

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
      'Please reply to this email if you have any questions.',
      '',
      '- Florida Sign Solution'
    ].join('\n'),
    quoteSmsBody: 'Hi {{name}}, your quote from Florida Sign Solution is {{quotedPrice}}. Reply here for details.',
    paymentEmailSubject: 'Payment request for {{name}} - Florida Sign Solution',
    paymentEmailBody: [
      'Hi {{name}},',
      '',
      'This is your payment request for {{quotedPrice}}.',
      'Payment method: {{paymentMethodName}} ({{paymentMethodType}})',
      'Payment details: {{paymentDetails}}',
      '',
      'Please send confirmation once payment is completed.',
      '',
      '- Florida Sign Solution'
    ].join('\n'),
    paymentSmsBody: 'Hi {{name}}, please send payment of {{quotedPrice}} via {{paymentMethodName}} ({{paymentDetails}}). Thank you.'
  };

  let appStarted = false;
  let customers = [];
  let paymentSources = [];
  let templates = Object.assign({}, TEMPLATE_DEFAULTS);
  let selectedCustomerId = '';
  let selectedPaymentSourceId = '';
  let activeDataSource = 'none';
  let dbClientPromise = null;
  let authWarmupPromise = null;
  let authWarmupErrorCode = '';

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
    if (!d) return '-';
    return d.toLocaleString();
  }

  function formatCurrency(value) {
    const num = Number(value);
    if (!isFinite(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
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
      const av = Number(a.updatedAtMs || 0);
      const bv = Number(b.updatedAtMs || 0);
      return bv - av;
    });
  }

  function makeLocalId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  async function fetchCustomers() {
    const db = await getDb();
    if (db) {
      try {
        const snap = await db.collection('adminCustomers').orderBy('updatedAtMs', 'desc').limit(600).get();
        return { source: 'firestore', rows: snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }) };
      } catch (e) {
        console.warn('Customers fetch failed (firestore):', e);
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
    if (db) {
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
        console.warn('Customers save failed (firestore):', e);
      }
    }
    const rows = readLocalJSON(LOCAL_CUSTOMERS_KEY, []);
    if (customer.id) {
      const idx = rows.findIndex(function (x) { return String(x.id) === String(customer.id); });
      if (idx >= 0) {
        rows[idx] = Object.assign({}, rows[idx], payload);
      } else {
        rows.push(Object.assign({ id: customer.id, createdAt: nowIso, createdAtMs: nowMs }, payload));
      }
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
    if (db) {
      try {
        await db.collection('adminCustomers').doc(id).delete();
        return;
      } catch (e) {
        console.warn('Customers delete failed (firestore):', e);
      }
    }
    const rows = readLocalJSON(LOCAL_CUSTOMERS_KEY, []);
    writeLocalJSON(LOCAL_CUSTOMERS_KEY, rows.filter(function (x) { return String(x.id) !== String(id); }));
  }

  async function fetchPaymentSources() {
    const db = await getDb();
    if (db) {
      try {
        const snap = await db.collection('adminPaymentSources').orderBy('updatedAtMs', 'desc').limit(200).get();
        return { source: 'firestore', rows: snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }) };
      } catch (e) {
        console.warn('Payment sources fetch failed (firestore):', e);
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
      details: String(source.details || '').trim(),
      qrImageData: String(source.qrImageData || '').trim(),
      paymentEmailTemplate: String(source.paymentEmailTemplate || '').trim(),
      paymentSmsTemplate: String(source.paymentSmsTemplate || '').trim(),
      updatedAt: nowIso,
      updatedAtMs: nowMs
    };
    const db = await getDb();
    if (db) {
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
        console.warn('Payment source save failed (firestore):', e);
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
    if (db) {
      try {
        await db.collection('adminPaymentSources').doc(id).delete();
        return;
      } catch (e) {
        console.warn('Payment source delete failed (firestore):', e);
      }
    }
    const rows = readLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, []);
    writeLocalJSON(LOCAL_PAYMENT_SOURCES_KEY, rows.filter(function (x) { return String(x.id) !== String(id); }));
  }

  async function fetchTemplates() {
    const db = await getDb();
    if (db) {
      try {
        const doc = await db.collection(TEMPLATES_DOC_PATH.collection).doc(TEMPLATES_DOC_PATH.doc).get();
        if (doc.exists) {
          return { source: 'firestore', data: Object.assign({}, TEMPLATE_DEFAULTS, doc.data() || {}) };
        }
      } catch (e) {
        console.warn('Templates fetch failed (firestore):', e);
      }
    }
    return { source: 'local', data: Object.assign({}, TEMPLATE_DEFAULTS, readLocalJSON(LOCAL_TEMPLATES_KEY, {})) };
  }

  async function saveTemplates(data) {
    const payload = Object.assign({}, data, {
      updatedAt: new Date().toISOString(),
      updatedAtMs: Date.now()
    });
    const db = await getDb();
    if (db) {
      try {
        await db.collection(TEMPLATES_DOC_PATH.collection).doc(TEMPLATES_DOC_PATH.doc).set(payload, { merge: true });
        return;
      } catch (e) {
        console.warn('Templates save failed (firestore):', e);
      }
    }
    writeLocalJSON(LOCAL_TEMPLATES_KEY, payload);
  }

  function applyTemplatesToForm() {
    quoteEmailSubjectInput.value = String(templates.quoteEmailSubject || TEMPLATE_DEFAULTS.quoteEmailSubject);
    quoteEmailBodyInput.value = String(templates.quoteEmailBody || TEMPLATE_DEFAULTS.quoteEmailBody);
    quoteSmsBodyInput.value = String(templates.quoteSmsBody || TEMPLATE_DEFAULTS.quoteSmsBody);
    paymentEmailSubjectInput.value = String(templates.paymentEmailSubject || TEMPLATE_DEFAULTS.paymentEmailSubject);
    paymentEmailBodyInput.value = String(templates.paymentEmailBody || TEMPLATE_DEFAULTS.paymentEmailBody);
    paymentSmsBodyInput.value = String(templates.paymentSmsBody || TEMPLATE_DEFAULTS.paymentSmsBody);
  }

  function readTemplatesFromForm() {
    return {
      quoteEmailSubject: String(quoteEmailSubjectInput.value || '').trim(),
      quoteEmailBody: String(quoteEmailBodyInput.value || '').trim(),
      quoteSmsBody: String(quoteSmsBodyInput.value || '').trim(),
      paymentEmailSubject: String(paymentEmailSubjectInput.value || '').trim(),
      paymentEmailBody: String(paymentEmailBodyInput.value || '').trim(),
      paymentSmsBody: String(paymentSmsBodyInput.value || '').trim()
    };
  }

  function fillTemplate(template, tokens) {
    return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(tokens, key) ? String(tokens[key]) : '';
    });
  }

  function getSelectedCustomer() {
    return customers.find(function (c) { return String(c.id) === String(selectedCustomerId); }) || null;
  }

  function getSelectedPaymentSource() {
    return paymentSources.find(function (s) { return String(s.id) === String(selectedPaymentSourceId); }) || null;
  }

  function buildTemplateTokens(customer, paymentSource) {
    const safeCustomer = customer || {};
    const safeSource = paymentSource || {};
    return {
      name: String(safeCustomer.name || ''),
      email: String(safeCustomer.email || ''),
      phone: String(safeCustomer.phone || ''),
      quotedPrice: formatCurrency(safeCustomer.quotedPrice || 0),
      paymentStatus: safeCustomer.paymentStatus === 'paid' ? 'Paid' : 'Not Paid',
      notes: String(safeCustomer.notes || 'No additional notes.'),
      paymentMethodName: String(safeSource.name || ''),
      paymentMethodType: String(safeSource.type || ''),
      paymentDetails: String(safeSource.details || ''),
      today: new Date().toLocaleDateString('en-US')
    };
  }

  function toSmsUrl(phone, body) {
    const number = String(phone || '').replace(/[^\d+]/g, '');
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    if (!number) return 'sms:' + separator + 'body=' + encodeURIComponent(body);
    return 'sms:' + number + separator + 'body=' + encodeURIComponent(body);
  }

  function sendMailto(email, subject, body) {
    if (!email) {
      setStatus('Customer email is missing. Add an email address first.', false, true);
      return false;
    }
    const url = 'mailto:' + encodeURIComponent(email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = url;
    return true;
  }

  function sendSms(phone, body) {
    if (!phone) {
      setStatus('Customer phone number is missing. Add a phone number first.', false, true);
      return false;
    }
    window.location.href = toSmsUrl(phone, body);
    return true;
  }

  function clearCustomerForm() {
    customerIdInput.value = '';
    customerNameInput.value = '';
    customerPhoneInput.value = '';
    customerEmailInput.value = '';
    customerQuotedPriceInput.value = '';
    customerPaidStatusInput.value = 'not_paid';
    customerNotesInput.value = '';
    selectedCustomerId = '';
    renderCustomersTable();
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
    renderCustomersTable();
  }

  function clearPaymentSourceForm() {
    paymentSourceIdInput.value = '';
    paymentSourceNameInput.value = '';
    paymentSourceTypeInput.value = 'venmo';
    paymentSourceDetailsInput.value = '';
    paymentSourceQrDataInput.value = '';
    paymentSourceQrFileInput.value = '';
    paymentSourceEmailTemplateInput.value = '';
    paymentSourceSmsTemplateInput.value = '';
  }

  function populatePaymentSourceForm(source) {
    if (!source) return;
    paymentSourceIdInput.value = String(source.id || '');
    paymentSourceNameInput.value = String(source.name || '');
    paymentSourceTypeInput.value = String(source.type || 'other');
    paymentSourceDetailsInput.value = String(source.details || '');
    paymentSourceQrDataInput.value = String(source.qrImageData || '');
    paymentSourceEmailTemplateInput.value = String(source.paymentEmailTemplate || '');
    paymentSourceSmsTemplateInput.value = String(source.paymentSmsTemplate || '');
    paymentSourceQrFileInput.value = '';
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
      paymentSourceQrPreview.hidden = true;
      paymentSourceQrImage.removeAttribute('src');
      return;
    }
    paymentSourcePreview.value = [
      String(source.name || ''),
      'Type: ' + String(source.type || 'other'),
      'Details:',
      String(source.details || '')
    ].join('\n');
    const qr = String(source.qrImageData || '');
    if (qr.startsWith('data:image')) {
      paymentSourceQrImage.src = qr;
      paymentSourceQrPreview.hidden = false;
    } else {
      paymentSourceQrPreview.hidden = true;
      paymentSourceQrImage.removeAttribute('src');
    }
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
      detail.textContent = String(source.details || 'No details added.');
      item.appendChild(detail);

      const qr = String(source.qrImageData || '');
      if (qr.startsWith('data:image')) {
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

      const useBtn = document.createElement('button');
      useBtn.type = 'button';
      useBtn.textContent = 'Use';
      useBtn.addEventListener('click', function () {
        selectedPaymentSourceId = String(source.id);
        selectedPaymentSourceInput.value = selectedPaymentSourceId;
        updatePaymentSourcePreview();
        renderPaymentSourcesList();
      });
      actions.appendChild(useBtn);

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'ghost';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () {
        populatePaymentSourceForm(source);
      });
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async function () {
        const ok = window.confirm('Delete this payment source?');
        if (!ok) return;
        await deletePaymentSourceRecord(source.id);
        if (String(selectedPaymentSourceId) === String(source.id)) selectedPaymentSourceId = '';
        await loadWorkspace();
        setStatus('Payment source deleted.', true, false);
      });
      actions.appendChild(delBtn);

      item.appendChild(actions);
      paymentSourcesList.appendChild(item);
    });
  }

  function renderCustomersTable() {
    customersTableBody.innerHTML = '';
    if (!customers.length) {
      customersEmpty.hidden = false;
      return;
    }
    customersEmpty.hidden = true;

    customers.forEach(function (customer) {
      const tr = document.createElement('tr');
      if (String(customer.id) === String(selectedCustomerId)) {
        tr.style.background = 'rgba(34, 211, 238, 0.08)';
      }

      const nameTd = document.createElement('td');
      const nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'name-btn';
      nameBtn.textContent = String(customer.name || 'Unknown');
      nameBtn.addEventListener('click', function () { populateCustomerForm(customer); });
      nameTd.appendChild(nameBtn);
      tr.appendChild(nameTd);

      const contactTd = document.createElement('td');
      const contact = [String(customer.email || '').trim(), String(customer.phone || '').trim()]
        .filter(function (x) { return !!x; })
        .join(' / ');
      contactTd.textContent = contact || '—';
      tr.appendChild(contactTd);

      const quoteTd = document.createElement('td');
      quoteTd.textContent = formatCurrency(customer.quotedPrice || 0);
      tr.appendChild(quoteTd);

      const statusTd = document.createElement('td');
      const pill = document.createElement('span');
      const isPaid = customer.paymentStatus === 'paid';
      pill.className = 'pill ' + (isPaid ? 'paid' : 'not-paid');
      pill.textContent = isPaid ? 'Paid' : 'Not Paid';
      statusTd.appendChild(pill);
      tr.appendChild(statusTd);

      const updatedTd = document.createElement('td');
      updatedTd.textContent = formatDateTime(customer.updatedAt || customer.updatedAtMs);
      tr.appendChild(updatedTd);

      const actionsTd = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'row-actions';

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', function () { populateCustomerForm(customer); });
      actions.appendChild(openBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async function () {
        const ok = window.confirm('Delete this customer record?');
        if (!ok) return;
        await deleteCustomerRecord(customer.id);
        if (String(selectedCustomerId) === String(customer.id)) clearCustomerForm();
        await loadWorkspace();
        setStatus('Customer deleted.', true, false);
      });
      actions.appendChild(delBtn);

      actionsTd.appendChild(actions);
      tr.appendChild(actionsTd);
      customersTableBody.appendChild(tr);
    });
  }

  async function loadWorkspace() {
    setStatus('Loading customer workspace...', false, false);
    const result = await Promise.all([fetchCustomers(), fetchPaymentSources(), fetchTemplates()]);
    const customerResult = result[0];
    const paymentResult = result[1];
    const templateResult = result[2];

    customers = toSortedRows(customerResult.rows || []);
    paymentSources = toSortedRows(paymentResult.rows || []);
    templates = Object.assign({}, TEMPLATE_DEFAULTS, templateResult.data || {});

    if (customerResult.source === 'firestore' || paymentResult.source === 'firestore' || templateResult.source === 'firestore') {
      activeDataSource = 'firestore';
    } else {
      activeDataSource = 'local';
    }

    applyTemplatesToForm();
    updatePaymentSourceSelect();
    renderPaymentSourcesList();
    renderCustomersTable();

    const customerStillExists = customers.some(function (c) { return String(c.id) === String(selectedCustomerId); });
    if (!customerStillExists && selectedCustomerId) clearCustomerForm();

    if (authWarmupErrorCode.includes('operation-not-allowed') || authWarmupErrorCode.includes('configuration-not-found')) {
      setStatus(
        'Loaded from local fallback. Firebase Anonymous Auth is not configured; enable it in Firebase Console for cloud sync.',
        false,
        true
      );
      return;
    }
    setStatus(
      'Source: ' + activeDataSource + ' | ' +
      customers.length + ' customer(s) | ' + paymentSources.length + ' payment source(s)',
      true,
      false
    );
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

  function getPaymentSourceFromForm() {
    return {
      id: String(paymentSourceIdInput.value || '').trim(),
      name: String(paymentSourceNameInput.value || '').trim(),
      type: String(paymentSourceTypeInput.value || 'other').trim(),
      details: String(paymentSourceDetailsInput.value || '').trim(),
      qrImageData: String(paymentSourceQrDataInput.value || '').trim(),
      paymentEmailTemplate: String(paymentSourceEmailTemplateInput.value || '').trim(),
      paymentSmsTemplate: String(paymentSourceSmsTemplateInput.value || '').trim()
    };
  }

  function getSelectedCustomerOrWarn() {
    const customer = getSelectedCustomer();
    if (!customer) {
      setStatus('Select a customer first.', false, true);
      return null;
    }
    return customer;
  }

  function getSelectedPaymentSourceOrWarn() {
    const source = getSelectedPaymentSource();
    if (!source) {
      setStatus('Select a payment source first.', false, true);
      return null;
    }
    return source;
  }

  function sendQuoteEmail() {
    const customer = getSelectedCustomerOrWarn();
    if (!customer) return;
    const tokens = buildTemplateTokens(customer, null);
    const subject = fillTemplate(quoteEmailSubjectInput.value, tokens);
    const body = fillTemplate(quoteEmailBodyInput.value, tokens);
    if (sendMailto(customer.email, subject, body)) {
      setStatus('Opened quote email draft for ' + customer.name + '.', true, false);
    }
  }

  function sendQuoteSms() {
    const customer = getSelectedCustomerOrWarn();
    if (!customer) return;
    const tokens = buildTemplateTokens(customer, null);
    const body = fillTemplate(quoteSmsBodyInput.value, tokens);
    if (sendSms(customer.phone, body)) {
      setStatus('Opened quote SMS draft for ' + customer.name + '.', true, false);
    }
  }

  function sendPaymentEmail() {
    const customer = getSelectedCustomerOrWarn();
    if (!customer) return;
    const source = getSelectedPaymentSourceOrWarn();
    if (!source) return;
    const tokens = buildTemplateTokens(customer, source);
    const subject = fillTemplate(paymentEmailSubjectInput.value, tokens);
    const template = source.paymentEmailTemplate || paymentEmailBodyInput.value;
    const body = fillTemplate(template, tokens);
    if (sendMailto(customer.email, subject, body)) {
      setStatus('Opened payment email draft for ' + customer.name + '.', true, false);
    }
  }

  function sendPaymentSms() {
    const customer = getSelectedCustomerOrWarn();
    if (!customer) return;
    const source = getSelectedPaymentSourceOrWarn();
    if (!source) return;
    const tokens = buildTemplateTokens(customer, source);
    const template = source.paymentSmsTemplate || paymentSmsBodyInput.value;
    const body = fillTemplate(template, tokens);
    if (sendSms(customer.phone, body)) {
      setStatus('Opened payment SMS draft for ' + customer.name + '.', true, false);
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('Could not read file')); };
      reader.readAsDataURL(file);
    });
  }

  function bindEvents() {
    refreshBtn.addEventListener('click', function () { loadWorkspace(); });

    customerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
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

    clearCustomerBtn.addEventListener('click', function () {
      clearCustomerForm();
      setStatus('Ready to add a new customer.', true, false);
    });

    deleteCustomerBtn.addEventListener('click', async function () {
      const id = String(customerIdInput.value || '').trim();
      if (!id) {
        setStatus('Select a customer to delete.', false, true);
        return;
      }
      const ok = window.confirm('Delete this customer record?');
      if (!ok) return;
      await deleteCustomerRecord(id);
      clearCustomerForm();
      await loadWorkspace();
      setStatus('Customer deleted.', true, false);
    });

    selectedPaymentSourceInput.addEventListener('change', function () {
      selectedPaymentSourceId = String(selectedPaymentSourceInput.value || '');
      updatePaymentSourcePreview();
      renderPaymentSourcesList();
    });

    paymentSourceQrFileInput.addEventListener('change', async function () {
      const file = paymentSourceQrFileInput.files && paymentSourceQrFileInput.files[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        paymentSourceQrDataInput.value = dataUrl;
        setStatus('QR image loaded for this payment source.', true, false);
      } catch (_) {
        setStatus('Could not read QR image.', false, true);
      }
    });

    paymentSourceForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const source = getPaymentSourceFromForm();
      if (!source.name) {
        setStatus('Payment source name is required.', false, true);
        return;
      }
      if (!source.details) {
        setStatus('Payment source details are required.', false, true);
        return;
      }
      const id = await savePaymentSourceRecord(source);
      selectedPaymentSourceId = id;
      clearPaymentSourceForm();
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
      if (String(selectedPaymentSourceId) === id) selectedPaymentSourceId = '';
      clearPaymentSourceForm();
      await loadWorkspace();
      setStatus('Payment source deleted.', true, false);
    });

    saveTemplatesBtn.addEventListener('click', async function () {
      const formTemplates = readTemplatesFromForm();
      await saveTemplates(formTemplates);
      templates = Object.assign({}, TEMPLATE_DEFAULTS, formTemplates);
      setStatus('Templates saved.', true, false);
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
