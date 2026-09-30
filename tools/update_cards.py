import re

def update_cards(file_path, base_url_prefix):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find all <div class="course-card">...</div> blocks using a simple approach
    # Since regex can be tricky with HTML, we'll split by '<div class="course-card">'
    parts = content.split('<div class="course-card">')
    if len(parts) == 1:
        return

    new_content = parts[0]
    for i, part in enumerate(parts[1:]):
        course_num = i + 1
        img_url = f"{base_url_prefix}assets/course_{course_num}.jpg"
        
        # Replace the course-thumb div's start tag
        part = re.sub(r'<div class="course-thumb"[^>]*>', f'<div class="course-thumb" style="background-image: url(\'{img_url}\'); background-size: cover; background-position: center;">', part, count=1)
        
        # Remove the <div style="..."> <svg>...</svg> </div> inside it. 
        # The SVG is always wrapped in a <div style="color: ...">
        part = re.sub(r'<div style="color:[^>]+>.*?</div>', '', part, flags=re.DOTALL)
        
        new_content += '<div class="course-card">' + part

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

update_cards("index/index.html", "../")
update_cards("academy/academy.html", "../")

print("Done updating course cards.")
