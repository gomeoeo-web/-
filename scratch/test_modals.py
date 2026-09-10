import re

html = open('index.html', encoding='utf-8').read()
modals = re.findall(r'<div[^>]+id="([^"]+)"[^>]*class="[^"]*(?:modal|sheet)[^"]*"', html)
print("Modals found:", modals)
close_btns = re.findall(r'<button[^>]+id="([^"]+)"[^>]*class="[^"]*close[^"]*"', html, re.I)
print("Close buttons found:", close_btns)
