// ================================================
//  EventPro — Admin Dashboard
//  js/admin-dashboard.js
//  Depends on: auth-service.js, load-components.js
//
//  Swagger-confirmed endpoints (March 2026):
//  GET /dashboard/stats      → { totalUsers, totalEvents } ONLY
//  GET /events?limit=6&sort=recent → recent events
//
//  Stubbed (pending Swagger):
//  GET /admin/organizers     → not in Swagger yet
//  Chart.js                  → loaded dynamically
// ================================================

var API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', async function () {

  requireAuth();

  var user = getStoredUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '../pages/sign-in.html';
    return;
  }

  await loadDashboardComponents('dashboard');

  // Show Add Organizer btn — admin only
  var addOrgBtn = document.getElementById('btnAddOrganizer');
  if (addOrgBtn) addOrgBtn.hidden = false;

  // Load Chart.js dynamically — never blocks shell
  _loadChartJS(function () {
    // chart renders after data arrives
  });

  var headers = {
    'Content-Type':  'application/json',
    'Authorization': 'Bearer ' + getStoredToken()
  };

  // Fetch confirmed endpoints in parallel
  // /admin/organizers stubbed — not in Swagger yet
  var results = await Promise.allSettled([
    _apiFetch(API + '/dashboard/stats',            headers),
    _apiFetch(API + '/events?limit=6&sort=recent', headers)
  ]);

  renderStatCards(results[0]);
  renderRecentEvents(results[1]);
  renderTopOrganizers(null);   // stubbed until Swagger confirms endpoint
  _renderChartWhenReady(results[0]);
  _wireAddOrganizerModal();

});

// ── Load Chart.js dynamically ─────────────────────────────
function _loadChartJS(callback) {
  if (window.Chart) { if (callback) callback(); return; }
  var s    = document.createElement('script');
  s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  s.onload = function () { if (callback) callback(); };
  document.head.appendChild(s);
}

function _renderChartWhenReady(statsResult) {
  if (window.Chart) {
    renderAttendanceChart(statsResult);
  } else {
    _loadChartJS(function () {
      renderAttendanceChart(statsResult);
    });
  }
}

