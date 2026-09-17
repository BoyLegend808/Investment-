/**
 * Novara Capital - Rates & Pricing Page Logic
 * Rate comparison highlights and interactive savings calculator.
 */

document.addEventListener('DOMContentLoaded', () => {
  const rows = document.querySelectorAll('.market-table tbody tr');
  rows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.transition = 'background 0.15s ease';
    });
  });
});
