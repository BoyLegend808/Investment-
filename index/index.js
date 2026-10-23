/**
 * Crest Wealth - Core Application Scripts & Interactions
 */

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initMobileMenu();
  initCalculator();
  initMarketTabs();
  initFaqAccordion();
  initModals();
  initLiveTickerUpdate();
  initDashboardSimulator();
  initPhoneDemo();
});

/* Header scroll effect */
function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
}

/* Mobile Drawer Menu */
function initMobileMenu() {
  const toggleBtn = document.querySelector(".mobile-toggle");
  const drawer = document.querySelector(".mobile-drawer");
  const closeBtn = document.querySelector(".drawer-close");
  const scrim = document.getElementById("drawer-scrim");

  if (!toggleBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add("active");
    document.body.style.overflow = "hidden";
    toggleBtn.setAttribute("aria-expanded", "true");
    if (scrim) {
      scrim.hidden = false;
      // Next frame so the opacity transition actually runs
      requestAnimationFrame(() => scrim.classList.add("is-visible"));
    }
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    if (!drawer.classList.contains("active")) return;
    drawer.classList.remove("active");
    document.body.style.overflow = "";
    toggleBtn.setAttribute("aria-expanded", "false");
    if (scrim) {
      scrim.classList.remove("is-visible");
      scrim.hidden = true;
    }
    toggleBtn.focus();
  }

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (drawer.classList.contains("active")) closeDrawer();
    else openDrawer();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeDrawer);
  }

  if (scrim) scrim.addEventListener("click", closeDrawer);

  // Close the drawer when following a link out of it
  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      drawer.classList.remove("active");
      document.body.style.overflow = "";
      toggleBtn.setAttribute("aria-expanded", "false");
      if (scrim) {
        scrim.classList.remove("is-visible");
        scrim.hidden = true;
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

/* Interactive Compound Investment Calculator */
function initCalculator() {
  const initialRange = document.getElementById("calc-initial");
  const monthlyRange = document.getElementById("calc-monthly");
  const yearsRange = document.getElementById("calc-years");
  const rateRange = document.getElementById("calc-rate");

  const initialVal = document.getElementById("calc-initial-val");
  const monthlyVal = document.getElementById("calc-monthly-val");
  const yearsVal = document.getElementById("calc-years-val");
  const rateVal = document.getElementById("calc-rate-val");

  const totalWealthEl = document.getElementById("calc-total-wealth");
  const totalDepositEl = document.getElementById("calc-total-deposit");
  const totalInterestEl = document.getElementById("calc-total-interest");

  if (!initialRange || !totalWealthEl) return;

  function formatDollars(num) {
    return "$" + Math.round(num).toLocaleString("en-US");
  }

  function recalculate() {
    const P = parseFloat(initialRange.value);
    const PMT = parseFloat(monthlyRange.value);
    const years = parseFloat(yearsRange.value);
    const annualRate = parseFloat(rateRange.value) / 100;
    const r = annualRate / 12;
    const n = years * 12;

    // Compound interest formula with monthly contributions
    // FV = P * (1 + r)^n + PMT * [ ((1 + r)^n - 1) / r ]
    let fv = P * Math.pow(1 + r, n);
    if (r > 0) {
      fv += PMT * ((Math.pow(1 + r, n) - 1) / r);
    } else {
      fv += PMT * n;
    }

    const totalDeposited = P + PMT * n;
    const totalInterest = Math.max(0, fv - totalDeposited);

    if (initialVal) initialVal.textContent = formatDollars(P);
    if (monthlyVal) monthlyVal.textContent = formatDollars(PMT) + "/mo";
    if (yearsVal)
      yearsVal.textContent = years + (years === 1 ? " Year" : " Years");
    if (rateVal) rateVal.textContent = (annualRate * 100).toFixed(1) + "% p.a.";

    totalWealthEl.textContent = formatDollars(fv);
    if (totalDepositEl)
      totalDepositEl.textContent = formatDollars(totalDeposited);
    if (totalInterestEl)
      totalInterestEl.textContent = formatDollars(totalInterest);
  }

  [initialRange, monthlyRange, yearsRange, rateRange].forEach((range) => {
    if (range) {
      range.addEventListener("input", recalculate);
    }
  });

  recalculate();
}

/* Modals (Get Started, Sign In, Demo) */
function initModals() {
  const signinTriggers = document.querySelectorAll('[data-modal="signin"]');
  const signupTriggers = document.querySelectorAll('[data-modal="signup"]');
  const modalBackdrops = document.querySelectorAll(".modal-backdrop");
  const closeBtns = document.querySelectorAll(".modal-close");

  const signinModal = document.getElementById("signin-modal");
  const signupModal = document.getElementById("signup-modal");

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    const firstField = modal.querySelector(
      "input, select, textarea, button.modal-close",
    );
    if (firstField) setTimeout(() => firstField.focus(), 60);
  }

  function closeAllModals() {
    modalBackdrops.forEach((modal) => modal.classList.remove("active"));
    document.body.style.overflow = "";
  }

  function openAuth(tab) {
    if (typeof crestLoadAuthGuard === "function") {
      crestLoadAuthGuard(tab === "signup" ? "signup" : "login");
      return;
    }
    if (tab === "signup") openModal(signupModal);
    else openModal(signinModal);
  }

  // Dialog semantics + Escape-to-close for every modal
  modalBackdrops.forEach((modal) => {
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.querySelector(".modal-backdrop.active")) closeAllModals();
  });

  // Intercept clicks on auth-required links
  const authLinks = document.querySelectorAll(".auth-required");
  authLinks.forEach((link) => {
    link.addEventListener("click", async (e) => {
      const authed = await crestIsAuthenticated();
      if (!authed) {
        e.preventDefault();
        openAuth("login");
        if (typeof showToast === "function") {
          showToast(
            "Please log in or register to access this feature.",
            "warning",
            3500,
          );
        }
      }
    });
  });

  signinTriggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllModals();
      openAuth("login");
    });
  });

  signupTriggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllModals();
      openAuth("signup");
    });
  });

  closeBtns.forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });

  modalBackdrops.forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeAllModals();
      }
    });
  });

  // Handle Form Submissions
  const signinForm = document.getElementById("form-signin");
  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!signinForm.checkValidity()) {
        signinForm.reportValidity();
        return;
      }
      const email =
        document.getElementById("signin-email")?.value?.trim() ||
        signinForm.querySelector('input[type="email"]')?.value?.trim();
      const password =
        document.getElementById("signin-password")?.value ||
        signinForm.querySelector('input[type="password"]')?.value;
      const btn = signinForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<span class="auth-btn-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:authSpin 0.7s linear infinite;vertical-align:middle;margin-right:8px;"></span> Authenticating...';
      const result = await crestSignIn(email, password);
      if (!result.success) {
        if (typeof showToast === "function")
          showToast(result.error, "error", 4000);
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }
      btn.style.background = "linear-gradient(135deg, #10B981, #059669)";
      btn.innerHTML =
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.25);margin-right:8px;vertical-align:middle;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span> Authentication Complete';
      if (typeof showToast === "function")
        showToast("Authentication Complete", "success", 2000);
      setTimeout(() => crestRedirectToDashboard(), 120);
    });
  }

  const signupForm = document.getElementById("form-signup");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!signupForm.checkValidity()) {
        signupForm.reportValidity();
        return;
      }
      const name =
        signupForm
          .querySelector('input[name="name"],#signup-name,#fullname')
          ?.value?.trim() || "";
      const email =
        document.getElementById("signup-email")?.value?.trim() ||
        signupForm.querySelector('input[type="email"]')?.value?.trim();
      const phone =
        document.getElementById("signup-phone")?.value?.trim() || "";
      const password =
        document.getElementById("signup-password")?.value ||
        signupForm.querySelector('input[type="password"]')?.value;
      const confirmPassword =
        document.getElementById("signup-password-confirm")?.value || "";
      // The starting-package picker was removed from signup; the tier is
      // selected from the dashboard, so new accounts all start on the entry one.
      const pkg = "Level 1 Package (Starter)";

      if (confirmPassword && password !== confirmPassword) {
        if (typeof showToast === "function")
          showToast("Passwords do not match. Please verify.", "error", 4000);
        return;
      }

      const btn = signupForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Creating Account...";
      const result = await crestSignUp(email, password, name, phone, pkg);
      if (!result.success) {
        if (typeof showToast === "function")
          showToast(result.error, "error", 4000);
        btn.disabled = false;
        btn.textContent = "Create Account";
        return;
      }
      btn.textContent = "Account Created!";
      if (!result.data.session) {
        if (typeof showToast === "function")
          showToast(
            "Account created! Please check your email to verify your account.",
            "success",
            6000,
          );
        btn.textContent = "Check your email";
      } else {
        if (typeof showToast === "function")
          showToast("Account created! Redirecting...", "success", 2000);
        setTimeout(() => crestRedirectToDashboard(), 120);
      }
    });
  }

  // Check URL params for login required (e.g. redirected by auth-guard.js)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("loginRequired") === "true") {
    setTimeout(() => {
      openAuth("login");
      if (typeof showToast === "function") {
        showToast("Please log in to view the requested page.", "warning", 4000);
      }
    }, 500);
  }

  if (window.location.hash) {
    const h = window.location.hash.toLowerCase();
    if (h === "#signin") {
      setTimeout(() => openAuth("login"), 150);
    } else if (h === "#signup") {
      setTimeout(() => openAuth("signup"), 150);
    }
  }
}