// ── API Helper ────────────────────────────────────────────
function _apiFetch(url, headers) {
  var controller = new AbortController();
  var timeoutId  = setTimeout(function () { controller.abort(); }, 15000);

  return fetch(url, {
    method:  'GET',
    headers: headers,
    signal:  controller.signal
  }).then(function (res) {
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).catch(function (err) {
    clearTimeout(timeoutId);
    throw err;
  });
}

// ── Stat Cards ────────────────────────────────────────────
// Swagger confirmed: only totalUsers + totalEvents returned
// totalAttendees + totalRevenue show N/A until Ezekiel updates endpoint
function renderStatCards(result) {
  var container = document.getElementById('statCards');
  if (!container) return;

  var totalEvents  = 'N/A';
  var totalAttend  = 'N/A';
  var totalRevenue = 'N/A';

  if (result.status === 'fulfilled') {
    var d = result.value;
    // Swagger confirmed fields
    if (d.totalEvents != null)  totalEvents = Number(d.totalEvents).toLocaleString();
    if (d.totalUsers  != null)  totalAttend = Number(d.totalUsers).toLocaleString();
    // Not in Swagger yet — show N/A
    if (d.totalRevenue != null) totalRevenue = '\u20A6' + Number(d.totalRevenue).toLocaleString();
  }

  container.innerHTML =
    '<div class="stat-card">' +
      '<div class="stat-card-left">' +
        '<span class="stat-card-label">Total Events</span>' +
        '<div class="stat-card-dots">' +
          '<span class="stat-dot on"></span><span class="stat-dot on"></span>' +
          '<span class="stat-dot on"></span><span class="stat-dot on-accent"></span>' +
          '<span class="stat-dot on-accent"></span><span class="stat-dot"></span>' +
        '</div>' +
      '</div>' +
      '<span class="stat-card-value">' + totalEvents + '</span>' +
    '</div>' +

    '<div class="stat-card">' +
      '<div class="stat-card-left">' +
        '<span class="stat-card-label">Total Users</span>' +
        '<div class="stat-card-dots">' +
          '<span class="stat-dot on"></span><span class="stat-dot on"></span>' +
          '<span class="stat-dot on"></span><span class="stat-dot on-accent"></span>' +
          '<span class="stat-dot on"></span><span class="stat-dot"></span>' +
        '</div>' +
      '</div>' +
      '<span class="stat-card-value">' + totalAttend + '</span>' +
    '</div>' +

    '<div class="stat-card">' +
      '<div class="stat-card-left">' +
        '<span class="stat-card-label">Revenue</span>' +
        '<div class="stat-card-dots">' +
          '<span class="stat-dot on"></span><span class="stat-dot on"></span>' +
          '<span class="stat-dot on"></span><span class="stat-dot on"></span>' +
          '<span class="stat-dot"></span><span class="stat-dot"></span>' +
        '</div>' +
      '</div>' +
      '<span class="stat-card-value revenue">' + totalRevenue + '</span>' +
    '</div>';
}

// ── Recent Events ─────────────────────────────────────────
function renderRecentEvents(result) {
  var tbody = document.getElementById('recentEventsBody');
  if (!tbody) return;

  if (result.status === 'rejected') {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Unable to load events. Please try again.</td></tr>';
    return;
  }

  var events = result.value && (result.value.events || result.value.data || result.value);
  if (!Array.isArray(events) || !events.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No events found.</td></tr>';
    return;
  }

  tbody.innerHTML = events.slice(0, 6).map(function (ev) {
    var date   = ev.date || ev.startDate ? formatDate(ev.date || ev.startDate) : '--';
    var count  = ((ev.attendeeCount || ev.attendees || 0)).toLocaleString();
    var status = ev.status || 'pending';
    return '<tr>' +
      '<td>' + escHtml(ev.title || ev.name || 'Unnamed') + '</td>' +
      '<td>' + date + '</td>' +
      '<td>' + count + '</td>' +
      '<td><span class="badge badge-' + status.toLowerCase() + '">' +
        capitalise(status) + '</span></td>' +
      '</tr>';
  }).join('');
}

// ── Top Organizers ────────────────────────────────────────
// Stubbed — GET /admin/organizers not in Swagger yet
function renderTopOrganizers(result) {
  var container = document.getElementById('topOrganizersList');
  if (!container) return;
  // TODO: wire GET /admin/organizers once Ezekiel adds to Swagger
  container.innerHTML = '<p class="empty-state">Organizer data coming soon.</p>';
}

// ── Attendance Chart ──────────────────────────────────────
function renderAttendanceChart(result) {
  var canvas = document.getElementById('attendanceChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Fallback data — replace with real chart data when Ezekiel updates /dashboard/stats
  var labels     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
  var registered = [800, 950, 1100, 1050, 1300, 1600, 2000, 2500];
  var checkedIn  = [600, 700, 850, 900, 1000, 1200, 1500, 1900];

  if (result && result.status === 'fulfilled') {
    var chart = result.value && (result.value.attendanceChart || result.value.chart);
    if (chart) {
      labels     = chart.labels     || labels;
      registered = chart.registered || registered;
      checkedIn  = chart.checkedIn  || checkedIn;
    }
  }

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Registered', data: registered,
          borderColor: '#6F00FF', backgroundColor: 'rgba(111,0,255,0.08)',
          borderWidth: 2.5, pointRadius: 3, tension: 0.4, fill: true
        },
        {
          label: 'Checked In', data: checkedIn,
          borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.06)',
          borderWidth: 2.5, pointRadius: 3, tension: 0.4, fill: true
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end',
          labels: { font: { family: 'Poppins', size: 12 }, boxWidth: 12, padding: 16 }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleFont: { family: 'Poppins', size: 12 },
          bodyFont:  { family: 'Poppins', size: 12 },
          padding: 10, cornerRadius: 8
        }
      },
      scales: {
        x: { grid: { display: false },
          ticks: { font: { family: 'Poppins', size: 11 }, color: '#6B7280' },
          border: { display: false }
        },
        y: { beginAtZero: true, grid: { color: '#F3F4F6' },
          ticks: { font: { family: 'Poppins', size: 11 }, color: '#6B7280',
            callback: function (v) { return v.toLocaleString(); }
          },
          border: { display: false }
        }
      }
    }
  });
}

