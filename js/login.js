// EventPro — Login Page Logic

const form        = document.getElementById("loginForm");
const emailInput  = document.getElementById("email");
const passInput   = document.getElementById("password");
const loginBtn    = document.getElementById("loginBtn");
const toggleBtn   = document.getElementById("togglePassword");

// ── Toggle password visibility ──
toggleBtn.addEventListener("click", () => {
  const isPassword = passInput.type === "password";
  passInput.type = isPassword ? "text" : "password";
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
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const isEmailValid = validateEmail(emailInput);
  const isPassValid  = validateNotEmpty(passInput, "Password is required");

  if (!isEmailValid || !isPassValid) return;

  // Show loading state
  loginBtn.textContent = "Signing in...";
  loginBtn.disabled = true;

  // Save email for any downstream pages
  localStorage.setItem("userEmail", emailInput.value.trim());

  // Navigate to dashboard on success
  // Replace with actual API call when backend is ready
  setTimeout(() => {
    window.location.href = "../pages/dashboard.html";
  }, 1000);
});