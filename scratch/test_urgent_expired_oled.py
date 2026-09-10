import re

def test_all():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # 1. Check Home page urgent and expired filter correspondence:
    if "else if (remainingDays <= 3)" not in js:
        errors.append("remainingDays <= 3 check missing from calculateMetrics in app.js")
    
    if "currentPillFilter === 'urgent'" not in js:
        errors.append("currentPillFilter === 'urgent' filter missing in app.js")
    
    if "currentPillFilter === 'expired'" not in js:
        errors.append("currentPillFilter === 'expired' filter missing in app.js")

    if "return m.hasEndDate && m.status === 'urgent'" not in js:
        errors.append("todayList urgent filter must return m.hasEndDate && m.status === 'urgent'")

    if "return m.hasEndDate && m.status === 'expired'" not in js:
        errors.append("todayList expired filter must return m.hasEndDate && m.status === 'expired'")

    if "m.status === 'urgent'" not in js:
        errors.append("m.status === 'urgent' check missing in app.js")

    # Check progressFillClass corresponds to m.status
    if "else if (m.status === 'urgent')" not in js:
        errors.append("progressFillClass must use m.status === 'urgent' for card progress bar")

    if "if (m.status === 'expired')" not in js:
        errors.append("progressFillClass must use m.status === 'expired' for card progress bar")

    # 2. Check OLED pure black mode name
    if "目前為 OLED純黑 模式" not in js:
        errors.append("'目前為 OLED純黑 模式' missing in app.js")
    if "已切換為 OLED純黑 模式" not in js:
        errors.append("'已切換為 OLED純黑 模式' toast missing in app.js")
    if "三星純黑 AMOLED" in js:
        errors.append("'三星純黑 AMOLED' still found in app.js")

    # 3. Check '加入物品' button in OLED pure black mode is white
    add_btn_match = re.search(r'\[data-theme="amoled"\]\s+\.btn-add-items-to-cat\s*\{([^}]+)\}', css)
    if not add_btn_match:
        errors.append("[data-theme='amoled'] .btn-add-items-to-cat rule missing in style.css")
    else:
        content = add_btn_match.group(1)
        if 'background: #ffffff' not in content and 'background:#ffffff' not in content:
            errors.append(".btn-add-items-to-cat in amoled theme is not white background")
        if 'color: #000000' not in content and 'color:#000000' not in content:
            errors.append(".btn-add-items-to-cat in amoled theme text color is not #000000")

    # 4. Check zero Chinese parentheses
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 5. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All urgent/expired correspondence, OLED純黑 mode naming, and white add button in OLED mode PASSED!")
        return True

if __name__ == '__main__':
    test_all()
