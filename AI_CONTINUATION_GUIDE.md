# Crest Wealth - AI Continuation & Architecture Guide

> **For any AI Assistant continuing this work**:  
> Read this document first. It explains the entire architecture, how the authentication and database systems work, all fixes completed so far, and the exact roadmap for remaining work.

---

## 1. Project Overview & Architecture

- **Project Type**: Static Multi-Page Wealth Management & Investment Platform (Vanilla HTML5, CSS3, ES6 JavaScript).
- **Backend / Database**: Supabase (PostgreSQL + Auth + Storage).
  - Supabase Project URL: `https://panxaqueawnqrebikwvb.supabase.co`
  - Anon Key: Defined in [supabase.js](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/supabase.js).
- **Directory Structure**:
  - `index/`: Homepage (`index.html`, `index.css`, `index.js`).
  - `dashboard/`: Client dashboard (`dashboard.html`, `dashboard.css`, `dashboard.js`).
  - `admin/`: Admin Observatory panel (`admin.html`, `admin.css`, `admin.js`).
  - Subpages: `about/`, `accounts/`, `investments/`, `academy/`, `pricing/`, `security/`, `support/`, `careers/`, `legal/`, `error_404/`.
  - Shared Core:
    - [shared-utils.js](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/shared-utils.js): Shared authentication helpers, API keys, nav state toggles, and delegated click listeners.
    - [auth-guard.js](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/auth-guard.js): Client-side authentication modal overlay (Log In, Get Started, Demo mode, Password toggle).
    - [supabase.js](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/supabase.js): Initializes `window.supabaseClient`.

---

## 2. Authentication & Data Flow

### A. How Sign In & Sign Up Work
1. Any click on `.btn-sign-in`, `.btn-get-started`, or elements with `data-modal="signin"` / `data-modal="signup"` is caught by a **capture-phase delegated listener** in `shared-utils.js`.
2. It dynamically loads `auth-guard.js` with `window.crestAuthDefaultTab = 'login'` or `'signup'`.
3. The auth card renders as a responsive modal:
   - **Log In Form**: Calls `crestSignIn(email, password)` which calls `supabase.auth.signInWithPassword()`.
   - **Get Started Form**: Calls `crestSignUp(email, password, fullName)` which calls `supabase.auth.signUp()`.
   - **Demo Mode**: Clicking "Explore Demo Dashboard" logs in as `{ id: 'demo_investor', email: 'demo@crestwealth.com' }` and opens the dashboard without touching the database.
4. Email Confirmation handling:
   - Supabase project currently has Email Confirmation enabled.
   - If a new user signs up, Supabase returns a user with no session. `shared-utils.js` detects `!data.session` and informs the user to check their inbox, automatically pre-filling their email in the Log In tab.

### B. How the Dashboard Works
1. `dashboard.html` loads `dashboard.js`.
2. `supabaseAuthGuard` in `dashboard.js` checks:
   - Valid Supabase session via `window.supabaseClient.auth.getSession()`.
   - OR a valid demo user (`id.startsWith('demo_')`).
   - If neither exists, it safely redirects to `../index/index.html#signin`.
3. When authenticated, it syncs profile details from the `profiles` table:
   - User initials, full name, email.
   - `cash_balance` from `profiles` row.

### C. How the Admin Panel Works
1. `admin.html` loads `admin.js`.
2. Admin guard checks `profiles.is_admin === true`.
3. Stores and reads real-time transactions via `crest_withdrawals`, `crest_deposits`, `crest_user_balance`, and `crest_tasks_config`.
4. When an admin confirms a deposit in `admin.js`, it now credits `crest_user_balance` and updates `profiles.cash_balance` in Supabase.

---

## 3. Fixes Completed in This Session

1. **Repaired Broken "Get Started" & "Sign In" Buttons**:
   - Fixed unescaped backtick syntax error in `auth-guard.js` template literal that had completely crashed script parsing.
   - Implemented capture-phase delegated click listeners in `shared-utils.js` so clicking buttons instantly opens the modal without waiting 3 seconds.
   - Fixed page hiding bug (`document.documentElement.style.visibility = 'hidden'`) during dynamic loads so the page does not flash or disappear.
2. **Mobile Responsiveness**:
   - `auth-guard.js`: Modal card now floats responsively on mobile devices with `16px` padding and rounded corners instead of sticking awkwardly to the bottom.
   - `index.css`: Sign In button was previously hidden on mobile (`max-width: 768px`). Re-enabled a compact Sign In button in the mobile navbar alongside Get Started.
3. **Database Integration & Safety**:
   - Removed fake fallback login/signup mocks in `shared-utils.js`. Only authentic Supabase auth operations are accepted.
   - Protected dashboard from forged localStorage entries: only real Supabase sessions or verified `demo_` IDs are admitted.
   - Allowed demo mode to function properly on the dashboard by adding `isDemoUser` support to `auth-guard.js`.
   - Fixed URL hash routing: entering `index.html#signin` or `#signup` automatically opens the respective modal on page load and on `hashchange`.
