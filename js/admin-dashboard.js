// ================================================
//  EventPro — Admin Dashboard
//  js/admin-dashboard.js
//  Depends on:
//    js/services/auth-service.js
//    js/utils/load-components.js
//
//  Endpoints used:
//  GET /dashboard/stats
//  GET /events?limit=6&sort=recent
//  GET /admin/organizers?limit=5   ← now uses real endpoint
// ================================================

const API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', async () => {

  requireAuth();

  const user = getStoredUser();
  if (user?.role !== 'admin') {
    window.location.href = '../pages/sign-in.html';
    return;
  }

  //  Load sidebar + topbar 
  await loadDashboardComponents('dashboard');

  //  Fetch all data in parallel 
  const token   = getStoredToken();
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const [statsResult, eventsResult, organizersResult] = await Promise.allSettled([
    apiFetch(`${API}/dashboard/stats`,            headers),
    apiFetch(`${API}/events?limit=6&sort=recent`, headers),
    apiFetch(`${API}/admin/organizers?limit=5`,   headers), // ← real endpoint
  ]);

  //  Render all sections 
  renderStatCards(statsResult);
  renderRecentEvents(eventsResult);
  renderTopOrganizers(organizersResult);  // ← now uses organizers data
  renderAttendanceChart(statsResult);

});

//  API HELPER

async function apiFetch(url, headers) {
  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

//  STAT CARDS
//  GET /dashboard/stats returns: { totalUsers, totalEvents }
//  Gracefully handles missing fields with '--'

function renderStatCards(result) {
  const container = document.getElementById('statCards');
  if (!container) return;

  let totalEvents  = '--';
  let totalAttend  = '--';
  let totalRevenue = '--';

  if (result.status === 'fulfilled') {
    const d     = result.value;
    totalEvents = (d.totalEvents   ?? d.total_events   ?? '--').toLocaleString();
    totalAttend = (d.totalAttendees ?? d.totalUsers     ?? '--').toLocaleString();
    const rev   = d.totalRevenue   ?? d.total_revenue   ?? null;
    totalRevenue = rev !== null ? `₦${Number(rev).toLocaleString()}` : 'N/A';
  }

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-left">
        <span class="stat-card-label">Total events</span>
        <div class="stat-card-dots">
          <span class="stat-dot on"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot on-accent"></span>
          <span class="stat-dot on-accent"></span>
          <span class="stat-dot"></span>
        </div>
      </div>
      <span class="stat-card-value">${totalEvents}</span>
    </div>

    <div class="stat-card">
      <div class="stat-card-left">
        <span class="stat-card-label">Attendees</span>
        <div class="stat-card-dots">
          <span class="stat-dot on"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot on-accent"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot"></span>
        </div>
      </div>
      <span class="stat-card-value">${totalAttend}</span>
    </div>

    <div class="stat-card">
      <div class="stat-card-left">
        <span class="stat-card-label">Revenue</span>
        <div class="stat-card-dots">
          <span class="stat-dot on"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot on"></span>
          <span class="stat-dot"></span>
          <span class="stat-dot"></span>
        </div>
      </div>
      <span class="stat-card-value revenue">${totalRevenue}</span>
    </div>
  `;
}

//  RECENT EVENTS TABLE

function renderRecentEvents(result) {
  const tbody = document.getElementById('recentEventsBody');
  if (!tbody) return;

  if (result.status === 'rejected') {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          Unable to load events. Please try again.
        </td>
      </tr>`;
    return;
  }

  const events = result.value?.events ?? result.value?.data ?? result.value ?? [];

  if (!events.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">No events found.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = events.slice(0, 6).map(ev => {
    const date   = ev.date ? formatDate(ev.date) : '--';
    const count  = (ev.attendeeCount ?? ev.attendees ?? 0).toLocaleString();
    const status = ev.status ?? 'pending';
    return `
      <tr>
        <td>${escHtml(ev.title ?? ev.name ?? 'Unnamed')}</td>
        <td>${date}</td>
        <td>${count}</td>
        <td>
          <span class="badge badge-${status.toLowerCase()}">
            ${capitalise(status)}
          </span>
        </td>
      </tr>`;
  }).join('');
}

