// ================================================
//  EventPro — Organizer Reports
//  js/organizer-report.js
//  Depends on:
//    js/services/auth-service.js
//    js/utils/load-components.js
//
//  Endpoints used (Swagger confirmed):
//  GET /organizer/dashboard/stats ← organizer stats
//  GET /reports/timeline          ← chart data
// ================================================

var _API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Role guard — organizer only ───────────────
  var user = getStoredUser();
  if (!user) {
    window.location.href = '../pages/sign-in.html';
    return;
  }
  if (user.role === 'admin') {
    window.location.href = '../pages/admin-report.html';
    return;
  }

  // ── Load sidebar + topbar ─────────────────────
  loadDashboardComponents('reports');

  // ── Fetch data in parallel ────────────────────
  var headers = {
    'Content-Type':  'application/json',
    'Authorization': 'Bearer ' + getStoredToken(),
  };

  // Reports need eventId — fetch organizer's latest event first
  _apiFetch(_API + '/events/organizer/my-events?limit=1', headers)
    .then(function (evData) {
      var events  = (evData && (evData.events || evData.data)) || [];
      var eventId = events.length ? (events[0]._id || events[0].id) : null;

      var summaryUrl  = eventId
        ? _API + '/reports/summary?eventId='  + eventId
        : null;
      var timelineUrl = eventId
        ? _API + '/reports/timeline?eventId=' + eventId
        : null;

      return Promise.allSettled([
        summaryUrl  ? _apiFetch(summaryUrl,  headers) : _apiFetch(_API + '/organizer/dashboard/stats', headers),
        timelineUrl ? _apiFetch(timelineUrl, headers) : Promise.resolve({ success: false }),
      ]);
    })
    .then(function (results) {
      _renderMeta(results[0]);
      _renderStats(results[0]);
      _waitForChart(function () { _renderChart(results[1]); });
    })
    .catch(function () {
      // Fallback to organizer stats
      _apiFetch(_API + '/organizer/dashboard/stats', headers)
        .then(function (data) {
          var r = { status: 'fulfilled', value: data };
          _renderMeta(r);
          _renderStats(r);
        });
    });

  // ── Wire buttons ──────────────────────────────
  var csvBtn = document.getElementById('btn-csv');
  var pdfBtn = document.getElementById('btn-pdf');
  if (csvBtn) csvBtn.addEventListener('click', _exportCSV);
  if (pdfBtn) pdfBtn.addEventListener('click', _exportPDF);

});

// ════════════════════════════════════════════════
//  API HELPER
// ════════════════════════════════════════════════

function _apiFetch(url, headers) {
  return fetch(url, {
    method:  'GET',
    headers: headers,
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
}

// Wait for Chart.js to load (it's deferred)
function _waitForChart(cb, retries) {
  retries = retries !== undefined ? retries : 20;
  if (typeof Chart !== 'undefined') {
    cb();
  } else if (retries > 0) {
    setTimeout(function () { _waitForChart(cb, retries - 1); }, 150);
  }
}

// ════════════════════════════════════════════════
//  RENDER — META
// ════════════════════════════════════════════════

function _renderMeta(result) {
  if (result.status !== 'fulfilled') return;
  var d = result.value;
  _setText('metaEvent',     d.eventName     || (d.event && d.event.name)         || '—');
  _setText('metaDate',      d.eventDate     ? _fmtDate(d.eventDate)              : '—');
  _setText('metaOrganizer', d.organizerName || (d.organizer && d.organizer.name) || '—');
}

// ════════════════════════════════════════════════
//  RENDER — STAT LIST
// ════════════════════════════════════════════════

var _STAT_CONFIG = [
  { cls: 'attendees', label: 'Total Attendees', keys: ['totalAttendees', 'total_attendees'],  icon: _iconAttendees() },
  { cls: 'vip',       label: 'VIP Tickets',     keys: ['vipTickets',     'vip_tickets'],       icon: _iconVip()       },
  { cls: 'regular',   label: 'Regular',          keys: ['regularTickets', 'regular_tickets'],   icon: _iconRegular()   },
  { cls: 'checkin',   label: 'Checked-In',       keys: ['checkedIn',      'checked_in'],        icon: _iconCheckin()   },
  { cls: 'pending',   label: 'Pending',           keys: ['pending'],                            icon: _iconPending()   },
];

function _renderStats(result) {
  var list = document.getElementById('statList');
  if (!list) return;

  var d = result.status === 'fulfilled' ? result.value : null;

  list.innerHTML = _STAT_CONFIG.map(function (cfg) {
    var raw   = d ? _pick(d, cfg.keys) : null;
    var value = raw !== null && raw !== undefined
      ? (typeof raw === 'number' ? raw.toLocaleString() : raw)
      : '—';

    return '<li class="rpt-stat-row">'
      + '<div class="rpt-stat-row__left">'
      +   '<span class="rpt-stat-icon rpt-stat-icon--' + cfg.cls + '" aria-hidden="true">' + cfg.icon + '</span>'
      +   '<span class="rpt-stat-label">' + cfg.label + '</span>'
      + '</div>'
      + '<span class="rpt-stat-value">' + value + '</span>'
      + '</li>';
  }).join('');
}

// ════════════════════════════════════════════════
//  RENDER — CHART
// ════════════════════════════════════════════════

function _renderChart(result) {
  var canvas = document.getElementById('attendanceChart');
  if (!canvas) return;

  var labels    = ['Mar 28', 'Mar 29', 'Mar 30', 'Mar 31', 'Apr 1'];
  var total     = [170, 300, 130, 250, 270];
  var checkedIn = [120, 220, 100, 180, 200];

  if (result.status === 'fulfilled') {
    var d = result.value;
    labels    = d.labels    || labels;
    total     = d.total     || d.registered || total;
    checkedIn = d.checkedIn || d.checked_in  || checkedIn;
  }

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label:            'Total',
          data:             total,
          borderColor:      '#6F00FF',
          backgroundColor:  'rgba(111,0,255,0.08)',
          borderWidth:      2.5,
          pointRadius:      4,
          pointHoverRadius: 6,
          tension:          0.4,
          fill:             true,
        },
        {
          label:            'Checked-In',
          data:             checkedIn,
          borderColor:      '#00BFA5',
          backgroundColor:  'rgba(0,191,165,0.06)',
          borderWidth:      2.5,
          pointRadius:      4,
          pointHoverRadius: 6,
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
            callback: function (v) { return v.toLocaleString(); },
          },
          border: { display: false },
        },
      },
    },
  });
}