4. **Subpage Script & CSP Alignment**:
   - Added Supabase CDN and `supabase.js` to all subpages (`support.html`, `security.html`, `legal/privacy.html`, `legal/terms.html`, `legal/cookies.html`, `error_404/404.html`).
   - Expanded Content Security Policy (`connect-src`) across all HTML pages to allow AlphaVantage, CoinGecko, CoinCap, ExchangeRate API, AllOrigins, and Supabase REST/WebSocket connections.
   - Normalized branding from `CAPITAL` to `WEALTH` across logos.
   - Removed broken anchor links (`#leadership`, `#calculator`, `#guides`).
   - Fixed legacy `novara_*` keys in `admin.js` to use `crest_*` keys.

---

## 4. Supabase Database Setup & Production Architecture

The updated SQL schema file [supabase-schema.sql](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/supabase-schema.sql) is production-grade, secure, and idempotent.

### What is in `supabase-schema.sql`:
1. **Non-Recursive Admin Evaluation**:
   - `public.is_admin()` helper function with `SECURITY DEFINER` and `STABLE`. It completely prevents PostgreSQL `"infinite recursion detected in policy for relation profiles"` errors when evaluating admin RLS policies.
2. **Tables**:
   - `public.profiles`: Stores user identities, roles, `cash_balance`, `invested_balance`, and `kyc_status`.
   - `public.deposits`: Tracks deposit amounts, methods, reference IDs, and statuses (`Pending`, `Confirmed`, `Rejected`).
   - `public.withdrawals`: Tracks withdrawal requests, destination bank accounts, and statuses (`Pending`, `Approved`, `Rejected`).
   - `public.transactions`: Complete immutable financial audit log (`deposit`, `withdrawal`, `investment`, `dividend`, `adjustment`).
   - `public.user_investments`: Stores active user portfolio holdings (Crest Lock, High-Yield Stash, Stocks, Dollar Vault).
   - `public.notifications`: In-app transaction alerts and system notifications for users.
   - `public.user_tasks`: Tracks user task completions (KYC, BVN, phone verification).
3. **Automated Security & Field Guards**:
   - `on_auth_user_created` trigger: Automatically creates/syncs a `public.profiles` row whenever a new user signs up in `auth.users`.
   - `tr_protect_profile_fields` trigger: Guarantees that ordinary users cannot elevate their role to `is_admin = TRUE` or tamper with their `cash_balance` / `invested_balance` via client-side updates.
4. **Atomic Financial Stored Procedures (RPCs)**:
   - `public.admin_confirm_deposit(deposit_id TEXT)`: Verifies admin identity, updates deposit status to `Confirmed`, atomically credits the user's `cash_balance`, and logs a completed transaction.
   - `public.request_withdrawal(amount, bank_name, account_number, account_name)`: Checks balance sufficiency, atomically deducts the user's cash balance, creates a pending withdrawal, and logs a pending transaction.
   - `public.admin_reject_withdrawal(withdrawal_id, reason)`: Rejects withdrawal and atomically refunds the deducted balance back to the user.
   - `public.admin_adjust_balance(target_user_id, amount_delta, reason)`: Secure admin balance adjustment with automatic audit logging.
5. **Performance & Realtime**:
   - Explicit indexes on foreign keys, email, statuses, and transaction timestamps.
   - Realtime replication enabled on `profiles`, `deposits`, `withdrawals`, and `transactions` via `supabase_realtime`.

### How to apply it:
1. Open your Supabase Dashboard: [https://supabase.com/dashboard/project/panxaqueawnqrebikwvb](https://supabase.com/dashboard/project/panxaqueawnqrebikwvb)
2. Go to **SQL Editor** in the left sidebar.
3. Copy and paste the entire contents of [supabase-schema.sql](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/supabase-schema.sql).
4. Click **Run**.

---

## 5. Next Steps for Any AI Continuing Work

1. **Email Confirmation Toggle (Optional)**:
   - If the user prefers instant login during testing without checking their inbox, guide them to disable "Confirm email" in Supabase:
     `Authentication -> Providers -> Email -> toggle Confirm email off`.
2. **Calling Atomic RPCs from Frontend**:
   - When an admin confirms a deposit in `admin.js`, call:
     ```javascript
     const { data, error } = await supabaseClient.rpc('admin_confirm_deposit', { deposit_id: d.id });
     ```
   - When a user submits a withdrawal in `dashboard.js`, call:
     ```javascript
     const { data, error } = await supabaseClient.rpc('request_withdrawal', {
       p_amount: amount,
       p_bank_name: bankName,
       p_account_number: accNum,
       p_account_name: accName
     });
     ```
3. **Forgot Password Modal**:
   - In `auth-guard.js`, add a "Forgot password?" tab/view that prompts for email and calls `crestResetPassword(email)`.
4. **Testing Instructions**:
   - Open `index/index.html` directly in any web browser, or right click and choose "Open with Live Server" in VS Code/Trae.
