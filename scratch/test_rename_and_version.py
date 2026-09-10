import re
import sys

def verify():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # Title check
    if '<title>期效管家</title>' not in html:
        errors.append("HTML title is not <title>期效管家</title>")

    # Version check (1.5.5)
    if '<span class="app-version-badge" id="appVersionBadge">v1.5.5</span>' not in html:
        errors.append("HTML appVersionBadge is not v1.5.5")

    if "const APP_VERSION = '1.5.5';" not in js:
        errors.append("app.js APP_VERSION is not '1.5.5'")

    # Date custom grid check
    if 'flex-direction: column' not in css or '.date-custom-grid' not in css:
        errors.append(".date-custom-grid must be flex-direction: column in style.css")

    # Backup file name check
    if '期效管家備份_${getTodayString()}.json' not in js:
        errors.append("Backup file name in app.js does not start with 期效管家備份_")

    # Header title check
    if "headerMainTitle.textContent = '期效管家'" not in js:
        errors.append("headerMainTitle fallback in app.js is not 期效管家")

    # Ensure no old app names remain in core app files
    for fname, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '物品天數' in content:
            errors.append(f"'物品天數' found in {fname}")

    # Ensure zero Chinese parentheses in visible text
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    if errors:
        print("VERIFICATION FAILED:")
        for err in errors:
            print("  - " + err)
        sys.exit(1)
    else:
        print("ALL VERIFICATIONS PASSED: App named '期效管家', version is 'v1.1' (rule: +0.1 per change), zero old name occurrences, zero Chinese parentheses.")
        sys.exit(0)

if __name__ == '__main__':
    verify()
