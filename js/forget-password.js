document.addEventListener('DOMContentLoaded', () => {

// SELECTORS
const form = document.getElementById('resetPasswordForm');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const submitBtn = document.getElementById('submitBtn');

// VALIDATION
const isValidEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
};

const showError = (input, errorEl, message) => {
  input.classList.add('input-error');
  errorEl.textContent = message;
};

const clearError = (input, errorEl) => {
  input.classList.remove('input-error');
  errorEl.textContent = '';
};

const validateForm = () => {
  const email = emailInput.value.trim();
  let isValid = true;

  if (!email) {
    showError(emailInput, emailError, 'Email address is required.');
    isValid = false;
  } else if (!isValidEmail(email)) {
    showError(emailInput, emailError, 'Please enter a valid email address.');
    isValid = false;
  } else {
    clearError(emailInput, emailError);
  }

  return isValid;
};


// API CALL
const sendResetLink = async (email) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to send reset link.');
  }

  return response.json();
};

// FORM SUBMIT HANDLER
const handleFormSubmit = async (event) => {
  event.preventDefault();

  if (!validateForm()) return;

  const email = emailInput.value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    await sendResetLink(email);
    form.reset();
    clearError(emailInput, emailError);
    alert(`Reset link sent! Check your inbox at ${email}.`);
  } catch (error) {
    showError(emailInput, emailError, error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
};

// LIVE VALIDATION
emailInput.addEventListener('input', () => {
  if (emailInput.value.trim()) {
    clearError(emailInput, emailError);
  }
});


// EVENT LISTENER
form.addEventListener('submit', handleFormSubmit);

});