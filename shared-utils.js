/**
 * Crest Wealth - Shared Utility Functions
 * These functions are shared across multiple pages to avoid code duplication
 */

/**
 * Toast Notification System
 * Displays a temporary notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds before auto-dismiss
 */
function showToast(message, type = 'success', duration = 4000) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;

  // Add styles
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-weight: 600;
    font-size: 0.95rem;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  // Add animation keyframes if not exists
  if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

// =============================================================================
// XSS SANITIZATION
// Use escapeHtml() on ANY user-supplied string before inserting into innerHTML.
// =============================================================================

/**
 * Escapes the 5 dangerous HTML characters to prevent XSS injection.
 * Use this whenever inserting a user-supplied value into an innerHTML template.
 * @param {string} str - Raw user input
 * @returns {string} - HTML-safe string
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Toggle password input visibility with SVG eye/eye-off icons.
 * @param {string} inputId - ID of password input
 * @param {HTMLElement} btn - Button trigger
 */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';

  const eyeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  btn.innerHTML = isPass ? eyeOffIcon : eyeIcon;
}

// =============================================================================
// CENTRALIZED API KEY (Alpha Vantage - Free Tier)
// This is a free-tier public key. For production, proxy calls server-side.
// =============================================================================
window.CREST_AV_KEY = 'QLX2KJ0DDBB1RUST';

// =============================================================================
// COOKIE CONSENT BANNER CONTROLLER
// =============================================================================
function acceptCookies() {
  try { localStorage.setItem('crest_cookie_consent', 'accepted'); } catch(e) {}
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.style.display = 'none';
}

function declineCookies() {
  try { localStorage.setItem('crest_cookie_consent', 'declined'); } catch(e) {}
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.style.display = 'none';
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    try {
      const consent = localStorage.getItem('crest_cookie_consent');
      const banner = document.getElementById('cookie-banner');
      if (banner) {
        if (!consent) {
          banner.style.display = 'flex';
        } else {
          banner.style.display = 'none';
        }
      }
    } catch(e) {}
  });
}

// =============================================================================
// SUPABASE AUTH HELPERS
// Shared across all public pages for consistent login/signup behaviour.
// =============================================================================

/**
 * Wait until window.supabaseClient is ready (max 3 seconds).
 * Returns the client or null if Supabase failed to load.
 */
async function waitForSupabase() {
  if (window.supabaseClient) return window.supabaseClient;
  let waited = 0;
  while (!window.supabaseClient && waited < 2000) {
    await new Promise(r => setTimeout(r, 25));
    waited += 25;
  }
  const sb = window.supabaseClient || null;
  if (sb && !window._crest_auth_listener_attached) {
    window._crest_auth_listener_attached = true;
    try {
      sb.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          localStorage.setItem('crest_current_user', JSON.stringify(session.user));
          try {
            sb.from('profiles').upsert({
              id: session.user.id,
              email: session.user.email,
              full_name: (session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email.split('@')[0],
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }).then(() => {}).catch(() => {});
          } catch (e) { /* ignore */ }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('crest_current_user');
        }
      });
    } catch (e) {}
  }
  return sb;
}

/**
 * Check whether the current user has an active Supabase or local session.
 * Returns true/false. Safe to call from any page.
 */
async function crestIsAuthenticated() {
  // Fast optimistic check for demo user
  const localUser = localStorage.getItem('crest_current_user');
  if (localUser) {
    try {
      const parsed = JSON.parse(localUser);
      if (parsed && typeof parsed.id === 'string' && parsed.id.indexOf('demo_') === 0) return true;
    } catch (e) {}
  }

  const sb = await waitForSupabase();
  if (sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) return true;
    } catch (e) {}
  }
  return false;
}

/**
 * Supabase sign-in. Returns { success, error }.
 * @param {string} email
 * @param {string} password
 */
async function crestSignIn(email, password) {
  const sb = await waitForSupabase();
  if (!sb) return { success: false, error: 'Cannot reach the server. Check your internet connection and try again.' };

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = /email not confirmed/i.test(error.message)
      ? 'Please confirm your email first — check your inbox for the verification link.'
      : /invalid login credentials/i.test(error.message)
        ? 'Incorrect email or password.'
        : error.message;
    return { success: false, error: msg };
  }
  if (!data || !data.user) return { success: false, error: 'Login failed. Please try again.' };

  localStorage.setItem('crest_current_user', JSON.stringify(data.user));

  // Non-blocking background sync for profile row (do not await)
  try {
    sb.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: (data.user.user_metadata && data.user.user_metadata.full_name) || email.split('@')[0],
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' }).then(() => {}).catch(() => {});
  } catch (e) { /* ignore */ }

  return { success: true, data: { user: data.user } };
}

/**
 * Supabase sign-up. Returns { success, needsConfirmation, error }.
 * If email confirmation is enabled in Supabase, no session is returned
 * until the user clicks the link in their email.
 * @param {string} email
 * @param {string} password
 * @param {string} fullName
 */