/* -------------------------------------------------------
   Hybrid Live Market Ticker
   Uses free CORS-enabled APIs for Crypto & FX.
   Simulates Stocks & Bonds to avoid rate-limit errors.
------------------------------------------------------- */
async function initLiveTickerUpdate() {
  const tickerTrack = document.getElementById("ticker-track");
  if (!tickerTrack) return;

  // Baseline market data for simulated instruments (Stocks & Bonds)
  const simulated = [
    {
      symbol: "S&amp;P 500",
      price: 5620.1,
      change: 0.68,
      prefix: "",
      decimals: 2,
      suffix: "",
    },
    {
      symbol: "AAPL",
      price: 228.4,
      change: 1.25,
      prefix: "$",
      decimals: 2,
      suffix: "",
    },
    {
      symbol: "MSFT",
      price: 415.2,
      change: 1.1,
      prefix: "$",
      decimals: 2,
      suffix: "",
    },
    {
      symbol: "TSLA",
      price: 235.5,
      change: 0.85,
      prefix: "$",
      decimals: 2,
      suffix: "",
    },
    {
      symbol: "FGN 10Y",
      price: 19.25,
      change: 0.12,
      prefix: "",
      decimals: 2,
      suffix: "%",
    },
    {
      symbol: "CBN T-BILLS",
      price: 5.5,
      change: 0.25,
      prefix: "",
      decimals: 2,
      suffix: "%",
    },
  ];

  let btc = { price: 76520, change: 1.2 };
  let eth = { price: 2432, change: 1.58 };
  let eur = { price: 0.915, change: 0.1 };
  let gbp = { price: 0.785, change: 0.08 };

  try {
    // 1. Fetch Crypto (CoinGecko API - CORS enabled, no key needed)
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
    );
    if (cryptoRes.ok) {
      const cryptoData = await cryptoRes.json();
      if (cryptoData.bitcoin) {
        btc = {
          price: cryptoData.bitcoin.usd,
          change: cryptoData.bitcoin.usd_24h_change,
        };
      }
      if (cryptoData.ethereum) {
        eth = {
          price: cryptoData.ethereum.usd,
          change: cryptoData.ethereum.usd_24h_change,
        };
      }
    }
  } catch (e) {
    // API failed, using fallback data
  }

  try {
    // 2. Fetch FX (ExchangeRate-API - CORS enabled, no key needed)
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      if (fxData.rates && fxData.rates.EUR) {
        // Mock a slight daily change for FX since the API only returns current rate
        eur = { price: fxData.rates.EUR, change: Math.random() * 0.4 - 0.2 };
        gbp = { price: fxData.rates.GBP, change: Math.random() * 0.4 - 0.2 };
      }
    }
  } catch (e) {
    // API failed, using fallback data
  }

  function fmt(val, prefix, suffix, decimals) {
    return (
      prefix +
      val.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) +
      suffix
    );
  }

  function getHtmlItem(
    symbol,
    priceObj,
    prefix = "",
    suffix = "",
    decimals = 2,
  ) {
    const chgClass = priceObj.change >= 0 ? "up" : "down";
    const chgSign = priceObj.change >= 0 ? "+" : "";
    return `<div class="ticker-item"><span class="ticker-symbol">${symbol}</span><span class="ticker-price">${fmt(priceObj.price, prefix, suffix, decimals)}</span><span class="ticker-change ${chgClass}">${chgSign}${priceObj.change.toFixed(2)}%</span></div>`;
  }

  function render() {
    let itemsHtml = "";
    // Append Simulated (Stocks/Bonds)
    simulated.forEach((s) => {
      itemsHtml += getHtmlItem(s.symbol, s, s.prefix, s.suffix, s.decimals);
    });
    // Append Live API Data
    itemsHtml += getHtmlItem("BTC/USD", btc, "$", "", 0);
    itemsHtml += getHtmlItem("ETH/USD", eth, "$", "", 2);
    itemsHtml += getHtmlItem("USD/EUR", eur, "&#8364;", "", 4);
    itemsHtml += getHtmlItem("USD/GBP", gbp, "&#163;", "", 4);

    // Duplicate once for seamless -50% CSS loop
    tickerTrack.innerHTML = itemsHtml + itemsHtml;
  }

  render();

  // Subtle drift for the simulated stock items every few seconds to look alive
  setInterval(() => {
    simulated.forEach((s) => {
      // 30% chance to drift per tick
      if (Math.random() > 0.7) {
        const move = s.price * 0.0005 * (Math.random() * 2 - 1);
        s.price = Math.max(0.01, s.price + move);
        s.change += (move / s.price) * 100 * Math.random();
      }
    });
    render();
  }, 5000);
}

