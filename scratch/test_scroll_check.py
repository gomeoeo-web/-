import subprocess
import os
import re

js_code = """
window.addEventListener('load', () => {
    setTimeout(() => {
        const list = document.querySelector('.ios-settings-list');
        list.scrollTop = 9999;
        const pre = document.createElement('pre');
        pre.id = 'layout-results';
        pre.textContent = JSON.stringify({
            scrollHeight: list.scrollHeight,
            clientHeight: list.clientHeight,
            scrollTop: list.scrollTop,
            canScroll: list.scrollHeight > list.clientHeight
        }, null, 2);
        document.body.appendChild(pre);
    }, 300);
});
"""

with open('scratch/test_settings_view.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'<script id="inject-test">[\s\S]*?</script>', '', html)
html = re.sub(r'<pre id="layout-results">[\s\S]*?</pre>', '', html)

html_with_inject = html.replace('</body>', f'<script id="inject-test">{js_code}</script></body>')
with open('scratch/test_settings_scrolled.html', 'w', encoding='utf-8') as f:
    f.write(html_with_inject)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
file_url = 'file:///' + os.path.abspath('scratch/test_settings_scrolled.html').replace('\\', '/')

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
    print('No results found')
