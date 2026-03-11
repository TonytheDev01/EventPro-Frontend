// EventPro — Login Page Logic

const form       = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passInput  = document.getElementById("password");
const loginBtn   = document.getElementById("loginBtn");
const toggleBtn  = document.getElementById("togglePassword");

// ── Toggle password visibility ──
toggleBtn.addEventListener("click", () => {
  const isPassword      = passInput.type === "password";
  passInput.type        = isPassword ? "text" : "password";
  toggleBtn.textContent = isPassword ? "🙈" : "👁";
});

// ── Validate on blur ──
emailInput.addEventListener("blur", () => {
  validateEmail(emailInput);
});

passInput.addEventListener("blur", () => {
  validateNotEmpty(passInput, "Password is required");
});

// ── Clear error when user starts typing ──
[emailInput, passInput].forEach(input => {
  input.addEventListener("input", () => {
    setInputState(input, "default");
  });
});

// ── Form submit ──
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isEmailValid = validateEmail(emailInput);
  const isPassValid  = validateNotEmpty(passInput, "Password is required");

  if (!isEmailValid || !isPassValid) return;

  // Show loading state
  loginBtn.textContent = "Signing in...";
  loginBtn.disabled    = true;

  // Call auth service
  const result = await loginUser(
    emailInput.value.trim(),
    passInput.value
  );

  if (!result.success) {
    setInputState(emailInput, "error", result.message);
    loginBtn.textContent = "Login";
    loginBtn.disabled    = false;
    return;
  }

  // ── Redirect based on verification status and role ──
  const user = getStoredUser();

  if (!user.isVerified) {
    localStorage.setItem("userEmail", user.email);
    window.location.href = "../pages/verify-email.html";
    return;
  }

  if (user.role === "admin") {
    window.location.href = "../pages/admin-dashboard.html";
  } else {
    window.location.href = "../pages/dashboard.html";
  }
});