# Crest Wealth Full Project Fix - Implementation Tasks

**Created:** 2026-09-29
**Spec:** [spec.md](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/.trae/specs/2026-09-29_crest-wealth-fix-all/spec.md)
**Status:** Plan Phase

---

## Task Priority Legend
🔴 = Critical (blocking / security / broken site)
🟠 = High (user-visible bugs / bad UX)
🟡 = Medium (SEO / maintainability / polish)
🔵 = Low (nice-to-have / future-proofing)

---

## Phase 1 — Critical & High Priority (Must Do First)

---

### Task 1: 🔴 DELETE dangerous/suspicious file (Issue 5)
**Priority:** 🔴 Critical
**Acceptance Criteria:** AC-6
**Files affected:** (deletion only)
**Description:** Delete DOWNLOAD INI.txt from project root immediately. Contains piracy/malware links.

**Test Requirements (TR):**
- TR-1.1 (rule): `File DOWNLOAD INI.txt` does NOT exist at project root after task completion (verify with LS/Glob)

**Blocked By:** None

**Status:** pending

---

### Task 2: 🔴 Fix ALL broken favicon paths from `../../` to `../` (Issue 3)
**Priority:** 🔴 Critical
**Acceptance Criteria:** AC-4
**Files affected (12 files):**
- about/about.html
- academy/academy.html
- accounts/accounts.html
- careers/careers.html
- index/index.html
- investments/investments.html
- legal/privacy.html
- legal/terms.html
- pricing/pricing.html
- security/security.html
- support/support.html
- error_404/404.html

**Description:** In every file above, find line with `href="../../favicon.svg"` and replace with `href="../favicon.svg"`.

Note: admin/admin.html is already correct (uses `../favicon.svg`), skip.

**Test Requirements (TR):**
- TR-2.1 (rule): Grep for `href="../../favicon.svg"` across all HTML files → 0 matches
- TR-2.2 (rule): Grep for `href="../favicon.svg"` across subfolder pages → 13 matches (12 fixed + admin already correct)
- TR-2.3 (rule): Root-level favicon links (`href="favicon.svg"`) remain unchanged at 3 matches (index.html, admin.html, dashboard.html)

**Blocked By:** None

**Status:** pending

---

### Task 3: 🔴 Fix broken ticker prices with missing leading digits (Issue 4)
**Priority:** 🔴 Critical
**Acceptance Criteria:** AC-5
**Reference correct file:** investments/investments.html (lines 31-38 have CORRECT ticker values)
**Files affected (8 pages with broken tickers):**
1. index/index.html — lines 32-36
2. about/about.html — lines 35-39 (only the first 5, about has additional correct ones after)
3. accounts/accounts.html — lines 32-36
4. academy/academy.html — lines 32-36
5. careers/careers.html — lines 31-36
6. pricing/pricing.html — lines 31-36
7. support/support.html — lines 31-36
8. security/security.html — lines 31-36

**Replace pattern:**
- `AAPL</span> <span class="ticker-price">.40</span>` → `AAPL</span> <span class="ticker-price">$228.40</span>`
- `MSFT</span> <span class="ticker-price">.20</span>` → `MSFT</span> <span class="ticker-price">$415.20</span>`
- `TSLA</span> <span class="ticker-price">.50</span>` → `TSLA</span> <span class="ticker-price">$235.50</span>`
- `BTC/USD</span> <span class="ticker-price">,520.00</span>` → `BTC/USD</span> <span class="ticker-price">$76,520.00</span>`
- `ETH/USD</span> <span class="ticker-price">,432.00</span>` → `ETH/USD</span> <span class="ticker-price">$2,432.00</span>`

S&P 500, USD/EUR, USD/GBP are correct — leave alone.

**Test Requirements (TR):**
- TR-3.1 (rule): Grep regex `ticker-price">[^$&0-9]` on all 8 pages → 0 matches (no ticker starts with dot or comma)
- TR-3.2 (rule): Grep for `ticker-price">.` (starts with period) on all HTML → 0 matches
- TR-3.3 (rule): Grep for `ticker-price">,</` (starts with comma) on all HTML → 0 matches

**Blocked By:** None

**Status:** pending

---

### Task 4: 🔴 Add auth-guard + auth checks to Dashboard (Issue 1, part 1)
**Priority:** 🔴 Critical
**Acceptance Criteria:** AC-2
**Files affected:**
- dashboard/dashboard.html (add script tag)
- dashboard/dashboard.js (add auth check at TOP of file)

**Description:**
1. In dashboard/dashboard.html `<head>`, add: `<script src="../auth-guard.js" defer></script>` AFTER any CSS imports (so it loads before dashboard.js)
2. In dashboard/dashboard.js, at the VERY TOP (before any other code), add auth redirect check:
```
(function() {
  const auth = localStorage.getItem('isAuthenticated');
  if (auth !== 'true' && !window.location.search.includes('bypass')) {
    document.documentElement.style.display = 'none';
    // auth-guard.js will also trigger the modal. We just hide content as backup.
  }
})();
```
3. Later, after the Novara→Crest localStorage rename in Task 5, this will be migrated to use the new crest_* keys + eventual Supabase.

**Test Requirements (TR):**
- TR-4.1 (rule): dashboard/dashboard.html contains `<script src="../auth-guard.js"` (grep)
- TR-4.2 (rule): dashboard/dashboard.js top lines contain `isAuthenticated` guard
- TR-4.3 (rubric): Clear localStorage for site → open dashboard.html directly in browser → should see auth modal, NOT dashboard content (score: pass=modal shows; fail=shows dashboard)

**Blocked By:** None

**Status:** pending

---

### Task 5: 🔴 Add auth-guard + auth checks to Admin (Issue 1, part 2)
**Priority:** 🔴 Critical
**Acceptance Criteria:** AC-3
**Files affected:**
- admin/admin.html (add script tag)
- admin/admin.js (add auth check at TOP of file)

**Description:**
1. In admin/admin.html `<head>`, add: `<script src="../auth-guard.js" defer></script>`
2. In admin/admin.js, at the VERY TOP: add same `isAuthenticated` guard as Task 4 (hide body if not authed).

