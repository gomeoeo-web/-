import sys
import re

def test_v158():
    print("Testing v1.6.1 Reduced Border Distance & Click-Only Dock Enlarge Bounce Effect...")

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Check version bump to 1.6.1
    assert 'v1.6.1' in html, "index.html should have v1.6.1 badge"
    assert "APP_VERSION = '1.6.1'" in js or 'APP_VERSION = "1.6.1"' in js, "app.js should have APP_VERSION = '1.6.1'"
    print("[PASS] Version 1.6.1 verified in index.html and app.js")

    # 2. Check reduced edge distance in style.css
    assert 'calc(100vw - 0.75rem)' in css, ".ios-app-container should have reduced edge distance with calc(100vw - 0.75rem)"
    assert 'max(0.5rem' in css or 'max(0.55rem' in css, ".ios-app-container side padding should be reduced to avoid cramped layout"
    print("[PASS] Reduced border distance styles verified in style.css")

    # 3. Check dock enlarge bounce effect: NOT triggered on swipe completion, ONLY triggered on tab click
    m_slider = re.search(r'viewsSliderViewport\.addEventListener\([\'"]scroll[\'"][\s\S]+?if\s*\(targetTab\s*!==\s*currentNavTab\)\s*\{([\s\S]+?)\}\s*,\s*\d+\);', js)
    assert m_slider is not None, "viewsSliderViewport scroll listener tab switch block not found"
    block = m_slider.group(1)
    assert 'triggerDockSwitchEffect' not in block, "Swipe completion must NOT trigger dock bounce enlarge effect"
    print("[PASS] Swipe completion correctly omits triggerDockSwitchEffect")

    assert 'switchViewTab(\'today\', true, true)' in js or 'switchViewTab("today", true, true)' in js, "Clicking dockTabToday must pass isUserClick=true"
    assert 'switchViewTab(\'inventory\', true, true)' in js or 'switchViewTab("inventory", true, true)' in js, "Clicking dockTabInventory must pass isUserClick=true"
    print("[PASS] Dock tabs click event correctly triggers enlarge bounce effect")

    # 4. Check zero Chinese parentheses in visible index.html
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            raise AssertionError(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")
    print("[PASS] Zero Chinese parentheses in visible index.html verified")

    print("\nAll v1.6.1 tests PASSED successfully!")

if __name__ == '__main__':
    test_v158()