//  TOP ORGANIZERS
//  Now uses GET /admin/organizers — Swagger confirmed
//  Response: { organizers: [...], pagination, summary }

function renderTopOrganizers(result) {
  const container = document.getElementById('topOrganizersList');
  if (!container) return;

  if (result.status === 'rejected') {
    container.innerHTML = '<p class="empty-state">Unable to load organizers.</p>';
    return;
  }

  const organizers = result.value?.organizers ?? [];

  if (!organizers.length) {
    container.innerHTML = '<p class="empty-state">No organizers yet.</p>';
    return;
  }

  container.innerHTML = organizers.slice(0, 5).map(org => {
    const name     = `${org.firstName ?? ''} ${org.lastName ?? ''}`.trim()
      || 'Unknown Organizer';
    const initials = name.split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const status   = org.isVerified ? 'verified' : 'pending';

    return `
      <div class="organizer-item"
        role="button" tabindex="0"
        onclick="window.location.href='../pages/organizer-management.html'"
        onkeydown="if(event.key==='Enter')
          window.location.href='../pages/organizer-management.html'">
        <div class="organizer-avatar">${initials}</div>
        <div class="organizer-info">
          <p class="organizer-name">${escHtml(name)}</p>
          <p class="organizer-sub">${escHtml(org.email ?? '')}</p>
        </div>
        <div class="organizer-right">
          <span class="badge badge-${status}">
            ${capitalise(status)}
          </span>
          <svg class="organizer-chevron" width="16" height="16"
            viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round"/>
          </svg>
        </div>
      </div>`;
  }).join('');
}

//  ATTENDANCE CHART

function renderAttendanceChart(result) {
  const canvas = document.getElementById('attendanceChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Fallback shape — replaced if backend provides chart data
  let labels     = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  let registered = [800, 950, 1100, 1050, 1300, 1600, 2000, 2500];
  let checkedIn  = [600, 700,  850,  900, 1000, 1200, 1500, 1900];

  if (result.status === 'fulfilled') {
    const chart = result.value?.attendanceChart ?? result.value?.chart ?? null;
    if (chart) {
      labels     = chart.labels     ?? labels;
      registered = chart.registered ?? registered;
      checkedIn  = chart.checkedIn  ?? checkedIn;
    }
  }

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label:            'Registered',
          data:             registered,
          borderColor:      '#6F00FF',
          backgroundColor:  'rgba(111, 0, 255, 0.08)',
          borderWidth:      2.5,
          pointRadius:      3,
          pointHoverRadius: 5,
          tension:          0.4,
          fill:             true,
        },
        {
          label:            'Checked In',
          data:             checkedIn,
          borderColor:      '#F97316',
          backgroundColor:  'rgba(249, 115, 22, 0.06)',
          borderWidth:      2.5,
          pointRadius:      3,
          pointHoverRadius: 5,
          tension:          0.4,
          fill:             true,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align:    'end',
          labels: {
            font:      { family: 'Poppins', size: 12 },
            boxWidth:  12,
            boxHeight: 12,
            padding:   16,
          },
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleFont:       { family: 'Poppins', size: 12 },
          bodyFont:        { family: 'Poppins', size: 12 },
          padding:         10,
          cornerRadius:    8,
        },
      },
      scales: {
        x: {
          grid:   { display: false },
          ticks:  { font: { family: 'Poppins', size: 11 }, color: '#6B7280' },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid:   { color: '#F3F4F6' },
          ticks: {
            font:     { family: 'Poppins', size: 11 },
            color:    '#6B7280',
            callback: v => v.toLocaleString(),
          },
          border: { display: false },
        },
      },
    },
  });
}

//  UTILITIES

function formatDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return raw; }
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}