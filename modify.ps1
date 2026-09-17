$path = 'accounts/accounts.html'
if (Test-Path $path) {
    $content = Get-Content $path -Raw
    $newSection = @"
  <!-- ACCOUNT COMPARISON TABLE -->
  <section class="account-comparison-section" style="padding: 80px 0; background: #FAF9F6; border-top: 1px solid #E5E7EB;">
    <div class="container">
      <div class="section-header-center">
        <span class="section-tag">CHOOSE YOUR PATH</span>
        <h2 class="section-title">Compare Account Types</h2>
        <p class="section-subtitle">Find the perfect account structure for your capital.</p>
      </div>
      <div style="overflow-x: auto; margin-top: 40px; border-radius: 16px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <table style="width: 100%; min-width: 800px; border-collapse: collapse; text-align: left; background: #FFF;">
          <thead style="background: #0B251A; color: #FFF;">
            <tr>
              <th style="padding: 20px; font-weight: 600;">Feature</th>
              <th style="padding: 20px; font-weight: 600; border-left: 1px solid rgba(255,255,255,0.1);">Novara Stash</th>
              <th style="padding: 20px; font-weight: 600; border-left: 1px solid rgba(255,255,255,0.1);">Fixed Lock</th>
              <th style="padding: 20px; font-weight: 600; border-left: 1px solid rgba(255,255,255,0.1);">Dollar Vault</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 20px; font-weight: 500;">Annual Yield (Up to)</td>
              <td style="padding: 20px; color: #10B981; font-weight: 700; border-left: 1px solid #E5E7EB;">11.5%</td>
              <td style="padding: 20px; color: #10B981; font-weight: 700; border-left: 1px solid #E5E7EB;">16.8%</td>
              <td style="padding: 20px; color: #10B981; font-weight: 700; border-left: 1px solid #E5E7EB;">7.5% (USD)</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 20px; font-weight: 500;">Withdrawal Access</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">Instant (24/7)</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">At Maturity</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">Quarterly / At Maturity</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 20px; font-weight: 500;">Capital Protection</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">NDIC Insured</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">Bank Guarantee</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">Sovereign Backed</td>
            </tr>
            <tr>
              <td style="padding: 20px; font-weight: 500;">Minimum Deposit</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">&#8358;1,000</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">&#8358;50,000</td>
              <td style="padding: 20px; border-left: 1px solid #E5E7EB;">$100</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <footer class="site-footer">
"@
    $content = $content -replace '  <footer class="site-footer">', $newSection
    Set-Content -Path $path -Value $content -Encoding UTF8
}

$path = 'pricing/pricing.html'
if (Test-Path $path) {
    $content = Get-Content $path -Raw
    $newSection = @"
  <!-- NO HIDDEN FEES GUARANTEE -->
  <section class="fee-guarantee-section" style="padding: 80px 0; background: #0B251A; color: #FFF; text-align: center;">
    <div class="container">
      <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); color: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
      </div>
      <h2 style="font-size: 2rem; margin-bottom: 16px;">Our Ironclad Fee Guarantee</h2>
      <p style="font-size: 1.1rem; color: #A3B8B0; max-width: 600px; margin: 0 auto 32px; line-height: 1.6;">
        Unlike traditional banks, we don't believe in penalizing you for saving your money. No maintenance fees. No dormant account fees. No minimum balance penalties. Ever.
      </p>
      <a href="../index/index.html#signup" class="btn-card-action" style="background: #10B981; color: #0B251A; border: none; font-weight: 700; display: inline-block;">Open a Free Account</a>
    </div>
  </section>

  <footer class="site-footer">
"@
    $content = $content -replace '  <footer class="site-footer">', $newSection
    Set-Content -Path $path -Value $content -Encoding UTF8
}

