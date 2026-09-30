# Crest Wealth Full Project Fix - Specification

**Created:** 2026-09-29
**Project:** Crest Wealth Investment Platform
**Status:** Specify Phase

---

## Problem

The Crest Wealth website has 21 categories of problems that need fixing. These include:
- Security holes (anyone can access dashboard without login)
- Wrong brand name ("Novara" instead of "Crest Wealth" on many pages)
- Broken image/icon links (favicons point to wrong folders)
- Stock prices showing wrong numbers (missing first digits)
- Bad files that shouldn't exist (download links to pirated software)
- Pages loading the same stylesheet twice (wastes bandwidth)
- Console error messages showing to users in browser
- Fake login system that anyone can bypass
- And many more...

---

## 📖 ISSUE-BY-ISSUE EXPLANATIONS + SOLUTIONS

---

### ISSUE 1: Dashboard & Admin Have No Lock (Anyone Can Enter)

**Child-like explanation:**
Imagine your house has a front door with a lock... but the back door and safe room have NO locks at all. Anyone who knows the back door address can just walk right in and touch everything. That's what's happening here.

The "dashboard" (your money page) and "admin" (your control panel) pages have NO login protection. If someone types the URL directly into their browser, they get in immediately — no password asked.

**What I will do:**
1. Add the "door lock" script (`auth-guard.js`) to BOTH the dashboard and admin pages
2. Add a check inside dashboard.js and admin.js that says: "If no one is logged in, show the login door immediately"
3. Fix the "key" naming so all pages use the same login key (currently some pages use different key names in the pocket)

---

### ISSUE 2: Wrong Name Everywhere ("Novara" instead of "Crest Wealth")

**Child-like explanation:**
Imagine you painted your house and put a big "SMITH FAMILY" sign on the front lawn. But inside the house, all the cups say "JOHNSON", the fridge says "JOHNSON", and the mailbox says "JOHNSON". Visitors get very confused.

The website says "Crest Wealth" on the front page, but the dashboard, admin pages, AND all the "pocket memory" (localStorage) still say "Novara". The social media links also still point to Novara accounts.

**What I will do:**
1. Go through [dashboard/dashboard.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/dashboard/dashboard.html) and [admin/admin.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/admin/admin.html) — change every "Novara" word to "Crest Wealth"
2. Go through [dashboard/dashboard.js](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/dashboard/dashboard.js) and [admin/admin.js](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/admin/admin.js) — change every localStorage key from `novara_*` to `crest_*` AND change every visible "Novara" word to "Crest"
3. Fix the root redirect pages ([index.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/index.html), [admin.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/admin.html), [dashboard.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/dashboard.html)) to say "Crest Wealth"
4. Fix social links: change `@NovaraCapital` → `@CrestWealthNG`, `novaracapital.com` → `crestwealth.com`, `t.me/NovaraCapitalVIP` → `t.me/CrestWealthVIP`
5. Change product name "Novara Stash" → "Crest Stash"
6. Change account holder "Novara Capital / Adaeze Okonkwo" → "Crest Wealth / Adaeze Okonkwo"

---

### ISSUE 3: Wrong Favicon Paths (Icons Can't Be Found)

**Child-like explanation:**
Imagine you tell your friend: "Go get the book from the shelf UPSTAIRS, in the bedroom, on the nightstand." But actually the book is just in the NEXT room. Your friend walks upstairs, can't find the book, and gives up. That's what's happening.

All the sub-pages are looking for the favicon (the tiny icon in the browser tab) in `../../favicon.svg` (that means "go up TWO folders"). But these pages are only ONE folder deep, so they should just go `../favicon.svg` (go up ONE folder).

Result: 12 pages have NO icon showing in their browser tabs!

