import subprocess
import os

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Make settingsModal visible by default for the test screenshot, and set data-screen-fit="standard"
test_content = content.replace(
    'id="settingsModal" class="ios-modal-backdrop" style="display:none;"',
    'id="settingsModal" class="ios-modal-backdrop" style="display:flex;"'
).replace('href="style.css"', 'href="../style.css"').replace(
    '<html lang="zh-TW">', '<html lang="zh-TW" data-screen-fit="standard">'
).replace(
    '<span class="settings-desc" id="settingsScreenFitText">大螢幕 440px</span>',
    '<span class="settings-desc" id="settingsScreenFitText">標準手機 390px</span>'
).replace(
    '<option value="plus" selected>大螢幕 440px</option>',
    '<option value="plus">大螢幕 440px</option>'
).replace(
    '<option value="standard">標準手機 390px</option>',
    '<option value="standard" selected>標準手機 390px</option>'
)

# Also inject inline style for testing the fix: .settings-group { flex-shrink: 0 !important; }
inject_css = """
<style>
.settings-group {
    flex-shrink: 0 !important;
}
.ios-settings-list {
    padding-bottom: 5rem !important;
}
.screen-fit-select {
    padding: 0.32rem 1.4rem 0.32rem 0.65rem !important;
    font-size: 0.78rem !important;
}
.screen-fit-select-wrap .select-arrow {
    right: 0.45rem !important;
}
</style>
"""

test_content = test_content.replace('</head>', inject_css + '</head>')

with open('scratch/test_settings_view.html', 'w', encoding='utf-8') as f:
    f.write(test_content)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
file_url = 'file:///' + os.path.abspath('scratch/test_settings_view.html').replace('\\', '/')
out_png = os.path.abspath('scratch/chrome_settings_fixed_390.png')

cmd = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--window-size=390,844',
    f'--screenshot={out_png}',
    file_url
]

subprocess.run(cmd, check=True)
print('Screenshot generated at:', out_png)
