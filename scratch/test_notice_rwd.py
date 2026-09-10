import re

def test_notice_rwd():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    errors = []

    # 1. Viewport Meta in index.html
    expected_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
    if expected_viewport not in html:
        errors.append("Standard viewport tag with viewport-fit=cover missing from index.html")

    # 2. .status-notice-card responsive rules
    card_match = re.search(r'\.status-notice-card\s*\{([^}]+)\}', css)
    if not card_match:
        errors.append(".status-notice-card rule missing in style.css")
    else:
        card_content = card_match.group(1)
        for prop in ['width: 100%;', 'box-sizing: border-box;', 'padding: 12px 16px;', 'flex-wrap: wrap;']:
            if prop not in card_content:
                errors.append(f".status-notice-card missing '{prop}'")

    # 3. .notice-text-group text protection
    text_group_match = re.search(r'\.notice-text-group\s*\{([^}]+)\}', css)
    if not text_group_match:
        errors.append(".notice-text-group rule missing in style.css")
    else:
        tg_content = text_group_match.group(1)
        if 'flex: 1 1 auto;' not in tg_content:
            errors.append(".notice-text-group missing 'flex: 1 1 auto;'")
        if 'min-width:' not in tg_content:
            errors.append(".notice-text-group missing 'min-width:'")

    # 4. .notice-title text wrapping & keep-all
    title_match = re.search(r'\.notice-title\s*\{([^}]+)\}', css)
    if not title_match:
        errors.append(".notice-title rule missing in style.css")
    else:
        title_content = title_match.group(1)
        if 'white-space: normal;' not in title_content:
            errors.append(".notice-title missing 'white-space: normal;'")
        if 'word-break: keep-all;' not in title_content:
            errors.append(".notice-title missing 'word-break: keep-all;'")

    # 5. Buttons flex-shrink: 0 and white-space: nowrap
    actions_match = re.search(r'\.notice-actions-wrap\s*\{([^}]+)\}', css)
    if not actions_match or 'flex-shrink: 0;' not in actions_match.group(1):
        errors.append(".notice-actions-wrap missing 'flex-shrink: 0;'")

    tag_match = re.search(r'\.notice-status-tag\s*\{([^}]+)\}', css)
    if not tag_match or 'white-space: nowrap;' not in tag_match.group(1):
        errors.append(".notice-status-tag missing 'white-space: nowrap;'")

    btn_match = re.search(r'\.btn-clean-expired\s*\{([^}]+)\}', css)
    if not btn_match or 'white-space: nowrap;' not in btn_match.group(1):
        errors.append(".btn-clean-expired missing 'white-space: nowrap;'")

    # 6. Check max-width: 420px responsive media query
    media_420_match = re.search(r'@media\s*\(max-width:\s*420px\)\s*\{([\s\S]*?)\n\}', css)
    if not media_420_match:
        errors.append("@media (max-width: 420px) block missing in style.css")
    else:
        m_content = media_420_match.group(1)
        if '.notice-actions-wrap' not in m_content or 'width: 100%;' not in m_content:
            errors.append(".notice-actions-wrap with width: 100% missing in @media (max-width: 420px)")

    # 7. Check zero Chinese parentheses in index.html visible text
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 8. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All Notice Card RWD layout, text protection, and viewport requirements PASSED!")
        return True

if __name__ == '__main__':
    test_notice_rwd()
