// ================================================
//  EventPro — CSV Validation Results
//  js/csv-validation.js
//  Depends on: auth-service.js, load-components.js
//
//  Flow:
//  1. Reads eventpro_import_event_id + eventpro_import_id
//     from sessionStorage (set by upload.js on success)
//  2. Polls GET /events/{eventId}/attendees/imports/{importId}
//     until status === completed / done / failed
//  3. Fetches full result from .../result
//  4. Renders real data — no fallback demo data
//  5. Empty state shown when no importId in sessionStorage
//
//  Endpoints (Swagger confirmed):
//  GET /events/{eventId}/attendees/imports/{importId}
//    → { status, progress }
//  GET /events/{eventId}/attendees/imports/{importId}/result
//    → { summary, importErrors, duplicates }
//  GET /events/{eventId}/attendees/imports/{importId}/duplicates.csv
//    → CSV file download
// ================================================

var _API        = 'https://eventpro-fxfv.onrender.com/api';
var _PAGE_LIMIT = 5;
var _POLL_MAX   = 30; // max poll attempts before showing error

var _eventId    = null;
var _importId   = null;
var _errors     = [];
var _warnings   = [];
var _errorPage  = 1;
var _warnPage   = 1;
var _pollCount  = 0;

document.addEventListener('DOMContentLoaded', function () {

  requireAuth();
  loadDashboardComponents('attendees');

  // ── Read sessionStorage ───────────────────────
  _eventId  = sessionStorage.getItem('eventpro_import_event_id');
  _importId = sessionStorage.getItem('eventpro_import_id');

  // ── Wire tabs ─────────────────────────────────
  var tabErrors   = document.getElementById('tabErrors');
  var tabWarnings = document.getElementById('tabWarnings');
  if (tabErrors)   tabErrors.addEventListener('click',   function () { _switchTab('errors'); });
  if (tabWarnings) tabWarnings.addEventListener('click', function () { _switchTab('warnings'); });

  // ── Wire back button ──────────────────────────
  var backBtn = document.getElementById('btnBack');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      var dest = '../pages/attendees.html';
      if (_eventId) dest += '?eventId=' + encodeURIComponent(_eventId);
      window.location.href = dest;
    });
  }

  // ── Wire download button ──────────────────────
  var downloadBtn = document.getElementById('btnDownloadErrors');
  if (downloadBtn) downloadBtn.addEventListener('click', _downloadDuplicatesCsv);

  // ── Start or show empty state ─────────────────
  if (_eventId && _importId) {
    _showPolling();
    _pollStatus();
  } else {
    _showEmptyState();
  }

});

// ── Show polling / loading state ──────────────────────────
function _showPolling() {
  var banner = document.getElementById('cvBanner');
  var text   = document.getElementById('cvBannerText');
  if (banner) {
    banner.className = 'cv-banner cv-banner--success';
    banner.hidden    = false;
  }
  if (text) text.textContent = 'Processing your CSV file. Please wait…';

  _setText('statValid',    '—');
  _setText('statErrors',   '—');
  _setText('statWarnings', '—');
  _setText('tabErrorCount',   '0');
  _setText('tabWarningCount', '0');

  var errBody  = document.getElementById('errorsTableBody');
  var warnBody = document.getElementById('warningsTableBody');
  var loading  = '<tr><td colspan="5"><div class="spinner" role="status" aria-label="Loading"></div></td></tr>';
  if (errBody)  errBody.innerHTML  = loading;
  if (warnBody) warnBody.innerHTML = loading;
}

// ── Poll import status ────────────────────────────────────
function _pollStatus() {
  _pollCount++;

  if (_pollCount > _POLL_MAX) {
    _showBanner('Import is taking longer than expected. Please refresh the page.', 'error');
    return;
  }

  fetch(_API + '/events/' + _eventId + '/attendees/imports/' + _importId, {
    headers: _headers(),
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var status = (data.status || '').toLowerCase();

      if (status === 'completed' || status === 'done' || status === 'failed') {
        _fetchResult();
      } else {
        // Still processing — update progress if available
        var progress = data.progress;
        if (progress && progress.percent != null) {
          var text = document.getElementById('cvBannerText');
          if (text) text.textContent = 'Processing… ' + Math.round(progress.percent) + '%';
        }
        setTimeout(_pollStatus, 2000);
      }
    })
    .catch(function () {
      // Status endpoint failed — try fetching result directly
      _fetchResult();
    });
}

// ── Fetch full import result ──────────────────────────────
function _fetchResult() {
  fetch(_API + '/events/' + _eventId + '/attendees/imports/' + _importId + '/result', {
    headers: _headers(),
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      _renderResult(data);
    })
    .catch(function () {
      _showBanner('Failed to load import results. Please try again.', 'error');
      var errBody = document.getElementById('errorsTableBody');
      if (errBody) errBody.innerHTML = '<tr><td colspan="5" class="cv-empty">Unable to load results.</td></tr>';
    });
}

