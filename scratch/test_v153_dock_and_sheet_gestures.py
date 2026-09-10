import re
import sys

def test_v153_requirements():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()
    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    errors = []

    # 1. Action Sheet swipe down to close: speed, responsiveness, and smoothness
    if 'smoothlyCloseActionSheet' not in js:
        errors.append("smoothlyCloseActionSheet function missing in app.js")
    if 'translateY(100%)' not in js:
        errors.append("Action sheet slide-down exit animation translateY(100%) missing in app.js")
    if 'velocityY' not in js:
        errors.append("Velocity calculation for fast flick dismiss missing in app.js")
    if 'touch-action: none' not in css or '.sheet-header' not in css:
        errors.append(".sheet-header must have touch-action: none in style.css")

    # 2. Dock screen-fit adaptation for standard, plus, tablet, full
    for fit in ['standard', 'plus', 'tablet', 'full']:
        fit_selector = f'[data-screen-fit="{fit}"] .floating-island-dock'
        if fit_selector not in css:
            errors.append(f"{fit_selector} screen-fit rule missing in style.css")

    # 3. Dock auto-hide on scroll up and auto-show on scroll down
    if '.floating-island-dock.dock-hidden' not in css:
        errors.append(".floating-island-dock.dock-hidden class missing in style.css")
    if 'dock-hidden' not in js:
        errors.append("dock-hidden handling missing in app.js")
    if 'scrollDiff' not in js:
        errors.append("scrollDiff detection missing in app.js")
    if 'touchStartDockY' not in js:
        errors.append("Touch gesture detection for dock hide/show missing in app.js")

    # 4. Version v1.5.3
    if '<span class="app-version-badge" id="appVersionBadge">v1.5.3</span>' not in html:
        errors.append("Version badge v1.5.3 missing in index.html")
    if "const APP_VERSION = '1.5.3';" not in js:
        errors.append("APP_VERSION 1.5.3 missing in app.js")

    # 5. Zero Chinese parentheses in visible text
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All v1.5.3 dock adaptations, scroll auto-hide/show, and sheet gesture tests PASSED!")
        return True

if __name__ == '__main__':
    ok = test_v153_requirements()
    sys.exit(0 if ok else 1)
