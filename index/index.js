/**
 * Crest Wealth - Core Application Scripts & Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  initCalculator();
  initMarketTabs();
  initFaqAccordion();
  initModals();
  initLiveTickerUpdate();
  initDashboardSimulator();
});

/* Header scroll effect */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* Mobile Drawer Menu */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const closeBtn = document.querySelector('.drawer-close');
  
  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }
  
  function closeDrawer() {
    if (drawer && drawer.classList.contains('active')) {
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (closeBtn && drawer) {
    closeBtn.addEventListener('click', closeDrawer);
  }

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (drawer && drawer.classList.contains('active')) {
      // If the click is not inside the drawer, close it
      if (!drawer.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        closeDrawer();
      }
    }
  });

  // Also close on touch outside (for mobile touch interfaces)
  document.addEventListener('touchstart', (e) => {
    if (drawer && drawer.classList.contains('active')) {
      if (!drawer.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        closeDrawer();
      }
    }
  });
}

/* Interactive Compound Investment Calculator */
function initCalculator() {
  const initialRange = document.getElementById('calc-initial');
  const monthlyRange = document.getElementById('calc-monthly');
  const yearsRange = document.getElementById('calc-years');
  const rateRange = document.getElementById('calc-rate');

  const initialVal = document.getElementById('calc-initial-val');
  const monthlyVal = document.getElementById('calc-monthly-val');
  const yearsVal = document.getElementById('calc-years-val');
  const rateVal = document.getElementById('calc-rate-val');

  const totalWealthEl = document.getElementById('calc-total-wealth');
  const totalDepositEl = document.getElementById('calc-total-deposit');
  const totalInterestEl = document.getElementById('calc-total-interest');

  if (!initialRange || !totalWealthEl) return;

  function formatDollars(num) {
    return '$' + Math.round(num).toLocaleString('en-US');
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

    const totalDeposited = P + (PMT * n);
    const totalInterest = Math.max(0, fv - totalDeposited);

    if (initialVal) initialVal.textContent = formatDollars(P);
    if (monthlyVal) monthlyVal.textContent = formatDollars(PMT) + '/mo';
    if (yearsVal) yearsVal.textContent = years + (years === 1 ? ' Year' : ' Years');
    if (rateVal) rateVal.textContent = (annualRate * 100).toFixed(1) + '% p.a.';

    totalWealthEl.textContent = formatDollars(fv);
    if (totalDepositEl) totalDepositEl.textContent = formatDollars(totalDeposited);
    if (totalInterestEl) totalInterestEl.textContent = formatDollars(totalInterest);
  }

  [initialRange, monthlyRange, yearsRange, rateRange].forEach(range => {
    if (range) {
      range.addEventListener('input', recalculate);
    }
  });

  recalculate();
}

/* MARKET WATCHlist Tabs */
function initMarketTabs() {
  const tabs = document.querySelectorAll('.market-tab-btn');
  const rows = document.querySelectorAll('.market-row');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');
      rows.forEach(row => {
        if (filter === 'all' || row.getAttribute('data-category') === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });
}

/* FAQ Accordion */
function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        items.forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
}

