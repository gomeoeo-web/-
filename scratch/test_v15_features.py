import re
import sys

def verify_v15():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # 1. Push notification sliding switch in settings
    if 'id="toggleNotificationSwitch"' not in html:
        errors.append("toggleNotificationSwitch missing in index.html")
    if 'id="settingsNotifyStatusText"' not in html:
        errors.append("settingsNotifyStatusText missing in index.html")
    if 'toggleNotificationSwitch.addEventListener' not in js:
        errors.append("toggleNotificationSwitch event listener missing in app.js")

    # 2. History block rename & collapsible
    if 'id="btnToggleHistoryCollapse"' not in html:
        errors.append("btnToggleHistoryCollapse missing in index.html")
    if 'id="historyBlockTitle"' not in html or '歷史重設紀錄' not in html:
        errors.append("historyBlockTitle with '歷史重設紀錄' missing in index.html")
    if 'id="historyCountBadge"' not in html:
        errors.append("historyCountBadge missing in index.html")
    if 'id="historyToggleChevron"' not in html:
        errors.append("historyToggleChevron missing in index.html")
    if '.history-header-toggle' not in css:
        errors.append(".history-header-toggle class missing in style.css")
    if 'btnToggleHistoryCollapse.addEventListener' not in js:
        errors.append("btnToggleHistoryCollapse listener missing in app.js")

    # 3. Screen border protection across all screen fits
    if '--app-max-width: calc(100vw - 1rem)' not in css:
        errors.append("Full screen-fit edge margin protection missing in style.css")
    if 'max-width: min(var(--app-max-width, 440px), calc(100vw - 0.75rem))' not in css:
        errors.append("ios-app-container edge margin protection missing in style.css")
    for fit, w in [('standard', '390px'), ('plus', '440px'), ('tablet', '680px'), ('full', '600px')]:
        expected = f'[data-screen-fit="{fit}"] .ios-modal-card,\n[data-screen-fit="{fit}"] .ios-action-sheet'
        if expected not in css:
            errors.append(f"Safe edge bounds missing for screen fit {fit} in style.css")

    # 4. Version 1.6.1 check
    if '<span class="app-version-badge" id="appVersionBadge">v1.6.1</span>' not in html:
        errors.append("Version badge v1.6.1 missing in index.html")
    if "const APP_VERSION = '1.6.1';" not in js:
        errors.append("APP_VERSION 1.6.1 missing in app.js")

    # 4.0 Check 移出此群組 button
    if 'id="btnSheetRemoveGroup"' not in html:
        errors.append("btnSheetRemoveGroup missing in index.html")
    if '移出此群組' not in html:
        errors.append("移出此群組 missing in index.html")
    if 'btn-card-remove-from-group' in js:
        errors.append("btn-card-remove-from-group should be removed from app.js card rendering")

    # 4.1 Check alarm clock icon removed from 提醒發送時間
    if '⏰ 提醒發送時間' in html:
        errors.append("Alarm icon ⏰ still present in 提醒發送時間")
    if '提醒發送時間' not in html:
        errors.append("提醒發送時間 missing in index.html")

    # 4.2 Check date/time overflow prevention styles in style.css
    if '-webkit-appearance: none !important' not in css:
        errors.append("-webkit-appearance: none !important missing for date/time inputs in style.css")
    if 'input[type="date"]::-webkit-date-and-time-value' not in css:
        errors.append("WebKit date-and-time-value containment missing in style.css")

    # 5. Chinese parentheses check
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    if errors:
        print("FAIL:")
        for err in errors:
            print("  - " + err)
        sys.exit(1)
    else:
        print("SUCCESS: v1.5 features (notification switch, collapsible history, edge protection, v1.5 version) all verified!")
        sys.exit(0)

if __name__ == '__main__':
    verify_v15()
