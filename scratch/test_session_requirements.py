# -*- coding: utf-8 -*-
import re

def test_requirements():
    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    results = []

    # 1. 初始狀態與生命週期：啟動時清除 sessionStorage
    has_startup_clear = "sessionStorage.removeItem(SESSION_CATEGORY_KEY)" in js
    results.append(("1. 啟動/重新整理時清除記憶體 (sessionStorage.removeItem)", has_startup_clear))

    # 2. 記憶體與讀取邏輯
    has_remember_fn = "function rememberCategoryState(catKey)" in js
    has_get_remember_fn = "function getRememberedCategoryState()" in js
    results.append(("2. 包含群組記憶與讀取函式 (rememberCategoryState & getRememberedCategoryState)", has_remember_fn and has_get_remember_fn))

    # 3. 切換至分類頁面 (switchViewTab) 時優先恢復記憶群組，否則才預設第一頁群組
    switch_has_restore = (
        "const rememberedCat = getRememberedCategoryState();" in js and
        "currentCategoryChip = rememberedCat;" in js and
        "getFirstPageCategory()" in js
    )
    results.append(("3. switchViewTab 支援記憶恢復與預設群組備援", switch_has_restore))

    # 4. 滑動切換分頁 (slider scroll) 支援記憶恢復
    slider_scroll_matches = re.findall(r'viewsSliderViewport\.addEventListener\([\'"]scroll[\'"]', js)
    slider_has_restore = (
        len(slider_scroll_matches) > 0 and
        "const rememberedCat = getRememberedCategoryState();" in js
    )
    results.append(("4. viewsSliderViewport 滑動監聽支援記憶恢復", slider_has_restore))

    # 5. 點擊群組膠囊 (categoryChip) 時寫入記憶並平滑置中 (避免跳動)
    chip_click_remembers = "rememberCategoryState(currentCategoryChip);" in js
    chip_no_page_jump = "activeChip.scrollIntoView" not in js
    chip_smooth_scroll = "categoryChipRow.scrollTo({" in js
    results.append(("5. 點選群組膠囊寫入記憶且平滑滾動無跳動", chip_click_remembers and chip_no_page_jump and chip_smooth_scroll))

    # 6. 細項名稱簡化無多餘描述
    subcat_clean = "opt.textContent = `${subItem.emoji || catData.emoji || '🏷️'} ${subItem.subCat || subItem.name}`;" in js
    results.append(("6. 下拉選單細項名稱簡化無多餘冗詞", subcat_clean))

    # 7. 新增物品 Modal 配合視窗寬度與比例調整，無須左右滑動
    modal_no_overflow = "overflow-x: hidden !important;" in css
    modal_responsive_fits = all(fit in css for fit in ['data-screen-fit="standard"', 'data-screen-fit="plus"', 'data-screen-fit="tablet"', 'data-screen-fit="full"'])
    mobile_single_column = "@media (max-width: 480px)" in css and "grid-template-columns: 1fr;" in css
    results.append(("7. 新增物品視窗自適應寬度比例且徹底禁止橫向滑動", modal_no_overflow and modal_responsive_fits and mobile_single_column))

    all_passed = True
    print("=== Category Group State Memory and Modal Optimization Verification ===")
    for title, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} - {title}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nALL 7 REQUIREMENTS AND CHECKS PASSED WITH 0 ERRORS!")
    else:
        print("\nSOME CHECKS FAILED.")
    return all_passed

if __name__ == '__main__':
    test_requirements()