/* Dashboard live simulation (if on dashboard.html) */
function initDashboardSimulator() {
  const tradeForm = document.getElementById("quick-trade-form");
  if (tradeForm) {
    tradeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const ticker = document.getElementById("trade-ticker").value;
      const amount = document.getElementById("trade-amount").value;
      const toast = document.getElementById("trade-toast");

      if (toast) {
        toast.textContent = `Order executed successfully: ₦${parseFloat(amount).toLocaleString()} of ${ticker}`;
        toast.style.display = "block";
        setTimeout(() => {
          toast.style.display = "none";
        }, 4000);
      }
    });
  }
}

/* Toast Notification System */

/* Global Scroll Animations & Lazy Loading Enhancements */
document.addEventListener("DOMContentLoaded", () => {
  // Intersection Observer for .fade-up, .fade-in, and .animate-on-scroll elements
  const scrollElements = document.querySelectorAll(
    ".fade-up, .fade-in, .animate-on-scroll, .feature-card, .course-card",
  );

  if ("IntersectionObserver" in window && scrollElements.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: "0px 0px -50px 0px",
      threshold: 0.15,
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view", "animated");
          scrollObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    scrollElements.forEach((el) => scrollObserver.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    scrollElements.forEach((el) => el.classList.add("in-view", "animated"));
  }

  // Ensure lazy loading and async decoding on all images for maximum speed
  document.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("loading")) {
      img.setAttribute("loading", "lazy");
    }
    if (!img.hasAttribute("decoding")) {
      img.setAttribute("decoding", "async");
    }
  });
});