**Test Requirements (TR):**
- TR-5.1 (rule): admin/admin.html contains `<script src="../auth-guard.js"` (grep)
- TR-5.2 (rule): admin/admin.js top lines contain `isAuthenticated` guard
- TR-5.3 (rubric): Clear localStorage → open admin/admin.html → should see auth modal, NOT admin content (pass/fail)

**Blocked By:** None

**Status:** pending

---

### Task 6: 🔴 Massive Rebrand — Novara → Crest Wealth in DASHBOARD (Issue 2, part 1)
**Priority:** 🔴 Critical
**Acceptance Criteria:** AC-1
**Files affected:**
- dashboard/dashboard.html
- dashboard/dashboard.js

**Description:** Replace ALL occurrences of "Novara" and "novara" with Crest Wealth equivalents.

**In dashboard/dashboard.html:**
- Title tag: "Novara Capital — Investor Portal" → "Crest Wealth — Investor Portal"
- Line 496: "Novara Stash" → "Crest Stash"
- Line 506, 863, 869, 876 account names: "Novara Capital / Adaeze Okonkwo" → "Crest Wealth / Adaeze Okonkwo"
- Line 768 referral link: "novaracapital.com/ref/ADAEZE2026" → "crestwealth.com/ref/ADAEZE2026"
- Line 769 copy link URL: "https://novaracapital.com/ref/ADAEZE2026" → "https://crestwealth.com/ref/ADAEZE2026"
- Line 772 WhatsApp URL: all "Novara Capital" → "Crest Wealth", "novaracapital.com" → "crestwealth.com"
- Line 773 Twitter/Intent URL: all "Novara Capital" → "Crest Wealth", "novaracapital.com" → "crestwealth.com"
- Line 863: "Novara VIP Concierge" → "Crest Wealth VIP Concierge"
- Line 869: `t.me/NovaraCapitalVIP` → `t.me/CrestWealthVIP`
- Line 876 WhatsApp text: "Novara Support" → "Crest Wealth Support"

**In dashboard/dashboard.js:**
- Lines 17, 18, 19: task title/desc/steps: all "Novara" → "Crest Wealth"
- Line 19-23: x.com link: `@NovaraCapital` → `@CrestWealthNG` ; `x.com/NovaraCapital` → `x.com/CrestWealthNG`
- Lines 30-34: YouTube task desc + URL: `Novara Capital` → `Crest Wealth` ; `youtube.com/@NovaraCapital` → `youtube.com/@CrestWealth`
- Lines 41-45: Instagram task desc + URL: `@NovaraCapitalNG` → `@CrestWealthNG` ; `instagram.com/NovaraCapitalNG` → `instagram.com/CrestWealthNG`
- Line 73 invite task: "Invite 2 Friends to Novara" → "Invite 2 Friends to Crest Wealth"
- Line 78 WhatsApp share text: every "Novara Capital" → "Crest Wealth" ; "novaracapital.com" → "crestwealth.com"
- **ALL localStorage keys in dashboard.js:** rename every `novara_*` → `crest_*`:
  - `novara_tasks_config` → `crest_tasks_config`
  - `novara_user_tasks` → `crest_user_tasks`
  - `novara_user_balance` → `crest_user_balance`
  - `novara_deposits` → `crest_deposits`
  - `novara_daily_streak` → `crest_daily_streak`
  - `novara_withdrawals` → `crest_withdrawals`
- Lines 850-878 deposit account names (5 lines): "Novara Capital / Adaeze Okonkwo" → "Crest Wealth / Adaeze Okonkwo"
- Lines 971, 977: "Novara Stash (11.5% p.a.)" → "Crest Stash (11.5% p.a.)"
- Storage event listeners at bottom: all `novara_*` → `crest_*`

**IMPORTANT MIGRATION NOTE:** Add a localStorage migration block at the top of dashboard.js (after the auth guard from Task 4) that copies old novara_* keys to crest_* keys if they exist. This prevents existing test users from losing data:
```
// Migrate old localStorage keys
(function migrateStorage() {
  const migrations = [
    ['novara_tasks_config','crest_tasks_config'],
    ['novara_user_tasks','crest_user_tasks'],
    ['novara_user_balance','crest_user_balance'],
    ['novara_deposits','crest_deposits'],
    ['novara_daily_streak','crest_daily_streak'],
    ['novara_withdrawals','crest_withdrawals'],
  ];
  migrations.forEach(([oldK,newK]) => {
    const v = localStorage.getItem(oldK);
    if (v && !localStorage.getItem(newK)) localStorage.setItem(newK, v);
  });
})();
```

**Test Requirements (TR):**
- TR-6.1 (rule): grep -i "novara" dashboard/dashboard.html → 0 matches
- TR-6.2 (rule): grep -i "novara" dashboard/dashboard.js → 0 matches (except maybe in the migration code comment — acceptable)
- TR-6.3 (rule): grep "crest_" dashboard/dashboard.js → all 6 storage keys present with crest_ prefix
- TR-6.4 (rule): migration block exists at top of dashboard.js
- TR-6.5 (rubric): page renders with "Crest Wealth" visible in header/title (score 1-5, ≥4 = no visible Novara anywhere)

**Blocked By:** Task 4 (auth guard added first, then rebrand on top)

**Status:** pending

---

### Task 7: 🔴 Massive Rebrand — Novara → Crest Wealth in ADMIN (Issue 2, part 2)
**Priority:** 🔴 Critical
**Acceptance Criteria:** AC-1
**Files affected:**
- admin/admin.html
- admin/admin.js

**Description:** Same pattern as Task 6 but for admin pages.

**In admin/admin.html:**
- Meta description line 6: all "Novara Capital" → "Crest Wealth"
- Title line 7: "Admin Observatory — Novara Capital" → "Admin Observatory — Crest Wealth"
- Sidebar brand line 29: "NOVARA" → "CREST"
- Sidebar badge line 30: Keep "ADMIN OBSERVATORY"
- Input placeholder line 538: "Follow Novara on X" → "Follow Crest Wealth on X"
- Input placeholder line 589: "https://t.me/novaracapital" → "https://t.me/crestwealth"
- Brand title span: "NOVARA" → "CREST" (might appear more than once — find all)

