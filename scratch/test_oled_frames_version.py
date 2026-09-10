import re
import sys

def test_requirements():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    errors = []

    # 1. Top-Left Version Badge (1.6.0, incrementing by 0.0.1 per change)
    if 'id="appVersionBadge"' not in html:
        errors.append("appVersionBadge missing from index.html")
    if '1.6.0' not in html:
        errors.append("Version 1.6.0 missing from index.html")
    if '.app-version-badge' not in css:
        errors.append(".app-version-badge style missing from style.css")
    if "APP_VERSION = '1.6.0'" not in js:
        errors.append("APP_VERSION constant missing from app.js")

    # 1.1 App Name: 期效管家
    if '<title>期效管家</title>' not in html:
        errors.append("<title>期效管家</title> missing from index.html")
    if '期效管家備份_' not in js:
        errors.append("期效管家備份_ missing from app.js")

    # 1.2 重設週期 button check
    if 'id="btnSheetResetText">重設週期</span>' not in html:
        errors.append("btnSheetResetText with '重設週期' missing in index.html")
    if "btnSheetResetText.textContent = '重設週期'" not in js:
        errors.append("btnSheetResetText textContent '重設週期' missing in app.js")

    # 1.3 移出此群組按鈕 check (只保留點入物品裡的移出此群組按鈕)
    if 'id="btnSheetRemoveGroup"' not in html:
        errors.append("btnSheetRemoveGroup missing from index.html")
    if '移出此群組' not in html:
        errors.append("移出此群組 missing from index.html")
    if 'btn-card-remove-from-group' in js:
        errors.append("btn-card-remove-from-group should be removed from app.js card rendering")

    # 1.4 提醒滑動開關 check
    if 'id="itemReminderToggle"' not in html:
        errors.append("itemReminderToggle missing from index.html")
    if '.ios-switch' not in css:
        errors.append(".ios-switch missing from style.css")
    if 'itemReminderToggle' not in js:
        errors.append("itemReminderToggle handling missing in app.js")

    # 2. OLED Pure Black Mode Urgent & Expired Colors
    oled_urgent_badge = '[data-theme="amoled"] .filter-btn-badge.urgent'
    if oled_urgent_badge not in css:
        errors.append(f"{oled_urgent_badge} missing from style.css")
    else:
        m = re.search(r'\[data-theme="amoled"\]\s+\.filter-btn-badge\.urgent\s*\{([^}]+)\}', css)
        if not m or '#ff9f0a' not in m.group(1):
            errors.append(f"{oled_urgent_badge} does not set #ff9f0a color in style.css")

    oled_urgent_active = '[data-theme="amoled"] .home-filter-btn.active .filter-btn-badge.urgent'
    if oled_urgent_active not in css:
        errors.append(f"{oled_urgent_active} missing from style.css")

    oled_expired_badge = '[data-theme="amoled"] .filter-btn-badge.expired'
    if oled_expired_badge not in css:
        errors.append(f"{oled_expired_badge} missing from style.css")
    else:
        m = re.search(r'\[data-theme="amoled"\]\s+\.filter-btn-badge\.expired\s*\{([^}]+)\}', css)
        if not m or '#ff453a' not in m.group(1):
            errors.append(f"{oled_expired_badge} does not set #ff453a color in style.css")

    oled_expired_active = '[data-theme="amoled"] .home-filter-btn.active .filter-btn-badge.expired'
    if oled_expired_active not in css:
        errors.append(f"{oled_expired_active} missing from style.css")

    oled_rules = [
        '[data-theme="amoled"] .card-metric-sub.urgent',
        '[data-theme="amoled"] .card-metric-sub.expired',
        '[data-theme="amoled"] .card-progress-fill.urgent',
        '[data-theme="amoled"] .card-progress-fill.expired',
        '[data-theme="amoled"] .notice-num.expired',
        '[data-theme="amoled"] .notice-num.urgent'
    ]
    for r in oled_rules:
        if r not in css:
            errors.append(f"OLED rule '{r}' missing from style.css")

    # 3. Outer Frames Screen Edge Safety
    sheet_m = re.search(r'\.ios-action-sheet\s*\{([^}]+)\}', css)
    if not sheet_m or 'border-radius: 26px' not in sheet_m.group(1):
        errors.append(".ios-action-sheet should have 4-corner rounded border-radius: 26px")

    action_backdrop_m = re.search(r'\.ios-action-backdrop\s*\{([^}]+)\}', css)
    if not action_backdrop_m:
        errors.append(".ios-action-backdrop rule missing in style.css")

    # App container side padding should protect borders
    if 'max(1.2rem' not in css:
        errors.append(".ios-app-container should have safe margin/padding of at least 1.2rem")

    # Modal card screen edge safety
    if 'max-width: calc(100% - 0.5rem);' not in css:
        errors.append(".ios-modal-card in mobile media query should protect edges with calc(100% - 0.5rem)")

    # 4. Action Sheet Vertical Button Stacking & Height Constrained
    if 'max-height: min(85vh' not in css and 'max-height: min(88vh' not in css and 'max-height:' not in sheet_m.group(1):
        errors.append(".ios-action-sheet must constrain max-height")
    if 'overflow-y: auto' not in sheet_m.group(1):
        errors.append(".ios-action-sheet must have overflow-y: auto")

    # Check 4 buttons exist and are in vertical list inside .sheet-actions-group
    for btn_id in ['btnSheetEdit', 'btnSheetReset', 'btnSheetArchive', 'btnSheetDelete']:
        if f'id="{btn_id}"' not in html:
            errors.append(f"{btn_id} missing from index.html")

    # Check sheet-actions-group is flex column
    actions_group_m = re.search(r'\.sheet-actions-group\s*\{([^}]+)\}', css)
    if not actions_group_m or 'flex-direction: column' not in actions_group_m.group(1):
        errors.append(".sheet-actions-group must have flex-direction: column for vertical arrangement")

    # 5. Icons in 到期提醒, 存放地點, 備註說明 must all be removed
    if '🔔 到期提醒' in html:
        errors.append("🔔 icon still present in 到期提醒通知 in index.html")
    if '🔔' in js and '${getWarnDaysLabel(item)}' in js and '🔔 ${getWarnDaysLabel(item)}' in js:
        errors.append("🔔 icon still present in 到期提醒 in app.js")
    if '📍 ${escapeHtml(item.location)}' in js:
        errors.append("📍 icon still present in 存放地點 in app.js")
    if '💬 ${escapeHtml(item.notes)}' in js:
        errors.append("💬 icon still present in 備註說明 in app.js")

    # 6. Default Screen Fit: 大螢幕 (plus)
    if 'data-screen-fit="plus"' not in html:
        errors.append("html element must have default data-screen-fit='plus'")

    # 7. Card Top Row Overlap Fix
    top_row_m = re.search(r'\.card-top-row\s*\{([^}]+)\}', css)
    if not top_row_m or 'gap:' not in top_row_m.group(1):
        errors.append(".card-top-row must have gap property")
    if not top_row_m or 'min-width: 0' not in top_row_m.group(1):
        errors.append(".card-top-row must have min-width: 0")

    cat_tag_m = re.search(r'\.card-category-tag\s*\{([^}]+)\}', css)
    if not cat_tag_m or 'text-overflow: ellipsis' not in cat_tag_m.group(1):
        errors.append(".card-category-tag must have text-overflow: ellipsis")
    if not cat_tag_m or 'white-space: nowrap' not in cat_tag_m.group(1):
        errors.append(".card-category-tag must have white-space: nowrap")
    if not cat_tag_m or 'overflow: hidden' not in cat_tag_m.group(1):
        errors.append(".card-category-tag must have overflow: hidden")

    # 8. Zero Chinese Parentheses
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 9. Zero '二級選單'
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All vertical button layout, icon removals, OLED colors, frame edge safety, and v1.01 requirements PASSED!")
        return True

if __name__ == '__main__':
    ok = test_requirements()
    sys.exit(0 if ok else 1)