/* Modals (Get Started, Sign In, Demo) */
function initModals() {
  const signinTriggers = document.querySelectorAll('[data-modal="signin"]');
  const signupTriggers = document.querySelectorAll('[data-modal="signup"]');
  const modalBackdrops = document.querySelectorAll('.modal-backdrop');
  const closeBtns = document.querySelectorAll('.modal-close');

  const signinModal = document.getElementById('signin-modal');
  const signupModal = document.getElementById('signup-modal');

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeAllModals() {
    modalBackdrops.forEach(modal => modal.classList.remove('active'));
    document.body.style.overflow = '';
  }

  // Intercept clicks on auth-required links
  const authLinks = document.querySelectorAll('.auth-required');
  authLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      const authed = await crestIsAuthenticated();
      if (!authed) {
        e.preventDefault();
        openModal(signinModal);
        if (typeof showToast === 'function') {
          showToast('Please log in or register to access this feature.', 'warning', 3500);
        }
      }
    });
  });

  signinTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllModals();
      openModal(signinModal);
    });
  });

  signupTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllModals();
      openModal(signupModal);
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  modalBackdrops.forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeAllModals();
      }
    });
  });

  // Handle Form Submissions
  const signinForm = document.getElementById('form-signin');
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!signinForm.checkValidity()) { signinForm.reportValidity(); return; }
      const email = document.getElementById('signin-email')?.value?.trim() || signinForm.querySelector('input[type="email"]')?.value?.trim();
      const password = document.getElementById('signin-password')?.value || signinForm.querySelector('input[type="password"]')?.value;
      const btn = signinForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Authenticating...';
      const result = await crestSignIn(email, password);
      if (!result.success) {
        if (typeof showToast === 'function') showToast(result.error, 'error', 4000);
        btn.disabled = false;
        btn.textContent = 'Log In';
        return;
      }
      btn.textContent = 'Redirecting...';
      if (typeof showToast === 'function') showToast('Authentication successful!', 'success', 3000);
      setTimeout(() => crestRedirectToDashboard(), 1200);
    });
  }

  const signupForm = document.getElementById('form-signup');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!signupForm.checkValidity()) { signupForm.reportValidity(); return; }
      const name = signupForm.querySelector('input[name="name"],#signup-name,#fullname')?.value?.trim() || '';
      const email = document.getElementById('signup-email')?.value?.trim() || signupForm.querySelector('input[type="email"]')?.value?.trim();
      const password = document.getElementById('signup-password')?.value || signupForm.querySelector('input[type="password"]')?.value;
      const btn = signupForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creating Account...';
      const result = await crestSignUp(email, password, name);
      if (!result.success) {
        if (typeof showToast === 'function') showToast(result.error, 'error', 4000);
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
      }
      btn.textContent = 'Account Created!';
      if (!result.data.session) {
        if (typeof showToast === 'function') showToast('Account created! Please check your email to verify your account.', 'success', 6000);
        btn.textContent = 'Check your email';
      } else {
        if (typeof showToast === 'function') showToast('Account created! Redirecting...', 'success', 3000);
        setTimeout(() => crestRedirectToDashboard(), 1500);
      }
    });
  }

  // Check URL params for login required (e.g. redirected by auth-guard.js)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('loginRequired') === 'true') {
    // Open modal slightly delayed so user sees homepage first
    setTimeout(() => {
      openModal(signinModal);
      if (typeof showToast === 'function') {
        showToast('Please log in to view the requested page.', 'warning', 4000);
      }
    }, 500);
  }
}