// ── Render result from API ────────────────────────────────
function _renderResult(data) {
  var summary = data.summary || {};
  var total   = summary.totalRows  || 0;
  var success = summary.successful || 0;
  var failed  = summary.failed     || 0;
  var dupes   = summary.duplicates || 0;

  _setText('statValid',    success.toLocaleString());
  _setText('statErrors',   failed.toLocaleString());
  _setText('statWarnings', dupes.toLocaleString());
  _setText('tabErrorCount',   failed);
  _setText('tabWarningCount', dupes);

  // Map importErrors → errors array
  _errors = (data.importErrors || []).map(function (e) {
    return {
      row:   e.row   != null ? 'Row ' + e.row : '—',
      name:  e.name  || '—',
      email: e.email || '—',
      issue: e.message || e.field || 'Unknown error',
    };
  });

  // Map duplicates → warnings array
  _warnings = (data.duplicates || []).map(function (d) {
    return {
      row:   d.row  != null ? 'Row ' + d.row : '—',
      name:  d.name  || '—',
      email: d.email || '—',
      issue: 'Duplicate — fields: ' + (d.fields || []).join(', '),
    };
  });

  // Banner message
  var hasIssues = _errors.length > 0 || _warnings.length > 0;
  _showBanner(
    hasIssues
      ? 'CSV file upload completed. Some issues were found in the data. Please review the details below.'
      : 'CSV file upload completed successfully. All ' + success.toLocaleString() + ' entries were imported.',
    'success'
  );

  _errorPage = 1;
  _warnPage  = 1;
  _renderErrorsTable();
  _renderWarningsTable();
}

// ── Empty state — no sessionStorage data ─────────────────
function _showEmptyState() {
  var banner = document.getElementById('cvBanner');
  if (banner) banner.hidden = true;

  _setText('statValid',    '0');
  _setText('statErrors',   '0');
  _setText('statWarnings', '0');
  _setText('tabErrorCount',   '0');
  _setText('tabWarningCount', '0');

  var errBody  = document.getElementById('errorsTableBody');
  var warnBody = document.getElementById('warningsTableBody');
  var msg = '<tr><td colspan="5" class="cv-empty">No import data found. Please upload a CSV file from the Attendees page.</td></tr>';
  if (errBody)  errBody.innerHTML  = msg;
  if (warnBody) warnBody.innerHTML = msg;

  _setText('errorsFooterCount',   'Showing 0 entries');
  _setText('warningsFooterCount', 'Showing 0 entries');
}

// ── Render errors table ───────────────────────────────────
function _renderErrorsTable() {
  var tbody      = document.getElementById('errorsTableBody');
  var totalPages = Math.ceil(_errors.length / _PAGE_LIMIT) || 1;
  var start      = (_errorPage - 1) * _PAGE_LIMIT;
  var visible    = _errors.slice(start, start + _PAGE_LIMIT);

  if (!tbody) return;

  if (!visible.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="cv-empty">No errors found.</td></tr>';
    _setText('errorsFooterCount', 'Showing 0 entries');
    _clearPagination('errorsPagination');
    return;
  }

  tbody.innerHTML = visible.map(function (row) {
    return '<tr>'
      + '<td>' + _esc(row.row)   + '</td>'
      + '<td>' + _esc(row.name)  + '</td>'
      + '<td>' + _esc(row.email) + '</td>'
      + '<td>' + _esc(row.issue) + '</td>'
      + '<td>'
      +   '<span class="cv-status cv-status--error">'
      +     '<span class="cv-status__dot">!</span>Error'
      +   '</span>'
      + '</td>'
      + '</tr>';
  }).join('');

  var from = start + 1;
  var to   = Math.min(start + _PAGE_LIMIT, _errors.length);
  _setText('errorsFooterCount',
    'Showing ' + from + ' to ' + to + ' of ' + _errors.length + ' entries'
  );

  _renderPagination('errorsPagination', _errorPage, totalPages, function (p) {
    _errorPage = p;
    _renderErrorsTable();
  });
}

