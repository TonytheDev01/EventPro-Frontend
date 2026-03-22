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
//  - Social login via Appwrite (credentials confirmed March 2026)
// ================================================

var BASE_URL  = 'https://eventpro-fxfv.onrender.com/api';
var TOKEN_KEY = 'eventpro_token';
var USER_KEY  = 'eventpro_user';

// ── Appwrite config (confirmed March 2026) ──────────────────
var APPWRITE_ENDPOINT   = 'https://fra.cloud.appwrite.io/v1';
var APPWRITE_PROJECT_ID = 'standard_5cd487d9a445f60de9321bd70839df61214e561aaa746c386e715d3b3fb4698f6b352d970c2f7e6710f221c8b5452841fb95543cf6c1fcae0977bb440045e5d19648b7378816d30448c540367cacc52adf2ded82bbf07ea826beda85a40ce4b94394595f689bd43cfa752fab166199b0f1637b9f2776da78067536b2ad66ff5b';

// ── Internal Helpers ────────────────────────────────────────

function buildHeaders(requiresAuth) {
  var headers = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    var token = getStoredToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

function request(endpoint, options) {
  var controller = new AbortController();
  var timeoutId  = setTimeout(function () { controller.abort(); }, 15000);

  var fetchOptions = Object.assign({}, options, { signal: controller.signal });

  return fetch(BASE_URL + endpoint, fetchOptions)
    .then(function (response) {
      clearTimeout(timeoutId);
      return response.json().then(function (data) {
        if (response.ok) {
          return { success: true, data: data };
        }
        return {
          success: false,
          message: data.message || 'Something went wrong. Please try again.',
        };
      });
    })
    .catch(function (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timed out. The server may be starting up — please try again.',
        };
      }
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    });
}

// ── AUTH ENDPOINTS ──────────────────────────────────────────

function signupUser(payload) {
  return request('/auth/signup', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify(payload),
  });
}

function signupAdmin(payload) {
  return request('/admin/signup', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify(payload),
  });
}

function loginUser(email, password) {
  return request('/auth/login', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify({ email: email, password: password }),
  }).then(function (result) {
    if (result.success) {
      storeToken(result.data.token);
      storeUser(result.data.user);
      // Fetch full profile to get firstName, lastName etc
      // so topbar shows name not email
      // Use fresh token directly — getStoredToken() now has it after storeToken above
      return request('/auth/profile', {
        method:  'GET',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + result.data.token,
        },
      }).then(function (profileResult) {
        if (profileResult.success && profileResult.data) {
          storeUser(profileResult.data);
        }
        return result;
      }).catch(function () {
        // Profile fetch failed — not critical, login still succeeded
        return result;
      });
    }
    return result;
  });
}

function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify({ email: email }),
  });
}

function resetPassword(token, newPassword) {
  return request('/auth/reset-password/' + token, {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify({ newPassword: newPassword }),
  });
}

function resetPasswordAuthenticated(currentPassword, newPassword) {
  return request('/auth/reset-password', {
    method:  'POST',
    headers: buildHeaders(true),
    body:    JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword }),
  });
}

function getUserProfile() {
  return request('/auth/profile', {
    method:  'GET',
    headers: buildHeaders(true),
  });
}

function updateUserProfile(payload) {
  return request('/auth/profile', {
    method:  'PUT',
    headers: buildHeaders(true),
    body:    JSON.stringify(payload),
  }).then(function (result) {
    if (result.success && result.data.user) {
      storeUser(result.data.user);
    }
    return result;
  });
}

// ── SOCIAL LOGIN — APPWRITE ─────────────────────────────────

/**
 * Build an Appwrite OAuth2 redirect URL for a given provider.
 * Redirects user to provider login page.
 * On return, Appwrite redirects back to sign-in.html?oauth=success
 * where handleAppwriteSession() exchanges the JWT for an EventPro token.
 *
 * @param {string} provider - 'google' | 'facebook' | 'twitter' | 'apple'
 */
function _loginWithProvider(provider) {
  var successUrl = window.location.origin + '/pages/sign-in.html?oauth=success';
  var failureUrl = window.location.origin + '/pages/sign-in.html?oauth=failed';

  var url = APPWRITE_ENDPOINT
    + '/account/sessions/oauth2/' + provider
    + '?project=' + encodeURIComponent(APPWRITE_PROJECT_ID)
    + '&success=' + encodeURIComponent(successUrl)
    + '&failure=' + encodeURIComponent(failureUrl);

  window.location.href = url;
}

function loginWithGoogle() {
  _loginWithProvider('google');
}

function loginWithFacebook() {
  _loginWithProvider('facebook');
}

function loginWithMicrosoft() {
  _loginWithProvider('microsoft');
}

function loginWithGithub() {
  _loginWithProvider('github');
}

/**
 * Called on sign-in.html when URL contains ?oauth=success.
 * Steps:
 *  1. Ask Appwrite for a JWT from the current OAuth session
 *  2. Send JWT to POST /auth/login/appwrite
 *  3. Backend returns EventPro token + user
 *  4. Store token + user, return result for redirect handling
 */
function handleAppwriteSession() {
  // Step 1 — get JWT from Appwrite session (set via cookie after OAuth redirect)
  return fetch(APPWRITE_ENDPOINT + '/account/jwt', {
    method:      'POST',
    headers: {
      'Content-Type':       'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    },
    credentials: 'include', // required — sends Appwrite session cookie
  })
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    })
    .then(function (result) {
      if (!result.ok || !result.data.jwt) {
        return {
          success: false,
          message: 'Social login failed. Could not retrieve session.',
        };
      }

      // Step 2 — exchange Appwrite JWT for EventPro token
      return request('/auth/login/appwrite', {
        method:  'POST',
        headers: buildHeaders(),
        body:    JSON.stringify({ jwt: result.data.jwt }),
      });
    })
    .then(function (result) {
      if (result.success) {
        storeToken(result.data.token);
        storeUser(result.data.user);
      }
      return result;
    })
    .catch(function () {
      return {
        success: false,
        message: 'Social login failed. Please try again.',
      };
    });
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
    var user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '../pages/sign-in.html';
}

function isLoggedIn() {
  return !!getStoredToken() && !!getStoredUser();
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '../pages/sign-in.html';
  }
}