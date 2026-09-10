import re
import sys

def test_v154_requirements():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()
    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    errors = []

    # 1. 主頁與物品分類框不需要與視窗比例一同調整，統一標準比例
    for fit in ['standard', 'plus', 'tablet', 'full']:
        fit_selector = f'[data-screen-fit="{fit}"] .floating-island-dock'
        if fit_selector in css:
            errors.append(f"{fit_selector} should be removed for unified standard dock proportions")

    if '.floating-island-dock' not in css:
        errors.append(".floating-island-dock missing from style.css")
    if '.dock-tab' not in css:
        errors.append(".dock-tab missing from style.css")

    # 2. 往左右滑切換頁面時自動至頂至頁面上方
    # viewsSliderViewport scroll listener must include scroll to top when targetTab !== currentNavTab
    m_slider = re.search(r'viewsSliderViewport\.addEventListener\([\'"]scroll[\'"][\s\S]+?if\s*\(targetTab\s*!==\s*currentNavTab\)\s*\{([\s\S]+?)\}\s*,\s*\d+\);', js)
    if not m_slider:
        errors.append("viewsSliderViewport scroll listener tab switch block not found")
    else:
        block = m_slider.group(1)
        if 'window.scrollTo({ top: 0' not in block and 'window.scrollTo({top:0' not in block and 'document.documentElement.scrollTop = 0' not in block:
            errors.append("Horizontal swipe page switch does not scroll to top")

    # 3. 主頁與物品分類框在切換頁面時增加特效
    if '.floating-island-dock.dock-switching' not in css:
        errors.append(".floating-island-dock.dock-switching effect class missing from style.css")
    if 'dockSwitchPulse' not in css:
        errors.append("dockSwitchPulse keyframes missing from style.css")
    if 'tab-switching-pop' not in css:
        errors.append("tab-switching-pop effect class missing from style.css")
    if 'tabPopEffect' not in css:
        errors.append("tabPopEffect keyframes missing from style.css")
    if 'triggerDockSwitchEffect' not in js:
        errors.append("triggerDockSwitchEffect function missing from app.js")

    # 4. Version v1.6.1 check
    if '<span class="app-version-badge" id="appVersionBadge">v1.6.1</span>' not in html:
        errors.append("v1.6.1 badge missing in index.html")
    if "const APP_VERSION = '1.6.1';" not in js:
        errors.append("APP_VERSION 1.6.1 missing in app.js")

    # 5. Zero Chinese parentheses
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
        print("SUCCESS: All v1.5.4 unified dock, scroll to top on swipe, and dock switch effect tests PASSED!")
        return True

if __name__ == '__main__':
    ok = test_v154_requirements()
    sys.exit(0 if ok else 1)