async function crestSignUp(email, password, fullName, phone, pkg) {
  const sb = await waitForSupabase();
  if (!sb) return { success: false, error: 'Cannot reach the server. Check your internet connection and try again.' };

  // Determine current page URL for redirecting back after email verification
  let redirectUrl = window.location.href ? window.location.href.split('#')[0].split('?')[0] : '';
  if (!redirectUrl || redirectUrl.startsWith('file://')) {
    redirectUrl = 'http://localhost:5500/index/index.html';
  }

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        phone: phone || '',
        package: pkg || 'Level 1 Package (Starter)'
      }
    }
  });
  if (error) return { success: false, error: error.message };
  if (!data || !data.user) return { success: false, error: 'Signup failed. Please try again.' };

  // Supabase returns a user with no identities when the email is already registered
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { success: false, error: 'An account with this email already exists. Please log in.' };
  }

  // No session => email confirmation required
  if (!data.session) {
    return { success: true, needsConfirmation: true, data: { user: data.user } };
  }

  localStorage.setItem('crest_current_user', JSON.stringify(data.user));
  try {
    await sb.from('profiles').upsert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      phone: phone || '',
      cash_balance: 0,
      invested_balance: 0,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (dbErr) {
    console.warn('Profiles table upsert notice:', dbErr);
  }
  return { success: true, data: { user: data.user, session: data.session } };
}

/**
 * Supabase sign-out. Clears local session and redirects.
 */
async function crestSignOut() {
  const sb = await waitForSupabase();
  if (sb) {
    try { await sb.auth.signOut(); } catch(e) {}
  }
  
  // Clear all crest_ variables from localStorage to prevent leaking data between accounts
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('crest_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  const depth = window.location.pathname.split('/').filter(Boolean).length;
  window.location.href = depth > 1 ? '../index/index.html' : 'index/index.html';
}

/**
 * Send a password-reset email via Supabase. Returns { success, error }.
 */
async function crestResetPassword(email) {
  const sb = await waitForSupabase();
  if (!sb) return { success: false, error: 'Cannot reach the server. Check your internet connection and try again.' };
  const redirectTo = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + (window.location.pathname.split('/').filter(Boolean).length > 1 ? '../index/index.html' : 'index/index.html');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Redirect helper. Navigates to the dashboard relative to current page depth.
 * @param {boolean} isSubdir - Whether current page is inside a subdirectory
 */
function crestRedirectToDashboard(isSubdir) {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const isInSubdir = isSubdir !== undefined ? isSubdir : depth > 1;
  window.location.href = isInSubdir ? '../dashboard/dashboard.html' : 'dashboard/dashboard.html';
}

// =============================================================================
// NAVBAR AUTHENTICATION STATE UPDATE
// 2 Nav States:
// - Unauthenticated (Not Logged In): Hide Client Dashboard nav link, hide Log In button, keep Get Started
// - Authenticated (Logged In): Show Client Dashboard nav link, change Get Started to Client Dashboard link
// =============================================================================
function crestLoadAuthGuard(defaultTab) {
  const tab = defaultTab || 'login';
  if (typeof window.crestOpenAuthModal === 'function') {
    window.crestOpenAuthModal(tab);
    return;
  }
  window.crestAuthDefaultTab = tab;
  let script = document.getElementById('crest-auth-guard-script');
  if (!script) {
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const basePath = depth > 1 ? '../' : '';
    script = document.createElement('script');
    script.id = 'crest-auth-guard-script';
    script.src = basePath + 'auth-guard.js';
    script.onload = function() {
      if (typeof window.crestOpenAuthModal === 'function') {
        window.crestOpenAuthModal(tab);
      }
    };
    document.head.appendChild(script);
  }
}

// Capture-phase delegation: runs before any page-specific handlers, works immediately.
document.addEventListener('click', async (e) => {
  const trigger = e.target.closest('a.btn-sign-in, a.btn-get-started, a[data-modal="signin"], a[data-modal="signup"]');
  if (!trigger) return;
  e.preventDefault();
  e.stopImmediatePropagation();

  const isSignin = trigger.matches('a.btn-sign-in, a[data-modal="signin"]');
  const targetTab = isSignin ? 'login' : 'signup';

  if (await crestIsAuthenticated()) {
    crestRedirectToDashboard();
    return;
  }
  crestLoadAuthGuard(targetTab);
}, true);

document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await crestIsAuthenticated();

  const dashboardNavLinks = document.querySelectorAll('a[href*="dashboard.html"], a.nav-link-ember');
  const signinNavBtns = document.querySelectorAll('a.btn-sign-in, a[data-modal="signin"]');
  const signupNavBtns = document.querySelectorAll('a.btn-get-started');

  if (isAuth) {
    dashboardNavLinks.forEach(link => { link.style.display = ''; });
    signinNavBtns.forEach(btn => { btn.style.display = 'none'; });
    signupNavBtns.forEach(btn => { btn.textContent = 'Client Dashboard'; });
  } else {
    dashboardNavLinks.forEach(link => { link.style.display = 'none'; });
    signinNavBtns.forEach(btn => { btn.style.display = ''; });

    // Auto-open modal if URL hash is #signin or #signup
    const handleAuthHash = () => {
      const h = window.location.hash;
      if (h === '#signin' || h === '#login') {
        crestLoadAuthGuard('login');
      } else if (h === '#signup') {
        crestLoadAuthGuard('signup');
      }
    };
    handleAuthHash();
    window.addEventListener('hashchange', handleAuthHash);
  }
});
