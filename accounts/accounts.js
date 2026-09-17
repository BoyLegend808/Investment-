/**
 * Novara Capital - Accounts Page Logic
 * Handles account query parameters, interactive product filter, and quick opening.
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

document.addEventListener('DOMContentLoaded', () => {
  // Check URL parameters for tier redirection from VaultX
  const urlParams = new URLSearchParams(window.location.search);
  const tier = urlParams.get('tier');
  
  if (tier) {
    const fixedLockCard = document.getElementById('fixed-lock');
    if (fixedLockCard) {
      fixedLockCard.scrollIntoView({ behavior: 'smooth' });
      fixedLockCard.style.outline = '2px solid var(--color-ember)';
      fixedLockCard.style.boxShadow = '0 0 24px rgba(255, 85, 0, 0.25)';
      
      const badge = document.createElement('div');
      badge.style.background = 'var(--color-ember)';
      badge.style.color = '#fff';
      badge.style.padding = '4px 12px';
      badge.style.fontSize = '0.78rem';
      badge.style.fontFamily = 'var(--font-mono)';
      badge.style.borderRadius = 'var(--radius-xs)';
      badge.style.marginBottom = '12px';
      badge.style.display = 'inline-block';
      badge.textContent = `SELECTED TIER: LEVEL ${tier}`;
      fixedLockCard.prepend(badge);
    }
  }

  // Account quick action buttons
  const actionButtons = document.querySelectorAll('.btn-card-action');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.product-card');
      const title = card ? card.querySelector('.product-title').textContent : 'Investment Account';
      showToast(`Opening verification for ${title}. Connecting to Novara Identity Custody...`, 'success');
    });
  });
});
