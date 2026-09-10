/**
 * 期效管家 (LifeSpan Tracker) - 極簡 iOS 邏輯控制器
 * 支援：
 * 1. 智慧輸入物品自動匹配圖標 (Smart Icon Matcher)
 * 2. 使用者自訂相片上傳與輕量壓縮儲存 (Custom Photo Upload)
 * 3. 支援「僅記錄使用天數 (無到期日)」模式 (Elapsed Days Only)
 * 4. 完全比照參考截圖之極簡 Apple Dark Minimalist 排版與互動
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 常數與預設範本
  const APP_VERSION = '1.5.5';
  const STORAGE_KEY = 'lifespan_tracker_ios_v10';
  const OLD_STORAGE_KEY_V9 = 'lifespan_tracker_ios_v9';
  const THEME_KEY = 'lifespan_tracker_theme';
  const CUSTOM_CATEGORIES_KEY = 'lifespan_tracker_custom_categories_v1';
  const HOME_SORT_KEY = 'lifespan_tracker_home_sort';
  const FIRST_PAGE_CAT_KEY = 'lifespan_tracker_first_page_cat';
  const CUSTOM_ORDER_KEY = 'lifespan_tracker_custom_order_v1';
  const CATEGORY_ORDER_KEY = 'lifespan_tracker_category_order_v1';
  const RECENTLY_DELETED_KEY = 'lifespan_recently_deleted_v1';
  const ARCHIVE_KEY = 'lifespan_archive_items_v1';
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const DEVICE_INITIALIZED_KEY = 'lifespan_device_initialized_v1';

  // 第一頁至第二十頁分頁常數
  const PAGE_NAMES = [
    '第一頁', '第二頁', '第三頁', '第四頁', '第五頁',
    '第六頁', '第七頁', '第八頁', '第九頁', '第十頁',
    '第十一頁', '第十二頁', '第十三頁', '第十四頁', '第十五頁',
    '第十六頁', '第十七頁', '第十八頁', '第十九頁', '第二十頁'
  ];

  // 精緻白色人體工學椅 SVG 縮圖 (比照截圖「我的椅子」)
  const CHAIR_SVG_BASE64 = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <rect width="100" height="100" rx="20" fill="transparent"/>
      <!-- Backrest -->
      <path d="M38 18 C38 14, 62 14, 62 18 L60 48 C60 51, 40 51, 40 48 Z" fill="#ffffff" stroke="#d1d5db" stroke-width="1.5"/>
      <path d="M42 22 C42 19, 58 19, 58 22 L57 44 C57 46, 43 46, 43 44 Z" fill="#e5e7eb" opacity="0.65"/>
      <path d="M44 34 Q50 36 56 34" stroke="#9ca3af" stroke-width="2" fill="none"/>
      <!-- Seat Cushion -->
      <ellipse cx="50" cy="54" rx="16" ry="5.5" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1.5"/>
      <!-- Armrests -->
      <path d="M36 38 L32 40 L34 49" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M64 38 L68 40 L66 49" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="32" cy="40" rx="3" ry="1.2" fill="#d1d5db"/>
      <ellipse cx="68" cy="40" rx="3" ry="1.2" fill="#d1d5db"/>
      <!-- Central Gas Cylinder -->
      <rect x="48.5" y="58" width="3" height="15" fill="#6b7280" rx="1.5"/>
      <!-- 5-Star Base & Wheels -->
      <path d="M50 72 L32 82 M50 72 L68 82 M50 72 L26 73 M50 72 L74 73 M50 72 L50 85" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="32" cy="83" r="2.5" fill="#111827"/>
      <circle cx="68" cy="83" r="2.5" fill="#111827"/>
      <circle cx="25" cy="73.5" r="2.5" fill="#111827"/>
      <circle cx="75" cy="73.5" r="2.5" fill="#111827"/>
      <circle cx="50" cy="86" r="2.5" fill="#111827"/>
    </svg>
  `);

  const SMART_KEYWORD_MAP = [
    // 車輛
    { keywords: ['機油', '机油', '齒輪油', '變速箱油', '機油芯'], emoji: '🚗', cat: 'vehicle', subCat: '機油' },
    { keywords: ['輪胎', '胎壓', '補胎'], emoji: '🛞', cat: 'vehicle', subCat: '輪胎' },
    { keywords: ['電瓶', '電池', '汽車電瓶'], emoji: '🔋', cat: 'vehicle', subCat: '電瓶' },
    { keywords: ['雨刷', '雨刷片', '雨刷精'], emoji: '🌧️', cat: 'vehicle', subCat: '雨刷' },
    { keywords: ['煞車', '剎車', '煞車皮', '剎車皮', '煞車油'], emoji: '🛑', cat: 'vehicle', subCat: '煞車' },
    { keywords: ['車', '機車', '汽車', 'gogoro', '重機', '檔車'], emoji: '🚗', cat: 'vehicle', subCat: '車輛' },
    
    // 訂閱
    { keywords: ['netflix', 'disney', 'youtube', '影音', '串流'], emoji: '🎬', cat: 'subscription', subCat: '影音' },
    { keywords: ['spotify', 'kkbox', 'apple music', '音樂'], emoji: '🎵', cat: 'subscription', subCat: '音樂' },
    { keywords: ['icloud', 'google one', '雲端', 'dropbox', 'onedrive'], emoji: '☁️', cat: 'subscription', subCat: '雲端' },
    { keywords: ['chatgpt', 'openai', 'adobe', '軟體', 'midjourney', 'copilot'], emoji: '💻', cat: 'subscription', subCat: '軟體' },
    { keywords: ['健身房', '會籍', '健身', '瑜珈'], emoji: '💪', cat: 'subscription', subCat: '健身' },
    { keywords: ['訂閱', '會員', '月費', '年費', '房租', '電信', '寬頻', '電話費', '第四台'], emoji: '📅', cat: 'subscription', subCat: '電信' },
    
    // 藥品
    { keywords: ['眼藥水', '人工淚液'], emoji: '💊', cat: 'medicine', subCat: '眼藥水' },
    { keywords: ['維他命', '維生素', 'b群', '維他命c'], emoji: '💊', cat: 'medicine', subCat: '維他命' },
    { keywords: ['魚油', '葉黃素', '益生菌', '保健品', '膠原蛋白'], emoji: '🐟', cat: 'medicine', subCat: '魚油' },
    { keywords: ['藥膏', '皮膚膏', '抗生素', '曼秀雷敦'], emoji: '🩹', cat: 'medicine', subCat: '藥膏' },
    { keywords: ['止痛藥', '感冒藥', '胃藥', '成藥', '膠囊', '錠', '藥'], emoji: '🩺', cat: 'medicine', subCat: '成藥' },
    { keywords: ['隱形眼鏡', '保養液', '洗眼液', '隱眼'], emoji: '👁️', cat: 'medicine', subCat: '保養液' },
    
    // 清潔
    { keywords: ['菜瓜布', '海綿', '科技海綿'], emoji: '🧼', cat: 'cleaning', subCat: '菜瓜布' },
    { keywords: ['洗衣精', '洗衣球', '洗衣膠囊', '洗衣粉'], emoji: '🧺', cat: 'cleaning', subCat: '洗衣精' },
    { keywords: ['洗碗精', '洗潔精'], emoji: '🍽️', cat: 'cleaning', subCat: '洗碗精' },
    { keywords: ['抹布', '拖把', '除塵拖', '除塵紙'], emoji: '🧽', cat: 'cleaning', subCat: '抹布' },
    { keywords: ['潔廁劑', '馬桶刷', '芳香劑', '馬桶清潔'], emoji: '🚽', cat: 'cleaning', subCat: '潔廁劑' },
    { keywords: ['酒精', '消毒水', '漂白水', '乾洗手'], emoji: '🧴', cat: 'cleaning', subCat: '酒精' },
    
    // 耗材
    { keywords: ['濾網', '清淨機', 'hepa', '冷氣濾網', '空氣濾網'], emoji: '🌀', cat: 'filter', subCat: '濾網' },
    { keywords: ['濾芯', '濾心', '淨水', 'ro', '飲水', '濾水壺'], emoji: '💧', cat: 'filter', subCat: '濾芯' },
    { keywords: ['牙刷', '刷頭', '音波牙刷'], emoji: '🪥', cat: 'filter', subCat: '牙刷' },
    { keywords: ['除濕盒', '除濕劑', '乾燥劑', '克潮靈', '防潮包'], emoji: '🌧️', cat: 'filter', subCat: '除濕盒' },
    { keywords: ['吸塵器', '掃地機', '掃地機器人', 'dyson'], emoji: '🧹', cat: 'filter', subCat: '掃地耗材' },
    
    // 保固
    { keywords: ['椅', 'chair', '沙發', '辦公椅', '人體工學', '桌'], emoji: '🪑', cat: 'warranty', subCat: '家具' },
    { keywords: ['電腦', '筆電', 'mac', 'macbook', 'pc', '主機', 'ipad'], emoji: '💻', cat: 'warranty', subCat: '電腦' },
    { keywords: ['手機', 'iphone', 'pixel', 'galaxy', 'android'], emoji: '📱', cat: 'warranty', subCat: '手機' },
    { keywords: ['耳機', 'airpods', 'buds', 'headphone', '喇叭'], emoji: '🎧', cat: 'warranty', subCat: '耳機' },
    { keywords: ['電視', '螢幕', '顯示器', 'tv', '冰箱', '洗衣機', '冷氣'], emoji: '📺', cat: 'warranty', subCat: '家電' },
    { keywords: ['手錶', '錶', 'watch', 'apple watch'], emoji: '⌚', cat: 'warranty', subCat: '手錶' },
    
    // 食品 (新增青菜、水果等豐富項目)
    { keywords: ['青菜', '蔬菜', '葉菜', '菠菜', '空心菜', '高麗菜', '花椰菜', '地瓜葉', '大白菜', '芹菜', '萵苣', '豆芽', '小白菜'], emoji: '🥬', cat: 'food', subCat: '青菜' },
    { keywords: ['水果', '蘋果', '香蕉', '芭樂', '橘子', '柳丁', '葡萄', '奇異果', '芒果', '西瓜', '草莓', '檸檬', '番茄', '鳳梨', '水蜜桃'], emoji: '🍎', cat: 'food', subCat: '水果' },
    { keywords: ['奶', '乳', 'milk', '鮮乳', '優格', '起司', '鮮奶', '豆漿'], emoji: '🥛', cat: 'food', subCat: '鮮乳' },
    { keywords: ['咖啡', '咖啡豆', '咖啡粉', '美式', '拿鐵', '濾掛'], emoji: '☕', cat: 'food', subCat: '咖啡' },
    { keywords: ['蛋', '雞蛋', '鴨蛋', '茶葉蛋'], emoji: '🥚', cat: 'food', subCat: '雞蛋' },
    { keywords: ['茶', '茶葉', '茶包', '烏龍茶', '綠茶', '紅茶'], emoji: '🍵', cat: 'food', subCat: '茶包' },
    { keywords: ['醬油', '鹽', '糖', '油', '醋', '調味料', '胡椒', '沙拉醬'], emoji: '🧂', cat: 'food', subCat: '調味料' },
    { keywords: ['零食', '堅果', '餅乾', '巧克力', '洋芋片', '點心'], emoji: '🍪', cat: 'food', subCat: '零食' },
    
    // 日用
    { keywords: ['沐浴', '洗髮', '潤髮', '肥皂', '洗沐', '沐浴乳'], emoji: '🧴', cat: 'pao', subCat: '洗沐' },
    { keywords: ['防曬', '隔離', '粉底', '防曬乳'], emoji: '☀️', cat: 'pao', subCat: '防曬' },
    { keywords: ['精華', '乳液', '面膜', '化妝水', '保濕', '眼霜'], emoji: '✨', cat: 'pao', subCat: '保養' },
    { keywords: ['護手霜', '護唇膏'], emoji: '👐', cat: 'pao', subCat: '護手霜' },
    { keywords: ['牙膏', '漱口水'], emoji: '🪥', cat: 'pao', subCat: '牙膏' },
    { keywords: ['刮鬍刀', '刀頭', '刮鬍泡'], emoji: '🪒', cat: 'pao', subCat: '刮鬍刀' },
    
    // 其他
    { keywords: ['鞋', '球鞋', '皮鞋', '運動鞋', '拖鞋'], emoji: '👟', cat: 'other', subCat: '球鞋' },
    { keywords: ['包', '背包', '皮夾', '手提包', '公事包'], emoji: '🎒', cat: 'other', subCat: '包袋' },
    { keywords: ['衣服', '外套', '褲', '襯衫', '大衣'], emoji: '🧥', cat: 'other', subCat: '衣物' },
    { keywords: ['書', '筆記本', '小說', '文具'], emoji: '📚', cat: 'other', subCat: '圖書' }
  ];

  // 一級與細項分類預設辭典
  const DEFAULT_CATEGORIES = {
    vehicle: {
      label: '車輛',
      emoji: '🚗',
      items: [
        { name: '汽車機油', subCat: '機油', emoji: '🚗', duration: 180, hasEndDate: true, warnDays: 14, brand: 'Mobil 1 全合成', location: '車庫', notes: '建議每 6 個月或 5,000 公里更換機油與機油芯' },
        { name: '汽車輪胎', subCat: '輪胎', emoji: '🛞', duration: 180, hasEndDate: true, warnDays: 14, location: '車庫', notes: '定期檢測胎紋深度與輪胎對調' },
        { name: '汽車電瓶', subCat: '電瓶', emoji: '🔋', duration: 730, hasEndDate: true, warnDays: 30, location: '引擎室', notes: '鉛酸/AGM電瓶壽命約 2~3 年' },
        { name: '汽車雨刷', subCat: '雨刷', emoji: '🌧️', duration: 180, hasEndDate: true, warnDays: 14, location: '前擋風玻璃', notes: '橡膠條老化易刷不乾淨，半年至一年換新' },
        { name: '煞車來令片', subCat: '煞車', emoji: '🛑', duration: 730, hasEndDate: true, warnDays: 30, location: '底盤煞車系統', notes: '檢查煞車來令片厚度與煞車油含水量' },
        { name: '機車齒輪油', subCat: '齒輪油', emoji: '🛵', duration: 90, hasEndDate: true, warnDays: 7, location: '機車齒輪箱', notes: '換 2 次機油換 1 次齒輪油' }
      ]
    },
    subscription: {
      label: '訂閱',
      emoji: '📅',
      items: [
        { name: '串流影音', subCat: '影音', emoji: '🎬', duration: 30, hasEndDate: true, warnDays: 3, brand: 'Netflix / Disney+', location: '線上扣款', notes: '每月固定扣款前提醒，及時確認是否續訂' },
        { name: '串流音樂', subCat: '音樂', emoji: '🎵', duration: 30, hasEndDate: true, warnDays: 3, brand: 'Spotify / Apple Music', location: '線上扣款', notes: '每月固定續約扣款' },
        { name: '雲端硬碟', subCat: '雲端', emoji: '☁️', duration: 365, hasEndDate: true, warnDays: 14, brand: 'iCloud / Google One', location: '年度訂閱', notes: '年費自動續訂提醒' },
        { name: '專業軟體', subCat: '軟體', emoji: '💻', duration: 30, hasEndDate: true, warnDays: 3, brand: 'ChatGPT / Adobe', location: '定期扣款', notes: '工作軟體月租方案' },
        { name: '健身會籍', subCat: '健身', emoji: '💪', duration: 365, hasEndDate: true, warnDays: 14, location: '運動中心', notes: '年度會籍到期前評估是否續約' },
        { name: '寬頻電信', subCat: '電信', emoji: '📶', duration: 30, hasEndDate: true, warnDays: 3, location: '電信帳單', notes: '每月固網光纖與手機資費結帳' }
      ]
    },
    medicine: {
      label: '藥品',
      emoji: '💊',
      items: [
        { name: '保濕眼藥水', subCat: '眼藥水', emoji: '💊', duration: 30, hasEndDate: true, warnDays: 5, brand: '保濕眼藥水', location: '辦公桌抽屜', notes: '眼藥水開瓶接觸空氣後，請於 30 天內丟棄' },
        { name: '綜合維他命', subCat: '維他命', emoji: '💊', duration: 180, hasEndDate: true, warnDays: 14, brand: '善存', location: '客廳茶几', notes: '每日食用一顆，開封後半年內食用完畢' },
        { name: '深海魚油', subCat: '魚油', emoji: '🐟', duration: 180, hasEndDate: true, warnDays: 14, location: '餐桌藥盒', notes: '避免陽光高溫直射，保持密封乾燥' },
        { name: '外用藥膏', subCat: '藥膏', emoji: '🩹', duration: 180, hasEndDate: true, warnDays: 14, location: '常備急救箱', notes: '皮膚軟膏開封後定期確認是否變質' },
        { name: '常備感冒藥', subCat: '成藥', emoji: '🩺', duration: 365, hasEndDate: true, warnDays: 30, location: '常備醫藥箱', notes: '定期檢視藥箱內感冒止痛藥品效期' },
        { name: '隱眼保養液', subCat: '保養液', emoji: '👁️', duration: 90, hasEndDate: true, warnDays: 7, location: '洗手台置物櫃', notes: '浸泡保養液開瓶後建議 3 個月內用畢' }
      ]
    },
    cleaning: {
      label: '清潔',
      emoji: '🧼',
      items: [
        { name: '廚房菜瓜布', subCat: '菜瓜布', emoji: '🧼', duration: 30, hasEndDate: true, warnDays: 5, brand: '3M 百利', location: '廚房流理台', notes: '潮濕環境易藏污納垢，每個月定期更換' },
        { name: '濃縮洗衣精', subCat: '洗衣精', emoji: '🧺', duration: 90, hasEndDate: true, warnDays: 7, brand: 'Ariel 洗衣精', location: '工作陽台', notes: '家庭常備清潔用品，定期補貨' },
        { name: '洗碗精', subCat: '洗碗精', emoji: '🍽️', duration: 60, hasEndDate: true, warnDays: 7, location: '廚房洗滌槽', notes: '溫和洗淨碗盤油脂' },
        { name: '擦拭抹布', subCat: '抹布', emoji: '🧽', duration: 30, hasEndDate: true, warnDays: 5, location: '廚房中島', notes: '抹布容易滋生細菌，每月定期換新' },
        { name: '潔廁芳香劑', subCat: '潔廁劑', emoji: '🚽', duration: 60, hasEndDate: true, warnDays: 7, location: '主臥衛浴', notes: '抑菌除垢，持續芳香' },
        { name: '消毒酒精', subCat: '酒精', emoji: '🧴', duration: 180, hasEndDate: true, warnDays: 14, location: '玄關置物櫃', notes: '75% 消毒酒精日常環境維護' }
      ]
    },
    warranty: {
      label: '保固',
      emoji: '🛡️',
      items: [
        { name: '我的椅子', subCat: '家具', emoji: '🪑', image: CHAIR_SVG_BASE64, duration: 1097, hasEndDate: true, warnDays: 30, brand: 'Herman Miller', location: '書房', notes: '3 年原廠結構與氣壓棒保固' },
        { name: '筆記型電腦', subCat: '電腦', emoji: '💻', duration: 730, hasEndDate: true, warnDays: 30, brand: 'Apple MacBook', location: '工作桌', notes: '2 年有限硬體原廠保固' },
        { name: '智慧型手機', subCat: '手機', emoji: '📱', duration: 365, hasEndDate: true, warnDays: 30, brand: 'iPhone', location: '隨身', notes: '原廠 1 年有限保固與電池健檢' },
        { name: '藍牙耳機', subCat: '耳機', emoji: '🎧', duration: 365, hasEndDate: true, warnDays: 30, brand: 'Sony', location: '防潮箱', notes: '1 年原廠有限保固' },
        { name: '家用電器', subCat: '家電', emoji: '📺', duration: 1095, hasEndDate: true, warnDays: 60, brand: 'Panasonic', location: '客廳', notes: '主要壓縮機/面板 3 年保固' },
        { name: '智慧手錶', subCat: '手錶', emoji: '⌚', duration: 365, hasEndDate: true, warnDays: 30, brand: 'Apple Watch', location: '臥室充電座', notes: '原廠 1 年保固' }
      ]
    },
    filter: {
      label: '耗材',
      emoji: '🔄',
      items: [
        { name: '清淨機濾網', subCat: '濾網', emoji: '🌀', duration: 180, hasEndDate: true, warnDays: 14, brand: 'Honeywell', location: '客廳', notes: '每 6 個月定期換新 HEPA 濾網' },
        { name: '淨水器濾芯', subCat: '濾芯', emoji: '💧', duration: 90, hasEndDate: true, warnDays: 7, brand: '3M 淨水', location: '廚房流理台', notes: '建議每季定期更換活性碳濾芯' },
        { name: '音波牙刷刷頭', subCat: '牙刷', emoji: '🪥', duration: 90, hasEndDate: true, warnDays: 7, brand: 'Philips', location: '衛浴鏡櫃', notes: '刷毛退色分岔即應更換' },
        { name: '集水除濕盒', subCat: '除濕盒', emoji: '🌧️', duration: 60, hasEndDate: true, warnDays: 7, location: '主臥衣櫃', notes: '集水線滿時請及時更換替換包' },
        { name: '掃地機主刷', subCat: '掃地耗材', emoji: '🧹', duration: 180, hasEndDate: true, warnDays: 14, location: '客廳基站', notes: '滾刷與邊刷定期清理與換新' },
        { name: '咖啡機除鈣劑', subCat: '咖啡保養', emoji: '☕', duration: 90, hasEndDate: true, warnDays: 7, location: '廚房吧台', notes: '水路管線定期除鈣延長機器壽命' }
      ]
    },
    food: {
      label: '食品',
      emoji: '🥦',
      items: [
        { name: '當季新鮮青菜', subCat: '青菜', emoji: '🥬', duration: 5, hasEndDate: true, warnDays: 2, brand: '水耕蔬菜', location: '冰箱蔬果室', notes: '綠葉蔬菜保鮮期約 3~5 天，建議盡早食用' },
        { name: '常備高麗菜', subCat: '青菜', emoji: '🥗', duration: 10, hasEndDate: true, warnDays: 3, location: '冰箱蔬果室', notes: '包葉蔬菜冷藏保存約 7~10 天' },
        { name: '當季新鮮水果', subCat: '水果', emoji: '🍎', duration: 7, hasEndDate: true, warnDays: 2, brand: '蘋果/芭樂/柑橘', location: '水果籃/冷藏', notes: '新鮮水果建議一週內享用完畢' },
        { name: '香蕉與熟成水果', subCat: '水果', emoji: '🍌', duration: 4, hasEndDate: true, warnDays: 2, location: '室溫通風處', notes: '常溫保存，果皮微斑為最佳賞味期' },
        { name: '全脂鮮乳', subCat: '鮮乳', emoji: '🥛', duration: 12, hasEndDate: true, warnDays: 3, brand: '全脂鮮乳', location: '冰箱冷藏', notes: '開封後請於 7 天內飲用完畢' },
        { name: '產地新鮮蛋', subCat: '雞蛋', emoji: '🥚', duration: 21, hasEndDate: true, warnDays: 3, brand: '放牧鮮蛋', location: '冰箱蛋架', notes: '低溫冷藏保存，留意最佳賞味期' },
        { name: '精品咖啡豆', subCat: '咖啡', emoji: '☕', duration: 30, hasEndDate: true, warnDays: 5, location: '乾燥陰涼處', notes: '拆封後最佳香氣賞味期 1 個月' },
        { name: '高山茶包', subCat: '茶包', emoji: '🍵', duration: 180, hasEndDate: true, warnDays: 14, location: '茶水櫃', notes: '密封防潮，維持高雅茶香' },
        { name: '純釀醬油', subCat: '調味料', emoji: '🧂', duration: 90, hasEndDate: true, warnDays: 7, location: '冰箱調味格', notes: '開瓶接觸空氣後建議冷藏保存' },
        { name: '綜合堅果', subCat: '零食', emoji: '🍪', duration: 60, hasEndDate: true, warnDays: 7, location: '零食收納盒', notes: '拆封後儘早食用防止油脂氧化' }
      ]
    },
    pao: {
      label: '日用',
      emoji: '🧴',
      items: [
        { name: '沐浴洗髮露', subCat: '洗沐', emoji: '🧴', duration: 180, hasEndDate: true, warnDays: 14, brand: 'Aesop', location: '主臥浴室', notes: '開封後 6 個月內用畢' },
        { name: '臉部防曬乳', subCat: '防曬', emoji: '☀️', duration: 365, hasEndDate: true, warnDays: 30, brand: '防曬露', location: '化妝台', notes: '防曬成分開封後防護力逐月衰減' },
        { name: '保濕精華液', subCat: '保養', emoji: '✨', duration: 180, hasEndDate: true, warnDays: 14, location: '梳妝台', notes: '開封後避光保存，保持滴管清潔' },
        { name: '滋潤護手霜', subCat: '護手霜', emoji: '👐', duration: 180, hasEndDate: true, warnDays: 14, location: '辦公桌', notes: '隨身保濕滋潤' },
        { name: '含氟牙膏', subCat: '牙膏', emoji: '🪥', duration: 90, hasEndDate: true, warnDays: 7, location: '浴室洗手台', notes: '早晚日常口腔護理' },
        { name: '刮鬍刀頭', subCat: '刮鬍刀', emoji: '🪒', duration: 30, hasEndDate: true, warnDays: 5, location: '淋浴間', notes: '潤滑條褪色或刀片變鈍時及時更換' }
      ]
    },
    other: {
      label: '其他',
      emoji: '📌',
      items: [
        { name: '慢跑球鞋', subCat: '球鞋', emoji: '👟', brand: 'Nike Invincible', location: '玄關鞋櫃', hasEndDate: false, notes: '僅記錄購買穿著天數，定期檢視中底衰退' },
        { name: '商務背包', subCat: '包袋', emoji: '🎒', location: '玄關掛架', hasEndDate: false, notes: '通勤耐用度與陪伴使用天數記錄' },
        { name: '羊毛大衣', subCat: '衣物', emoji: '🧥', location: '臥室衣櫃', hasEndDate: false, notes: '換季送洗與收納天數' },
        { name: '閱讀書籍', subCat: '圖書', emoji: '📚', location: '床頭櫃', hasEndDate: false, notes: '閱讀進度陪伴天數' }
      ]
    }
  };

  // 使用者自訂分類與預設分類覆寫管理器 (Custom & Preset Category Store)
  const PRESET_OVERRIDES_KEY = 'lifespan_preset_category_overrides';
  const DELETED_PRESETS_KEY = 'lifespan_deleted_preset_categories';
  let customCategories = {};

  function loadCustomCategories() {
    try {
      const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
      if (stored) {
        customCategories = JSON.parse(stored);
      } else {
        customCategories = {};
      }
    } catch (e) {
      customCategories = {};
    }
    return customCategories;
  }

  function saveCustomCategories(cats) {
    customCategories = cats;
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
    } catch (e) {
      console.error('Save custom categories failed:', e);
    }
  }

  function loadPresetOverrides() {
    try {
      const stored = localStorage.getItem(PRESET_OVERRIDES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
  }

  function savePresetOverrides(overrides) {
    try {
      localStorage.setItem(PRESET_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.error('Save preset overrides failed:', e);
    }
  }

  function loadDeletedPresets() {
    try {
      const stored = localStorage.getItem(DELETED_PRESETS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }

  function saveDeletedPresets(deleted) {
    try {
      localStorage.setItem(DELETED_PRESETS_KEY, JSON.stringify(deleted));
    } catch (e) {
      console.error('Save deleted presets failed:', e);
    }
  }

  function getAllCategories() {
    const custom = loadCustomCategories();
    const overrides = loadPresetOverrides();
    const deleted = loadDeletedPresets();

    const combined = {};
    for (const [key, cat] of Object.entries(DEFAULT_CATEGORIES)) {
      if (!deleted.includes(key)) {
        combined[key] = { ...cat, ...(overrides[key] || {}), isPreset: true };
      }
    }
    for (const [key, cat] of Object.entries(custom)) {
      combined[key] = { ...cat, isCustom: true };
    }
    return combined;
  }

  function getCustomCategoryOrder() {
    try {
      const stored = localStorage.getItem(CATEGORY_ORDER_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  }

  function saveCustomCategoryOrder(order) {
    try {
      localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(order));
    } catch (e) {}
  }

  function getFirstPageCategory() {
    const saved = localStorage.getItem(FIRST_PAGE_CAT_KEY);
    const allCats = getAllCategories();
    if (saved && allCats[saved]) {
      return saved;
    }
    const keys = Object.keys(allCats);
    return keys.length > 0 ? keys[0] : 'vehicle';
  }

  function setFirstPageCategory(catKey) {
    const allCats = getAllCategories();
    if (!allCats[catKey]) return;
    localStorage.setItem(FIRST_PAGE_CAT_KEY, catKey);
    currentCategoryChip = catKey;
    renderCategoryChips();
    populateCategorySelect();
    populateFirstPageCategorySelect();
    renderCategoryManageList();
    if (currentNavTab === 'inventory') {
      renderCards();
    }
    showToast(`⭐️ 已將「${allCats[catKey].label}」設為第一頁預設分類！`);
  }

  // 相容別名
  const SUBCATEGORY_MAP = DEFAULT_CATEGORIES;


  function getTodayString() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getOffsetDateString(baseDateStr, offsetDays) {
    const d = new Date(baseDateStr + 'T00:00:00');
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function diffDays(date1Str, date2Str) {
    const d1 = new Date(date1Str + 'T00:00:00');
    const d2 = new Date(date2Str + 'T00:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
  }

  // 產生預設範例資料（裝置首次點開預設一項牛奶物品當範例）
  function createSeedItems() {
    const today = getTodayString();
    return [
      {
        id: 'seed-milk',
        name: '全脂鮮乳',
        category: 'food',
        subCategory: '鮮乳',
        emoji: '🥛',
        location: '冰箱冷藏',
        brand: '優質全脂牛奶',
        startDate: getOffsetDateString(today, -3),
        endDate: getOffsetDateString(today, 4),
        durationDays: 7,
        hasEndDate: true,
        warnDays: 2,
        notes: '低溫冷藏保存，開封後請於 7 天內飲用完畢',
        history: [],
        createdAt: Date.now() - 3 * 86400000
      }
    ];
  }

  // ==========================================
  // 2. 狀態管理
  // ==========================================
  let items = [];
  let currentNavTab = 'today'; // 'today' 或 'inventory'
  let currentPillFilter = 'all'; // 'all', 'urgent', 'expired'
  let currentCategoryChip = 'vehicle';
  let currentSortMode = localStorage.getItem(HOME_SORT_KEY) || 'expiry_asc';
  let searchQuery = '';
  let activeSheetItemId = null;
  let hasSwipedHorizontally = false;

  // 分類群組狀態記憶 (Session Category Memory)
  const SESSION_CATEGORY_KEY = 'lifespan_current_category_session';
  // 依需求：若使用者重新整理網頁或重新開啟 App，則清空記憶，重新回到預設的第一個群組
  try {
    sessionStorage.removeItem(SESSION_CATEGORY_KEY);
  } catch (e) {}
  let sessionCategoryMemory = null;

  function rememberCategoryState(catKey) {
    if (!catKey) return;
    sessionCategoryMemory = catKey;
    try {
      sessionStorage.setItem(SESSION_CATEGORY_KEY, catKey);
    } catch (e) {}
  }

  function getRememberedCategoryState() {
    let remembered = sessionCategoryMemory;
    if (!remembered) {
      try {
        remembered = sessionStorage.getItem(SESSION_CATEGORY_KEY);
      } catch (e) {
        remembered = null;
      }
    }
    const allCats = getAllCategories();
    if (remembered && allCats[remembered]) {
      return remembered;
    }
    return null;
  }

  // 螢幕比例與視窗大小適配狀態
  const SCREEN_FIT_KEY = 'lifespan_screen_fit';
  const SCREEN_FIT_LABELS = {
    standard: '標準手機 390px',
    plus: '大螢幕 440px',
    tablet: '平板寬幅 680px',
    full: '滿版自適應 100%'
  };

  function setScreenFit(fitMode, save = true) {
    const validModes = ['standard', 'plus', 'tablet', 'full'];
    const mode = validModes.includes(fitMode) ? fitMode : 'plus';
    document.documentElement.setAttribute('data-screen-fit', mode);
    const selectScreenFit = document.getElementById('selectScreenFit');
    const settingsScreenFitText = document.getElementById('settingsScreenFitText');
    if (selectScreenFit) selectScreenFit.value = mode;
    if (settingsScreenFitText) settingsScreenFitText.textContent = SCREEN_FIT_LABELS[mode] || '大螢幕 440px';
    if (save) {
      localStorage.setItem(SCREEN_FIT_KEY, mode);
      showToast(`已套用視窗比例：${SCREEN_FIT_LABELS[mode]}`);
    }
  }

  // 新增/編輯 Modal 暫存狀態
  let currentModalMode = 'expiry'; // 'expiry' 或 'elapsed'
  let currentUploadedImage = null; // base64 string or null
  let isManualEmojiSet = false; // 是否手動指定過 emoji

  function isDeviceAlreadyInitialized() {
    if (localStorage.getItem(DEVICE_INITIALIZED_KEY) === 'true') {
      return true;
    }
    // 檢查是否有任何本程式的既有設定或儲存記錄
    const existingKeys = [
      STORAGE_KEY,
      OLD_STORAGE_KEY_V9,
      'lifespan_tracker_ios_v8',
      'lifespan_tracker_ios_v7',
      'lifespan_tracker_items',
      THEME_KEY,
      SCREEN_FIT_KEY,
      CUSTOM_CATEGORIES_KEY,
      CATEGORY_ORDER_KEY,
      HOME_SORT_KEY,
      FIRST_PAGE_CAT_KEY,
      RECENTLY_DELETED_KEY
    ];
    for (const k of existingKeys) {
      if (localStorage.getItem(k) !== null) {
        localStorage.setItem(DEVICE_INITIALIZED_KEY, 'true');
        return true;
      }
    }
    return false;
  }

  function loadItems() {
    const alreadyInitialized = isDeviceAlreadyInitialized();

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          items = parsed;
          localStorage.setItem(DEVICE_INITIALIZED_KEY, 'true');
          return;
        }
      }

      // 檢查舊版本進行無縫繼承
      const legacyKeys = [
        OLD_STORAGE_KEY_V9,
        'lifespan_tracker_ios_v8',
        'lifespan_tracker_ios_v7',
        'lifespan_tracker_items'
      ];
      for (const oldKey of legacyKeys) {
        const oldStored = localStorage.getItem(oldKey);
        if (oldStored !== null) {
          try {
            const oldItems = JSON.parse(oldStored);
            if (Array.isArray(oldItems)) {
              items = oldItems;
              saveItems();
              localStorage.setItem(DEVICE_INITIALIZED_KEY, 'true');
              return;
            }
          } catch (e) {}
        }
      }

      // 若裝置先前已開啟過程式（已有設定或先前已初始化）：
      // 即使 items 目前為空清單，也一概保留為空，絕對不再自動加入牛奶範本
      if (alreadyInitialized) {
        items = [];
        saveItems();
        return;
      }

      // 僅在真正全新、從未開啟過程式的純新裝置上，才預設單一牛奶範本
      items = createSeedItems();
      saveItems();
      localStorage.setItem(DEVICE_INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error(e);
      if (alreadyInitialized) {
        items = [];
      } else {
        items = createSeedItems();
        saveItems();
        localStorage.setItem(DEVICE_INITIALIZED_KEY, 'true');
      }
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Save failed:', e);
      showToast('儲存失敗，可能超過儲存空間上限');
    }
  }

  // ==========================================
  // 最近刪除回收站 (保留 7 天，7 天後自動清除)
  // ==========================================
  let recentlyDeletedItems = [];

  function loadRecentlyDeleted() {
    try {
      const stored = localStorage.getItem(RECENTLY_DELETED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          // 自動清除超過 7 天之項目
          recentlyDeletedItems = parsed.filter(item => {
            if (!item.deletedAt) return false;
            return (now - item.deletedAt) < SEVEN_DAYS_MS;
          });
          saveRecentlyDeleted(false);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load recently deleted items:', e);
    }
    recentlyDeletedItems = [];
  }

  function saveRecentlyDeleted(notifyBadge = true) {
    try {
      localStorage.setItem(RECENTLY_DELETED_KEY, JSON.stringify(recentlyDeletedItems));
    } catch (e) {
      console.error('Failed to save recently deleted items:', e);
    }
    if (notifyBadge) {
      updateTrashBadge();
    }
  }

  function updateTrashBadge() {
    const badge = document.getElementById('trashBadgeCount');
    const descText = document.getElementById('settingsTrashCountText');
    const count = recentlyDeletedItems.length;

    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (descText) {
      if (count > 0) {
        descText.textContent = `目前有 ${count} 項已刪除物品，保留 7 天後自動清除`;
      } else {
        descText.textContent = '保留 7 天內刪除之物品，7 天後自動清除';
      }
    }
  }

  function moveToRecentlyDeleted(item) {
    if (!item) return;
    const trashEntry = {
      ...item,
      deletedAt: Date.now()
    };
    recentlyDeletedItems.unshift(trashEntry);
    saveRecentlyDeleted(true);
  }

  function restoreItemFromTrash(id) {
    const idx = recentlyDeletedItems.findIndex(it => it.id === id);
    if (idx === -1) return;
    const [trashEntry] = recentlyDeletedItems.splice(idx, 1);
    const restoredItem = { ...trashEntry };
    delete restoredItem.deletedAt;

    if (!items.some(it => it.id === restoredItem.id)) {
      items.unshift(restoredItem);
    }
    saveItems();
    saveRecentlyDeleted(true);
    renderRecentlyDeletedList();
    renderApp();
    showToast(`已復原「${restoredItem.name}」至清單`);
  }

  function restoreAllFromTrash() {
    if (recentlyDeletedItems.length === 0) return;
    const count = recentlyDeletedItems.length;
    const restored = recentlyDeletedItems.map(item => {
      const copy = { ...item };
      delete copy.deletedAt;
      return copy;
    });

    const currentIdSet = new Set(items.map(it => it.id));
    restored.forEach(r => {
      if (!currentIdSet.has(r.id)) {
        items.unshift(r);
        currentIdSet.add(r.id);
      }
    });

    recentlyDeletedItems = [];
    saveItems();
    saveRecentlyDeleted(true);
    renderRecentlyDeletedList();
    renderApp();
    showToast(`已成功復原全部 ${count} 項物品！`);
  }

  function permanentlyDeleteItem(id) {
    const item = recentlyDeletedItems.find(it => it.id === id);
    const name = item ? item.name : '物品';
    if (!window.confirm(`確定要永久刪除「${name}」嗎？\n永久刪除後將無法復原。`)) {
      return;
    }
    recentlyDeletedItems = recentlyDeletedItems.filter(it => it.id !== id);
    saveRecentlyDeleted(true);
    renderRecentlyDeletedList();
    showToast(`已永久刪除「${name}」`);
  }

  function emptyTrash() {
    if (recentlyDeletedItems.length === 0) return;
    if (!window.confirm(`確定要清空最近刪除中的所有項目嗎？\n清空後將永久刪除且無法復原。`)) {
      return;
    }
    const count = recentlyDeletedItems.length;
    recentlyDeletedItems = [];
    saveRecentlyDeleted(true);
    renderRecentlyDeletedList();
    showToast(`已清空最近刪除共 ${count} 項物品`);
  }

  function renderRecentlyDeletedList() {
    const listEl = document.getElementById('recentlyDeletedList');
    const emptyEl = document.getElementById('recentlyDeletedEmpty');
    const actionsBar = document.getElementById('trashActionsBar');
    if (!listEl) return;

    if (recentlyDeletedItems.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (actionsBar) actionsBar.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (actionsBar) actionsBar.style.display = 'flex';

    const allCats = getAllCategories();
    const now = Date.now();

    listEl.innerHTML = recentlyDeletedItems.map(item => {
      const elapsedMs = now - (item.deletedAt || now);
      const remainingMs = Math.max(0, SEVEN_DAYS_MS - elapsedMs);
      const daysRemaining = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
      const catLabel = allCats[item.category]?.label || item.category || '未分類';

      let mediaHtml = '';
      if (item.image) {
        mediaHtml = `<img src="${item.image}" alt="${escapeHtml(item.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
      } else {
        mediaHtml = escapeHtml(item.emoji || '📦');
      }

      return `
        <div class="trash-item-card" data-id="${item.id}">
          <div class="trash-item-left">
            <div class="trash-item-emoji">${mediaHtml}</div>
            <div class="trash-item-info">
              <span class="trash-item-title">${escapeHtml(item.name)}</span>
              <div class="trash-item-meta">
                <span class="trash-days-left ${daysRemaining <= 2 ? 'urgent' : ''}">剩餘 ${daysRemaining} 天自動清除</span>
                <span class="trash-item-cat">${escapeHtml(catLabel)}</span>
              </div>
            </div>
          </div>
          <div class="trash-item-actions">
            <button type="button" class="btn-restore-item" data-id="${item.id}" title="復原此項目">復原</button>
            <button type="button" class="btn-delete-perm" data-id="${item.id}" title="立即永久刪除">永久刪除</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openRecentlyDeletedModal() {
    renderRecentlyDeletedList();
    const modal = document.getElementById('recentlyDeletedModal');
    if (modal) modal.style.display = 'flex';
    lockBodyScroll();
  }

  // ==========================================
  // 通用功能彈窗平滑關閉動畫控制器 (各項功能關閉特效)
  // ==========================================
  function closeModalWithAnimation(modalEl, onClosed) {
    if (!modalEl || modalEl.style.display === 'none') {
      if (typeof onClosed === 'function') onClosed();
      return;
    }
    if (modalEl.classList.contains('modal-closing')) return;

    modalEl.classList.add('modal-closing');
    const isSheet = modalEl.classList.contains('ios-action-backdrop');
    const duration = isSheet ? 240 : 220;

    setTimeout(() => {
      modalEl.style.display = 'none';
      modalEl.classList.remove('modal-closing');
      const card = modalEl.querySelector('.ios-modal-card, .ios-action-sheet');
      if (card) {
        card.style.transform = '';
        card.style.transition = '';
      }
      if (typeof onClosed === 'function') {
        onClosed();
      }
      unlockBodyScroll();
    }, duration);
  }

  function closeRecentlyDeletedModal() {
    const modal = document.getElementById('recentlyDeletedModal') || document.getElementById('trashModal');
    closeModalWithAnimation(modal);
  }

  // ==========================================
  // 已封存物品庫 (Archive Store - 永久保存不刪除)
  // ==========================================
  let archivedItems = [];

  function loadArchivedItems() {
    try {
      const stored = localStorage.getItem(ARCHIVE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          archivedItems = parsed;
          updateArchiveBadge();
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load archived items:', e);
    }
    archivedItems = [];
    updateArchiveBadge();
  }

  function saveArchivedItems(notifyBadge = true) {
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archivedItems));
    } catch (e) {
      console.error('Failed to save archived items:', e);
    }
    if (notifyBadge) {
      updateArchiveBadge();
    }
  }

  function updateArchiveBadge() {
    const badge = document.getElementById('archiveBadgeCount');
    const descText = document.getElementById('settingsArchiveCountText');
    const count = archivedItems.length;

    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (descText) {
      if (count > 0) {
        descText.textContent = `已安全封存 ${count} 項物品，不顯示於主頁`;
      } else {
        descText.textContent = '永久封存不刪除，隨時可解除封存';
      }
    }
  }

  function archiveItem(id) {
    const item = items.find(it => it.id === id);
    if (!item) return;
    const name = item.name || '物品';
    if (!window.confirm(`確定要封存「${name}」嗎？\n封存後物品將移出主頁與提醒計數，歷史資料完整保留，可隨時在設定的已封存物品中解除封存。`)) {
      return;
    }

    const archiveEntry = {
      ...item,
      archivedAt: Date.now()
    };
    archivedItems.unshift(archiveEntry);
    items = items.filter(it => it.id !== id);

    saveItems();
    saveArchivedItems(true);
    closeActionSheet();
    renderApp();
    showToast(`已將「${name}」移至已封存物品`);
  }

  function unarchiveItem(id) {
    const idx = archivedItems.findIndex(it => it.id === id);
    if (idx === -1) return;
    const [archiveEntry] = archivedItems.splice(idx, 1);
    const restoredItem = { ...archiveEntry };
    delete restoredItem.archivedAt;

    items.unshift(restoredItem);
    saveItems();
    saveArchivedItems(true);
    renderArchiveList();
    renderApp();
    showToast(`已將「${restoredItem.name}」解除封存並移回清單`);
  }

  function restoreAllArchive() {
    if (archivedItems.length === 0) return;
    const count = archivedItems.length;
    if (!window.confirm(`確定要將全部 ${count} 項封存物品解除封存並移回清單嗎？`)) {
      return;
    }

    const currentIdSet = new Set(items.map(it => it.id));
    archivedItems.forEach(r => {
      const restored = { ...r };
      delete restored.archivedAt;
      if (!currentIdSet.has(restored.id)) {
        items.unshift(restored);
        currentIdSet.add(restored.id);
      }
    });

    archivedItems = [];
    saveItems();
    saveArchivedItems(true);
    renderArchiveList();
    renderApp();
    showToast(`已成功解除封存全部 ${count} 項物品！`);
  }

  function renderArchiveList() {
    const listEl = document.getElementById('archiveItemsList');
    const emptyEl = document.getElementById('archiveEmpty');
    const actionsBar = document.getElementById('archiveActionsBar');
    if (!listEl) return;

    if (archivedItems.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (actionsBar) actionsBar.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (actionsBar) actionsBar.style.display = 'flex';

    const allCats = getAllCategories();

    listEl.innerHTML = archivedItems.map(item => {
      const catLabel = allCats[item.category]?.label || item.category || '未分類';
      let mediaHtml = '';
      if (item.image) {
        mediaHtml = `<img src="${item.image}" alt="${escapeHtml(item.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
      } else {
        mediaHtml = escapeHtml(item.emoji || '📦');
      }

      const archiveDateStr = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString() : '';

      return `
        <div class="trash-item-card" data-id="${item.id}">
          <div class="trash-item-left">
            <div class="trash-item-emoji">${mediaHtml}</div>
            <div class="trash-item-info">
              <span class="trash-item-title">${escapeHtml(item.name)}</span>
              <div class="trash-item-meta">
                <span>${escapeHtml(catLabel)}</span>
                ${archiveDateStr ? `<span>• 封存於 ${archiveDateStr}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="trash-item-actions">
            <button type="button" class="btn-unarchive" data-action="unarchive" data-id="${item.id}" title="解除封存並移回清單">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
              <span>解除封存</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openArchiveModal() {
    renderArchiveList();
    const modal = document.getElementById('archiveModal');
    if (modal) modal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeArchiveModal() {
    const modal = document.getElementById('archiveModal') || document.getElementById('archiveListModal');
    closeModalWithAnimation(modal);
  }

  // ==========================================
  // 3. 生命週期指標計算 (支援無到期日項目)
  // ==========================================
  function calculateMetrics(item) {
    const today = getTodayString();
    const elapsedDays = Math.max(0, diffDays(item.startDate, today));
    const hasEndDate = item.hasEndDate !== false && item.endDate;

    // 模式 A：無到期日（僅計算已使用/陪伴天數）
    if (!hasEndDate) {
      return {
        today,
        hasEndDate: false,
        remainingDays: null,
        elapsedDays,
        totalDays: null,
        percent: 100,
        status: 'good'
      };
    }

    // 模式 B：有到期日與週期倒數
    const remainingDays = diffDays(today, item.endDate);
    const totalDays = Math.max(1, diffDays(item.startDate, item.endDate));
    let percent = Math.round((elapsedDays / totalDays) * 100);
    percent = Math.min(100, Math.max(0, percent));

    let status = 'good';
    const warnDays = item.warnDays !== undefined ? Number(item.warnDays) : 7;

    if (remainingDays < 0) {
      status = 'expired';
    } else if (remainingDays <= 3) {
      status = 'urgent';
    } else if (item.reminderType === 'custom' && item.reminderDate) {
      if (today >= item.reminderDate) {
        status = 'urgent';
      } else {
        status = 'good';
      }
    } else if (warnDays >= 0 && remainingDays <= warnDays) {
      status = 'urgent';
    } else {
      status = 'good';
    }

    return {
      today,
      hasEndDate: true,
      remainingDays,
      elapsedDays,
      totalDays,
      percent,
      status
    };
  }

  function getWarnDaysLabel(itemOrDays) {
    if (typeof itemOrDays === 'object' && itemOrDays !== null) {
      if (itemOrDays.reminderType === 'none' || itemOrDays.warnDays === -1) {
        return '不提醒';
      }
      if (itemOrDays.reminderType === 'custom' || itemOrDays.reminderDate) {
        const dStr = itemOrDays.reminderDate || '';
        const tStr = itemOrDays.reminderTime ? ` ${itemOrDays.reminderTime}` : ' 09:00';
        return `${dStr}${tStr} 自訂提醒`;
      }
      const timeSuffix = itemOrDays.reminderTime ? ` ${itemOrDays.reminderTime}` : ' 09:00';
      const d = (itemOrDays.warnDays !== undefined) ? Number(itemOrDays.warnDays) : 7;
      if (d === 0) return `到期當天 ${timeSuffix}`;
      if (d === 1) return `提前 1 天 ${timeSuffix}`;
      if (d === 3) return `提前 3 天 ${timeSuffix}`;
      if (d === 5) return `提前 5 天 ${timeSuffix}`;
      if (d === 7) return `提前 7 天 ${timeSuffix}`;
      if (d === 14) return `提前 14 天 ${timeSuffix}`;
      if (d === 30) return `提前 30 天 ${timeSuffix}`;
      if (d === 60) return `提前 60 天 ${timeSuffix}`;
      if (d === 90) return `提前 90 天 ${timeSuffix}`;
      return `提前 ${d} 天 ${timeSuffix}`;
    }

    const days = (itemOrDays !== undefined) ? Number(itemOrDays) : 7;
    if (days === 0) return '到期當天提醒 09:00';
    if (days === 1) return '到期 1 天前提醒 09:00';
    if (days === 3) return '到期 3 天前提醒 09:00';
    if (days === 5) return '到期 5 天前提醒 09:00';
    if (days === 7) return '到期 7 天前提醒 09:00';
    if (days === 14) return '到期 14 天前提醒 09:00';
    if (days === 30) return '到期 30 天前提醒 09:00';
    if (days === 60) return '到期 60 天前提醒 09:00';
    if (days === 90) return '到期 90 天前提醒 09:00';
    if (days === -1) return '不提醒';
    return `到期 ${days} 天前提醒 09:00`;
  }

  function getCategoryShortLabel(cat) {
    const allCats = getAllCategories();
    if (allCats[cat]) {
      return allCats[cat].label;
    }
    return '其他';
  }

  function getCategoryEmoji(cat) {
    const allCats = getAllCategories();
    if (allCats[cat] && allCats[cat].emoji) {
      return allCats[cat].emoji;
    }
    return '🏷️';
  }

  // ==========================================
  // 4. UI 渲染 (狀態卡片、膠囊分段、卡片網格)
  // ==========================================
  const noticeIconWrapper = document.getElementById('noticeIconWrapper');
  const noticeTitle = document.getElementById('noticeTitle');
  const noticeDesc = document.getElementById('noticeDesc');

  const pillCountAll = document.getElementById('pillCountAll');
  const pillCountUrgent = document.getElementById('pillCountUrgent');
  const pillCountExpired = document.getElementById('pillCountExpired');

  const itemsGrid = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDesc = document.getElementById('emptyDesc');

  function renderApp() {
    updateNoticeCardAndPillCounts();
    renderCards();
  }

  function updateNoticeCardAndPillCounts() {
    let total = items.length;
    let urgent = 0;
    let expired = 0;
    let dueToday = 0;

    items.forEach(item => {
      const m = calculateMetrics(item);
      if (m.hasEndDate) {
        if (m.status === 'expired') {
          expired++;
        } else if (m.status === 'urgent') {
          urgent++;
          if (m.remainingDays === 0) {
            dueToday++;
          }
        }
      }
    });

    const upcoming = urgent - dueToday;

    pillCountAll.textContent = total;
    pillCountUrgent.textContent = urgent;
    pillCountExpired.textContent = expired;

    const noticeStatusTag = document.getElementById('noticeStatusTag');
    const noticeStatusText = document.getElementById('noticeStatusText');

    // 提示欄不需顯示細項，只需顯示有幾項已過期或將到期
    if (noticeDesc) {
      noticeDesc.textContent = '';
      noticeDesc.style.display = 'none';
    }

    if (expired > 0 || urgent > 0) {
      if (expired > 0) {
        noticeIconWrapper.className = 'notice-icon-wrapper expired';
        noticeIconWrapper.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        `;
        if (noticeStatusTag) noticeStatusTag.className = 'notice-status-tag expired';
        if (noticeStatusText) noticeStatusText.textContent = urgent > 0 ? '已過期 · 即將到期' : '已過期';
      } else {
        noticeIconWrapper.className = 'notice-icon-wrapper warning';
        noticeIconWrapper.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        `;
        if (noticeStatusTag) noticeStatusTag.className = 'notice-status-tag warning';
        if (noticeStatusText) {
          noticeStatusText.textContent = '即將到期';
          if (dueToday > 0 && upcoming === 0) noticeStatusText.textContent = '今天到期';
        }
      }

      if (dueToday > 0) {
        const segments = [];
        const htmlSegments = [];
        if (expired > 0) {
          segments.push(`${expired} 項已過期`);
          htmlSegments.push(`<span class="notice-num expired">${expired}</span> 項已過期`);
        }
        segments.push(`${dueToday} 項今天到期`);
        htmlSegments.push(`<span class="notice-num due-today">${dueToday}</span> 項今天到期`);
        if (upcoming > 0) {
          segments.push(`${upcoming} 項即將到期`);
          htmlSegments.push(`<span class="notice-num urgent">${upcoming}</span> 項即將到期`);
        }
        noticeTitle.textContent = `有 ${segments.join('、')}`;
        noticeTitle.innerHTML = `有 ${htmlSegments.join('、')}`;
      } else {
        if (expired > 0 && urgent > 0) {
          noticeTitle.textContent = `有 ${expired} 項已過期、${urgent} 項即將到期`;
          noticeTitle.innerHTML = `有 <span class="notice-num expired">${expired}</span> 項已過期、<span class="notice-num urgent">${urgent}</span> 項即將到期`;
        } else if (expired > 0) {
          noticeTitle.textContent = `有 ${expired} 項已過期`;
          noticeTitle.innerHTML = `有 <span class="notice-num expired">${expired}</span> 項已過期`;
        } else {
          noticeTitle.textContent = `有 ${urgent} 項即將到期`;
          noticeTitle.innerHTML = `有 <span class="notice-num urgent">${urgent}</span> 項即將到期`;
        }
      }
    } else {
      noticeIconWrapper.className = 'notice-icon-wrapper';
      noticeIconWrapper.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      `;
      noticeTitle.textContent = '今天都在週期內';
      if (noticeStatusTag) noticeStatusTag.className = 'notice-status-tag';
      if (noticeStatusText) noticeStatusText.textContent = '正常';
    }

    const btnCleanExpired = document.getElementById('btnCleanExpired');
    if (btnCleanExpired) {
      if (expired > 0) {
        btnCleanExpired.style.display = 'inline-flex';
      } else {
        btnCleanExpired.style.display = 'none';
      }
    }
  }

  function getCustomItemOrder() {
    try {
      const raw = localStorage.getItem(CUSTOM_ORDER_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          const existingIds = new Set(arr);
          const missingIds = items.filter(it => !existingIds.has(it.id)).map(it => it.id);
          return [...arr, ...missingIds];
        }
      }
    } catch (e) {}
    return items.map(it => it.id);
  }

  function saveCustomItemOrder(order) {
    localStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(order));
  }

  function getFilteredItems() {
    const filtered = items.filter(item => {
      const m = calculateMetrics(item);

      if (currentPillFilter === 'urgent') {
        if (!m.hasEndDate || m.status !== 'urgent') return false;
      }
      if (currentPillFilter === 'expired') {
        if (!m.hasEndDate || m.status !== 'expired') return false;
      }

      if (currentNavTab === 'inventory') {
        if (item.category !== currentCategoryChip) {
          return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const name = (item.name || '').toLowerCase();
          const brand = (item.brand || '').toLowerCase();
          const loc = (item.location || '').toLowerCase();
          if (!name.includes(q) && !brand.includes(q) && !loc.includes(q)) return false;
        }
      }

      return true;
    });

    // 依據使用者選擇之排序方式排序
    filtered.sort((a, b) => {
      const ma = calculateMetrics(a);
      const mb = calculateMetrics(b);

      if (currentSortMode === 'custom') {
        // 自訂義順序：依照使用者自訂之順位排列
        const order = getCustomItemOrder();
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        const posA = idxA === -1 ? 9999 : idxA;
        const posB = idxB === -1 ? 9999 : idxB;
        return posA - posB;
      } else if (currentSortMode === 'expiry_asc') {
        // 到期日 升冪：有到期日者依到期日由近到遠，無到期日排在最後
        if (ma.hasEndDate && !mb.hasEndDate) return -1;
        if (!ma.hasEndDate && mb.hasEndDate) return 1;
        if (!ma.hasEndDate && !mb.hasEndDate) {
          return (a.createdAt || 0) - (b.createdAt || 0);
        }
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      } else if (currentSortMode === 'expiry_desc') {
        // 到期日 降冪：有到期日者依到期日由遠到近，無到期日排在最後
        if (ma.hasEndDate && !mb.hasEndDate) return -1;
        if (!ma.hasEndDate && mb.hasEndDate) return 1;
        if (!ma.hasEndDate && !mb.hasEndDate) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        }
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      } else if (currentSortMode === 'created_desc') {
        // 加入時間 降冪：最新加入的排在最前
        const ta = a.createdAt || (a.startDate ? new Date(a.startDate).getTime() : 0);
        const tb = b.createdAt || (b.startDate ? new Date(b.startDate).getTime() : 0);
        return tb - ta;
      } else if (currentSortMode === 'created_asc') {
        // 加入時間 升冪：最早加入的排在最前
        const ta = a.createdAt || (a.startDate ? new Date(a.startDate).getTime() : 0);
        const tb = b.createdAt || (b.startDate ? new Date(b.startDate).getTime() : 0);
        return ta - tb;
      }

      return items.indexOf(a) - items.indexOf(b);
    });

    return filtered;
  }

  function sortItemsList(arr) {
    return [...arr].sort((a, b) => {
      const ma = calculateMetrics(a);
      const mb = calculateMetrics(b);

      if (currentSortMode === 'custom') {
        const order = getCustomItemOrder();
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        const posA = idxA === -1 ? 9999 : idxA;
        const posB = idxB === -1 ? 9999 : idxB;
        return posA - posB;
      } else if (currentSortMode === 'expiry_asc') {
        if (ma.hasEndDate && !mb.hasEndDate) return -1;
        if (!ma.hasEndDate && mb.hasEndDate) return 1;
        if (!ma.hasEndDate && !mb.hasEndDate) {
          return (a.createdAt || 0) - (b.createdAt || 0);
        }
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      } else if (currentSortMode === 'expiry_desc') {
        if (ma.hasEndDate && !mb.hasEndDate) return -1;
        if (!ma.hasEndDate && mb.hasEndDate) return 1;
        if (!ma.hasEndDate && !mb.hasEndDate) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        }
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      } else if (currentSortMode === 'created_desc') {
        const ta = a.createdAt || (a.startDate ? new Date(a.startDate).getTime() : 0);
        const tb = b.createdAt || (b.startDate ? new Date(b.startDate).getTime() : 0);
        return tb - ta;
      } else if (currentSortMode === 'created_asc') {
        const ta = a.createdAt || (a.startDate ? new Date(a.startDate).getTime() : 0);
        const tb = b.createdAt || (b.startDate ? new Date(b.startDate).getTime() : 0);
        return ta - tb;
      }
      return 0;
    });
  }

  function createCardElement(item, isInventory = false) {
    const m = calculateMetrics(item);
    const card = document.createElement('div');
    card.className = 'ios-item-card';
    card.dataset.id = item.id;

    // 縮圖：優先顯示相片，無相片則顯示 emoji
    let iconContent = '';
    if (item.image) {
      iconContent = `<img src="${item.image}" class="card-thumb-img" alt="${escapeHtml(item.name)}">`;
    } else {
      iconContent = `<span>${escapeHtml(item.emoji || '🪑')}</span>`;
    }

    // 次要字串判斷 (有到期日 vs 僅記錄天數)
    let subMetricText = '';
    let subMetricClass = '';
    if (!m.hasEndDate) {
      subMetricText = '持續使用中 ⏳';
      subMetricClass = 'ongoing';
    } else if (m.remainingDays < 0) {
      subMetricText = `已超過 ${Math.abs(m.remainingDays)} 天`;
      subMetricClass = 'expired';
    } else if (m.remainingDays === 0) {
      subMetricText = '今天到期';
      subMetricClass = 'urgent';
    } else {
      subMetricText = `還有 ${formatNumber(m.remainingDays)} 天`;
      if (m.status === 'urgent') subMetricClass = 'urgent';
    }

    // 進度條寬度與樣式
    let progressFillStyle = '';
    if (!m.hasEndDate) {
      progressFillStyle = 'width: 100%; opacity: 0.28;';
    } else {
      progressFillStyle = `width: ${m.percent}%;`;
    }

    // 物品進度條三天內到期與將到期顯示顏色與將到期菜單的數字顏色相同 (var(--ios-orange))，已過期物品進度條與已過期菜單數字顏色相同 (var(--ios-red))
    let progressFillClass = '';
    if (m.hasEndDate) {
      if (m.status === 'expired') {
        progressFillClass = 'expired';
      } else if (m.status === 'urgent') {
        progressFillClass = 'urgent';
      }
    }

    card.innerHTML = `
      <div>
        <!-- Top Row: Icon/Photo container + Category label -->
        <div class="card-top-row">
          <div class="card-icon-box">
            ${iconContent}
          </div>
          <span class="card-category-tag">${escapeHtml(item.subCategory ? `${getCategoryShortLabel(item.category)} · ${item.subCategory}` : getCategoryShortLabel(item.category))}</span>
        </div>

        <!-- Item Title -->
        <div class="card-item-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>

        <!-- Main Metric: 已使用 12 天 -->
        <div class="card-metric-main">
          <span class="metric-pretext">已使用</span>
          <span class="metric-highlight-number">${m.elapsedDays}</span>
          <span class="metric-unit">天</span>
        </div>

        <!-- Sub Metric: 還有 1,085 天 或 持續使用中 -->
        <div class="card-metric-sub ${subMetricClass}">${subMetricText}</div>
      </div>

      <!-- Progress Bar at bottom of card -->
      <div class="card-progress-bar">
        <div class="card-progress-fill ${progressFillClass}" style="${progressFillStyle}"></div>
      </div>
    `;

    let cardTouchStartX = 0;
    let cardTouchStartY = 0;
    let cardMoved = false;

    card.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length === 1) {
        cardTouchStartX = e.touches[0].clientX;
        cardTouchStartY = e.touches[0].clientY;
        cardMoved = false;
      }
    }, { passive: true });

    card.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length === 1) {
        const dx = Math.abs(e.touches[0].clientX - cardTouchStartX);
        const dy = Math.abs(e.touches[0].clientY - cardTouchStartY);
        if (dx > 8 || dy > 8) {
          cardMoved = true;
        }
      }
    }, { passive: true });

    card.addEventListener('click', function (e) {
      if (hasSwipedHorizontally || cardMoved) {
        cardMoved = false;
        return;
      }
      e.stopPropagation();
      openActionSheet(item.id);
    });

    return card;
  }

  function renderCards() {
    const SORT_LABEL_MAP = {
      custom: '自訂義順序',
      expiry_asc: '到期日 升冪',
      expiry_desc: '到期日 降冪',
      created_desc: '加入時間 降冪',
      created_asc: '加入時間 升冪'
    };

    // 1. 渲染主頁卡片 (Today Panel)
    let todayList = items.filter(item => {
      const m = calculateMetrics(item);
      if (currentPillFilter === 'urgent') {
        return m.hasEndDate && m.status === 'urgent';
      } else if (currentPillFilter === 'expired') {
        return m.hasEndDate && m.status === 'expired';
      }
      return true;
    });
    todayList = sortItemsList(todayList);

    // 同步頂部選單按鈕（全部 / 將到期 / 已過期） active 狀態
    document.querySelectorAll('.home-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentPillFilter);
    });

    if (itemsGrid) {
      itemsGrid.innerHTML = '';
      if (todayList.length === 0) {
        emptyState.style.display = 'flex';
        if (currentPillFilter === 'urgent') {
          emptyTitle.textContent = '目前沒有將到期的物品';
          emptyDesc.textContent = '所有物品都還在安心期限內！';
        } else if (currentPillFilter === 'expired') {
          emptyTitle.textContent = '目前沒有已過期的物品';
          emptyDesc.textContent = '太棒了，所有物品都沒有逾期！';
        } else {
          emptyTitle.textContent = '目前沒有物品';
          emptyDesc.textContent = '點擊右上角的「＋」開始記錄生活中的物品使用期限！';
        }
      } else {
        emptyState.style.display = 'none';
        todayList.forEach(item => {
          itemsGrid.appendChild(createCardElement(item));
        });
      }
    }

    const sortToolbarCount = document.getElementById('sortToolbarCount');
    if (sortToolbarCount) {
      if (currentPillFilter === 'urgent') {
        sortToolbarCount.textContent = `將到期 共 ${todayList.length} 項物品`;
      } else if (currentPillFilter === 'expired') {
        sortToolbarCount.textContent = `已過期 共 ${todayList.length} 項物品`;
      } else {
        sortToolbarCount.textContent = `共 ${todayList.length} 項物品`;
      }
    }
    const sortPillLabel = document.getElementById('sortPillLabel');
    if (sortPillLabel) {
      sortPillLabel.textContent = SORT_LABEL_MAP[currentSortMode] || '到期日 升冪';
    }

    // 2. 渲染物品分類群組卡片 (Inventory Panel)
    const inventoryItemsGrid = document.getElementById('inventoryItemsGrid');
    const emptyStateInventory = document.getElementById('emptyStateInventory');
    const emptyTitleInventory = document.getElementById('emptyTitleInventory');
    const emptyDescInventory = document.getElementById('emptyDescInventory');
    const btnEmptyAddItemsToCat = document.getElementById('btnEmptyAddItemsToCat');
    const inventorySortToolbarCount = document.getElementById('inventorySortToolbarCount');
    const inventorySortPillLabel = document.getElementById('inventorySortPillLabel');

    const allCats = getAllCategories();
    const catObj = allCats[currentCategoryChip] || { label: '此群組' };

    let invList = items.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (item.name || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const loc = (item.location || '').toLowerCase();
        const subCat = (item.subCategory || '').toLowerCase();
        const itemCat = allCats[item.category] || {};
        const catLabel = (itemCat.label || '').toLowerCase();
        return name.includes(q) || brand.includes(q) || loc.includes(q) || subCat.includes(q) || catLabel.includes(q);
      }
      return item.category === currentCategoryChip;
    });
    invList = sortItemsList(invList);

    if (inventoryItemsGrid) {
      inventoryItemsGrid.innerHTML = '';
      if (invList.length === 0) {
        if (emptyStateInventory) emptyStateInventory.style.display = 'flex';
        if (searchQuery) {
          if (emptyTitleInventory) emptyTitleInventory.textContent = `找不到符合「${searchQuery}」的物品`;
          if (emptyDescInventory) emptyDescInventory.textContent = '已為您搜尋所有群組，請嘗試其他關鍵字或名稱！';
          if (btnEmptyAddItemsToCat) btnEmptyAddItemsToCat.style.display = 'none';
        } else {
          if (emptyTitleInventory) emptyTitleInventory.textContent = `${catObj.label}群組 目前沒有物品`;
          if (emptyDescInventory) emptyDescInventory.textContent = '您可以從現有物品中勾選加入，或點擊右上角的「＋」新增！';
          if (btnEmptyAddItemsToCat) btnEmptyAddItemsToCat.style.display = 'inline-flex';
        }
      } else {
        if (emptyStateInventory) emptyStateInventory.style.display = 'none';
        if (btnEmptyAddItemsToCat) btnEmptyAddItemsToCat.style.display = 'none';
        invList.forEach(item => {
          inventoryItemsGrid.appendChild(createCardElement(item, true));
        });
      }
    }

    if (inventorySortToolbarCount) {
      if (searchQuery) {
        inventorySortToolbarCount.textContent = `搜尋「${searchQuery}」共 ${invList.length} 項物品 · 全部群組`;
      } else {
        inventorySortToolbarCount.textContent = `${catObj.label}群組 共 ${invList.length} 項物品`;
      }
    }
    if (inventorySortPillLabel) {
      inventorySortPillLabel.textContent = SORT_LABEL_MAP[currentSortMode] || '到期日 升冪';
    }
    if (catActiveCount) {
      catActiveCount.textContent = searchQuery ? `搜尋到 ${invList.length} 項` : `${invList.length} 項物品`;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==========================================
  // 5. 卡片點擊彈出 Action Bottom Sheet
  // ==========================================
  const actionSheet = document.getElementById('actionSheet');
  const sheetEmoji = document.getElementById('sheetEmoji');
  const sheetTitle = document.getElementById('sheetTitle');
  const sheetTag = document.getElementById('sheetTag');
  const sheetElapsedDays = document.getElementById('sheetElapsedDays');
  const sheetRemainingDays = document.getElementById('sheetRemainingDays');
  const sheetTotalDays = document.getElementById('sheetTotalDays');
  const sheetDetailsList = document.getElementById('sheetDetailsList');
  const sheetHistoryBlock = document.getElementById('sheetHistoryBlock');
  const sheetHistoryList = document.getElementById('sheetHistoryList');
  const btnToggleHistoryCollapse = document.getElementById('btnToggleHistoryCollapse');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const historyToggleChevron = document.getElementById('historyToggleChevron');
  const btnSheetReset = document.getElementById('btnSheetReset');
  const btnSheetResetText = document.getElementById('btnSheetResetText');
  const btnSheetEdit = document.getElementById('btnSheetEdit');
  const btnSheetArchive = document.getElementById('btnSheetArchive');
  const btnSheetDelete = document.getElementById('btnSheetDelete');
  const btnCloseSheet = document.getElementById('btnCloseSheet');

  // 雙重確認機制狀態變數 (重設時間與刪除物品)
  let isResetConfirming = false;
  let resetConfirmTimer = null;
  let isDeleteConfirming = false;
  let deleteConfirmTimer = null;

  function clearResetConfirmation() {
    isResetConfirming = false;
    if (resetConfirmTimer) {
      clearTimeout(resetConfirmTimer);
      resetConfirmTimer = null;
    }
    if (btnSheetReset) btnSheetReset.classList.remove('confirm-active');
    updateSheetResetButtonText();
  }

  function clearDeleteConfirmation() {
    isDeleteConfirming = false;
    if (deleteConfirmTimer) {
      clearTimeout(deleteConfirmTimer);
      deleteConfirmTimer = null;
    }
    if (btnSheetDelete) {
      btnSheetDelete.classList.remove('delete-confirm-active');
      btnSheetDelete.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>刪除此物品</span>
      `;
    }
  }

  function updateSheetResetButtonText() {
    if (!activeSheetItemId) return;
    const item = items.find(it => it.id === activeSheetItemId);
    if (!item) return;

    if (isResetConfirming) {
      if (btnSheetResetText) btnSheetResetText.textContent = '確定重設？再次點擊確認';
      if (btnSheetReset) {
        btnSheetReset.classList.add('confirm-active');
        btnSheetReset.setAttribute('title', '確定要重設時間嗎？再次點擊確認');
      }
    } else {
      if (btnSheetReset) {
        btnSheetReset.classList.remove('confirm-active');
        btnSheetReset.setAttribute('title', '重設週期');
      }
      if (btnSheetResetText) {
        btnSheetResetText.textContent = '重設週期';
      }
    }
  }

  function openActionSheet(id) {
    const item = items.find(it => it.id === id);
    if (!item) return;

    activeSheetItemId = id;
    clearResetConfirmation();
    clearDeleteConfirmation();
    const m = calculateMetrics(item);

    // 縮圖
    if (item.image) {
      sheetEmoji.innerHTML = `<img src="${item.image}" class="sheet-thumb-img" alt="${escapeHtml(item.name)}">`;
    } else {
      sheetEmoji.textContent = item.emoji || '🪑';
    }

    sheetTitle.textContent = item.name;

    // 標籤與指標
    const catLabel = item.subCategory ? `${getCategoryShortLabel(item.category)} · ${item.subCategory}` : getCategoryShortLabel(item.category);
    if (!m.hasEndDate) {
      sheetTag.textContent = `${catLabel} • 持續使用中`;
      sheetElapsedDays.innerHTML = `${m.elapsedDays} <small>天</small>`;
      sheetRemainingDays.innerHTML = `- <small>無到期日</small>`;
      sheetTotalDays.innerHTML = `- <small>長期陪伴</small>`;
    } else {
      sheetTag.textContent = `${catLabel} • 還有 ${formatNumber(m.remainingDays)} 天`;
      sheetElapsedDays.innerHTML = `${m.elapsedDays} <small>天</small>`;
      sheetRemainingDays.innerHTML = `${formatNumber(m.remainingDays)} <small>天</small>`;
      sheetTotalDays.innerHTML = `${formatNumber(m.totalDays)} <small>天</small>`;
    }

    // 詳情列表
    sheetDetailsList.innerHTML = `
      ${item.subCategory ? `
        <div class="sheet-detail-row">
          <span>細項分類</span>
          <span>${escapeHtml(item.subCategory)}</span>
        </div>
      ` : ''}
      <div class="sheet-detail-row">
        <span>開始 / 購買日</span>
        <span>${item.startDate}</span>
      </div>
      ${m.hasEndDate ? `
        <div class="sheet-detail-row">
          <span>預計到期日</span>
          <span>${item.endDate}</span>
        </div>
        <div class="sheet-detail-row">
          <span>到期提醒</span>
          <span>${getWarnDaysLabel(item)}</span>
        </div>
      ` : `
        <div class="sheet-detail-row">
          <span>追蹤模式</span>
          <span>僅累計使用天數</span>
        </div>
      `}
      ${item.location ? `
        <div class="sheet-detail-row">
          <span>存放地點</span>
          <span>${escapeHtml(item.location)}</span>
        </div>
      ` : ''}
      ${item.brand ? `
        <div class="sheet-detail-row">
          <span>品牌/型號</span>
          <span>${escapeHtml(item.brand)}</span>
        </div>
      ` : ''}
      ${item.notes ? `
        <div class="sheet-detail-row">
          <span>備註說明</span>
          <span>${escapeHtml(item.notes)}</span>
        </div>
      ` : ''}
    `;

    // 歷程紀錄 (歷史重設紀錄，支援展開收合)
    if (item.history && item.history.length > 0) {
      sheetHistoryBlock.style.display = 'block';
      if (historyCountBadge) {
        historyCountBadge.textContent = `${item.history.length} 次`;
      }
      // 預設收合狀態，點擊標頭展開
      if (sheetHistoryList) {
        sheetHistoryList.style.display = 'none';
      }
      if (btnToggleHistoryCollapse) {
        btnToggleHistoryCollapse.classList.remove('expanded');
        btnToggleHistoryCollapse.setAttribute('aria-expanded', 'false');
      }
      sheetHistoryList.innerHTML = item.history.slice().reverse().map((h, i) => `
        <div>• 第 ${item.history.length - i} 次換新：${h.resetDate} • 使用 ${h.daysUsed} 天 - ${escapeHtml(h.note || '已更換')}</div>
      `).join('');
    } else {
      sheetHistoryBlock.style.display = 'none';
    }

    updateSheetResetButtonText();

    const btnSheetRemoveGroup = document.getElementById('btnSheetRemoveGroup');
    if (btnSheetRemoveGroup) {
      if (currentNavTab === 'inventory') {
        btnSheetRemoveGroup.style.display = 'flex';
        btnSheetRemoveGroup.onclick = function () {
          closeActionSheet();
          removeItemFromCurrentCategory(item.id);
        };
      } else {
        btnSheetRemoveGroup.style.display = 'none';
      }
    }

    actionSheet.style.display = 'flex';
    lockBodyScroll();
  }

  function removeItemFromCurrentCategory(itemId) {
    const it = items.find(x => x.id === itemId);
    if (!it) return;
    const oldCat = it.category;
    it.category = 'other';
    saveItems();
    renderCards();
    renderCategoryChips();
    updateCategoryActionBar();
    const allCats = getAllCategories();
    const catLabel = (allCats[oldCat] && allCats[oldCat].label) || '群組';
    showToast(`已將「${it.name}」移出「${catLabel}」`);
  }

  function closeActionSheet(immediate = false) {
    clearResetConfirmation();
    clearDeleteConfirmation();
    activeSheetItemId = null;
    if (immediate || !actionSheet || actionSheet.style.display === 'none') {
      if (actionSheet) {
        actionSheet.style.display = 'none';
        actionSheet.classList.remove('modal-closing');
      }
      unlockBodyScroll();
      return;
    }
    closeModalWithAnimation(actionSheet);
  }

  // 換新 / 重設週期 (具備雙重確認防止誤觸，4 秒未確認自動取消)
  btnSheetReset.addEventListener('click', function () {
    if (!activeSheetItemId) return;
    const item = items.find(it => it.id === activeSheetItemId);
    if (!item) return;

    if (!isResetConfirming) {
      // 第一次點擊：進入警示確認模式
      isResetConfirming = true;
      updateSheetResetButtonText();
      showToast('請再次點擊以確認重設週期', 'warning');
      resetConfirmTimer = setTimeout(() => {
        clearResetConfirmation();
      }, 4000);
      return;
    }

    // 第二次點擊：確認執行重設！
    clearResetConfirmation();

    const today = getTodayString();
    const m = calculateMetrics(item);
    const duration = item.durationDays || 180;

    if (!item.history) item.history = [];
    item.history.push({
      resetDate: today,
      daysUsed: m.elapsedDays,
      note: '定期換新/重新開始'
    });

    item.startDate = today;
    if (item.hasEndDate !== false) {
      item.endDate = getOffsetDateString(today, duration);
    }

    saveItems();
    closeActionSheet();
    renderApp();
    showToast(`🎉 已成功重設「${item.name}」時間！`);
    autoSyncIfLoggedIn();
  });

  btnSheetEdit.addEventListener('click', function () {
    const id = activeSheetItemId;
    closeActionSheet();
    openEditModal(id);
  });

  if (btnSheetArchive) {
    btnSheetArchive.addEventListener('click', function () {
      if (!activeSheetItemId) return;
      archiveItem(activeSheetItemId);
    });
  }

  // 刪除物品彈出式選單確認 (Modal 8: Delete Confirm Popup Modal)
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const deleteConfirmItemDesc = document.getElementById('deleteConfirmItemDesc');
  const btnConfirmDeleteItem = document.getElementById('btnConfirmDeleteItem');
  const btnCancelDeleteItem = document.getElementById('btnCancelDeleteItem');

  function openDeleteConfirmModal(item) {
    if (!deleteConfirmModal || !item) return;
    if (deleteConfirmItemDesc) {
      deleteConfirmItemDesc.textContent = `將「${item.name}」移至最近刪除，系統將保留 7 天後自動清除`;
    }
    deleteConfirmModal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeDeleteConfirmModal() {
    closeModalWithAnimation(deleteConfirmModal);
  }

  if (btnSheetDelete) {
    btnSheetDelete.addEventListener('click', function () {
      if (!activeSheetItemId) return;
      const item = items.find(it => it.id === activeSheetItemId);
      if (!item) return;
      openDeleteConfirmModal(item);
    });
  }

  if (btnCancelDeleteItem) {
    btnCancelDeleteItem.addEventListener('click', closeDeleteConfirmModal);
  }

  if (deleteConfirmModal) {
    deleteConfirmModal.addEventListener('click', function (e) {
      if (e.target === deleteConfirmModal) closeDeleteConfirmModal();
    });
  }

  if (btnConfirmDeleteItem) {
    btnConfirmDeleteItem.addEventListener('click', function () {
      if (!activeSheetItemId) return;
      const item = items.find(it => it.id === activeSheetItemId);
      if (item) {
        moveToRecentlyDeleted(item);
      }
      const deletedName = item ? item.name : '物品';
      items = items.filter(it => it.id !== activeSheetItemId);
      saveItems();
      closeDeleteConfirmModal();
      closeActionSheet();
      renderApp();
      showToast(`🗑️ 已將「${deletedName}」移至最近刪除，保留 7 天`);
    });
  }

  btnCloseSheet.addEventListener('click', closeActionSheet);
  actionSheet.addEventListener('click', function (e) {
    if (e.target === actionSheet) closeActionSheet();
  });

  if (btnToggleHistoryCollapse && sheetHistoryList) {
    btnToggleHistoryCollapse.addEventListener('click', function () {
      const isHidden = sheetHistoryList.style.display === 'none';
      if (isHidden) {
        sheetHistoryList.style.display = 'flex';
        btnToggleHistoryCollapse.classList.add('expanded');
        btnToggleHistoryCollapse.setAttribute('aria-expanded', 'true');
      } else {
        sheetHistoryList.style.display = 'none';
        btnToggleHistoryCollapse.classList.remove('expanded');
        btnToggleHistoryCollapse.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ==========================================
  // 6. 新增與編輯物品 Modal (含智慧配圖、相片上傳、無到期日切換)
  // ==========================================
  const itemModal = document.getElementById('itemModal');
  const modalTitle = document.getElementById('modalTitle');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const itemForm = document.getElementById('itemForm');
  const itemIdInput = document.getElementById('itemId');
  const itemNameInput = document.getElementById('itemName');
  const itemEmojiInput = document.getElementById('itemEmoji');
  const itemStartDateInput = document.getElementById('itemStartDate');
  const itemEndDateInput = document.getElementById('itemEndDate');
  const fieldEndDateWrap = document.getElementById('fieldEndDateWrap');
  const itemDurationInput = document.getElementById('itemDuration');
  const fieldDurationWrap = document.getElementById('fieldDurationWrap');
  const itemWarnDaysSelect = document.getElementById('itemWarnDaysSelect');
  const fieldReminderWrap = document.getElementById('fieldReminderWrap');
  const itemReminderToggle = document.getElementById('itemReminderToggle');
  const reminderDetailWrap = document.getElementById('reminderDetailWrap');
  const reminderSwitchStatus = document.getElementById('reminderSwitchStatus');
  const presetReminderTimeWrap = document.getElementById('presetReminderTimeWrap');
  const itemPresetReminderTime = document.getElementById('itemPresetReminderTime');
  const customReminderDateTimeWrap = document.getElementById('customReminderDateTimeWrap');
  const itemReminderCustomDate = document.getElementById('itemReminderCustomDate');
  const itemReminderCustomTime = document.getElementById('itemReminderCustomTime');
  const previewExpiryBar = document.getElementById('previewExpiryBar');
  const previewElapsedBar = document.getElementById('previewElapsedBar');
  const itemLocationInput = document.getElementById('itemLocation');
  const itemBrandInput = document.getElementById('itemBrand');
  const itemNotesInput = document.getElementById('itemNotes');
  const previewEndDateText = document.getElementById('previewEndDateText');
  const itemCategorySelect = document.getElementById('itemCategorySelect');
  const itemSubCategorySelect = document.getElementById('itemSubCategorySelect');
  const customSubCatRow = document.getElementById('customSubCatRow');
  const customSubCategoryInput = document.getElementById('customSubCategoryInput');
  const itemSubCategoryInput = document.getElementById('itemSubCategory');

  // Avatar & Image Picker Elements
  const previewEmojiChar = document.getElementById('previewEmojiChar');
  const previewImageEl = document.getElementById('previewImageEl');
  const itemImageInput = document.getElementById('itemImageInput');
  const btnRemoveImage = document.getElementById('btnRemoveImage');
  const btnOpenBgRemoval = document.getElementById('btnOpenBgRemoval');
  const avatarHintText = document.getElementById('avatarHintText');

  // Mode buttons
  const btnModeExpiry = document.getElementById('btnModeExpiry');
  const btnModeElapsed = document.getElementById('btnModeElapsed');

  // 設定追蹤模式 (到期 vs 僅計算天數)
  function setModalMode(mode) {
    currentModalMode = mode;
    if (mode === 'expiry') {
      btnModeExpiry.classList.add('active');
      btnModeElapsed.classList.remove('active');
      if (fieldEndDateWrap) fieldEndDateWrap.style.display = 'block';
      if (fieldDurationWrap) fieldDurationWrap.style.display = 'block';
      if (fieldReminderWrap) fieldReminderWrap.style.display = 'block';
      if (typeof updateReminderSectionVisibility === 'function') {
        updateReminderSectionVisibility(itemWarnDaysSelect ? itemWarnDaysSelect.value : '7');
      }
      previewExpiryBar.style.display = 'flex';
      previewElapsedBar.style.display = 'none';
    } else {
      btnModeExpiry.classList.remove('active');
      btnModeElapsed.classList.add('active');
      if (fieldEndDateWrap) fieldEndDateWrap.style.display = 'none';
      if (fieldDurationWrap) fieldDurationWrap.style.display = 'none';
      if (fieldReminderWrap) fieldReminderWrap.style.display = 'none';
      if (presetReminderTimeWrap) presetReminderTimeWrap.style.display = 'none';
      if (customReminderDateTimeWrap) customReminderDateTimeWrap.style.display = 'none';
      previewExpiryBar.style.display = 'none';
      previewElapsedBar.style.display = 'flex';
    }
    updateModalPreview();
  }

  btnModeExpiry.addEventListener('click', () => setModalMode('expiry'));
  btnModeElapsed.addEventListener('click', () => setModalMode('elapsed'));

  // 更新 Avatar 預覽
  function updateAvatarPreview() {
    if (currentUploadedImage) {
      previewImageEl.src = currentUploadedImage;
      previewImageEl.style.display = 'block';
      previewEmojiChar.style.display = 'none';
      btnRemoveImage.style.display = 'inline-block';
      if (btnOpenBgRemoval) btnOpenBgRemoval.style.display = 'inline-flex';
      avatarHintText.textContent = '已套用相片，可點選「✨ 智慧去背」去背';
    } else {
      previewImageEl.style.display = 'none';
      previewEmojiChar.style.display = 'block';
      previewEmojiChar.textContent = itemEmojiInput.value || '🪑';
      btnRemoveImage.style.display = 'none';
      if (btnOpenBgRemoval) btnOpenBgRemoval.style.display = 'none';
      avatarHintText.textContent = '輸入名稱自動配圖，或自行上傳相片';
    }
  }

  // 圖片壓縮為 256x256 輕量化 DataURL
  function compressImageFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const maxSide = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxSide) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          }
        } else {
          if (h > maxSide) {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png'); // 預設使用 PNG 支援後續透明去背
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 監聽圖片上傳
  itemImageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    compressImageFile(file, function (dataUrl) {
      currentUploadedImage = dataUrl;
      updateAvatarPreview();
      showToast('相片已成功加入！可使用「✨ 智慧去背」去除背景');
    });
    itemImageInput.value = '';
  });

  // 移除圖片，切換回 Emoji
  btnRemoveImage.addEventListener('click', function () {
    currentUploadedImage = null;
    updateAvatarPreview();
    showToast('已移除自訂相片，切換為圖標');
  });

  // 手動自訂 Emoji
  itemEmojiInput.addEventListener('input', function () {
    isManualEmojiSet = true;
    updateAvatarPreview();
  });

  // ==========================================
  // 6.1 智慧相片去背工坊 (AI & Custom Background Removal Studio)
  // ==========================================
  const bgRemovalModal = document.getElementById('bgRemovalModal');
  const btnCloseBgRemovalModal = document.getElementById('btnCloseBgRemovalModal');
  const btnCancelBgRemoval = document.getElementById('btnCancelBgRemoval');
  const btnApplyBgRemoval = document.getElementById('btnApplyBgRemoval');
  const bgRemovalCanvas = document.getElementById('bgRemovalCanvas');
  const btnAiBgRemoval = document.getElementById('btnAiBgRemoval');
  const btnColorPickRemoval = document.getElementById('btnColorPickRemoval');
  const btnResetBgRemoval = document.getElementById('btnResetBgRemoval');
  const bgToleranceSlider = document.getElementById('bgToleranceSlider');
  const bgToleranceVal = document.getElementById('bgToleranceVal');
  const bgFeatherSlider = document.getElementById('bgFeatherSlider');
  const bgFeatherVal = document.getElementById('bgFeatherVal');

  let bgCanvasCtx = null;
  let bgOriginalImageData = null;
  let bgTargetColors = []; // [[r, g, b], ...]
  let isColorPickMode = false;

  function openBgRemovalStudio(imageSrc) {
    if (!imageSrc) {
      showToast('請先上傳相片才能進行去背！');
      return;
    }
    if (!bgRemovalModal || !bgRemovalCanvas) return;
    bgCanvasCtx = bgRemovalCanvas.getContext('2d');
    isColorPickMode = false;
    if (btnColorPickRemoval) btnColorPickRemoval.classList.remove('active-tool');

    const img = new Image();
    img.onload = function () {
      const maxDim = 320;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      bgRemovalCanvas.width = w;
      bgRemovalCanvas.height = h;

      // 繪製原圖到 Canvas
      bgCanvasCtx.clearRect(0, 0, w, h);
      bgCanvasCtx.drawImage(img, 0, 0, w, h);
      bgOriginalImageData = bgCanvasCtx.getImageData(0, 0, w, h);

      // AI 自動偵測背景色群集
      bgTargetColors = autoDetectBackgroundColors(bgOriginalImageData, w, h);

      // 執行即時去背運算
      applyBackgroundMatting();

      bgRemovalModal.style.display = 'flex';
      lockBodyScroll();
      showToast('✨ 智慧去背工坊已就緒！');
    };
    img.src = imageSrc;
  }

  function closeBgRemovalStudio() {
    closeModalWithAnimation(bgRemovalModal, () => {
      isColorPickMode = false;
    });
  }

  // AI 智慧自動採樣背景色（採樣圖片四角、邊緣週邊）
  function autoDetectBackgroundColors(imgData, width, height) {
    const data = imgData.data;
    const sampled = [];

    function samplePixel(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 30) {
        sampled.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    // 四角 4x4 區塊密集採樣
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        samplePixel(dx, dy); // 左上
        samplePixel(width - 1 - dx, dy); // 右上
        samplePixel(dx, height - 1 - dy); // 左下
        samplePixel(width - 1 - dx, height - 1 - dy); // 右下
      }
    }

    // 圖片上下左右邊界中點採樣
    samplePixel(Math.floor(width / 2), 0);
    samplePixel(Math.floor(width / 2), height - 1);
    samplePixel(0, Math.floor(height / 2));
    samplePixel(width - 1, Math.floor(height / 2));

    if (sampled.length === 0) return [[255, 255, 255]];

    let avgR = 0, avgG = 0, avgB = 0;
    sampled.forEach(c => {
      avgR += c[0];
      avgG += c[1];
      avgB += c[2];
    });
    const len = sampled.length;
    avgR = Math.round(avgR / len);
    avgG = Math.round(avgG / len);
    avgB = Math.round(avgB / len);

    const colors = [[avgR, avgG, avgB]];
    // 如果左上角與右下角顏色差異較大，加入額外種子
    if (sampled.length >= 16) {
      const c1 = sampled[0];
      const c2 = sampled[15];
      if (colorDistance(c1, [avgR, avgG, avgB]) > 25) colors.push(c1);
      if (colorDistance(c2, [avgR, avgG, avgB]) > 25) colors.push(c2);
    }
    return colors;
  }

  // 感知加權色差計算 (Perceptual Euclidean Color Distance)
  function colorDistance(c1, c2) {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
  }

  // 核心去背運算 (Matting with tolerance & edge feathering)
  function applyBackgroundMatting() {
    if (!bgOriginalImageData || !bgCanvasCtx) return;

    const tolerancePercent = parseInt(bgToleranceSlider ? bgToleranceSlider.value : 28, 10) || 28;
    const featherPx = parseInt(bgFeatherSlider ? bgFeatherSlider.value : 2, 10) || 2;
    // 將 0-100% 容許度映射到感知色彩距離閥值 (0 ~ 170)
    const threshold = (tolerancePercent / 100) * 160;

    const w = bgRemovalCanvas.width;
    const h = bgRemovalCanvas.height;
    const output = bgCanvasCtx.createImageData(w, h);
    const src = bgOriginalImageData.data;
    const dst = output.data;
    const totalPixels = w * h;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const a = src[idx + 3];

      if (a === 0) {
        dst[idx] = r;
        dst[idx + 1] = g;
        dst[idx + 2] = b;
        dst[idx + 3] = 0;
        continue;
      }

      // 計算與所有設定之背景色之最小色彩距離
      let minDistance = 9999;
      for (let k = 0; k < bgTargetColors.length; k++) {
        const d = colorDistance([r, g, b], bgTargetColors[k]);
        if (d < minDistance) minDistance = d;
      }

      dst[idx] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;

      if (minDistance <= threshold) {
        // 完全透明消除
        dst[idx + 3] = 0;
      } else if (featherPx > 0 && minDistance < threshold + featherPx * 6) {
        // 邊緣平滑羽化過渡，避免鋸齒
        const ramp = (minDistance - threshold) / (featherPx * 6);
        dst[idx + 3] = Math.round(a * Math.min(1, Math.max(0, ramp)));
      } else {
        // 保留主體不透明
        dst[idx + 3] = a;
      }
    }

    bgCanvasCtx.putImageData(output, 0, 0);
  }

  // 點擊去背按鈕開啟去背工坊
  if (btnOpenBgRemoval) {
    btnOpenBgRemoval.addEventListener('click', function () {
      if (currentUploadedImage) {
        openBgRemovalStudio(currentUploadedImage);
      } else {
        showToast('請先上傳相片才能去背！');
      }
    });
  }

  if (btnCloseBgRemovalModal) btnCloseBgRemovalModal.addEventListener('click', closeBgRemovalStudio);
  if (btnCancelBgRemoval) btnCancelBgRemoval.addEventListener('click', closeBgRemovalStudio);

  // 增強 AI 去背：使用 @imgly/background-removal 執行圖片去背
  let isImglyProcessing = false;

  async function performImglyBackgroundRemoval() {
    if (!bgOriginalImageData || !bgRemovalCanvas || isImglyProcessing) return;
    isColorPickMode = false;
    if (btnColorPickRemoval) btnColorPickRemoval.classList.remove('active-tool');

    isImglyProcessing = true;
    const origHtml = btnAiBgRemoval.innerHTML;
    btnAiBgRemoval.disabled = true;
    btnAiBgRemoval.classList.add('active-tool');
    btnAiBgRemoval.innerHTML = '<span class="pill-btn-icon">⏳</span><span>模型載入中...</span>';
    showToast('🤖 正在以 @imgly/background-removal AI 進行精準去背...');

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = bgRemovalCanvas.width;
      tempCanvas.height = bgRemovalCanvas.height;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.putImageData(bgOriginalImageData, 0, 0);

      const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
      const { default: removeBackground } = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@latest/+esm');

      const resultBlob = await removeBackground(blob, {
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.min(100, Math.round((current / total) * 100));
            btnAiBgRemoval.innerHTML = `<span class="pill-btn-icon">⏳</span><span>AI 運算 ${pct}%</span>`;
          }
        }
      });

      const resultUrl = URL.createObjectURL(resultBlob);
      const img = new Image();
      img.onload = () => {
        bgCanvasCtx.clearRect(0, 0, bgRemovalCanvas.width, bgRemovalCanvas.height);
        bgCanvasCtx.drawImage(img, 0, 0, bgRemovalCanvas.width, bgRemovalCanvas.height);
        URL.revokeObjectURL(resultUrl);
        showToast('✨ @imgly/background-removal AI 去背完成！');
        btnAiBgRemoval.innerHTML = origHtml;
        btnAiBgRemoval.disabled = false;
        btnAiBgRemoval.classList.remove('active-tool');
        isImglyProcessing = false;
      };
      img.onerror = () => {
        throw new Error('無法讀取去背結果圖片');
      };
      img.src = resultUrl;
    } catch (err) {
      console.warn('imgly background removal error, falling back to local matting:', err);
      // 離線或環境受限時自動啟動本機取色邊界去背
      const w = bgRemovalCanvas.width;
      const h = bgRemovalCanvas.height;
      bgTargetColors = autoDetectBackgroundColors(bgOriginalImageData, w, h);
      applyBackgroundMatting();
      showToast('⚠️ 已使用本機邊界取色去背完成！');
      btnAiBgRemoval.innerHTML = origHtml;
      btnAiBgRemoval.disabled = false;
      btnAiBgRemoval.classList.remove('active-tool');
      isImglyProcessing = false;
    }
  }

  if (btnAiBgRemoval) {
    btnAiBgRemoval.addEventListener('click', performImglyBackgroundRemoval);
  }

  // 點按取色去背模式
  if (btnColorPickRemoval) {
    btnColorPickRemoval.addEventListener('click', function () {
      isColorPickMode = !isColorPickMode;
      if (isColorPickMode) {
        this.classList.add('active-tool');
        showToast('🎯 請點擊畫布上想要去除的背景位置');
      } else {
        this.classList.remove('active-tool');
      }
    });
  }

  // 畫布點擊吸色去背
  if (bgRemovalCanvas) {
    bgRemovalCanvas.addEventListener('click', function (e) {
      if (!bgOriginalImageData) return;
      const rect = bgRemovalCanvas.getBoundingClientRect();
      const scaleX = bgRemovalCanvas.width / rect.width;
      const scaleY = bgRemovalCanvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      if (x >= 0 && x < bgRemovalCanvas.width && y >= 0 && y < bgRemovalCanvas.height) {
        const idx = (y * bgRemovalCanvas.width + x) * 4;
        const r = bgOriginalImageData.data[idx];
        const g = bgOriginalImageData.data[idx + 1];
        const b = bgOriginalImageData.data[idx + 2];

        bgTargetColors.push([r, g, b]);
        applyBackgroundMatting();
      }
    });
  }

  // 還原原圖
  if (btnResetBgRemoval) {
    btnResetBgRemoval.addEventListener('click', function () {
      if (!bgOriginalImageData || !bgCanvasCtx) return;
      bgCanvasCtx.putImageData(bgOriginalImageData, 0, 0);
      bgTargetColors = [];
      showToast('↺ 已還原原始相片');
    });
  }

  // 容許度滑桿變更
  if (bgToleranceSlider) {
    bgToleranceSlider.addEventListener('input', function () {
      if (bgToleranceVal) bgToleranceVal.textContent = this.value + '%';
      applyBackgroundMatting();
    });
  }

  // 羽化滑桿變更
  if (bgFeatherSlider) {
    bgFeatherSlider.addEventListener('input', function () {
      if (bgFeatherVal) bgFeatherVal.textContent = this.value + 'px';
      applyBackgroundMatting();
    });
  }

  // 完成並套用去背圖片
  if (btnApplyBgRemoval) {
    btnApplyBgRemoval.addEventListener('click', function () {
      if (!bgRemovalCanvas) return;
      const transparentPngUrl = bgRemovalCanvas.toDataURL('image/png');
      currentUploadedImage = transparentPngUrl;
      updateAvatarPreview();
      closeBgRemovalStudio();
      showToast('✅ 去背成功！已套用為透明背景縮圖');
    });
  }

  // 智慧關鍵字自動配圖與聯動分類 (當輸入名稱時即時觸發)
  itemNameInput.addEventListener('input', function () {
    const text = this.value.trim().toLowerCase();
    if (!text) return;

    // 若使用者尚未上傳自訂相片且未手動鎖定 emoji，進行自動匹配
    if (!currentUploadedImage && !isManualEmojiSet) {
      for (const item of SMART_KEYWORD_MAP) {
        const matched = item.keywords.some(k => text.includes(k.toLowerCase()));
        if (matched) {
          itemEmojiInput.value = item.emoji;
          updateAvatarPreview();

          // 自動帶出建議的一級主分類與二級細項下拉選單
          if (itemCategorySelect && itemCategorySelect.value !== item.cat) {
            itemCategorySelect.value = item.cat;
            populateSubCategoryDropdown(item.cat, item.subCat || '');
          }
          break;
        }
      }
    }
  });

  // 分類細項下拉選單核心渲染與聯動邏輯
  function populateSubCategoryDropdown(category, activeSubCatName = '') {
    const allCats = getAllCategories();
    const catData = allCats[category];
    if (!itemSubCategorySelect || !catData) return;

    itemSubCategorySelect.innerHTML = '';

    // 提示預設選項
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = `請選擇 ${catData.label} 細項...`;
    itemSubCategorySelect.appendChild(defaultOpt);

    let hasMatched = false;

    if (catData.items && Array.isArray(catData.items)) {
      catData.items.forEach(subItem => {
        const opt = document.createElement('option');
        opt.value = subItem.subCat;
        opt.textContent = `${subItem.emoji || catData.emoji || '🏷️'} ${subItem.subCat || subItem.name}`;
        opt.dataset.name = subItem.name;
        opt.dataset.subcat = subItem.subCat;
        opt.dataset.emoji = subItem.emoji || catData.emoji || '🏷️';
        opt.dataset.duration = subItem.duration || '';
        opt.dataset.hasEndDate = subItem.hasEndDate !== false;
        opt.dataset.brand = subItem.brand || '';
        opt.dataset.location = subItem.location || '';
        opt.dataset.notes = subItem.notes || '';
        opt.dataset.image = subItem.image || '';

        if (activeSubCatName && (activeSubCatName === subItem.subCat || activeSubCatName === subItem.name)) {
          opt.selected = true;
          hasMatched = true;
        }
        itemSubCategorySelect.appendChild(opt);
      });
    }

    // 自訂細項選項
    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = '➕ 自訂其他細項名稱...';
    itemSubCategorySelect.appendChild(customOpt);

    if (!hasMatched && activeSubCatName) {
      customOpt.selected = true;
      if (customSubCatRow) customSubCatRow.style.display = 'block';
      if (customSubCategoryInput) customSubCategoryInput.value = activeSubCatName;
      if (itemSubCategoryInput) itemSubCategoryInput.value = activeSubCatName;
    } else {
      if (customSubCatRow) customSubCatRow.style.display = 'none';
      if (customSubCategoryInput) customSubCategoryInput.value = '';
      if (itemSubCategoryInput) itemSubCategoryInput.value = hasMatched ? activeSubCatName : (itemSubCategorySelect.value || '');
    }
  }

  // 主分類下拉選單動態渲染 (包含自訂分類與自訂入口)
  function populateCategorySelect(selectedCat = '') {
    if (!itemCategorySelect) return;
    const allCats = getAllCategories();
    const prevVal = selectedCat || itemCategorySelect.value || Object.keys(allCats)[0] || 'vehicle';
    itemCategorySelect.innerHTML = '';

    Object.keys(allCats).forEach(key => {
      const cat = allCats[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${cat.emoji} ${cat.label}`;
      if (key === prevVal) opt.selected = true;
      itemCategorySelect.appendChild(opt);
    });

    const manageOpt = document.createElement('option');
    manageOpt.value = '__manage_custom__';
    manageOpt.textContent = '➕ 自訂分類項目...';
    itemCategorySelect.appendChild(manageOpt);
  }

  // 監聽主分類下拉變更，即時重繪細項下拉
  if (itemCategorySelect) {
    itemCategorySelect.addEventListener('change', function () {
      if (this.value === '__manage_custom__') {
        openCustomCategoryModal();
        const allCats = getAllCategories();
        this.value = Object.keys(allCats)[0] || 'vehicle';
        populateSubCategoryDropdown(this.value);
        return;
      }
      populateSubCategoryDropdown(this.value);
    });
  }

  // 監聽細項下拉選單變更，自動智慧代入預設值
  if (itemSubCategorySelect) {
    itemSubCategorySelect.addEventListener('change', function () {
      const val = this.value;
      if (val === '__custom__') {
        if (customSubCatRow) customSubCatRow.style.display = 'block';
        if (customSubCategoryInput) {
          customSubCategoryInput.focus();
          itemSubCategoryInput.value = customSubCategoryInput.value.trim() || '自訂細項';
        }
      } else {
        if (customSubCatRow) customSubCatRow.style.display = 'none';
        itemSubCategoryInput.value = val;
        const opt = this.options[this.selectedIndex];
        if (opt && opt.dataset.name) {
          itemNameInput.value = opt.dataset.name;
          if (opt.dataset.duration) {
            itemDurationInput.value = opt.dataset.duration;
            const startStr = itemStartDateInput.value || getTodayString();
            if (itemEndDateInput) {
              itemEndDateInput.value = getOffsetDateString(startStr, parseInt(opt.dataset.duration, 10) || 1);
            }
          }
          if (opt.dataset.hasEndDate === 'false') {
            setModalMode('elapsed');
          } else {
            setModalMode('expiry');
          }
          if (opt.dataset.emoji) {
            itemEmojiInput.value = opt.dataset.emoji;
            isManualEmojiSet = true;
          }
          if (opt.dataset.brand) itemBrandInput.value = opt.dataset.brand;
          if (opt.dataset.location) itemLocationInput.value = opt.dataset.location;
          if (opt.dataset.notes) itemNotesInput.value = opt.dataset.notes;
          if (opt.dataset.image) currentUploadedImage = opt.dataset.image;

          // 若該細項有建議提醒天數，自動帶入
          const catItems = getAllCategories()[itemCategorySelect.value]?.items;
          const subItemDef = catItems ? catItems.find(it => it.subCat === opt.value) : null;
          if (subItemDef && subItemDef.warnDays !== undefined) {
            setReminderSelectValue(subItemDef.warnDays);
          }

          updateAvatarPreview();
          updateModalPreview();
        }
      }
    });
  }

  const REMINDER_OPTIONS = [
    { value: '0', label: '到期當天提醒' },
    { value: '1', label: '到期 1 天前提醒' },
    { value: '3', label: '到期 3 天前提醒' },
    { value: '5', label: '到期 5 天前提醒' },
    { value: '7', label: '到期 7 天前提醒' },
    { value: '10', label: '到期 10 天前提醒' },
    { value: '14', label: '到期 14 天前提醒' },
    { value: '30', label: '到期 30 天前提醒' },
    { value: '60', label: '到期 60 天前提醒' },
    { value: '90', label: '到期 90 天前提醒' },
    { value: 'custom', label: '🗓️ 自訂指定提醒日期與時間...' },
    { value: '-1', label: '不提醒' }
  ];

  function updateReminderToggleState(enabled) {
    if (itemReminderToggle) itemReminderToggle.checked = enabled;
    if (reminderDetailWrap) {
      if (enabled) {
        reminderDetailWrap.classList.remove('disabled');
        reminderDetailWrap.style.display = 'flex';
      } else {
        reminderDetailWrap.classList.add('disabled');
        reminderDetailWrap.style.display = 'none';
      }
    }
    if (reminderSwitchStatus) {
      reminderSwitchStatus.textContent = enabled ? '已開啟提醒' : '已關閉提醒';
    }
  }

  if (itemReminderToggle) {
    itemReminderToggle.addEventListener('change', function () {
      updateReminderToggleState(this.checked);
      if (this.checked) {
        if (itemWarnDaysSelect && itemWarnDaysSelect.value === '-1') {
          itemWarnDaysSelect.value = '7';
        }
        updateReminderSectionVisibility(itemWarnDaysSelect ? itemWarnDaysSelect.value : '7');
      } else {
        updateReminderSectionVisibility('-1');
      }
    });
  }

  function updateReminderSectionVisibility(val) {
    if (currentModalMode === 'elapsed') {
      if (presetReminderTimeWrap) presetReminderTimeWrap.style.display = 'none';
      if (customReminderDateTimeWrap) customReminderDateTimeWrap.style.display = 'none';
      return;
    }
    const isToggleOn = itemReminderToggle ? itemReminderToggle.checked : true;
    if (!isToggleOn || val === '-1') {
      if (customReminderDateTimeWrap) customReminderDateTimeWrap.style.display = 'none';
      if (presetReminderTimeWrap) presetReminderTimeWrap.style.display = 'none';
      updateReminderToggleState(false);
      return;
    }
    updateReminderToggleState(true);
    if (val === 'custom') {
      if (customReminderDateTimeWrap) customReminderDateTimeWrap.style.display = 'flex';
      if (presetReminderTimeWrap) presetReminderTimeWrap.style.display = 'none';
    } else {
      if (customReminderDateTimeWrap) customReminderDateTimeWrap.style.display = 'none';
      if (presetReminderTimeWrap) presetReminderTimeWrap.style.display = 'flex';
    }
  }

  function populateReminderOptions(daysOrType) {
    if (!itemWarnDaysSelect) return;
    const val = (daysOrType !== undefined && daysOrType !== null) ? String(daysOrType) : '7';
    itemWarnDaysSelect.innerHTML = '';
    let hasMatch = false;

    REMINDER_OPTIONS.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label;
      if (item.value === val) {
        opt.selected = true;
        opt.setAttribute('selected', 'selected');
        hasMatch = true;
      }
      itemWarnDaysSelect.appendChild(opt);
    });

    if (!hasMatch && val !== '-1' && val !== 'custom') {
      const customOpt = document.createElement('option');
      customOpt.value = val;
      customOpt.textContent = `到期 ${val} 天前提醒`;
      customOpt.selected = true;
      customOpt.setAttribute('selected', 'selected');
      itemWarnDaysSelect.appendChild(customOpt);
    }

    itemWarnDaysSelect.value = val;
    updateReminderSectionVisibility(val);
  }
  const setReminderSelectValue = populateReminderOptions;

  if (itemWarnDaysSelect) {
    itemWarnDaysSelect.addEventListener('change', function () {
      const val = this.value;
      updateReminderSectionVisibility(val);
      if (val === 'custom') {
        if (itemReminderCustomDate && !itemReminderCustomDate.value) {
          const endStr = (itemEndDateInput && itemEndDateInput.value) ? itemEndDateInput.value : getOffsetDateString(getTodayString(), 30);
          itemReminderCustomDate.value = getOffsetDateString(endStr, -1);
        }
        if (itemReminderCustomTime && !itemReminderCustomTime.value) {
          itemReminderCustomTime.value = '09:00';
        }
      }
    });
  }

  if (customSubCategoryInput) {
    customSubCategoryInput.addEventListener('input', function () {
      itemSubCategoryInput.value = this.value.trim() || '自訂細項';
    });
  }

  function openAddModal() {
    modalTitle.textContent = '新增物品';
    itemForm.reset();
    itemIdInput.value = '';
    itemSubCategoryInput.value = '';

    const today = getTodayString();
    itemStartDateInput.value = today;
    itemDurationInput.value = '180';
    if (itemEndDateInput) itemEndDateInput.value = getOffsetDateString(today, 180);

    if (itemPresetReminderTime) itemPresetReminderTime.value = '09:00';
    if (itemReminderCustomDate) itemReminderCustomDate.value = '';
    if (itemReminderCustomTime) itemReminderCustomTime.value = '09:00';
    updateReminderToggleState(true);
    populateReminderOptions('7');

    itemEmojiInput.value = '🪑';
    currentUploadedImage = null;
    isManualEmojiSet = false;

    populateCategorySelect('warranty');
    populateSubCategoryDropdown('warranty');

    setModalMode('expiry');
    updateAvatarPreview();
    itemModal.style.display = 'flex';
    lockBodyScroll();
  }

  function openEditModal(id) {
    const item = items.find(it => it.id === id);
    if (!item) return;

    modalTitle.textContent = '編輯物品資訊';
    itemIdInput.value = item.id;
    itemNameInput.value = item.name || '';
    itemSubCategoryInput.value = item.subCategory || '';
    itemEmojiInput.value = item.emoji || '🪑';
    currentUploadedImage = item.image || null;
    isManualEmojiSet = true;

    const startStr = item.startDate || getTodayString();
    const duration = item.durationDays || '180';
    itemStartDateInput.value = startStr;
    itemDurationInput.value = duration;
    if (itemEndDateInput) {
      itemEndDateInput.value = item.endDate || getOffsetDateString(startStr, parseInt(duration, 10) || 180);
    }

    if (item.reminderType === 'custom' || item.reminderDate) {
      if (itemReminderCustomDate) itemReminderCustomDate.value = item.reminderDate || '';
      if (itemReminderCustomTime) itemReminderCustomTime.value = item.reminderTime || '09:00';
      updateReminderToggleState(true);
      populateReminderOptions('custom');
    } else if (item.reminderType === 'none' || item.warnDays === -1 || item.warnDays === '-1') {
      updateReminderToggleState(false);
      populateReminderOptions('-1');
    } else {
      if (itemPresetReminderTime) itemPresetReminderTime.value = item.reminderTime || '09:00';
      updateReminderToggleState(true);
      populateReminderOptions(item.warnDays !== undefined ? item.warnDays : 7);
    }

    itemLocationInput.value = item.location || '';
    itemBrandInput.value = item.brand || '';
    itemNotesInput.value = item.notes || '';

    populateCategorySelect(item.category || 'warranty');
    populateSubCategoryDropdown(item.category || 'warranty', item.subCategory || '');

    if (item.hasEndDate === false) {
      setModalMode('elapsed');
    } else {
      setModalMode('expiry');
    }

    updateAvatarPreview();
    itemModal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeModal() {
    closeModalWithAnimation(itemModal);
  }

  // 雙向換算：從週期天數同步到期日
  function syncFromDuration() {
    if (currentModalMode === 'elapsed') return;
    const startStr = itemStartDateInput.value || getTodayString();
    const duration = parseInt(itemDurationInput.value, 10) || 1;
    const endStr = getOffsetDateString(startStr, duration);
    if (itemEndDateInput) itemEndDateInput.value = endStr;
    updateModalPreview();
  }

  // 雙向換算：從自訂到期日同步週期天數
  function syncFromEndDate() {
    if (currentModalMode === 'elapsed') return;
    const startStr = itemStartDateInput.value || getTodayString();
    const endStr = itemEndDateInput ? itemEndDateInput.value : '';
    if (!endStr) return;
    const days = diffDays(startStr, endStr);
    if (days >= 0) {
      itemDurationInput.value = days === 0 ? 1 : days;
    } else {
      itemDurationInput.value = 1;
    }
    updateModalPreview();
  }

  function updateModalPreview() {
    if (currentModalMode === 'elapsed') return;

    const startStr = itemStartDateInput.value || getTodayString();
    let endStr = itemEndDateInput ? itemEndDateInput.value : '';
    const duration = parseInt(itemDurationInput.value, 10) || 1;

    if (!endStr) {
      endStr = getOffsetDateString(startStr, duration);
      if (itemEndDateInput) itemEndDateInput.value = endStr;
    }

    const today = getTodayString();
    const remain = diffDays(today, endStr);

    previewEndDateText.textContent = endStr;
    if (remain < 0) {
      previewDaysText.textContent = `已過期 ${Math.abs(remain)} 天`;
      previewDaysText.style.color = 'var(--ios-red)';
    } else {
      previewDaysText.textContent = `剩餘 ${remain} 天 • 週期 ${duration} 天`;
      previewDaysText.style.color = 'var(--ios-green)';
    }
  }

  itemStartDateInput.addEventListener('change', function () {
    if (itemEndDateInput && itemEndDateInput.value) {
      syncFromEndDate();
    } else {
      syncFromDuration();
    }
  });
  if (itemEndDateInput) {
    itemEndDateInput.addEventListener('change', syncFromEndDate);
  }
  itemDurationInput.addEventListener('input', syncFromDuration);

  // 表單儲存
  itemForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    if (!name) return;

    const id = itemIdInput.value.trim();
    const category = itemCategorySelect ? itemCategorySelect.value : 'warranty';
    let subCategory = itemSubCategoryInput.value.trim();
    if (!subCategory && itemSubCategorySelect && itemSubCategorySelect.value && itemSubCategorySelect.value !== '__custom__') {
      subCategory = itemSubCategorySelect.value;
    }
    const emoji = itemEmojiInput.value.trim() || '🪑';
    const image = currentUploadedImage || null;
    const startDate = itemStartDateInput.value || getTodayString();
    const hasEndDate = (currentModalMode === 'expiry');

    let durationDays = null;
    let endDate = null;
    let warnDays = 7;
    let reminderType = 'preset';
    let reminderDate = null;
    let reminderTime = '09:00';

    if (hasEndDate) {
      if (itemEndDateInput && itemEndDateInput.value) {
        endDate = itemEndDateInput.value;
        durationDays = parseInt(itemDurationInput.value, 10) || Math.max(1, diffDays(startDate, endDate));
      } else {
        durationDays = parseInt(itemDurationInput.value, 10) || 180;
        endDate = getOffsetDateString(startDate, durationDays);
      }

      const isReminderActive = itemReminderToggle ? itemReminderToggle.checked : true;
      const reminderVal = isReminderActive ? (itemWarnDaysSelect ? itemWarnDaysSelect.value : '7') : '-1';
      if (reminderVal === 'custom') {
        reminderType = 'custom';
        reminderDate = (itemReminderCustomDate && itemReminderCustomDate.value) ? itemReminderCustomDate.value : getOffsetDateString(endDate, -1);
        reminderTime = (itemReminderCustomTime && itemReminderCustomTime.value) ? itemReminderCustomTime.value : '09:00';
        warnDays = Math.max(0, diffDays(startDate, reminderDate));
      } else if (reminderVal === '-1') {
        reminderType = 'none';
        warnDays = -1;
        reminderDate = null;
        reminderTime = null;
      } else {
        reminderType = 'preset';
        warnDays = parseInt(reminderVal, 10) || 0;
        reminderTime = (itemPresetReminderTime && itemPresetReminderTime.value) ? itemPresetReminderTime.value : '09:00';
        reminderDate = getOffsetDateString(endDate, -warnDays);
      }
    }

    const location = itemLocationInput.value.trim();
    const brand = itemBrandInput.value.trim();
    const notes = itemNotesInput.value.trim();

    if (id) {
      const item = items.find(it => it.id === id);
      if (item) {
        item.name = name;
        item.category = category;
        item.subCategory = subCategory;
        item.emoji = emoji;
        item.image = image;
        item.startDate = startDate;
        item.hasEndDate = hasEndDate;
        item.durationDays = durationDays;
        item.endDate = endDate;
        item.reminderType = reminderType;
        item.reminderDate = reminderDate;
        item.reminderTime = reminderTime;
        item.warnDays = warnDays;
        item.location = location;
        item.brand = brand;
        item.notes = notes;
      }
      showToast('已更新物品資訊');
    } else {
      const newItem = {
        id: 'item_' + Date.now(),
        name,
        category,
        subCategory,
        emoji,
        image,
        startDate,
        hasEndDate,
        durationDays,
        endDate,
        reminderType,
        reminderDate,
        reminderTime,
        warnDays,
        location,
        brand,
        notes,
        history: [],
        createdAt: Date.now()
      };
      items.unshift(newItem);
      showToast('已新增物品！');
    }

    saveItems();
    closeModal();
    renderApp();
  });

  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);
  itemModal.addEventListener('click', function (e) {
    if (e.target === itemModal) closeModal();
  });

  // ==========================================
  // 7. 設定 Modal (Settings)
  // ==========================================
  const settingsModal = document.getElementById('settingsModal');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnToggleThemeSetting = document.getElementById('btnToggleThemeSetting');
  const settingsThemeText = document.getElementById('settingsThemeText');
  const btnToggleNotification = document.getElementById('btnToggleNotification');
  const toggleNotificationSwitch = document.getElementById('toggleNotificationSwitch');
  const settingsNotifyStatusText = document.getElementById('settingsNotifyStatusText');
  const PUSH_NOTIFICATION_KEY = 'lifespan_push_notification_enabled';
  const btnExportJson = document.getElementById('btnExportJson');
  const importJsonFile = document.getElementById('importJsonFile');
  const btnRestoreDemoData = document.getElementById('btnRestoreDemoData');

  function setTheme(themeName, save = true) {
    const validTheme = ['dark', 'amoled', 'light'].includes(themeName) ? themeName : 'dark';
    document.documentElement.setAttribute('data-theme', validTheme);
    if (save) {
      localStorage.setItem(THEME_KEY, validTheme);
    }
    const metaThemeColor = document.getElementById('metaThemeColor');
    if (metaThemeColor) {
      if (validTheme === 'amoled') metaThemeColor.setAttribute('content', '#000000');
      else if (validTheme === 'light') metaThemeColor.setAttribute('content', '#f2f2f7');
      else metaThemeColor.setAttribute('content', '#121212');
    }
    if (settingsThemeText) {
      if (validTheme === 'amoled') settingsThemeText.textContent = '目前為 OLED純黑 模式';
      else if (validTheme === 'light') settingsThemeText.textContent = '目前為明亮淺色模式';
      else settingsThemeText.textContent = '目前為深色灰黑模式';
    }
  }

  function openSettingsModal() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (settingsThemeText) {
      if (currentTheme === 'amoled') settingsThemeText.textContent = '目前為 OLED純黑 模式';
      else if (currentTheme === 'light') settingsThemeText.textContent = '目前為明亮淺色模式';
      else settingsThemeText.textContent = '目前為深色灰黑模式';
    }
    if (toggleNotificationSwitch) {
      const hasPerm = ('Notification' in window) && Notification.permission === 'granted';
      const isUserEnabled = localStorage.getItem(PUSH_NOTIFICATION_KEY) === 'true';
      toggleNotificationSwitch.checked = hasPerm && isUserEnabled;
      if (settingsNotifyStatusText) {
        if (toggleNotificationSwitch.checked) {
          settingsNotifyStatusText.textContent = '已開啟通知提醒';
        } else if ('Notification' in window && Notification.permission === 'denied') {
          settingsNotifyStatusText.textContent = '權限已被封鎖，請於系統或瀏覽器開啟';
        } else {
          settingsNotifyStatusText.textContent = '即將到期時接收提醒';
        }
      }
    }
    updateTrashBadge();
    settingsModal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeSettingsModal() {
    closeModalWithAnimation(settingsModal);
  }

  btnOpenSettings.addEventListener('click', openSettingsModal);
  btnCloseSettings.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', function (e) {
    if (e.target === settingsModal) closeSettingsModal();
  });

  btnToggleThemeSetting.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    let next = 'dark';
    if (current === 'dark') next = 'amoled';
    else if (current === 'amoled') next = 'light';
    else next = 'dark';

    setTheme(next, true);

    if (next === 'amoled') showToast('已切換為 OLED純黑 模式');
    else if (next === 'light') showToast('已切換為明亮淺色模式');
    else showToast('已切換為深色灰黑模式');
  });

  // 最近刪除回收站彈窗監聽
  const btnOpenRecentlyDeleted = document.getElementById('btnOpenRecentlyDeleted');
  const btnCloseRecentlyDeletedModal = document.getElementById('btnCloseRecentlyDeletedModal');
  const recentlyDeletedModal = document.getElementById('recentlyDeletedModal');
  const btnRestoreAllTrash = document.getElementById('btnRestoreAllTrash');
  const btnEmptyTrash = document.getElementById('btnEmptyTrash');
  const recentlyDeletedList = document.getElementById('recentlyDeletedList');

  if (btnOpenRecentlyDeleted) {
    btnOpenRecentlyDeleted.addEventListener('click', function () {
      openRecentlyDeletedModal();
    });
  }

  if (btnCloseRecentlyDeletedModal) {
    btnCloseRecentlyDeletedModal.addEventListener('click', closeRecentlyDeletedModal);
  }

  if (recentlyDeletedModal) {
    recentlyDeletedModal.addEventListener('click', function (e) {
      if (e.target === recentlyDeletedModal) closeRecentlyDeletedModal();
    });
  }

  if (btnRestoreAllTrash) {
    btnRestoreAllTrash.addEventListener('click', restoreAllFromTrash);
  }

  if (btnEmptyTrash) {
    btnEmptyTrash.addEventListener('click', emptyTrash);
  }

  if (recentlyDeletedList) {
    recentlyDeletedList.addEventListener('click', function (e) {
      const restoreBtn = e.target.closest('.btn-restore-item');
      if (restoreBtn) {
        const id = restoreBtn.dataset.id;
        if (id) restoreItemFromTrash(id);
        return;
      }
      const deleteBtn = e.target.closest('.btn-delete-perm');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (id) permanentlyDeleteItem(id);
        return;
      }
    });
  }

  if (toggleNotificationSwitch) {
    toggleNotificationSwitch.addEventListener('change', async function () {
      if (this.checked) {
        if (!('Notification' in window)) {
          showToast('瀏覽器不支援通知');
          this.checked = false;
          return;
        }
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            localStorage.setItem(PUSH_NOTIFICATION_KEY, 'true');
            this.checked = true;
            if (settingsNotifyStatusText) settingsNotifyStatusText.textContent = '已開啟通知提醒';
            showToast('已開啟通知提醒！');
          } else {
            localStorage.setItem(PUSH_NOTIFICATION_KEY, 'false');
            this.checked = false;
            if (settingsNotifyStatusText) settingsNotifyStatusText.textContent = '未取得通知權限';
            showToast('未開啟通知權限');
          }
        } catch (e) {
          this.checked = false;
          showToast('開啟通知失敗');
        }
      } else {
        localStorage.setItem(PUSH_NOTIFICATION_KEY, 'false');
        if (settingsNotifyStatusText) settingsNotifyStatusText.textContent = '即將到期時接收提醒';
        showToast('已關閉通知提醒');
      }
    });
  }

  if (btnToggleNotification) {
    btnToggleNotification.addEventListener('click', async function () {
      if (!('Notification' in window)) {
        showToast('瀏覽器不支援通知');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('已開啟通知提醒！');
        btnToggleNotification.textContent = '已啟用';
      } else {
        showToast('未開啟通知權限');
      }
    });
  }

  // 已封存物品彈窗監聽
  const btnOpenArchive = document.getElementById('btnOpenArchive');
  const btnCloseArchiveModal = document.getElementById('btnCloseArchiveModal');
  const archiveModal = document.getElementById('archiveModal');
  const btnRestoreAllArchive = document.getElementById('btnRestoreAllArchive');
  const archiveItemsList = document.getElementById('archiveItemsList');

  if (btnOpenArchive) {
    btnOpenArchive.addEventListener('click', function () {
      openArchiveModal();
    });
  }

  if (btnCloseArchiveModal) {
    btnCloseArchiveModal.addEventListener('click', closeArchiveModal);
  }

  if (archiveModal) {
    archiveModal.addEventListener('click', function (e) {
      if (e.target === archiveModal) closeArchiveModal();
    });
  }

  if (btnRestoreAllArchive) {
    btnRestoreAllArchive.addEventListener('click', restoreAllArchive);
  }

  if (archiveItemsList) {
    archiveItemsList.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action="unarchive"]');
      if (btn) {
        const id = btn.getAttribute('data-id');
        if (id) unarchiveItem(id);
      }
    });
  }

  btnExportJson.addEventListener('click', function () {
    const backupData = {
      version: 'v10',
      exportedAt: Date.now(),
      items: items,
      archivedItems: archivedItems
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `期效管家備份_${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('備份檔案已匯出');
  });

  importJsonFile.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          items = data;
          saveItems();
          renderApp();
          closeSettingsModal();
          showToast(`已成功匯入 ${data.length} 件物品！`);
        } else if (data && Array.isArray(data.items)) {
          items = data.items;
          if (Array.isArray(data.archivedItems)) {
            archivedItems = data.archivedItems;
            saveArchivedItems(true);
          }
          saveItems();
          renderApp();
          closeSettingsModal();
          showToast(`已成功匯入 ${data.items.length} 件物品！`);
        }
      } catch (err) {
        console.error(err);
        showToast('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  btnRestoreDemoData.addEventListener('click', function () {
    if (window.confirm('確定要還原為示範資料嗎？')) {
      items = createSeedItems();
      saveItems();
      renderApp();
      closeSettingsModal();
      showToast('已重置為範例資料');
    }
  });

  // ==========================================
  // 8. 導航與篩選控制 (今天 vs 我的物品 / 全部 vs 快到了 vs 已超過)
  // ==========================================
  const dockTabToday = document.getElementById('dockTabToday');
  const dockTabInventory = document.getElementById('dockTabInventory');
  const inventorySearch = document.getElementById('inventorySearch');
  const btnClearInventorySearch = document.getElementById('btnClearInventorySearch');
  const headerMainTitle = document.getElementById('headerMainTitle');
  const headerSublabel = document.getElementById('headerSublabel');
  const statusNoticeCard = document.getElementById('statusNoticeCard');
  const segmentedPillsBar = document.getElementById('segmentedPillsBar');
  const inventoryControls = document.getElementById('inventoryControls');
  const homeSortToolbar = document.getElementById('homeSortToolbar');

  // 頂部選單按鈕（全部 / 將到期 / 已過期）點擊切換與篩選
  const homeFilterBtns = document.querySelectorAll('.home-filter-btn');
  homeFilterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      currentPillFilter = this.dataset.filter || 'all';
      homeFilterBtns.forEach(b => b.classList.toggle('active', b === btn));
      renderCards();
    });
  });

  // 提醒欄為不可點擊之純資訊卡，狀態即時同步，篩選請透過下方之按鈕群組操作
  // statusNoticeCard is non-clickable

  // 一鍵將已過期物品移至「最近刪除」
  const btnCleanExpired = document.getElementById('btnCleanExpired');
  if (btnCleanExpired) {
    btnCleanExpired.addEventListener('click', function (e) {
      e.stopPropagation();
      const expiredItems = items.filter(it => {
        const m = calculateMetrics(it);
        return m.hasEndDate && m.status === 'expired';
      });

      if (expiredItems.length === 0) {
        showToast('目前沒有已過期的物品');
        return;
      }

      const count = expiredItems.length;
      if (!window.confirm(`確定要將 ${count} 項已過期物品移至「最近刪除」嗎？\n移至最近刪除後保留 7 天，可隨時至設定中復原。`)) {
        return;
      }

      const expiredIdSet = new Set(expiredItems.map(it => it.id));
      expiredItems.forEach(item => {
        moveToRecentlyDeleted(item);
      });

      items = items.filter(it => !expiredIdSet.has(it.id));
      saveItems();
      renderApp();
      showToast(`已將 ${count} 項已過期物品移至最近刪除，保留 7 天`);
    });
  }

  // Modal 6: 自訂排序選單控制器（整合自訂順序與升降冪）
  const homeSortModal = document.getElementById('homeSortModal');
  const btnOpenCustomSort = document.getElementById('btnOpenCustomSort');
  const btnCloseHomeSortModal = document.getElementById('btnCloseHomeSortModal');
  const btnApplyCustomSort = document.getElementById('btnApplyCustomSort');
  const sortOptionCards = document.querySelectorAll('.sort-option-card');
  let tempSelectedSortMode = currentSortMode;

  function renderCustomOrderList() {
    const listEl = document.getElementById('customOrderItemsList');
    if (!listEl) return;
    listEl.innerHTML = '';
    const order = getCustomItemOrder();

    order.forEach((id, index) => {
      const item = items.find(it => it.id === id);
      if (!item) return;

      const row = document.createElement('div');
      row.className = 'order-item-row';
      row.dataset.id = item.id;

      const rankStr = String(index + 1).padStart(2, '0');
      const isFirst = index === 0;
      const isLast = index === order.length - 1;

      row.innerHTML = `
        <div class="order-item-left">
          <span class="order-rank-badge">${rankStr}</span>
          <span class="order-item-title">${escapeHtml(item.name)}</span>
        </div>
        <div class="order-item-actions">
          <button type="button" class="btn-move-order btn-move-up" data-id="${item.id}" ${isFirst ? 'disabled' : ''} title="上移">▲</button>
          <button type="button" class="btn-move-order btn-move-down" data-id="${item.id}" ${isLast ? 'disabled' : ''} title="下移">▼</button>
        </div>
      `;

      listEl.appendChild(row);
    });

    // 綁定上移與下移按鈕事件
    listEl.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const itemId = this.dataset.id;
        const curOrder = getCustomItemOrder();
        const idx = curOrder.indexOf(itemId);
        if (idx > 0) {
          const temp = curOrder[idx];
          curOrder[idx] = curOrder[idx - 1];
          curOrder[idx - 1] = temp;
          saveCustomItemOrder(curOrder);
          renderCustomOrderList();
          if (currentSortMode === 'custom') renderCards();
        }
      });
    });

    listEl.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const itemId = this.dataset.id;
        const curOrder = getCustomItemOrder();
        const idx = curOrder.indexOf(itemId);
        if (idx !== -1 && idx < curOrder.length - 1) {
          const temp = curOrder[idx];
          curOrder[idx] = curOrder[idx + 1];
          curOrder[idx + 1] = temp;
          saveCustomItemOrder(curOrder);
          renderCustomOrderList();
          if (currentSortMode === 'custom') renderCards();
        }
      });
    });
  }

  function openHomeSortModal() {
    if (!homeSortModal) return;
    tempSelectedSortMode = currentSortMode;
    sortOptionCards.forEach(card => {
      card.classList.toggle('active', card.dataset.sort === tempSelectedSortMode);
    });
    const customSection = document.getElementById('customOrderSection');
    if (customSection) {
      customSection.style.display = tempSelectedSortMode === 'custom' ? 'block' : 'none';
    }
    if (tempSelectedSortMode === 'custom') {
      renderCustomOrderList();
    }
    homeSortModal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeHomeSortModal() {
    closeModalWithAnimation(homeSortModal);
  }

  if (btnOpenCustomSort) {
    btnOpenCustomSort.addEventListener('click', openHomeSortModal);
  }
  if (btnCloseHomeSortModal) {
    btnCloseHomeSortModal.addEventListener('click', closeHomeSortModal);
  }
  if (homeSortModal) {
    homeSortModal.addEventListener('click', function (e) {
      if (e.target === homeSortModal) closeHomeSortModal();
    });
  }

  const SORT_LABEL_MAP = {
    custom: '自訂義順序',
    expiry_asc: '到期日 升冪',
    expiry_desc: '到期日 降冪',
    created_desc: '加入時間 降冪',
    created_asc: '加入時間 升冪'
  };

  sortOptionCards.forEach(card => {
    card.addEventListener('click', function () {
      const selected = this.dataset.sort;
      currentSortMode = selected;
      localStorage.setItem(HOME_SORT_KEY, currentSortMode);
      sortOptionCards.forEach(c => c.classList.toggle('active', c === card));

      const sortPillLabel = document.getElementById('sortPillLabel');
      if (sortPillLabel) {
        sortPillLabel.textContent = SORT_LABEL_MAP[currentSortMode] || '到期日 升冪';
      }
      const inventorySortPillLabel = document.getElementById('inventorySortPillLabel');
      if (inventorySortPillLabel) {
        inventorySortPillLabel.textContent = SORT_LABEL_MAP[currentSortMode] || '到期日 升冪';
      }

      const customSection = document.getElementById('customOrderSection');
      if (customSection) {
        if (selected === 'custom') {
          customSection.style.display = 'block';
          renderCustomOrderList();
          renderCards();
          showToast('已切換為自訂義順序，可點擊箭頭微調物品排列');
        } else {
          customSection.style.display = 'none';
          renderCards();
          showToast(`已套用排序：${SORT_LABEL_MAP[currentSortMode]}`);
          setTimeout(closeHomeSortModal, 220);
        }
      }
    });
  });

  const btnOpenInventorySort = document.getElementById('btnOpenInventorySort');
  if (btnOpenInventorySort) {
    btnOpenInventorySort.addEventListener('click', openHomeSortModal);
  }

  // ==========================================
  // 主頁與物品分類 滑動切換控制器 (Views Slider Controller)
  // ==========================================
  const viewsSliderTrack = document.getElementById('viewsSliderTrack');
  const viewsSliderViewport = document.getElementById('viewsSliderViewport');
  const viewPanelToday = document.getElementById('viewPanelToday');
  const viewPanelInventory = document.getElementById('viewPanelInventory');
  let panelSwitchSettleTimer = null;

  function setPanelsSwipingState(swiping) {
    if (viewsSliderViewport) {
      if (swiping) {
        viewsSliderViewport.classList.add('is-swiping');
      } else {
        viewsSliderViewport.classList.remove('is-swiping');
      }
    }
    if (swiping) {
      if (viewPanelToday) viewPanelToday.style.visibility = 'visible';
      if (viewPanelInventory) viewPanelInventory.style.visibility = 'visible';
    }
  }

  function setActivePanel(tab) {
    const isToday = (tab === 'today');
    if (viewPanelToday) {
      if (isToday) {
        viewPanelToday.classList.add('active-panel');
        viewPanelToday.style.visibility = 'visible';
      } else {
        viewPanelToday.classList.remove('active-panel');
        viewPanelToday.style.visibility = 'hidden';
      }
    }
    if (viewPanelInventory) {
      if (!isToday) {
        viewPanelInventory.classList.add('active-panel');
        viewPanelInventory.style.visibility = 'visible';
      } else {
        viewPanelInventory.classList.remove('active-panel');
        viewPanelInventory.style.visibility = 'hidden';
      }
    }
  }

  function triggerDockSwitchEffect(activeTab) {
    const navDock = document.querySelector('.floating-island-dock');
    if (!navDock) return;
    navDock.classList.remove('dock-hidden');
    navDock.classList.remove('dock-switching');
    void navDock.offsetWidth;
    navDock.classList.add('dock-switching');
    setTimeout(() => {
      if (navDock) navDock.classList.remove('dock-switching');
    }, 420);

    const targetTabEl = (activeTab === 'today') ? dockTabToday : dockTabInventory;
    if (targetTabEl) {
      targetTabEl.classList.remove('tab-switching-pop');
      void targetTabEl.offsetWidth;
      targetTabEl.classList.add('tab-switching-pop');
      setTimeout(() => {
        targetTabEl.classList.remove('tab-switching-pop');
      }, 400);
    }
  }

  function switchViewTab(tab, smooth = true) {
    currentNavTab = tab;
    // 切換頁面時使畫面保持在頂部
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const iosMain = document.querySelector('.ios-main');
    if (iosMain) iosMain.scrollTop = 0;
    triggerDockSwitchEffect(tab);

    // 開始滑動/切換：立即喚醒所有面板確保滑動視覺完整
    setPanelsSwipingState(true);
    clearTimeout(panelSwitchSettleTimer);

    if (viewsSliderViewport) {
      const targetLeft = (tab === 'today') ? 0 : viewsSliderViewport.clientWidth;
      viewsSliderViewport.scrollTo({
        left: targetLeft,
        behavior: smooth ? 'smooth' : 'instant'
      });
    }

    if (smooth) {
      panelSwitchSettleTimer = setTimeout(() => {
        setPanelsSwipingState(false);
        setActivePanel(tab);
      }, 300);
    } else {
      setPanelsSwipingState(false);
      setActivePanel(tab);
    }

    if (tab === 'today') {
      dockTabToday.classList.add('active');
      dockTabInventory.classList.remove('active');
      if (headerSublabel) headerSublabel.textContent = '主頁';
      if (headerMainTitle) headerMainTitle.textContent = '期效管家';
    } else {
      dockTabToday.classList.remove('active');
      dockTabInventory.classList.add('active');
      if (headerSublabel) headerSublabel.textContent = '物品分類';
      if (headerMainTitle) headerMainTitle.textContent = '分類清單';
      const rememberedCat = getRememberedCategoryState();
      if (rememberedCat) {
        currentCategoryChip = rememberedCat;
      } else {
        currentCategoryChip = getFirstPageCategory();
        rememberCategoryState(currentCategoryChip);
      }
      renderCategoryChips();
      updateCategoryActionBar();
    }
    renderApp();
  }

  dockTabToday.addEventListener('click', function () {
    switchViewTab('today', true);
  });

  dockTabInventory.addEventListener('click', function () {
    switchViewTab('inventory', true);
  });

  // 動態渲染分類膠囊標籤, 第一個群組預設在最左側, 支援群組狀態記憶與平滑對齊
  function renderCategoryChips() {
    const categoryChipRow = document.getElementById('categoryChipRow');
    const chipRow = categoryChipRow;
    if (!categoryChipRow) return;

    categoryChipRow.innerHTML = '';
    const allCats = getAllCategories();
    const catKeys = Object.keys(allCats);
    const firstPageCat = getFirstPageCategory();

    // 優先採用自訂分類排序
    let orderedKeys = getCustomCategoryOrder();
    if (!orderedKeys || !Array.isArray(orderedKeys) || orderedKeys.length === 0) {
      orderedKeys = [firstPageCat, ...catKeys.filter(k => k !== firstPageCat)];
    } else {
      orderedKeys = orderedKeys.filter(k => allCats[k]);
      catKeys.forEach(k => {
        if (!orderedKeys.includes(k)) orderedKeys.push(k);
      });
    }

    const rememberedCat = getRememberedCategoryState();
    if (rememberedCat && allCats[rememberedCat]) {
      currentCategoryChip = rememberedCat;
    } else if (currentCategoryChip === 'all' || !allCats[currentCategoryChip]) {
      currentCategoryChip = orderedKeys[0] || firstPageCat;
    }

    orderedKeys.forEach((catKey, chipIdx) => {
      const cat = allCats[catKey];
      const btn = document.createElement('button');
      btn.className = `category-chip ${catKey === currentCategoryChip ? 'active' : ''}`;
      btn.dataset.cat = catKey;
      btn.textContent = `${cat.emoji} ${cat.label}`;
      btn.addEventListener('click', function () {
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentCategoryChip = this.dataset.cat;
        rememberCategoryState(currentCategoryChip);
        if (chipIdx === 0) {
          categoryChipRow.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          const targetLeft = Math.max(0, this.getBoundingClientRect().left - categoryChipRow.getBoundingClientRect().left + categoryChipRow.scrollLeft);
          categoryChipRow.scrollTo({ left: targetLeft, behavior: 'smooth' });
        }
        updateCategoryActionBar();
        renderCards();
      });
      categoryChipRow.appendChild(btn);
    });

    updateCategoryActionBar();

    // 僅在當前視圖為物品分類時移動膠囊, 點擊或記憶之群組自動靠左對齊
    if (currentNavTab === 'inventory') {
      setTimeout(() => {
        const activeChip = categoryChipRow.querySelector('.category-chip.active');
        if (activeChip) {
          if (activeChip === categoryChipRow.firstElementChild) {
            categoryChipRow.scrollTo({ left: 0, behavior: 'instant' });
          } else {
            const targetLeft = Math.max(0, activeChip.getBoundingClientRect().left - categoryChipRow.getBoundingClientRect().left + categoryChipRow.scrollLeft);
            categoryChipRow.scrollTo({ left: targetLeft, behavior: 'smooth' });
          }
        }
      }, 30);
    }
  }

  // 支援左右滑鼠拖移 / 觸控平滑滑動
  const categoryChipRow = document.getElementById('categoryChipRow');
  if (categoryChipRow) {
    let isChipRowDown = false;
    let chipRowStartX = 0;
    let chipRowScrollLeft = 0;
    let chipRowMoved = false;

    categoryChipRow.addEventListener('mousedown', (e) => {
      isChipRowDown = true;
      chipRowMoved = false;
      chipRowStartX = e.pageX - categoryChipRow.offsetLeft;
      chipRowScrollLeft = categoryChipRow.scrollLeft;
    });

    categoryChipRow.addEventListener('mouseleave', () => {
      isChipRowDown = false;
    });

    categoryChipRow.addEventListener('mouseup', () => {
      isChipRowDown = false;
    });

    categoryChipRow.addEventListener('mousemove', (e) => {
      if (!isChipRowDown) return;
      const x = e.pageX - categoryChipRow.offsetLeft;
      const walk = x - chipRowStartX;
      if (Math.abs(walk) > 4) {
        chipRowMoved = true;
        categoryChipRow.scrollLeft = chipRowScrollLeft - walk;
      }
    });

    categoryChipRow.addEventListener('click', (e) => {
      if (chipRowMoved) {
        e.stopImmediatePropagation();
        e.preventDefault();
        chipRowMoved = false;
      }
    }, true);
  }

  // ==========================================
  // 自訂分類項目 Modal 控制器 (Custom Category Modal)
  // ==========================================
  const customCategoryModal = document.getElementById('customCategoryModal');
  const btnCloseCustomCategoryModal = document.getElementById('btnCloseCustomCategoryModal');
  const firstPageCategorySelect = document.getElementById('firstPageCategorySelect');
  const newCatNameInput = document.getElementById('newCatName');
  const newCatEmojiInput = document.getElementById('newCatEmoji');
  const newCatSubItemsInput = document.getElementById('newCatSubItems');
  const btnSaveNewCategory = document.getElementById('btnSaveNewCategory');
  const categoryManageList = document.getElementById('categoryManageList');
  const emojiQuickPills = document.getElementById('emojiQuickPills');

  function populateFirstPageCategorySelect() {
    if (!firstPageCategorySelect) return;
    firstPageCategorySelect.innerHTML = '';
    const allCats = getAllCategories();
    const currentFirst = getFirstPageCategory();

    Object.keys(allCats).forEach(catKey => {
      const cat = allCats[catKey];
      const opt = document.createElement('option');
      opt.value = catKey;
      opt.textContent = `${cat.emoji} ${cat.label}`;
      if (catKey === currentFirst) {
        opt.selected = true;
      }
      firstPageCategorySelect.appendChild(opt);
    });
  }

  if (firstPageCategorySelect) {
    firstPageCategorySelect.addEventListener('change', function () {
      setFirstPageCategory(this.value);
    });
  }

  // ==========================================
  // 分類操作列與自由加入物品至分類控制器
  // ==========================================
  const categoryActionBar = document.getElementById('categoryActionBar');
  const catActiveEmoji = document.getElementById('catActiveEmoji');
  const catActiveName = document.getElementById('catActiveName');
  const catActiveCount = document.getElementById('catActiveCount');
  const btnAddItemsToCurrentCategory = document.getElementById('btnAddItemsToCurrentCategory');
  const btnEmptyAddItemsToCat = document.getElementById('btnEmptyAddItemsToCat');

  const addItemsToCategoryModal = document.getElementById('addItemsToCategoryModal');
  const btnCloseAddItemsToCategoryModal = document.getElementById('btnCloseAddItemsToCategoryModal');
  const addItemsToCategoryModalTitle = document.getElementById('addItemsToCategoryModalTitle');
  const catItemsPickerList = document.getElementById('catItemsPickerList');
  const btnSelectAllItemsForCat = document.getElementById('btnSelectAllItemsForCat');
  const btnClearAllItemsForCat = document.getElementById('btnClearAllItemsForCat');
  const btnConfirmAddItemsToCategory = document.getElementById('btnConfirmAddItemsToCategory');
  const newCatItemsPickerList = document.getElementById('newCatItemsPickerList');

  function updateCategoryActionBar() {
    const allCats = getAllCategories();
    const catObj = allCats[currentCategoryChip] || { emoji: '📌', label: '其他' };
    const countInCat = items.filter(it => it.category === currentCategoryChip).length;
    if (catActiveEmoji) catActiveEmoji.textContent = catObj.emoji;
    if (catActiveName) catActiveName.textContent = `${catObj.label}群組`;
    if (catActiveCount) catActiveCount.textContent = `${countInCat} 項物品`;
  }

  function renderItemsPicker(containerEl, targetCatId, isNewCat = false) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    const allCats = getAllCategories();

    if (items.length === 0) {
      containerEl.innerHTML = '<div style="text-align:center; padding: 1rem; color: var(--ios-text-secondary); font-size: 0.9rem;">目前沒有任何物品可加入</div>';
      return;
    }

    items.forEach(item => {
      const isSelected = !isNewCat && item.category === targetCatId;
      const row = document.createElement('div');
      row.className = `picker-item-row ${isSelected ? 'selected' : ''}`;
      row.dataset.id = item.id;

      let thumbHtml = '';
      if (item.image) {
        thumbHtml = `<img src="${item.image}" alt="${escapeHtml(item.name)}">`;
      } else {
        thumbHtml = item.emoji || '🪑';
      }

      const catObj = allCats[item.category] || { label: '其他' };

      row.innerHTML = `
        <div class="picker-checkbox">${isSelected ? '✓' : ''}</div>
        <div class="picker-item-thumb">${thumbHtml}</div>
        <div class="picker-item-info">
          <div class="picker-item-name">${escapeHtml(item.name)}</div>
          <div class="picker-item-meta">
            <span class="picker-cat-tag">${catObj.label}</span>
            <span>${escapeHtml(item.subCat || '')}</span>
          </div>
        </div>
      `;

      row.addEventListener('click', function () {
        const selected = this.classList.toggle('selected');
        const box = this.querySelector('.picker-checkbox');
        if (box) box.textContent = selected ? '✓' : '';
      });

      containerEl.appendChild(row);
    });
  }

  function openAddItemsToCategoryModal() {
    if (!addItemsToCategoryModal) return;
    const allCats = getAllCategories();
    const catObj = allCats[currentCategoryChip] || { emoji: '📌', label: '其他' };
    if (addItemsToCategoryModalTitle) {
      addItemsToCategoryModalTitle.textContent = `加入物品至「${catObj.label}」`;
    }
    renderItemsPicker(catItemsPickerList, currentCategoryChip, false);
    addItemsToCategoryModal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeAddItemsToCategoryModal() {
    closeModalWithAnimation(addItemsToCategoryModal);
  }

  if (btnAddItemsToCurrentCategory) {
    btnAddItemsToCurrentCategory.addEventListener('click', openAddItemsToCategoryModal);
  }
  if (btnEmptyAddItemsToCat) {
    btnEmptyAddItemsToCat.addEventListener('click', openAddItemsToCategoryModal);
  }
  if (btnCloseAddItemsToCategoryModal) {
    btnCloseAddItemsToCategoryModal.addEventListener('click', closeAddItemsToCategoryModal);
  }
  if (addItemsToCategoryModal) {
    addItemsToCategoryModal.addEventListener('click', function (e) {
      if (e.target === addItemsToCategoryModal) closeAddItemsToCategoryModal();
    });
  }

  if (btnSelectAllItemsForCat) {
    btnSelectAllItemsForCat.addEventListener('click', function () {
      if (!catItemsPickerList) return;
      catItemsPickerList.querySelectorAll('.picker-item-row').forEach(r => {
        r.classList.add('selected');
        const box = r.querySelector('.picker-checkbox');
        if (box) box.textContent = '✓';
      });
    });
  }

  if (btnClearAllItemsForCat) {
    btnClearAllItemsForCat.addEventListener('click', function () {
      if (!catItemsPickerList) return;
      catItemsPickerList.querySelectorAll('.picker-item-row').forEach(r => {
        r.classList.remove('selected');
        const box = r.querySelector('.picker-checkbox');
        if (box) box.textContent = '';
      });
    });
  }

  if (btnConfirmAddItemsToCategory) {
    btnConfirmAddItemsToCategory.addEventListener('click', function () {
      if (!catItemsPickerList) return;
      const selectedRows = catItemsPickerList.querySelectorAll('.picker-item-row.selected');
      const selectedIds = new Set(Array.from(selectedRows).map(r => r.dataset.id));
      const allCats = getAllCategories();
      const catObj = allCats[currentCategoryChip] || { label: '其他' };

      items.forEach(it => {
        if (selectedIds.has(it.id)) {
          it.category = currentCategoryChip;
        } else if (it.category === currentCategoryChip) {
          it.category = 'other';
        }
      });

      saveItems();
      closeAddItemsToCategoryModal();
      updateCategoryActionBar();
      renderCategoryChips();
      renderCards();
      showToast(`已成功更新「${catObj.label}」收納物品清單！`);
    });
  }

  function openCustomCategoryModal() {
    if (!customCategoryModal) return;
    loadCustomCategories();
    if (newCatNameInput) newCatNameInput.value = '';
    if (newCatEmojiInput) newCatEmojiInput.value = '🏷️';
    if (newCatSubItemsInput) newCatSubItemsInput.value = '';
    populateFirstPageCategorySelect();
    renderItemsPicker(newCatItemsPickerList, '', true);
    renderCategoryManageList();
    customCategoryModal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeCustomCategoryModal() {
    closeModalWithAnimation(customCategoryModal);
  }

  const btnOpenGroupSettings = document.getElementById('btnOpenGroupSettings');
  if (btnOpenGroupSettings) {
    btnOpenGroupSettings.addEventListener('click', openCustomCategoryModal);
  }

  if (btnCloseCustomCategoryModal) {
    btnCloseCustomCategoryModal.addEventListener('click', closeCustomCategoryModal);
  }
  if (customCategoryModal) {
    customCategoryModal.addEventListener('click', function (e) {
      if (e.target === customCategoryModal) closeCustomCategoryModal();
    });
  }

  if (emojiQuickPills) {
    emojiQuickPills.addEventListener('click', function (e) {
      const btn = e.target.closest('.quick-emoji-btn');
      if (btn && newCatEmojiInput) {
        newCatEmojiInput.value = btn.dataset.emoji || btn.textContent.trim();
      }
    });
  }

  if (btnSaveNewCategory) {
    btnSaveNewCategory.addEventListener('click', function () {
      const name = newCatNameInput ? newCatNameInput.value.trim() : '';
      if (!name) {
        showToast('請輸入群組名稱！');
        if (newCatNameInput) newCatNameInput.focus();
        return;
      }

      const emoji = (newCatEmojiInput && newCatEmojiInput.value.trim()) || '🏷️';
      const subItemsRaw = newCatSubItemsInput ? newCatSubItemsInput.value.trim() : '';

      const subItemList = [];
      if (subItemsRaw) {
        subItemsRaw.split(/[,，\n]+/).forEach(s => {
          const itemText = s.trim();
          if (itemText) {
            subItemList.push({
              name: itemText,
              subCat: itemText,
              emoji: emoji,
              duration: 180,
              hasEndDate: true,
              warnDays: 14
            });
          }
        });
      }

      const catId = 'custom_' + Date.now();
      const customCats = loadCustomCategories();
      customCats[catId] = {
        label: name,
        emoji: emoji,
        isCustom: true,
        items: subItemList
      };
      saveCustomCategories(customCats);

      // 同步將勾選的現有物品加入此新群組
      if (newCatItemsPickerList) {
        const checkedRows = newCatItemsPickerList.querySelectorAll('.picker-item-row.selected');
        const checkedIds = Array.from(checkedRows).map(r => r.dataset.id);
        if (checkedIds.length > 0) {
          items.forEach(it => {
            if (checkedIds.includes(it.id)) {
              it.category = catId;
            }
          });
          saveItems();
        }
      }

      // 將新群組加入自訂群組順序
      const curOrder = getCustomCategoryOrder();
      if (curOrder && Array.isArray(curOrder)) {
        curOrder.push(catId);
        saveCustomCategoryOrder(curOrder);
      }

      currentCategoryChip = catId;
      renderCategoryChips();
      populateCategorySelect(catId);
      populateFirstPageCategorySelect();
      renderCategoryManageList();
      closeCustomCategoryModal();
      if (currentNavTab === 'inventory') {
        renderCards();
      }

      if (newCatNameInput) newCatNameInput.value = '';
      if (newCatSubItemsInput) newCatSubItemsInput.value = '';

      showToast(`🎉 已成功新增「${name}」自訂群組！`);
    });
  }

  function renderCategoryManageList() {
    if (!categoryManageList) return;
    categoryManageList.innerHTML = '';
    const allCats = getAllCategories();
    const firstPageKey = getFirstPageCategory();
    const catKeys = Object.keys(allCats);

    // 優先採用自訂群組排序
    let orderedKeys = getCustomCategoryOrder();
    if (!orderedKeys || !Array.isArray(orderedKeys) || orderedKeys.length === 0) {
      orderedKeys = [firstPageKey, ...catKeys.filter(k => k !== firstPageKey)];
    } else {
      orderedKeys = orderedKeys.filter(k => allCats[k]);
      catKeys.forEach(k => {
        if (!orderedKeys.includes(k)) orderedKeys.push(k);
      });
    }

    orderedKeys.forEach((key, idx) => {
      const cat = allCats[key];
      const itemEl = document.createElement('div');
      itemEl.className = 'cat-manage-item';

      const isPreset = !!cat.isPreset;
      const subCount = cat.items ? cat.items.length : 0;
      const isFirstPage = key === firstPageKey;
      const isFirst = idx === 0;
      const isLast = idx === orderedKeys.length - 1;
      const pageName = PAGE_NAMES[idx] || `第 ${idx + 1} 頁`;

      // 構建第一頁到第二十頁下拉選項
      let pageOptions = '';
      const totalPagesToShow = Math.min(20, Math.max(orderedKeys.length, 20));
      for (let p = 0; p < totalPagesToShow; p++) {
        const pLabel = PAGE_NAMES[p] || `第 ${p + 1} 頁`;
        pageOptions += `<option value="${p}" ${p === idx ? 'selected' : ''}>${pLabel}</option>`;
      }

      itemEl.innerHTML = `
        <div class="cat-manage-info">
          <div class="cat-manage-title-wrap">
            <span class="cat-manage-emoji">${cat.emoji}</span>
            <span class="group-page-badge">${pageName}</span>
            <span class="cat-manage-label" title="${escapeHtml(cat.label)}">${escapeHtml(cat.label)}</span>
            ${isPreset ? `<span class="cat-badge-default" style="font-size:0.7rem;padding:0.15rem 0.4rem;">預設</span>` : ''}
          </div>
          <span class="cat-manage-subcount">${subCount} 項細項</span>
        </div>
        <div class="cat-actions-group">
          <div class="cat-actions-left">
            <div class="group-page-select-wrap" title="快速指定頁面">
              <select class="group-page-select" data-cat-id="${key}">
                ${pageOptions}
              </select>
              <span class="select-arrow">▾</span>
            </div>
            <div class="cat-order-btn-group">
              <button type="button" class="btn-cat-order btn-cat-up" data-cat-id="${key}" ${isFirst ? 'disabled' : ''} title="群組順序上移一頁">▲</button>
              <button type="button" class="btn-cat-order btn-cat-down" data-cat-id="${key}" ${isLast ? 'disabled' : ''} title="群組順序下移一頁">▼</button>
            </div>
          </div>
          <div class="cat-actions-right">
            ${isFirstPage 
              ? `<span class="badge-first-page">⭐️ 第一頁預設</span>` 
              : `<button type="button" class="btn-set-first-page" data-cat-id="${key}">設為第一頁</button>`}
            <button type="button" class="btn-edit-cat" data-cat-id="${key}" title="編輯此群組名稱、圖示與細項">✏️ 編輯</button>
            <button type="button" class="btn-delete-custom-cat" data-cat-id="${key}" title="刪除此群組">🗑️ 刪除</button>
          </div>
        </div>
      `;

      categoryManageList.appendChild(itemEl);
    });

    // 綁定頁面下拉快速指定事件
    categoryManageList.querySelectorAll('.group-page-select').forEach(sel => {
      sel.addEventListener('change', function () {
        const key = this.dataset.catId;
        const targetIdx = parseInt(this.value, 10);
        const keys = [...orderedKeys];
        const fromIdx = keys.indexOf(key);
        if (fromIdx !== -1 && fromIdx !== targetIdx && targetIdx < keys.length) {
          keys.splice(fromIdx, 1);
          keys.splice(targetIdx, 0, key);
          saveCustomCategoryOrder(keys);
          if (targetIdx === 0) {
            setFirstPageCategory(key);
          }
          renderCategoryManageList();
          renderCategoryChips();
          renderCards();
          const targetName = PAGE_NAMES[targetIdx] || `第 ${targetIdx + 1} 頁`;
          showToast(`已將群組指定為 ${targetName}`);
        }
      });
    });

    // 綁定群組上移一頁與下移一頁事件
    categoryManageList.querySelectorAll('.btn-cat-up').forEach(btn => {
      btn.addEventListener('click', function () {
        const key = this.dataset.catId;
        const keys = [...orderedKeys];
        const idx = keys.indexOf(key);
        if (idx > 0) {
          const temp = keys[idx];
          keys[idx] = keys[idx - 1];
          keys[idx - 1] = temp;
          saveCustomCategoryOrder(keys);
          if (idx - 1 === 0) {
            setFirstPageCategory(key);
          }
          renderCategoryManageList();
          renderCategoryChips();
          renderCards();
          const pName = PAGE_NAMES[idx - 1] || `第 ${idx} 頁`;
          showToast(`已上移至 ${pName}`);
        }
      });
    });

    categoryManageList.querySelectorAll('.btn-cat-down').forEach(btn => {
      btn.addEventListener('click', function () {
        const key = this.dataset.catId;
        const keys = [...orderedKeys];
        const idx = keys.indexOf(key);
        if (idx !== -1 && idx < keys.length - 1) {
          const temp = keys[idx];
          keys[idx] = keys[idx + 1];
          keys[idx + 1] = temp;
          saveCustomCategoryOrder(keys);
          renderCategoryManageList();
          renderCategoryChips();
          renderCards();
          const pName = PAGE_NAMES[idx + 1] || `第 ${idx + 2} 頁`;
          showToast(`已下移至 ${pName}`);
        }
      });
    });

    categoryManageList.querySelectorAll('.btn-set-first-page').forEach(btn => {
      btn.addEventListener('click', function () {
        const key = this.dataset.catId;
        const keys = [...orderedKeys];
        const idx = keys.indexOf(key);
        if (idx > 0) {
          keys.splice(idx, 1);
          keys.unshift(key);
          saveCustomCategoryOrder(keys);
        }
        setFirstPageCategory(key);
        renderCategoryManageList();
        renderCategoryChips();
        renderCards();
        showToast('已設為第一頁預設群組');
      });
    });

    // 綁定編輯群組按鈕
    categoryManageList.querySelectorAll('.btn-edit-cat').forEach(btn => {
      btn.addEventListener('click', function () {
        const catId = this.dataset.catId;
        openEditCategoryModal(catId);
      });
    });

    // 綁定刪除群組按鈕 (支援預設群組與自訂群組刪除)
    categoryManageList.querySelectorAll('.btn-delete-custom-cat').forEach(btn => {
      btn.addEventListener('click', function () {
        const catId = this.dataset.catId;
        deleteCategory(catId);
      });
    });
  }

  // 刪除群組 (可刪除預設群組與自訂群組)
  function deleteCategory(catId) {
    const allCats = getAllCategories();
    const cat = allCats[catId];
    if (!cat) return;
    const catKeys = Object.keys(allCats);
    if (catKeys.length <= 1) {
      alert('請至少保留一個群組！');
      return;
    }

    const catName = cat.label;
    if (!confirm(`確定要刪除群組「${catName}」嗎？若該群組內有物品，將自動移至其他群組。`)) {
      return;
    }

    // 尋找接替物品的備用群組 (優先 other, 否則第一個非當前群組)
    let fallbackCat = 'other';
    if (catId === 'other' || !allCats['other']) {
      fallbackCat = catKeys.find(k => k !== catId) || '';
    }

    if (cat.isPreset || DEFAULT_CATEGORIES[catId]) {
      // 記錄至已刪除預設清單
      const deletedPresets = loadDeletedPresets();
      if (!deletedPresets.includes(catId)) {
        deletedPresets.push(catId);
        saveDeletedPresets(deletedPresets);
      }
      const overrides = loadPresetOverrides();
      if (overrides[catId]) {
        delete overrides[catId];
        savePresetOverrides(overrides);
      }
    } else {
      // 自訂群組刪除
      const customCats = loadCustomCategories();
      delete customCats[catId];
      saveCustomCategories(customCats);
    }

    // 遷移該分類物品
    let itemsUpdated = false;
    items.forEach(it => {
      if (it.category === catId) {
        it.category = fallbackCat;
        itemsUpdated = true;
      }
    });
    if (itemsUpdated) saveItems();

    // 更新自訂順序
    const curOrder = getCustomCategoryOrder();
    if (curOrder && Array.isArray(curOrder)) {
      const newOrder = curOrder.filter(k => k !== catId);
      saveCustomCategoryOrder(newOrder);
    }

    // 重設首頁預設分類
    if (getFirstPageCategory() === catId) {
      localStorage.removeItem(FIRST_PAGE_CAT_KEY);
      const remainingCats = getAllCategories();
      const remainingKeys = Object.keys(remainingCats);
      if (remainingKeys.length > 0) {
        localStorage.setItem(FIRST_PAGE_CAT_KEY, remainingKeys[0]);
      }
    }

    if (currentCategoryChip === catId || sessionCategoryMemory === catId) {
      sessionCategoryMemory = null;
      try {
        sessionStorage.removeItem(SESSION_CATEGORY_KEY);
      } catch (e) {}
      currentCategoryChip = getFirstPageCategory();
    }

    renderCategoryChips();
    populateCategorySelect();
    populateFirstPageCategorySelect();
    renderCategoryManageList();
    renderCards();
    showToast(`已刪除「${catName}」群組`);
  }

  // 還原所有系統預設群組
  function resetDefaultCategories() {
    if (!confirm('確定要還原所有預設群組嗎？這將會復原被刪除的預設群組並重設為初始名稱與細項。自訂新增的群組將會保留。')) {
      return;
    }

    saveDeletedPresets([]);
    savePresetOverrides({});
    sessionCategoryMemory = null;
    try {
      sessionStorage.removeItem(SESSION_CATEGORY_KEY);
    } catch (e) {}

    renderCategoryChips();
    populateCategorySelect();
    populateFirstPageCategorySelect();
    renderCategoryManageList();
    renderCards();
    showToast('↺ 已成功還原所有預設群組！');
  }

  const btnResetDefaultCategories = document.getElementById('btnResetDefaultCategories');
  if (btnResetDefaultCategories) {
    btnResetDefaultCategories.addEventListener('click', resetDefaultCategories);
  }

  // ==========================================
  // Modal 9: 編輯群組資訊 (Edit Category Modal)
  // ==========================================
  const editCategoryModal = document.getElementById('editCategoryModal');
  const editCategoryModalTitle = document.getElementById('editCategoryModalTitle');
  const btnCloseEditCategoryModal = document.getElementById('btnCloseEditCategoryModal');
  const editCatId = document.getElementById('editCatId');
  const editCatName = document.getElementById('editCatName');
  const editCatEmoji = document.getElementById('editCatEmoji');
  const editEmojiQuickPills = document.getElementById('editEmojiQuickPills');
  const editCatSubItems = document.getElementById('editCatSubItems');
  const btnCancelEditCategory = document.getElementById('btnCancelEditCategory');
  const btnSaveEditCategory = document.getElementById('btnSaveEditCategory');

  function openEditCategoryModal(catId) {
    const allCats = getAllCategories();
    const cat = allCats[catId];
    if (!cat || !editCategoryModal) return;

    if (editCatId) editCatId.value = catId;
    if (editCatName) editCatName.value = cat.label || '';
    if (editCatEmoji) editCatEmoji.value = cat.emoji || '🏷️';

    let subItemNames = [];
    if (cat.items && Array.isArray(cat.items)) {
      subItemNames = cat.items.map(it => it.subCat || it.name).filter(Boolean);
    }
    if (editCatSubItems) editCatSubItems.value = subItemNames.join(', ');

    if (editCategoryModalTitle) {
      editCategoryModalTitle.textContent = `編輯「${cat.label}」群組`;
    }

    editCategoryModal.style.display = 'flex';
    lockBodyScroll();
  }

  function closeEditCategoryModal() {
    closeModalWithAnimation(editCategoryModal);
  }

  if (btnCloseEditCategoryModal) {
    btnCloseEditCategoryModal.addEventListener('click', closeEditCategoryModal);
  }
  if (btnCancelEditCategory) {
    btnCancelEditCategory.addEventListener('click', closeEditCategoryModal);
  }
  if (editCategoryModal) {
    editCategoryModal.addEventListener('click', function (e) {
      if (e.target === editCategoryModal) closeEditCategoryModal();
    });
  }

  if (editEmojiQuickPills && editCatEmoji) {
    editEmojiQuickPills.addEventListener('click', function (e) {
      const btn = e.target.closest('.quick-emoji-btn');
      if (btn && btn.dataset.emoji) {
        editCatEmoji.value = btn.dataset.emoji;
      }
    });
  }

  if (btnSaveEditCategory) {
    btnSaveEditCategory.addEventListener('click', function () {
      const catId = editCatId ? editCatId.value : '';
      const allCats = getAllCategories();
      const cat = allCats[catId];
      if (!catId || !cat) return;

      const newName = editCatName ? editCatName.value.trim() : '';
      if (!newName) {
        showToast('請輸入群組名稱！');
        if (editCatName) editCatName.focus();
        return;
      }

      const newEmoji = (editCatEmoji && editCatEmoji.value.trim()) || '🏷️';
      const subItemsRaw = editCatSubItems ? editCatSubItems.value.trim() : '';

      const subItemList = [];
      if (subItemsRaw) {
        subItemsRaw.split(/[,，\n]+/).forEach(s => {
          const itemText = s.trim();
          if (itemText) {
            subItemList.push({
              name: itemText,
              subCat: itemText,
              emoji: newEmoji,
              duration: 90,
              hasEndDate: true,
              warnDays: 14
            });
          }
        });
      }

      if (cat.isPreset || DEFAULT_CATEGORIES[catId]) {
        // 預設群組覆寫
        const overrides = loadPresetOverrides();
        overrides[catId] = {
          label: newName,
          emoji: newEmoji,
          items: subItemList.length > 0 ? subItemList : (cat.items || [])
        };
        savePresetOverrides(overrides);
      } else {
        // 自訂群組修改
        const customCats = loadCustomCategories();
        if (customCats[catId]) {
          customCats[catId].label = newName;
          customCats[catId].emoji = newEmoji;
          if (subItemList.length > 0) {
            customCats[catId].items = subItemList;
          }
          saveCustomCategories(customCats);
        }
      }

      closeEditCategoryModal();
      renderCategoryChips();
      populateCategorySelect();
      populateFirstPageCategorySelect();
      renderCategoryManageList();
      renderCards();
      showToast(`🎉 已更新「${newName}」群組資訊！`);
    });
  }

  // ==========================================
  // 彈出式選單與 Modal 背景鎖定機制 (Popup Background Lock)
  // 徹底修正彈出式菜單拖動或滾動時影響到底層背景內容或觸發跨分頁滑動 (滾動穿透問題)
  // ==========================================
  function isAnyModalOpen() {
    const modals = document.querySelectorAll('.ios-modal-backdrop, .ios-action-backdrop');
    for (const el of modals) {
      if ((el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('active')) && !el.classList.contains('modal-closing')) {
        return true;
      }
    }
    const actionSheetEl = document.getElementById('actionSheet');
    if (actionSheetEl && actionSheetEl.style.display !== 'none' && actionSheetEl.style.display !== '' && !actionSheetEl.classList.contains('modal-closing')) {
      return true;
    }
    return false;
  }

  function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    if (viewsSliderViewport) {
      viewsSliderViewport.style.overflowX = 'hidden';
    }
  }

  function unlockBodyScroll() {
    if (!isAnyModalOpen()) {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
      if (viewsSliderViewport) {
        viewsSliderViewport.style.overflowX = 'auto';
      }
    }
  }

  function updateBodyScrollLock() {
    if (isAnyModalOpen()) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
  }

  // 自動監聽所有 Modal 與 Action Sheet 的開關變化
  const modalObserver = new MutationObserver(function () {
    updateBodyScrollLock();
  });
  document.querySelectorAll('.ios-modal-backdrop, .ios-action-backdrop').forEach(el => {
    modalObserver.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  });

  // 攔截遮罩層上的觸摸滑動事件, 避免拖曳穿透至底層
  document.querySelectorAll('.ios-modal-backdrop, .ios-action-backdrop').forEach(backdrop => {
    backdrop.addEventListener('touchmove', function (e) {
      if (e.target === backdrop) {
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });
  });

  // Action Sheet 支援拖曳把手與標頭向下滑動極速關閉, 靈敏順暢且完全不卡頓
  const actionSheetCard = actionSheet.querySelector('.ios-action-sheet');
  if (actionSheetCard) {
    let sheetStartY = 0;
    let sheetStartX = 0;
    let sheetStartTime = 0;
    let isDraggingSheet = false;
    let currentSheetDy = 0;
    let isClosingSheet = false;

    function smoothlyCloseActionSheet() {
      if (isClosingSheet) return;
      isClosingSheet = true;
      actionSheetCard.style.transition = 'transform 0.18s cubic-bezier(0.32, 0.72, 0, 1)';
      actionSheetCard.style.transform = 'translateY(100%)';
      actionSheet.classList.add('modal-closing');
      setTimeout(() => {
        actionSheetCard.style.transform = '';
        actionSheetCard.style.transition = '';
        actionSheet.classList.remove('modal-closing');
        closeActionSheet(true);
        isClosingSheet = false;
      }, 180);
    }

    actionSheetCard.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1 && !isClosingSheet) {
        sheetStartY = e.touches[0].clientY;
        sheetStartX = e.touches[0].clientX;
        sheetStartTime = Date.now();
        isDraggingSheet = false;
        currentSheetDy = 0;
      }
    }, { passive: true });

    actionSheetCard.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && !isClosingSheet) {
        const touchY = e.touches[0].clientY;
        const dy = touchY - sheetStartY;
        const dx = Math.abs(e.touches[0].clientX - sheetStartX);
        const isNearTop = actionSheetCard.scrollTop <= 4;
        const isHeaderArea = !!e.target.closest('.sheet-drag-handle, .sheet-header, .sheet-item-info, .sheet-metrics-grid');

        // 當處於頂部區域或頂端，向下滑動即立即跟手拖拉，絕無延遲
        if ((isHeaderArea || isNearTop) && dy > 4 && dy > dx * 0.7) {
          isDraggingSheet = true;
          currentSheetDy = dy;
          if (e.cancelable) e.preventDefault();
          actionSheetCard.style.transform = `translateY(${Math.max(0, dy)}px)`;
          actionSheetCard.style.transition = 'none';
        }
      }
    }, { passive: false });

    function handleSheetTouchEnd() {
      if (isDraggingSheet && !isClosingSheet) {
        isDraggingSheet = false;
        const dt = Math.max(1, Date.now() - sheetStartTime);
        const velocityY = currentSheetDy / dt;

        // 位移超過 30px 或具備向下滑動速度時立即順暢關閉
        if (currentSheetDy > 30 || (velocityY > 0.22 && currentSheetDy > 15)) {
          smoothlyCloseActionSheet();
        } else {
          actionSheetCard.style.transition = 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)';
          actionSheetCard.style.transform = 'translateY(0)';
          setTimeout(() => {
            if (!isDraggingSheet) {
              actionSheetCard.style.transform = '';
              actionSheetCard.style.transition = '';
            }
          }, 200);
        }
      }
    }

    actionSheetCard.addEventListener('touchend', handleSheetTouchEnd, { passive: true });
    actionSheetCard.addEventListener('touchcancel', handleSheetTouchEnd, { passive: true });

    // 支援在上方半透明遮罩層向下滑動關閉
    actionSheet.addEventListener('touchmove', function (e) {
      if (e.target === actionSheet && e.touches.length === 1 && !isClosingSheet) {
        const dy = e.touches[0].clientY - sheetStartY;
        if (dy > 20) {
          smoothlyCloseActionSheet();
        }
      }
    }, { passive: true });
  }

  // ==========================================
  // 主頁與物品分類 原生 CSS Scroll Snap 與滑動切換分頁
  // 修正滑動物品無法切換分頁的狀況, 同時兼顧手機觸控與桌面滑鼠拖曳
  // ==========================================
  if (viewsSliderViewport) {
    let scrollSnapTimer = null;

    viewsSliderViewport.addEventListener('scroll', function () {
      if (isAnyModalOpen()) return;
      hasSwipedHorizontally = true;
      setPanelsSwipingState(true);

      clearTimeout(scrollSnapTimer);
      scrollSnapTimer = setTimeout(() => {
        hasSwipedHorizontally = false;
        const scrollLeft = viewsSliderViewport.scrollLeft;
        const width = viewsSliderViewport.clientWidth || 375;
        const targetTab = (scrollLeft >= width * 0.5) ? 'inventory' : 'today';
        setPanelsSwipingState(false);
        setActivePanel(targetTab);

        if (targetTab !== currentNavTab) {
          currentNavTab = targetTab;
          // 往左右滑切換頁面時自動至頂至頁面上方
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          const iosMain = document.querySelector('.ios-main');
          if (iosMain) iosMain.scrollTop = 0;

          if (targetTab === 'today') {
            dockTabToday.classList.add('active');
            dockTabInventory.classList.remove('active');
            if (headerSublabel) headerSublabel.textContent = '主頁';
            if (headerMainTitle) headerMainTitle.textContent = '期效管家';
          } else {
            dockTabToday.classList.remove('active');
            dockTabInventory.classList.add('active');
            if (headerSublabel) headerSublabel.textContent = '物品分類';
            if (headerMainTitle) headerMainTitle.textContent = '分類清單';
            const rememberedCat = getRememberedCategoryState();
            if (rememberedCat) {
              currentCategoryChip = rememberedCat;
            } else {
              currentCategoryChip = getFirstPageCategory();
              rememberCategoryState(currentCategoryChip);
            }
            renderCategoryChips();
            updateCategoryActionBar();
          }
          triggerDockSwitchEffect(targetTab);
          renderApp();
        }
      }, 70);
    }, { passive: true });

    // 桌面滑鼠拖曳橫向切換支援
    let isMouseDragging = false;
    let mouseStartX = 0;
    let mouseStartScrollLeft = 0;
    let mouseMoved = false;

    viewsSliderViewport.addEventListener('mousedown', function (e) {
      if (isAnyModalOpen()) return;
      if (e.target.closest('#categoryChipRow') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
      isMouseDragging = true;
      mouseStartX = e.pageX;
      mouseStartScrollLeft = viewsSliderViewport.scrollLeft;
      mouseMoved = false;
    });

    window.addEventListener('mousemove', function (e) {
      if (!isMouseDragging) return;
      const dx = e.pageX - mouseStartX;
      if (Math.abs(dx) > 6) {
        mouseMoved = true;
        hasSwipedHorizontally = true;
        setPanelsSwipingState(true);
        viewsSliderViewport.style.scrollSnapType = 'none';
        viewsSliderViewport.scrollLeft = mouseStartScrollLeft - dx;
      }
    });

    window.addEventListener('mouseup', function (e) {
      if (!isMouseDragging) return;
      isMouseDragging = false;
      viewsSliderViewport.style.scrollSnapType = 'x mandatory';

      if (mouseMoved) {
        const scrollLeft = viewsSliderViewport.scrollLeft;
        const width = viewsSliderViewport.clientWidth || 375;
        const dx = e.pageX - mouseStartX;
        let targetTab = currentNavTab;
        if (dx < -40) {
          targetTab = 'inventory';
        } else if (dx > 40) {
          targetTab = 'today';
        } else {
          targetTab = (scrollLeft >= width * 0.5) ? 'inventory' : 'today';
        }
        switchViewTab(targetTab, true);

        setTimeout(() => {
          hasSwipedHorizontally = false;
          mouseMoved = false;
        }, 120);
      } else {
        hasSwipedHorizontally = false;
        setPanelsSwipingState(false);
        setActivePanel(currentNavTab);
      }
    });

    // 視窗大小改變時重置滾動位置, 保持在對應分頁
    window.addEventListener('resize', () => {
      if (viewsSliderViewport && currentNavTab === 'inventory') {
        viewsSliderViewport.scrollTo({ left: viewsSliderViewport.clientWidth, behavior: 'instant' });
      }
      setActivePanel(currentNavTab);
    });
  }

  // ==========================================
  // 主頁與物品分類框 滾動自動隱藏與顯現 (頁面往上滑自動隱藏，往下滑自動出現)
  // ==========================================
  const floatingIslandDock = document.querySelector('.floating-island-dock');
  if (floatingIslandDock) {
    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let scrollTicking = false;
    let touchStartDockY = 0;

    function updateDockVisibility() {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const scrollDiff = currentScrollY - lastScrollY;

      // 靠近頁面頂部時始終保持可見
      if (currentScrollY < 35) {
        floatingIslandDock.classList.remove('dock-hidden');
      } else if (scrollDiff > 8 && currentScrollY > 60) {
        // 頁面往上滑 (向下滾動閱讀內容) 自動隱藏
        floatingIslandDock.classList.add('dock-hidden');
      } else if (scrollDiff < -8) {
        // 頁面往下滑 (回滾至上方) 自動顯現
        floatingIslandDock.classList.remove('dock-hidden');
      }

      lastScrollY = currentScrollY;
      scrollTicking = false;
    }

    window.addEventListener('scroll', function () {
      if (isAnyModalOpen()) return;
      if (!scrollTicking) {
        window.requestAnimationFrame(updateDockVisibility);
        scrollTicking = true;
      }
    }, { passive: true });

    // 支援行動裝置觸控即時手勢監聽，確保滑動手感完全同步
    window.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length === 1) {
        touchStartDockY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (isAnyModalOpen() || !e.touches || e.touches.length !== 1) return;
      const currentTouchY = e.touches[0].clientY;
      const touchDiff = touchStartDockY - currentTouchY;
      const currentScrollY = window.scrollY || window.pageYOffset || 0;

      // 手指往上推動超過 12px 且不在頂部：自動隱藏
      if (touchDiff > 12 && currentScrollY > 50) {
        floatingIslandDock.classList.add('dock-hidden');
      } else if (touchDiff < -12) {
        // 手指往下拉動超過 12px：自動顯現
        floatingIslandDock.classList.remove('dock-hidden');
      }
    }, { passive: true });

    // 點擊底部導航分頁時立即恢復顯示
    if (dockTabToday) dockTabToday.addEventListener('click', () => floatingIslandDock.classList.remove('dock-hidden'));
    if (dockTabInventory) dockTabInventory.addEventListener('click', () => floatingIslandDock.classList.remove('dock-hidden'));
  }

  inventorySearch.addEventListener('input', function () {
    searchQuery = this.value.trim();
    btnClearInventorySearch.style.display = searchQuery ? 'block' : 'none';
    renderCards();
  });

  btnClearInventorySearch.addEventListener('click', function () {
    inventorySearch.value = '';
    searchQuery = '';
    btnClearInventorySearch.style.display = 'none';
    renderCards();
    inventorySearch.focus();
  });

  document.getElementById('btnOpenAddModal').addEventListener('click', openAddModal);

  const toastContainer = document.getElementById('toastContainer');
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2200);
  }

  // ==========================================
  // 9. 初始化啟動
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const savedTheme = urlParams.get('theme') || localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(savedTheme, false);
  loadItems();
  loadRecentlyDeleted();
  loadArchivedItems();
  updateTrashBadge();
  updateArchiveBadge();
  loadCustomCategories();
  currentCategoryChip = getFirstPageCategory();

  if (urlParams.get('sort')) {
    currentSortMode = urlParams.get('sort');
    localStorage.setItem(HOME_SORT_KEY, currentSortMode);
  }

  if (urlParams.get('firstCat')) {
    const fc = urlParams.get('firstCat');
    localStorage.setItem(FIRST_PAGE_CAT_KEY, fc);
    currentCategoryChip = fc;
  }

  renderCategoryChips();
  populateCategorySelect();
  populateFirstPageCategorySelect();

  // 視窗寬度比例初始化與監聽
  const selectScreenFitEl = document.getElementById('selectScreenFit');
  if (selectScreenFitEl) {
    selectScreenFitEl.addEventListener('change', function () {
      setScreenFit(this.value, true);
    });
  }
  const savedScreenFit = localStorage.getItem(SCREEN_FIT_KEY) || 'plus';
  setScreenFit(savedScreenFit, false);

  renderApp();

  // 首次開起的頁面預設為首頁
  if (urlParams.get('tab') === 'inventory') {
    switchViewTab('inventory', false);
  } else {
    switchViewTab('today', false);
  }

  if (urlParams.get('modal') === 'add') {
    openAddModal();
    const addCat = urlParams.get('cat');
    if (addCat && itemCategorySelect) {
      itemCategorySelect.value = addCat;
      const subCat = urlParams.get('subcat') || '';
      populateSubCategoryDropdown(addCat, subCat);
      if (subCat && itemSubCategorySelect) {
        itemSubCategorySelect.dispatchEvent(new Event('change'));
      }
    }
    if (urlParams.get('reminder') === 'custom') {
      populateReminderOptions('custom');
      if (itemReminderCustomDate) itemReminderCustomDate.value = '2026-10-08';
      if (itemReminderCustomTime) itemReminderCustomTime.value = '10:30';
    }
    if (urlParams.get('scroll') === 'reminder') {
      const scrollEl = document.querySelector('.ios-modal-scroll');
      if (scrollEl) scrollEl.scrollTop = 320;
    }
  } else if (urlParams.get('modal') === 'sheet' && items.length > 0) {
    openActionSheet(items[0].id);
  } else if (urlParams.get('modal') === 'reset-confirm' && items.length > 0) {
    openActionSheet(items[0].id);
    btnSheetReset.click();
  } else if (urlParams.get('modal') === 'delete-confirm' && items.length > 0) {
    openActionSheet(items[0].id);
    btnSheetDelete.click();
  } else if (urlParams.get('modal') === 'bg-removal') {
    openAddModal();
    // Use demo photo for immediate visual preview in studio
    const demoImg = items[0] && items[0].image ? items[0].image : CHAIR_SVG_BASE64;
    currentUploadedImage = demoImg;
    updateAvatarPreview();
    openBgRemovalStudio(demoImg);
  } else if (urlParams.get('modal') === 'settings') {
    btnOpenSettings.click();
  } else if (urlParams.get('modal') === 'custom-cat') {
    openCustomCategoryModal();
  } else if (urlParams.get('tab') === 'inventory') {
    dockTabInventory.click();
    const catParam = urlParams.get('cat');
    if (catParam) {
      const chip = document.querySelector(`.category-chip[data-cat="${catParam}"]`);
      if (chip) chip.click();
    }
  }

  if (urlParams.get('testAddCustomCat') === '1') {
    const customCats = loadCustomCategories();
    customCats['custom_camping'] = {
      label: '露營裝備',
      emoji: '⛺',
      isCustom: true,
      items: [
        { name: '雙人高山帳篷', subCat: '帳篷', emoji: '⛺', duration: 365, hasEndDate: true, warnDays: 30 },
        { name: '羽絨保暖睡袋', subCat: '睡袋', emoji: '🏕️', duration: 365, hasEndDate: true, warnDays: 30 },
        { name: '輕量摺疊露營椅', subCat: '露營椅', emoji: '🪑', duration: 730, hasEndDate: false }
      ]
    };
    saveCustomCategories(customCats);
    renderCategoryChips();
    populateCategorySelect();
    if (urlParams.get('modal') === 'custom-cat') {
      openCustomCategoryModal();
    } else if (urlParams.get('modal') === 'add') {
      openAddModal();
      if (itemCategorySelect) {
        itemCategorySelect.value = 'custom_camping';
        populateSubCategoryDropdown('custom_camping');
      }
    } else {
      dockTabInventory.click();
      const chip = document.querySelector('.category-chip[data-cat="custom_camping"]');
      if (chip) chip.click();
    }
  }

  if (urlParams.get('scrollChips') === 'end') {
    const chipRow = document.getElementById('categoryChipRow');
    if (chipRow) chipRow.scrollLeft = 9999;
  }

  if (urlParams.get('scrollModal') === 'bottom') {
    const scrollEl = document.querySelector('#customCategoryModal .ios-modal-scroll');
    if (scrollEl) scrollEl.scrollTop = 580;
  }

  if (urlParams.get('testSwipe') === 'left') {
    switchViewTab('inventory');
  }

  if (urlParams.get('testEmptyCat') === '1') {
    const customCats = loadCustomCategories();
    customCats['custom_empty'] = { label: '空箱裝備', emoji: '📦', isCustom: true, items: [] };
    saveCustomCategories(customCats);
    dockTabInventory.click();
    currentCategoryChip = 'custom_empty';
    renderCategoryChips();
    renderCards();
  }

  if (urlParams.get('testClickNotice') === '1' && statusNoticeCard) {
    statusNoticeCard.click();
  }

  if (urlParams.get('filter')) {
    const fVal = urlParams.get('filter');
    const fBtn = document.querySelector(`.home-filter-btn[data-filter="${fVal}"]`);
    if (fBtn) fBtn.click();
  }

  if (urlParams.get('openSort') === '1') {
    openHomeSortModal();
    if (urlParams.get('scrollSort') === 'bottom') {
      const scrollEl = document.querySelector('#homeSortModal .ios-modal-scroll');
      if (scrollEl) scrollEl.scrollTop = 380;
    }
  }

  if (urlParams.get('openSheet') === '1') {
    if (items.length > 0) {
      openActionSheet(items[0].id);
    }
  }

  if (urlParams.get('openAddItems') === '1') {
    openAddItemsToCategoryModal();
  }
})();
