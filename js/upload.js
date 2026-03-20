// ================================================
//  EventPro — CSV Upload
//  js/upload.js
//  Requires: auth-service.js
//
//  Flow:
//  1. User arrives from attendees.html?eventId=...
//     via Add Attendees button
//  2. Selects or drags a CSV file
//  3. File uploads to POST /events/{eventId}/attendees/import
//     TODO: confirm exact endpoint + request format with Ezekiel
//     Expected: multipart/form-data { file: <csv> }
//  4. On success → store importId in sessionStorage
//     → redirect to csv-validation.html
//  5. On error → show error state on file item
// ================================================

var _API     = 'https://eventpro-fxfv.onrender.com/api';
var _eventId = null;

document.addEventListener('DOMContentLoaded', function () {

  // ── Read eventId from URL ──────────────────────
  var params = new URLSearchParams(window.location.search);
  _eventId   = params.get('eventId') || null;

  // ── DOM refs ───────────────────────────────────
  var dropZone  = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var uploadBtn = document.getElementById('uploadBtn');
  var fileList  = document.getElementById('fileList');

  // ── Upload button — open file picker ──────────
  uploadBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    fileInput.click();
  });

  // ── Drop zone click ────────────────────────────
  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  // ── Keyboard accessibility ─────────────────────
  dropZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // ── File input change ──────────────────────────
  fileInput.addEventListener('change', function (e) {
    _handleFiles(e.target.files);
    // Reset so same file can be re-selected
    fileInput.value = '';
  });

  // ── Drag events ────────────────────────────────
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function (e) {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    _handleFiles(e.dataTransfer.files);
  });

  // ── Handle selected files ──────────────────────
  function _handleFiles(files) {
    var fileArr = Array.from(files);

    fileArr.forEach(function (file) {
      // CSV only
      if (!_isCSV(file)) {
        _showFileError(file.name, 'Only CSV files are supported.');
        return;
      }

      // 500MB limit
      if (file.size > 500 * 1024 * 1024) {
        _showFileError(file.name, 'File exceeds 500 MB limit.');
        return;
      }

      _uploadFile(file);
    });
  }

  // ── Validate CSV ───────────────────────────────
  function _isCSV(file) {
    return file.type === 'text/csv'
      || file.name.toLowerCase().endsWith('.csv');
  }

  // ── Upload file ────────────────────────────────
  function _uploadFile(file) {
    var item = _createFileItem(file);
    fileList.appendChild(item);

    var progressFill = item.querySelector('.ul-progress-fill');
    var pctEl        = item.querySelector('.ul-file-item__pct');
    var sizeEl       = item.querySelector('.ul-file-item__size');
    var statusEl     = item.querySelector('.ul-file-item__status');

    /*
     * TODO: Replace with real endpoint once Ezekiel confirms in Swagger.
     * Expected: POST /events/{eventId}/attendees/import
     * Body: multipart/form-data with CSV file
     * Response: { importId: "..." }
     *
     * Current: simulates upload progress then redirects to csv-validation.html
     */
    if (_eventId) {
      var formData = new FormData();
      formData.append('file', file);

      var xhr = new XMLHttpRequest();

      // Real upload progress
      xhr.upload.addEventListener('progress', function (e) {
        if (!e.lengthComputable) return;
        var pct      = Math.round((e.loaded / e.total) * 100);
        var uploaded = _formatSize(e.loaded);
        var total    = _formatSize(file.size);

        progressFill.style.width  = pct + '%';
        if (pctEl)    pctEl.textContent   = pct + '%';
        if (sizeEl)   sizeEl.textContent  = uploaded + ' / ' + total;
        if (statusEl) statusEl.innerHTML  = '<span class="ul-spinner-icon">↻</span> Uploading…';
      });

      xhr.addEventListener('load', function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          var data = null;
          try { data = JSON.parse(xhr.responseText); } catch (e) { data = {}; }

          _markCompleted(item, file, sizeEl, statusEl, pctEl);

          // Store importId and redirect
          var importId = data.importId || data.id || null;
          if (importId) {
            sessionStorage.setItem('eventpro_import_event_id', _eventId);
            sessionStorage.setItem('eventpro_import_id',       importId);
          }

          setTimeout(function () {
            window.location.href = '../pages/csv-validation.html';
          }, 1200);

        } else {
          _markError(item, statusEl, 'Upload failed. Please try again.');
        }
      });

      xhr.addEventListener('error', function () {
        _markError(item, statusEl, 'Network error. Please try again.');
      });

      xhr.open('POST', _API + '/events/' + _eventId + '/attendees/import');
      xhr.setRequestHeader('Authorization', 'Bearer ' + getStoredToken());
      xhr.send(formData);

    } else {
      // No eventId — simulate progress for preview/testing
      _simulateProgress(file, item, progressFill, pctEl, sizeEl, statusEl);
    }
  }

  // ── Simulate upload progress (no eventId fallback) ────────
  function _simulateProgress(file, item, progressFill, pctEl, sizeEl, statusEl) {
    var pct      = 0;
    var interval = setInterval(function () {
      pct += Math.random() * 10;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        _markCompleted(item, file, sizeEl, statusEl, pctEl);
        // Redirect to csv-validation after short delay
        setTimeout(function () {
          window.location.href = '../pages/csv-validation.html';
        }, 1200);
        return;
      }

      var uploaded = _formatSize((file.size * pct) / 100);
      var total    = _formatSize(file.size);

      progressFill.style.width = pct + '%';
      if (pctEl)    pctEl.textContent  = Math.floor(pct) + '%';
      if (sizeEl)   sizeEl.textContent = uploaded + ' / ' + total;
      if (statusEl) statusEl.innerHTML = '<span class="ul-spinner-icon">↻</span> Updating….';
    }, 400);

    // Wire cancel
    var cancelBtn = item.querySelector('.ul-file-item__action');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        clearInterval(interval);
        item.remove();
      });
    }
  }

  // ── Mark completed ─────────────────────────────
  function _markCompleted(item, file, sizeEl, statusEl, pctEl) {
    item.classList.add('completed');

    var bar = item.querySelector('.ul-progress-bar');
    if (bar) bar.style.display = 'none';
    if (pctEl) pctEl.style.display = 'none';

    var total = _formatSize(file.size);
    if (sizeEl) sizeEl.textContent = total + ' / ' + total;

    if (statusEl) {
      statusEl.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">'
        + '<circle cx="12" cy="12" r="10" fill="#18A32C"/>'
        + '<path d="M8 12l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        + '</svg>'
        + ' Completed';
    }

    // Swap cancel → delete
    var action = item.querySelector('.ul-file-item__action');
    if (action) {
      action.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">'
        + '<polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        + '<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        + '<path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        + '</svg>';
      action.addEventListener('click', function () { item.remove(); });
    }
  }

  // ── Mark error ─────────────────────────────────
  function _markError(item, statusEl, msg) {
    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#E11727">' + msg + '</span>';
    }
    var bar = item.querySelector('.ul-progress-bar');
    if (bar) bar.style.display = 'none';
  }

  // ── Show inline error for rejected file ────────
  function _showFileError(name, msg) {
    var item = document.createElement('div');
    item.className = 'ul-file-item';
    item.innerHTML =
      '<div class="ul-file-item__top">'
      + '<div class="ul-file-item__left">'
      +   '<div class="ul-file-item__icon" style="background:#FEE2E2;color:#E11727">'
      +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">'
      +       '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>'
      +       '<line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
      +       '<circle cx="12" cy="16" r="1" fill="currentColor"/>'
      +     '</svg>'
      +   '</div>'
      +   '<div class="ul-file-item__info">'
      +     '<p class="ul-file-item__name">' + _esc(name) + '</p>'
      +     '<p class="ul-file-item__size" style="color:#E11727">' + _esc(msg) + '</p>'
      +   '</div>'
      + '</div>'
      + '<button type="button" class="ul-file-item__action" aria-label="Remove">'
      +   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      + '</button>'
      + '</div>';

    item.querySelector('.ul-file-item__action')
      .addEventListener('click', function () { item.remove(); });

    fileList.appendChild(item);
  }

  // ── Create file item DOM ───────────────────────
  function _createFileItem(file) {
    var item  = document.createElement('div');
    item.className = 'ul-file-item';

    var name  = _esc(file.name);
    var total = _formatSize(file.size);

    item.innerHTML =
      '<div class="ul-file-item__top">'
      + '<div class="ul-file-item__left">'
      +   '<div class="ul-file-item__icon">'
      +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">'
      +       '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
      +       '<polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
      +     '</svg>'
      +   '</div>'
      +   '<div class="ul-file-item__info">'
      +     '<p class="ul-file-item__name">' + name + '</p>'
      +     '<p class="ul-file-item__size">0 KB / ' + total + '</p>'
      +   '</div>'
      + '</div>'
      + '<button type="button" class="ul-file-item__action" aria-label="Cancel upload">'
      +   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      + '</button>'
      + '</div>'
      + '<div class="ul-progress-bar"><div class="ul-progress-fill"></div></div>'
      + '<div class="ul-file-item__status-row">'
      +   '<span class="ul-file-item__status"><span class="ul-spinner-icon">↻</span> Uploading…</span>'
      +   '<span class="ul-file-item__pct">0%</span>'
      + '</div>';

    return item;
  }

  // ── Utilities ──────────────────────────────────
  function _formatSize(bytes) {
    var mb = bytes / (1024 * 1024);
    if (mb < 1) return (bytes / 1024).toFixed(1) + ' KB';
    return mb.toFixed(2) + ' MB';
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

});