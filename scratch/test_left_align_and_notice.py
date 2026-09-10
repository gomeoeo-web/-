# -*- coding: utf-8 -*-
import re

def test_new_features():
    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    results = []

    # 1. 物品分類點選群組自動靠左 (Left Align)
    chip_left_align = (
        "this.getBoundingClientRect().left - categoryChipRow.getBoundingClientRect().left + categoryChipRow.scrollLeft" in js and
        "activeChip.getBoundingClientRect().left - categoryChipRow.getBoundingClientRect().left + categoryChipRow.scrollLeft" in js
    )
    results.append(("1. 物品分類點擊與記憶群組自動靠左對齊 (Align Left)", chip_left_align))

    # 2. 主頁提醒欄不可點擊 (Non-clickable)
    # Check no clickable class, no role="button" in html
    no_clickable_class = 'class="status-notice-card clickable"' not in html
    no_role_button = 'id="statusNoticeCard" role="button"' not in html
    no_click_listener = "statusNoticeCard.addEventListener('click'" not in js
    # Check CSS cursor: default
    notice_css_match = re.search(r'\.status-notice-card\s*\{([^}]+)\}', css)
    cursor_default = notice_css_match and 'cursor: default' in notice_css_match.group(1)
    results.append(("2. 主頁提醒欄完全不可點擊 (Non-clickable Notice Card)", no_clickable_class and no_role_button and no_click_listener and cursor_default))

    # 3. 主頁提醒欄新增已過期通知 (Expired Notification & Status Tag)
    has_expired_notice = (
        "noticeTitle.textContent = `有 ${expired} 項物品已過期`;" in js and
        "noticeTitle.textContent = `有 ${expired} 項物品已過期、${urgent} 項即將到期`;" in js and
        "noticeStatusTag" in js and
        "noticeStatusTag" in html
    )
    results.append(("3. 主頁提醒欄包含已過期通知與動態狀態標籤 (Expired Notice Tag)", has_expired_notice))

    # 4. 檢查 HTML 中無中文全形括號
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    parens_found = []
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            parens_found.append((idx, text_outside_tags))
    results.append(("4. 畫面上完全無中文全形括號 (No Chinese Parentheses)", len(parens_found) == 0))

    all_passed = True
    print("=== Align-Left and Notice Card Verification ===")
    for title, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} - {title}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nALL NEW REQUIREMENTS PASSED WITH 0 ERRORS!")
    else:
        print("\nFAILURES DETECTED IN NEW REQUIREMENTS.")
    return all_passed

if __name__ == '__main__':
    test_new_features()
