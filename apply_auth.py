import os
import re

protected_pages = ['academy.html', 'investments.html', 'accounts.html', 'dashboard.html']
html_files = []

for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.html'):
            html_files.append(os.path.join(root, f))

# 1. Add auth-guard.js to protected pages
for path in html_files:
    basename = os.path.basename(path)
    if basename in protected_pages:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already has auth-guard
        if 'auth-guard.js' not in content:
            # Determine path to auth-guard based on depth
            # if in root, it's auth-guard.js. If in subfolder, it's ../auth-guard.js
            depth = path.count(os.sep)
            if depth > 1:
                script_src = '../auth-guard.js'
            else:
                script_src = 'auth-guard.js'
            
            # insert before </head>
            head_tag = '</head>'
            script_tag = f'  <script src="{script_src}"></script>\n'
            new_content = content.replace(head_tag, script_tag + head_tag)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)

# 2. Add auth-required class to restricted links
restricted_urls = [
    'academy.html',
    'investments.html',
    'accounts.html',
    'dashboard.html'
]

def add_auth_class(match):
    full_tag = match.group(0)
    href = match.group(2)
    # Check if href targets a restricted page
    is_restricted = any(r_url in href for r_url in restricted_urls)
    
    if not is_restricted:
        return full_tag

    # If already has auth-required, skip
    if 'auth-required' in full_tag:
        return full_tag

    # Check if it has a class attribute
    class_match = re.search(r'class="([^"]*)"', full_tag)
    if class_match:
        old_classes = class_match.group(1)
        new_classes = f'{old_classes} auth-required'.strip()
        return full_tag.replace(f'class="{old_classes}"', f'class="{new_classes}"')
    else:
        # Add class attribute
        # Insert right after <a 
        return full_tag.replace('<a ', '<a class="auth-required" ')


for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # regex to match <a ... href="..." ... >
    # This regex handles multiline and various attribute orders
    pattern = re.compile(r'<a\s+[^>]*href="([^"]+)"[^>]*>', re.IGNORECASE)
    
    # We will do a manual replace since the pattern has capture groups
    # Wait, re.sub is better. Let's use re.sub with a replacement function
    pattern = re.compile(r'(<a\s+[^>]*href="([^"]+)"[^>]*>)', re.IGNORECASE)
    new_content = pattern.sub(add_auth_class, content)
    
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated links in {path}')

print('Done applying auth gates.')
