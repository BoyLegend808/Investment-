/**
 * Novara Capital - Index (Home) Page Specific Logic
 * Powers the compound interest simulator, market ESTchlist filter, and FAQ accordion.
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

