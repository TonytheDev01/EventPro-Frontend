// EventPro — Auth Service
// Handles all authentication API calls
// Base URL updates to Render URL when backend is hosted

const BASE_URL = "https://eventpro-api.onrender.com/api";

// ── Signup ──
async function signupUser(firstName, lastName, email, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ firstName, lastName, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "Signup failed" };
    }

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      message: "Network error — please check your connection" 
    };
  }
}


// ── Login ──
async function loginUser(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "Login failed" };
    }

    // Save token and user to localStorage
    localStorage.setItem("eventpro-token", data.token);
    localStorage.setItem("eventpro-user", JSON.stringify(data.user));

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      message: "Network error — please check your connection" 
    };
  }
}


// ── Verify Email ──
async function verifyEmail(token) {
  try {
    const response = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "Verification failed" };
    }

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      message: "Network error — please check your connection" 
    };
  }
}


// ── Resend Verification Email ──
async function resendVerification(email) {
  try {
    const response = await fetch(`${BASE_URL}/auth/resend-verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "Failed to resend email" };
    }

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      message: "Network error — please check your connection" 
    };
  }
}


// ── Forgot Password ──
async function forgotPassword(email) {
  try {
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "Request failed" };
    }

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      message: "Network error — please check your connection" 
    };
  }
}


// ── Reset Password ──
async function resetPassword(token, newPassword) {
  try {
    const response = await fetch(`${BASE_URL}/auth/reset-password/${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "Reset failed" };
    }

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      message: "Network error — please check your connection" 
    };
  }
}


// ── Get logged in user from localStorage ──
function getStoredUser() {
  const user = localStorage.getItem("eventpro-user");
  return user ? JSON.parse(user) : null;
}


// ── Get stored token ──
function getStoredToken() {
  return localStorage.getItem("eventpro-token");
}


// ── Logout ──
function logoutUser() {
  localStorage.removeItem("eventpro-token");
  localStorage.removeItem("eventpro-user");
  localStorage.removeItem("userEmail");
  window.location.href = "../pages/login.html";
}