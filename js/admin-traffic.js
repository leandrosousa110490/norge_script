document.addEventListener('DOMContentLoaded', function () {
  const authGate = document.getElementById('authGate');
  const trafficApp = document.getElementById('trafficApp');
  const refreshBtn = document.getElementById('refreshTrafficBtn');
  const statusEl = document.getElementById('trafficStatus');
  const tableBody = document.getElementById('trafficTableBody');

  const kpiTotal = document.getElementById('kpiTotal');
  const kpiToday = document.getElementById('kpiToday');
  const kpiPages = document.getElementById('kpiPages');
  const kpiTop = document.getElementById('kpiTop');

  let appStarted = false;
  let authWarmupPromise = null;
  let authWarmupErrorCode = '';

  function showGate(message) {
    authGate.classList.remove('hidden');
    trafficApp.classList.add('hidden');
    const gateText = authGate.querySelector('.muted');
    if (gateText && message) {
      gateText.textContent = message;
    }
  }

  function startTrafficApp() {
    if (appStarted) return;
    appStarted = true;
    authGate.classList.add('hidden');
    trafficApp.classList.remove('hidden');
    refreshBtn.addEventListener('click', function () {
      loadTraffic();
    });
    loadTraffic();
  }

  function isValidFirebaseConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return false;
    return !!(cfg.apiKey && cfg.projectId && cfg.appId && cfg.messagingSenderId);
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
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
          console.warn('Traffic auth warmup failed:', e);
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
        } catch (e) {
          console.warn('Traffic App Check activation failed:', e);
        }
      }
      try {
        const dbTmp = window.firebase.firestore();
        dbTmp.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
      } catch (_) {}
      return window.firebase.firestore();
    } catch (_) {
      return null;
    }
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

  async function fetchTrafficEvents() {
    const db = await initFirestoreClient();
    if (db) {
      try {
        const snap = await db.collection('siteTraffic').orderBy('timestamp', 'desc').limit(1500).get();
        return {
          source: 'firestore',
          rows: snap.docs.map(function (doc) {
            return Object.assign({ id: doc.id }, doc.data());
          })
        };
      } catch (e) {
        const code = String((e && (e.code || e.name)) || '').toLowerCase();
        let reason = '';
        if (code.includes('permission-denied') || code.includes('unauthenticated')) {
          if (
            authWarmupErrorCode.includes('operation-not-allowed') ||
            authWarmupErrorCode.includes('admin-restricted-operation') ||
            authWarmupErrorCode.includes('configuration-not-found')
          ) {
            reason = 'Anonymous Auth is not enabled.';
          } else {
            reason = 'Firestore rules are blocking siteTraffic reads.';
          }
        }
        let localRows = [];
        try {
          const raw = JSON.parse(localStorage.getItem('siteTrafficFallback') || '[]');
          localRows = Array.isArray(raw) ? raw.slice().reverse() : [];
        } catch (_) {}
        return { source: 'browser-cache', rows: localRows, reason: reason };
      }
    }

    try {
      const localRows = JSON.parse(localStorage.getItem('siteTrafficFallback') || '[]');
      return { source: 'browser-cache', rows: Array.isArray(localRows) ? localRows.slice().reverse() : [] };
    } catch (_) {
      return { source: 'none', rows: [] };
    }
  }

  function formatDateTime(ts) {
    const d = normalizeTimestamp(ts);
    if (!d) return '';
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  function renderKpis(rows) {
    const total = rows.length;
    const todayKey = new Date().toISOString().slice(0, 10);
    let todayCount = 0;
    const byPage = {};

    rows.forEach(function (row) {
      const normalized = normalizeTimestamp(row.timestamp);
      const day = String(row.day || '').trim() || (normalized ? normalized.toISOString().slice(0, 10) : '');
      if (day === todayKey) todayCount += 1;
      const pageKey = String(row.page || row.path || 'unknown');
      byPage[pageKey] = (byPage[pageKey] || 0) + 1;
    });

    const topPageEntry = Object.entries(byPage).sort(function (a, b) { return b[1] - a[1]; })[0] || null;
    kpiTotal.textContent = String(total);
    kpiToday.textContent = String(todayCount);
    kpiPages.textContent = String(Object.keys(byPage).length);
    kpiTop.textContent = topPageEntry ? topPageEntry[0] : '-';
  }

  function renderDayChart(rows) {
    const chartEl = document.getElementById('trafficDayChart');
    if (!(window.Plotly && window.Plotly.newPlot)) {
      chartEl.innerHTML = '<p class="muted">Chart library not loaded.</p>';
      return;
    }

    const byDay = {};
    rows.forEach(function (row) {
      const d = normalizeTimestamp(row.timestamp);
      const key = String(row.day || (d ? d.toISOString().slice(0, 10) : ''));
      if (!key) return;
      byDay[key] = (byDay[key] || 0) + 1;
    });

    const days = Object.keys(byDay).sort();
    if (!days.length) {
      chartEl.innerHTML = '<p class="muted">No traffic data yet.</p>';
      return;
    }

    const values = days.map(function (k) { return byDay[k]; });
    const data = [{
      x: days,
      y: values,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#06b6d4', width: 2 },
      marker: { size: 6, color: '#06b6d4' },
      hovertemplate: '%{x}<br>Visits: %{y}<extra></extra>'
    }];

    const layout = {
      margin: { l: 40, r: 20, t: 10, b: 34 },
      paper_bgcolor: '#111827',
      plot_bgcolor: '#0b1220',
      font: { color: '#e5e7eb' },
      xaxis: { type: 'category', gridcolor: '#1f2937' },
      yaxis: { rangemode: 'tozero', gridcolor: '#1f2937' }
    };

    window.Plotly.newPlot(chartEl, data, layout, { displayModeBar: false, responsive: true });
  }

  function renderTopPagesChart(rows) {
    const chartEl = document.getElementById('trafficPageChart');
    if (!(window.Plotly && window.Plotly.newPlot)) {
      chartEl.innerHTML = '<p class="muted">Chart library not loaded.</p>';
      return;
    }

    const byPage = {};
    rows.forEach(function (row) {
      const page = String(row.page || row.path || 'unknown');
      byPage[page] = (byPage[page] || 0) + 1;
    });

    const sorted = Object.entries(byPage).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    if (!sorted.length) {
      chartEl.innerHTML = '<p class="muted">No page data yet.</p>';
      return;
    }

    const labels = sorted.map(function (entry) { return entry[0]; });
    const values = sorted.map(function (entry) { return entry[1]; });
    const data = [{
      x: values,
      y: labels,
      type: 'bar',
      orientation: 'h',
      marker: { color: '#22d3ee' },
      hovertemplate: '%{y}<br>Visits: %{x}<extra></extra>'
    }];

    const layout = {
      margin: { l: 90, r: 10, t: 10, b: 30 },
      paper_bgcolor: '#111827',
      plot_bgcolor: '#0b1220',
      font: { color: '#e5e7eb' },
      xaxis: { rangemode: 'tozero', gridcolor: '#1f2937' },
      yaxis: { automargin: true }
    };

    window.Plotly.newPlot(chartEl, data, layout, { displayModeBar: false, responsive: true });
  }

  function renderTable(rows) {
    tableBody.innerHTML = '';
    rows.slice(0, 100).forEach(function (row) {
      const tr = document.createElement('tr');
      const cells = [
        formatDateTime(row.timestamp),
        String(row.page || ''),
        String(row.path || ''),
        String(row.referrer || 'direct')
      ];

      cells.forEach(function (value) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    });
  }

  async function loadTraffic() {
    statusEl.textContent = 'Loading traffic...';
    const result = await fetchTrafficEvents();
    const rows = (result.rows || []).filter(function (row) {
      const path = String(row.path || '');
      return path.indexOf('/admin') !== 0;
    });

    renderKpis(rows);
    renderDayChart(rows);
    renderTopPagesChart(rows);
    renderTable(rows);
    const sourceLabel = result.source === 'browser-cache' ? 'browser-cache' : result.source;
    const reason = result.reason ? ' | ' + result.reason : '';
    statusEl.textContent = 'Source: ' + sourceLabel + ' | Showing ' + rows.length + ' event(s)' + reason;
  }

  (function gateAccess() {
    const isAuthed = sessionStorage.getItem('ADMIN_AUTH') === 'true';
    const authUser = String(sessionStorage.getItem('ADMIN_AUTH_USER') || '').trim();
    if (!isAuthed || !authUser) {
      showGate('Please login from the admin page with your username and password.');
      return;
    }
    startTrafficApp();
  })();
});