$path = 'security/security.html'
if (Test-Path $path) {
    $content = Get-Content $path -Raw
    $newSection = @"
  <!-- CERTIFICATIONS & AUDITS -->
  <section class="certifications-section" style="padding: 80px 0; background: #FAF9F6; border-top: 1px solid #E5E7EB;">
    <div class="container">
      <div class="section-header-center">
        <span class="section-tag">COMPLIANCE</span>
        <h2 class="section-title">Independently Audited & Certified</h2>
        <p class="section-subtitle">We regularly undergo rigorous third-party audits to ensure our systems remain impenetrable.</p>
      </div>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 32px; margin-top: 48px;">
        <div style="padding: 32px; background: #FFF; border-radius: 16px; border: 1px solid #E5E7EB; text-align: center; width: 250px;">
          <h3 style="font-size: 1.2rem; margin-bottom: 12px; color: #0B251A;">ISO 27001</h3>
          <p style="font-size: 0.9rem; color: #5B7068;">Information Security Management Certified.</p>
        </div>
        <div style="padding: 32px; background: #FFF; border-radius: 16px; border: 1px solid #E5E7EB; text-align: center; width: 250px;">
          <h3 style="font-size: 1.2rem; margin-bottom: 12px; color: #0B251A;">PCI-DSS Level 1</h3>
          <p style="font-size: 0.9rem; color: #5B7068;">Highest standard for card data security.</p>
        </div>
        <div style="padding: 32px; background: #FFF; border-radius: 16px; border: 1px solid #E5E7EB; text-align: center; width: 250px;">
          <h3 style="font-size: 1.2rem; margin-bottom: 12px; color: #0B251A;">NDPR Compliant</h3>
          <p style="font-size: 0.9rem; color: #5B7068;">Adhering strictly to Nigerian Data Protection Regulations.</p>
        </div>
      </div>
    </div>
  </section>

  <footer class="site-footer">
"@
    $content = $content -replace '  <footer class="site-footer">', $newSection
    Set-Content -Path $path -Value $content -Encoding UTF8
}

$path = 'academy/academy.html'
if (Test-Path $path) {
    $content = Get-Content $path -Raw
    $newSection = @"
  <!-- LIVE WEBINARS -->
  <section class="webinars-section" style="padding: 80px 0; background: #0B251A; color: #FFF;">
    <div class="container">
      <div class="section-header-center">
        <span class="section-tag" style="background: rgba(52, 211, 153, 0.1); color: #34D399;">LIVE SESSIONS</span>
        <h2 class="section-title" style="color: #FFF;">Upcoming Financial Webinars</h2>
        <p class="section-subtitle" style="color: #A3B8B0;">Join our experts live to discuss market trends, investment strategies, and portfolio management.</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 48px;">
        <div style="padding: 32px; background: #1B382B; border-radius: 16px; position: relative;">
          <div style="position: absolute; top: 32px; right: 32px; background: rgba(16, 185, 129, 0.2); color: #10B981; padding: 4px 12px; border-radius: 100px; font-size: 0.8rem; font-weight: 600;">Free</div>
          <p style="font-size: 0.9rem; color: #10B981; margin-bottom: 8px; font-weight: 600;">Oct 12, 2026 &bull; 4:00 PM WAT</p>
          <h3 style="font-size: 1.2rem; margin-bottom: 16px;">Navigating the NGX in Q4</h3>
          <p style="font-size: 0.95rem; color: #A3B8B0; margin-bottom: 24px;">An in-depth look at sectors poised for growth in the last quarter of the year.</p>
          <a href="#" style="color: #FFF; font-weight: 600; text-decoration: underline;">Reserve Seat</a>
        </div>
        <div style="padding: 32px; background: #1B382B; border-radius: 16px; position: relative;">
          <div style="position: absolute; top: 32px; right: 32px; background: rgba(16, 185, 129, 0.2); color: #10B981; padding: 4px 12px; border-radius: 100px; font-size: 0.8rem; font-weight: 600;">Free</div>
          <p style="font-size: 0.9rem; color: #10B981; margin-bottom: 8px; font-weight: 600;">Oct 18, 2026 &bull; 6:00 PM WAT</p>
          <h3 style="font-size: 1.2rem; margin-bottom: 16px;">Mastering US Dollar Assets</h3>
          <p style="font-size: 0.95rem; color: #A3B8B0; margin-bottom: 24px;">How to hedge against currency devaluation using Eurobonds and US Equities.</p>
          <a href="#" style="color: #FFF; font-weight: 600; text-decoration: underline;">Reserve Seat</a>
        </div>
      </div>
    </div>
  </section>

  <footer class="site-footer">
"@
    $content = $content -replace '  <footer class="site-footer">', $newSection
    Set-Content -Path $path -Value $content -Encoding UTF8
}