/* -------------------------------------------------------
   Hybrid Live Market Ticker
   Uses free CORS-enabled APIs for Crypto & FX.
   Simulates Stocks & Bonds to avoid rate-limit errors.
------------------------------------------------------- */
async function initLiveTickerUpdate() {
  const tickerTrack = document.getElementById('ticker-track');
  if (!tickerTrack) return;

  // Baseline market data for simulated instruments (Stocks & Bonds)
  const simulated = [
    { symbol: 'S&amp;P 500', price: 5620.10, change:  0.68, prefix: '',  decimals: 2, suffix: '' },
    { symbol: 'AAPL',      price: 228.40,   change:  1.25, prefix: '$', decimals: 2, suffix: '' },
    { symbol: 'MSFT',      price: 415.20,   change:  1.10, prefix: '$', decimals: 2, suffix: '' },
    { symbol: 'TSLA',      price: 235.50,   change:  0.85, prefix: '$', decimals: 2, suffix: '' },
    { symbol: 'FGN 10Y',   price: 19.25,    change:  0.12, prefix: '',  decimals: 2, suffix: '%' },
    { symbol: 'CBN T-BILLS', price: 5.50,   change:  0.25, prefix: '',  decimals: 2, suffix: '%' },
  ];

  let btc = { price: 76520, change: 1.20 };
  let eth = { price: 2432, change: 1.58 };
  let eur = { price: 0.9150, change: 0.10 };
  let gbp = { price: 0.7850, change: 0.08 };

  try {
    // 1. Fetch Crypto (CoinCap API - CORS enabled, no key needed)
    const cryptoRes = await fetch('https://api.coincap.io/v2/assets?ids=bitcoin,ethereum');
    if (cryptoRes.ok) {
      const cryptoData = await cryptoRes.json();
      const bData = cryptoData.data.find(d => d.id === 'bitcoin');
      const eData = cryptoData.data.find(d => d.id === 'ethereum');
      if (bData) btc = { price: parseFloat(bData.priceUsd), change: parseFloat(bData.changePercent24Hr) };
      if (eData) eth = { price: parseFloat(eData.priceUsd), change: parseFloat(eData.changePercent24Hr) };
    }
  } catch (e) {
    // API failed, using fallback data
  }

  try {
    // 2. Fetch FX (ExchangeRate-API - CORS enabled, no key needed)
    const fxRes = await fetch('https://open.er-api.com/v6/latest/USD');
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      if (fxData.rates && fxData.rates.EUR) {
        // Mock a slight daily change for FX since the API only returns current rate
        eur = { price: fxData.rates.EUR, change: (Math.random() * 0.4 - 0.2) };
        gbp = { price: fxData.rates.GBP, change: (Math.random() * 0.4 - 0.2) };
      }
    }
  } catch (e) {
    // API failed, using fallback data
  }

  function fmt(val, prefix, suffix, decimals) {
    return prefix + val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) + suffix;
  }

  function getHtmlItem(symbol, priceObj, prefix = '', suffix = '', decimals = 2) {
    const chgClass = priceObj.change >= 0 ? 'up' : 'down';
    const chgSign  = priceObj.change >= 0 ? '+' : '';
    return `<div class="ticker-item"><span class="ticker-symbol">${symbol}</span><span class="ticker-price">${fmt(priceObj.price, prefix, suffix, decimals)}</span><span class="ticker-change ${chgClass}">${chgSign}${priceObj.change.toFixed(2)}%</span></div>`;
  }

  function render() {
    let itemsHtml = '';
    // Append Simulated (Stocks/Bonds)
    simulated.forEach(s => {
      itemsHtml += getHtmlItem(s.symbol, s, s.prefix, s.suffix, s.decimals);
    });
    // Append Live API Data
    itemsHtml += getHtmlItem('BTC/USD', btc, '$', '', 0);
    itemsHtml += getHtmlItem('ETH/USD', eth, '$', '', 2);
    itemsHtml += getHtmlItem('USD/EUR', eur, '&#8364;', '', 4);
    itemsHtml += getHtmlItem('USD/GBP', gbp, '&#163;', '', 4);

    // Duplicate once for seamless -50% CSS loop
    tickerTrack.innerHTML = itemsHtml + itemsHtml;
  }

  render();

  // Subtle drift for the simulated stock items every few seconds to look alive
  setInterval(() => {
    simulated.forEach(s => {
      // 30% chance to drift per tick
      if (Math.random() > 0.7) {
        const move = s.price * 0.0005 * (Math.random() * 2 - 1);
        s.price = Math.max(0.01, s.price + move);
        s.change += move / s.price * 100 * (Math.random());
      }
    });
    render();
  }, 5000);
}


/* Dashboard live simulation (if on dashboard.html) */
function initDashboardSimulator() {
  const tradeForm = document.getElementById('quick-trade-form');
  if (tradeForm) {
    tradeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const ticker = document.getElementById('trade-ticker').value;
      const amount = document.getElementById('trade-amount').value;
      const toast = document.getElementById('trade-toast');
      
      if (toast) {
        toast.textContent = `Order executed successfully: ₦${parseFloat(amount).toLocaleString()} of ${ticker}`;
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 4000);
      }
    });
  }
}

