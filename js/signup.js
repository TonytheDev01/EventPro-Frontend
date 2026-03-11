// EventPro — Sign Up Page Logic

const form           = document.getElementById("signupForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput  = document.getElementById("lastName");
const emailInput     = document.getElementById("email");
const passwordInput  = document.getElementById("password");
const confirmInput   = document.getElementById("confirmPassword");
const submitBtn      = document.getElementById("submitBtn");

// ── Validate on blur ──
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

// ── Clear error when user starts typing ──
[firstNameInput, lastNameInput, emailInput,
 passwordInput, confirmInput].forEach(input => {
  input.addEventListener("input", () => {
    setInputState(input, "default");
  });
});

// ── Form submit ──
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Run all validations
  const isFirstNameValid = validateMinLength(firstNameInput, 2, "First name must be at least 2 characters");
  const isLastNameValid  = validateMinLength(lastNameInput, 2, "Last name must be at least 2 characters");
  const isEmailValid     = validateEmail(emailInput);
  const isPasswordValid  = validatePassword(passwordInput);
  const isConfirmValid   = validateMatch(confirmInput, passwordInput.value);

  if (!isFirstNameValid || !isLastNameValid ||
      !isEmailValid || !isPasswordValid || !isConfirmValid) {
    return;
  }

  // Show loading state
  submitBtn.textContent = "Creating account...";
  submitBtn.disabled = true;

  // Call auth service
  const result = await signupUser(
    firstNameInput.value.trim(),
    lastNameInput.value.trim(),
    emailInput.value.trim(),
    passwordInput.value
  );

  if (!result.success) {
    // Show error on email field — most signup errors relate to email
    setInputState(emailInput, "error", result.message);
    submitBtn.textContent = "Create Account";
    submitBtn.disabled = false;
    return;
  }

  // Save email for verify-email page
  localStorage.setItem("userEmail", emailInput.value.trim());

  // Navigate to verify email screen
  window.location.href = "verify-email.html";
});