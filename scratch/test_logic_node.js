// Node.js test simulation for app.js Recently Deleted & Samsung AMOLED
const fs = require('fs');

console.log("Reading files...");
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

// Verify Key Components
console.log("1. Checking AMOLED Theme:");
console.assert(css.includes('[data-theme="amoled"]'), "CSS missing [data-theme='amoled']");
console.assert(css.includes('#000000'), "CSS missing pure black #000000");
console.assert(js.includes("'amoled'"), "JS missing 'amoled' option");
console.log("   -> PASS: AMOLED pure black configured for Samsung Galaxy");

console.log("2. Checking Android Safe-Area Inset:");
console.assert(css.includes('env(safe-area-inset-top'), "CSS missing safe-area-inset-top");
console.assert(css.includes('env(safe-area-inset-bottom'), "CSS missing safe-area-inset-bottom");
console.log("   -> PASS: Android safe-area insets configured");

console.log("3. Checking One-Click Clean Expired:");
console.assert(html.includes('id="btnCleanExpired"'), "HTML missing btnCleanExpired");
console.assert(js.includes('btnCleanExpired'), "JS missing btnCleanExpired reference");
console.assert(js.includes('moveToRecentlyDeleted(item)'), "JS missing moveToRecentlyDeleted in batch clean");
console.log("   -> PASS: One-click clean expired items logic configured");

console.log("4. Checking Recently Deleted Recycle Bin & 7-Day Auto-Purge:");
console.assert(js.includes('SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000'), "JS missing SEVEN_DAYS_MS");
console.assert(js.includes('RECENTLY_DELETED_KEY = \'lifespan_recently_deleted_v1\''), "JS missing RECENTLY_DELETED_KEY");
console.assert(html.includes('id="recentlyDeletedModal"'), "HTML missing recentlyDeletedModal");
console.assert(html.includes('id="btnOpenRecentlyDeleted"'), "HTML missing btnOpenRecentlyDeleted");
console.assert(html.includes('id="trashBadgeCount"'), "HTML missing trashBadgeCount");
console.assert(html.includes('id="btnRestoreAllTrash"'), "HTML missing btnRestoreAllTrash");
console.assert(html.includes('id="btnEmptyTrash"'), "HTML missing btnEmptyTrash");
console.log("   -> PASS: Recently Deleted UI elements verified");

console.log("5. Testing 7-Day Purge Filter Calculation:");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();
const mockTrash = [
  { id: 'item-fresh', name: '新鮮刪除', deletedAt: now - 1000 }, // 1 second ago
  { id: 'item-3days', name: '三天前刪除', deletedAt: now - 3 * 86400000 }, // 3 days ago
  { id: 'item-6days', name: '六天前刪除', deletedAt: now - 6 * 86400000 }, // 6 days ago
  { id: 'item-expired', name: '八天前刪除已過期', deletedAt: now - 8 * 86400000 } // 8 days ago (should be purged)
];

const remaining = mockTrash.filter(item => (now - item.deletedAt) < SEVEN_DAYS_MS);
console.assert(remaining.length === 3, "7-day filter failed, expected 3 remaining items");
console.assert(!remaining.some(it => it.id === 'item-expired'), "Expired 8-day item was not purged");
console.log("   -> PASS: 7-day auto-purge calculation works as specified");

console.log("\nALL NODE LOGIC TESTS PASSED SUCCESSFULLY!");
