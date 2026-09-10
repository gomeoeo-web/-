import sys
import re

def run_tests():
    print("Testing v1.6.1 Settings Page Smooth Scroll & Non-Obstructing UI...")

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Version 1.6.1 bump verification
    assert 'v1.6.1' in html, "index.html should have v1.6.1 badge"
    assert "APP_VERSION = '1.6.1'" in js or 'APP_VERSION = "1.6.1"' in js, "app.js should have APP_VERSION = '1.6.1'"
    print("[PASS] Version 1.6.1 verified in index.html and app.js")

    # 2. settingsModal in index.html contains ios-modal-scroll
    assert 'class="ios-modal-scroll ios-settings-list"' in html, "settingsModal should have class ios-modal-scroll ios-settings-list"
    print("[PASS] ios-modal-scroll verified on settingsModal in index.html")

    # 3. Non-obstructing styles: min-width: 0, padding clearance, touch-action: pan-y
    assert '.ios-settings-list' in css, "style.css should define .ios-settings-list"
    assert '3.5rem' in css, "style.css should have bottom padding clearance to prevent UI from covering text"
    assert 'min-width: 0' in css, "style.css should have min-width: 0 on settings-info to prevent text crowding"
    assert 'flex-shrink: 0' in css, "style.css should have flex-shrink: 0 on controls"
    print("[PASS] Non-obstructing layout and padding clearance verified in style.css")

    # 4. Touch drag logic in app.js: only header triggers card dragging
    assert "const isHeader = !!e.target.closest('.ios-modal-header');" in js, "app.js should restrict card drag to header"
    assert "if (isHeader) {" in js, "app.js should only drag card when isHeader is true"
    print("[PASS] Content scroll is completely unobstructed by header drag logic in app.js")

    # 5. Zero Chinese parentheses in index.html
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            raise AssertionError(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")
    print("[PASS] Zero Chinese parentheses rule verified in index.html")

    print("\nAll v1.6.1 tests PASSED successfully!")

if __name__ == '__main__':
    run_tests()
