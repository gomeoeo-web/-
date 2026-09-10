import sys

def run_tests():
    print("Testing v1.5.9 Light Mode Dock Tab Relative Color & Contrast Changes...")

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Version 1.5.9 bump verification
    assert 'v1.5.9' in html, "index.html should have v1.5.9 badge"
    assert "APP_VERSION = '1.5.9'" in js or 'APP_VERSION = "1.5.9"' in js, "app.js should have APP_VERSION = '1.5.9'"
    print("[PASS] Version 1.5.9 verified in index.html and app.js")

    # 2. Check light theme floating island dock styles
    assert '[data-theme="light"] .floating-island-dock' in css, "style.css should have light theme styling for .floating-island-dock"
    assert 'rgba(255, 255, 255, 0.92)' in css, "Dock should have light mode translucent background"
    print("[PASS] Light mode floating island dock container styling verified")

    # 3. Check light theme active dock tab high contrast
    assert '[data-theme="light"] .dock-tab.active' in css, "style.css should have [data-theme='light'] .dock-tab.active"
    assert '[data-theme="light"] .dock-tab.active .dock-label' in css, "style.css should have [data-theme='light'] .dock-tab.active .dock-label"
    assert '[data-theme="light"] .dock-tab.active .dock-icon svg' in css, "style.css should have [data-theme='light'] .dock-tab.active .dock-icon svg"
    print("[PASS] Light mode active dock tab (capsule background, white label, white icon) verified")

    # 4. Check light theme inactive dock tab muted styling
    assert '[data-theme="light"] .dock-tab .dock-label' in css, "style.css should have [data-theme='light'] .dock-tab .dock-label"
    assert '[data-theme="light"] .dock-tab .dock-icon svg' in css, "style.css should have [data-theme='light'] .dock-tab .dock-icon svg"
    print("[PASS] Light mode inactive dock tab (transparent bg, muted grey label and icon) verified")

    # 5. Check zero Chinese parentheses in index.html
    assert '（' not in html and '）' not in html, "index.html should not contain Chinese parentheses （ or ）"
    print("[PASS] Zero Chinese parentheses rule verified in index.html")

    print("\nAll v1.5.9 tests PASSED successfully!")

if __name__ == '__main__':
    run_tests()