**In admin/admin.js:**
- Lines 17-21 (Twitter task): all "Novara" → "Crest Wealth" ; `@NovaraCapital` → `@CrestWealthNG`
- Lines 28-31 (YouTube task): all "Novara" → "Crest Wealth" ; `@NovaraCapital` → `@CrestWealth`
- Lines 38-41 (Instagram task): `@NovaraCapitalNG` → `@CrestWealthNG`
- **ALL localStorage keys in admin.js:** rename `novara_*` → `crest_*`:
  - `novara_tasks_config` → `crest_tasks_config`
  - `novara_withdrawals` → `crest_withdrawals`
  - `novara_deposits` → `crest_deposits`
  - `novara_user_tasks` → `crest_user_tasks` (line 443 removal)
  - `novara_user_balance` → `crest_user_balance`
- Storage event listeners at bottom of file: same rename

**Add migration block to TOP of admin.js (after auth guard from Task 5):** same 6-key migration as dashboard.

**Test Requirements (TR):**
- TR-7.1 (rule): grep -i "novara" admin/admin.html → 0 matches
- TR-7.2 (rule): grep -i "novara" admin/admin.js → 0 matches
- TR-7.3 (rule): grep "crest_" admin/admin.js → all 4 storage keys present
- TR-7.4 (rule): migration block exists at top of admin.js
- TR-7.5 (rubric): page renders, sidebar brand says "CREST" not "NOVARA" (score ≥4)

**Blocked By:** Task 5 (auth guard added first)

**Status:** pending

---

### Task 8: 🟠 Rebrand — Root Redirect Pages (index.html, admin.html, dashboard.html) (Issue 2, part 3)
**Priority:** 🟠 High
**Acceptance Criteria:** AC-1
**Files affected:**
- index.html (root redirect page — NOT the one in index/ folder)
- admin.html (root redirect page — NOT the one in admin/ folder)
- dashboard.html (root redirect page — NOT the one in dashboard/ folder)

**Description:**
All three are thin `<meta http-equiv="refresh">` redirect pages.

**index.html root:**
- Line 7: `<title>Novara Capital — Wealth Management ...` → `<title>Crest Wealth — Wealth Management & Investment Platform`
- Line 14 redirect body: "Novara Capital" → "Crest Wealth" (link text and anchor text)

**admin.html root:**
- Line 7: `<title>Novara Capital — Admin Observatory` → `<title>Crest Wealth — Admin Observatory`
- Line 14: "Admin Observatory" → keep, but if any "Novara" exists, change to "Crest Wealth"

**dashboard.html root:**
- Line 7: `<title>Novara Capital — Dashboard` → `<title>Crest Wealth — Dashboard`
- Line 14: "Novara Capital Dashboard" → "Crest Wealth Dashboard"

**Test Requirements (TR):**
- TR-8.1 (rule): grep -i "novara" index.html admin.html dashboard.html → 0 matches
- TR-8.2 (rule): title tags contain "Crest Wealth" in all 3

**Blocked By:** None

**Status:** pending

---

### Task 9: 🟠 Fix index/index.html — Duplicate favicon + Duplicate CSS import (Issues 7 + 8)
**Priority:** 🟠 High
**Acceptance Criteria:** AC-7, AC-8
**Files affected:** index/index.html

