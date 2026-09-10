import subprocess
import os

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
print('Scrolled screenshot taken at:', out_png)
