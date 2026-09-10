# -*- coding: utf-8 -*-
import re
import os
import sys

def test_archive():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    with open('style.css', 'r', encoding='utf-8') as f:
        css = f.read()

    errors = []

    # 1. Action Sheet Archive Button
    if 'id="btnSheetArchive"' not in html:
        errors.append("btnSheetArchive missing from index.html actionSheet")
    if '封存此物品' not in html:
        errors.append("Action Sheet must have '封存此物品' text")

    # 2. Settings Modal Archive Entry
    if 'id="btnOpenArchive"' not in html:
        errors.append("btnOpenArchive button missing from index.html settingsModal")
    if 'id="archiveBadgeCount"' not in html:
        errors.append("archiveBadgeCount element missing from index.html")
    if '已封存物品' not in html:
        errors.append("Settings Modal must have '已封存物品' entry")

    # 3. Archive Modal Structure
    if 'id="archiveModal"' not in html:
        errors.append("archiveModal missing from index.html")
    if 'id="archiveItemsList"' not in html:
        errors.append("archiveItemsList missing from index.html")
    if 'id="archiveEmpty"' not in html:
        errors.append("archiveEmpty missing from index.html")
    if 'id="btnRestoreAllArchive"' not in html:
        errors.append("btnRestoreAllArchive missing from index.html")

    # 4. JS Archive Logic & Storage
    for fn in ['ARCHIVE_KEY', 'archivedItems', 'loadArchivedItems', 'saveArchivedItems',
               'archiveItem', 'unarchiveItem', 'restoreAllArchive', 'renderArchiveList',
               'openArchiveModal', 'closeArchiveModal']:
        if fn not in js:
            errors.append(f"'{fn}' missing from app.js")

    # 5. CSS Styling
    if '.btn-unarchive' not in css:
        errors.append(".btn-unarchive style missing from style.css")

    # 6. Check Zero Chinese Parentheses in visible text
    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html)
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', clean_html)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html)
    for idx, line in enumerate(clean_html.splitlines(), 1):
        text_outside_tags = re.sub(r'<[^>]+>', '', line).strip()
        if re.search(r'[（）]', text_outside_tags):
            errors.append(f"Chinese parentheses found in index.html line {idx}: {text_outside_tags}")

    # 7. Check no '二級選單'
    for name, content in [('index.html', html), ('app.js', js), ('style.css', css)]:
        if '二級選單' in content:
            errors.append(f"'二級選單' found in {name}")

    # 8. Simulation of Archive / Unarchive logic
    test_items = [
        {"id": "item-1", "name": "鮮奶", "category": "food"},
        {"id": "item-2", "name": "麵包", "category": "food"}
    ]
    test_archived = []

    # Simulate archive
    def sim_archive(item_id):
        nonlocal test_items, test_archived
        it = next((x for x in test_items if x["id"] == item_id), None)
        if it:
            entry = dict(it)
            entry["archivedAt"] = 123456789
            test_archived.insert(0, entry)
            test_items = [x for x in test_items if x["id"] != item_id]

    # Simulate unarchive
    def sim_unarchive(item_id):
        nonlocal test_items, test_archived
        idx = next((i for i, x in enumerate(test_archived) if x["id"] == item_id), -1)
        if idx != -1:
            restored = dict(test_archived.pop(idx))
            del restored["archivedAt"]
            test_items.insert(0, restored)

    sim_archive("item-1")
    if len(test_items) != 1 or len(test_archived) != 1 or test_archived[0]["name"] != "鮮奶":
        errors.append("Simulation: Archive item failed")

    sim_unarchive("item-1")
    if len(test_items) != 2 or len(test_archived) != 0 or test_items[0]["name"] != "鮮奶":
        errors.append("Simulation: Unarchive item failed")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return False
    else:
        print("SUCCESS: All Archive feature checks and simulation PASSED!")
        return True

if __name__ == '__main__':
    if not test_archive():
        sys.exit(1)
