import subprocess
import os
import re

js_code = """
window.addEventListener('load', () => {
    // Add flex-shrink: 0 to all settings-group
    document.querySelectorAll('.settings-group').forEach(g => {
        g.style.flexShrink = '0';
    });

    setTimeout(() => {
        const rows = document.querySelectorAll('.settings-row, .settings-row-btn');
        const results = [];
        rows.forEach(r => {
            const rect = r.getBoundingClientRect();
            const group = r.closest('.settings-group');
            const groupRect = group ? group.getBoundingClientRect() : null;
            const desc = r.querySelector('.settings-desc');
            const descRect = desc ? desc.getBoundingClientRect() : null;
            results.push({
                id: r.id || r.className,
                rectHeight: Math.round(rect.height),
                groupHeight: groupRect ? Math.round(groupRect.height) : null,
                groupBottom: groupRect ? Math.round(groupRect.bottom) : null,
                rowBottom: Math.round(rect.bottom),
                overflowsGroup: groupRect ? (Math.round(rect.bottom) > Math.round(groupRect.bottom)) : false,
                descBottom: descRect ? Math.round(descRect.bottom) : null,
                descOverflowsGroup: (descRect && groupRect) ? (Math.round(descRect.bottom) > Math.round(groupRect.bottom)) : false
            });
        });
        const pre = document.createElement('pre');
        pre.id = 'layout-results';
        pre.textContent = JSON.stringify(results, null, 2);
        document.body.appendChild(pre);
    }, 100);
});
"""

with open('scratch/test_settings_view.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'<script id="inject-test">[\s\S]*?</script>', '', html)
html = re.sub(r'<pre id="layout-results">[\s\S]*?</pre>', '', html)

html_with_inject = html.replace('</body>', f'<script id="inject-test">{js_code}</script></body>')
with open('scratch/test_settings_view.html', 'w', encoding='utf-8') as f:
    f.write(html_with_inject)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
file_url = 'file:///' + os.path.abspath('scratch/test_settings_view.html').replace('\\', '/')

cmd = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=2000',
    '--window-size=390,844',
    '--dump-dom',
    file_url
]

out = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
match = re.search(r'<pre id="layout-results">([\s\S]*?)</pre>', out.stdout)
if match:
    print(match.group(1))
else:
    print('No results found in dump-dom')
