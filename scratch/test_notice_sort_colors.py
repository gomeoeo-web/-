import re

def test_requirements():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # 1. Check Notice card text displays both expired and upcoming together (將到期與已過期一併顯示)
    # and does not display days (不顯示天數)
    notice_func_match = re.search(r'function updateNoticeCardAndPillCounts\(\)\s*\{([\s\S]*?)\n  \}', js)
    if not notice_func_match:
        errors.append("updateNoticeCardAndPillCounts function not found in app.js")
    else:
        notice_body = notice_func_match.group(1)
        for forbidden in ['3 天內', '3天內', '還有', '剩餘']:
            if forbidden in notice_body:
                errors.append(f"Notice card still contains day count term '{forbidden}' in updateNoticeCardAndPillCounts")
        if 'noticeStatusText.textContent = \'即將到期\'' not in notice_body:
            errors.append("noticeStatusText should be '即將到期' when urgent")
        if 'noticeStatusText.textContent = \'已過期\'' not in notice_body and '已過期 · 即將到期' not in notice_body:
            errors.append("noticeStatusText should be '已過期' or '已過期 · 即將到期' when expired")
        if '有 ${expired} 項已過期、${urgent} 項即將到期' not in notice_body:
            errors.append("noticeTitle must display both expired and urgent together: '有 ${expired} 項已過期、${urgent} 項即將到期'")

    # 2. Check Sorting is reverted to popup modal menu (彈出式菜單) with custom order support
    if 'id="btnOpenCustomSort"' not in html:
        errors.append("btnOpenCustomSort button missing from index.html")
    if 'id="btnOpenInventorySort"' not in html:
        errors.append("btnOpenInventorySort button missing from index.html")
    if 'id="homeSortModal"' not in html:
        errors.append("homeSortModal missing from index.html")
    if 'id="customOrderSection"' not in html:
        errors.append("customOrderSection missing from index.html")
    if 'id="customOrderItemsList"' not in html:
        errors.append("customOrderItemsList missing from index.html")
    if '.btn-sort-menu-trigger' not in css:
        errors.append("CSS style for .btn-sort-menu-trigger missing from style.css")
    if 'openHomeSortModal' not in js:
        errors.append("openHomeSortModal function missing from app.js")
    if 'renderCustomOrderList' not in js:
        errors.append("renderCustomOrderList function missing from app.js")
    if 'btnOpenCustomSort.addEventListener(\'click\', openHomeSortModal)' not in js:
        errors.append("btnOpenCustomSort click listener missing in app.js")

    # 3. Check Samsung AMOLED dark mode UI icon backgrounds are lighter, avoiding blend into black
    amoled_rules = [
        '[data-theme="amoled"] .card-icon-box',
        '[data-theme="amoled"] .btn-circle-dark',
        '[data-theme="amoled"] .notice-icon-wrapper',
        '[data-theme="amoled"] .settings-icon',
        '[data-theme="amoled"] .trash-item-emoji',
        '[data-theme="amoled"] .category-chip',
        '[data-theme="amoled"] .btn-sort-menu-trigger',
        '[data-theme="amoled"] .empty-icon-circle',
        '[data-theme="amoled"] .order-rank-badge'
    ]
    for rule in amoled_rules:
        if rule not in css:
            errors.append(f"AMOLED lighter icon rule missing in style.css: {rule}")

    # Verify AMOLED CSS variables have lighter elevated surfaces
    if '--ios-surface: #141419;' not in css:
        errors.append("AMOLED --ios-surface should be elevated to #141419")
    if '--ios-surface-elevated: #24242e;' not in css:
        errors.append("AMOLED --ios-surface-elevated should be elevated to #24242e")

    # 4. Check progress bar colors matching badge number colors:
    card_urgent_match = re.search(r'\.card-progress-fill\.urgent\s*\{([^}]+)\}', css)
    if not card_urgent_match or 'var(--ios-orange)' not in card_urgent_match.group(1):
        errors.append(".card-progress-fill.urgent does not use var(--ios-orange)")

    badge_urgent_match = re.search(r'\.filter-btn-badge\.urgent\s*\{([^}]+)\}', css)
    if not badge_urgent_match or 'var(--ios-orange)' not in badge_urgent_match.group(1):
        errors.append(".filter-btn-badge.urgent does not use var(--ios-orange)")

    card_expired_match = re.search(r'\.card-progress-fill\.expired\s*\{([^}]+)\}', css)
    if not card_expired_match or 'var(--ios-red)' not in card_expired_match.group(1):
        errors.append(".card-progress-fill.expired does not use var(--ios-red)")

    badge_expired_match = re.search(r'\.filter-btn-badge\.expired\s*\{([^}]+)\}', css)
    if not badge_expired_match or 'var(--ios-red)' not in badge_expired_match.group(1):
        errors.append(".filter-btn-badge.expired does not use var(--ios-red)")

    # 5. Check zero Chinese parentheses
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 6. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All notice text (expired + upcoming together), popup modal sorting with custom order, and Samsung AMOLED UI lighter icon backgrounds requirements PASSED!")
        return True

if __name__ == '__main__':
    test_requirements()
