// ================================================
//  EventPro — Verify Email
//  js/verify-email.js
//  Depends on: js/services/auth-service.js
// ================================================

const BASE_URL = 'https://eventpro-fxfv.onrender.com/api';

// ── State elements ────────────────────────────────
const stateVerifying = document.getElementById('stateVerifying');
const stateSuccess   = document.getElementById('stateSuccess');
const stateDefault   = document.getElementById('stateDefault');
const stateError     = document.getElementById('stateError');
const maskedEmailEl  = document.getElementById('maskedEmail');
const resendBtn      = document.getElementById('resendBtn');
const retryResendBtn = document.getElementById('retryResendBtn');
const errorMsgEl     = document.getElementById('errorMsg');

// ── Helpers ───────────────────────────────────────
function showState(name) {
  ['stateVerifying', 'stateSuccess', 'stateDefault', 'stateError']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = id !== name;
    });
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'your email';
  const [local, domain] = email.split('@');
  return local.charAt(0) + '***@' + domain;
}

// ── Read URL params ───────────────────────────────
const params       = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get('token');
const pendingEmail = localStorage.getItem('eventpro_pending_email');

// ════════════════════════════════════════════════
//  FLOW 1 — Token in URL → verify automatically
// ════════════════════════════════════════════════
if (tokenFromUrl) {
  showState('stateVerifying');
  _verifyToken(tokenFromUrl);
}

// ════════════════════════════════════════════════
//  FLOW 2 — No token → show waiting state
// ════════════════════════════════════════════════
else {
  showState('stateDefault');

  // Show masked email
  if (maskedEmailEl) {
    maskedEmailEl.textContent = maskEmail(pendingEmail);
  }

  // Wire resend button
  _wireResendBtn(resendBtn);
}

// Wire retry resend button on error state
_wireResendBtn(retryResendBtn);

// ════════════════════════════════════════════════
//  VERIFY TOKEN
// ════════════════════════════════════════════════
async function _verifyToken(token) {
  try {
    const response = await fetch(`${BASE_URL}/auth/verify-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
      signal:  AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (response.ok) {
      // Clean up pending email
      localStorage.removeItem('eventpro_pending_email');
      showState('stateSuccess');

      // Auto-redirect to sign-in after 3 seconds
      setTimeout(() => {
        window.location.href = '../pages/sign-in.html';
      }, 3000);

    } else {
      if (errorMsgEl) {
        errorMsgEl.textContent =
          data.message || 'The verification link is invalid or has expired.';
      }
      showState('stateError');
    }

  } catch (err) {
    if (errorMsgEl) {
      errorMsgEl.textContent = err.name === 'TimeoutError'
        ? 'Request timed out. Please try again.'
        : 'Network error. Please check your connection and try again.';
    }
    showState('stateError');
  }
}

// ════════════════════════════════════════════════
//  RESEND VERIFICATION EMAIL
// ════════════════════════════════════════════════
function _wireResendBtn(btn) {
  if (!btn) return;

  let cooldownTimer = null;

  btn.addEventListener('click', async () => {

    if (!pendingEmail) {
      btn.textContent = 'No email found — please sign up again';
      return;
    }

    // Loading state
    btn.textContent = 'Sending…';
    btn.disabled    = true;

    try {
      const response = await fetch(
        `${BASE_URL}/auth/resend-verification`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: pendingEmail }),
          signal:  AbortSignal.timeout(15000),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        btn.textContent = data.message || 'Failed — please try again';
        btn.disabled    = false;
        return;
      }

      // Success — 30s cooldown
      btn.textContent = '✓ Email sent!';
      let seconds = 30;

      cooldownTimer = setInterval(() => {
        seconds -= 1;
        btn.textContent = `Resend in ${seconds}s`;
        if (seconds <= 0) {
          clearInterval(cooldownTimer);
          btn.textContent = 'Resend Verification Mail';
          btn.disabled    = false;
        }
      }, 1000);

    } catch (err) {
      btn.textContent = err.name === 'TimeoutError'
        ? 'Timed out — try again'
        : 'Network error — try again';
      btn.disabled = false;
    }
  });
}