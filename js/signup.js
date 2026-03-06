// EventPro — Sign Up Page Logic

const form            = document.getElementById("signupForm");
const firstNameInput  = document.getElementById("firstName");
const lastNameInput   = document.getElementById("lastName");
const emailInput      = document.getElementById("email");
const passwordInput   = document.getElementById("password");
const confirmInput    = document.getElementById("confirmPassword");
const submitBtn       = document.getElementById("submitBtn");

// ── Validate on blur (when user leaves a field) ──
firstNameInput.addEventListener("blur", () => {
  validateMinLength(firstNameInput, 2, "First name must be at least 2 characters");
});

lastNameInput.addEventListener("blur", () => {
  validateMinLength(lastNameInput, 2, "Last name must be at least 2 characters");
});

emailInput.addEventListener("blur", () => {
  validateEmail(emailInput);
});

passwordInput.addEventListener("blur", () => {
  validatePassword(passwordInput);
});

confirmInput.addEventListener("blur", () => {
  validateMatch(confirmInput, passwordInput.value);
});

// ── Clear error when user starts typing again ──
[firstNameInput, lastNameInput, emailInput,
 passwordInput, confirmInput].forEach(input => {
  input.addEventListener("input", () => {
    setInputState(input, "default");
  });
});

// ── Form submit ──
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Run all validations
  const isFirstNameValid  = validateMinLength(firstNameInput, 2, "First name must be at least 2 characters");
  const isLastNameValid   = validateMinLength(lastNameInput, 2, "Last name must be at least 2 characters");
  const isEmailValid      = validateEmail(emailInput);
  const isPasswordValid   = validatePassword(passwordInput);
  const isConfirmValid    = validateMatch(confirmInput, passwordInput.value);

  // If anything is invalid — stop here
  if (!isFirstNameValid || !isLastNameValid ||
      !isEmailValid || !isPasswordValid || !isConfirmValid) {
    return;
  }

  // All valid — save email and go to verify page
  submitBtn.textContent = "Creating account...";
  submitBtn.disabled = true;

  // Save email so verify-email page can display it masked
  localStorage.setItem("userEmail", emailInput.value.trim());

  // Navigate to email verification screen
  setTimeout(() => {
    window.location.href = "verify-email.html";
  }, 1000);
});