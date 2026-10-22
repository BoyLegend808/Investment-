/**
 * Crest Wealth - Client-Side Authentication Guard
 */
(async function () {
  const path = window.location.pathname.toLowerCase();
  const isProtectedPage =
    path.includes("/dashboard") || path.includes("/admin");

  // Fast check: if demo investor or existing window user
  const localUserRaw = localStorage.getItem("crest_current_user");
  let isDemoUser = false;
  let localUser = null;
  if (localUserRaw) {
    try {
      localUser = JSON.parse(localUserRaw);
      isDemoUser = !!(
        localUser &&
        typeof localUser.id === "string" &&
        localUser.id.indexOf("demo_") === 0
      );
    } catch (e) {}
  }

  // ONLY hide document on protected pages when neither demo nor authenticated user exists
  if (isProtectedPage && !isDemoUser && !window.crestUser) {
    document.documentElement.style.visibility = "hidden";
  }

  // Resolve Supabase session quickly
  let session = null;
  if (window.supabaseClient) {
    try {
      const res = await window.supabaseClient.auth.getSession();
      session = res && res.data ? res.data.session : null;
    } catch (e) {}
  } else {
    let retries = 0;
    while (!window.supabaseClient && retries < 30) {
      await new Promise((r) => setTimeout(r, 25));
      retries++;
    }
    if (window.supabaseClient) {
      try {
        const res = await window.supabaseClient.auth.getSession();
        session = res && res.data ? res.data.session : null;
      } catch (e) {}
    }
  }

  // Always restore document visibility immediately
  if (isProtectedPage) {
    document.documentElement.style.visibility = "";
  }

  if (session || isDemoUser) {
    window.crestUser = session ? session.user : localUser;
    window.crestSession = session;
    // On protected pages, user is authorized, so do not build or show overlay
    if (isProtectedPage) return;
  }

  // If overlay already exists in DOM, just open it
  if (document.getElementById("crest-auth-overlay")) {
    if (typeof window.crestOpenAuthModal === "function") {
      window.crestOpenAuthModal(window.crestAuthDefaultTab || "login");
    }
    return;
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #crest-auth-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.85); /* Dark slate backdrop */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      animation: crestFadeIn 0.3s ease;
      padding: 20px;
      box-sizing: border-box;
    }
    @keyframes crestFadeIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to   { opacity: 1; backdrop-filter: blur(12px); }
    }
    #crest-auth-box {
      background: #ffffff;
      border-radius: 24px;
      max-width: 440px;
      width: 100%;
      margin: auto;
      max-height: calc(100dvh - 40px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: crestSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    @keyframes crestSlideUp {
      from { transform: translateY(30px) scale(0.97); opacity: 0; }
      to   { transform: translateY(0) scale(1);       opacity: 1; }
    }
    
    /* Close Button (X) */
    #crest-auth-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      z-index: 30;
      transition: all 0.2s ease;
    }
    #crest-auth-close svg {
      width: 20px;
      height: 20px;
      stroke-width: 2.5;
    }
    #crest-auth-close:hover { 
      background: #f1f5f9;
      color: #0f172a;
      transform: rotate(90deg);
    }

    #crest-auth-header {
      padding: 32px 32px 24px 32px;
      background: #ffffff;
      text-align: left;
    }
    #crest-auth-header h3 {
      margin: 0 0 8px;
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    #crest-auth-header p {
      margin: 0;
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    #crest-auth-body {
      padding: 0 32px 32px 32px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      /* Scrollbar hiding */
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    #crest-auth-body::-webkit-scrollbar {
      display: none;
    }

    /* Tabs */
    #crest-auth-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 28px;
      background: #f1f5f9;
      padding: 6px;
      border-radius: 14px;
    }
    .crest-tab-btn {
      flex: 1;
      padding: 12px;
      border: none;
      background: transparent;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      color: #64748b;
      border-radius: 10px;
      transition: all 0.2s ease;
    }
    .crest-tab-btn:hover {
      color: #0f172a;
    }
    .crest-tab-btn.active {
      background: #ffffff;
      color: #059669; /* Brand color */
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .crest-tab-panel { display: none; animation: fadeInTab 0.3s ease; }
    .crest-tab-panel.active { display: block; }
    @keyframes fadeInTab {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Two-step verification */
    .crest-2fa-input {
      letter-spacing: 0.5em;
      text-indent: 0.5em;
      font-family: 'Space Mono', monospace;
      font-size: 1.05rem;
      text-align: center;
    }
    .crest-2fa-note {
      margin: 14px 0 0;
      font-size: 0.78rem;
      line-height: 1.45;
      color: #64748b;
      text-align: center;
    }
    .crest-2fa-note.error { color: #dc2626; }

    /* Forms */
    .crest-form-group { margin-bottom: 20px; }
    .crest-form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;
    }
    .crest-form-input {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
      box-sizing: border-box;
      background: #ffffff;
      color: #0f172a;
      font-family: inherit;
    }
    .crest-form-input::placeholder { color: #94a3b8; }
    .crest-form-input:focus { 
      border-color: #059669; 
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.1);
    }
    .crest-form-input:-webkit-autofill,
    .crest-form-input:-webkit-autofill:hover, 
    .crest-form-input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
      -webkit-text-fill-color: #0f172a !important;
    }

    /* Buttons */
    .crest-submit-btn {
      width: 100%;
      padding: 16px;
      background: #059669;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 10px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }
    .crest-submit-btn:hover { 
      background: #047857; 
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35);
    }
    .crest-submit-btn:active {
      transform: translateY(0);
    }
    .crest-submit-btn:disabled { 
      background: #94a3b8;
      box-shadow: none;
      cursor: not-allowed; 
      transform: none; 
    }
    
    .crest-demo-btn {
      width: 100%;
      padding: 14px;
      background: #f8fafc;
      color: #475569;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: all 0.2s;
    }
    .crest-demo-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
      color: #0f172a;
    }

    /* Footer text */
    .crest-auth-footer {
      text-align: center;
      font-size: 0.9rem;
      color: #64748b;
      margin-top: 24px;
    }
    .crest-auth-footer a { 
      color: #059669; 
      font-weight: 700; 
      cursor: pointer; 
      text-decoration: none;
      margin-left: 4px;
    }
    .crest-auth-footer a:hover { text-decoration: underline; }

    /* Redesigned Authentication Complete Toast & Circles */
    #crest-auth-toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(20px) scale(0.95);
      background: rgba(11, 37, 26, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #fff;
      padding: 10px 22px 10px 12px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 100000;
      opacity: 0;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 0 24px rgba(16, 185, 129, 0.25);
      max-width: calc(100vw - 32px);
      box-sizing: border-box;
    }
    #crest-auth-toast.show { 
      opacity: 1; 
      transform: translateX(-50%) translateY(0) scale(1);
    }
    .crest-toast-circle {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10B981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.6);
      animation: crestCirclePulse 1.8s infinite ease-in-out;
    }
    .crest-toast-circle.error {
      background: linear-gradient(135deg, #EF4444, #DC2626);
      box-shadow: 0 0 14px rgba(239, 68, 68, 0.6);
      animation: none;
    }
    @keyframes crestCirclePulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
      50% { transform: scale(1.08); box-shadow: 0 0 22px rgba(16, 185, 129, 0.85); }
    }
    .crest-toast-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .crest-toast-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
    }
    .crest-toast-sub {
      font-size: 0.75rem;
      color: #A7F3D0;
      font-weight: 500;
      margin-top: 1px;
    }
    .auth-btn-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2.5px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: authBtnSpin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }
    @keyframes authBtnSpin {
      to { transform: rotate(360deg); }
    }
    .auth-btn-circle-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      margin-right: 8px;
      vertical-align: middle;
    }

    /* Mobile specifics */
    @media (max-width: 480px) {
      #crest-auth-overlay {
        padding: 16px;
      }
      #crest-auth-box {
        border-radius: 24px;
        max-height: calc(100dvh - 32px);
      }
      #crest-auth-header {
        padding: 24px 20px 16px 20px;
      }
      #crest-auth-body {
        padding: 0 20px 24px 20px;
      }
      #crest-auth-close {
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
      }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "crest-auth-overlay";
  overlay.innerHTML = `
    <div id="crest-auth-box">
      <button id="crest-auth-close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
      
      <div id="crest-auth-header">
        <h3 id="crest-header-title">Get Started</h3>
        <p id="crest-header-desc">Join Crest Wealth and start investing.</p>
      </div>
      
      <div id="crest-auth-body">
        <div id="crest-auth-tabs">
          <button class="crest-tab-btn active" data-tab="signup">Get Started</button>
          <button class="crest-tab-btn" data-tab="login">Log In</button>
        </div>

        <!-- SIGNUP PANEL -->
        <div class="crest-tab-panel active" id="crest-panel-signup">
          <form id="crest-form-signup" novalidate>
            <div class="crest-form-group">
              <label class="crest-form-label">Full Name</label>
              <input type="text" class="crest-form-input" id="crest-signup-name" placeholder="John Doe" required>
            </div>
            <div class="crest-form-group">
              <label class="crest-form-label">Email Address</label>
              <input type="email" class="crest-form-input" id="crest-signup-email" placeholder="john@example.com" required>
            </div>
            <div class="crest-form-group">
              <label class="crest-form-label">Phone Number</label>
              <input type="tel" class="crest-form-input" id="crest-signup-phone" placeholder="+234 803 000 0000" required>
            </div>
            <div class="crest-form-group" style="position: relative;">
              <label class="crest-form-label">Password</label>
              <input type="password" class="crest-form-input" id="crest-signup-pass" placeholder="At least 6 characters" required minlength="6" autocomplete="new-password" style="padding-right: 48px;">
              <button type="button" onclick="togglePasswordVisibility('crest-signup-pass', this)" style="position: absolute; right: 14px; top: 37px; background: none; border: none; cursor: pointer; color: #94a3b8;" aria-label="Toggle visibility">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="crest-form-group" style="position: relative;">
              <label class="crest-form-label">Confirm Password</label>
              <input type="password" class="crest-form-input" id="crest-signup-pass-confirm" placeholder="Repeat your password" required minlength="6" autocomplete="new-password" style="padding-right: 48px;">
              <button type="button" onclick="togglePasswordVisibility('crest-signup-pass-confirm', this)" style="position: absolute; right: 14px; top: 37px; background: none; border: none; cursor: pointer; color: #94a3b8;" aria-label="Toggle visibility">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="crest-form-group">
              <label class="crest-form-label">Select Starting Package</label>
              <select class="crest-form-input" id="crest-signup-package" style="background: #FFFFFF;">
                <option>Level 1 Package (Starter)</option>
                <option>Level 2 Package (Basic)</option>
                <option>Level 3 Package (Pro)</option>
                <option>Level 4 Package (Advanced)</option>
                <option>Level 5 Package (VIP)</option>
              </select>
            </div>
            <button type="submit" class="crest-submit-btn" id="crest-signup-submit">
              Create Account
            </button>
            <button type="button" class="crest-demo-btn" id="crest-demo-btn">
              Explore Demo Dashboard
            </button>
          </form>
          <div class="crest-auth-footer">
            Already have an account? <a class="crest-switch-login">Log in</a>
          </div>
        </div>

        <!-- LOGIN PANEL -->
        <div class="crest-tab-panel" id="crest-panel-login">
          <form id="crest-form-login" novalidate>
            <div class="crest-form-group">
              <label class="crest-form-label">Email Address</label>
              <input type="email" class="crest-form-input" id="crest-login-email" placeholder="john@example.com" required>
            </div>
            <div class="crest-form-group" style="position: relative;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="crest-form-label" style="margin-bottom: 0;">Password</label>
                <a class="crest-switch-forgot" style="font-size: 0.8rem; color: #059669; font-weight: 600; cursor: pointer; text-decoration: none;">Forgot Password?</a>
              </div>
              <input type="password" class="crest-form-input" id="crest-login-pass" placeholder="••••••••" required minlength="6" autocomplete="current-password" style="padding-right: 48px;">
              <button type="button" onclick="togglePasswordVisibility('crest-login-pass', this)" style="position: absolute; right: 14px; top: 37px; background: none; border: none; cursor: pointer; color: #94a3b8;" aria-label="Toggle visibility">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <button type="submit" class="crest-submit-btn" id="crest-auth-submit">
              Log In
            </button>
          </form>
          <div class="crest-auth-footer">
            Don't have an account? <a class="crest-switch-signup">Create one</a>
          </div>
        </div>

        <!-- FORGOT PASSWORD PANEL -->
        <div class="crest-tab-panel" id="crest-panel-forgot">
          <form id="crest-form-forgot" novalidate>
            <div class="crest-form-group">
              <label class="crest-form-label">Your Email Address</label>
              <input type="email" class="crest-form-input" id="crest-forgot-email" placeholder="john@example.com" required>
            </div>
            <button type="submit" class="crest-submit-btn" id="crest-forgot-submit">
              Send Reset Link
            </button>
          </form>
          <div class="crest-auth-footer">
            Remembered your password? <a class="crest-switch-login">Back to Log In</a>
          </div>
        </div>

        <!-- UPDATE NEW PASSWORD PANEL (Triggered via recovery link) -->
        <div class="crest-tab-panel" id="crest-panel-reset">
          <form id="crest-form-reset" novalidate>
            <div class="crest-form-group" style="position: relative;">
              <label class="crest-form-label">New Password</label>
              <input type="password" class="crest-form-input" id="crest-reset-pass" placeholder="At least 6 characters" required minlength="6" autocomplete="new-password" style="padding-right: 48px;">
              <button type="button" onclick="togglePasswordVisibility('crest-reset-pass', this)" style="position: absolute; right: 14px; top: 37px; background: none; border: none; cursor: pointer; color: #94a3b8;" aria-label="Toggle visibility">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <button type="submit" class="crest-submit-btn" id="crest-reset-submit">
              Update Password
            </button>
          </form>
        </div>

        <!-- TWO-STEP VERIFICATION PANEL (email code, after a correct password) -->
        <div class="crest-tab-panel" id="crest-panel-2fa">
          <form id="crest-form-2fa" novalidate>
            <div class="crest-form-group">
              <label class="crest-form-label" for="crest-2fa-code">6-Digit Verification Code</label>
              <input type="text" class="crest-form-input crest-2fa-input" id="crest-2fa-code"
                inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
            </div>
            <button type="submit" class="crest-submit-btn" id="crest-2fa-submit">
              Verify &amp; Log In
            </button>
          </form>
          <p class="crest-2fa-note" id="crest-2fa-note"></p>
          <div class="crest-auth-footer">
            Didn't get it? <a class="crest-2fa-resend" id="crest-2fa-resend">Send a new code</a>
          </div>
        </div>

      </div>
    </div>
    <div id="crest-auth-toast"></div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  // Make togglePasswordVisibility available globally if it isn't
  if (typeof window.togglePasswordVisibility !== "function") {
    window.togglePasswordVisibility = function (inputId, btn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>';
      } else {
        input.type = "password";
        btn.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function showToast(msg, isError) {
    const t = document.getElementById("crest-auth-toast");
    if (!t) return;
    var raw = msg === null || msg === undefined ? "" : String(msg);
    var safe =
      typeof escapeHtml === "function"
        ? escapeHtml(raw)
        : raw
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    const isComplete =
      !isError &&
      (raw.toLowerCase().includes("success") ||
        raw.toLowerCase().includes("complete") ||
        raw.toLowerCase().includes("welcome") ||
        raw.toLowerCase().includes("demo"));

    t.innerHTML = `
      <div class="crest-toast-circle ${isError ? "error" : ""}">
        ${
          isError
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        }
      </div>
      <div class="crest-toast-text">
        <span class="crest-toast-title">${isComplete ? "Authentication Complete" : safe}</span>
        ${isComplete ? '<span class="crest-toast-sub">Verified • Loading Investor Portal</span>' : ""}
      </div>
    `;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3500);
  }

  function closeOverlay() {
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    setTimeout(() => {
      overlay.style.display = "none";
      document.body.style.overflow = "";
      const p = window.location.pathname.toLowerCase();
      const isProt = p.includes("/dashboard") || p.includes("/admin");
      if (isProt && !window.crestUser) {
        const isSub = p.includes("/dashboard/") || p.includes("/admin/");
        window.location.href = isSub
          ? "../index/index.html"
          : "index/index.html";
      }
    }, 200);
  }

  window.crestOpenAuthModal = function (tab) {
    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      overlay.style.pointerEvents = "auto";
    });
    document.body.style.overflow = "hidden";
    switchTab(tab || "login");
  };

  function switchTab(tab) {
    const tabsContainer = document.getElementById("crest-auth-tabs");
    if (tab === "forgot" || tab === "reset" || tab === "2fa") {
      if (tabsContainer) tabsContainer.style.display = "none";
    } else {
      if (tabsContainer) tabsContainer.style.display = "flex";
    }

    document
      .querySelectorAll(".crest-tab-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

    const pLogin = document.getElementById("crest-panel-login");
    const pSignup = document.getElementById("crest-panel-signup");
    const pForgot = document.getElementById("crest-panel-forgot");
    const pReset = document.getElementById("crest-panel-reset");
    const p2fa = document.getElementById("crest-panel-2fa");

    if (pLogin) pLogin.classList.toggle("active", tab === "login");
    if (pSignup) pSignup.classList.toggle("active", tab === "signup");
    if (pForgot) pForgot.classList.toggle("active", tab === "forgot");
    if (pReset) pReset.classList.toggle("active", tab === "reset");
    if (p2fa) p2fa.classList.toggle("active", tab === "2fa");

    // Update headers
    const title = document.getElementById("crest-header-title");
    const desc = document.getElementById("crest-header-desc");
    if (tab === "login") {
      title.textContent = "Welcome Back";
      desc.textContent = "Log in to access your portfolio.";
    } else if (tab === "forgot") {
      title.textContent = "Reset Password";
      desc.textContent = "Enter your email to receive a password reset link.";
    } else if (tab === "reset") {
      title.textContent = "Set New Password";
      desc.textContent = "Enter a new password for your Crest Wealth account.";
    } else if (tab === "2fa") {
      title.textContent = "Two-Step Verification";
      desc.textContent =
        "Your password checked out. Enter the code we just emailed you.";
    } else {
      title.textContent = "Get Started";
      desc.textContent = "Join Crest Wealth and start investing.";
    }
  }

  function redirectAfterAuth() {
    showToast("Authentication Complete");
    const p = window.location.pathname.toLowerCase();
    const isDashboard =
      p.includes("/dashboard") || p.includes("dashboard.html");

    if (isDashboard) {
      setTimeout(() => {
        closeOverlay();
        if (typeof initDashboardUserProfile === "function") {
          initDashboardUserProfile();
        } else {
          window.location.reload();
        }
      }, 400);
      return;
    }

    setTimeout(() => {
      const isSubDir =
        p.includes("/index/") ||
        p.includes("/accounts/") ||
        p.includes("/investments/") ||
        p.includes("/academy/") ||
        p.includes("/pricing/") ||
        p.includes("/security/") ||
        p.includes("/about/") ||
        p.includes("/careers/") ||
        p.includes("/support/") ||
        p.includes("/legal/");
      window.location.href = isSubDir
        ? "../dashboard/dashboard.html"
        : "dashboard/dashboard.html";
    }, 450);
  }

  // ── Two-step verification ────────────────────────────────────────────────────
  // The password has already been accepted at this point. The session it
  // produced is thrown away straight after, so a stolen password on its own
  // still leaves the door shut: the emailed code is what actually logs in.
  var pendingTwoFactorEmail = null;

  function setTwoFactorNote(text, isError) {
    var note = document.getElementById("crest-2fa-note");
    if (!note) return;
    note.textContent = text || "";
    note.classList.toggle("error", !!isError);
  }

  async function sendTwoFactorCode(email) {
    var note = document.getElementById("crest-2fa-note");
    if (note) note.textContent = "Sending a fresh code…";
    var sb = window.supabaseClient;
    if (!sb) return "Cannot reach the server. Check your connection and retry.";
    try {
      var res = await sb.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: false },
      });
      if (res.error) {
        return (
          res.error.message ||
          "We could not send the code. Please try again in a moment."
        );
      }
      return null;
    } catch (e) {
      return "We could not send the code. Please try again in a moment.";
    }
  }

  // Takes over the login: hands the member the code panel, and tells them
  // plainly if the code could not be sent so they can ask for another one.
  async function beginTwoFactor(email) {
    pendingTwoFactorEmail = email;

    // Drop the password-only session first; it must not be enough on its own.
    try {
      await window.supabaseClient.auth.signOut();
    } catch (e) {}
    if (typeof crestPersistCurrentUser === "function") {
      crestPersistCurrentUser(null);
    }
    window.crestUser = null;

    switchTab("2fa");
    var codeEl = document.getElementById("crest-2fa-code");
    if (codeEl) codeEl.value = "";
    var btn = document.getElementById("crest-2fa-submit");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Verify & Log In";
    }

    var err = await sendTwoFactorCode(email);
    if (err) {
      // The member is told, and the panel stays open so they can retry or
      // switch the second factor off from Settings once they are back in.
      setTwoFactorNote(
        err + " You can tap “Send a new code” to try again.",
        true,
      );
      showToast("We could not send your verification code.", true);
      return true;
    }
    setTwoFactorNote(
      "Sent to " +
        email +
        ". The code is valid for one hour. If you do not see it, check your spam folder — or just click the link in the same email.",
      false,
    );
    return true;
  }

  var formTwoFactor = document.getElementById("crest-form-2fa");
  if (formTwoFactor) {
    formTwoFactor.addEventListener("submit", async function (e) {
      e.preventDefault();
      var codeEl = document.getElementById("crest-2fa-code");
      var btn = document.getElementById("crest-2fa-submit");
      var code = codeEl ? codeEl.value.trim() : "";
      if (!pendingTwoFactorEmail) {
        setTwoFactorNote("Please log in again to restart verification.", true);
        return;
      }
      if (!/^[0-9]{6}$/.test(code)) {
        setTwoFactorNote("Enter all 6 digits from the email.", true);
        return;
      }
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Checking…";
      }
      try {
        var res = await window.supabaseClient.auth.verifyOtp({
          email: pendingTwoFactorEmail,
          token: code,
          type: "email",
        });
        if (res.error) {
          setTwoFactorNote(
            "That code was not accepted. Please try again.",
            true,
          );
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Verify & Log In";
          }
          return;
        }
        window.crestUser = res.data && res.data.user ? res.data.user : null;
        if (window.crestUser && typeof crestPersistCurrentUser === "function") {
          crestPersistCurrentUser(window.crestUser);
        }
        pendingTwoFactorEmail = null;
        redirectAfterAuth();
      } catch (err) {
        setTwoFactorNote("That code was not accepted. Please try again.", true);
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Verify & Log In";
        }
      }
    });
  }

  var resendTwoFactor = document.getElementById("crest-2fa-resend");
  if (resendTwoFactor) {
    resendTwoFactor.addEventListener("click", async function () {
      if (!pendingTwoFactorEmail) {
        setTwoFactorNote("Please log in again to restart verification.", true);
        return;
      }
      var err = await sendTwoFactorCode(pendingTwoFactorEmail);
      if (err) {
        setTwoFactorNote(err + " You can tap the link again to retry.", true);
        return;
      }
      setTwoFactorNote(
        "A new code is on its way to " + pendingTwoFactorEmail + ".",
        false,
      );
    });
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  var closeBtn = document.getElementById("crest-auth-close");
  if (closeBtn) closeBtn.addEventListener("click", closeOverlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  document
    .querySelectorAll(".crest-switch-signup")
    .forEach((el) => el.addEventListener("click", () => switchTab("signup")));
  document
    .querySelectorAll(".crest-switch-login")
    .forEach((el) => el.addEventListener("click", () => switchTab("login")));
  document
    .querySelectorAll(".crest-switch-forgot")
    .forEach((el) => el.addEventListener("click", () => switchTab("forgot")));

  var demoBtn = document.getElementById("crest-demo-btn");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      showToast("Continuing as Demo Investor...");
      const demoUser = {
        id: "demo_investor",
        email: "demo@crestwealth.com",
        user_metadata: { full_name: "Demo Investor" },
      };
      if (typeof crestPersistCurrentUser === "function") {
        crestPersistCurrentUser(demoUser);
      } else {
        localStorage.setItem("crest_current_user", JSON.stringify(demoUser));
      }
      window.crestUser = demoUser;
      setTimeout(redirectAfterAuth, 250);
    });
  }

  document.querySelectorAll(".crest-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Default tab handling or recovery URL hash check
  if (window.location.hash && window.location.hash.includes("type=recovery")) {
    switchTab("reset");
  } else if (window.crestAuthDefaultTab === "login") {
    switchTab("login");
  }

  // Listen for Supabase password recovery event
  if (window.supabaseClient) {
    try {
      window.supabaseClient.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          switchTab("reset");
        }
      });
    } catch (e) {}
  }

  // Login form submit
  var formLogin = document.getElementById("crest-form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("crest-login-email").value.trim();
      const pass = document.getElementById("crest-login-pass").value;
      if (!email || !pass) {
        showToast("Please fill in all fields.", true);
        return;
      }

      const btn = document.getElementById("crest-auth-submit");
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<span class="auth-btn-spinner"></span> Authenticating...';

      try {
        const res =
          typeof crestSignIn === "function"
            ? await crestSignIn(email, pass)
            : {
                success: false,
                error: "Auth service unavailable. Please refresh the page.",
              };
        if (!res.success) {
          showToast(res.error || "Login failed.", true);
          btn.disabled = false;
          btn.innerHTML = originalText;
        } else {
          // A correct password is only step one for members who turned on
          // two-factor authentication. Check the flag before handing out a
          // session; if the check itself fails we say so rather than guessing.
          const tf = await crestTwoFactorState(
            res.data && res.data.user ? res.data.user.id : null,
          );
          if (tf.error) {
            showToast(
              "We could not read your security settings. Please try again.",
              true,
            );
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
          }
          if (tf.enabled) {
            await beginTwoFactor(email);
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
          }

          window.crestUser = res.data && res.data.user ? res.data.user : null;
          btn.style.background = "linear-gradient(135deg, #10B981, #059669)";
          btn.innerHTML =
            '<span class="auth-btn-circle-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span> Authentication Complete';
          redirectAfterAuth();
        }
      } catch (err) {
        showToast(err.message || "An error occurred.", true);
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  // Signup form submit
  var formSignup = document.getElementById("crest-form-signup");
  if (formSignup) {
    formSignup.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("crest-signup-name").value.trim();
      const email = document.getElementById("crest-signup-email").value.trim();
      const phone = document.getElementById("crest-signup-phone")
        ? document.getElementById("crest-signup-phone").value.trim()
        : "";
      const pass = document.getElementById("crest-signup-pass").value;
      const passConfirm = document.getElementById("crest-signup-pass-confirm")
        ? document.getElementById("crest-signup-pass-confirm").value
        : "";
      const pkg = document.getElementById("crest-signup-package")
        ? document.getElementById("crest-signup-package").value
        : "Level 1 Package (Starter)";

      if (!name || !email || !phone || !pass) {
        showToast("Please fill in all registration fields.");
        return;
      }
      if (pass.length < 6) {
        showToast("Password must be at least 6 characters.");
        return;
      }
      if (passConfirm && pass !== passConfirm) {
        showToast("Passwords do not match. Please re-enter.");
        return;
      }

      const btn = document.getElementById("crest-signup-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Creating Account...";

      try {
        const res =
          typeof crestSignUp === "function"
            ? await crestSignUp(email, pass, name, phone, pkg)
            : {
                success: false,
                error: "Auth service unavailable. Please refresh the page.",
              };
        if (!res.success) {
          showToast(res.error || "Signup failed.");
          btn.disabled = false;
          btn.textContent = originalText;
        } else if (res.needsConfirmation) {
          showToast(
            "Account created! Check your email to confirm, then log in.",
          );
          btn.disabled = false;
          btn.textContent = originalText;
          setTimeout(() => {
            const le = document.getElementById("crest-login-email");
            if (le) le.value = email;
            switchTab("login");
          }, 1800);
        } else {
          showToast("Account created! Opening your dashboard...");
          setTimeout(redirectAfterAuth, 800);
        }
      } catch (err) {
        showToast(err.message || "An error occurred.");
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // Forgot password form submit
  var formForgot = document.getElementById("crest-form-forgot");
  if (formForgot) {
    formForgot.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("crest-forgot-email").value.trim();
      if (!email) {
        showToast("Please enter your email address.");
        return;
      }

      const btn = document.getElementById("crest-forgot-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending...";

      try {
        const res =
          typeof crestResetPassword === "function"
            ? await crestResetPassword(email)
            : { success: false, error: "Auth service unavailable." };
        if (!res.success) {
          showToast(res.error || "Failed to send reset email.");
          btn.disabled = false;
          btn.textContent = originalText;
        } else {
          showToast(
            "Reset email sent! Check your inbox for the recovery link.",
          );
          btn.disabled = false;
          btn.textContent = originalText;
          setTimeout(() => switchTab("login"), 3000);
        }
      } catch (err) {
        showToast(err.message || "An error occurred.");
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // Reset password (new password) form submit
  var formReset = document.getElementById("crest-form-reset");
  if (formReset) {
    formReset.addEventListener("submit", async function (e) {
      e.preventDefault();
      const newPass = document.getElementById("crest-reset-pass").value;
      if (!newPass || newPass.length < 6) {
        showToast("Password must be at least 6 characters.");
        return;
      }

      const btn = document.getElementById("crest-reset-submit");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Updating Password...";

      try {
        if (!window.supabaseClient)
          throw new Error("Supabase client unavailable.");
        const { error } = await window.supabaseClient.auth.updateUser({
          password: newPass,
        });
        if (error) {
          showToast(error.message || "Password update failed.");
          btn.disabled = false;
          btn.textContent = originalText;
        } else {
          showToast("Password updated successfully! Logging you in...");
          setTimeout(redirectAfterAuth, 1200);
        }
      } catch (err) {
        showToast(err.message || "An error occurred.");
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // Keyboard: Escape to close
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      closeOverlay();
      document.removeEventListener("keydown", escHandler);
    }
  });
})();
