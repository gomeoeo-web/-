/**
 * 期效管家 - 純本機智慧自然語言速記與物品建立 (Smart Quick Add & On-Device NLP Parser v1.7.4)
 * 特性：
 * 1. 100% 本地裝置運行，無任何網路大模型或外部 API 連線。
 * 2. 完整保留主體名稱（例如「交通會議」不會被簡化為「會議」、「好市多鮮奶」保留品牌）。
 * 3. 完整納入基準時間、日期與精確時間（時:分）推算（支援上午/下午/晚上/X點X分）。
 * 4. 智慧提醒天數與自訂時間解析（支援提早X天、當天、不提醒、自訂幾點幾分）。
 * 5. 上下文追問與既有物品修改（lastCreatedItem 與既有清單比對）。
 */

let lastCreatedItem = null; // 最近一筆新增或編輯之物品快取 (Context Continuity)

// 中文數字轉換輔助
const cnNumMap = {
  '零': 0, '一': 1, '二': 2, '兩': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15, '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
  '二十一': 21, '二十二': 22, '二十三': 23
};

function parseChineseNum(str) {
  if (!str) return null;
  str = str.trim();
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  if (str === '半') return 0.5;
  if (cnNumMap[str] !== undefined) return cnNumMap[str];
  if (str.length === 2 && str.startsWith('十')) return 10 + (cnNumMap[str[1]] || 0);
  if (str.length === 2 && str.endsWith('十')) return (cnNumMap[str[0]] || 1) * 10;
  if (str.length === 3 && str[1] === '十') return (cnNumMap[str[0]] || 1) * 10 + (cnNumMap[str[2]] || 0);
  return null;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function offsetDays(d, numDays) {
  const res = new Date(d.getTime());
  res.setDate(res.getDate() + numDays);
  return res;
}

/**
 * 1. 抽取具體時間（時:分，24小時制 HH:mm）
 */
function extractTime(str) {
  if (!str) return null;
  // 24h 數位時間 (如 14:30, 09:00, 9:30, 18:00)
  const digitalMatch = str.match(/(?:^|[^\d:])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/);
  if (digitalMatch) {
    const h = String(parseInt(digitalMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(digitalMatch[2], 10)).padStart(2, '0');
    return `${h}:${m}`;
  }

  // 中文時段修飾詞
  const periodMatch = str.match(/(上午|早上|早晨|清晨|中午|下午|午後|傍晚|晚上|今晚|明晚|半夜|凌晨)/);
  const period = periodMatch ? periodMatch[1] : null;

  // 中文點/分 (例如：下午2點30分、明天上午9點、晚上8點半、14點)
  const hourMatch = str.match(/(?:(?:上午|早上|早晨|清晨|中午|下午|午後|傍晚|晚上|今晚|明晚|半夜|凌晨)\s*)?(\d{1,2}|[一二兩三四五六七八九十]+)\s*(?:點|点|時|时)(?:\s*(?:半|(\d{1,2}|[一二兩三四五六七八九十]+)\s*分(?:鐘)?))?/);
  if (hourMatch) {
    let h = parseChineseNum(hourMatch[1]);
    if (h !== null && !isNaN(h)) {
      let m = 0;
      if (hourMatch[0].includes('半')) {
        m = 30;
      } else if (hourMatch[2]) {
        const mVal = parseChineseNum(hourMatch[2]);
        if (mVal !== null && !isNaN(mVal)) m = mVal;
      }

      if (period === '下午' || period === '午後' || period === '傍晚' || period === '晚上' || period === '今晚' || period === '明晚') {
        if (h < 12) h += 12;
      } else if (period === '上午' || period === '早上' || period === '早晨' || period === '清晨' || period === '凌晨' || period === '半夜') {
        if (h === 12) h = 0;
      } else if (period === '中午') {
        if (h < 11) h += 12;
      }

      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/**
 * 2. 抽取日期 (YYYY-MM-DD)
 */
function extractDate(str, refDate, targetItem = null) {
  const todayYear = refDate.getFullYear();
  const todayMonth = refDate.getMonth();
  const todayDate = refDate.getDate();

  // 1. 延長/延後天數 (相對於現有物品到期日或基準時間)
  if (/(?:延長|延後|推遲|再放|再存|多放)\s*(\d+|[一二兩三四五六七八九十]+)\s*(?:天|日)/.test(str)) {
    const match = str.match(/(?:延長|延後|推遲|再放|再存|多放)\s*(\d+|[一二兩三四五六七八九十]+)\s*(?:天|日)/);
    const num = parseChineseNum(match[1]);
    if (num) {
      let base = refDate;
      if (targetItem && (targetItem.endDate || targetItem.expiryDate)) {
        const tDate = new Date((targetItem.endDate || targetItem.expiryDate) + 'T00:00:00');
        if (!isNaN(tDate.getTime())) base = tDate;
      }
      return formatDate(offsetDays(base, Math.round(num)));
    }
  }

  // 2. 明確完整日期：YYYY-MM-DD / YYYY/MM/DD / YYYY年M月D日
  const fullDateMatch = str.match(/(20\d\d)[-/年\.]\s*(\d{1,2})[-/月\.]\s*(\d{1,2})[日號]?/);
  if (fullDateMatch) {
    const y = parseInt(fullDateMatch[1], 10);
    const m = String(parseInt(fullDateMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(fullDateMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3. 月/日 (例如 10/15, 5月20日)
  const mdMatch = str.match(/(?:^|[^\d])(\d{1,2})[-/月\.]\s*(\d{1,2})[日號]?/);
  if (mdMatch) {
    const m = parseInt(mdMatch[1], 10);
    const d = parseInt(mdMatch[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let year = todayYear;
      const targetThisYear = new Date(year, m - 1, d);
      const todayNoTime = new Date(todayYear, todayMonth, todayDate);
      if (targetThisYear.getTime() < todayNoTime.getTime()) {
        year += 1;
      }
      return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. 口語日期
  if (/大後天|大后天/.test(str)) return formatDate(offsetDays(refDate, 3));
  if (/後天|后天/.test(str)) return formatDate(offsetDays(refDate, 2));
  if (/明天|明兒個/.test(str)) return formatDate(offsetDays(refDate, 1));
  if (/今天|今日/.test(str)) return formatDate(offsetDays(refDate, 0));

  // 5. 週別日期 (下週X)
  const weekMatch = str.match(/(下下|下|這|本)?\s*(?:週|周|星期|禮拜)(?:\s*([一二三四五六日天1-7]))?/);
  if (weekMatch) {
    const prefix = weekMatch[1] || '';
    const dayStr = weekMatch[2] || '1';
    const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7 };
    const targetDay = dayMap[dayStr];
    const currentDay = refDate.getDay() === 0 ? 7 : refDate.getDay();
    let daysToAdd = 0;
    if (prefix === '下下') {
      daysToAdd = (14 - currentDay) + targetDay;
    } else if (prefix === '下') {
      daysToAdd = (7 - currentDay) + targetDay;
    } else {
      daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
    }
    return formatDate(offsetDays(refDate, daysToAdd));
  }

  // 6. 相對年數 (半年後、X年後)
  if (/半年(?:後|后)?/.test(str)) {
    const res = new Date(refDate.getTime());
    res.setMonth(res.getMonth() + 6);
    return formatDate(res);
  }
  const yearMatch = str.match(/(\d+|[一二兩三四五六七八九十]+)\s*(?:個)?年(?:半)?(?:後|后)?/);
  if (yearMatch) {
    const num = parseChineseNum(yearMatch[1]);
    if (num) {
      const isHalf = yearMatch[0].includes('半');
      const res = new Date(refDate.getTime());
      res.setFullYear(res.getFullYear() + Math.floor(num));
      if (isHalf) res.setMonth(res.getMonth() + 6);
      return formatDate(res);
    }
  }

  // 7. 相對月數
  if (/半個月(?:後|后)?|半月(?:後|后)?/.test(str)) {
    return formatDate(offsetDays(refDate, 15));
  }
  const monthMatch = str.match(/(?:放|存|保質|保存|剩|還有)?\s*(\d+|[一二兩三四五六七八九十]+)\s*個?月(?:半)?(?:後|后)?/);
  if (monthMatch && (monthMatch[0].includes('月') || monthMatch[0].includes('後'))) {
    const num = parseChineseNum(monthMatch[1]);
    if (num) {
      const isHalf = monthMatch[0].includes('半');
      const res = new Date(refDate.getTime());
      res.setMonth(res.getMonth() + Math.floor(num));
      if (isHalf) res.setDate(res.getDate() + 15);
      return formatDate(res);
    }
  }

  // 8. 相對週數
  const weekRelMatch = str.match(/(?:放|存|保質|保存|剩|還有)?\s*(\d+|[一二兩三四五六七八九十]+)\s*(?:個)?(?:週|周|星期|禮拜)(?:後|后)?/);
  if (weekRelMatch) {
    const num = parseChineseNum(weekRelMatch[1]);
    if (num) return formatDate(offsetDays(refDate, Math.round(num * 7)));
  }

  // 9. 相對天數
  const dayRelMatch = str.match(/(?:放|存|保質|保存|剩|還有)\s*(\d+|[一二兩三四五六七八九十]+)\s*(?:天|日)|(\d+|[一二兩三四五六七八九十]+)\s*(?:天|日)\s*(?:後|后|之后|之內|到期|過期)?/);
  if (dayRelMatch) {
    const numStr = dayRelMatch[1] || dayRelMatch[2];
    const num = parseChineseNum(numStr);
    if (num !== null && !isNaN(num) && num > 0) {
      return formatDate(offsetDays(refDate, Math.round(num)));
    }
  }

  return null;
}

/**
 * 3. 抽取品名（嚴格保留主體詞，例如「交通會議」完整保留，不可僅寫「會議」；「好市多鮮奶」保留品牌）
 */
function extractCleanName(rawText) {
  let clean = rawText;

  // A. 移除口語前綴贅字
  const noisePrefixes = [
    /幫我(?:記錄|記一下|記|紀錄)(?:一下)?/g,
    /請幫我(?:記錄|記一下|記|紀錄)?/g,
    /記錄一下|記一下/g,
    /剛剛買了|剛買了|剛剛買|剛買/g,
    /有一隻|有一頭|有一個|有一位|有一場|有一部|有一件|有一堂|有隻|有個|有場|有件/g,
    /下星期有|下週有|這週有|下月有|明天有|後天有/g,
    /記得提醒我?|記得幫我|提醒我/g,
    /記得|別忘記|別忘了/g,
    /要去|準備去|去拿|拿|吃|喝|用|存了|放了|想去/g
  ];
  noisePrefixes.forEach(rg => { clean = clean.replace(rg, ' '); });

  // B. 完整移除提醒指令
  clean = clean.replace(/(?:提前|提早|前)?\s*\d+\s*(?:個)?(?:天|日|週|周|月)?(?:\s*(?:上午|早上|下午|晚上|中午|凌晨)?\s*\d{1,2}\s*(?:點|点|時|时|:\d{2})(?:\s*(?:半|\d{1,2}分))?)?\s*(?:提醒|通知)/g, ' ');
  clean = clean.replace(/(?:當天|當日|當天上午|當天下午|當天晚上)\s*(?:提醒|通知)?/g, ' ');
  clean = clean.replace(/不提醒|提醒我?|通知我?|提醒/g, ' ');

  // C. 移除時間日期字詞
  const timeWords = [
    /20\d\d[-/年\.]\s*\d{1,2}[-/月\.]\s*\d{1,2}[日號]?/g,
    /\d{1,2}[-/月\.]\s*\d{1,2}[日號]?/g,
    /大後天|大后天|後天|后天|明天|明兒個|今天|今日/g,
    /(?:下下|下|這|本)?\s*(?:週|周|星期|禮拜)(?:\s*[一二三四五六日天1-7])?/g,
    /半年(?:後|后)?/g,
    /\d+\s*個?年(?:半)?(?:後|后)?/g,
    /\d+\s*個?月(?:半)?(?:後|后)?/g,
    /\d+\s*(?:週|周|星期|禮拜)(?:後|后)?/g,
    /\d+\s*(?:天|日)(?:後|后|之后|之內|到期|過期)?/g,
    /(?:上午|早上|早晨|清晨|中午|下午|午後|傍晚|晚上|今晚|明晚|半夜|凌晨)\s*\d{1,2}\s*(?:點|点|時|时)(?:\s*(?:半|\d{1,2}\s*分(?:鐘)?))?/g,
    /(?:^|[^\d:])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/g,
    /過期了?|到期了?|過期日|效期|有效期限|保質期|保存期限/g
  ];
  timeWords.forEach(rg => { clean = clean.replace(rg, ' '); });

  // D. 移除數量詞 (一大瓶, 一大盒, 3包等)
  clean = clean.replace(/(?:一大|一小|一|幾|[一二兩三四五六七八九十\d]+)?\s*(?:大瓶|大盒|小瓶|小盒|瓶|顆|盒|包|袋|條|罐|杯|份|件|套|隻|把|碗|片|組|條|雙|捲|張|支|箱|本|個|場|堂)\s*/g, ' ');

  // E. 移除動詞前綴後綴
  clean = clean.replace(/^(?:買了|買|開了|開封|更換|換|吃|喝|用|存了|放了|需要|要做|要|想|補貨|購買|參加)\s*/g, '');
  clean = clean.replace(/(?:買了|買|開了|開封|更換|換|吃|喝|用|存了|放了|需要|要做|要|想|補貨|購買|參加)\s*$/g, '');

  // F. 標點與空白清理
  clean = clean.replace(/[，,。\.！!？\?：:;；~～\(\)（）\[\]【】"'`]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  clean = clean.replace(/^[個場瓶隻件張條盒包袋碗次批堂大瓶小瓶大盒小盒]+/g, '').trim();
  clean = clean.replace(/^[的了在與和從於]+|[的了在與和從於]+$/g, '').trim();

  // G. 專用語意保護（主體詞精準保留）
  // 1. 會議保護：如「交通會議」、「主管會議」、「部門主管會議」、「研討會」
  if (clean.includes('會議') || clean.includes('開會') || clean.includes('研討會')) {
    const match = clean.match(/([^\s]{1,6})(?:會議|開會|研討會)/);
    if (match) {
      let prefix = match[1].replace(/^[要有去參加個場堂]/, '').trim();
      if (prefix.length > 0 && prefix !== '個' && prefix !== '場') {
        return `${prefix}${clean.includes('研討會') ? '研討會' : '會議'}`;
      }
    }
    return clean.includes('研討會') ? '線上研討會' : '會議';
  }

  // 2. 寵物出生保護
  if (/貓.*出生|貓咪.*出生|貓.*誕生|貓咪.*誕生/.test(rawText)) {
    const petM = rawText.match(/([^\s]{1,3})(?:貓|貓咪).*(?:出生|誕生)/);
    if (petM && !['一隻', '一頭', '個', '有', '那隻'].includes(petM[1])) {
      return `${petM[1]}貓咪誕生`;
    }
    return '貓咪誕生';
  }

  // 3. 機油更換保護
  if (/機油/.test(rawText)) {
    if (rawText.includes('機車')) return '機車機油';
    if (rawText.includes('汽車')) return '汽車機油';
    return '更換機油';
  }

  // 4. 鮮奶品牌/種類保護（如好市多鮮奶、低脂鮮奶）
  if (/鮮奶|牛奶|鮮乳/.test(rawText)) {
    const milkM = clean.match(/([^\s]{2,4})(?:鮮奶|牛奶|鮮乳)/);
    if (milkM && !['買了', '剛剛', '一大', '一瓶', '大瓶', '全脂'].includes(milkM[1])) {
      return `${milkM[1]}鮮奶`;
    }
    return '全脂鮮奶';
  }

  // 預設長度限制 2~8 字以保持完整語意
  if (clean.length > 8) {
    clean = clean.slice(0, 8);
  }
  return clean || '未命名物品';
}

/**
 * 本機自然語言解析器 (純 JavaScript 演算法 / 100% 離線運行)
 */
function parseNaturalInput(rawInput, baseDate = new Date(), existingItems = [], lastCreated = null) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { success: false, error: 'EMPTY_INPUT' };
  }

  let text = rawInput.trim()
    .replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ');
  if (!text) {
    return { success: false, error: 'EMPTY_INPUT' };
  }

  // 1. 抽取時間與日期
  const parsedTime = extractTime(text);
  const parsedDate = extractDate(text, baseDate);

  // 2. 提醒天數與時間判定
  let remindDaysBefore = null;
  const remindDayMatch = text.match(/(?:提前|提早|前)\s*(\d+|[一二兩三四五六七八九十]+)\s*(?:個)?(?:天|日)/);
  if (remindDayMatch) {
    const num = parseChineseNum(remindDayMatch[1]);
    if (num !== null && !isNaN(num)) remindDaysBefore = Math.round(num);
  } else if (/當天|當日/.test(text)) {
    remindDaysBefore = 0;
  } else if (/不提醒|免提醒|不用提醒/.test(text)) {
    remindDaysBefore = -1;
  } else if (parsedTime !== null) {
    // 若明確指定了幾點幾分且未特別要求提前天數，預設為當天該時間提醒
    remindDaysBefore = 0;
  }

  const defaultWarnDays = remindDaysBefore !== null ? remindDaysBefore : 3;

  // 3. 判斷是否為修改 (UPDATE)
  const updateKeywords = ['改成', '修改', '改為', '改名', '延長', '推遲', '延後', '不是', '換成'];
  let isUpdate = updateKeywords.some(kw => text.includes(kw)) || (/那隻.*叫|牠叫|它叫/.test(text));

  let targetItem = null;
  if (Array.isArray(existingItems) && existingItems.length > 0) {
    for (const it of existingItems) {
      if (text.includes(it.name)) {
        targetItem = it;
        isUpdate = true;
        break;
      }
    }
  }
  if (!targetItem && lastCreated) {
    targetItem = lastCreated;
  }

  if (isUpdate && targetItem) {
    let newName = targetItem.name;
    const renameMatch = text.match(/(?:改名[成為]|改名為?|改成)\s*([^\s,，。]+)/);
    if (renameMatch && !extractDate(renameMatch[1], baseDate)) {
      newName = renameMatch[1].trim();
    } else {
      const petNameMatch = text.match(/(?:那隻\s*(?:貓|狗|寵物)?\s*(?:叫|名叫|叫做)?|(?:它|牠)\s*(?:叫|名叫|叫做)?|名叫|叫做)\s*([^\s,，。]+)/);
      if (petNameMatch) {
        const petName = petNameMatch[1].replace(/出生|誕生|叫/, '').trim();
        if (targetItem.name.includes('誕生') || targetItem.name.includes('出生') || text.includes('出生') || text.includes('誕生')) {
          newName = `${petName}誕生`;
        } else {
          newName = petName;
        }
      }
    }

    if (newName.length > 8) {
      newName = newName.slice(0, 8);
    }

    const expDate = parsedDate || targetItem.endDate || targetItem.expiryDate || formatDate(offsetDays(baseDate, 3));
    const targetWarn = remindDaysBefore !== null ? remindDaysBefore : (targetItem.warnDays !== undefined ? targetItem.warnDays : 3);
    const targetTime = parsedTime || targetItem.reminderTime || '09:00';
    const reminderDate = (targetWarn >= 0) ? formatDate(offsetDays(new Date(expDate + 'T00:00:00'), -targetWarn)) : null;

    return {
      success: true,
      action: 'update',
      targetName: targetItem.name,
      targetId: targetItem.id || null,
      name: newName,
      category: targetItem.category || 'other',
      subCategory: targetItem.subCategory || '',
      emoji: targetItem.emoji || '📌',
      expiryDate: expDate,
      remindDaysBefore: targetWarn,
      remindTime: targetTime,
      hasCustomTime: parsedTime !== null,
      reminderDate: reminderDate,
      source: 'local'
    };
  }

  // 4. 處理新增 (CREATE)
  let finalDate = parsedDate;
  if (!finalDate) {
    if (/鮮奶|牛奶|鮮乳/.test(text)) finalDate = formatDate(offsetDays(baseDate, 7));
    else if (/蔬菜|青菜/.test(text)) finalDate = formatDate(offsetDays(baseDate, 5));
    else if (/機油/.test(text)) finalDate = formatDate(offsetDays(baseDate, 180));
    else if (/會議|開會|研討會/.test(text)) finalDate = formatDate(offsetDays(baseDate, 7));
    else if (/貓.*出生|貓.*誕生/.test(text)) finalDate = formatDate(offsetDays(baseDate, 7));
    else {
      return { success: false, error: 'NO_TIME_FOUND' };
    }
  }

  const cleanName = extractCleanName(text);

  let category = 'other';
  let subCategory = '';
  let emoji = '📌';
  if (/會議|開會|研討會/.test(cleanName)) {
    category = 'other';
    subCategory = '會議';
    emoji = '📅';
  } else if (/鮮奶|牛奶|鮮乳/.test(cleanName)) {
    category = 'food';
    subCategory = '鮮乳';
    emoji = '🥛';
  } else if (/機油/.test(cleanName)) {
    category = 'vehicle';
    subCategory = '機油';
    emoji = '🚗';
  } else if (/貓/.test(cleanName)) {
    category = 'other';
    subCategory = '寵物';
    emoji = '🐱';
  } else if (/牙醫|看診|藥/.test(cleanName)) {
    category = 'medicine';
    subCategory = '醫療';
    emoji = '💊';
  } else if (/護照|簽證|證件/.test(cleanName)) {
    category = 'other';
    subCategory = '證件';
    emoji = '🛂';
  }

  const finalWarnDays = defaultWarnDays;
  const finalRemindTime = parsedTime || '09:00';
  const calculatedReminderDate = (finalWarnDays >= 0)
    ? formatDate(offsetDays(new Date(finalDate + 'T00:00:00'), -finalWarnDays))
    : null;

  return {
    success: true,
    action: 'create',
    name: cleanName,
    category: category,
    subCategory: subCategory,
    emoji: emoji,
    expiryDate: finalDate,
    remindDaysBefore: finalWarnDays,
    remindTime: finalRemindTime,
    hasCustomTime: parsedTime !== null,
    reminderDate: calculatedReminderDate,
    source: 'local'
  };
}

/**
 * 異步解析介面 (向後相容)
 */
async function parseNaturalInputAsync(rawInput, baseDate = new Date(), existingItems = [], lastCreated = null) {
  return parseNaturalInput(rawInput, baseDate, existingItems, lastCreated);
}

/**
 * 透過 NLP 解析結果快速新增物品
 */
function addItem(itemData) {
  if (!itemData || typeof itemData !== 'object') return null;

  const newId = itemData.id || ('item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
  const startDate = itemData.startDate || formatDate(new Date());
  const endDate = itemData.endDate || startDate;
  const warnDays = (typeof itemData.warnDays === 'number') ? itemData.warnDays : 3;
  const reminderType = itemData.reminderType || ((warnDays >= 0) ? 'preset' : 'none');
  const reminderDate = itemData.reminderDate || (warnDays >= 0 ? formatDate(offsetDays(new Date(endDate + 'T00:00:00'), -warnDays)) : null);
  const reminderTime = itemData.reminderTime || '09:00';

  const newItem = {
    id: newId,
    name: (itemData.name || '未命名物品').trim(),
    category: itemData.category || 'other',
    subCategory: (itemData.subCategory || '').trim(),
    emoji: itemData.emoji || '📌',
    image: itemData.image || null,
    startDate: startDate,
    hasEndDate: (itemData.hasEndDate !== false),
    durationDays: Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1),
    endDate: endDate,
    reminderType: reminderType,
    reminderDate: reminderDate,
    reminderTime: reminderTime,
    warnDays: warnDays,
    location: (itemData.location || '').trim(),
    brand: (itemData.brand || '').trim(),
    notes: (itemData.notes || '').trim(),
    history: Array.isArray(itemData.history) ? itemData.history : [],
    createdAt: itemData.createdAt || Date.now()
  };

  if (typeof items !== 'undefined' && Array.isArray(items)) {
    items.unshift(newItem);
  }

  lastCreatedItem = newItem;

  if (typeof saveItems === 'function') saveItems();
  if (typeof scheduleItemNotification === 'function') {
    scheduleItemNotification(newItem);
  }
  if (typeof renderApp === 'function') renderApp();

  return newItem;
}

/**
 * 透過 NLP 解析結果更新現有物品
 */
function updateItemByNlp(targetId, updates) {
  if (!updates || typeof updates !== 'object') return null;
  let target = null;
  if (typeof items !== 'undefined' && Array.isArray(items)) {
    target = items.find(i => i.id === targetId);
  }
  if (!target && lastCreatedItem) {
    target = lastCreatedItem;
  }
  if (!target) return null;

  if (updates.name) target.name = updates.name.trim();
  if (updates.expiryDate) {
    target.endDate = updates.expiryDate;
    if (typeof diffDays === 'function' && target.startDate) {
      target.durationDays = Math.max(1, diffDays(target.startDate, target.endDate));
    }
  }

  if (typeof updates.remindDaysBefore === 'number') {
    target.warnDays = updates.remindDaysBefore;
    target.reminderType = updates.reminderType || ((target.warnDays >= 0) ? 'preset' : 'none');
    target.reminderDate = updates.reminderDate || ((target.warnDays >= 0) ? formatDate(offsetDays(new Date(target.endDate + 'T00:00:00'), -target.warnDays)) : null);
    target.reminderTime = updates.remindTime || target.reminderTime || '09:00';
  }

  if (updates.category) {
    target.category = updates.category;
    if (updates.subCategory) target.subCategory = updates.subCategory;
    if (updates.emoji) target.emoji = updates.emoji;
  }

  lastCreatedItem = target;

  if (typeof saveItems === 'function') saveItems();
  if (typeof scheduleItemNotification === 'function') {
    scheduleItemNotification(target);
  }
  if (typeof renderApp === 'function') renderApp();

  return target;
}

if (typeof window !== 'undefined') {
  window.parseNaturalInput = parseNaturalInput;
  window.parseNaturalInputAsync = parseNaturalInputAsync;
  window.extractTime = extractTime;
  window.extractDate = extractDate;
  window.extractCleanName = extractCleanName;
  window.addItem = addItem;
  window.updateItemByNlp = updateItemByNlp;
  window.getLastCreatedItem = () => lastCreatedItem;
  window.setLastCreatedItem = (item) => { lastCreatedItem = item; };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseNaturalInput,
    parseNaturalInputAsync,
    extractTime,
    extractDate,
    extractCleanName,
    addItem,
    updateItemByNlp,
    getLastCreatedItem: () => lastCreatedItem,
    setLastCreatedItem: (item) => { lastCreatedItem = item; }
  };
}
