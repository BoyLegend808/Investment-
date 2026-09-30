/**
 * Crest Wealth - Client-Side Authentication Guard (Supabase Edition)
 */
(async function () {
  // Hide body to prevent flash of protected content while checking auth
  document.documentElement.style.visibility = 'hidden';

  // Wait for Supabase to initialize (it's initialized on DOMContentLoaded in supabase.js)
  while (!window.supabaseClient) {
    await new Promise(r => setTimeout(r, 50));
  }

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  
  if (session) {
    // User is logged in, show page
    document.documentElement.style.visibility = '';
    return;
  }

  // Not logged in, show overlay but reveal body underneath so the overlay works
  document.documentElement.style.visibility = '';

  // ── Styles ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #crest-auth-overlay {
      position: fixed;
      inset: 0;
      background: rgba(7, 30, 20, 0.75);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      z-index: 99999;
      animation: crestFadeIn 0.25s ease;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 16px 12px;
      box-sizing: border-box;
    }
    @media (min-height: 680px) {
      #crest-auth-overlay { align-items: center; }
    }
    @keyframes crestFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    #crest-auth-box {
      background: #ffffff;
      border-radius: 20px;
      max-width: 480px;
      width: 100%;
      margin: auto;
      max-height: calc(100dvh - 24px);
      max-height: calc(100vh - 24px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0,0,0,0.35);
      overflow: hidden;
      animation: crestSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
    }
    @keyframes crestSlideUp {
      from { transform: translateY(40px) scale(0.95); opacity: 0; }
      to   { transform: translateY(0) scale(1);       opacity: 1; }
    }
    #crest-auth-close {
      position: absolute;
      top: 14px; right: 14px;
      width: 36px; height: 36px;
      border-radius: 50%;
      border: none;
      background: #ffffff;
      cursor: pointer;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 36px;
      text-align: center;
      color: #064E3B;
      z-index: 30;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: transform 0.2s, background 0.2s;
    }
    #crest-auth-close:hover { transform: scale(1.08); background: #f8fafc; }
    #crest-auth-header {
      background: linear-gradient(135deg, #064E3B 0%, #059669 100%);
      padding: 24px 24px 18px 24px;
      color: #fff;
      position: relative;
      flex-shrink: 0;
    }
    #crest-auth-header h3 {
      margin: 0 0 6px;
      font-size: 1.35rem;
      font-weight: 700;
      padding-right: 36px;
    }
    #crest-auth-header p {
      margin: 0;
      opacity: 0.85;
      font-size: 0.85rem;
    }
    #crest-auth-body {
      padding: 20px 24px 24px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      max-height: calc(100dvh - 110px);
      max-height: calc(100vh - 110px);
    }

    .crest-form-group { margin-bottom: 18px; }
    .crest-form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .crest-form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      background: #f8fafc;
      color: #1e293b;
    }
    .crest-form-input:focus { border-color: #059669; background: #fff; }
    #crest-auth-submit, #crest-signup-submit {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #064E3B, #059669);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      margin-top: 6px;
    }
    #crest-auth-submit:hover, #crest-signup-submit:hover { opacity: 0.92; transform: translateY(-1px); }
    #crest-auth-submit:disabled, #crest-signup-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    #crest-auth-footer {
      text-align: center;
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 16px;
    }
    #crest-auth-footer a { color: #059669; font-weight: 700; cursor: pointer; text-decoration: none; }
    #crest-auth-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #fff;
      padding: 12px 24px;
      border-radius: 50px;
      font-size: 0.88rem;
      font-weight: 500;
      z-index: 100000;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    #crest-auth-toast.show { opacity: 1; }
    #crest-auth-tabs {
      display: flex;
      gap: 0;
      margin-bottom: 24px;
      border-radius: 10px;
      overflow: hidden;
      border: 1.5px solid #e2e8f0;
    }
    .crest-tab-btn {
      flex: 1;
      padding: 10px;
      border: none;
      background: #f8fafc;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      color: #64748b;
      transition: background 0.2s, color 0.2s;
    }
    .crest-tab-btn.active {
      background: #064E3B;
      color: #fff;
    }
    .crest-tab-panel { display: none; }
    .crest-tab-panel.active { display: block; }
  `;
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────────────────────────────────────────
  // HTML
  const overlay = document.createElement('div');
  overlay.id = 'crest-auth-overlay';
  overlay.innerHTML = `
    <div id="crest-auth-box">
      <button id="crest-auth-close" title="Close">&times;</button>
      <div id="crest-auth-header">
        <h3>Account Portal</h3>
        <p>Log in or create a free account to access your portfolio.</p>
      </div>
      <div id="crest-auth-body">
        <div id="crest-auth-tabs">
          <button class="crest-tab-btn active" data-tab="signup">Create Account</button>
          <button class="crest-tab-btn" data-tab="login">Log In</button>
        </div>

        <!-- SIGNUP PANEL -->
        <div class="crest-tab-panel active" id="crest-panel-signup">
          <form id="crest-form-signup" novalidate>
            <div class="crest-form-group">
              <label class="crest-form-label">Full Name</label>
              <input type="text" class="crest-form-input" id="crest-signup-name" placeholder="e.g. Babatunde Adeyemi" required>
            </div>
            <div class="crest-form-group">
              <label class="crest-form-label">Email Address</label>
              <input type="email" class="crest-form-input" id="crest-signup-email" placeholder="babatunde@example.com" required>
            </div>
            <div class="crest-form-group" style="position: relative;">
              <label class="crest-form-label">Password</label>
              <input type="password" class="crest-form-input" id="crest-signup-pass" placeholder="Minimum 6 characters" required minlength="6" autocomplete="new-password" style="padding-right: 42px;">
              <button type="button" onclick="togglePasswordVisibility('crest-signup-pass', this)" style="position: absolute; right: 12px; top: 32px; background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; color: #64748b;" aria-label="Toggle password visibility"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
            <button type="submit" id="crest-signup-submit">
              Create Free Account
            </button>
            <button type="button" id="crest-demo-btn" style="width:100%;padding:10px;background:transparent;color:#059669;border:1.5px dashed #059669;border-radius:10px;font-size:0.85rem;font-weight:600;cursor:pointer;margin-top:12px;transition:background 0.2s;">
              Continue as Demo / Guest Investor &rarr;
            </button>
          </form>
          <div id="crest-auth-footer" style="margin-top: 14px; text-align: center; font-size: 0.88rem; color: #64748b;">
            Have an account? <a id="crest-switch-login" style="color: #059669; font-weight: 600; cursor: pointer;">Log in &rarr;</a>
          </div>
        </div>

        <!-- LOGIN PANEL -->
        <div class="crest-tab-panel" id="crest-panel-login">
          <form id="crest-form-login" novalidate>
            <div class="crest-form-group">
              <label class="crest-form-label">Email Address</label>
              <input type="email" class="crest-form-input" id="crest-login-email" placeholder="yourname@email.com" required>
            </div>
            <div class="crest-form-group" style="position: relative;">
              <label class="crest-form-label">Password</label>
              <input type="password" class="crest-form-input" id="crest-login-pass" placeholder="••••••••" required minlength="6" autocomplete="current-password" style="padding-right: 42px;">
              <button type="button" onclick="togglePasswordVisibility('crest-login-pass', this)" style="position: absolute; right: 12px; top: 32px; background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; color: #64748b;" aria-label="Toggle password visibility"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
            <button type="submit" id="crest-auth-submit">Log In to Crest Wealth</button>
          </form>
          <div id="crest-auth-footer" style="margin-top: 14px; text-align: center; font-size: 0.88rem; color: #64748b;">
            No account? <a id="crest-switch-signup" style="color: #059669; font-weight: 600; cursor: pointer;">Open one free &rarr;</a>
          </div>
        </div>

      </div>
    </div>
    <div id="crest-auth-toast"></div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById('crest-auth-toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  function closeOverlay() {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s';
    setTimeout(() => {
      overlay.remove();
      style.remove();
      document.body.style.overflow = '';
    }, 220);
  }

  function switchTab(tab) {
    document.querySelectorAll('.crest-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('crest-panel-login').classList.toggle('active', tab === 'login');
    document.getElementById('crest-panel-signup').classList.toggle('active', tab === 'signup');
  }

  function redirectAfterAuth() {
    showToast('Authentication successful! Opening dashboard...');
    setTimeout(() => {
      closeOverlay();
      var path = window.location.pathname;
      var isSubDir = path.includes('/index/') || path.includes('/accounts/') ||
                     path.includes('/investments/') || path.includes('/academy/') ||
                     path.includes('/pricing/') || path.includes('/security/') ||
                     path.includes('/about/') || path.includes('/careers/') ||
                     path.includes('/support/') || path.includes('/legal/');
      window.location.href = isSubDir ? '../dashboard/dashboard.html' : 'dashboard/dashboard.html';
    }, 900);
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  var closeBtn = document.getElementById('crest-auth-close'); if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

  var switchSignup = document.getElementById('crest-switch-signup'); if (switchSignup) switchSignup.addEventListener('click', () => switchTab('signup'));
  var switchLogin = document.getElementById('crest-switch-login'); if (switchLogin) switchLogin.addEventListener('click', () => switchTab('login'));

  var demoBtn = document.getElementById('crest-demo-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      showToast('Continuing as Demo Investor...');
      const demoUser = { id: 'demo_investor', email: 'demo@crestwealth.com', user_metadata: { full_name: 'Demo Investor' } };
      localStorage.setItem('crest_current_user', JSON.stringify(demoUser));
      setTimeout(redirectAfterAuth, 400);
    });
  }

  document.querySelectorAll('.crest-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Login form submit
  var formLogin = document.getElementById('crest-form-login'); if (formLogin) formLogin.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('crest-login-email').value.trim();
    const pass  = document.getElementById('crest-login-pass').value;
    if (!email || !pass) { showToast('Please fill in all fields.'); return; }
    
    const btn = document.getElementById('crest-auth-submit');
    btn.disabled = true;
    btn.textContent = 'Authenticating...';

    const res = typeof crestSignIn === 'function' ? await crestSignIn(email, pass) : { success: true };

    if (!res.success) {
      showToast(res.error);
      btn.disabled = false;
      btn.textContent = 'Log In to Crest Wealth';
    } else {
      redirectAfterAuth();
    }
  });

  // Signup form submit
  document.getElementById('crest-form-signup').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name  = document.getElementById('crest-signup-name').value.trim();
    const email = document.getElementById('crest-signup-email').value.trim();
    const pass = document.getElementById('crest-signup-pass').value;
    if (!name || !email || !pass) { showToast('Please fill in all fields.'); return; }
    
    const btn = document.getElementById('crest-signup-submit');
    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    const res = typeof crestSignUp === 'function' ? await crestSignUp(email, pass, name) : { success: true };

    if (!res.success) {
      showToast(res.error);
      btn.disabled = false;
      btn.textContent = 'Create Free Account';
    } else {
      showToast('Account created! Opening your dashboard...');
      setTimeout(redirectAfterAuth, 800);
    }
  });

  // Keyboard: Escape to close
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', escHandler); }
  });

})();