/* --- Local JS --- */
/**
 * Crest Wealth - Index (Home) Page Specific Logic
 * Powers the interactive phone demo, MARKET WATCHlist filter and FAQ accordion.
 */

/* ------------------------------------------------------------------
   Interactive phone demo (mobile app section)
   Screen switching, cursor tilt, count-up balance, sparkline draw
   and a live status-bar clock.
------------------------------------------------------------------ */
function initPhoneDemo() {
  const scene = document.getElementById("phone-scene");
  const frame = document.getElementById("phone-frame");
  if (!scene || !frame) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* --- Screen switching --------------------------------------- */
  const views = scene.querySelectorAll(".phone-view");
  const tabs = scene.querySelectorAll(".app-tab");
  const tabBar = scene.querySelector(".app-tab-bar");

  function showView(name) {
    const active = [...tabs].findIndex((t) => t.dataset.goto === name);
    if (active < 0) return;

    views.forEach((v) =>
      v.classList.toggle("is-active", v.dataset.view === name),
    );

    tabs.forEach((t, i) => {
      const on = i === active;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      // Roving tabindex: only the selected tab stays in the tab order
      t.tabIndex = on ? 0 : -1;
    });

    // Slides the highlight behind the selected tab (.app-tab-bar::before)
    if (tabBar) tabBar.style.setProperty("--tab-index", String(active));
  }

  scene.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => showView(el.dataset.goto));
  });

  // Arrow-key support for the tab bar
  tabs.forEach((tab, i) => {
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      showView(next.dataset.goto);
    });
  });

  /* --- Cursor tilt parallax ----------------------------------- */
  if (!reduceMotion) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let raf = null;

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      frame.style.setProperty("--tilt-x", currentX.toFixed(2) + "deg");
      frame.style.setProperty("--tilt-y", currentY.toFixed(2) + "deg");
      const settled =
        Math.abs(targetX - currentX) < 0.02 &&
        Math.abs(targetY - currentY) < 0.02;
      raf = settled ? null : requestAnimationFrame(tick);
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    scene.addEventListener("pointermove", (e) => {
      // Mouse/pen only. On touch, a drag across the phone is either a page
      // scroll or the start of a tap, and tilting the mockup under a finger
      // that is mid-gesture just makes it lurch.
      if (e.pointerType === "touch") return;
      const r = scene.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      targetY = px * 22;
      targetX = -py * 16;
      start();
    });

    scene.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      start();
    });
  }

  /* --- Live status-bar clock ---------------------------------- */
  const clock = document.getElementById("app-clock");
  if (clock) {
    const paintClock = () => {
      clock.textContent = new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    };
    paintClock();
    setInterval(paintClock, 30000);
  }

  /* --- Balance count-up + sparkline draw ---------------------- */
  const balance = document.getElementById("app-balance");
  const card = scene.querySelector(".app-balance-card");

  const formatNaira = (n) => "\u20A6" + Math.round(n).toLocaleString("en-US");

  function runBalance() {
    if (!balance) return;
    const target = parseInt(balance.dataset.count, 10) || 0;
    if (reduceMotion) {
      balance.textContent = formatNaira(target);
      return;
    }
    const duration = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      balance.textContent = formatNaira(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (card) {
    const reveal = () => {
      card.classList.add("is-drawn");
      runBalance();
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal();
            obs.disconnect();
          });
        },
        { threshold: 0.4 },
      );
      io.observe(card);
    } else {
      reveal();
    }
  }

  /* --- Store badges (previously dead download links) ---------- */
  const storeNames = { ios: "App Store", android: "Google Play" };
  document.querySelectorAll(".store-badge").forEach((badge) => {
    badge.addEventListener("click", () => {
      if (typeof showToast !== "function") return;
      showToast(
        storeNames[badge.dataset.store] +
          " release is coming soon — join the waitlist to be notified.",
        "info",
        4000,
      );
    });
  });
}

/* MARKET WATCHlist Tabs */
function initMarketTabs() {
  const tabs = document.querySelectorAll(".market-tab-btn");
  const rows = document.querySelectorAll(".market-row");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-pressed", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-pressed", "true");

      const filter = tab.getAttribute("data-filter");
      rows.forEach((row) => {
        if (filter === "all" || row.getAttribute("data-category") === filter) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      });
    });
  });
}

/* FAQ Accordion */
function initFaqAccordion() {
  const items = document.querySelectorAll(".faq-item");
  items.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;
    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");
      items.forEach((i) => {
        i.classList.remove("active");
        const q = i.querySelector(".faq-question");
        if (q) q.setAttribute("aria-expanded", "false");
      });
      if (!isActive) {
        item.classList.add("active");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/* --- Inline JS --- */
