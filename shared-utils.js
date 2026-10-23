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
function showToast(message, type = "success", duration = 4000) {
  // Remove existing toast if any
  const existingToast = document.querySelector(".toast-notification");
  if (existingToast) existingToast.remove();

  const msgStr =
    message === null || message === undefined ? "" : String(message);
  const isSuccess = type === "success";
  const isError = type === "error";
  const isAuthComplete =
    isSuccess &&
    (msgStr.toLowerCase().includes("auth") ||
      msgStr.toLowerCase().includes("success"));
  const safeMessage = escapeHtml(msgStr);

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${type}`;

  const circleBg = isSuccess
    ? "linear-gradient(135deg, #10B981, #059669)"
    : isError
      ? "linear-gradient(135deg, #EF4444, #DC2626)"
      : "linear-gradient(135deg, #F59E0B, #D97706)";

  const iconSvg = isSuccess
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : isError
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `
    <div style="width: 34px; height: 34px; min-width: 34px; border-radius: 50%; background: ${circleBg}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${isSuccess ? "rgba(16, 185, 129, 0.6)" : isError ? "rgba(239, 68, 68, 0.6)" : "rgba(245, 158, 11, 0.6)"};">
      ${iconSvg}
    </div>
    <div style="display: flex; flex-direction: column; text-align: left;">
      <span style="font-weight: 700; font-size: 0.92rem; color: #ffffff; line-height: 1.2;">${isAuthComplete ? "Authentication Complete" : safeMessage}</span>
      ${isAuthComplete ? '<span style="font-size: 0.75rem; color: #A7F3D0; font-weight: 500; margin-top: 1px;">Verified • Loading Investor Portal</span>' : ""}
    </div>
  `;

  // Add styles
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(11, 37, 26, 0.96);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: white;
    padding: 10px 22px 10px 12px;
    border-radius: 999px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 0 24px rgba(16, 185, 129, 0.25);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease-out;
    max-width: 90vw;
    box-sizing: border-box;
  `;

  // Add animation keyframes if not exists
  if (!document.querySelector("#toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
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
    toast.style.animation = "slideOut 0.3s ease-out";
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
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function crestSanitizeUrl(url) {
  if (url === null || url === undefined) return "";
  var raw = String(url).trim();
  if (!raw) return "";
  // A root-relative path is safe to keep as-is. "//evil.com" is NOT a path —
  // it is a protocol-relative URL that resolves to another origin, so it falls
  // through to the scheme check below like any other external link.
  if (raw.charAt(0) === "/" && raw.charAt(1) !== "/" && raw.charAt(1) !== "\\")
    return raw;
  try {
    var u = new URL(raw, window.location.origin);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch (e) {}
  return "";
}

/**
 * Escapes a value for safe interpolation INSIDE a single-quoted JS string that
 * itself sits in an HTML attribute, e.g. onclick="doThing('VALUE')".
 *
 * escapeHtml() is NOT enough in this position. The HTML parser decodes
 * character references in an attribute value BEFORE the JS parser ever sees it,
 * so "&#39;" is turned back into "'" and closes the string, letting a value such
 * as  x');alert(1)//  run as code. This helper emits real JS escapes and turns
 * '&' and '<' into \x26 / \x3C so no entity can be re-decoded into a quote or a
 * tag. Use it for every value dropped into an inline event handler.
 */
function crestJsArg(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/&/g, "\\x26")
    .replace(/</g, "\\x3C")
    .replace(/>/g, "\\x3E");
}

/**
 * Only allow an image source we are willing to drop into a receipt <img>:
 * inline image data, or an http(s) URL. Anything else returns "" so the tag
 * renders an empty (harmless) image instead of executing.
 */
function crestSafeImageSrc(src) {
  if (src === null || src === undefined) return "";
  var raw = String(src).trim();
  if (!raw) return "";
  if (/^data:image\//i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

function crestPersistCurrentUser(user) {
  try {
    if (!user) {
      localStorage.removeItem("crest_current_user");
      return;
    }
    var safe = {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name:
          (user.user_metadata && user.user_metadata.full_name) ||
          user.full_name ||
          (user.email ? user.email.split("@")[0] : ""),
      },
    };
    localStorage.setItem("crest_current_user", JSON.stringify(safe));
  } catch (e) {}
}

/**
 * Toggle password input visibility with SVG eye/eye-off icons.
 * @param {string} inputId - ID of password input
 * @param {HTMLElement} btn - Button trigger
 */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";

  const eyeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  btn.innerHTML = isPass ? eyeOffIcon : eyeIcon;
}

// =============================================================================
// MARKET TICKER: STOCK QUOTES VIA EDGE FUNCTION
// The Alpha Vantage key used to be defined here, which meant any visitor could
// read it out of the page source. It now lives as a server-side secret on the
// "market-quotes" Edge Function, and this helper is the only client entry point.
// On any failure it resolves to {} so the ticker keeps rendering its static
// fallback values instead of breaking.
// =============================================================================
async function crestFetchStockQuotes() {
  try {
    let waited = 0;
    while (!window.supabaseClient && waited < 2000) {
      await new Promise((r) => setTimeout(r, 25));
      waited += 25;
    }
    const client = window.supabaseClient;
    if (!client || !client.functions) return {};
    const { data, error } = await client.functions.invoke("market-quotes");
    if (error || !data || !data.quotes) return {};
    return data.quotes;
  } catch (e) {
    return {};
  }
}

// =============================================================================
// COOKIE CONSENT BANNER CONTROLLER
// =============================================================================
function acceptCookies() {
  try {
    localStorage.setItem("crest_cookie_consent", "accepted");
  } catch (e) {}
  const banner = document.getElementById("cookie-banner");
  if (banner) banner.style.display = "none";
}

function declineCookies() {
  try {
    localStorage.setItem("crest_cookie_consent", "declined");
  } catch (e) {}
  const banner = document.getElementById("cookie-banner");
  if (banner) banner.style.display = "none";
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    try {
      const consent = localStorage.getItem("crest_cookie_consent");
      const banner = document.getElementById("cookie-banner");
      if (banner) {
        if (!consent) {
          banner.style.display = "flex";
        } else {
          banner.style.display = "none";
        }
      }
    } catch (e) {}
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
    await new Promise((r) => setTimeout(r, 25));
    waited += 25;
  }
  const sb = window.supabaseClient || null;
  if (sb && !window._crest_auth_listener_attached) {
    window._crest_auth_listener_attached = true;
    try {
      sb.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          crestPersistCurrentUser(session.user);
          try {
            sb.from("profiles")
              .upsert(
                {
                  id: session.user.id,
                  email: session.user.email,
                  full_name:
                    (session.user.user_metadata &&
                      session.user.user_metadata.full_name) ||
                    session.user.email.split("@")[0],
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "id" },
              )
              .then(() => {})
              .catch(() => {});
          } catch (e) {
            /* ignore */
          }
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("crest_current_user");
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
  const sb = await waitForSupabase();
  if (sb) {
    try {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session) return true;
    } catch (e) {}
  }
  return false;
}

/**
 * Whether a member has switched on email two-factor authentication.
 * Returns { enabled, error }. A failed read reports an error rather than
 * defaulting to "off", because quietly skipping the second factor on a
 * transient database hiccup would defeat the whole point of having one.
 * @param {string} userId
 */
async function crestTwoFactorState(userId) {
  if (!userId) return { enabled: false, error: null };
  const sb = await waitForSupabase();
  if (!sb) return { enabled: false, error: "Cannot reach the server." };
  try {
    const { data, error } = await sb
      .from("profiles")
      .select("two_factor_enabled")
      .eq("id", userId)
      .maybeSingle();
    if (error) return { enabled: false, error: error.message };
    return {
      enabled: !!(data && data.two_factor_enabled === true),
      error: null,
    };
  } catch (e) {
    return { enabled: false, error: "Cannot reach the server." };
  }
}

/**
 * Supabase sign-in. Returns { success, error }.
 * @param {string} email
 * @param {string} password
 */
async function crestSignIn(email, password) {
  const sb = await waitForSupabase();
  if (!sb)
    return {
      success: false,
      error:
        "Cannot reach the server. Check your internet connection and try again.",
    };

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = /email not confirmed/i.test(error.message)
      ? "Please confirm your email first — check your inbox for the verification link."
      : /invalid login credentials/i.test(error.message)
        ? "Incorrect email or password."
        : error.message;
    return { success: false, error: msg };
  }
  if (!data || !data.user)
    return { success: false, error: "Login failed. Please try again." };

  crestPersistCurrentUser(data.user);

  // Non-blocking background sync for profile row (do not await)
  try {
    sb.from("profiles")
      .upsert(
        {
          id: data.user.id,
          email: data.user.email,
          full_name:
            (data.user.user_metadata && data.user.user_metadata.full_name) ||
            email.split("@")[0],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .then(() => {})
      .catch(() => {});
  } catch (e) {
    /* ignore */
  }

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
  if (!sb)
    return {
      success: false,
      error:
        "Cannot reach the server. Check your internet connection and try again.",
    };

  // Determine current page URL for redirecting back after email verification
  let redirectUrl = window.location.href
    ? window.location.href.split("#")[0].split("?")[0]
    : "";
  if (!redirectUrl || redirectUrl.startsWith("file://")) {
    redirectUrl = "http://localhost:5500/index/index.html";
  }

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        phone: phone || "",
        package: pkg || "Level 1 Package (Starter)",
      },
    },
  });
  if (error) return { success: false, error: error.message };
  if (!data || !data.user)
    return { success: false, error: "Signup failed. Please try again." };

  // Supabase returns a user with no identities when the email is already registered
  if (
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    return {
      success: false,
      error: "An account with this email already exists. Please log in.",
    };
  }

  // No session => email confirmation required
  if (!data.session) {
    return {
      success: true,
      needsConfirmation: true,
      data: { user: data.user },
    };
  }

  // Check for pending referral code from URL or storage
  let refCode = null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    refCode = urlParams.get("ref") || localStorage.getItem("crest_ref_code");
  } catch (e) {}

  crestPersistCurrentUser(data.user);
  try {
    let referrerId = null;
    if (refCode && sb) {
      const cleanRef = refCode.trim().toUpperCase();
      // Try secure RPC first
      try {
        const { data: rpcLookup } = await sb.rpc("lookup_referral_code", {
          p_code: cleanRef,
        });
        if (rpcLookup && rpcLookup.valid && rpcLookup.referrer_id) {
          referrerId = rpcLookup.referrer_id;
        }
      } catch (rpcErr) {
        console.warn("lookup_referral_code notice:", rpcErr);
      }

      // Fallback direct table query
      if (!referrerId) {
        const { data: refProfile } = await sb
          .from("profiles")
          .select("id")
          .ilike("referral_code", cleanRef)
          .maybeSingle();
        if (refProfile && refProfile.id) referrerId = refProfile.id;
      }
    }

    const myRefCode = "CW-" + data.user.id.substring(0, 8).toUpperCase();
    await sb.from("profiles").upsert(
      {
        id: data.user.id,
        email: email,
        full_name: fullName,
        phone: phone || "",
        cash_balance: 0,
        invested_balance: 0,
        referral_code: myRefCode,
        referred_by: referrerId,
        daily_streak_day: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch (dbErr) {
    console.warn("Profiles table upsert notice:", dbErr);
  }
  return { success: true, data: { user: data.user, session: data.session } };
}

/**
 * Capture referral code in URL automatically on load
 */
(function captureReferralCode() {
  try {
    if (typeof window !== "undefined" && window.location) {
      const p = new URLSearchParams(window.location.search);
      const r = p.get("ref");
      if (r) localStorage.setItem("crest_ref_code", r.trim().toUpperCase());
    }
  } catch (e) {}
})();

/**
 * Supabase sign-out. Clears local session and redirects.
 */
async function crestSignOut() {
  const sb = await waitForSupabase();
  if (sb) {
    try {
      await sb.auth.signOut();
    } catch (e) {}
  }

  crestPersistCurrentUser(null);
  window.crestUser = null;

  const depth = window.location.pathname.split("/").filter(Boolean).length;
  window.location.href = depth > 1 ? "../index/index.html" : "index/index.html";
}

/**
 * Send a password-reset email via Supabase. Returns { success, error }.
 */
async function crestResetPassword(email) {
  const sb = await waitForSupabase();
  if (!sb)
    return {
      success: false,
      error:
        "Cannot reach the server. Check your internet connection and try again.",
    };
  const redirectTo =
    window.location.origin +
    window.location.pathname.replace(/[^/]*$/, "") +
    (window.location.pathname.split("/").filter(Boolean).length > 1
      ? "../index/index.html"
      : "index/index.html");
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Whether a member holds the administrator flag. Read from the database on
 * every call and never cached: the point of the flag being database-only is
 * that revoking it in SQL takes effect on the member's very next page load.
 * @param {string} [userId] - Defaults to the signed-in member's own id.
 */
async function crestIsAdminUser(userId) {
  const sb = await waitForSupabase();
  if (!sb) return false;
  try {
    if (!userId) {
      const { data } = await sb.auth.getSession();
      userId = data && data.session ? data.session.user.id : null;
    }
    if (!userId) return false;

    const { data, error } = await sb
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (error) return false;
    return !!(data && data.is_admin === true);
  } catch (e) {
    return false;
  }
}

/**
 * Where a signed-in member belongs. Administrators run the platform, so they
 * land in the admin panel; everyone else lands in the dashboard. Decided from
 * the member's own profile rather than from anything the calling page passed
 * in, so no page can send an administrator into the client app.
 */
async function crestRedirectToDashboard() {
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const prefix = depth > 1 ? "../" : "";
  let destination = prefix + "dashboard/dashboard.html";

  // The current page is no longer relevant once auth succeeds, and keeping it
  // visible while we read the member's admin flag causes a brief flash of the
  // marketing page before the browser lands on the real destination.
  document.documentElement.style.visibility = "hidden";
  if (document.body) {
    document.body.style.pointerEvents = "none";
  }

  const sb = await waitForSupabase();
  if (sb) {
    try {
      const {
        data: { session },
      } = await sb.auth.getSession();
      const userId = session && session.user ? session.user.id : null;
      if (await crestIsAdminUser(userId)) {
        destination = prefix + "admin/admin.html";
      }
    } catch (e) {}
  }

  window.location.replace(destination);
}

// =============================================================================
// NAVBAR AUTHENTICATION STATE UPDATE
// 2 Nav States:
// - Unauthenticated (Not Logged In): Hide every dashboard link, keep both the
//   Log In and Get Started buttons visible so a visitor can join from any page.
// - Authenticated (Logged In): Show the dashboard link, hide the now-redundant
//   Log In button, and turn Get Started into the member's portal shortcut
//   ("Admin Panel" for administrators, "Client Dashboard" for everyone else).
// =============================================================================
function crestLoadAuthGuard(defaultTab) {
  const tab = defaultTab || "login";
  if (typeof window.crestOpenAuthModal === "function") {
    window.crestOpenAuthModal(tab);
    return;
  }
  window.crestAuthDefaultTab = tab;
  let script = document.getElementById("crest-auth-guard-script");
  if (!script) {
    const depth = window.location.pathname.split("/").filter(Boolean).length;
    const basePath = depth > 1 ? "../" : "";
    script = document.createElement("script");
    script.id = "crest-auth-guard-script";
    script.src = basePath + "auth-guard.js";
    script.onload = function () {
      if (typeof window.crestOpenAuthModal === "function") {
        window.crestOpenAuthModal(tab);
      }
    };
    document.head.appendChild(script);
  }
}

// Capture-phase delegation: runs before any page-specific handlers, works immediately.
document.addEventListener(
  "click",
  async (e) => {
    const trigger = e.target.closest(
      'a.btn-sign-in, a.btn-get-started, a[data-modal="signin"], a[data-modal="signup"], a[data-modal="forgot"]',
    );
    if (!trigger) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    // If the user is already authenticated, always go straight to dashboard
    // Never re-open the login modal for a user who is already logged in
    if (await crestIsAuthenticated()) {
      crestRedirectToDashboard();
      return;
    }

    // Forgot password opens the reset-request panel of the auth modal
    if (trigger.matches('a[data-modal="forgot"]')) {
      crestLoadAuthGuard("forgot");
      return;
    }

    const isSignin = trigger.matches('a.btn-sign-in, a[data-modal="signin"]');
    const targetTab = isSignin ? "login" : "signup";

    // If the user clicked "Client Dashboard" link without being signed in, open sign-in modal
    const isDashboardBtn = trigger.textContent
      .trim()
      .toLowerCase()
      .includes("client dashboard");
    if (isDashboardBtn) {
      crestLoadAuthGuard("login");
      return;
    }

    // Otherwise open the Auth Modal (login or signup tab) so they can enter credentials
    crestLoadAuthGuard(targetTab);
  },
  true,
);

document.addEventListener("DOMContentLoaded", async () => {
  const isAuth = await crestIsAuthenticated();

  // Nav links and the Log In / Get Started buttons live in the header, the
  // mobile drawer and the footer. Scoping the sweep to those three containers
  // keeps it off content buttons that merely happen to link at the dashboard -
  // "Trade", "Reserve Seat", "Set Up Child Trust" and the 404 page's "Go to
  // Homepage" all share the same href, and matching by href alone hid them.
  const navRoots = document.querySelectorAll("header, .mobile-drawer, footer");
  const dashboardNavLinks = [];
  const signinNavBtns = [];
  const signupNavBtns = [];
  navRoots.forEach((root) => {
    root
      .querySelectorAll('a[href*="dashboard.html"], a.nav-link-ember')
      .forEach((el) => dashboardNavLinks.push(el));
    root
      .querySelectorAll('a.btn-sign-in, a[data-modal="signin"]')
      .forEach((el) => signinNavBtns.push(el));
    root
      .querySelectorAll("a.btn-get-started")
      .forEach((el) => signupNavBtns.push(el));
  });

  if (isAuth) {
    // An administrator runs the platform, so their nav shortcut leads to the
    // admin panel rather than to a client page they would only be bounced off.
    // This is UX only - admin.js still re-checks the flag before it renders.
    const isAdmin = await crestIsAdminUser();
    const depth = window.location.pathname.split("/").filter(Boolean).length;
    const prefix = depth > 1 ? "../" : "";
    const portalHref =
      prefix + (isAdmin ? "admin/admin.html" : "dashboard/dashboard.html");

    // Authenticated: show the dashboard link, hide the redundant "Log In"
    // button, and repurpose "Get Started" as the member's portal shortcut
    dashboardNavLinks.forEach((link) => {
      link.style.display = "";
      link.setAttribute("href", portalHref);
      // An administrator has no client dashboard, so the link that used to
      // say "Client Dashboard" says what it now opens.
      if (isAdmin && link.textContent.trim() === "Client Dashboard") {
        link.textContent = "Admin Panel";
      }
    });
    signinNavBtns.forEach((btn) => {
      btn.style.display = "none";
    }); // already in via the dashboard link
    signupNavBtns.forEach((btn) => {
      btn.textContent = isAdmin ? "Admin Panel" : "Client Dashboard";
      btn.removeAttribute("data-modal");
      btn.setAttribute("href", portalHref);
    });
  } else {
    // Not authenticated: hide every dashboard link, then put the two auth
    // buttons back. They sit in the nav but some of them point at
    // dashboard.html, so the sweep above would otherwise hide them too.
    dashboardNavLinks.forEach((link) => {
      link.style.display = "none";
    });
    signinNavBtns.forEach((btn) => {
      btn.style.display = "";
    });
    signupNavBtns.forEach((btn) => {
      btn.style.display = "";
    });

    // Auto-open modal if URL hash is #signin or #signup
    const handleAuthHash = () => {
      const h = window.location.hash;
      if (h === "#signin" || h === "#login") {
        crestLoadAuthGuard("login");
      } else if (h === "#signup") {
        crestLoadAuthGuard("signup");
      }
    };
    handleAuthHash();
    window.addEventListener("hashchange", handleAuthHash);
  }
});

// =============================================================================
// PWA SERVICE WORKER
// Registered from this shared file so every page gets it without repeating the
// snippet. The worker is resolved next to shared-utils.js, which keeps it
// working whether the site sits at a domain root or under a sub-path.
// =============================================================================
(function registerCrestServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost")
    return;

  const tag = document.querySelector('script[src$="shared-utils.js"]');
  if (!tag) return;

  let workerUrl;
  try {
    workerUrl = new URL("service-worker.js", tag.src).href;
  } catch (e) {
    return;
  }

  const register = () => {
    navigator.serviceWorker.register(workerUrl).catch(() => {
      /* offline support is a bonus, never a hard requirement */
    });
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
})();