/* Toast Notification System */

/* Global Scroll Animations & Lazy Loading Enhancements */
document.addEventListener('DOMContentLoaded', () => {
  // Intersection Observer for .fade-up, .fade-in, and .animate-on-scroll elements
  const scrollElements = document.querySelectorAll('.fade-up, .fade-in, .animate-on-scroll, .feature-card, .course-card');
  
  if ('IntersectionObserver' in window && scrollElements.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.15
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view', 'animated');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    scrollElements.forEach(el => scrollObserver.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    scrollElements.forEach(el => el.classList.add('in-view', 'animated'));
  }

  // Ensure lazy loading and async decoding on all images for maximum speed
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
  });
});




/* --- Local JS --- */
/**
 * Crest Wealth - Index (Home) Page Specific Logic
 * Powers the compound interest simulator, MARKET WATCHlist filter, and FAQ accordion.
 */

document.addEventListener('DOMContentLoaded', () => {
  initCompoundCalculator();
  initMarketTabs();
});

/* Interactive Compound Investment Calculator */
function initCompoundCalculator() {
  const initialRange = document.getElementById('calc-initial');
  const monthlyRange = document.getElementById('calc-monthly');
  const yearsRange = document.getElementById('calc-years');
  const rateRange = document.getElementById('calc-rate');

  const initialVal = document.getElementById('calc-initial-val');
  const monthlyVal = document.getElementById('calc-monthly-val');
  const yearsVal = document.getElementById('calc-years-val');
  const rateVal = document.getElementById('calc-rate-val');

  const totalWealthEl = document.getElementById('calc-total-wealth');
  const totalDepositEl = document.getElementById('calc-total-deposit');
  const totalInterestEl = document.getElementById('calc-total-interest');

  if (!initialRange || !totalWealthEl) return;

  function formatDollars(num) {
    return '$' + Math.round(num).toLocaleString('en-US');
  }

  function recalculate() {
    const P = parseFloat(initialRange.value);
    const PMT = parseFloat(monthlyRange.value);
    const years = parseFloat(yearsRange.value);
    const annualRate = parseFloat(rateRange.value) / 100;
    const r = annualRate / 12;
    const n = years * 12;

    // Compound interest formula: FV = P*(1+r)^n + PMT*(( (1+r)^n - 1 ) / r)
    let fv = P * Math.pow(1 + r, n);
    if (r > 0) {
      fv += PMT * ((Math.pow(1 + r, n) - 1) / r);
    } else {
      fv += PMT * n;
    }

    const totalDeposited = P + (PMT * n);
    const totalInterest = Math.max(0, fv - totalDeposited);

    if (initialVal) initialVal.textContent = formatDollars(P);
    if (monthlyVal) monthlyVal.textContent = formatDollars(PMT) + '/mo';
    if (yearsVal) yearsVal.textContent = years + (years === 1 ? ' Year' : ' Years');
    if (rateVal) rateVal.textContent = (annualRate * 100).toFixed(1) + '% p.a.';

    totalWealthEl.textContent = formatDollars(fv);
    if (totalDepositEl) totalDepositEl.textContent = formatDollars(totalDeposited);
    if (totalInterestEl) totalInterestEl.textContent = formatDollars(totalInterest);
  }

  [initialRange, monthlyRange, yearsRange, rateRange].forEach(range => {
    if (range) {
      range.addEventListener('input', recalculate);
    }
  });

  recalculate();
}

/* MARKET WATCHlist Tabs */
function initMarketTabs() {
  const tabs = document.querySelectorAll('.market-tab-btn');
  const rows = document.querySelectorAll('.market-row');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');
      rows.forEach(row => {
        if (filter === 'all' || row.getAttribute('data-category') === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });
}



/* --- Inline JS --- */


