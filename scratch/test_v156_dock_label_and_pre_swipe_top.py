import sys
import re

def test_v156():
    print("Testing v1.6.0 Dock horizontal label below icon & pre-swipe top state...")

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Check version bump to 1.6.0
    assert 'v1.6.0' in html, "index.html should have v1.6.0 badge"
    assert "APP_VERSION = '1.6.0'" in js or 'APP_VERSION = "1.6.0"' in js, "app.js should have APP_VERSION = '1.6.0'"
    print("[PASS] Version 1.6.0 verified in index.html and app.js")

    # 2. Check Dock label horizontally displayed below icon in style.css
    assert '.dock-tab' in css, "style.css should have .dock-tab"
    assert 'order: 1;' in css or 'order: 1' in css, "dock-icon should have order: 1 (above label)"
    assert 'order: 2;' in css or 'order: 2' in css, "dock-label should have order: 2 (below icon)"
    assert 'writing-mode: horizontal-tb' in css, ".dock-label should have writing-mode: horizontal-tb"
    assert 'white-space: nowrap' in css, ".dock-label should have white-space: nowrap"
    print("[PASS] Dock label horizontal styling below icon verified")

    # 3. Check incoming panel preparation for swipe in app.js
    assert 'prepareIncomingPanelForSwipe' in js, "app.js should define prepareIncomingPanelForSwipe"
    assert 'clearIncomingPanelTransform' in js, "app.js should define clearIncomingPanelTransform"
    print("[PASS] Incoming panel preparation for swipe verified in app.js")

    # 4. Check zero Chinese parentheses in index.html visible text
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            raise AssertionError(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")
    print("[PASS] Zero Chinese parentheses in visible index.html verified")

    print("\nAll v1.6.0 tests PASSED successfully!")

if __name__ == '__main__':
    test_v156()
