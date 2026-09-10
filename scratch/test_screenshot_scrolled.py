import subprocess
import os

with open('scratch/test_settings_view.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add a script that scrolls .ios-settings-list to the bottom
scroll_script = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        const list = document.querySelector('.ios-settings-list');
        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, 200);
});
</script>
"""

html_scrolled = html.replace('</body>', scroll_script + '</body>')

with open('scratch/test_settings_scrolled.html', 'w', encoding='utf-8') as f:
    f.write(html_scrolled)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
file_url = 'file:///' + os.path.abspath('scratch/test_settings_scrolled.html').replace('\\', '/')
out_png = os.path.abspath('scratch/chrome_settings_scrolled_390.png')

cmd = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=2000',
    '--window-size=390,844',
    f'--screenshot={out_png}',
    file_url
]

subprocess.run(cmd, check=True)
print('Scrolled screenshot generated at:', out_png)
