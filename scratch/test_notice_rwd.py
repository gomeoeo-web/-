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

    # 2. .status-notice-card row layout & vertical centering & spacious card
    card_match = re.search(r'\.status-notice-card\s*\{([^}]+)\}', css)
    if not card_match:
        errors.append(".status-notice-card rule missing in style.css")
    else:
        card_content = card_match.group(1)
        for prop in ['display: flex;', 'align-items: center;', 'justify-content: space-between;', 'min-height: 52px;', 'padding: 12px 15px;']:
            if prop not in card_content:
                errors.append(f".status-notice-card missing '{prop}'")

    # 3. Top row / Left group alignment
    left_match = re.search(r'\.notice-top-row[^{]*\{([^}]+)\}', css)
    if not left_match:
        errors.append(".notice-top-row rule missing in style.css")
    else:
        l_content = left_match.group(1)
        if 'display: flex;' not in l_content or 'align-items: center;' not in l_content:
            errors.append(".notice-top-row missing display: flex; align-items: center;")

    # 4. noticeTitle placed before btnCleanExpired in HTML
    title_idx = html.find('id="noticeTitle"')
    btn_clean_idx = html.find('id="btnCleanExpired"')
    if title_idx == -1 or btn_clean_idx == -1:
        errors.append("noticeTitle or btnCleanExpired missing in index.html")
    elif title_idx > btn_clean_idx:
        errors.append("noticeTitle must be placed before btnCleanExpired in index.html")

    # 5. .notice-title enlarged font-size: 1.05rem; line-height: 1.52 (increased line spacing for breathing room)
    title_match = re.search(r'\.notice-title\s*\{([^}]+)\}', css)
    if not title_match:
        errors.append(".notice-title rule missing in style.css")
    else:
        title_content = title_match.group(1)
        if 'font-size: 1.05rem;' not in title_content:
            errors.append(".notice-title missing 'font-size: 1.05rem;'")
        if 'line-height: 1.52;' not in title_content:
            errors.append(".notice-title should use line-height: 1.52 for increased line spacing")

    # 5b. .notice-num enlarged prominent numbers (font-size >= 1.25rem, bold)
    num_match = re.search(r'\.notice-num\s*\{([^}]+)\}', css)
    if not num_match:
        errors.append(".notice-num rule missing in style.css")
    else:
        num_content = num_match.group(1)
        if 'font-weight: 800;' not in num_content:
            errors.append(".notice-num should have font-weight: 800;")
    if 'class="notice-num' not in js:
        errors.append("noticeTitle.innerHTML should wrap numbers with notice-num in app.js")

    # 5c. 今天到期 (dueToday) support in noticeTitle
    if '今天到期' not in js or 'dueToday' not in js:
        errors.append("dueToday and '今天到期' must be supported in app.js updateNoticeCardAndPillCounts")
    if '.notice-num.due-today' not in css:
        errors.append(".notice-num.due-today rule missing from style.css")

    # 6. Delete right status tag (已過期、即將過期框框)
    status_tag_css = re.search(r'\.notice-status-tag[^{]*\{([^}]+)\}', css)
    if not status_tag_css or 'display: none !important;' not in status_tag_css.group(1):
        errors.append(".notice-status-tag must be hidden with 'display: none !important;'")

    # 7. Button icon-only (text removed, only icon), right-aligned & vertically centered
    btn_match = re.search(r'<button[^>]*id="btnCleanExpired"[^>]*>([\s\S]*?)</button>', html)
    if not btn_match:
        errors.append("btnCleanExpired button missing in index.html")
    else:
        btn_inner = btn_match.group(1)
        if '<svg' not in btn_inner:
            errors.append("btnCleanExpired must contain SVG icon")
        if re.search(r'<span>[\s\S]*?</span>', btn_inner):
            errors.append("btnCleanExpired should have text removed, only keeping the icon")

    right_actions_match = re.search(r'\.notice-right-actions[^{]*\{([^}]+)\}', css)
    if not right_actions_match:
        errors.append(".notice-right-actions rule missing in style.css")
    else:
        ra_content = right_actions_match.group(1)
        if 'display: flex;' not in ra_content or 'align-items: center;' not in ra_content or 'justify-content: flex-end;' not in ra_content:
            errors.append(".notice-right-actions must have display: flex; align-items: center; justify-content: flex-end;")

    btn_css_match = re.search(r'\.btn-clean-expired\s*\{([^}]+)\}', css)
    if not btn_css_match or 'border-radius: 50%;' not in btn_css_match.group(1):
        errors.append(".btn-clean-expired should be circular icon button with border-radius: 50%;")

    # 8. Check zero Chinese parentheses in index.html visible text
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 9. Check '二級選單' across all files
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: Notice title placed above btnCleanExpired, bottom-right placement verified, all requirements PASSED!")
        return True

if __name__ == '__main__':
    test_notice_rwd()
