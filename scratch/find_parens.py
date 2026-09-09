import sys, re

sys.stdout.reconfigure(encoding='utf-8')

print("--- INDEX.HTML ---")
with open('d:/我的APP/index.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        m = re.findall(r'[\(（][^\)）\n]*[\)）]', line)
        if m:
            print(f"HTML:{i}: {line.strip()} | PARENS: {m}")

print("\n--- APP.JS STRINGS ---")
with open('d:/我的APP/app.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        # find string literals
        for quote in ["'", '"', '`']:
            # approximate string literal extraction
            parts = line.split(quote)
            if len(parts) >= 3:
                for idx in range(1, len(parts), 2):
                    s = parts[idx]
                    if '(' in s or ')' in s or '（' in s or '）' in s:
                        print(f"JS:{i}: quote=[{quote}] text=[{s}]")