// ════════════════════════════════════════════════
//  EXPORT — CSV
// ════════════════════════════════════════════════

function _exportCSV() {
  var rows = document.querySelectorAll('.rpt-stat-row:not(.skeleton-row)');
  if (!rows.length) {
    _showToast('No data to export.', 'error');
    return;
  }

  var lines = ['Category,Count'];
  rows.forEach(function (row) {
    var label = (row.querySelector('.rpt-stat-label') || {}).textContent || '';
    var value = (row.querySelector('.rpt-stat-value') || {}).textContent || '';
    if (label.trim()) lines.push(label.trim() + ',' + value.trim());
  });

  _downloadFile('organizer-report.csv', lines.join('\n'), 'text/csv');
  _showToast('CSV exported successfully.', 'success');
}

// ════════════════════════════════════════════════
//  EXPORT — PDF
// ════════════════════════════════════════════════

function _exportPDF() {
  if (typeof window.jspdf === 'undefined') {
    _showToast('PDF library not loaded yet. Please wait.', 'error');
    return;
  }

  var jsPDF = window.jspdf.jsPDF;
  var doc   = new jsPDF();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EventPro — Organizer Summary Report', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Event: '     + (document.getElementById('metaEvent')     || {}).textContent,     14, 32);
  doc.text('Date: '      + (document.getElementById('metaDate')      || {}).textContent,      14, 39);
  doc.text('Organizer: ' + (document.getElementById('metaOrganizer') || {}).textContent, 14, 46);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 51, 196, 51);

  doc.setFontSize(11);
  var y = 62;

  document.querySelectorAll('.rpt-stat-row:not(.skeleton-row)').forEach(function (row) {
    var label = (row.querySelector('.rpt-stat-label') || {}).textContent || '';
    var value = (row.querySelector('.rpt-stat-value') || {}).textContent || '';
    if (!label.trim()) return;
    doc.setFont('helvetica', 'normal');
    doc.text(label.trim(), 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value.trim(), 180, y, { align: 'right' });
    y += 10;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    'Generated ' + new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    14, 285
  );

  doc.save('organizer-report.pdf');
  _showToast('PDF downloaded successfully.', 'success');
}

// ════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════

function _downloadFile(filename, content, mimeType) {
  var blob = new Blob([content], { type: mimeType });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function _pick(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (obj[keys[i]] !== undefined && obj[keys[i]] !== null) return obj[keys[i]];
  }
  return null;
}

function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

function _fmtDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch (e) { return String(raw); }
}

function _showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = ('toast show ' + (type || '')).trim();
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = 'toast'; }, 3500);
}

// ── Inline SVG icons ──────────────────────────────
function _iconAttendees() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
}
function _iconVip() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>';
}
function _iconRegular() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z"/></svg>';
}
function _iconCheckin() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>';
}
function _iconPending() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>';
}