**What I will do:**
Fix every favicon path from `../../favicon.svg` to `../favicon.svg` in these 12 files:
- [about/about.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/about/about.html#L7-L7)
- [academy/academy.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/academy/academy.html#L7-L7)
- [accounts/accounts.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/accounts/accounts.html#L7-L7)
- [careers/careers.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/careers/careers.html#L7-L7)
- [index/index.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/index/index.html#L7-L7)
- [investments/investments.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/investments/investments.html#L7-L7)
- [legal/privacy.html#L8](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/legal/privacy.html#L8-L8)
- [legal/terms.html#L8](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/legal/terms.html#L8-L8)
- [pricing/pricing.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/pricing/pricing.html#L7-L7)
- [security/security.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/security/security.html#L7-L7)
- [support/support.html#L7](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/support/support.html#L7-L7)
- [error_404/404.html#L8](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/error_404/404.html#L8-L8)

---

### ISSUE 4: Broken Stock Ticker Prices (Missing First Digits)

**Child-like explanation:**
Imagine you write "$228.40" on a price tag, but then the "$22" part rubs off. Now it just says ".40 cents" — that looks ridiculous and confusing. That's exactly what happened to the stock prices on 8 pages.

Prices show like:
- `AAPL: .40` → should be `$228.40`
- `BTC: ,520.00` → should be `$76,520.00`

The `investments.html` page has the correct numbers — I'll use that as the copy source.

**What I will do:**
Copy-paste the CORRECT ticker items from [investments/investments.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/investments/investments.html) (lines 31-38) into these 8 broken pages:
- index/index.html, about/about.html, accounts/accounts.html, academy/academy.html, careers/careers.html, pricing/pricing.html, support/support.html, security/security.html

Fix pattern:
- `.40` → `$228.40` (AAPL)
- `.20` → `$415.20` (MSFT)
- `.50` → `$235.50` (TSLA)
- `,520.00` → `$76,520.00` (BTC)
- `,432.00` → `$2,432.00` (ETH)

---

### ISSUE 5: Delete Bad File (DOWNLOAD INI.txt)

**Child-like explanation:**
Imagine you find a note in your child's backpack that says "Go to this sketchy website and download free cracks for video games!" That note should NOT be in the backpack. It needs to go straight in the trash.

This file has links to "PATCH 2026 HANO" on MediaFire — pirated/cracked software links. It has NO business being in a professional investment website folder.

**What I will do:**
Permanently DELETE the file: [DOWNLOAD INI.txt](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/DOWNLOAD%20INI.txt)

---

### ISSUE 6: Missing Social Share Image (og-image.png)

**Child-like explanation:**
Imagine you make a beautiful birthday invitation and post it on Facebook... but Facebook shows a blank white square instead of your design. Why? Because you forgot to attach the picture! That's what's happening here.

All 9 main pages say "when you share me, use the picture at og-image.png" — but that picture file doesn't exist! Shares will look ugly/broken.

**What I will do:**
Create a beautiful `og-image.png` at the project root using the AI image generator (with Crest Wealth branding, green/gold colors, tagline text). Then all pages' OG tags will work correctly.

---

### ISSUE 7: Pages Load Their CSS File TWICE (Wasteful!)

**Child-like explanation:**
Imagine you're packing your backpack for school. You put your math textbook in... then for some reason you put the EXACT SAME math textbook in AGAIN. Now your backpack is heavier for no reason, you have extra clutter, and you wasted time. That's what's happening.

8 pages import their CSS file TWO times in a row. The browser loads the same stylesheet twice — slower load, zero benefit.

**AND YOU ASKED: "But I want each page to have its own CSS file for easy manual fixes!"**
→ That's completely fine! I am NOT changing the separate-CSS design. Each page keeps its OWN CSS file. I'm just removing the SECOND (duplicate) import line of the SAME file. Think: "keep one math textbook, throw away the second identical copy."

**What I will do:**
In each affected HTML file, DELETE the SECOND `<link rel="stylesheet" href="*.css">` line (the duplicate one). Keep the FIRST one. Pages affected:
- academy.html (lines 21 + 24 → keep 21, delete 24)
- accounts.html (lines 21 + 24 → keep 21, delete 24)
- careers.html (lines 21 + 23 → keep 21, delete 23)
- index.html (lines 21 + 24 → keep 21, delete 24)
- investments.html (lines 21 + 24 → keep 21, delete 24)
- pricing.html (lines 21 + 23 → keep 21, delete 23)
- security.html (lines 21 + 23 → keep 21, delete 23)
- support.html (lines 21 + 23 → keep 21, delete 23)

---

### ISSUE 8: index/index.html Has Two Different Favicon Declarations Fighting

**Child-like explanation:**
Imagine you stick two different stickers on the same notebook. One says "I love soccer" and one says "I hate soccer." They fight each other and the notebook looks confused.

The index page has TWO favicon icons declared: one at line 7 (with the wrong broken path) AND one at line 22 (an inline SVG icon). The browser doesn't know which one to use.

**What I will do:**
Delete the broken-path favicon at line 7 (`../../favicon.svg` — wrong). KEEP the inline data-URI SVG favicon at line 22 (it works, it's self-contained, no path issues). Also keep the duplicate CSS fix from issue 7.

---

### ISSUE 9: 42 Placeholder Links That Go Nowhere (href="#")

**Child-like explanation:**
Imagine you build a maze with 42 doors... but every door just has a sticky note that says "DOOR NOT DONE YET" and leads nowhere. People walk up to the doors, click them, and nothing happens. That's the website.

Throughout the site there are 42 buttons and links that point to `#` which means "do nothing when clicked." These include sidebar navigation links, footer links, "Reserve Seat" buttons, etc.

**What I will do:**
1. Dashboard/admin sidebar links: keep `href="#"` for SPA-style navigation (they work via JavaScript data-view attributes — those are OK)
2. Footer placeholder links like "Our Story" → link to `../about/about.html`, "Leadership" → `../about/about.html#leadership` section, "Contact Support" → `../support/support.html`, "Careers" → `../careers/careers.html`
3. Webinar "Reserve Seat" buttons → link to `../index/index.html#signup` (or trigger signup modal via data-modal attribute)
4. Any footer/button links in the 42 count that have real pages → point to correct pages

---

### ISSUE 10: 37 Console Error Messages in Production Code

**Child-like explanation:**
Imagine you have a toy car, but every time you push it forward it beeps really loud and says "ERROR! ERROR! BROKEN!" even when everything is fine. Those are console logs. Developers use them while building the toy... but they forget to turn them off before selling.

Right now, if you open browser DevTools on ANY page, you see red/yellow error messages about "Alpha Vantage fetch failed." These confuse anyone debugging and they shouldn't be there.

**What I will do:**
Go through ALL 12 production JS files and REMOVE the three lines in each:
```
console.warn('Alpha Vantage fetch failed:', e);
console.error("Failed to fetch ticker data", error);
console.error('Failed to parse cached data', e);
```
Files affected: about.js, academy.js, accounts.js, careers.js, 404.js, index.js, investments.js, pricing.js, security.js, support.js, privacy.js, terms.js

---

### ISSUE 11: 404 Page is a Ghost (No One Can Find It)

**Child-like explanation:**
Imagine you have a "Lost? Click here for help!" sign at a mall... but the sign is hidden in a closet. No one can see it. That's the 404 error page.

The [error_404/404.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/error_404/404.html) page exists but NO page on the entire website links to it. And since this is a static site, there's no server config to auto-show it either.

**What I will do:**
1. Add a `<link rel="alternate" ...>` canonical to the 404 page (SEO)
2. Add a meta `robots` tag to say `noindex, follow` (don't index error pages)
3. **Most importantly:** Since this is a static website, add a JavaScript snippet at the TOP of EVERY footer that checks: "If the current page body is empty or returns 404 via internal link check, redirect to error_404/404.html"
4. **AND:** Create a simple JavaScript link checker: add a tiny `onerror` handler to broken `<a>` links — if someone clicks a link that 404s, gently take them to the error_404 page instead
5. **AND:** Link to the 404 page from the footer's "Help" section (optional, as "Report broken page")

---

### ISSUE 12: 82 Uses of !important in CSS (The "NUKE" Button)

**Child-like explanation:**
Imagine you have a quiet argument with your sibling about who gets the TV remote. Instead of talking it out, you scream "I DECLARE I GET IT AND NO ONE CAN ARGUE!!" That's `!important` in CSS. It overrides EVERYTHING and makes future changes very hard.

The CSS files use `!important` 82 times — mostly in mobile styles. Most are in responsive media queries where specificity just needs to be improved slightly.

**What I will do:**
Since this is low-priority AND could break things if done carelessly, I'll be CONSERVATIVE:
1. **Remove only the SAFEST !important declarations** — ones where the selector is already very specific (like `.page-hero-title` already unique, no other rule fights it)
2. Keep ones that are in `@media (max-width)` that fight desktop styles (these are genuinely needed in CSS without a full refactor)
3. The ones we know are safe: `color: #FF5500 !important;` and `color: #0E5E3A !important;` in index.css — replace with proper class specificity
4. Add comment for remaining: `/* TODO: refactor specificity instead of !important */`

---

### ISSUE 13: Hundreds of Inline style= Attributes (Styling Inside HTML)

**Child-like explanation:**
Imagine you write a letter, but every single word is a different color, different font, different size — and you had to manually tell each word individually how to look instead of just saying "this letter is in blue Times New Roman." That's what inline styles are.

Right now HTML has styles like `<div style="display: flex; gap: 16px; padding: 20px;...">` directly on elements. This makes pages huge, makes CSS inconsistent, makes dark mode/theme changes impossible.

**BUT WAIT:** This is a TON of work, and risky to change without breaking layouts.

**What I will do (SAFE approach):**
The user wants "easy manual fixes." Too much refactoring = harder manual fixes later. So:
1. **Do NOT massively refactor all inline styles to CSS classes** — that would make individual manual edits HARDER, not easier
2. **DO:** Extract the most repeated patterns into REUSABLE UTILITY CLASSES in each CSS file. Things like `style="text-align: center;"` → class `.text-center { text-align:center }`. This means LESS inline styles but still simple to understand.
3. **DO:** Keep one-off inline styles (like one specific color, one specific padding) because they are easy to find/edit.
4. Add 3-5 utility classes per CSS file for the 5 most-repeated patterns (`text-center`, `flex-gap-16`, `padding-big`, `text-white`, `color-primary`, `color-accent`)

---

### ISSUE 14: Inline Event Handlers (onclick="doSomething()")

**Child-like explanation:**
Imagine you want a bell to ring when a door opens. Instead of having ONE bell controller that listens for ALL doors opening, you tape a small bell to EVERY door with instructions written on tape. That's onclick in HTML.

Dashboard and admin have `onclick="doCopy()"` and `onchange="calcReturns()"` in the HTML. This is the old way.

**What I will do (MINIMAL, safe changes):**
Since this is low-medium risk and the user wants simplicity:
1. In `dashboard/dashboard.html`: REMOVE the inline `onclick` and `onchange` attributes
2. In `dashboard/dashboard.js`: ADD proper `document.addEventListener('click', ...)` and `addEventListener('change', ...)` at the top of the file
3. Same for admin.html/admin.js

This is a simple 1:1 swap, zero behavior change. But it's cleaner.

---

### ISSUE 15: Zero Canonical URLs (SEO Issue)

**Child-like explanation:**
Imagine you have THREE different photocopies of your homework floating around your school. You want the teacher to grade the ORIGINAL one, not a random copy. A "canonical URL" is a little note on every page that says: "The OFFICIAL home of this content is HERE → XYZ.com/page."

Without it, Google might think you have duplicate pages and rank you lower.

**What I will do:**
Add ONE line inside the `<head>` of every HTML page (15 pages total):
```
<link rel="canonical" href="https://crestwealth.com/[PAGE_PATH]/[PAGE].html">
```
Examples:
- index/index.html → `https://crestwealth.com/index/index.html`
- about/about.html → `https://crestwealth.com/about/about.html`
- dashboard/dashboard.html → `https://crestwealth.com/dashboard/dashboard.html`
- Root (index.html redirect) → `https://crestwealth.com/`

---

### ISSUE 16: Missing Open Graph Tags on 6+ Pages

**Child-like explanation:**
Think of OG tags like the "gift wrap" on your link when you text it to a friend. Without the wrap, it's just a bare ugly URL. With it, you get a pretty picture, title, and description preview.

Pages missing these: admin, dashboard, error_404, privacy, terms.
(Admin and dashboard are private pages, but they should STILL have tags for consistency.)

**What I will do:**
Add full OG tag blocks to the `<head>` of:
- [admin/admin.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/admin/admin.html)
- [dashboard/dashboard.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/dashboard/dashboard.html)
- [error_404/404.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/error_404/404.html)
- [legal/privacy.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/legal/privacy.html)
- [legal/terms.html](file:///c:/Users/HP/OneDrive/Documenten/Legends%20Codes/investment/legal/terms.html)

Each block includes:
- `og:title` (e.g., "Privacy Policy — Crest Wealth")
- `og:description` (short description)
- `og:image` (points to our NEW og-image.png from issue 6)
- `og:url` (full canonical URL from issue 15)
- `og:type` ("website")
- Twitter card tags too (for X/Twitter shares)

---

### ISSUE 17: No Shared Global JS/CSS Files (But You Want Per-Page CSS)

**Child-like explanation:**
Imagine every teacher in your school rewrites their own copy of "how to do math addition" instead of all using ONE math textbook. Every page has the SAME ticker-fetching code, SAME modal code, SAME login-check code — copied and pasted 12 TIMES into 12 different JS files. If you want to fix the ticker once, you have to fix it in 12 places.

**BUT YOU SAID: "I want each page to have its own CSS so I can manually fix things easily"**
→ Good news: I agree with you for CSS. Keep separate CSS per page.
→ **But for JS (the ticker code, the login code):** We create a NEW file `shared-utils.js` at the root that contains ONLY the DUPLICATED parts (ticker fetching logic). Then each page loads BOTH: its OWN page.js AND the shared-utils.js. This way:
  - CSS: still per-page, 100% manual-friendly ✅
  - JS: duplicated bug-fixes done in ONE place ✅
  - This is the BEST of both worlds.

**What I will do:**
1. Create `shared-utils.js` at project root containing:
   - `fetchTickerData()` function (the duplicated Alpha Vantage + fallback code)
   - `showToast()` function (the duplicated toast notification code)
2. In each of the 12 pages that currently have the duplicated ticker code:
   - DELETE the duplicated function body from their page-specific JS
   - ADD `<script src="../shared-utils.js" defer></script>` BEFORE their page.js script tag
3. CSS stays 100% independent per page. No CSS merging!

---

### ISSUE 18: Scratch Folder (Dev Junk) Should Be Private

**Child-like explanation:**
Imagine your messy bedroom desk has a "work in progress" drawer full of broken pencils, half-done drawings, test scribbles. Normally you close it when guests come over. But right now the drawer is WIDE OPEN on your kitchen counter where everyone sees it.

The `scratch/` folder has developer test files and scripts that should NOT be visible in a live website folder.

**What I will do:**
1. Add `scratch/` to the `.gitignore` file so it never gets committed/deployed
2. Also add these to `.gitignore`: phone poster.jpg, scratch/*.ps1, scratch/*.py, scratch/*.jpg
3. **We don't delete the folder** — it's useful for development! We just hide it better.
4. Also add to robots.txt (already there? Let me check — yes, we'll add `Disallow: /scratch/` to robots.txt)

---

### ISSUE 19: 19 Utility Scripts Cluttering the Root Folder

**Child-like explanation:**
Imagine your kitchen counter has 19 different tools scattered on it — 7 screwdrivers, 5 hammers, 2 wrenches, 5 tape measures. They all work, but your counter looks like a mess. If you put them in a toolbox drawer, the kitchen is clean AND you still have all the tools when you need them.

The project root has 19 utility scripts (fix_dash.py, apply_auth.ps1, rebrand.js, etc.) scattered everywhere.

**What I will do:**
1. Create a NEW folder called `/tools` at the project root (the "toolbox")
2. MOVE all 19 root-level utility scripts INTO `/tools/`:
   - apply_auth.js, apply_auth.ps1, apply_auth.py
   - apply_full_footers.ps1
   - fix_dash.py, fix_dash2.py
   - fix_footers.ps1, fix_mangled.ps1, fix_ticker.ps1, fix_ticker.py, fix_wealth.ps1
   - make_global.ps1, make_global2.ps1, make_global3.ps1, make_global4.ps1
   - modify.ps1
   - rebrand.js, rebrand.ps1
   - update_cards.py, update_footers.py
3. The phone poster.jpg file stays at root (unless user says otherwise in #20)

---

### ISSUE 20: Orphaned "phone poster.jpg" at Root

**Child-like explanation:**
A random poster picture is sitting in your front hallway. No room in the house displays it. It's just there, collecting dust, taking up space.

`phone poster.jpg` exists at root but ZERO pages reference it.

**What I will do:**
**Option A (I'll pick this):** Move the file INTO the `/assets/` folder so it's properly organized with all other images. Even if unused, it lives in the right place. (We don't delete in case you need it later.)

---

### ISSUE 21: javascript:void(0) Links

**Child-like explanation:**
Previously there were 60 links that said "do nothing" using an old JavaScript trick. My scan showed ZERO matches. This means it was ALREADY FIXED in a previous pass.

**What I will do:**
Nothing! Already done. ✅

---

### ISSUE 24: ADD BACKEND — Real Authentication (not Fake localStorage Demo)

**Child-like explanation:**
Right now the "login system" is like a kid playing store: you say "I have money!" and the cashier says "OK you're rich!" without checking your wallet. ANYONE can open DevTools and type `isAuthenticated = true` and they're logged in as anybody. There's no real password checking, no accounts on a server, no nothing.

We need a REAL bank vault — a backend system where accounts are stored on a secure server, not in the browser's "pocket."

**What I will do (using SUPABASE, the best free backend for small projects):**
1. Connect Supabase (the free backend-as-a-service tool that's already integrated with this IDE)
2. Create a `users` database table (email, password_hash, full_name, phone, created_at)
3. Create a `sessions` table for tracking logins
4. REPLACE the fake auth in `auth-guard.js` with REAL Supabase auth calls:
   - `supabase.auth.signUp()` for creating accounts (sends confirmation email!)
   - `supabase.auth.signInWithPassword()` for real login
   - `supabase.auth.getSession()` to check if someone is truly logged in (NO MORE localStorage hack!)
5. Store sensitive dashboard data (balances, etc.) in Supabase tables instead of localStorage
6. Add Row Level Security so users can ONLY see THEIR OWN data
7. Add a clear "DEMO MODE" notice while transitioning

Supabase is FREE for small traffic, very secure, and easy to expand later. This replaces the fake "type any password to login" system with a REAL secure login system with emails and proper hashed passwords.

---

### ISSUE 25: Fix Missing Security Headers / CSP

**Child-like explanation:**
Imagine your house has no smoke alarm, no burglar alarm, no doorbell camera. You're not protected from basic dangers. Security headers are like the smoke alarm + burglar alarm + camera for your website.

Right now the site has NONE of these protections:
- No Content-Security-Policy (stops hackers from injecting bad scripts)
- No X-Frame-Options (stops people from putting your site in an iframe for phishing)
- No X-XSS-Protection (extra layer against bad scripts)
- No HTTPS enforcement (forces safe connections)

**What I will do:**
1. Add these META tags to the `<head>` of EVERY page (meta version for static sites — works without server):
   - `<meta http-equiv="Content-Security-Policy" content="...">` (allows trusted things only: our JS, Google Fonts, CoinGecko API, etc.)
   - `<meta http-equiv="X-Frame-Options" content="DENY">` (no iframe embedding)
   - `<meta http-equiv="X-XSS-Protection" content="1; mode=block">`
   - `<meta http-equiv="Strict-Transport-Security" content="max-age=31536000">` (force HTTPS for 1 year)
   - `<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">`
   - `<meta http-equiv="X-Content-Type-Options" content="nosniff">`
2. For the Supabase backend (#24), enable their built-in security headers on the project dashboard as well

---

## Functional Requirements (What Must Work After Fixes)

1. **AUTH:** Dashboard and admin pages CANNOT be accessed without valid login
2. **BRANDING:** The string "Novara" appears ZERO times in any production page or JS
3. **FAVICONS:** Every page shows the correct Crest Wealth favicon in the browser tab
4. **TICKERS:** ALL ticker price strings start with $ or currency symbol — NO `.40` or `,520` malformed strings
5. **BAD FILE:** DOWNLOAD INI.txt does NOT exist in project
6. **OG-IMAGE:** og-image.png exists at root, is 1200x630px branded image, referenced correctly
7. **NO DUPE CSS:** No page imports the same CSS file twice (check via grep)
8. **INDEX FAVICON:** Only ONE favicon declaration in index/index.html head
9. **FIXED LINKS:** Replace href="#" for placeholder footer/webinar links — leave only the SPA data-view ones
10. **NO CONSOLE:** ZERO console.warn/error in production JS files (except Supabase lib's internal ones)
11. **404 LINKED:** 404 page has a way to be reached (link from footer + JS fallback on bad links)
12. **CANONICAL:** Every page has a `<link rel="canonical">` in `<head>`
13. **OG TAGS:** admin, dashboard, 404, privacy, terms all have complete OG tag sets
14. **SHARED JS:** ticker + toast logic live in shared-utils.js, included BEFORE page JS
15. **SCRATCH HIDDEN:** scratch/ in .gitignore + robots.txt Disallow
16. **CLEAN ROOT:** All utility scripts moved to /tools/ folder
17. **POSTER SORTED:** phone poster.jpg moved to /assets/
18. **REAL AUTH:** Supabase auth replaces the localStorage fake auth; users can sign up with email confirmation, login with real password check
19. **SEC HEADERS:** All pages have CSP, X-Frame, HSTS, X-XSS meta tags

---

## Non-Functional Requirements (How It Should Feel)

1. **Easy manual edits:** CSS stays PAGE-SPECIFIC (no merging into single CSS file). No breaking that requirement.
2. **Backward compatible:** Any localStorage data from previous version is either migrated or not broken gracefully.
3. **No visual regressions:** Colors, layouts, fonts remain identical before/after.
4. **Simple comments:** Any newly added code includes SIMPLE comments explaining what it does (for future manual edits).

---

## Constraints & Assumptions

1. **Keep separate CSS per page** — User explicitly requested this for easy manual fixes. DO NOT MERGE CSS.
2. **Supabase used for backend auth** — No custom Node/Express server (Supabase MCP available, fastest path to real auth).
3. **OG image generated via text_to_image endpoint** — Use the AI image generator tool with branding.
4. **Minimal risk refactors** — CSS !important removal is conservative; inline style → utility classes is only for repeated patterns.
5. **href="#" only fixed where actual destination exists** — If no page exists, we create it or link to best existing page instead of leaving #.

---

## Open Questions

1. **For Issue 24 (Backend):** Are you OK with using Supabase (free tier)? It's the fastest, most secure path. Alternative would be Firebase (also free) or custom Express server (much more work). I'll proceed with Supabase since the tool is available.

---

## Acceptance Criteria

| ID | Type | Criterion |
|----|------|-----------|
| AC-1 | rule | `grep -r "Novara" *.{html,js,css}` in production folders returns 0 matches (excluding scratch/ and tools/) |
| AC-2 | rule | Dashboard page, when loaded in incognito without login, immediately shows auth modal (not dashboard content) |
| AC-3 | rule | Admin page, when loaded in incognito without login, immediately shows auth modal (not admin content) |
| AC-4 | rule | All favicon hrefs in sub-folders use `../favicon.svg` exactly (none use `../../`) |
| AC-5 | rule | All ticker prices in ticker bars start with `$` or `&` (HTML entity for currency) — no malformed `.dd` or `,ddd` patterns |
| AC-6 | rule | `DOWNLOAD INI.txt` not found in project tree |
| AC-7 | rule | `og-image.png` exists at project root, and all 15 pages reference it in og:image |
| AC-8 | rule | No page has two identical `<link rel="stylesheet">` tags pointing to same file |
| AC-9 | rule | grep for console.(warn\|error\|log) in all production JS (NOT tools/, NOT scratch/) returns 0 lines |
| AC-10 | rule | Every HTML page has exactly one `<link rel="canonical">` in `<head>` with correct crestwealth.com URL |
| AC-11 | rule | Pages admin, dashboard, 404, privacy, terms have all 5 required og:* tags + twitter tags |
| AC-12 | rule | `shared-utils.js` exists at root containing fetchTickerData + showToast; each page.js deletes duplicated ticker code |
| AC-13 | rule | `.gitignore` contains `scratch/` line; robots.txt contains `Disallow: /scratch/` line |
| AC-14 | rule | Project root does NOT contain files matching fix_*.py, fix_*.ps1, apply_*, make_global*, rebrand.*, update_*.py — those all exist under `/tools/` |
| AC-15 | rule | `phone poster.jpg` exists under `/assets/` and NOT at project root |
| AC-16 | rule | Supabase project initialized, `users` table exists, auth-guard.js uses supabase.auth instead of localStorage |
| AC-17 | rule | Every HTML page has all 6 security meta tags (CSP, X-Frame, X-XSS, HSTS, Referrer, X-Content-Type) |
| AC-18 | rubric | Visual quality: tickers look right, favicons show, no visual regressions (score 1-5, threshold ≥4) |
| AC-19 | rubric | Simplicity: file structure is clean, manual edits are still easy with per-page CSS (score 1-5, threshold ≥4) |
