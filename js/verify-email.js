// ================================================
//  EventPro — Verify Email
//  js/verify-email.js
//  Depends on: js/services/auth-service.js
//
//  The page always shows exactly the Figma design.
//  All logic runs invisibly — feedback appears only
//  in the button text and the hidden #veStatus line.
//
//  FLOW 1 — Token in URL (?token=abc123)
//    User clicked the email link.
//    → Calls POST /auth/verify-email { token }
//    → Success → redirects to sign-in.html
//    → Failure → shows error in #veStatus
//      + button becomes "Resend Verification Mail"
// ================================================

const BASE_URL = 'https://eventpro-fxfv.onrender.com/api';

const resendBtn    = document.getElementById('resendBtn');
const maskedEmailEl = document.getElementById('maskedEmail');
const statusEl     = document.getElementById('veStatus');
const pendingEmail = localStorage.getItem('eventpro_pending_email');
const params       = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get('token');

//  Show masked email 
if (maskedEmailEl && pendingEmail) {
  maskedEmailEl.textContent = _maskEmail(pendingEmail);
}

//  FLOW 1 — Token present → verify automatically
if (tokenFromUrl) {
  // Button shows verifying state while request runs
  if (resendBtn) {
    resendBtn.textContent = 'Verifying…';
    resendBtn.disabled    = true;
  }
  _verifyToken(tokenFromUrl);
}

//  FLOW 2 — No token → wire resend button
else {
  _wireResend();
}

//  VERIFY TOKEN
async function _verifyToken(token) {
  try {
    const res  = await fetch(`${BASE_URL}/auth/verify-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
      signal:  AbortSignal.timeout(15000),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.removeItem('eventpro_pending_email');

      // Show success inline then redirect
      if (resendBtn) {
        resendBtn.textContent = '✓ Verified! Redirecting…';
        resendBtn.disabled    = true;
      }
      _showStatus('Email verified successfully!', 'success');

      setTimeout(() => {
        window.location.href = '../pages/sign-in.html';
      }, 2000);

    } else {
      // Token failed — show error, re-enable resend
      _showStatus(
        data.message || 'Link is invalid or expired. Request a new one.',
        'error'
      );
      if (resendBtn) {
        resendBtn.textContent = 'Resend Verification Mail';
        resendBtn.disabled    = false;
      }
      _wireResend();
    }

  } catch (err) {
    _showStatus(
      err.name === 'TimeoutError'
        ? 'Request timed out. Please try again.'
        : 'Network error. Please check your connection.',
      'error'
    );
    if (resendBtn) {
      resendBtn.textContent = 'Resend Verification Mail';
      resendBtn.disabled    = false;
    }
    _wireResend();
  }
}

//  RESEND
function _wireResend() {
  if (!resendBtn) return;
  // Guard against wiring twice
  if (resendBtn._wired) return;
  resendBtn._wired = true;

  let cooldown = null;

  resendBtn.addEventListener('click', async () => {
    const email = pendingEmail
      || prompt('Enter the email address you signed up with:')?.trim();

    if (!email) return;

    if (!pendingEmail) {
      localStorage.setItem('eventpro_pending_email', email);
    }

    resendBtn.textContent = 'Sending…';
    resendBtn.disabled    = true;
    _clearStatus();

    try {
      const res  = await fetch(`${BASE_URL}/auth/resend-verification`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
        signal:  AbortSignal.timeout(15000),
      });

      const data = await res.json();

      if (!res.ok) {
        _showStatus(data.message || 'Failed. Please try again.', 'error');
        resendBtn.textContent = 'Resend Verification Mail';
        resendBtn.disabled    = false;
        return;
      }

      // Success — 30s cooldown
      _showStatus('Verification email sent!', 'success');
      let s = 30;
      resendBtn.textContent = `Resend in ${s}s`;

      cooldown = setInterval(() => {
        s -= 1;
        resendBtn.textContent = `Resend in ${s}s`;
        if (s <= 0) {
          clearInterval(cooldown);
          resendBtn.textContent = 'Resend Verification Mail';
          resendBtn.disabled    = false;
          _clearStatus();
        }
      }, 1000);

    } catch (err) {
      _showStatus(
        err.name === 'TimeoutError'
          ? 'Timed out. Please try again.'
          : 'Network error. Please try again.',
        'error'
      );
      resendBtn.textContent = 'Resend Verification Mail';
      resendBtn.disabled    = false;
    }
  });
}

//  UTILITIES

function _maskEmail(email) {
  if (!email?.includes('@')) return 'your email';
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function _showStatus(msg, type) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className   = `ve-status show show--${type}`;
}

function _clearStatus() {
  if (!statusEl) return;
  statusEl.textContent = '';
  statusEl.className   = 've-status';
}