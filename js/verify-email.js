// EventPro — Verify Email Page Logic

const maskedEmailEl = document.getElementById("masked-email");
const resendBtn     = document.getElementById("resendBtn");

// ── Mask email: "john@email.com" → "j***@email.com" ──
function maskEmail(email) {
  const [local, domain] = email.split("@");
  return local.charAt(0) + "***@" + domain;
}

// ── Display masked email ──
const savedEmail = localStorage.getItem("userEmail") || "your email";
if (maskedEmailEl) {
  maskedEmailEl.textContent = maskEmail(savedEmail);
}

// ── Resend button ──
if (resendBtn) {
  resendBtn.addEventListener("click", async () => {
    resendBtn.textContent = "Sending...";
    resendBtn.disabled = true;

    const result = await resendVerification(savedEmail);

    if (!result.success) {
      resendBtn.textContent = "Failed — try again";
      resendBtn.disabled = false;
      return;
    }

    resendBtn.textContent = "Email sent!";

    // Reset button after 3 seconds
    setTimeout(() => {
      resendBtn.textContent = "Resend Verification Mail";
      resendBtn.disabled = false;
    }, 3000);
  });
}