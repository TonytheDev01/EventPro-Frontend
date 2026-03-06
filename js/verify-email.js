// EventPro — Verify Email Page Logic

const maskedEmailEl = document.getElementById("masked-email");
const resendBtn     = document.getElementById("resendBtn");

// Mask email: "john@email.com" → "j***@email.com"
function maskEmail(email) {
  const [local, domain] = email.split("@");
  return local.charAt(0) + "***@" + domain;
}

// Get email saved from signup page
const savedEmail = localStorage.getItem("userEmail") || "your email";
if (maskedEmailEl) {
  maskedEmailEl.textContent = maskEmail(savedEmail);
}

// Resend button
if (resendBtn) {
  resendBtn.addEventListener("click", () => {
    resendBtn.textContent = "Sending...";
    resendBtn.disabled = true;

    setTimeout(() => {
      resendBtn.textContent = "Email sent!";
      setTimeout(() => {
        resendBtn.textContent = "Resend Verification Mail";
        resendBtn.disabled = false;
      }, 3000);
    }, 1500);
  });
}