// ── Add Organizer Modal ───────────────────────────────────
function _wireAddOrganizerModal() {
  var overlay   = document.getElementById('addOrgModalOverlay');
  var openBtn   = document.getElementById('btnAddOrganizer');
  var closeBtn  = document.getElementById('addOrgModalClose');
  var cancelBtn = document.getElementById('addOrgCancel');
  var form      = document.getElementById('addOrganizerForm');
  var submitBtn = document.getElementById('addOrgSubmit');
  var spinner   = document.getElementById('addOrgSpinner');
  var label     = document.getElementById('addOrgLabel');
  var errorEl   = document.getElementById('addOrgError');

  if (!overlay || !form) return;

  function _open() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = document.getElementById('orgFirstName');
    if (first) first.focus();
  }

  function _close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    form.reset();
    if (errorEl) errorEl.hidden = true;
    ['orgFirstName','orgLastName','orgEmail','orgPhone'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('om-input--error');
    });
    ['orgFirstNameError','orgLastNameError','orgEmailError','orgPhoneError'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  if (openBtn)  openBtn.addEventListener('click', _open);
  if (closeBtn) closeBtn.addEventListener('click', _close);
  if (cancelBtn) cancelBtn.addEventListener('click', _close);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) _close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) _close();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (errorEl) errorEl.hidden = true;

    var firstName = document.getElementById('orgFirstName');
    var lastName  = document.getElementById('orgLastName');
    var email     = document.getElementById('orgEmail');
    var phone     = document.getElementById('orgPhone');
    var valid     = true;

    function _fieldErr(input, errId, msg) {
      if (input) input.classList.add('om-input--error');
      var el = document.getElementById(errId);
      if (el) el.textContent = msg;
      valid = false;
    }
    function _fieldOk(input, errId) {
      if (input) input.classList.remove('om-input--error');
      var el = document.getElementById(errId);
      if (el) el.textContent = '';
    }

    if (!firstName || !firstName.value.trim()) {
      _fieldErr(firstName, 'orgFirstNameError', 'First name is required.');
    } else { _fieldOk(firstName, 'orgFirstNameError'); }

    if (!lastName || !lastName.value.trim()) {
      _fieldErr(lastName, 'orgLastNameError', 'Last name is required.');
    } else { _fieldOk(lastName, 'orgLastNameError'); }

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.value.trim() || !emailRe.test(email.value.trim())) {
      _fieldErr(email, 'orgEmailError', 'A valid email is required.');
    } else { _fieldOk(email, 'orgEmailError'); }

    if (!valid) return;

    submitBtn.disabled = true;
    if (spinner) spinner.hidden = false;
    if (label)   label.textContent = 'Adding…';

    var payload = {
      firstName: firstName.value.trim(),
      lastName:  lastName.value.trim(),
      email:     email.value.trim(),
      role:      'organizer'
    };
    if (phone && phone.value.trim()) {
      payload.phone = '+234' + phone.value.trim();
    }

    try {
      // TODO: confirm exact endpoint path in Swagger with Ezekiel
      var res  = await fetch(API + '/admin/organizers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json',
                   'Authorization': 'Bearer ' + getStoredToken() },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add organizer.');
      _close();
      _showToast('Organizer added successfully!');
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Something went wrong.';
        errorEl.hidden      = false;
      }
    } finally {
      submitBtn.disabled = false;
      if (spinner) spinner.hidden = true;
      if (label)   label.textContent = 'Add Organizer';
    }
  });
}

// ── Utilities ─────────────────────────────────────────────
function formatDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch (e) { return raw; }
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _showToast(message) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = 'toast show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = 'toast'; }, 3500);
}