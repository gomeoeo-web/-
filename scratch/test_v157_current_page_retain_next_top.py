import sys
import re

def test_v157():
    print("Testing v1.5.7 Next page top state & Current page state retention until switch completion...")

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Version 1.5.7 bump
    assert 'v1.5.7' in html, "index.html should have v1.5.7 badge"
    assert "APP_VERSION = '1.5.7'" in js or 'APP_VERSION = "1.5.7"' in js, "app.js should have APP_VERSION = '1.5.7'"
    print("[PASS] Version 1.5.7 verified in index.html and app.js")

    # 2. prepareIncomingPanelForSwipe and clearIncomingPanelTransform defined
    assert 'function prepareIncomingPanelForSwipe' in js, "prepareIncomingPanelForSwipe must be defined in app.js"
    assert 'function clearIncomingPanelTransform' in js, "clearIncomingPanelTransform must be defined in app.js"
    assert 'translateY(' in js, "translateY must be used for incoming panel top alignment"
    print("[PASS] Panel transition functions and translateY alignment verified")

    # 3. switchViewTab preserves current page until switch completes
    assert 'prepareIncomingPanelForSwipe(tab)' in js, "switchViewTab should call prepareIncomingPanelForSwipe"
    assert 'clearIncomingPanelTransform()' in js, "switchViewTab completion should clear transform"
    print("[PASS] switchViewTab state preservation verified")

    # 4. viewsSliderViewport scroll listener preserves current state and sets top on complete
    m_slider = re.search(r'viewsSliderViewport\.addEventListener\([\'"]scroll[\'"][\s\S]+?if\s*\(targetTab\s*!==\s*currentNavTab\)\s*\{([\s\S]+?)\}\s*,\s*\d+\);', js)
    assert m_slider is not None, "viewsSliderViewport scroll listener tab switch block not found"
    block = m_slider.group(1)
    assert 'window.scrollTo({ top: 0' in block or 'document.documentElement.scrollTop = 0' in block, "Scroll to top must be in tab switch completion block"
    assert 'clearIncomingPanelTransform()' in block, "clearIncomingPanelTransform must be in tab switch completion block"
    print("[PASS] Slider scroll completion block verified")

    # 5. Zero Chinese parentheses in visible HTML
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            raise AssertionError(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")
    print("[PASS] Zero Chinese parentheses in visible index.html verified")

    print("\nAll v1.5.7 tests PASSED successfully!")

if __name__ == '__main__':
    test_v157()
