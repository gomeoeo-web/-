import re
import os
import urllib.request

def run_tests():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # 1. Check permanent group settings button
    if 'id="btnOpenGroupSettings"' not in html:
        errors.append("btnOpenGroupSettings missing from index.html")
    if 'id="btnGroupSettingsBar"' not in html:
        errors.append("btnGroupSettingsBar missing from index.html")
    if 'btnOpenGroupSettings' not in js:
        errors.append("btnOpenGroupSettings not wired in app.js")
    if 'btnGroupSettingsBar' not in js:
        errors.append("btnGroupSettingsBar not wired in app.js")

    # 2. Check old add group button removed from chipRow in app.js
    if 'btnAddCategoryChip' in js:
        errors.append("Old btnAddCategoryChip still present in app.js")
    if '➕ 新增群組' in js:
        errors.append("Old '➕ 新增群組' still present in app.js")

    # 3. Check default to home page (today) on startup
    if "switchViewTab('today', false)" not in js:
        errors.append("Default home page switchViewTab('today', false) missing from startup in app.js")

    # 4. Check swipe gesture on item card
    if "|| e.target.closest('.ios-item-card')" in js:
        errors.append(".ios-item-card still blocked in mousedown in app.js")
    if "hasSwipedHorizontally" not in js:
        errors.append("hasSwipedHorizontally drag-suppression missing from app.js")
    if "touch-action: pan-y" not in css:
        errors.append("touch-action: pan-y missing from style.css")

    # 5. Check Chinese parentheses in visible HTML texts
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    
    parens_found = []
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            parens_found.append((idx, text_outside_tags))
    if parens_found:
        errors.append(f"Chinese parentheses found in HTML: {parens_found}")

    # 6. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    # 7. Check server status
    try:
        res = urllib.request.urlopen('http://localhost:8080/', timeout=3)
        if res.status != 200:
            errors.append(f"Server returned status {res.status}")
    except Exception as e:
        errors.append(f"Server check failed: {e}")

    if errors:
        print("FAILURES DETECTED:")
        for err in errors:
            print(" -", err)
        return False
    else:
        print("SUCCESS: ALL 7 TEST CATEGORIES PASSED WITH 0 ERRORS!")
        return True

if __name__ == '__main__':
    run_tests()
