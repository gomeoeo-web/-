for fname in ['index.html', 'app.js', 'README.md']:
    with open(fname, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, l in enumerate(lines):
        if any(w in l for w in ['物品天數', '買了之後', '今天需要注意', 'LifeSpan Tracker']):
            safe_l = l.strip().encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"{fname}:{i+1}: {safe_l}")
