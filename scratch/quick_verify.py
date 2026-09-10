with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()
with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

checks = [
    ('1. Notice card sub-item display: none in CSS', '.notice-desc {\n  display: none !important;\n}' in css),
    ('2. views-slider-viewport overflow: hidden in CSS', '.views-slider-viewport {\n  width: 100%;\n  overflow: hidden;' in css),
    ('3. views-slider-viewport contain: paint in CSS', 'contain: paint;' in css),
    ('4. view-panel isolation rules in CSS', 'flex: 0 0 100%;' in css and 'width: 100%;' in css and 'max-width: 100%;' in css and 'box-sizing: border-box;' in css and 'overflow-x: hidden;' in css and 'overflow-x: clip;' in css),
    ('5. Inactive panel visibility: hidden in CSS', '.views-slider-viewport:not(.is-swiping) .view-panel:not(.active-panel) {\n  visibility: hidden !important;' in css),
    ('6. Active-panel visibility: visible in CSS', '.view-panel.active-panel {\n  visibility: visible !important;' in css),
    ('7. Prominent btn-group-settings-main in CSS', '#363646' in css),
    ('8. AMOLED prominent btn-group-settings-main in CSS', '#323244' in css),
    ('9. setActivePanel and swiping state in JS', 'setActivePanel' in js and 'setPanelsSwipingState' in js),
    ('10. index.html initial active-panel and hidden', 'class="view-panel active-panel" id="viewPanelToday"' in html and 'id="viewPanelInventory" style="visibility: hidden;"' in html)
]

all_ok = True
for name, res in checks:
    status = 'OK' if res else 'FAIL'
    if not res:
        all_ok = False
    print(f'{name:50s}: {status}')

if all_ok:
    print('\nALL 10 CHECKPOINTS VERIFIED!')
else:
    print('\nSOME CHECKPOINTS FAILED!')
