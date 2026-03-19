// ================================================
//  EventPro — Real-Time Attendance Dashboard
//  js/real-time-attendance.js
//  Page key: checkin
//  Requires: auth-service.js, load-components.js
// ================================================

var _BASE_URL          = 'https://eventpro-fxfv.onrender.com/api';
var _EVENT_STORAGE_KEY = 'eventpro_current_event_id';
var _POLL_INTERVAL     = 30000;

var _chart          = null;
var _pollTimer      = null;
var _tickTimer      = null;
var _lastRefresh    = null;
var _currentEventId = null;
var _allEvents      = [];

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  requireAuth();
  loadDashboardComponents('checkin');

  _bindEvents();

  _loadEvents()
    .then(function () {
      return _initActiveEvent();
    })
    .then(function () {
      _loadChartJS(function () { /* chart renders when data arrives */ });
      _startPolling();
      _startTickTimer();
    });

});

// ── Load Chart.js dynamically ─────────────────────────────
function _loadChartJS(callback) {
  if (window.Chart) { if (callback) callback(); return; }
  var s    = document.createElement('script');
  s.src    = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload = function () { if (callback) callback(); };
  s.onerror = function () {
    var wrap = document.querySelector('.rta-chart-wrap');
    if (wrap) wrap.innerHTML = '<p class="rta-chart-err">Chart unavailable</p>';
  };
  document.head.appendChild(s);
}

// ── Bind Events ───────────────────────────────────────────
function _bindEvents() {
  var switchBtn  = document.getElementById('switchEventBtn');
  var inlineBtn  = document.getElementById('inlineSwitchBtn');
  var closeBtn   = document.getElementById('modalCloseBtn');
  var overlay    = document.getElementById('modalOverlay');
  var refreshBtn = document.getElementById('refreshBtn');
  var viewAllBtn = document.getElementById('viewAllBtn');
  var tbody      = document.getElementById('activityTbody');

  if (switchBtn)  switchBtn.addEventListener('click', _openModal);
  if (inlineBtn)  inlineBtn.addEventListener('click', _openModal);
  if (closeBtn)   closeBtn.addEventListener('click', _closeModal);

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _closeModal();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', _manualRefresh);
  }

  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', function () {
      window.location.href = '../pages/attendees.html';
    });
  }

  if (tbody) {
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.rta-row-arrow');
      if (btn && btn.dataset.id) _viewAttendee(btn.dataset.id);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closeModal();
  });
}

// ── Load Events List (for modal) ──────────────────────────
function _loadEvents() {
  return fetch(_BASE_URL + '/events?limit=20&sort=recent', {
    headers: _headers()
  })
    .then(function (res) {
      if (!res.ok) throw new Error('Failed');
      return res.json();
    })
    .then(function (data) {
      _allEvents = Array.isArray(data) ? data : (data.events || data.data || []);
      _renderModalList();
    })
    .catch(function () {
      _allEvents = [];
      _renderModalList();
    });
}

// ── Init Active Event ─────────────────────────────────────
function _initActiveEvent() {
  _currentEventId = localStorage.getItem(_EVENT_STORAGE_KEY);

  if (!_currentEventId && _allEvents.length) {
    _currentEventId = _allEvents[0]._id || _allEvents[0].id;
    localStorage.setItem(_EVENT_STORAGE_KEY, _currentEventId);
  }

  if (_currentEventId) {
    return _fetchAndRender(_currentEventId);
  }

  _renderEmptyState();
  return Promise.resolve();
}

// ── Fetch + Render (main orchestrator) ────────────────────
function _fetchAndRender(eventId) {
  return _fetchEventMeta(eventId)
    .then(function () {
      return _fetchAttendance(eventId);
    })
    .then(function () {
      _lastRefresh = Date.now();
      _updateRefreshLabel();
    });
}

// ── Fetch Event Meta ──────────────────────────────────────
function _fetchEventMeta(eventId) {
  return fetch(_BASE_URL + '/events/' + eventId, { headers: _headers() })
    .then(function (res) {
      if (!res.ok) throw new Error('Failed');
      return res.json();
    })
    .then(function (data) {
      var ev = data.event || data;
      var nameEl = document.getElementById('eventName');
      var dateEl = document.getElementById('eventDate');
      if (nameEl) nameEl.textContent = ev.title || ev.name || 'Unnamed Event';
      if (dateEl) dateEl.textContent = ev.startDate ? _fmtDate(ev.startDate) : '—';
    })
    .catch(function () {
      var nameEl = document.getElementById('eventName');
      var dateEl = document.getElementById('eventDate');
      if (nameEl) nameEl.textContent = 'Unavailable';
      if (dateEl) dateEl.textContent = '—';
    });
}

