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

const VAULTX_TIERS = [
  { level: 1, package: 5000, bonus: 250, daily: 900 },
  { level: 2, package: 15000, bonus: 750, daily: 2700 },
  { level: 3, package: 30000, bonus: 1500, daily: 5400 },
  { level: 4, package: 50000, bonus: 2500, daily: 9000 },
  { level: 5, package: 75000, bonus: 3750, daily: 13500 },
  { level: 6, package: 100000, bonus: 5000, daily: 18000 },
  { level: 7, package: 200000, bonus: 10000, daily: 36000 },
  { level: 8, package: 350000, bonus: 17500, daily: 63000 },
  { level: 9, package: 500000, bonus: 25000, daily: 90000 },
  { level: 10, package: 1000000, bonus: 50000, daily: 180000 }
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
    const tier = VAULTX_TIERS.find(t => t.level === levelNum) || VAULTX_TIERS[0];
    
    if (tierSlider) tierSlider.value = tier.level;
    if (sliderLevelLabel) sliderLevelLabel.textContent = `Level ${tier.level}`;
    if (simLevelDisplay) simLevelDisplay.textContent = `Level ${tier.level}`;
    if (simPackageDisplay) simPackageDisplay.textContent = `$${tier.package.toLocaleString()}`;
    if (simBonusDisplay) simBonusDisplay.textContent = `$${tier.bonus.toLocaleString()}`;
    if (simDailyDisplay) simDailyDisplay.textContent = `$${tier.daily.toLocaleString()}`;
    
    const monthly = tier.daily * 30;
    if (simMonthlyDisplay) simMonthlyDisplay.textContent = `$${monthly.toLocaleString()}`;

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
      showToast(`Activating VaultX Tier Level ${activeTier}. Redirecting to secure verification...`, 'success');
      setTimeout(() => {
        window.location.href = '../accounts/accounts.html?tier=' + activeTier;
      }, 1500);
    });
  }

  // Default to Level 4
  updateTier(4);
});

