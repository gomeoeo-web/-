import time

def test_trash_and_theme_logic():
    # Simulation of the JS logic implemented in app.js
    SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

    items = [
        {"id": "milk", "name": "鮮奶", "category": "food", "endDate": "2026-09-08"}, # expired
        {"id": "chair", "name": "辦公椅", "category": "warranty", "endDate": "2028-09-08"} # valid
    ]
    recently_deleted = []

    # 1. Test Theme Cycle
    themes = ['dark', 'amoled', 'light']
    current_theme = 'dark'
    
    def next_theme(curr):
        if curr == 'dark': return 'amoled'
        if curr == 'amoled': return 'light'
        return 'dark'

    t1 = next_theme(current_theme)
    assert t1 == 'amoled', f"Expected amoled, got {t1}"
    t2 = next_theme(t1)
    assert t2 == 'light', f"Expected light, got {t2}"
    t3 = next_theme(t2)
    assert t3 == 'dark', f"Expected dark, got {t3}"
    print("Theme cycle: PASS (dark -> amoled -> light -> dark)")

    # 2. Test moveToRecentlyDeleted
    def move_to_trash(item):
        entry = dict(item)
        entry["deletedAt"] = int(time.time() * 1000)
        recently_deleted.insert(0, entry)

    move_to_trash(items[0])
    items.pop(0)
    assert len(recently_deleted) == 1
    assert len(items) == 1
    assert recently_deleted[0]["id"] == "milk"
    print("Move to trash: PASS")

    # 3. Test Restore Single Item
    def restore_item(item_id):
        idx = next((i for i, it in enumerate(recently_deleted) if it["id"] == item_id), -1)
        if idx != -1:
            restored = dict(recently_deleted.pop(idx))
            del restored["deletedAt"]
            items.insert(0, restored)

    restore_item("milk")
    assert len(recently_deleted) == 0
    assert len(items) == 2
    assert items[0]["id"] == "milk"
    print("Restore item: PASS")

    # 4. Test 7-Day Auto Purge
    now = int(time.time() * 1000)
    test_entries = [
        {"id": "1", "name": "item1", "deletedAt": now - 1000},
        {"id": "2", "name": "item2", "deletedAt": now - 6 * 86400000},
        {"id": "3", "name": "item3", "deletedAt": now - 7 * 86400000 - 1000}, # expired > 7 days
    ]
    purged = [it for it in test_entries if (now - it["deletedAt"]) < SEVEN_DAYS_MS]
    assert len(purged) == 2
    assert "3" not in [it["id"] for it in purged]
    print("7-day auto purge filter: PASS")

    # 5. Test Batch Clean Expired
    items_with_expired = [
        {"id": "exp1", "name": "過期優格", "status": "expired"},
        {"id": "exp2", "name": "過期吐司", "status": "expired"},
        {"id": "ok1", "name": "正常洗髮精", "status": "normal"},
    ]
    expired_items = [it for it in items_with_expired if it.get("status") == "expired"]
    assert len(expired_items) == 2
    for exp in expired_items:
        move_to_trash(exp)
    items_with_expired = [it for it in items_with_expired if it.get("status") != "expired"]
    assert len(items_with_expired) == 1
    assert len(recently_deleted) == 2
    print("One-click batch clean expired: PASS")

    print("\nALL SIMULATION UNIT TESTS PASSED!")

if __name__ == '__main__':
    test_trash_and_theme_logic()
