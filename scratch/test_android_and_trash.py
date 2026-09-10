import re
import subprocess

def test_all():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    errors = []

    # 1. Android & Samsung OLED/AMOLED meta and styles
    if 'id="metaThemeColor"' not in html:
        errors.append("metaThemeColor element missing from index.html")
    if 'name="color-scheme"' not in html:
        errors.append("color-scheme meta tag missing from index.html")
    if '[data-theme="amoled"]' not in css:
        errors.append("[data-theme=\"amoled\"] style missing from style.css")
    if '#000000' not in css:
        errors.append("#000000 amoled pure black missing from style.css")
    if 'env(safe-area-inset-top' not in css or 'env(safe-area-inset-bottom' not in css:
        errors.append("safe-area-inset missing from style.css")

    # 2. AMOLED and Theme Handling in JS
    if 'setTheme' not in js:
        errors.append("setTheme function missing from app.js")
    if "'amoled'" not in js:
        errors.append("'amoled' theme key missing from app.js")
    if 'metaThemeColor.setAttribute' not in js:
        errors.append("metaThemeColor synchronization missing from setTheme in app.js")

    # 3. One-click clean expired items
    if 'id="btnCleanExpired"' not in html:
        errors.append("btnCleanExpired missing from index.html")
    if '.btn-clean-expired' not in css:
        errors.append(".btn-clean-expired style missing from style.css")
    if 'btnCleanExpired' not in js:
        errors.append("btnCleanExpired reference missing from app.js")
    if 'moveToRecentlyDeleted' not in js:
        errors.append("moveToRecentlyDeleted function missing from app.js")

    # 4. Recently Deleted Trash & 7-Day purge
    if 'id="recentlyDeletedModal"' not in html:
        errors.append("recentlyDeletedModal missing from index.html")
    if 'id="btnOpenRecentlyDeleted"' not in html:
        errors.append("btnOpenRecentlyDeleted missing from index.html")
    if 'id="trashBadgeCount"' not in html:
        errors.append("trashBadgeCount missing from index.html")
    if 'id="recentlyDeletedList"' not in html:
        errors.append("recentlyDeletedList missing from index.html")
    if 'id="trashActionsBar"' not in html:
        errors.append("trashActionsBar missing from index.html")
    if 'id="btnRestoreAllTrash"' not in html or 'id="btnEmptyTrash"' not in html:
        errors.append("Trash batch action buttons missing from index.html")

    if 'RECENTLY_DELETED_KEY' not in js:
        errors.append("RECENTLY_DELETED_KEY constant missing from app.js")
    if 'SEVEN_DAYS_MS' not in js:
        errors.append("SEVEN_DAYS_MS constant missing from app.js")
    if 'loadRecentlyDeleted' not in js:
        errors.append("loadRecentlyDeleted missing from app.js")
    if 'restoreItemFromTrash' not in js:
        errors.append("restoreItemFromTrash missing from app.js")
    if 'restoreAllFromTrash' not in js:
        errors.append("restoreAllFromTrash missing from app.js")
    if 'permanentlyDeleteItem' not in js:
        errors.append("permanentlyDeleteItem missing from app.js")
    if 'emptyTrash' not in js:
        errors.append("emptyTrash missing from app.js")

    # 5. Check 7-day auto-purge calculation logic
    if 'now - item.deletedAt) < SEVEN_DAYS_MS' not in js:
        errors.append("7-day auto-purge filter logic missing from loadRecentlyDeleted")

    # 6. Check Zero Chinese parentheses
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 7. Check JS Syntax via node if available
    try:
        res = subprocess.run(['node', '-c', 'app.js'], capture_output=True, text=True)
        if res.returncode != 0:
            errors.append(f"Node.js syntax check failed: {res.stderr}")
        else:
            print("Node.js syntax check: PASS")
    except FileNotFoundError:
        pass

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("ALL ANDROID ADAPTATION AND RECENTLY DELETED TESTS PASSED!")
        return True

if __name__ == '__main__':
    test_all()
