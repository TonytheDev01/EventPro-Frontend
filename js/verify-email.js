// ================================================
//  EventPro — Verify Email Page Logic
//  js/verify-email.js
//  Depends on: js/services/auth-service.js
//
//  Note: User is NOT authenticated at this point.
//  They just signed up. No Bearer token available.
//  Resend request sends email in request body.
// ================================================

const maskedEmailEl = document.getElementById('masked-email');
const resendBtn     = document.getElementById('resendBtn');

// Read pending email set by signup.js 
const pendingEmail = localStorage.getItem('eventpro_pending_email');

// Mask email helper 
// "john@email.com" → "j***@email.com"
// Guards against missing @ to prevent crash
function maskEmail(email) {
  if (!email || !email.includes('@')) return email || 'your email';
  const [local, domain] = email.split('@');
  return local.charAt(0) + '***@' + domain;
}

//  Display masked email 
if (maskedEmailEl) {
  maskedEmailEl.textContent = maskEmail(pendingEmail);
}

//  Resend button with cooldown 
let cooldownTimer = null;

if (resendBtn) {
  resendBtn.addEventListener('click', async () => {
    if (!pendingEmail) {
      resendBtn.textContent = 'No email found — go back and sign up';
      return;
    }

    // Loading state
    resendBtn.textContent = 'Sending...';
    resendBtn.disabled    = true;

    try {
      // User is not authenticated — send email in body directly
      const response = await fetch(
        'https://eventpro-fxfv.onrender.com/api/auth/resend-verification',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: pendingEmail })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        resendBtn.textContent = data.message || 'Failed — try again';
        resendBtn.disabled    = false;
        return;
      }

      // Success — show confirmation then start 30s cooldown
      resendBtn.textContent = 'Email sent!';

      let seconds = 30;
      cooldownTimer = setInterval(() => {
        seconds -= 1;
        resendBtn.textContent = `Resend in ${seconds}s`;
        if (seconds <= 0) {
          clearInterval(cooldownTimer);
          resendBtn.textContent = 'Resend Verification Mail';
          resendBtn.disabled    = false;
        }
      }, 1000);

    } catch (err) {
      resendBtn.textContent = 'Network error — try again';
      resendBtn.disabled    = false;
    }
  });
}