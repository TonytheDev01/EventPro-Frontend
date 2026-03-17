// ================================================
//  EventPro — Auth Service
//  js/services/auth-service.js
//
//  All API communication for authentication.
//  Import this file before any page JS that needs
//  auth functions.
//
//  Confirmed base URL: https://eventpro-fxfv.onrender.com
//  Swagger docs:       https://eventpro-fxfv.onrender.com/api/docs/
//
//  Backend changes applied (Ezekiel — March 2026):
//  - Email verification removed from registration flow
//  - Admin has its own signup endpoint
//  - All roles share the same login endpoint
//  - Social login via Appwrite (configure credentials below)
// ================================================

const BASE_URL  = 'https://eventpro-fxfv.onrender.com/api';
const TOKEN_KEY = 'eventpro_token';
const USER_KEY  = 'eventpro_user';

// ── Internal Helpers ────────────────────────────────────────

/**
 * Returns standard headers for all requests.
 * Pass requiresAuth: true for protected endpoints.
 */
function buildHeaders(requiresAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const token = getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Centralised fetch wrapper with 15s timeout.
 * Returns { success: true, data } or { success: false, message }.
 */
async function request(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }

    return {
      success: false,
      message: data.message || 'Something went wrong. Please try again.',
    };

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. The server may be starting up — please try again in a moment.',
      };
    }

    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

// ── AUTH ENDPOINTS ──────────────────────────────────────────

/**
 * POST /auth/signup
 * Register a new regular user (attendee).
 * No email verification required after this call.
 * On success — redirect straight to sign-in.
 * @param {Object} payload - { firstName, lastName, email, password }
 */
async function signupUser(payload) {
  return await request('/auth/signup', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify(payload),
  });
}

/**
 * POST /admin/signup  ← confirm exact path with Ezekiel in Swagger
 * Register a new admin account.
 * Separate endpoint from regular user signup.
 * @param {Object} payload - { firstName, lastName, email, password }
 */
async function signupAdmin(payload) {
  return await request('/admin/signup', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify(payload),
  });
}

/**
 * POST /auth/login
 * Shared login endpoint — works for admin, organizer, and user.
 * Stores token and user in localStorage on success.
 * Role-based redirect handled in sign-in.js.
 * @param {string} email
 * @param {string} password
 */
async function loginUser(email, password) {
  const result = await request('/auth/login', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify({ email, password }),
  });

  if (result.success) {
    storeToken(result.data.token);
    storeUser(result.data.user);
  }

  return result;
}

/**
 * POST /auth/forgot-password
 * Request a password reset email.
 * @param {string} email
 */
async function forgotPassword(email) {
  return await request('/auth/forgot-password', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify({ email }),
  });
}

/**
 * POST /auth/reset-password/{token}
 * Reset password using token from reset email link.
 * Swagger requires { newPassword } not { password }.
 * @param {string} token       - reset token from email link
 * @param {string} newPassword - new password
 */
async function resetPassword(token, newPassword) {
  return await request(`/auth/reset-password/${token}`, {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify({ newPassword }),
  });
}

/**
 * POST /auth/reset-password
 * Reset password for an authenticated (logged-in) user.
 * Used in the Settings page.
 * @param {string} currentPassword
 * @param {string} newPassword
 */
async function resetPasswordAuthenticated(currentPassword, newPassword) {
  return await request('/auth/reset-password', {
    method:  'POST',
    headers: buildHeaders(true),
    body:    JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * GET /auth/profile
 * Fetch the current logged-in user's profile.
 */
async function getUserProfile() {
  return await request('/auth/profile', {
    method:  'GET',
    headers: buildHeaders(true),
  });
}

/**
 * PUT /auth/profile
 * Update the current logged-in user's profile.
 * @param {Object} payload - fields to update e.g. { firstName, phone }
 */
async function updateUserProfile(payload) {
  const result = await request('/auth/profile', {
    method:  'PUT',
    headers: buildHeaders(true),
    body:    JSON.stringify(payload),
  });

  if (result.success && result.data.user) {
    storeUser(result.data.user);
  }

  return result;
}

// ── SOCIAL LOGIN — APPWRITE ─────────────────────────────────
// TODO: Replace placeholders with real values from Ezekiel.
// Docs: https://appwrite.io/docs/references/cloud/client-web/account

const APPWRITE_ENDPOINT   = 'https://cloud.appwrite.io/v1'; // confirm with Ezekiel
const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID';              // get from Ezekiel

/**
 * Initiate Google OAuth via Appwrite.
 * Redirects to Google — on return Appwrite creates a session.
 * Call _handleAppwriteSession() on the redirect-back page.
 */
function loginWithGoogle() {
  const successUrl = `${window.location.origin}/pages/sign-in.html?oauth=success`;
  const failureUrl = `${window.location.origin}/pages/sign-in.html?oauth=failed`;

  window.location.href =
    `${APPWRITE_ENDPOINT}/account/sessions/oauth2/google` +
    `?project=${APPWRITE_PROJECT_ID}` +
    `&success=${encodeURIComponent(successUrl)}` +
    `&failure=${encodeURIComponent(failureUrl)}`;
}

/**
 * Handle Appwrite OAuth session on redirect return.
 * Exchanges Appwrite session for an EventPro JWT.
 * Call this in sign-in.js on DOMContentLoaded
 * when URL contains ?oauth=success.
 */
async function handleAppwriteSession() {
  // TODO: Once Ezekiel confirms the exchange endpoint,
  // send the Appwrite session token to the backend
  // to receive a standard EventPro JWT.
  // Pattern:
  //   const appwriteToken = new URLSearchParams(location.search).get('token');
  //   const result = await request('/auth/oauth/appwrite', {
  //     method: 'POST',
  //     headers: buildHeaders(),
  //     body: JSON.stringify({ token: appwriteToken }),
  //   });
  //   if (result.success) { storeToken(...); storeUser(...); _redirectByRole(); }
}

// ── LOCAL STORAGE UTILITIES ─────────────────────────────────

function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function storeUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

/**
 * Clear token and user from localStorage and redirect to sign-in.
 */
function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '../pages/sign-in.html';
}

function isLoggedIn() {
  return !!getStoredToken() && !!getStoredUser();
}

/**
 * Guard function — redirect to sign-in if not logged in.
 * Call at the top of any protected page JS.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '../pages/sign-in.html';
  }
}