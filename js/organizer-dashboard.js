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

var _ORG_API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Role guard — redirect admins to their page ─
  var user = getStoredUser();
  if (user && user.role === 'admin') {
    window.location.href = '../pages/admin-dashboard.html';
    return;
  }

  // ── Load sidebar + topbar ─────────────────────
  loadDashboardComponents('dashboard');

  // ── Fetch data in parallel ────────────────────
  var token   = getStoredToken();
  var headers = {
    'Content-Type':  'application/json',
    'Authorization': 'Bearer ' + token,
  };

  Promise.allSettled([
    _orgApiFetch(_ORG_API + '/organizer/dashboard/stats', headers),
    _orgApiFetch(_ORG_API + '/events?limit=6&sort=recent', headers),
  ]).then(function (results) {
    try { _renderStatCards(results[0]); }   catch(e) {}
    try { _renderRecentEvents(results[1]); } catch(e) {}
    // FIX: Top Organizers removed — admin only feature, not for organizers
    _hideTopOrganizers();
  }).catch(function () {
    // Prevent analytics crash from logging user out
  });

  // ── SSE Stream — live stat updates ───────────
  // GET /organizer/dashboard/stream (Swagger confirmed)
  _initSSEStream(token);

});

// ════════════════════════════════════════════════
//  SSE STREAM — live organizer dashboard updates
//  GET /organizer/dashboard/stream?token={jwt}
// ════════════════════════════════════════════════

function _initSSEStream(token) {
  if (!token || typeof EventSource === 'undefined') return;

  var url = _ORG_API + '/organizer/dashboard/stream?token=' + encodeURIComponent(token);
  var es  = new EventSource(url);

  es.onmessage = function (e) {
    try {
      var data = JSON.parse(e.data);
      if (data && typeof data.totalEvents !== 'undefined') {
        // Update stat cards silently with live data
        var r = { status: 'fulfilled', value: data };
        try { _renderStatCards(r); } catch(err) {}
      }
    } catch (err) { /* ignore malformed messages */ }
  };

  es.onerror = function () {
    // SSE failed — not critical, dashboard still works with initial load
    es.close();
  };
}

// ════════════════════════════════════════════════
//  API HELPER
// ════════════════════════════════════════════════

