/* ==========================================================
   real-time-attendance.js
   Page key: checkin
   Requires: auth-service.js, load-components.js
   ========================================================== */

const _BASE_URL          = 'https://eventpro-fxfv.onrender.com/api';
const _EVENT_STORAGE_KEY = 'eventpro_current_event_id';
const _POLL_INTERVAL     = 30000;

let _chart           = null;
let _pollTimer       = null;
let _tickTimer       = null;
let _lastRefresh     = null;
let _currentEventId  = null;
let _allEvents       = [];

/* ----------------------------------------------------------
   BOOTSTRAP — this runs first, always
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async function () {

  requireAuth();
  await loadDashboardComponents('checkin');

  /* everything below runs only after sidebar + topbar are in the DOM */
  _bindEvents();
  await _loadEvents();
  await _initActiveEvent();
  _loadChartJS(function () { /* chart renders when data arrives */ });
  _startPolling();
  _startTickTimer();

});

/* ----------------------------------------------------------
   CHART.JS — load dynamically, never block the shell
   ---------------------------------------------------------- */
function _loadChartJS(callback) {
  if (window.Chart) { if (callback) callback(); return; }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload = function () { if (callback) callback(); };
  s.onerror = function () {
    var wrap = document.querySelector('.rta-chart-wrap');
    if (wrap) wrap.innerHTML =
      '<p class="rta-chart-err">Chart unavailable</p>';
  };
  document.head.appendChild(s);
}

/* ----------------------------------------------------------
   BIND EVENTS
   ---------------------------------------------------------- */
function _bindEvents() {
  document.getElementById('switchEventBtn')
    .addEventListener('click', _openModal);

  document.getElementById('inlineSwitchBtn')
    .addEventListener('click', _openModal);

  document.getElementById('modalCloseBtn')
    .addEventListener('click', _closeModal);

  document.getElementById('modalOverlay')
    .addEventListener('click', function (e) {
      if (e.target === document.getElementById('modalOverlay')) _closeModal();
    });

  document.getElementById('refreshBtn')
    .addEventListener('click', _manualRefresh);

  document.getElementById('viewAllBtn')
    .addEventListener('click', function () {
      window.location.href = 'attendees.html';
    });

  document.getElementById('activityTbody')
    .addEventListener('click', function (e) {
      var btn = e.target.closest('.rta-row-arrow');
      if (btn && btn.dataset.id) _viewAttendee(btn.dataset.id);
    });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closeModal();
  });
}

/* ----------------------------------------------------------
   LOAD EVENTS LIST (for modal)
   ---------------------------------------------------------- */
async function _loadEvents() {
  try {
    var res = await fetch(_BASE_URL + '/events?limit=20&sort=recent', {
      headers: _headers()
    });
    if (!res.ok) throw new Error('Failed');
    var data = await res.json();
    _allEvents = Array.isArray(data) ? data : (data.events || data.data || []);
  } catch (err) {
    _allEvents = [];
  }
  _renderModalList();
}

/* ----------------------------------------------------------
   INIT ACTIVE EVENT
   ---------------------------------------------------------- */
async function _initActiveEvent() {
  _currentEventId = localStorage.getItem(_EVENT_STORAGE_KEY);

  if (!_currentEventId && _allEvents.length) {
    _currentEventId = _allEvents[0]._id || _allEvents[0].id;
    localStorage.setItem(_EVENT_STORAGE_KEY, _currentEventId);
  }

  if (_currentEventId) {
    await _fetchAndRender(_currentEventId);
  } else {
    _renderEmptyState();
  }
}

/* ----------------------------------------------------------
   FETCH + RENDER (main orchestrator)
   ---------------------------------------------------------- */
async function _fetchAndRender(eventId) {
  await _fetchEventMeta(eventId);
  await _fetchAttendance(eventId);
  _lastRefresh = Date.now();
  _updateRefreshLabel();
}

/* ----------------------------------------------------------
   FETCH EVENT META
   ---------------------------------------------------------- */
async function _fetchEventMeta(eventId) {
  try {
    var res = await fetch(_BASE_URL + '/events/' + eventId, {
      headers: _headers()
    });
    if (!res.ok) throw new Error('Failed');
    var data = await res.json();
    var ev = data.event || data;
    document.getElementById('eventName').textContent =
      ev.title || ev.name || 'Unnamed Event';
    document.getElementById('eventDate').textContent =
      ev.startDate ? _fmtDate(ev.startDate) : '—';
  } catch (err) {
    document.getElementById('eventName').textContent = 'Unavailable';
    document.getElementById('eventDate').textContent = '—';
  }
}

/* ----------------------------------------------------------
   FETCH ATTENDANCE DATA
   ---------------------------------------------------------- */