// ── Fetch Attendance Data ─────────────────────────────────
function _fetchAttendance(eventId) {
  var attendees = [];
  var stats     = null;

  return fetch(_BASE_URL + '/events/' + eventId + '/attendees', {
    headers: _headers()
  })
    .then(function (res) {
      if (!res.ok) return [];
      return res.json().then(function (d) {
        return Array.isArray(d) ? d : (d.attendees || d.data || []);
      });
    })
    .catch(function () { return []; })
    .then(function (att) {
      attendees = att;
      return fetch(_BASE_URL + '/dashboard/stats', { headers: _headers() });
    })
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .catch(function () { return null; })
    .then(function (s) {
      stats = s;
      _renderStats(attendees, stats);
      _renderTable(attendees);
      _renderSummary(attendees, stats);

      if (window.Chart) {
        _renderChart(attendees);
      } else {
        _loadChartJS(function () { _renderChart(attendees); });
      }
    });
}

// ── Render Stats ──────────────────────────────────────────
function _renderStats(attendees, stats) {
  var checkedIn = _countChecked(attendees);
  var total     = (stats && stats.totalAttendees) ? stats.totalAttendees : attendees.length;
  var capacity  = (stats && stats.capacity)       ? stats.capacity       : 2000;
  var pct       = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
  var yet       = Math.max(total - checkedIn, 0);
  var fill      = total > 0 ? Math.min((checkedIn / total) * 100, 100) : 0;

  _setText('statTotal',     _n(total));
  _setText('statPct',       pct + '%');
  _setText('statCheckedIn', _n(checkedIn));
  _setText('statCapacity',  _n(capacity));
  _setText('statYet',       _n(yet));

  var fillEl = document.getElementById('progressFill');
  if (fillEl) fillEl.style.width = fill + '%';
  _setText('progressNum', _n(checkedIn));
  _setText('progressSub', 'of ' + _n(total) + ' total');
  _setText('progressTag', 'Checked-In ' + _n(checkedIn));

  var track = document.getElementById('progressTrack');
  if (track) track.setAttribute('aria-valuenow', fill.toFixed(0));
}

// ── Render Table ──────────────────────────────────────────
function _renderTable(attendees) {
  var tbody = document.getElementById('activityTbody');
  if (!tbody) return;

  var recent = attendees
    .filter(_isChecked)
    .sort(function (a, b) {
      return new Date(b.checkedInAt || b.checkInTime || 0)
           - new Date(a.checkedInAt || a.checkInTime || 0);
    })
    .slice(0, 6);

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="rta-table__state">No check-ins recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(function (a) {
    var id      = _esc(a._id || a.id || '');
    var name    = _esc((((a.firstName || '') + ' ' + (a.lastName || '')).trim()) || a.name || 'Unknown');
    var type    = a.ticketType || (a.ticket && a.ticket.type) || 'Regular';
    var timeStr = a.checkedInAt || a.checkInTime;

    return '<tr>'
      + '<td>' + name + '</td>'
      + '<td><span class="rta-badge rta-badge--' + _ticketClass(type) + '">' + _esc(type) + '</span></td>'
      + '<td>' + (timeStr ? _fmtCheckin(timeStr) : '—') + '</td>'
      + '<td><span class="rta-status rta-status--checked">Checked-In</span></td>'
      + '<td><button class="rta-row-arrow" data-id="' + id + '" aria-label="View ' + name + '">›</button></td>'
      + '</tr>';
  }).join('');
}

// ── Render Donut Chart ────────────────────────────────────
function _renderChart(attendees) {
  var total   = attendees.length || 1;
  var vip     = attendees.filter(function (a) { return _ticketClass(a.ticketType) === 'vip'; }).length;
  var speaker = attendees.filter(function (a) { return _ticketClass(a.ticketType) === 'speaker'; }).length;
  var vipPct  = Math.round((vip     / total) * 100);
  var spkPct  = Math.round((speaker / total) * 100);
  var regPct  = 100 - vipPct - spkPct;

  _setText('vipPct',     vipPct + '%');
  _setText('regularPct', regPct + '%');
  _setText('speakerPct', spkPct + '%');

  var st     = getComputedStyle(document.documentElement);
  var vipClr = st.getPropertyValue('--rta-vip-color').trim() || '#22C55E';
  var regClr = st.getPropertyValue('--color-primary').trim() || '#6F00FF';
  var spkClr = st.getPropertyValue('--color-accent').trim()  || '#F97316';

  if (_chart) {
    _chart.data.datasets[0].data = [vipPct, regPct, spkPct];
    _chart.update('active');
    return;
  }

  var canvas = document.getElementById('donutChart');
  if (!canvas) return;

  _chart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['VIP', 'Regular', 'Speakers'],
      datasets: [{
        data: [vipPct, regPct, spkPct],
        backgroundColor: [vipClr, regClr, spkClr],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: '68%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ' ' + ctx.label + ': ' + ctx.parsed + '%'; }
          }
        }
      }
    }
  });
}