function _orgApiFetch(url, headers) {
  return fetch(url, {
    method:  'GET',
    headers: headers,
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
}

// ════════════════════════════════════════════════
//  STAT CARDS
// ════════════════════════════════════════════════

function _renderStatCards(result) {
  if (result.status !== 'fulfilled') {
    _orgSetText('totalEventsVal',    '--');
    _orgSetText('ticketsSoldVal',    '--');
    _orgSetText('totalEventsTrendVal', 'Unable to load stats');
    _orgSetText('ticketsSoldTrendVal', 'Unable to load stats');
    return;
  }

  var d = result.value;

  // Total Events
  var totalEvents = d.totalEvents || d.total_events || 0;
  _orgSetText('totalEventsVal', totalEvents.toLocaleString());

  var eventsTrend = d.eventsTrend || d.events_trend || null;
  _orgSetText(
    'totalEventsTrendVal',
    eventsTrend !== null ? eventsTrend + ' from last month' : 'No trend data'
  );

  // Tickets Sold
  var ticketsSold = d.ticketsSold || d.tickets_sold || d.totalTickets || 0;
  _orgSetText('ticketsSoldVal', ticketsSold.toLocaleString());

  var ticketsTrend = d.ticketsTrend || d.tickets_trend || null;
  _orgSetText(
    'ticketsSoldTrendVal',
    ticketsTrend !== null ? ticketsTrend + ' from last month' : 'No trend data'
  );

  _orgSetTrendDirection('totalEventsTrend', eventsTrend);
  _orgSetTrendDirection('ticketsSoldTrend', ticketsTrend);
}

function _orgSetTrendDirection(containerId, trend) {
  if (trend === null || trend === undefined) return;
  var container = document.getElementById(containerId);
  if (!container) return;

  var svg    = container.querySelector('svg');
  var isDown = Number(trend) < 0;
  var color  = isDown ? '#E11727' : '#11886A';

  if (svg) {
    svg.style.color     = color;
    svg.style.transform = isDown ? 'rotate(180deg)' : '';
  }
  container.style.color = color;

  container.querySelectorAll('span').forEach(function (s) {
    s.style.color = color;
  });
}

// ════════════════════════════════════════════════
//  RECENT EVENTS TABLE
// ════════════════════════════════════════════════

function _renderRecentEvents(result) {
  var tbody = document.getElementById('recentEventsBody');
  if (!tbody) return;

  if (result.status === 'rejected') {
    tbody.innerHTML = '<tr><td colspan="4" class="org-empty">Unable to load events. Please try again.</td></tr>';
    return;
  }

  var events = (result.value && (result.value.events || result.value.data || result.value)) || [];

  if (!Array.isArray(events) || !events.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="org-empty">No events found.</td></tr>';
    return;
  }

  tbody.innerHTML = events.slice(0, 6).map(function (ev) {
    var name       = _orgEscHtml(ev.name || ev.title || 'Unnamed');
    var date       = ev.date ? _orgFmtDate(ev.date) : '—';
    var registered = (ev.registeredCount || ev.registered || ev.attendeeCount || 0).toLocaleString();
    var capacity   = ev.capacity ? '/' + ev.capacity.toLocaleString() : '';
    var status     = ev.status || 'pending';
    var eventId    = _orgEscHtml(ev._id || ev.id || '');

    return '<tr'
      + ' tabindex="0" role="button" style="cursor:pointer"'
      + ' onclick="window.location.href=\'../pages/attendees.html?eventId=' + eventId + '\'"'
      + ' onkeydown="if(event.key===\'Enter\')window.location.href=\'../pages/attendees.html?eventId=' + eventId + '\'">'
      + '<td>' + name + '</td>'
      + '<td>' + date + '</td>'
      + '<td>' + registered + capacity + '</td>'
      + '<td><span class="badge badge-' + _orgEscHtml(status.toLowerCase()) + '">' + _orgCap(status) + '</span></td>'
      + '</tr>';
  }).join('');
}

// ════════════════════════════════════════════════
//  TOP ORGANIZERS — hidden for organizer role
// ════════════════════════════════════════════════

function _hideTopOrganizers() {
  // FIX: Top Organizers is an admin-only feature
  // Organizers should not see other organizers' data
  var section = document.getElementById('topOrganizersSection');
  var container = document.getElementById('topOrganizersList');
  if (section) section.style.display = 'none';
  if (container) container.style.display = 'none';
}

function _renderTopOrganizers(result) {
  var container = document.getElementById('topOrganizersList');
  if (!container) return;

  if (result.status === 'rejected') {
    container.innerHTML = '<p class="org-empty">Unable to load organizers.</p>';
    return;
  }

  var events = (result.value && (result.value.events || result.value.data || result.value)) || [];

  // Deduplicate organizers from events data
  var seen       = {};
  var organizers = [];

  if (Array.isArray(events)) {
    events.forEach(function (ev) {
      var id    = ev.organizerId || (ev.organizer && ev.organizer.id) || ev.organizer;
      var name  = ev.organizerName || (ev.organizer && ev.organizer.name) || 'Unknown Organizer';
      var email = (ev.organizer && ev.organizer.email) || ev.organizerEmail || '';
      var photo = (ev.organizer && (ev.organizer.photo || ev.organizer.avatar)) || null;

      if (id && !seen[id]) {
        seen[id] = true;
        organizers.push({
          id:     id,
          name:   name,
          email:  email,
          photo:  photo,
          status: (ev.organizer && ev.organizer.status) || ev.status || 'active',
        });
      }
    });
  }

  if (!organizers.length) {
    container.innerHTML = '<p class="org-empty">No organizers yet.</p>';
    return;
  }

  container.innerHTML = organizers.slice(0, 5).map(function (org) {
    var initials = org.name
      .split(' ')
      .filter(Boolean)
      .map(function (w) { return w[0]; })
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

    var status         = org.status || 'active';
    var avatarContent  = org.photo
      ? '<img src="' + _orgEscHtml(org.photo) + '" alt="' + _orgEscHtml(org.name) + '"'
      +   ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" />'
      +   '<span style="display:none">' + _orgEscHtml(initials) + '</span>'
      : _orgEscHtml(initials);

    return '<div class="org-organizer-item" role="button" tabindex="0"'
      + ' onclick="window.location.href=\'../pages/organizer-management.html\'"'
      + ' onkeydown="if(event.key===\'Enter\')window.location.href=\'../pages/organizer-management.html\'">'
      + '<div class="org-organizer-avatar">' + avatarContent + '</div>'
      + '<div class="org-organizer-info">'
      +   '<p class="org-organizer-name">' + _orgEscHtml(org.name) + '</p>'
      +   '<p class="org-organizer-sub">' + _orgEscHtml(org.email || 'John Doe') + '</p>'
      + '</div>'
      + '<div class="org-organizer-right">'
      +   '<span class="badge badge-' + _orgEscHtml(status.toLowerCase()) + '">' + _orgCap(status) + '</span>'
      +   '<svg class="org-organizer-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
      +     '<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      +   '</svg>'
      + '</div>'
      + '</div>';
  }).join('');
}

// ════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════

function _orgSetText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

function _orgFmtDate(raw) {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch (e) { return String(raw); }
}

function _orgCap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _orgEscHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}