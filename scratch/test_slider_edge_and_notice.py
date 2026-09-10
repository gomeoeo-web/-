import re

def test_requirements():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # 1. Check Notice Card does not show sub-item details (不需顯示細項，只需顯示有幾項已過期或將到期)
    if 'noticeDesc.style.display = \'none\'' not in js:
        errors.append("noticeDesc.style.display = 'none' missing from updateNoticeCardAndPillCounts in app.js")
    
    if '.notice-desc' not in css or 'display: none !important;' not in css:
        errors.append(".notice-desc { display: none !important; } missing in style.css")

    # Check noticeTitle counts format:
    if 'noticeTitle.textContent = `有 ${expired} 項已過期、${urgent} 項即將到期`;' not in js:
        errors.append("noticeTitle must show both expired and urgent counts when both > 0")
    if 'noticeTitle.textContent = `有 ${expired} 項已過期`;' not in js:
        errors.append("noticeTitle must show only expired count when urgent === 0")
    if 'noticeTitle.textContent = `有 ${urgent} 項即將到期`;' not in js:
        errors.append("noticeTitle must show only urgent count when expired === 0")
    if 'noticeTitle.textContent = \'今天都在週期內\';' not in js:
        errors.append("noticeTitle must show '今天都在週期內' when none expired or urgent")

    # 2. Check Group settings button is prominent
    btn_main_match = re.search(r'\.btn-group-settings-main\s*\{([^}]+)\}', css)
    if not btn_main_match:
        errors.append(".btn-group-settings-main rule missing in style.css")
    else:
        content = btn_main_match.group(1)
        if '#363646' not in content and 'background' not in content:
            errors.append(".btn-group-settings-main should have prominent background")
        if 'color: #ffffff' not in content:
            errors.append(".btn-group-settings-main should have white text color")

    # Check AMOLED mode prominent background
    amoled_btn_match = re.search(r'\[data-theme="amoled"\]\s+\.btn-group-settings-main\s*\{([^}]+)\}', css)
    if not amoled_btn_match or '#323244' not in amoled_btn_match.group(1):
        errors.append("AMOLED .btn-group-settings-main should have prominent elevated background #323244")

    # 3. Check slider isolation & inactive panel hiding
    # 3.1 .views-slider-viewport
    viewport_match = re.search(r'\.views-slider-viewport\s*\{([^}]+)\}', css)
    if not viewport_match:
        errors.append(".views-slider-viewport rule missing in style.css")
    else:
        vp_content = viewport_match.group(1)
        if 'overflow: hidden;' not in vp_content:
            errors.append(".views-slider-viewport missing 'overflow: hidden;'")
        if 'contain: paint;' not in vp_content:
            errors.append(".views-slider-viewport missing 'contain: paint;'")

    # 3.2 .view-panel strict isolation
    panel_match = re.search(r'\.view-panel\s*\{([^}]+)\}', css)
    if not panel_match:
        errors.append(".view-panel rule missing in style.css")
    else:
        p_content = panel_match.group(1)
        for req in ['flex: 0 0 100%;', 'width: 100%;', 'max-width: 100%;', 'box-sizing: border-box;', 'overflow-x: hidden;', 'overflow-x: clip;']:
            if req not in p_content:
                errors.append(f".view-panel missing '{req}' in style.css")

    # 3.3 CSS inactive panel hiding rules
    if '.views-slider-viewport:not(.is-swiping) .view-panel:not(.active-panel)' not in css:
        errors.append("CSS rule for hiding inactive panel (.views-slider-viewport:not(.is-swiping) .view-panel:not(.active-panel)) missing")
    if '.view-panel.active-panel' not in css:
        errors.append("CSS rule for .view-panel.active-panel missing")
    if '.views-slider-viewport.is-swiping .view-panel' not in css:
        errors.append("CSS rule for .views-slider-viewport.is-swiping .view-panel missing")

    # 3.4 JS panel toggling
    if 'setActivePanel' not in js:
        errors.append("setActivePanel function missing in app.js")
    if 'setPanelsSwipingState' not in js:
        errors.append("setPanelsSwipingState function missing in app.js")
    if 'active-panel' not in js:
        errors.append("'active-panel' class manipulation missing in app.js")

    # 3.5 HTML initial state
    if 'class="view-panel active-panel" id="viewPanelToday"' not in html:
        errors.append("id='viewPanelToday' should initially have class 'active-panel' in index.html")
    if 'id="viewPanelInventory" style="visibility: hidden;"' not in html:
        errors.append("id='viewPanelInventory' should initially have style='visibility: hidden;' in index.html")

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
        print("SUCCESS: All notice simplicity, prominent group button, and slider subpixel edge bleed prevention requirements PASSED!")
        return True

if __name__ == '__main__':
    test_requirements()
