#!/usr/bin/env python3
import os

filepath = r'C:\Users\HP\OneDrive\Documenten\Legends Codes\investment\dashboard\dashboard.html'

with open(filepath, 'r', encoding='utf8') as f:
    content = f.read()

# Replace inline style with CSS class
content = content.replace('style="color: #FF5500"', 'class="nav-link nav-link-ember"')

with open(filepath, 'w', encoding='utf8') as f:
    f.write(content)

print('Fixed dashboard.html nav-link ember color')

# Also fix the other inline style with #0E5E3A
with open(filepath, 'r', encoding='utf8') as f:
    content = f.read()

content = content.replace('style="color: #0E5E3A; font-weight: 700"', 'class="nav-link nav-link-copper"')

with open(filepath, 'w', encoding='utf8') as f:
    f.write(content)

print('Fixed dashboard.html nav-link copper color')