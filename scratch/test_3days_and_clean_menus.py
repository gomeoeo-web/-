import re

def test_all():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # 1. Check icon before "選單分類與細項設定" is removed
    if '<span class="box-icon">📂</span>' in html:
        errors.append("Box icon 📂 still exists in index.html")
    
    # Check that "選單分類與細項設定" is still present
    if '<span>選單分類與細項設定</span>' not in html:
        errors.append("選單分類與細項設定 text is missing from index.html")

    # Check that other category icons are preserved in index.html
    for icon_term in ['🛡️ 保固', '🚗 車輛', '📅 訂閱', '💊 藥品', '🧼 清潔', '🔄 耗材']:
        if icon_term not in html:
            errors.append(f"Expected category icon '{icon_term}' missing from index.html (other icons should be retained)")

    # 2. Check 3-day notice logic in app.js
    if 'within3Days' not in js:
        errors.append("within3Days variable missing from updateNoticeCardAndPillCounts")
    if 'noticeStatusText.textContent = \'即將到期\'' not in js:
        errors.append("Notice tag text '即將到期' missing from app.js")
    if '項即將到期' not in js:
        errors.append("Notice title text '項即將到期' missing from app.js")

    # 3. Check persistent device initialization logic
    if 'DEVICE_INITIALIZED_KEY' not in js:
        errors.append("DEVICE_INITIALIZED_KEY constant missing from app.js")
    if 'isDeviceAlreadyInitialized' not in js:
        errors.append("isDeviceAlreadyInitialized function missing from app.js")
    if 'alreadyInitialized' not in js:
        errors.append("alreadyInitialized variable check missing from loadItems")

    # 4. Check zero Chinese parentheses
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 5. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("ALL TESTS PASSED: 3-day notice, device persistence, and icon removal verified!")
        return True

if __name__ == '__main__':
    test_all()