async function _fetchAttendance(eventId) {
  var attendees = [];
  var stats     = null;

  try {
    var r1 = await fetch(_BASE_URL + '/events/' + eventId + '/attendees', {
      headers: _headers()
    });
    if (r1.ok) {
      var d1 = await r1.json();
      attendees = Array.isArray(d1) ? d1 : (d1.attendees || d1.data || []);
    }
  } catch (err) { /* endpoint pending — silent */ }

  try {
    var r2 = await fetch(_BASE_URL + '/dashboard/stats', {
      headers: _headers()
    });
    if (r2.ok) stats = await r2.json();
  } catch (err) { /* silent */ }

  _renderStats(attendees, stats);
  _renderTable(attendees);

  /* chart only if Chart.js is already loaded */
  if (window.Chart) {
    _renderChart(attendees);
  } else {
    _loadChartJS(function () { _renderChart(attendees); });
  }

  _renderSummary(attendees, stats);
}

/* ----------------------------------------------------------
   RENDER STATS
   ---------------------------------------------------------- */
function _renderStats(attendees, stats) {
  var checkedIn = _countChecked(attendees);
  var total     = (stats && stats.totalAttendees) ? stats.totalAttendees : attendees.length;
  var capacity  = (stats && stats.capacity)       ? stats.capacity       : 2000;
  var pct       = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
  var yet       = Math.max(total - checkedIn, 0);
  var fill      = total > 0 ? Math.min((checkedIn / total) * 100, 100) : 0;

  document.getElementById('statTotal').textContent     = _n(total);
  document.getElementById('statPct').textContent       = pct + '%';
  document.getElementById('statCheckedIn').textContent = _n(checkedIn);
  document.getElementById('statCapacity').textContent  = _n(capacity);
  document.getElementById('statYet').textContent       = _n(yet);

  document.getElementById('progressFill').style.width  = fill + '%';
  document.getElementById('progressNum').textContent   = _n(checkedIn);
  document.getElementById('progressSub').textContent   = 'of ' + _n(total) + ' total';
  document.getElementById('progressTag').textContent   = 'Checked-In ' + _n(checkedIn);
  document.getElementById('progressTrack').setAttribute('aria-valuenow', fill.toFixed(0));
}

/* ----------------------------------------------------------
   RENDER TABLE
   ---------------------------------------------------------- */
