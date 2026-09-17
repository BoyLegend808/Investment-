/**
 * Novara Capital - Investments & VaultX Yield Calculator
 * Real-world tier data matching Levels 1 - 10
 */

/* Toast Notification System */
function showToast(message, type = 'success', duration = 4000) {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;
  
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

  if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

const PORTFOLIO_TIERS = [
  { level: 1, name: "Conservative Growth", package: 1000, targetApy: "4.5%", annualYield: 45, allocation: "Short-Term Treasuries & Money Market" },
  { level: 2, name: "Balanced Asset Allocation", package: 5000, targetApy: "6.2%", annualYield: 310, allocation: "60% Blue-Chip Equities / 40% Bonds" },
  { level: 3, name: "Global Equity Index", package: 15000, targetApy: "7.8%", annualYield: 1170, allocation: "Global S&P 500 & Tech ETFs" },
  { level: 4, name: "Diversified Wealth Portfolio", package: 30000, targetApy: "8.5%", annualYield: 2550, allocation: "Equities, REITs & Corporate Debt" },
  { level: 5, name: "Private Wealth Preferred", package: 50000, targetApy: "9.6%", annualYield: 4800, allocation: "Custom Multi-Asset Strategy" },
  { level: 6, name: "Institutional Private Tier", package: 100000, targetApy: "10.8%", annualYield: 10800, allocation: "Direct Equities & Private Credit" }
];

document.addEventListener('DOMContentLoaded', () => {
  const tierSlider = document.getElementById('vaultTierSlider');
  const sliderLevelLabel = document.getElementById('sliderLevelLabel');
  const simLevelDisplay = document.getElementById('simLevelDisplay');
  const simPackageDisplay = document.getElementById('simPackageDisplay');
  const simBonusDisplay = document.getElementById('simBonusDisplay');
  const simDailyDisplay = document.getElementById('simDailyDisplay');
  const simMonthlyDisplay = document.getElementById('simMonthlyDisplay');
  const rows = document.querySelectorAll('.vaultx-row');
  const ctaBtn = document.getElementById('btnJoinVaultX');

  function updateTier(levelNum) {
    const tier = PORTFOLIO_TIERS.find(t => t.level === levelNum) || PORTFOLIO_TIERS[0];
    
    if (tierSlider) tierSlider.value = tier.level;
    if (sliderLevelLabel) sliderLevelLabel.textContent = `Tier ${tier.level}`;
    if (simLevelDisplay) simLevelDisplay.textContent = tier.name;
    if (simPackageDisplay) simPackageDisplay.textContent = `$${tier.package.toLocaleString()}`;
    if (simBonusDisplay) simBonusDisplay.textContent = tier.targetApy;
    if (simDailyDisplay) simDailyDisplay.textContent = `$${tier.annualYield.toLocaleString()}`;
    if (simMonthlyDisplay) simMonthlyDisplay.textContent = tier.allocation;

    // Highlight corresponding row
    rows.forEach(row => {
      const rowLevel = parseInt(row.getAttribute('data-level'), 10);
      if (rowLevel === tier.level) {
        row.classList.add('active-tier');
      } else {
        row.classList.remove('active-tier');
      }
    });
  }

  // Event listener for table row clicks
  rows.forEach(row => {
    row.addEventListener('click', () => {
      const lvl = parseInt(row.getAttribute('data-level'), 10);
      updateTier(lvl);
    });
  });

  // Event listener for slider
  if (tierSlider) {
    tierSlider.addEventListener('input', (e) => {
      updateTier(parseInt(e.target.value, 10));
    });
  }

  // CTA button click
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      const activeTier = tierSlider ? tierSlider.value : '1';
      showToast(`Selecting Portfolio Tier ${activeTier}. Redirecting to account registration...`, 'success');
      setTimeout(() => {
        window.location.href = '../accounts/accounts.html?tier=' + activeTier;
      }, 1500);
    });
  }

  // Default to Tier 2
  updateTier(2);
});


