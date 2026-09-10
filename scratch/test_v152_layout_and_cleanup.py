import re
import sys

def test_v152_requirements():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()
    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    errors = []

    # 1. Action bar layout: vertical column stacking with single-line horizontal title and buttons underneath
    cat_bar_m = re.search(r'\.category-action-bar\s*\{([^}]+)\}', css)
    if not cat_bar_m or 'flex-direction: column' not in cat_bar_m.group(1):
        errors.append(".category-action-bar must have flex-direction: column so buttons display below name")

    info_badge_m = re.search(r'\.category-info-badge\s*\{([^}]+)\}', css)
    if not info_badge_m or 'white-space: nowrap' not in info_badge_m.group(1):
        errors.append(".category-info-badge must have white-space: nowrap for single horizontal row")

    name_m = re.search(r'\.cat-active-name\s*\{([^}]+)\}', css)
    if not name_m or 'white-space: nowrap' not in name_m.group(1):
        errors.append(".cat-active-name must have white-space: nowrap so group name does not wrap vertically")

    btn_settings_m = re.search(r'\.btn-group-settings-main\s*\{([^}]+)\}', css)
    if not btn_settings_m or 'flex: 1' not in btn_settings_m.group(1):
        errors.append(".btn-group-settings-main must have flex: 1 for balanced row layout")

    btn_add_m = re.search(r'\.btn-add-items-to-cat\s*\{([^}]+)\}', css)
    if not btn_add_m or 'flex: 1' not in btn_add_m.group(1):
        errors.append(".btn-add-items-to-cat must have flex: 1 for balanced row layout")

    # 2. Deletion of firstPageCategorySelect from group settings modal
    if 'id="firstPageCategorySelect"' in html:
        errors.append("firstPageCategorySelect should be removed from index.html")
    if 'first-page-cat-card' in html:
        errors.append("first-page-cat-card should be removed from index.html")

    # 3. Version check
    if 'id="appVersionBadge"' not in html or 'v1.5.9' not in html:
        errors.append("v1.5.9 badge missing in index.html")
    if "const APP_VERSION = '1.5.9';" not in js:
        errors.append("APP_VERSION 1.5.9 missing in app.js")

    # 4. Zero Chinese parentheses in visible text
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All v1.5.2 category action bar layout and modal cleanup tests PASSED!")
        return True

if __name__ == '__main__':
    ok = test_v152_requirements()
    sys.exit(0 if ok else 1)
