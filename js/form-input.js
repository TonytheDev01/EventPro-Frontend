// EventPro — Form Input Component
// Shared validation logic for all form pages

function setInputState(inputElement, state, message = "") {

  const container = inputElement.closest(".input-block")
                 || inputElement.closest(".form-group");

  if (!container) return;

  const helperText = container.querySelector(".helper")
                  || container.querySelector(".helper-text");

  // Clear existing states
  inputElement.classList.remove(
    "input-error",
    "input-success",
    "state-error",
    "state-success"
  );

  if (helperText) {
    helperText.classList.remove("error-text", "success-text", "hidden");
    helperText.textContent = "";
    helperText.style.display = "none";
  }

  // Apply new state
  if (state === "error") {
    inputElement.classList.add("input-error");
    if (helperText && message) {
      helperText.classList.add("error-text");
      helperText.textContent = message;
      helperText.style.display = "block";
    }
  }

  if (state === "success") {
    inputElement.classList.add("input-success");
    if (helperText && message) {
      helperText.classList.add("success-text");
      helperText.textContent = message;
      helperText.style.display = "block";
    }
  }
}


function validateNotEmpty(inputElement, errorMessage) {
  if (inputElement.value.trim() === "") {
    setInputState(inputElement, "error", errorMessage);
    return false;
  }
  setInputState(inputElement, "success", "Looks good!");
  return true;
}


function validateEmail(inputElement) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (inputElement.value.trim() === "") {
    setInputState(inputElement, "error", "Email address is required");
    return false;
  }
  if (!emailRegex.test(inputElement.value.trim())) {
    setInputState(inputElement, "error", "Please enter a valid email address");
    return false;
  }
  setInputState(inputElement, "success", "Email looks good!");
  return true;
}


function validatePassword(inputElement) {
  const value = inputElement.value;

  if (value === "") {
    setInputState(inputElement, "error", "Password is required");
    return false;
  }
  if (value.length < 8 || !/\d/.test(value)) {
    setInputState(inputElement, "error", "Password must be 8+ characters with a number");
    return false;
  }
  setInputState(inputElement, "success", "Strong password!");
  return true;
}


function validateMatch(inputElement, matchValue) {
  if (inputElement.value === "") {
    setInputState(inputElement, "error", "Please confirm your password");
    return false;
  }
  if (inputElement.value !== matchValue) {
    setInputState(inputElement, "error", "Passwords do not match");
    return false;
  }
  setInputState(inputElement, "success", "Passwords match!");
  return true;
}


function validateMinLength(inputElement, minLength, errorMessage) {
  if (inputElement.value.trim().length < minLength) {
    setInputState(inputElement, "error", errorMessage);
    return false;
  }
  setInputState(inputElement, "success", "Looks good!");
  return true;
}