**Description:**
Current problems:
- Line 7: `<link rel="icon" type="image/svg+xml" href="../../favicon.svg">` — BROKEN PATH (also Task 2 will have already fixed path to `../` but we're removing entirely, see below)
- Line 21: `<link rel="stylesheet" href="index.css">` — FIRST import (KEEP)
- Line 22: `<link rel="icon" href="data:image/svg+xml,...">` — INLINE SVG (THIS IS THE GOOD ONE — KEEP)
- Line 24: `<link rel="stylesheet" href="index.css">` — DUPLICATE of line 21 (DELETE)

**Plan:**
1. DELETE line 7 entirely (the favicon with wrong path — we have the inline SVG one at line 22 which is better)
2. DELETE line 24 — the duplicate index.css link
3. Line 21 and 22 remain as the ONLY favicon and CSS declarations.

**Note:** After line 7 deletion, subsequent line numbers shift. When deleting line 24, we must look for the SECOND `<link rel="stylesheet" href="index.css">` (the one that appears after the inline SVG favicon).

**Test Requirements (TR):**
- TR-9.1 (rule): index/index.html grep `rel="stylesheet"` → exactly 1 match (NOT 2)
- TR-9.2 (rule): index/index.html grep `rel="icon"` → exactly 1 match (NOT 2)
- TR-9.3 (rule): index/index.html contains `data:image/svg+xml` favicon (the good inline one)
- TR-9.4 (rule): index/index.html does NOT contain `../../favicon.svg` (we removed that favicon tag entirely)

**Blocked By:** None

**Status:** pending

---

### Task 10: 🟠 Remove Duplicate CSS imports from all 7 other pages (Issue 7)
**Priority:** 🟠 High
**Acceptance Criteria:** AC-7
**Files affected (7 pages):**
1. academy/academy.html
2. accounts/accounts.html
3. careers/careers.html
4. investments/investments.html
5. pricing/pricing.html
6. security/security.html
7. support/support.html

**Description for each file:**
- Find the TWO `<link rel="stylesheet" href="XXX.css">` lines
- DELETE the SECOND occurrence (it's identical to the first — pure duplicate)
- KEEP the FIRST occurrence
- Example academy.html: line 21 = keep, line 24 = delete

**Test Requirements (TR):**
- TR-10.1 (rule): For each of the 7 files: grep `rel="stylesheet"` → exactly 1 match (0 duplicates)
- TR-10.2 (rule): Total across 7 files + index (task 9) = 8 files × 1 = 8 `rel="stylesheet"` matches for page CSS

**Blocked By:** None

**Status:** pending

---

### Task 11: 🟠 Remove 37 console.warn/error statements from ALL production JS (Issue 10)
**Priority:** 🟠 High
**Acceptance Criteria:** AC-9
**Files affected (12 files):**
about/about.js, academy/academy.js, accounts/accounts.js, careers/careers.js,
error_404/404.js, index/index.js, investments/investments.js, pricing/pricing.js,
security/security.js, support/support.js, legal/privacy.js, legal/terms.js

**Description in EACH file:**
Find and DELETE these THREE lines (they appear in identical form in every file — the "Alpha Vantage + ticker" error logging):
1. Line with: `console.warn('Alpha Vantage fetch failed:', e);`
2. Line with: `console.error("Failed to fetch ticker data", error);`
3. Line with: `console.error('Failed to parse cached data', e);`

DO NOT delete other console statements (if any exist). Only the three above.

Note: Line numbers per audit are approximately ~385, ~410, ~420 in each file (with minor +1/-1 variation between files). Search by string, not line number.

**Test Requirements (TR):**
- TR-11.1 (rule): grep `Alpha Vantage fetch failed` across all 12 files → 0 matches
- TR-11.2 (rule): grep `Failed to fetch ticker data` across all 12 files → 0 matches
- TR-11.3 (rule): grep `Failed to parse cached data` across all 12 files → 0 matches
- TR-11.4 (rule): console.warn/error total in production JS (exclude scratch/, exclude tools/, exclude apply_auth.js + rebrand.js which are utility scripts) → 0 matches

**Blocked By:** None

**Status:** pending

---

### Task 12: 🟠 Organize Utility Scripts — Create /tools folder (Issue 19)
**Priority:** 🟠 High
**Acceptance Criteria:** AC-14
**Files affected:** 19 file moves + 1 new folder

**Description:**
1. Create folder `tools/` at project root
2. Move THESE 19 root-level scripts into `tools/` folder (DO NOT modify scratch/ contents):
   - apply_auth.js
   - apply_auth.ps1
   - apply_auth.py
   - apply_full_footers.ps1
   - auth-guard.js — ← **DO NOT MOVE THIS ONE! It's referenced by HTML pages. STAYS AT ROOT.**
   - fix_dash.py
   - fix_dash2.py
   - fix_footers.ps1
   - fix_mangled.ps1
   - fix_ticker.ps1
   - fix_ticker.py
   - fix_wealth.ps1
   - make_global.ps1
   - make_global2.ps1
   - make_global3.ps1
   - make_global4.ps1
   - modify.ps1
   - rebrand.js
   - rebrand.ps1
   - update_cards.py
   - update_footers.py

Wait that's 20 candidates — but auth-guard.js stays (needed by HTML pages). So move 19 files.

**After moving files:**
- Update robots.txt: add `Disallow: /tools/` (prevent indexing of utility scripts)
- Update .gitignore: optional (probably keep them tracked), but at least document

**Test Requirements (TR):**
- TR-12.1 (rule): `tools/` folder exists and contains all 19 scripts (list via LS)
- TR-12.2 (rule): `auth-guard.js` still at project root (not in tools)
- TR-12.3 (rule): Root dir no longer contains `fix_*`, `apply_*`, `make_global*`, `modify.ps1`, `rebrand.*`, `update_*`
- TR-12.4 (rule): robots.txt contains line `Disallow: /tools/`

**Blocked By:** None

**Status:** pending

---

### Task 13: 🟠 Move "phone poster.jpg" to /assets/ (Issue 20)
**Priority:** 🟠 High
**Acceptance Criteria:** AC-15
**Files affected:** 1 file move

**Description:**
1. Move file `phone poster.jpg` from project root INTO `assets/phone poster.jpg`
2. Since no page references it anyway — no need to update any HTML refs

**Test Requirements (TR):**
- TR-13.1 (rule): assets/ directory listing includes "phone poster.jpg"
- TR-13.2 (rule): Project root directory listing DOES NOT include "phone poster.jpg"

**Blocked By:** None

**Status:** pending

---

### Task 14: 🟠 Hide scratch/ folder properly (Issue 18)
**Priority:** 🟠 High
**Acceptance Criteria:** AC-13
**Files affected:**
- .gitignore
- robots.txt

**Description:**
1. Add to `.gitignore` (append at end):
```
# Developer scratch / WIP folder (never deploy)
scratch/
```
2. Add to `robots.txt` (after other Disallow lines):
```
Disallow: /scratch/
```
Also add `Disallow: /tools/` if Task 12 hasn't already.

**Test Requirements (TR):**
- TR-14.1 (rule): .gitignore contains `scratch/` line
- TR-14.2 (rule): robots.txt contains `Disallow: /scratch/`
- TR-14.3 (rule): robots.txt contains `Disallow: /tools/` (redundancy check with task 12)

**Blocked By:** None

**Status:** pending

---

## Phase 2 — Medium Priority (SEO / Polish)

---

### Task 15: 🟡 Add Canonical URLs to ALL 15 HTML Pages (Issue 15)
**Priority:** 🟡 Medium
**Acceptance Criteria:** AC-10
**Files affected (15 pages total):**
1. index.html (root redirect) → `https://crestwealth.com/`
2. index/index.html → `https://crestwealth.com/index/index.html`
3. about/about.html → `https://crestwealth.com/about/about.html`
4. academy/academy.html → `https://crestwealth.com/academy/academy.html`
5. accounts/accounts.html → `https://crestwealth.com/accounts/accounts.html`
6. investments/investments.html → `https://crestwealth.com/investments/investments.html`
7. pricing/pricing.html → `https://crestwealth.com/pricing/pricing.html`
8. security/security.html → `https://crestwealth.com/security/security.html`
9. careers/careers.html → `https://crestwealth.com/careers/careers.html`
10. support/support.html → `https://crestwealth.com/support/support.html`
11. legal/privacy.html → `https://crestwealth.com/legal/privacy.html`
12. legal/terms.html → `https://crestwealth.com/legal/terms.html`
13. dashboard/dashboard.html → `https://crestwealth.com/dashboard/dashboard.html`
14. admin/admin.html → `https://crestwealth.com/admin/admin.html`
15. error_404/404.html → `https://crestwealth.com/error_404/404.html`

**Root redirect pages (admin.html, dashboard.html at root):** they are redirects only, still add canonical (point them to where they redirect to, or self).

**For each page:**
Add this line somewhere in the `<head>` section (after title, before other meta tags is fine):
```html
<link rel="canonical" href="FULL_URL_AS_LISTED_ABOVE">
```

**Test Requirements (TR):**
- TR-15.1 (rule): Total grep `rel="canonical"` across all HTML files = 15 matches (one per page)
- TR-15.2 (rule): No page has 0 canonical tags AND no page has 2+
- TR-15.3 (rule): Every canonical href starts with `https://crestwealth.com/`

**Blocked By:** None

**Status:** pending

---

### Task 16: 🟡 Generate og-image.png branded image (Issue 6)
**Priority:** 🟡 Medium
**Acceptance Criteria:** AC-7 (partial: og-image exists at root)
**Files affected:** (new asset creation only)

**Description:**
Use the text_to_image endpoint to generate a 1200x630px social share image for Crest Wealth.

**Image prompt:** "Professional social media banner for Crest Wealth, an investment platform. Modern design with dark forest green (#064E3B) and emerald green (#059669) gradient background, gold (#D4AF37) accent details. Clean minimal logo-like mark: a stylized three-layer pyramid/wealth building icon. Large text reads 'CREST WEALTH' in bold white. Subtitle text reads 'Goal-Based Investing & High-Yield Savings' in light green. No people. No text in other languages. Corporate financial aesthetic. Aspect ratio landscape 16:9 equivalent. High resolution."

**image_size parameter:** `landscape_16_9`

Result gets saved as `og-image.png` at the project root. (Note: The generator returns a URL; we need to download or save the file appropriately. If direct file save not possible, note workaround.)

**Test Requirements (TR):**
- TR-16.1 (rule): `og-image.png` exists at project root
- TR-16.2 (rubric): Image is branded with Crest Wealth colors and looks professional (score 1-5, threshold ≥4)

**Blocked By:** None

**Status:** pending

---

### Task 17: 🟡 Add Full Open Graph Tags to 5 Missing Pages (Issue 16)
**Priority:** 🟡 Medium
**Acceptance Criteria:** AC-11
**Files affected (5 pages missing OG tags):**
1. admin/admin.html
2. dashboard/dashboard.html
3. error_404/404.html
4. legal/privacy.html
5. legal/terms.html

**Description:**
For EACH of the 5 pages, add this block inside the `<head>` (after title, after canonical).

Template — replace {TITLE} and {DESC} and {CANONICAL_URL} per page:
```html
<!-- Open Graph / Social Share -->
<meta property="og:type" content="website">
<meta property="og:url" content="{CANONICAL_URL_FROM_TASK15}">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="https://crestwealth.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITLE}">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="https://crestwealth.com/og-image.png">
```

**Per-page content:**
- admin/admin.html:
  - TITLE = "Admin Observatory — Crest Wealth"
  - DESC = "Crest Wealth administrative panel for liquidity management, user withdrawal verification, and investment compliance oversight."
  - URL = "https://crestwealth.com/admin/admin.html"
- dashboard/dashboard.html:
  - TITLE = "Crest Wealth — Investor Portal"
  - DESC = "Secure investor dashboard for managing your Crest Wealth portfolio, deposits, withdrawals, and task-based rewards."
  - URL = "https://crestwealth.com/dashboard/dashboard.html"
- error_404/404.html:
  - TITLE = "Page Not Found — Crest Wealth"
  - DESC = "The page you're looking for doesn't exist. Return to Crest Wealth homepage to explore our investment services."
  - URL = "https://crestwealth.com/error_404/404.html"
- legal/privacy.html:
  - TITLE = "Privacy Policy — Crest Wealth"
  - DESC = "Crest Wealth privacy policy. Learn how we protect, collect, and use your personal data in compliance with global data protection regulations."
  - URL = "https://crestwealth.com/legal/privacy.html"
- legal/terms.html:
  - TITLE = "Terms of Service — Crest Wealth"
  - DESC = "Crest Wealth terms of service. Review our legal terms, account agreements, and investment contract conditions."
  - URL = "https://crestwealth.com/legal/terms.html"

**Test Requirements (TR):**
- TR-17.1 (rule): Each of the 5 pages has ALL 5 og:* tags + 3 twitter:* tags = 8 meta tags total
- TR-17.2 (rule): All `og:image` hrefs point to `https://crestwealth.com/og-image.png`
- TR-17.3 (rubric): No visible duplication of OG tags in the 5 pages' `<head>` sections (score ≥4)

**Blocked By:** Task 15 (need canonical URL structure set first) and Task 16 (need og-image.png exists)

**Status:** pending

---

### Task 18: 🟡 Create shared-utils.js + Refactor duplicated ticker/toast logic (Issue 17)
**Priority:** 🟡 Medium
**Acceptance Criteria:** AC-12
**Files affected:**
- NEW: shared-utils.js at project root
- MODIFY: 12 production JS files that currently copy-paste the ticker fetch + toast code

**Description:**

**Step 1:** Create `shared-utils.js` at project root containing:
1. The duplicated `fetchTickerData()` function (currently copied in every page.js — the one that used to call Alpha Vantage + localStorage caching — already stripped of console.logs per Task 11)
2. The duplicated `showToast(message, type='info', duration=3500)` function (currently in investments.js, accounts.js, used for alerts)
3. Add clear comments at top of each function so the user can understand them.

**Step 2:** For every page that currently has the duplicated ticker code (12 files: about.js, academy.js, accounts.js, careers.js, 404.js, index.js, investments.js, pricing.js, security.js, support.js, privacy.js, terms.js):
- DELETE the duplicated function bodies (fetchTickerData, showToast) from their local file
- ADD script include in their HTML BEFORE the page.js include:
  `<script src="../shared-utils.js" defer></script>` (before `academy.js`, `index.js`, etc.)
- In the page.js: replace any local `showToast(` calls with `window.CrestUtils.showToast(` or just call directly if on same scope (utils.js should attach to window)

**Test Requirements (TR):**
- TR-18.1 (rule): shared-utils.js exists at project root, contains both fetchTickerData + showToast
- TR-18.2 (rule): All 12 HTML pages include `<script src="../shared-utils.js"` before their page-specific script tag
- TR-18.3 (rule): Grep for `function fetchTickerData` in 12 page-specific JS files → 0 matches (it moved to shared)
- TR-18.4 (rubric): Site still works — ticker bar fetches data and toasts still appear on user actions (score ≥4)

**Blocked By:** Task 11 (console logs removed)

**Status:** pending

---

### Task 19: 🟡 Replace href="#" for real placeholder links (footer/webinar/CTAs) (Issue 9)
**Priority:** 🟡 Medium
**Acceptance Criteria:** AC-9 placeholder section
**Files affected (10 files):**
index/index.html, dashboard/dashboard.html, investments/investments.html, academy/academy.html, accounts/accounts.html, careers/careers.html, pricing/pricing.html, security/security.html, support/support.html, admin/admin.html

**IMPORTANT SCOPE NOTE:**
- DO NOT change href="#" on SPA navigation links (sidebar nav links that have `data-view="overview"` or similar `data-view=` attributes — these are intentionally `#` because they switch JS views, not pages)
- DO change footer links, button CTAs, webinar "Reserve Seat", nav links that don't have data-view attributes

**Per-page fixes:**

**Footer common fixes (appear on most public pages):**
- "Our Story" → `../about/about.html`
- "Leadership Team" → `../about/about.html#leadership` (add anchor to about page if needed, or just `../about/about.html`)
- "Contact Support" → `../support/support.html`
- "Careers" → `../careers/careers.html`
- "Investment Accounts" → `../accounts/accounts.html`
- "Stocks & Equities" → `../investments/investments.html`
- "Fixed Income" → `../investments/investments.html#fixed`
- "Pricing / Plans" → `../pricing/pricing.html`
- "Security" → `../security/security.html`
- "Platform Demo / Dashboard" → `../dashboard/dashboard.html` (note: will trigger auth modal — that's correct)
- "Sign In" → `data-modal="signin"` pattern (if modal available) OR `../index/index.html#signin`
- "Open Account / Sign Up" → `data-modal="signup"` pattern (if modal available) OR `../index/index.html#signup`
- "Privacy Policy" → `../legal/privacy.html`
- "Terms of Service" → `../legal/terms.html`

**Academy-specific (webinar Reserve Seat buttons):**
- "Reserve Your Seat" → link to index#signup or trigger data-modal="signup"
- "Get Started" buttons on courses → same as above

**Dashboard sidebar nav:** Keep href="#" with data-view (they ARE intentional SPA links)

**Test Requirements (TR):**
- TR-19.1 (rule): Total href="#" count across all 10 HTML files = reduced. Initial count was 42; after SPA exclusion, should be ≤ 12 remaining (all data-view ones in dashboard/admin)
- TR-19.2 (rule): Every footer has functioning links (no footer link remains as href="#" unless data-view attached)
- TR-19.3 (rule): Every CTA ("Reserve Seat", "Get Started", "Open Account") → no longer "#" unless paired with data-modal attribute

**Blocked By:** None

**Status:** pending

---

### Task 20: 🟡 Connect 404 page — footer link + JS fallback (Issue 11)
**Priority:** 🟡 Medium
**Acceptance Criteria:** AC-11 404 section
**Files affected:**
- ALL 15 HTML pages (footer / tiny JS link checker)
- error_404/404.html itself (meta tags)

**Description:**

**A. In error_404/404.html:**
1. Add meta robots noindex: `<meta name="robots" content="noindex, follow">` in `<head>`

**B. In footer of every public page:**
Add a small, low-visibility text link at bottom of footer (next to copyright):
`<a href="../error_404/404.html" style="opacity:0.5;font-size:0.7rem;">Report broken page</a>`
(Adjust relative path accordingly for nested vs root pages — root pages: `error_404/404.html`, subfolder pages: `../error_404/404.html`)

**C. In shared-utils.js (or inline small script):**
Add a tiny "bad link catcher" snippet that attaches to page load: for all `<a href>` tags on page, if the href points to a .html file on the same domain, add an `onerror` handler that redirects to `../error_404/404.html` on failure. (Static sites can't catch 404s server-side, this is best-effort.)

**Test Requirements (TR):**
- TR-20.1 (rule): error_404/404.html has `<meta name="robots"` noindex tag
- TR-20.2 (rule): At least 5 public pages contain a link to `error_404/404.html` in their footer
- TR-20.3 (rubric): Grep for "Report broken page" shows present on multiple pages (score ≥4)

**Blocked By:** Task 18 (shared-utils exists, part C lives there)

**Status:** pending

---

## Phase 3 — Backend + Advanced Security

---

### Task 21: 🔴 Initialize Supabase Project & Database Tables (Issue 24, part 1)
**Priority:** 🔴 Critical security improvement
**Acceptance Criteria:** AC-16
**Files affected:**
- (New project created on Supabase servers)
- Environment configs added to project root

**Description:**
1. Use `supabase_get_project` MCP tool to connect existing Supabase project (if already configured) OR walk user through creation.
2. Use `supabase_get_tables` to see if tables exist already.
3. Create migration SQL file (saved to project root at `supabase/migrations/001_init_tables.sql`) containing:

```sql
-- Users table (auth.users is built into Supabase auth; we add public.users profile table)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User balances
CREATE TABLE IF NOT EXISTS public.user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  cash_balance NUMERIC(15,2) DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deposits
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  plan_rate NUMERIC(5,4) NOT NULL,
  proof_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  bank_name TEXT,
  bank_account TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks config
CREATE TABLE IF NOT EXISTS public.tasks_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB,
  reward_amount NUMERIC(12,2) DEFAULT 0,
  url TEXT,
  url_label TEXT,
  active BOOLEAN DEFAULT true
);

-- User task completions
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID REFERENCES public.tasks_config(id) NOT NULL,
  status TEXT DEFAULT 'pending',
  proof_value TEXT,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, task_id)
);

-- Daily streak
CREATE TABLE IF NOT EXISTS public.daily_streak (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  last_checkin DATE,
  streak_count INTEGER DEFAULT 0
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_streak ENABLE ROW LEVEL SECURITY;

-- Policies: users see only their own rows
CREATE POLICY "Users see own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users see own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tasks config visible to all authenticated" ON public.tasks_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users see own tasks" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own streak" ON public.daily_streak FOR SELECT USING (auth.uid() = user_id);
-- INSERT policies
CREATE POLICY "Users insert own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users insert own user_tasks" ON public.user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own user_tasks" ON public.user_tasks FOR UPDATE USING (auth.uid() = user_id);
```

4. Apply migration via `supabase_apply_migration`.

5. Create project config file `.env.supabase` at ROOT (template, NOT actual secrets, just markers):
```
# Supabase config - Actual values written by supabase_get_project tool
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

6. Note: `supabase_get_project` writes actual values to local env files; we must call it first to get URL and anon key.

**Test Requirements (TR):**
- TR-21.1 (rule): `supabase_get_project` returns valid project (URL + anon_key present)
- TR-21.2 (rule): `supabase_get_tables(schema=public)` contains ALL 7 of: users, user_balances, deposits, withdrawals, tasks_config, user_tasks, daily_streak
- TR-21.3 (rule): Migration SQL file exists under supabase/migrations/001_init_tables.sql

**Blocked By:** None (requires user to have Supabase connected via IDE integration — if not, we guide them)

**Status:** pending

---

### Task 22: 🔴 Replace Fake Auth in auth-guard.js with Real Supabase Auth (Issue 24, part 2)
**Priority:** 🔴 Critical security improvement
**Acceptance Criteria:** AC-16
**Files affected:**
- auth-guard.js (COMPLETE rewrite — out with localStorage demo, in with Supabase real auth)
- Optionally: new supabase-client.js helper at root

**Description:**

**A. Create `/supabase-client.js` at project root (shared helper):**
```js
// Supabase client helper — loaded on every page that needs auth
// Actual URL + anon key are replaced by supabase_get_project output
(function initSupabase() {
  const SUPABASE_URL = "URL_FROM_supabase_get_project";
  const SUPABASE_ANON_KEY = "ANON_KEY_FROM_supabase_get_project";
  // Use UMD build loaded via CDN (or load npm package if we switch to build system later)
  if (!window.supabase) {
    const scr = document.createElement('script');
    scr.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    scr.onload = () => {
      window.CrestSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    };
    document.head.appendChild(scr);
  }
})();
```

**B. Rewrite `/auth-guard.js` to use Supabase:**
Keep the existing modal UI (it looks good!) but change the SUBMIT LOGIC:
1. Login form submit → call `CrestSupabase.auth.signInWithPassword({ email, password })` (no more fake timeout!)
2. Signup form submit → call `CrestSupabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })` — sends real confirmation email
3. Instead of checking `localStorage.isAuthenticated` → check `CrestSupabase.auth.getSession()`
4. On success → call existing `onSuccess()` (redirect to dashboard)
5. Add a LEGACY fallback mode: if Supabase CDN fails to load, fall back to localStorage mode so user isn't completely blocked (show warning)
6. Add a clear "DEMO / REAL AUTH" badge so state is visible to developer

**Migration from old localStorage:**
- If user was "logged in" via old localStorage.isAuthenticated = 'true' → prompt: "Please re-login with our new secure system" and show login form. Don't auto-login them (the old auth was fake).

**Test Requirements (TR):**
- TR-22.1 (rule): auth-guard.js contains calls to supabase.auth.signInWithPassword AND signUp
- TR-22.2 (rule): auth-guard.js NO LONGER contains direct write `localStorage.setItem('isAuthenticated'` for auth state (may still use it for legacy warning)
- TR-22.3 (rule): supabase-client.js exists at project root
- TR-22.4 (rule): Grep for "isAuthenticated" in auth-guard.js is ≤ 3 occurrences (only legacy detection, not main auth path)
- TR-22.5 (rubric): User can sign up with valid email → gets confirmation page; can re-login with same email/password on fresh page load WORKS (score ≥4)

**Blocked By:** Task 21 (must have Supabase project + URL/key first)

**Status:** pending

---

### Task 23: 🟡 Add Security Headers (CSP, X-Frame, etc.) to ALL 15 HTML Pages (Issue 25)
**Priority:** 🟡 Medium (high impact but static site)
**Acceptance Criteria:** AC-17
**Files affected:** ALL 15 HTML pages

**Description:**
Add these SIX META tags to the `<head>` of EVERY HTML page. They are all safe, standard values for this site. Copy-paste block into `<head>` after canonical and OG tags.

```html
<!-- Security Headers -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://api.coingecko.com https://api.exchangerate-api.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: https:;
  connect-src 'self' https://api.coingecko.com https://api.exchangerate-api.com https://*.supabase.co https://cdn.jsdelivr.net;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self' https://*.supabase.co;
">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
<meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
```

Note: The CSP `script-src` includes `'unsafe-inline'` because the site still uses inline script includes (root redirect pages) and the project explicitly avoids a build system. If we remove inline scripts later, we can tighten this to `'self'` + nonces. That's acceptable for phase 1.

The CSP `connect-src` includes Supabase URLs for Task 22.

**Test Requirements (TR):**
- TR-23.1 (rule): Each HTML page has all 6 security meta tags (grep for `http-equiv="Content-Security-Policy"`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy`, `X-Content-Type-Options`)
- TR-23.2 (rule): Total count across site for each of the 6 → 15 matches each

**Blocked By:** None

**Status:** pending

---

## Phase 4 — Low Priority / Polish (Safe conservative changes)

---

### Task 24: 🟢 Conservative !important Removal in CSS (Issue 12)
**Priority:** 🟢 Low
**Acceptance Criteria:** (AC, none strongly tied)
**Files affected:** 10 CSS files with !important

**Description:** SAFE / conservative approach (no specificity refactor risk):

1. Remove ONLY !important on rules that are UNIQUE enough (no other rule fights them — clearly safe)
2. Mark remaining !important with comment `/* TODO: fix specificity, currently needs !important */` so future edits are aware

**SAFE to remove (test after each):**
- index.css lines 440, 444 (color !important on brand nav link classes) — these are specific classes, just use higher specificity instead
- investments.css lines 2791, 2792, 2796, 2797 (color !important on drawer nav links) — same pattern
- All other !important declarations are in `@media (max-width: Xpx)` blocks → **leave them alone for now** (they genuinely fight desktop specificity and removing them causes mobile regressions)

If in doubt about a line, LEAVE `!important` and add the TODO comment. The goal is not to get 0, it's to remove only obviously safe ones and annotate the rest.

**Test Requirements (TR):**
- TR-24.1 (rule): All remaining !important in CSS files have an adjacent TODO comment (except maybe the 2 index.css + 4 investments if removed cleanly)
- TR-24.2 (rubric): Spot check mobile widths — desktop/mobile layouts look unchanged (score ≥4)

**Blocked By:** None

**Status:** pending

---

### Task 25: 🟢 Add small utility CSS classes to reduce inline styles (Issue 13)
**Priority:** 🟢 Low
**Acceptance Criteria:** (AC, none strongly tied)
**Files affected:** 10 public CSS files

**IMPORTANT CONSTRAINT PER USER'S WISH:** Per-page CSS remains independent. DO NOT merge CSS into shared file. Add the utility classes to each page's own CSS independently so it stays easy to edit manually.

**Add 5 standard utility classes TO THE BOTTOM OF EACH of the 10 public CSS files:**
```css
/* === Utility Classes (reduce inline style= repetition) === */
.text-center { text-align: center; }
.text-white { color: #FFFFFF; }
.color-primary { color: #0E5E3A; }
.color-accent { color: #FF5500; }
.font-bold { font-weight: 700; }
```

Then in each page's HTML, scan for the MOST FREQUENTLY REPEATED inline style patterns and swap them:
1. `style="text-align: center;"` → replace with `class="text-center"`
2. `style="color: #FFFFFF;"` → `class="text-white"`
3. `style="color: #0E5E3A; font-weight: 700;"` → `class="color-primary font-bold"`
4. `style="color: #FF5500; font-weight: 700;"` → `class="color-accent font-bold"`

Be careful: if the element already has a class attribute, APPEND to existing class space-separated; if not, add new class attribute. One-off styles (like specific padding: 14px 36px) — leave as inline, not worth refactoring.

Goal: reduce inline style count by 10-15% without introducing risk.

**Test Requirements (TR):**
- TR-25.1 (rule): Each CSS file has the 5 utility classes appended at bottom (50 total class defs across 10 files)
- TR-25.2 (rule): Grep `style="text-align: center"` count reduced by ≥50% from original (rough estimate OK)
- TR-25.3 (rubric): visual pages render same colors and layout after replacement (score ≥4)

**Blocked By:** None

**Status:** pending

---

### Task 26: 🟢 Move inline onclick/onchange handlers from dashboard/admin → external listeners (Issue 14)
**Priority:** 🟢 Low
**Files affected:**
- dashboard/dashboard.html, dashboard/dashboard.js
- admin/admin.html, admin/admin.js

**Description:**

**dashboard.html:**
Find these inline handlers (rough locations):
- `onchange="calcReturns()"` → remove from HTML
- `onclick="doCopy(...)"` → remove from HTML (possibly multiple instances)
- Any other `onclick=` or `onchange=` → remove

**dashboard.js:**
Add at bottom of file:
```js
document.addEventListener('DOMContentLoaded', function() {
  // calcReturns on plan radio change
  const planRadios = document.querySelectorAll('input[name="plan"]');
  planRadios.forEach(r => r.addEventListener('change', calcReturns));

  // doCopy on click for elements with data-copy attribute
  // We add data-copy to the buttons in HTML or match by class
  // Pattern: document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => doCopy(...)))
});
```

Alternative simple approach: keep the `doCopy` calls but attach via event listeners matching button by ID/class (since each copy button is unique enough). We add IDs to copy buttons first in HTML if needed, then attach.

Same pattern for admin.html/admin.js.

**Test Requirements (TR):**
- TR-26.1 (rule): `grep "onclick=" dashboard/dashboard.html admin/admin.html` → 0 matches (or 0 matches outside the data-view SPA links)
- TR-26.2 (rule): `grep "onchange=" dashboard/dashboard.html admin/admin.html` → 0 matches
- TR-26.3 (rubric): copy buttons + calc returns still work exactly as before when clicked/changed (score ≥4)

**Blocked By:** None

**Status:** pending

---

## Overall Task Summary

| # | Title | Priority | Status | Depends On |
|---|-------|----------|--------|------------|
| 1 | DELETE DOWNLOAD INI.txt | 🔴 | pending | — |
| 2 | Fix 12 favicon paths ../../ → ../ | 🔴 | pending | — |
| 3 | Fix broken ticker prices in 8 pages | 🔴 | pending | — |
| 4 | Auth guard for Dashboard | 🔴 | pending | — |
| 5 | Auth guard for Admin | 🔴 | pending | — |
| 6 | Rebrand Novara→Crest in Dashboard html+js | 🔴 | pending | Task 4 |
| 7 | Rebrand Novara→Crest in Admin html+js | 🔴 | pending | Task 5 |
| 8 | Rebrand root redirect pages | 🟠 | pending | — |
| 9 | Fix index.html dupe favicon + dupe CSS | 🟠 | pending | — |
| 10 | Fix duplicate CSS imports on 7 pages | 🟠 | pending | — |
| 11 | Remove 37 console warn/error lines | 🟠 | pending | — |
| 12 | Move 19 utility scripts to /tools/ | 🟠 | pending | — |
| 13 | Move phone poster.jpg to assets/ | 🟠 | pending | — |
| 14 | Hide scratch/ in gitignore + robots | 🟠 | pending | — |
| 15 | Add canonical URLs to all 15 pages | 🟡 | pending | — |
| 16 | Generate og-image.png | 🟡 | pending | — |
| 17 | Add OG tags to 5 missing pages | 🟡 | pending | 15, 16 |
| 18 | Create shared-utils.js for ticker/toast | 🟡 | pending | 11 |
| 19 | Fix placeholder href="#" footer/CTA links | 🟡 | pending | — |
| 20 | Link 404 page + best-effort catcher | 🟡 | pending | 18 |
| 21 | Supabase init + tables + migrations | 🔴 | pending | — |
| 22 | Rewrite auth-guard.js for real Supabase auth | 🔴 | pending | 21 |
| 23 | Security headers meta tags on all 15 pages | 🟡 | pending | — |
| 24 | Conservative !important CSS removal | 🟢 | pending | — |
| 25 | Add utility classes + swap inline styles | 🟢 | pending | — |
| 26 | Dashboard + admin: inline handlers → JS listeners | 🟢 | pending | — |

**Total tasks: 26**
**Critical: 8 (Tasks 1-7 + 21-22)**
**High: 7 (Tasks 8-14)**
**Medium: 7 (Tasks 15-20 + 23)**
**Low: 4 (Tasks 24-26)**
