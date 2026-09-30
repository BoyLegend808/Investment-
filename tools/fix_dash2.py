#!/usr/bin/env python3
import os

filepath = r'C:\Users\HP\OneDrive\Documenten\Legends Codes\investment\dashboard\dashboard.html'

with open(filepath, 'r', encoding='utf8') as f:
    content = f.read()

# Fix legend swatch styles - simple background replacements
replacements = [
    ('style="background:#10B981"', 'class="legend-swatch ember"'),
    ('style="background:#0B251A"', 'class="legend-swatch copper"'),
    ('style="background:#F97316"', 'class="legend-swatch amber"'),
    ('style="background:#D1D5DB"', 'class="legend-swatch stone"'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(filepath, 'w', encoding='utf8') as f:
    f.write(content)

print('Fixed legend swatches in dashboard.html')