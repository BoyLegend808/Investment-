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
// SUPABASE AUTH HELPERS
// Shared across all public pages for consistent login/signup behaviour.
// =============================================================================

/**
 * Wait until window.supabaseClient is ready (max 3 seconds).
 * Returns the client or null if Supabase failed to load.
 */
async function waitForSupabase() {
  let waited = 0;
  while (!window.supabaseClient && waited < 3000) {
    await new Promise(r => setTimeout(r, 50));
    waited += 50;
  }
  return window.supabaseClient || null;
}

/**
 * Check whether the current user has an active Supabase or local session.
 * Returns true/false. Safe to call from any page.
 */
async function crestIsAuthenticated() {
  const sb = await waitForSupabase();
  if (sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) return true;
    } catch (e) {}
  }
  const localUser = localStorage.getItem('crest_current_user');
  if (localUser) {
    try {
      const parsed = JSON.parse(localUser);
      if (parsed && (parsed.id || parsed.email)) return true;
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
  let userData = null;
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    if (data && data.user) {
      userData = data.user;
    }
  }
  if (!userData) {
    userData = { email, user_metadata: { full_name: email.split('@')[0] }, id: 'user_' + Date.now() };
  }
  localStorage.setItem('crest_current_user', JSON.stringify(userData));
  return { success: true, data: { user: userData } };
}

/**
 * Supabase sign-up. Returns { success, error }.
 * @param {string} email
 * @param {string} password
 * @param {string} fullName
 */
async function crestSignUp(email, password, fullName) {
  const sb = await waitForSupabase();
  let userData = { email, user_metadata: { full_name: fullName }, id: 'user_' + Date.now() };
  if (sb) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) return { success: false, error: error.message };
    if (data && data.user) {
      userData = data.user;
      try {
        await sb.from('profiles').upsert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('Profiles table upsert notice:', dbErr);
      }
    }
  }
  localStorage.setItem('crest_current_user', JSON.stringify(userData));
  return { success: true, data: { user: userData, session: true } };
}

/**
 * Supabase sign-out. Clears local session and redirects.
 */
async function crestSignOut() {
  const sb = await waitForSupabase();
  if (sb) {
    try { await sb.auth.signOut(); } catch(e) {}
  }
  localStorage.removeItem('crest_current_user');
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  window.location.href = depth > 1 ? '../index/index.html' : 'index/index.html';
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
document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await crestIsAuthenticated();
  
  // Client Dashboard links in top nav & drawers
  const dashboardNavLinks = document.querySelectorAll('a[href*="dashboard.html"], a.nav-link-ember');
  // Log In buttons on nav
  const signinNavBtns = document.querySelectorAll('a.btn-sign-in, a[href="#signin"], a[data-modal="signin"]');
  // Get Started / Open Account buttons on nav
  const signupNavBtns = document.querySelectorAll('a.btn-get-started, a[href="#signup"], a[data-modal="signup"]');

  // Always hide standalone Log In buttons on the header nav per design request
  signinNavBtns.forEach(btn => {
    btn.style.display = 'none';
  });

  if (isAuth) {
    // LOGGED IN NAV STATE
    dashboardNavLinks.forEach(link => {
      link.style.display = '';
    });
    signupNavBtns.forEach(btn => {
      btn.textContent = 'Client Dashboard';
      btn.removeAttribute('data-modal');
      btn.href = '#';
      btn.onclick = (e) => {
        e.preventDefault();
        crestRedirectToDashboard();
      };
    });
  } else {
    // NOT LOGGED IN NAV STATE
    dashboardNavLinks.forEach(link => {
      link.style.display = 'none';
    });
    signupNavBtns.forEach(btn => {
      btn.textContent = 'Get Started';
      btn.setAttribute('data-modal', 'signup');
      btn.href = '#signup';
    });
  }
});
