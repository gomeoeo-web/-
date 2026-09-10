import sys
import re

def run_tests():
    print("Testing v1.6.1 Settings Modal Scrolling & Swipe Down Dismiss...")

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

    # 3. style.css .ios-settings-list overflow-y: auto and mobile touch properties
    assert '.ios-settings-list' in css, "style.css should define .ios-settings-list"
    assert 'overflow-y: auto' in css, "style.css should have overflow-y: auto for modal scrolling"
    assert '-webkit-overflow-scrolling: touch' in css, "style.css should have -webkit-overflow-scrolling: touch"
    assert 'touch-action: pan-y' in css, "style.css should have touch-action: pan-y"
    assert 'overscroll-behavior: contain' in css, "style.css should have overscroll-behavior: contain"
    print("[PASS] .ios-settings-list vertical scrolling styles verified in style.css")

    # 4. Touch swipe-down-to-close gesture support on settingsModal in app.js
    assert 'settingsModalCard' in js, "app.js should target settingsModalCard for swipe gesture"
    assert 'settingsTouchStartY' in js, "app.js should track settingsTouchStartY"
    assert 'isDraggingSettings' in js, "app.js should track isDraggingSettings state"
    print("[PASS] settingsModal swipe-down-to-dismiss touch gesture verified in app.js")

    # 5. Zero Chinese parentheses rule in index.html
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
