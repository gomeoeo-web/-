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

    # 1. Check startup stall prevention (no scrollIntoView in renderCategoryChips, slider setup)
    if 'activeChip.scrollIntoView' in js:
        errors.append("scrollIntoView found in renderCategoryChips, which can shift views-slider-viewport on startup!")
    if 'overflow-x: clip' not in css:
        errors.append("overflow-x: clip missing from style.css for view-panel")

    # 2. Check exactly ONE group settings button
    group_btns = re.findall(r'id=["\']btnOpenGroupSettings["\']', html)
    if len(group_btns) != 1:
        errors.append(f"Expected exactly 1 btnOpenGroupSettings in HTML, found {len(group_btns)}")
    if 'btnGroupSettingsBar' in html or 'btnGroupSettingsBar' in js:
        errors.append("Duplicate btnGroupSettingsBar still exists")
    if 'category-nav-bar' in html:
        errors.append("category-nav-bar still exists in HTML")

    # 3. Check Google account and cloud sync completely removed
    for term in ['accounts.google.com', 'btnHeaderGoogle', 'loadGoogleUser', 'saveCloudClientId']:
        if term in html:
            errors.append(f"Google reference '{term}' found in index.html")
        if term in js:
            errors.append(f"Google reference '{term}' found in app.js")

    # 4. Check scroll to top on tab switch
    if "window.scrollTo({ top: 0, left: 0, behavior: 'instant' })" not in js:
        errors.append("Scroll to top on tab switch missing from switchViewTab in app.js")

    # 5. Check no auto-focus on add item modal (no keyboard popup)
    if 'itemNameInput.focus()' in js:
        errors.append("itemNameInput.focus() found in app.js (triggers virtual keyboard popup on mobile)")

    # 6. Check category chip row full width and thumb-friendly ergonomics
    if '.category-chip-row {' not in css:
        errors.append(".category-chip-row missing from style.css")
    if '.btn-group-settings-main' not in css:
        errors.append(".btn-group-settings-main missing from style.css")

    # 7. Check Chinese parentheses in visible HTML texts
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

    # 8. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    # 9. Check server status
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
        print("SUCCESS: ALL USER REQUIREMENTS AND QUALITY GATES PASSED WITH 0 ERRORS!")
        return True

if __name__ == '__main__':
    run_tests()
