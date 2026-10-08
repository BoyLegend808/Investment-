import os

html_path = 'dashboard.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = [
  ('<div class="portfolio-hero-label">Total Portfolio Value</div>', '<div class="portfolio-hero-label">Cash Balance</div>'),
  ('id="portfolioValue"', 'id="cashBalanceHeroVal"'),
  ('+&#8358;29,200 this month &nbsp;&bull;&nbsp; +2.4%', 'Available to invest or withdraw'),
  ('<div class="stat-item-label">Cash Balance</div>\n          <div class="stat-item-value" id="cashBalanceVal">&#8358;84,200</div>\n          <div class="stat-item-sub neutral">Uninvested &bull; Available</div>', '<div class="stat-item-label">Total Portfolio Value</div>\n          <div class="stat-item-value" id="portfolioValue">&#8358;1,248,500</div>\n          <div class="stat-item-sub positive">+&#8358;29,200 this month</div>'),
  ('<div class="stat-item-label">Total Invested</div>\n          <div class="stat-item-value">&#8358;976,800</div>', '<div class="stat-item-label">Total Invested</div>\n          <div class="stat-item-value" id="totalInvestedVal">&#8358;976,800</div>'),
  ('<div class="stat-item-label">Accrued Interest</div>\n          <div class="stat-item-value positive">&#8358;187,500</div>', '<div class="stat-item-label">Accrued Interest</div>\n          <div class="stat-item-value positive" id="totalAccruedVal">&#8358;187,500</div>'),
  ('<span>Fixed Lock</span>', '<span>Level 1 Package</span>'),
  ('<span>NGX Stocks</span>', '<span>Level 2 Package</span>'),
  ('<span>T-Bills</span>', '<span>Level 3 Package</span>'),
  ('<div class="txn-name">Fixed Lock Deposit</div>', '<div class="txn-name">Level 1 Package Deposit</div>'),
  ('<div class="txn-name">GTCO Share Purchase</div>', '<div class="txn-name">Level 2 Package Purchase</div>'),
  ('<div class="inv-name">Fixed Lock Deposit</div>', '<div class="inv-name">Level 1 Package</div>'),
  ('<div class="inv-name">NGX Stock Portfolio</div>', '<div class="inv-name">Level 2 Package</div>'),
  ('<div class="inv-name">Federal Treasury Bills</div>', '<div class="inv-name">Level 3 Package</div>'),
  ('<td>Fixed Lock Deposit</td>', '<td>Level 1 Package Deposit</td>'),
  ('<td>GTCO Share Purchase</td>', '<td>Level 2 Package Purchase</td>'),
  ('<td>T-Bill Purchase 364d</td>', '<td>Level 3 Package Purchase</td>'),
  ('<strong>Crest Stash</strong>', '<strong>Level 1 Package</strong>'),
  ('<strong>Bronze Lock</strong>', '<strong>Level 2 Package</strong>'),
  ('<strong>Silver Growth</strong>', '<strong>Level 3 Package</strong>'),
  ('<strong>Gold Vault</strong>', '<strong>Level 4 Package</strong>'),
  ('<strong>VaultX VIP</strong>', '<strong>Level 5 Package</strong>')
]

for old, new in replacements:
    html = html.replace(old, new)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Replacement complete.")
