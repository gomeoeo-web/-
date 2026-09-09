with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = None
end_idx = None
for idx, line in enumerate(lines):
    if '7.1 Google 帳號登入與雲端資料同步' in line:
        start_idx = idx - 1
    if '8. 導航與篩選控制' in line:
        end_idx = idx - 1

if start_idx is not None and end_idx is not None:
    new_lines = lines[:start_idx] + lines[end_idx:]
    with open('app.js', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Successfully removed lines {start_idx} to {end_idx} from app.js")
else:
    print("Could not find start or end index")