// ── Render Summary Card ───────────────────────────────────
function _renderSummary(attendees, stats) {
  var checkedIn = _countChecked(attendees);
  var total     = (stats && stats.totalAttendees) ? stats.totalAttendees : attendees.length;
  _setText('summaryTotal',  _n(checkedIn));
  _setText('summaryNoShow', _n(Math.max(total - checkedIn, 0)));
  _setText('summaryPeak',   _peakHour(attendees));
}

// ── Switch Event Modal ────────────────────────────────────
function _openModal() {
  var el = document.getElementById('modalOverlay');
  if (!el) return;
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
}

function _closeModal() {
  var el = document.getElementById('modalOverlay');
  if (!el) return;
  el.classList.remove('is-open');
  el.setAttribute('aria-hidden', 'true');
}

function _renderModalList() {
  var list = document.getElementById('modalEventList');
  if (!list) return;

  if (!_allEvents.length) {
    list.innerHTML = '<li class="rta-modal__loading">No events found.</li>';
    return;
  }

  list.innerHTML = _allEvents.map(function (ev) {
    var id     = ev._id || ev.id;
    var name   = _esc(ev.title || ev.name || 'Unnamed Event');
    var date   = ev.startDate ? _fmtDate(ev.startDate) : '';
    var active = id === _currentEventId ? ' is-active' : '';
    return '<li class="rta-modal__item' + active + '" data-id="' + id + '">'
      + '<span>' + name + '</span>'
      + '<span class="rta-modal__item-meta">' + date + '</span>'
      + '</li>';
  }).join('');

  list.querySelectorAll('.rta-modal__item').forEach(function (item) {
    item.addEventListener('click', function () {
      _switchEvent(item.dataset.id);
    });
  });
}

function _switchEvent(eventId) {
  if (eventId === _currentEventId) { _closeModal(); return; }
  _currentEventId = eventId;
  localStorage.setItem(_EVENT_STORAGE_KEY, eventId);
  _closeModal();
  _renderTableLoading();
  _fetchAndRender(eventId).then(function () {
    _renderModalList();
  });
}

// ── Polling + Refresh ─────────────────────────────────────
function _startPolling() {
  clearInterval(_pollTimer);
  _pollTimer = setInterval(function () {
    if (_currentEventId) _fetchAndRender(_currentEventId);
  }, _POLL_INTERVAL);
}

function _manualRefresh() {
  if (!_currentEventId) return;
  var btn = document.getElementById('refreshBtn');
  if (btn) btn.disabled = true;
  _fetchAndRender(_currentEventId).then(function () {
    if (btn) btn.disabled = false;
  });
}

function _startTickTimer() {
  clearInterval(_tickTimer);
  _tickTimer = setInterval(_updateRefreshLabel, 60000);
}

function _updateRefreshLabel() {
  var el = document.getElementById('lastUpdatedText');
  if (!el) return;
  if (!_lastRefresh) { el.textContent = 'Updated just now'; return; }
  var mins = Math.floor((Date.now() - _lastRefresh) / 60000);
  el.textContent = mins < 1 ? 'Updated just now' : 'Updated ' + mins + 'm ago';
}

// ── Navigation ────────────────────────────────────────────
function _viewAttendee(id) {
  if (id) window.location.href = '../pages/ticket-details.html?id=' + encodeURIComponent(id);
}

// ── UI State Helpers ──────────────────────────────────────
function _renderTableLoading() {
  var tbody = document.getElementById('activityTbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="rta-table__state"><span class="rta-spinner"></span></td></tr>';
  }
}

function _renderEmptyState() {
  var tbody = document.getElementById('activityTbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="rta-table__state">No event selected — click <strong>Switch Event</strong> to begin.</td></tr>';
  }
}

// ── Utilities ─────────────────────────────────────────────
function _headers() {
  return { 'Authorization': 'Bearer ' + getStoredToken() };
}

function _isChecked(a) {
  return a.status === 'checked-in' || a.checkedIn === true || a.checkInStatus === 'checked-in';
}

function _countChecked(arr) {
  return arr.filter(_isChecked).length;
}

function _ticketClass(type) {
  var t = (type || '').toLowerCase();
  if (t === 'vip')     return 'vip';
  if (t === 'speaker') return 'speaker';
  return 'regular';
}

function _n(num) {
  return Number(num || 0).toLocaleString();
}

function _fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function _fmtCheckin(iso) {
  var d    = new Date(iso);
  var time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? 'Today at ' + time
    : _fmtDate(iso);
}

function _peakHour(attendees) {
  var tally = {};
  attendees.forEach(function (a) {
    var t = a.checkedInAt || a.checkInTime;
    if (!t) return;
    var h = new Date(t).getHours();
    tally[h] = (tally[h] || 0) + 1;
  });
  var keys = Object.keys(tally);
  if (!keys.length) return '—';
  var peak = keys.sort(function (a, b) { return tally[b] - tally[a]; })[0];
  var h    = parseInt(peak, 10);
  if (h === 0)  return '12 AM';
  if (h < 12)   return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
}

function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}