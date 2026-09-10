# -*- coding: utf-8 -*-
import re

def test_milk_sample_and_persistence():
    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    results = []

    # 1. 預設範例資料僅有 1 項牛奶物品
    # 檢查 createSeedItems 函式定義
    seed_match = re.search(r'function createSeedItems\(\)\s*\{([\s\S]*?)\n  \}', js)
    has_seed_fn = seed_match is not None
    seed_body = seed_match.group(1) if seed_match else ""
    
    # 檢查是否只有 1 個 id: 'seed-' 項目
    seed_ids = re.findall(r'id:\s*[\'"](seed-[^\'"]+)[\'"]', seed_body)
    only_one_seed = len(seed_ids) == 1 and seed_ids[0] == 'seed-milk'
    
    # 檢查是否包含鮮乳/牛奶相關屬性
    has_milk_attrs = (
        "name: '全脂鮮乳'" in seed_body and
        "category: 'food'" in seed_body and
        "subCategory: '鮮乳'" in seed_body and
        "emoji: '🥛'" in seed_body
    )
    results.append(("1. 裝置首次開啟僅預設一項牛奶物品當範例", only_one_seed and has_milk_attrs))

    # 2. 記憶體與 localStorage 儲存設定 (stored !== null 判斷)
    has_load_logic = "stored !== null" in js and "localStorage.setItem(STORAGE_KEY" in js
    results.append(("2. 啟用本機裝置持久化記憶 (localStorage stored !== null)", has_load_logic))

    # 3. 檢查刪除/清空或自訂修改不會被種子資料強制覆蓋
    # 當 stored !== null 時，直接 JSON.parse(stored)，不覆蓋
    load_fn_match = re.search(r'function loadItems\(\)\s*\{([\s\S]*?)\n  \}', js)
    load_fn_body = load_fn_match.group(1) if load_fn_match else ""
    safe_restore = "if (stored !== null) {\n        items = JSON.parse(stored);" in load_fn_body
    results.append(("3. 使用者修改、新增或刪除後在此裝置上保持記憶", safe_restore))

    # 4. 檢查 HTML 中無中文全形括號
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    parens_found = []
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            parens_found.append((idx, text_outside_tags))
    results.append(("4. 畫面上完全無中文全形括號 (No Chinese Parentheses)", len(parens_found) == 0))

    all_passed = True
    print("=== Single Milk Sample and Persistence Verification ===")
    for title, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} - {title}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nALL SINGLE MILK SAMPLE & PERSISTENCE CHECKS PASSED WITH 0 ERRORS!")
    else:
        print("\nFAILURES DETECTED.")
    return all_passed

if __name__ == '__main__':
    test_milk_sample_and_persistence()
