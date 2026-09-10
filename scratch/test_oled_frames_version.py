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

    # 1. Top-Left Version Badge (1.0)
    if 'id="appVersionBadge"' not in html:
        errors.append("appVersionBadge missing from index.html")
    if '1.0' not in html:
        errors.append("Version 1.0 missing from index.html")
    if '.app-version-badge' not in css:
        errors.append(".app-version-badge style missing from style.css")
    if "APP_VERSION = '1.0'" not in js:
        errors.append("APP_VERSION = '1.0' constant missing from app.js")

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

    # 4. Zero Chinese Parentheses
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 5. Zero '二級選單'
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All OLED colors, frame edge safety, and v1.0 version tag requirements PASSED!")
        return True

if __name__ == '__main__':
    ok = test_requirements()
    sys.exit(0 if ok else 1)