// ── Render warnings table ─────────────────────────────────
function _renderWarningsTable() {
  var tbody      = document.getElementById('warningsTableBody');
  var totalPages = Math.ceil(_warnings.length / _PAGE_LIMIT) || 1;
  var start      = (_warnPage - 1) * _PAGE_LIMIT;
  var visible    = _warnings.slice(start, start + _PAGE_LIMIT);

  if (!tbody) return;

  if (!visible.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="cv-empty">No warnings found.</td></tr>';
    _setText('warningsFooterCount', 'Showing 0 entries');
    _clearPagination('warningsPagination');
    return;
  }

  tbody.innerHTML = visible.map(function (row) {
    return '<tr>'
      + '<td>' + _esc(row.row)   + '</td>'
      + '<td>' + _esc(row.name)  + '</td>'
      + '<td>' + _esc(row.email) + '</td>'
      + '<td>' + _esc(row.issue) + '</td>'
      + '<td>'
      +   '<span class="cv-status cv-status--warning">'
      +     '<span class="cv-status__dot">!</span>Warning'
      +   '</span>'
      + '</td>'
      + '</tr>';
  }).join('');

  var from = start + 1;
  var to   = Math.min(start + _PAGE_LIMIT, _warnings.length);
  _setText('warningsFooterCount',
    'Showing ' + from + ' to ' + to + ' of ' + _warnings.length + ' entries'
  );

  _renderPagination('warningsPagination', _warnPage, totalPages, function (p) {
    _warnPage = p;
    _renderWarningsTable();
  });
}

// ── Tab switch ────────────────────────────────────────────
function _switchTab(tab) {
  var tabErrors     = document.getElementById('tabErrors');
  var tabWarnings   = document.getElementById('tabWarnings');
  var panelErrors   = document.getElementById('panelErrors');
  var panelWarnings = document.getElementById('panelWarnings');

  if (tab === 'errors') {
    tabErrors.classList.add('cv-tab--active');
    tabWarnings.classList.remove('cv-tab--active');
    tabErrors.setAttribute('aria-selected', 'true');
    tabWarnings.setAttribute('aria-selected', 'false');
    panelErrors.classList.remove('cv-panel--hidden');
    panelWarnings.classList.add('cv-panel--hidden');
  } else {
    tabWarnings.classList.add('cv-tab--active');
    tabErrors.classList.remove('cv-tab--active');
    tabWarnings.setAttribute('aria-selected', 'true');
    tabErrors.setAttribute('aria-selected', 'false');
    panelWarnings.classList.remove('cv-panel--hidden');
    panelErrors.classList.add('cv-panel--hidden');
  }
}

// ── Download duplicates CSV ───────────────────────────────
function _downloadDuplicatesCsv() {
  if (!_eventId || !_importId) {
    _showToast('No import data available to download.');
    return;
  }
  var url = _API + '/events/' + _eventId
    + '/attendees/imports/' + _importId + '/duplicates.csv';
  window.location.href = url + '?token=' + encodeURIComponent(getStoredToken());
}

// ── Render pagination ─────────────────────────────────────
function _renderPagination(navId, currentPage, totalPages, onPageChange) {
  var nav = document.getElementById(navId);
  if (!nav) return;

  var html = '<button class="cv-page-btn" '
    + (currentPage === 1 ? 'disabled' : 'data-page="' + (currentPage - 1) + '"')
    + ' aria-label="Previous">&lt;</button>';

  _pageRange(currentPage, totalPages).forEach(function (p) {
    if (p === '...') {
      html += '<span style="padding:0 0.25rem;color:var(--color-text-muted)">…</span>';
    } else {
      html += '<button class="cv-page-btn' + (p === currentPage ? ' active' : '') + '" '
        + 'data-page="' + p + '" aria-label="Page ' + p + '">' + p + '</button>';
    }
  });

  html += '<button class="cv-page-btn" '
    + (currentPage === totalPages ? 'disabled' : 'data-page="' + (currentPage + 1) + '"')
    + ' aria-label="Next">Next &gt;</button>';

  nav.innerHTML = html;

  nav.querySelectorAll('.cv-page-btn:not([disabled])').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.page) onPageChange(Number(btn.dataset.page));
    });
  });
}

function _clearPagination(navId) {
  var nav = document.getElementById(navId);
  if (nav) nav.innerHTML = '';
}

function _pageRange(current, total) {
  if (total <= 5) {
    var arr = [];
    for (var i = 1; i <= total; i++) arr.push(i);
    return arr;
  }
  var pages = [1, 2];
  if (current > 3) pages.push('...');
  if (current > 2 && current < total - 1) pages.push(current);
  pages.push('...');
  pages.push(total);
  var seen = {};
  return pages.filter(function (p) {
    if (p === '...') return true;
    if (seen[p]) return false;
    seen[p] = true;
    return true;
  });
}

// ── Utilities ─────────────────────────────────────────────
function _headers() {
  return {
    'Content-Type':  'application/json',
    'Authorization': 'Bearer ' + getStoredToken(),
  };
}

function _showBanner(msg, type) {
  var banner = document.getElementById('cvBanner');
  var textEl = document.getElementById('cvBannerText');
  if (!banner) return;
  banner.className = 'cv-banner cv-banner--' + (type || 'success');
  if (textEl) textEl.textContent = msg;
  banner.hidden = false;
}

function _showToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = 'toast show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = 'toast'; }, 3500);
}

function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val != null ? val : '—';
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}