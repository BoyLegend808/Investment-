/**
 * Novara Capital - Core Application Scripts & Interactions
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

/* Market ESTchlist Tabs */
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
    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!signinForm.checkValidity()) {
        signinForm.reportValidity();
        return;
      }
      const btn = signinForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Authenticating...';
      setTimeout(() => {
        btn.textContent = 'Redirecting to Demo...';
        if (typeof showToast === 'function') {
          showToast('Demo Mode: Logging into mock dashboard', 'info', 3000);
        }
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      }, 800);
    });
  }

  const signupForm = document.getElementById('form-signup');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!signupForm.checkValidity()) {
        signupForm.reportValidity();
        return;
      }
      const btn = signupForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Creating Account...';
      setTimeout(() => {
        btn.textContent = 'Account Created!';
        if (typeof showToast === 'function') {
          showToast('Demo Mode: Account simulated successfully', 'success', 3000);
        }
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      }, 900);
    });
  }
}

/* Live Market Ticker with Real API Data and Infinite Scroll */
async function initLiveTickerUpdate() {
  const tickerTrack = document.querySelector('.ticker-track');
  if (!tickerTrack) return;

  // Add loading state
  tickerTrack.innerHTML = '<div class="ticker-item">Loading market data...</div>';

  try {
    // Check cache first (5-minute cache)
    const cacheKey = 'novara_ticker_data';
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(cacheKey + '_time');
    const now = Date.now();
    
    // Use cached data if less than 5 minutes old
    if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 300000) {
      const data = JSON.parse(cachedData);
      renderTickerData(data, tickerTrack);
      return;
    }

    // 1. Fetch Crypto data from CoinGecko (Free, No API Key, No Costs)
    const cgResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
    if (!cgResponse.ok) throw new Error('CoinGecko API failed');
    const cryptoData = await cgResponse.json();

    // 2. Fetch Exchange Rates (Free, No API Key, No Costs)
    const fxResponse = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!fxResponse.ok) throw new Error('Exchange Rate API failed');
    const fxData = await fxResponse.json();
    
    if (!fxData.rates || !fxData.rates.EUR || !fxData.rates.GBP) {
      throw new Error('Invalid exchange rate data');
    }

    const usdEur = fxData.rates.EUR;
    const usdGbp = fxData.rates.GBP;

    // Build ticker data object
    const tickerData = {
      btc: {
        price: cryptoData.bitcoin?.usd || 0,
        change: cryptoData.bitcoin?.usd_24h_change || 0
      },
      eth: {
        price: cryptoData.ethereum?.usd || 0,
        change: cryptoData.ethereum?.usd_24h_change || 0
      },
      eur: usdEur,
      gbp: usdGbp
    };

    // Cache the data
    localStorage.setItem(cacheKey, JSON.stringify(tickerData));
    localStorage.setItem(cacheKey + '_time', now.toString());

    renderTickerData(tickerData, tickerTrack);

  } catch (error) {
    console.error("Failed to fetch ticker data", error);
    
    // Fallback to cached data if available
    const cachedData = localStorage.getItem('novara_ticker_data');
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData);
        renderTickerData(data, tickerTrack);
        return;
      } catch (e) {
        console.error('Failed to parse cached data', e);
      }
    }

    // Final fallback to static data
    const fallbackData = {
      btc: { price: 76520, change: 1.20 },
      eth: { price: 2432, change: 1.58 },
      eur: 0.8693,
      gbp: 0.7449
    };
    renderTickerData(fallbackData, tickerTrack);
  }
}

function renderTickerData(data, tickerTrack) {
  const btcPrice = data.btc.price.toLocaleString('en-US');
  const btcChange = data.btc.change || 0;
  const ethPrice = data.eth.price.toLocaleString('en-US');
  const ethChange = data.eth.change || 0;
  const usdEur = data.eur || 0.8693;
  const usdGbp = data.gbp || 0.7449;

  let itemsHtml = `
    <div class="ticker-item"><span class="ticker-symbol">BTC/USD</span> <span class="ticker-price">$${btcPrice}</span> <span class="ticker-change ${btcChange >= 0 ? 'up' : 'down'}">${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(2)}%</span></div>
    <div class="ticker-item"><span class="ticker-symbol">ETH/USD</span> <span class="ticker-price">$${ethPrice}</span> <span class="ticker-change ${ethChange >= 0 ? 'up' : 'down'}">${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(2)}%</span></div>
    <div class="ticker-item"><span class="ticker-symbol">USD/EUR</span> <span class="ticker-price">&#8364;${usdEur.toFixed(4)}</span> <span class="ticker-change up">Live</span></div>
    <div class="ticker-item"><span class="ticker-symbol">USD/GBP</span> <span class="ticker-price">&#163;${usdGbp.toFixed(4)}</span> <span class="ticker-change up">Live</span></div>
    <div class="ticker-item"><span class="ticker-symbol">TSLA</span> <span class="ticker-price">$185.00</span> <span class="ticker-change up">+2.15%</span></div>
  `;

  // Duplicate content for seamless infinite scroll
  let fullHtml = "";
  for (let i = 0; i < 10; i++) {
    fullHtml += itemsHtml;
  }
  tickerTrack.innerHTML = fullHtml;
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
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
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

