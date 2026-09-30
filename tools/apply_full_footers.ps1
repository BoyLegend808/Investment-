$files = @(
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/accounts/accounts.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/investments/investments.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/pricing/pricing.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/academy/academy.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/security/security.html"
)

$fullFooter = @"
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top-grid">
        <div class="footer-brand">
          <h3>NOVARA CAPITAL</h3>
          <p>
            Secure, transparent, and accessible investment solutions engineered for long-term African wealth creation.
          </p>
          <div style="display: flex; gap: 16px; color: #FFFFFF; font-size: 0.82rem; align-items: center;">
            <span style="display: inline-flex; align-items: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>SEC-Compliant Trustees</span>
            <span style="display: inline-flex; align-items: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>NDPR Certified</span>
          </div>
        </div>

        <div class="footer-col">
          <h4>Save &amp; Invest</h4>
          <ul class="footer-links">
            <li><a href="../accounts/accounts.html#stash">Novara Stash (4.2%)</a></li>
            <li><a href="../accounts/accounts.html#fixed-lock">Fixed Lock (5.5%)</a></li>
            <li><a href="../accounts/accounts.html#goals">Goal Tracker</a></li>
            <li><a href="../investments/investments.html#dollar-vault">Dollar Vault</a></li>
            <li><a href="../pricing/pricing.html">Current Rates</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Investments</h4>
          <ul class="footer-links">
            <li><a href="../investments/investments.html#stocks">NGX Stock Market</a></li>
            <li><a href="../investments/investments.html#stocks">US Global Equities</a></li>
            <li><a href="../investments/investments.html#tbills">Treasury Bills</a></li>
            <li><a href="../investments/investments.html#mutual-funds">Mutual Funds</a></li>
            <li><a href="../investments/investments.html#real-estate">Real Estate Trust</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Academy &amp; Tools</h4>
          <ul class="footer-links">
            <li><a href="../academy/academy.html">Financial Academy</a></li>
            <li><a href="../academy/academy.html#calculator">Compound Calculator</a></li>
            <li><a href="../academy/academy.html#guides">Beginner Guides</a></li>
            <li><a href="#">Web Platform Demo</a></li>
            <li><a href="../academy/academy.html#glossary">Market Glossary</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Company</h4>
          <ul class="footer-links">
            <li><a href="#">Our Story</a></li>
            <li><a href="../security/security.html">Security Architecture</a></li>
            <li><a href="#">Leadership</a></li>
            <li><a href="#">Contact Support</a></li>
            <li><a href="#">Careers</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p style="text-align: center; margin-bottom: 12px;">
          Novara Capital is an investment platform. All investments carry risk. Read disclosures <a href="../security/security.html">here</a>.
        </p>
        <p style="text-align: center; font-size: 0.75rem; color: #5B7068;">
          © 2026 Novara Capital Ltd. All rights reserved. Investment products are managed in partnership with SEC-registered Trustees and licensed Asset Custodians. Past performance is no guarantee of future returns.
        </p>
      </div>
    </div>
  </footer>
"@

foreach ($file in $files) {
    $content = Get-Content -Raw -Path $file
    $content = $content -replace '(?s)<footer class="site-footer">.*?</footer>', $fullFooter
    Set-Content -Path $file -Value $content
}
