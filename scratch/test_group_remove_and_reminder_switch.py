import re
import sys

def test_new_features():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()
    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    errors = []

    # 1. 移出此群組按鈕 (只保留點入物品裡的移出此群組按鈕)
    if 'id="btnSheetRemoveGroup"' not in html:
        errors.append("btnSheetRemoveGroup missing in index.html")
    if '移出此群組' not in html:
        errors.append("移出此群組 missing in index.html")
    if 'btn-card-remove-from-group' in js:
        errors.append("btn-card-remove-from-group should be removed from app.js card rendering")
    if 'removeItemFromCurrentCategory' not in js:
        errors.append("removeItemFromCurrentCategory missing in app.js")

    # 2. 提醒選項滑動開關
    if 'id="itemReminderToggle"' not in html:
        errors.append("itemReminderToggle checkbox missing in index.html")
    if '.ios-switch' not in css or '.ios-switch-slider' not in css:
        errors.append("iOS switch CSS classes missing in style.css")
    if 'updateReminderToggleState' not in js:
        errors.append("updateReminderToggleState function missing in app.js")

    # 3. 版本號 1.6.1
    if '<span class="app-version-badge" id="appVersionBadge">v1.6.1</span>' not in html:
        errors.append("v1.6.1 badge missing in index.html")
    if "const APP_VERSION = '1.6.1';" not in js:
        errors.append("APP_VERSION 1.6.1 missing in app.js")

    if errors:
        print("FAIL:")
        for err in errors:
            print("  - " + err)
        sys.exit(1)
    else:
        print("SUCCESS: 移除此群組按鈕, 提醒滑動式開關, 版本號 v1.4 全部通過驗證！")
        sys.exit(0)

if __name__ == '__main__':
    test_new_features()
