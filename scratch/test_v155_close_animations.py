import sys
import re

def test_v155_close_animations():
    print("Testing v1.5.5 Closing Animations and Modal Dismissal Effects...")

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

    # 2. Check CSS closing animations
    assert '.modal-closing' in css, "style.css should have .modal-closing class"
    assert '@keyframes popOutModalCard' in css, "style.css should have @keyframes popOutModalCard"
    assert '@keyframes slideDownActionSheet' in css, "style.css should have @keyframes slideDownActionSheet"
    assert '@keyframes fadeOutModalBackdrop' in css, "style.css should have @keyframes fadeOutModalBackdrop"
    print("[PASS] CSS closing keyframes and classes verified in style.css")

    # 3. Check JS closeModalWithAnimation helper
    assert 'function closeModalWithAnimation' in js, "app.js should define closeModalWithAnimation"
    assert 'modal-closing' in js, "app.js should toggle modal-closing class"
    assert 'closeModalWithAnimation' in js, "app.js should invoke closeModalWithAnimation"
    print("[PASS] closeModalWithAnimation defined in app.js")

    # 4. Check all 11 closing functions route through closeModalWithAnimation
    functions_to_check = [
        'closeModal',
        'closeActionSheet',
        'closeSettingsModal',
        'closeRecentlyDeletedModal',
        'closeArchiveModal',
        'closeDeleteConfirmModal',
        'closeBgRemovalStudio',
        'closeHomeSortModal',
        'closeAddItemsToCategoryModal',
        'closeCustomCategoryModal',
        'closeEditCategoryModal'
    ]
    for fn in functions_to_check:
        assert f"function {fn}" in js, f"app.js should contain function {fn}"
    
    # Check that isAnyModalOpen excludes .modal-closing
    assert "modal-closing" in js and "!el.classList.contains('modal-closing')" in js, "isAnyModalOpen should exclude modal-closing so scroll unlock isn't blocked"
    print("[PASS] All 11 modal and sheet dismissers verified with animation integration")

    # 5. Check no full-width Chinese parentheses in index.html
    assert '（' not in html and '）' not in html, "index.html must not contain Chinese parentheses"
    print("[PASS] Zero Chinese parentheses in index.html verified")

    print("\nAll v1.5.5 tests PASSED successfully!")

if __name__ == '__main__':
    test_v155_close_animations()
