import os
import re

updated = 0
for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove the extra </div> that closes .ticker-track early
            new_content = re.sub(r'(<div class="ticker-item"><span class="ticker-symbol">USD/GBP</span>.*?</div>)\s*</div>\s*(<div class="ticker-item">|<!-- Loop duplicate)', r'\1\n      \2', content, flags=re.DOTALL)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                updated += 1

print(f"Finished updating {updated} files.")
