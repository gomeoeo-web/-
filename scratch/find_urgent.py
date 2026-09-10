with open('app.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if "'urgent'" in line or "'expired'" in line:
            print(f"{i}: {line.strip()}")
