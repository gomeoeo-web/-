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
        errors.append("scrollIntoView found in renderCategoryChips")
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

    # 5. Check item clickability and hasSwipedHorizontally scope
    if 'let hasSwipedHorizontally = false;' in js:
        occurences = js.count('let hasSwipedHorizontally')
        if occurences > 1:
            errors.append(f"hasSwipedHorizontally declared multiple times with let ({occurences} times), which can shadow outer scope!")
    if 'card.addEventListener(\'click\'' not in js:
        errors.append("Direct card click listener missing from createCardElement in app.js")

    # 6. Check screen fit feature
    if 'id="selectScreenFit"' not in html:
        errors.append("selectScreenFit missing from index.html")
    if '--app-max-width' not in css:
        errors.append("--app-max-width missing from style.css")
    if 'data-screen-fit' not in css:
        errors.append("data-screen-fit selectors missing from style.css")
    if 'setScreenFit' not in js:
        errors.append("setScreenFit function missing from app.js")

    # 7. Check global cross-group inventory search
    if 'itemCat.label' not in js or 'allCats[item.category]' not in js:
        errors.append("Global cross-group inventory search logic missing from renderCards in app.js")

    # 8. Check group settings option box overflow fix
    if '.cat-manage-title-wrap' not in css:
        errors.append(".cat-manage-title-wrap missing from style.css")
    if '.cat-actions-left' not in css or '.cat-actions-right' not in css:
        errors.append(".cat-actions-left/right missing from style.css")

    # 9. Check @imgly/background-removal AI integration
    if '@imgly/background-removal' not in js:
        errors.append("@imgly/background-removal integration missing from app.js")
    if 'performImglyBackgroundRemoval' not in js:
        errors.append("performImglyBackgroundRemoval function missing from app.js")

    # 10. Check CSS native scroll-snap mechanism for slider viewport
    if 'scroll-snap-type: x mandatory' not in css:
        errors.append("scroll-snap-type: x mandatory missing from style.css")
    if '-webkit-overflow-scrolling: touch' not in css:
        errors.append("-webkit-overflow-scrolling: touch missing from style.css")
    if 'scroll-snap-align: start' not in css:
        errors.append("scroll-snap-align: start missing from style.css for view-panel")

    # 11. Check heavy JS touchmove transform calculation is removed
    if 'viewsSliderTrack.style.transform' in js:
        errors.append("Heavy manual viewsSliderTrack.style.transform still found in app.js!")

    # 12. Check switchViewTab uses native scrollTo with smooth/instant behavior
    if 'viewsSliderViewport.scrollTo(' not in js:
        errors.append("viewsSliderViewport.scrollTo missing from switchViewTab in app.js")

    # 13. Check preset editing and deleting features
    if 'id="editCategoryModal"' not in html:
        errors.append("editCategoryModal missing from index.html")
    if 'id="btnResetDefaultCategories"' not in html:
        errors.append("btnResetDefaultCategories missing from index.html")
    if '.btn-edit-cat' not in css or '.btn-reset-default-cats' not in css:
        errors.append(".btn-edit-cat or .btn-reset-default-cats missing from style.css")
    if 'openEditCategoryModal' not in js:
        errors.append("openEditCategoryModal missing from app.js")
    if 'deleteCategory' not in js:
        errors.append("deleteCategory missing from app.js")
    if 'resetDefaultCategories' not in js:
        errors.append("resetDefaultCategories missing from app.js")
    if 'loadPresetOverrides' not in js or 'loadDeletedPresets' not in js:
        errors.append("Preset overrides / deleted presets storage missing from app.js")

    # 14. Check category chip row leftmost alignment
    if 'categoryChipRow.scrollTo({ left: 0' not in js:
        errors.append("categoryChipRow leftmost alignment missing from app.js")

    # 15. Check card and grid touch-action allows horizontal swiping
    card_match = re.search(r'\.ios-item-card\s*\{([^}]+)\}', css)
    if not card_match or 'touch-action: pan-x pan-y' not in card_match.group(1):
        errors.append(".ios-item-card must have 'touch-action: pan-x pan-y' to allow swiping across items!")

    grid_match = re.search(r'\.items-compact-grid\s*\{([^}]+)\}', css)
    if not grid_match or 'touch-action: pan-x pan-y' not in grid_match.group(1):
        errors.append(".items-compact-grid must have 'touch-action: pan-x pan-y' to allow swiping across items!")

    # 16. Check card touch movement tracking (cardMoved prevents false click on swipe)
    if 'cardMoved' not in js:
        errors.append("cardMoved touch tracking missing from createCardElement in app.js")

    # 17. Check background lock when popup/modal is open
    if 'body.modal-open' not in css:
        errors.append("body.modal-open lock styles missing from style.css")
    if 'updateBodyScrollLock' not in js:
        errors.append("updateBodyScrollLock function missing from app.js")

    # 18. Check overscroll containment on modals and action sheet
    sheet_match = re.search(r'\.ios-action-sheet\s*\{([^}]+)\}', css)
    if not sheet_match or 'overscroll-behavior: contain' not in sheet_match.group(1):
        errors.append(".ios-action-sheet missing 'overscroll-behavior: contain'")

    # 19. Check color removal prompt "已選取色彩消除" is removed
    if '已選取色彩消除' in js:
        errors.append("'已選取色彩消除' notice still present in app.js!")

    # 20. Check Chinese parentheses in visible HTML texts
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

    # 21. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    # 22. Check server status
    try:
        res = urllib.request.urlopen('http://localhost:8080/', timeout=3)
        if res.status != 200:
            errors.append(f"Server returned status {res.status}")
    except Exception as e:
        errors.append(f"Server check failed: {e}")

    if errors:
        print(f"FAILURES DETECTED ({len(errors)} errors):")
        for err in errors:
            print(" -", err)
        return False
    else:
        print("SUCCESS: ALL 22 QUALITY GATES AND REQUIREMENTS PASSED WITH 0 ERRORS!")
        return True

if __name__ == '__main__':
    run_tests()