function _renderTable(attendees) {
  var tbody = document.getElementById('activityTbody');

  var recent = attendees
    .filter(_isChecked)
    .sort(function (a, b) {
      return new Date(b.checkedInAt || b.checkInTime || 0)
           - new Date(a.checkedInAt || a.checkInTime || 0);
    })
    .slice(0, 6);

  if (!recent.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="rta-table__state">No check-ins recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(function (a) {
    var id      = _esc(a._id || a.id || '');
    var name    = _esc(
      (((a.firstName || '') + ' ' + (a.lastName || '')).trim()) || a.name || 'Unknown'
    );
    var type    = a.ticketType || (a.ticket && a.ticket.type) || 'Regular';
    var timeStr = a.checkedInAt || a.checkInTime;

    return '<tr>' +
      '<td>' + name + '</td>' +
      '<td><span class="rta-badge rta-badge--' + _ticketClass(type) + '">' + _esc(type) + '</span></td>' +
      '<td>' + (timeStr ? _fmtCheckin(timeStr) : '—') + '</td>' +
      '<td><span class="rta-status rta-status--checked">Checked-In</span></td>' +
      '<td><button class="rta-row-arrow" data-id="' + id + '" aria-label="View ' + name + '">›</button></td>' +
      '</tr>';
  }).join('');
}

/* ----------------------------------------------------------
   RENDER DONUT CHART
   ---------------------------------------------------------- */
function _renderChart(attendees) {
  var total   = attendees.length || 1;
  var vip     = attendees.filter(function (a) { return _ticketClass(a.ticketType) === 'vip'; }).length;
  var speaker = attendees.filter(function (a) { return _ticketClass(a.ticketType) === 'speaker'; }).length;

  var vipPct  = Math.round((vip     / total) * 100);
  var spkPct  = Math.round((speaker / total) * 100);
  var regPct  = 100 - vipPct - spkPct;

  document.getElementById('vipPct').textContent     = vipPct  + '%';
  document.getElementById('regularPct').textContent = regPct  + '%';
  document.getElementById('speakerPct').textContent = spkPct  + '%';

  var st      = getComputedStyle(document.documentElement);
  var vipClr  = st.getPropertyValue('--rta-vip-color').trim()  || '#22C55E';
  var regClr  = st.getPropertyValue('--color-primary').trim()  || '#6F00FF';
  var spkClr  = st.getPropertyValue('--color-accent').trim()   || '#F97316';

  if (_chart) {
    _chart.data.datasets[0].data = [vipPct, regPct, spkPct];
    _chart.update('active');
    return;
  }

  var ctx = document.getElementById('donutChart').getContext('2d');
  _chart = new Chart(ctx, {
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

/* ----------------------------------------------------------
   RENDER SUMMARY CARD
   ---------------------------------------------------------- */
function _renderSummary(attendees, stats) {
  var checkedIn = _countChecked(attendees);
  var total     = (stats && stats.totalAttendees) ? stats.totalAttendees : attendees.length;

  document.getElementById('summaryTotal').textContent  = _n(checkedIn);
  document.getElementById('summaryNoShow').textContent = _n(Math.max(total - checkedIn, 0));
  document.getElementById('summaryPeak').textContent   = _peakHour(attendees);
}

/* ----------------------------------------------------------
   SWITCH EVENT MODAL
   ---------------------------------------------------------- */
function _openModal() {
  var el = document.getElementById('modalOverlay');
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
}

function _closeModal() {
  var el = document.getElementById('modalOverlay');
  el.classList.remove('is-open');
  el.setAttribute('aria-hidden', 'true');
}

function _renderModalList() {
  var list = document.getElementById('modalEventList');

  if (!_allEvents.length) {
    list.innerHTML = '<li class="rta-modal__loading">No events found.</li>';
    return;
  }

  list.innerHTML = _allEvents.map(function (ev) {
    var id       = ev._id || ev.id;
    var name     = _esc(ev.title || ev.name || 'Unnamed Event');
    var date     = ev.startDate ? _fmtDate(ev.startDate) : '';
    var active   = id === _currentEventId ? ' is-active' : '';

    return '<li class="rta-modal__item' + active + '" data-id="' + id + '">' +
      '<span>' + name + '</span>' +
      '<span class="rta-modal__item-meta">' + date + '</span>' +
      '</li>';
  }).join('');

  list.querySelectorAll('.rta-modal__item').forEach(function (item) {
    item.addEventListener('click', function () { _switchEvent(item.dataset.id); });
  });
}

async function _switchEvent(eventId) {
  if (eventId === _currentEventId) { _closeModal(); return; }
  _currentEventId = eventId;
  localStorage.setItem(_EVENT_STORAGE_KEY, eventId);
  _closeModal();
  _renderTableLoading();
  await _fetchAndRender(eventId);
  _renderModalList();
}

/* ----------------------------------------------------------
   POLLING + REFRESH
   ---------------------------------------------------------- */
function _startPolling() {
  clearInterval(_pollTimer);
  _pollTimer = setInterval(async function () {
    if (_currentEventId) await _fetchAndRender(_currentEventId);
  }, _POLL_INTERVAL);
}

async function _manualRefresh() {
  if (!_currentEventId) return;
  var btn = document.getElementById('refreshBtn');
  btn.disabled = true;
  await _fetchAndRender(_currentEventId);
  btn.disabled = false;
}

function _startTickTimer() {
  clearInterval(_tickTimer);
  _tickTimer = setInterval(_updateRefreshLabel, 60000);
}

function _updateRefreshLabel() {
  var el   = document.getElementById('lastUpdatedText');
  if (!_lastRefresh) { el.textContent = 'Updated just now'; return; }
  var mins = Math.floor((Date.now() - _lastRefresh) / 60000);
  el.textContent = mins < 1 ? 'Updated just now' : 'Updated ' + mins + 'm ago';
}

/* ----------------------------------------------------------
   NAVIGATION
   ---------------------------------------------------------- */
function _viewAttendee(id) {
  if (id) window.location.href = 'ticket-details.html?id=' + encodeURIComponent(id);
}

/* ----------------------------------------------------------
   UI STATE HELPERS
   ---------------------------------------------------------- */
function _renderTableLoading() {
  document.getElementById('activityTbody').innerHTML =
    '<tr><td colspan="5" class="rta-table__state"><span class="rta-spinner"></span></td></tr>';
}

function _renderEmptyState() {
  document.getElementById('activityTbody').innerHTML =
    '<tr><td colspan="5" class="rta-table__state">No event selected — click <strong>Switch Event</strong> to begin.</td></tr>';
}

/* ----------------------------------------------------------
   PURE UTILITIES
   ---------------------------------------------------------- */
function _headers() {
  return { Authorization: 'Bearer ' + getStoredToken() };
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
  var peak = Object.entries(tally).sort(function (a, b) { return b[1] - a[1]; })[0];
  if (!peak) return '—';
  var h = parseInt(peak[0], 10);
  if (h === 0)  return '12 AM';
  if (h < 12)   return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}