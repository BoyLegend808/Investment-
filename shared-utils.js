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
 * Check whether the current user has an active Supabase session.
 * Returns true/false. Safe to call from any page.
 */
async function crestIsAuthenticated() {
  const sb = await waitForSupabase();
  if (!sb) return false;
  const { data: { session } } = await sb.auth.getSession();
  return !!session;
}

/**
 * Supabase sign-in. Returns { success, error }.
 * @param {string} email
 * @param {string} password
 */
async function crestSignIn(email, password) {
  const sb = await waitForSupabase();
  if (!sb) return { success: false, error: 'Authentication service unavailable. Please refresh the page.' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/**
 * Supabase sign-up. Returns { success, error }.
 * @param {string} email
 * @param {string} password
 * @param {string} fullName
 */
async function crestSignUp(email, password, fullName) {
  const sb = await waitForSupabase();
  if (!sb) return { success: false, error: 'Authentication service unavailable. Please refresh the page.' };
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
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
// Automatically update navbar buttons to point to the dashboard if logged in
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await crestIsAuthenticated();
  if (isAuth) {
    // Find signin and signup buttons
    const signinBtns = document.querySelectorAll('a[href="#signin"], a[data-modal="signin"]');
    const signupBtns = document.querySelectorAll('a[href="#signup"], a[data-modal="signup"]');
    
    signinBtns.forEach(btn => {
      if (btn.classList.contains('btn-sign-in')) {
        btn.textContent = 'Dashboard';
        btn.onclick = (e) => { e.preventDefault(); crestRedirectToDashboard(window.location.pathname.includes('/about/') || window.location.pathname.includes('/academy/') || window.location.pathname.includes('/accounts/') || window.location.pathname.includes('/careers/') || window.location.pathname.includes('/investments/') || window.location.pathname.includes('/pricing/') || window.location.pathname.includes('/legal/') || window.location.pathname.includes('/error_404/')); };
        btn.removeAttribute('data-modal');
        btn.href = '#';
      } else {
        btn.style.display = 'none'; // Hide generic signin links like footer if logged in
      }
    });

    signupBtns.forEach(btn => {
      if (btn.classList.contains('btn-get-started')) {
        btn.textContent = 'Go to Dashboard';
        btn.onclick = (e) => { e.preventDefault(); crestRedirectToDashboard(window.location.pathname.includes('/about/') || window.location.pathname.includes('/academy/') || window.location.pathname.includes('/accounts/') || window.location.pathname.includes('/careers/') || window.location.pathname.includes('/investments/') || window.location.pathname.includes('/pricing/') || window.location.pathname.includes('/legal/') || window.location.pathname.includes('/error_404/')); };
        btn.removeAttribute('data-modal');
        btn.href = '#';
      } else {
        btn.textContent = 'Dashboard';
        btn.onclick = (e) => { e.preventDefault(); crestRedirectToDashboard(window.location.pathname.includes('/about/') || window.location.pathname.includes('/academy/') || window.location.pathname.includes('/accounts/') || window.location.pathname.includes('/careers/') || window.location.pathname.includes('/investments/') || window.location.pathname.includes('/pricing/') || window.location.pathname.includes('/legal/') || window.location.pathname.includes('/error_404/')); };
        btn.removeAttribute('data-modal');
        btn.href = '#';
      }
    });
  }
});
