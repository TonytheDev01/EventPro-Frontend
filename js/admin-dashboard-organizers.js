    //  CONFIG
    const API_BASE = window.APP_CONFIG?.apiBase ?? '/api';

    //  STATE

    let currentOrganizer = null; // till when organizer data arrives
    let selectedFile     = null;

    window.addEventListener('organizer:added', (e) => {
      populateReview(e.detail);
    });

    window.loadOrganizer = (data) => populateReview(data);

    function populateReview(data) {
      if (!data) return;
      currentOrganizer = data;

      const rows = [
        { label: 'Name',              value: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || '—' },
        { label: 'Phone number',      value: data.phone || '—' },
        { label: 'Email',             value: data.email || '—' },
        { label: 'Registration Date', value: formatDate(data.registrationDate) },
        { label: 'Status',            value: statusBadge(data.status || 'pending') },
      ];

      const tbody = document.getElementById('basic-info-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td class="lbl">${escHtml(r.label)}</td>
          <td class="val">${r.value}</td>
        </tr>
      `).join('');

      // Shows table and hides empty state
      document.getElementById('basic-info-empty').style.display = 'none';
      document.getElementById('basic-info-table').style.display = 'table';
      document.getElementById('card-divider').style.display     = 'block';

      //  FILE UPLOAD
      function handleFileChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('File exceeds 5 MB limit.', 'error');
        return;
      }
      selectedFile = file;
      document.getElementById('preview-name').textContent = file.name;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => {
          document.getElementById('preview-img').src = ev.target.result;
          document.getElementById('preview-img').style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        document.getElementById('preview-img').style.display = 'none';
      }

      document.getElementById('upload-placeholder').style.display = 'none';
      document.getElementById('upload-preview').style.display     = 'flex';
    }

    function removeFile(e) {
      e.stopPropagation();
      selectedFile = null;
      document.getElementById('doc-file').value = '';
      document.getElementById('upload-placeholder').style.display = 'flex';
      document.getElementById('upload-preview').style.display     = 'none';
    }

    const zone = document.getElementById('upload-zone');
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById('doc-file').files = dt.files;
        handleFileChange({ target: document.getElementById('doc-file') });
      }
    });

     //  VERIFY DOCUMENT

    async function handleVerify() {
      let valid = true;
      if (!document.getElementById('id-type').value) {
        showFieldError('id-type', 'Please select an ID type.');
        valid = false;
      }
      const idNumber = document.getElementById('id-number').value.trim();
      if (!idNumber) {
        showFieldError('id-number', 'Please enter the ID number.');
        valid = false;
      }
      if (!valid) return;

      setVerifyLoading(true);

      try {
        const formData = new FormData();
        if (selectedFile) formData.append('document', selectedFile);
        formData.append('idType',   document.getElementById('id-type').value);
        formData.append('idNumber', idNumber);
        if (currentOrganizer?.id) formData.append('organizerId', currentOrganizer.id);

        const res = await fetch(`${API_BASE}/organizers/verify-document`, {
          method: 'POST',
          body:   formData,
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const updated = await res.json();

        currentOrganizer = updated;
        populateReview(updated);
        showToast('Document verified successfully!', 'success');

        // Reset document form
        removeFile({ stopPropagation: () => {} });
        document.getElementById('id-type').value   = '';
        document.getElementById('id-number').value = '';

      } catch (err) {
        showToast(err.message || 'Verification failed. Try again.', 'error');
        console.error('[Verify]', err);
      } finally {
        setVerifyLoading(false);
      }
    }

    function setVerifyLoading(loading) {
      document.getElementById('btn-verify').disabled           = loading;
      document.getElementById('verify-spinner').style.display  = loading ? 'block' : 'none';
      document.getElementById('verify-label').textContent      = loading ? 'Verifying…' : 'Verify Document';
    }

  
    function statusBadge(status) {
    return capitalize(status || 'pending');
  }

    function showFieldError(fieldId, msg) {
      document.getElementById(fieldId).classList.add('error');
      const el = document.getElementById(`${fieldId}-error`);
      el.textContent = msg;
      el.classList.add('visible');
    }

    function clearFieldError(fieldId) {
      document.getElementById(fieldId).classList.remove('error');
      document.getElementById(`${fieldId}-error`).classList.remove('visible');
    }

    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className   = `show ${type}`;
      clearTimeout(t._timer);
      t._timer = setTimeout(() => { t.className = ''; }, 4000);
    }

    function formatDate(dateStr) {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
      });
    }

    function capitalize(s) {
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }

    function escHtml(str) {
      const d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }}