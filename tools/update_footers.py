import re
import glob

files = [
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/index/index.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/accounts/accounts.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/investments/investments.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/pricing/pricing.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/academy/academy.html",
    "c:/Users/HP/OneDrive/Documenten/Legends Codes/investment/security/security.html"
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = re.sub(r'<div class="footer-col">\s*<h4>Save &amp; Invest</h4>.*?</ul>\s*</div>', 
'''<div class="footer-col">
          <h4>Save &amp; Invest</h4>
          <ul class="footer-links">
            <li><a href="../accounts/accounts.html#stash">Novara Stash (4.2%)</a></li>
            <li><a href="../accounts/accounts.html#fixed-lock">Fixed Lock (5.5%)</a></li>
            <li><a href="../accounts/accounts.html#goals">Goal Tracker</a></li>
            <li><a href="../investments/investments.html#dollar-vault">Dollar Vault</a></li>
            <li><a href="../pricing/pricing.html">Current Rates</a></li>
          </ul>
        </div>''', content, flags=re.DOTALL)
        
    content = re.sub(r'<div class="footer-col">\s*<h4>Investments</h4>.*?</ul>\s*</div>', 
'''<div class="footer-col">
          <h4>Investments</h4>
          <ul class="footer-links">
            <li><a href="../investments/investments.html#stocks">NGX Stock Market</a></li>
            <li><a href="../investments/investments.html#stocks">US Global Equities</a></li>
            <li><a href="../investments/investments.html#tbills">Treasury Bills</a></li>
            <li><a href="../investments/investments.html#mutual-funds">Mutual Funds</a></li>
            <li><a href="../investments/investments.html#real-estate">Real Estate Trust</a></li>
          </ul>
        </div>''', content, flags=re.DOTALL)

    content = re.sub(r'<div class="footer-col">\s*<h4>Academy &amp; Tools</h4>.*?</ul>\s*</div>', 
'''<div class="footer-col">
          <h4>Academy &amp; Tools</h4>
          <ul class="footer-links">
            <li><a href="../academy/academy.html">Financial Academy</a></li>
            <li><a href="../academy/academy.html#calculator">Compound Calculator</a></li>
            <li><a href="../academy/academy.html#guides">Beginner Guides</a></li>
            <li><a href="#">Web Platform Demo</a></li>
            <li><a href="../academy/academy.html#glossary">Market Glossary</a></li>
          </ul>
        </div>''', content, flags=re.DOTALL)
        
    content = re.sub(r'<div class="footer-col">\s*<h4>Company</h4>.*?</ul>\s*</div>', 
'''<div class="footer-col">
          <h4>Company</h4>
          <ul class="footer-links">
            <li><a href="#">Our Story</a></li>
            <li><a href="../security/security.html">Security Architecture</a></li>
            <li><a href="#">Leadership</a></li>
            <li><a href="#">Contact Support</a></li>
            <li><a href="#">Careers</a></li>
          </ul>
        </div>''', content, flags=re.DOTALL)
        
    # Also fix the bottom link if it's currently pointing to ../security/security.html which it is, but just to be sure
    # It might be in some other format, but usually we just want to make sure the relative paths in the footer are consistent
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
