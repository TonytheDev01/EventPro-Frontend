// ================================================
//  EventPro — Organizer Dashboard
//  js/organizer-dashboard.js
//  Depends on:
//    js/services/auth-service.js
//    js/utils/load-components.js
//
//  Endpoints used:
//  GET /dashboard/stats           ← stat cards
//  GET /events?limit=6&sort=recent← recent events + organizers
// ================================================

const API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Role guard — redirect admins to their page ─
  const user = getStoredUser();
  if (user?.role === 'admin') {
    window.location.href = '../pages/admin-dashboard.html';
    return;
  }

  // ── Load sidebar + topbar ─────────────────────
  await loadDashboardComponents('dashboard');

  // ── Fetch data in parallel ────────────────────
  const token   = getStoredToken();
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const [statsResult, eventsResult] = await Promise.allSettled([
    _apiFetch(`${API}/dashboard/stats`,             headers),
    _apiFetch(`${API}/events?limit=6&sort=recent`,  headers),
  ]);

  // ── Render all sections ───────────────────────
  _renderStatCards(statsResult);
  _renderRecentEvents(eventsResult);
  _renderTopOrganizers(eventsResult);

});

// ════════════════════════════════════════════════
//  API HELPER
// ════════════════════════════════════════════════

async function _apiFetch(url, headers) {
  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ════════════════════════════════════════════════
//  STAT CARDS
// ════════════════════════════════════════════════

function _renderStatCards(result) {
  if (result.status !== 'fulfilled') {
    _setText('totalEventsVal',    '--');
    _setText('ticketsSoldVal',    '--');
    _setText('totalEventsTrendVal', 'Unable to load stats');
    _setText('ticketsSoldTrendVal', 'Unable to load stats');
    // Hide trend arrows on error
    document.getElementById('totalEventsTrend')
      ?.querySelector('svg')?.remove();
    document.getElementById('ticketsSoldTrend')
      ?.querySelector('svg')?.remove();
    return;
  }

  const d = result.value;

  // Total Events
  const totalEvents = d.totalEvents ?? d.total_events ?? 0;
  _setText('totalEventsVal', totalEvents.toLocaleString());

  const eventsTrend = d.eventsTrend ?? d.events_trend ?? null;
  _setText(
    'totalEventsTrendVal',
    eventsTrend !== null
      ? `${eventsTrend} from last month`
      : 'No trend data'
  );

  // Tickets Sold
  const ticketsSold = d.ticketsSold ?? d.tickets_sold ?? d.totalTickets ?? 0;
  _setText('ticketsSoldVal', ticketsSold.toLocaleString());

  const ticketsTrend = d.ticketsTrend ?? d.tickets_trend ?? null;
  _setText(
    'ticketsSoldTrendVal',
    ticketsTrend !== null
      ? `${ticketsTrend} from last month`
      : 'No trend data'
  );

  // Show down arrow if trend is negative
  _setTrendDirection('totalEventsTrend',  eventsTrend);
  _setTrendDirection('ticketsSoldTrend',  ticketsTrend);
}

function _setTrendDirection(containerId, trend) {
  if (trend === null || trend === undefined) return;
  const container = document.getElementById(containerId);
  if (!container) return;

  const svg = container.querySelector('svg');
  if (!svg) return;

  const isDown = Number(trend) < 0;
  const color  = isDown ? '#E11727' : '#11886A';

  svg.style.color = color;
  container.style.color = color;

  // Flip arrow for downward trend
  if (isDown) {
    svg.style.transform = 'rotate(180deg)';
  }

  // Update all child spans too
  container.querySelectorAll('span').forEach(s => {
    s.style.color = color;
  });
}

// ════════════════════════════════════════════════
//  RECENT EVENTS TABLE
// ════════════════════════════════════════════════

function _renderRecentEvents(result) {
  const tbody = document.getElementById('recentEventsBody');
  if (!tbody) return;

  if (result.status === 'rejected') {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="org-empty">
          Unable to load events. Please try again.
        </td>
      </tr>`;
    return;
  }

  const events = result.value?.events
    ?? result.value?.data
    ?? result.value
    ?? [];

  if (!Array.isArray(events) || !events.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="org-empty">No events found.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = events.slice(0, 6).map(ev => {
    const name       = _escHtml(ev.name       ?? ev.title       ?? 'Unnamed');
    const date       = ev.date ? _fmtDate(ev.date) : '—';
    const registered = (ev.registeredCount ?? ev.registered ?? ev.attendeeCount ?? 0).toLocaleString();
    const capacity   = ev.capacity ? `/${ev.capacity.toLocaleString()}` : '';
    const status     = ev.status ?? 'pending';

    return `
      <tr
        tabindex="0"
        role="button"
        style="cursor:pointer"
        onclick="window.location.href='../pages/attendees.html?eventId=${_escHtml(ev._id ?? ev.id ?? '')}'"
        onkeydown="if(event.key==='Enter')window.location.href='../pages/attendees.html?eventId=${_escHtml(ev._id ?? ev.id ?? '')}'">
        <td>${name}</td>
        <td>${date}</td>
        <td>${registered}${capacity}</td>
        <td>
          <span class="badge badge-${_escHtml(status.toLowerCase())}">
            ${_cap(status)}
          </span>
        </td>
      </tr>`;
  }).join('');
}

// ════════════════════════════════════════════════
//  TOP ORGANIZERS
// ════════════════════════════════════════════════

function _renderTopOrganizers(result) {
  const container = document.getElementById('topOrganizersList');
  if (!container) return;

  if (result.status === 'rejected') {
    container.innerHTML = `<p class="org-empty">Unable to load organizers.</p>`;
    return;
  }

  const events = result.value?.events
    ?? result.value?.data
    ?? result.value
    ?? [];

  // Deduplicate organizers from events data
  const seen       = new Set();
  const organizers = [];

  (Array.isArray(events) ? events : []).forEach(ev => {
    const id   = ev.organizerId ?? ev.organizer?.id ?? ev.organizer;
    const name = ev.organizerName ?? ev.organizer?.name ?? 'Unknown Organizer';
    const email = ev.organizer?.email ?? ev.organizerEmail ?? '';
    const photo = ev.organizer?.photo ?? ev.organizer?.avatar ?? null;

    if (id && !seen.has(id)) {
      seen.add(id);
      organizers.push({
        id,
        name,
        email,
        photo,
        status: ev.organizer?.status ?? ev.status ?? 'active',
      });
    }
  });

  if (!organizers.length) {
    container.innerHTML = `<p class="org-empty">No organizers yet.</p>`;
    return;
  }

  container.innerHTML = organizers.slice(0, 5).map(org => {
    const initials = org.name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

    const status  = org.status ?? 'active';

    // Avatar: real photo if available, else initials
    const avatarContent = org.photo
      ? `<img src="${_escHtml(org.photo)}" alt="${_escHtml(org.name)}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
         <span style="display:none">${_escHtml(initials)}</span>`
      : _escHtml(initials);

    return `
      <div
        class="org-organizer-item"
        role="button"
        tabindex="0"
        onclick="window.location.href='../pages/organizer-management.html'"
        onkeydown="if(event.key==='Enter')window.location.href='../pages/organizer-management.html'">

        <div class="org-organizer-avatar">${avatarContent}</div>

        <div class="org-organizer-info">
          <p class="org-organizer-name">${_escHtml(org.name)}</p>
          <p class="org-organizer-sub">${_escHtml(org.email || 'John Doe')}</p>
        </div>

        <div class="org-organizer-right">
          <span class="badge badge-${_escHtml(status.toLowerCase())}">
            ${_cap(status)}
          </span>
          <svg class="org-organizer-chevron" width="16" height="16"
            viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18l6-6-6-6"
              stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>`;
  }).join('');
}

// ════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function _fmtDate(raw) {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return String(raw); }
}

function _cap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}