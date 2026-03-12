// ================================================
//  EventPro — Sign Up Page Logic
//  js/signup.js
//  Depends on: js/form-input.js
//             js/services/auth-service.js
// ================================================

const form            = document.getElementById('signupForm');
const firstNameInput  = document.getElementById('firstName');
const lastNameInput   = document.getElementById('lastName');
const emailInput      = document.getElementById('email');
const passwordInput   = document.getElementById('password');
const confirmInput    = document.getElementById('confirmPassword');
const submitBtn       = document.getElementById('submitBtn');

//  Validate on blur 
firstNameInput.addEventListener('blur', () => {
  validateName(firstNameInput, 'First name');
});

lastNameInput.addEventListener('blur', () => {
  validateName(lastNameInput, 'Last name');
});

emailInput.addEventListener('blur', () => {
  validateEmail(emailInput);
});

passwordInput.addEventListener('blur', () => {
  validatePassword(passwordInput);
});

confirmInput.addEventListener('blur', () => {
  validateMatch(confirmInput, passwordInput.value);
});

//  Clear state when user starts typing 
[firstNameInput, lastNameInput, emailInput,
 passwordInput, confirmInput].forEach(input => {
  input.addEventListener('input', () => {
    input.classList.remove('input-error', 'input-success');
    const container  = input.closest('.form-group');
    const helperText = container && container.querySelector('.helper-text');
    if (helperText) {
      helperText.classList.remove('error-text', 'success-text');
      helperText.textContent   = '';
      helperText.style.display = 'none';
    }
  });
});

//  Form submit 
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Run all validations
  const isFirstNameValid = validateName(firstNameInput, 'First name');
  const isLastNameValid  = validateName(lastNameInput, 'Last name');
  const isEmailValid     = validateEmail(emailInput);
  const isPasswordValid  = validatePassword(passwordInput);
  const isConfirmValid   = validateMatch(confirmInput, passwordInput.value);

  if (!isFirstNameValid || !isLastNameValid ||
      !isEmailValid || !isPasswordValid || !isConfirmValid) {
    return;
  }

  // Loading state
  submitBtn.textContent = 'Creating account...';
  submitBtn.disabled    = true;

  // Call auth service — payload object format
  const result = await signupUser({
    firstName: firstNameInput.value.trim(),
    lastName:  lastNameInput.value.trim(),
    email:     emailInput.value.trim(),
    password:  passwordInput.value
  });

  if (!result.success) {
    setInputState(emailInput, 'error', result.message || 'Signup failed. Please try again.');
    submitBtn.textContent = 'Create Account';
    submitBtn.disabled    = false;
    return;
  }

  // Store email temporarily so verify-email page can display it
  // auth-service only stores user on login — not on signup
  localStorage.setItem('eventpro_pending_email', emailInput.value.trim());

  // Navigate to verify email screen
  window.location.href = '../pages/verify-email.html';
});