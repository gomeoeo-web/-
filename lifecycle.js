/* 期效管家 1.10.0: shared, DOM-independent data rules. */
(function (root) {
  'use strict';
  const SETTINGS = ['lifespan_tracker_custom_categories_v1','lifespan_preset_category_overrides',
    'lifespan_deleted_preset_categories','lifespan_tracker_category_order_v1','lifespan_tracker_custom_order_v1',
    'lifespan_tracker_first_page_cat','lifespan_tracker_home_sort','lifespan_tracker_theme','lifespan_screen_fit',
    'lifespan_view_mode_v110'];
  const COLLECTIONS = ['items','archivedItems','recentlyDeletedItems','shoppingList'];
  const SOURCES = {manual:'手動設定',package:'包裝辨識',estimated:'依品類／資料推算',legacy:'既有資料（來源未記錄）'};
  function validateEditor(editor) {
    if(!editor||typeof editor!=='object'||Array.isArray(editor)||typeof editor.id!=='string'||!editor.id||editor.id.length>100||typeof editor.name!=='string'||!editor.name.trim()||editor.name.length>30)throw new Error('編輯人資料格式不正確');
    const avatar=editor.avatar??'';
    if(typeof avatar!=='string'||avatar.length>100000||(avatar&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)))throw new Error('編輯人頭像格式不正確');
    return {id:editor.id,name:editor.name.trim(),avatar};
  }
  function validDate(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + 'T00:00:00Z');
    return Number.isFinite(+d) && d.toISOString().slice(0,10) === v;
  }
  function offset(date, days) {
    if (!validDate(date) || !Number.isInteger(days)) return null;
    const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  }
  function normalize(item) {
    if (Object.hasOwn(item,'effectiveEndDate') && item.endDate !== item.effectiveEndDate) {
      item.packageEndDate = validDate(item.endDate) ? item.endDate : null;
    }
    if (!Object.hasOwn(item,'packageEndDate')) item.packageEndDate = item.hasEndDate===false ? null : item.endDate || item.expiryDate || null;
    if (!Object.hasOwn(SOURCES,item.dateSource)) item.dateSource = 'legacy';
    const openEnd = item.usageState !== 'pending' && validDate(item.openedDate) &&
      Number.isInteger(item.openedShelfDays) && item.openedShelfDays > 0 ? offset(item.openedDate,item.openedShelfDays) : null;
    const dates = [item.packageEndDate,openEnd].filter(validDate).sort();
    item.endDate = dates[0] || null; item.hasEndDate = !!item.endDate;
    item.effectiveEndDate = item.endDate;
    if ('expiryDate' in item) item.expiryDate = item.endDate;
    item.openedEndDate = openEnd;
    return item;
  }
  function validateSnapshot(input) {
    const data = Array.isArray(input) ? {items:input} : input;
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) throw new Error('備份必須包含物品清單');
    if (data.schemaVersion != null && data.schemaVersion !== 1) throw new Error('此備份版本尚不支援，請更新 App');
    const out = {schemaVersion:1,version:'1.10.0',exportedAt:data.exportedAt || Date.now(),settings:{}};
    const allIds = new Set();
    for (const key of COLLECTIONS) {
      const list = data[key] || [];
      if (!Array.isArray(list) || list.length > 10000) throw new Error('清單格式或件數不正確');
      const seen = new Set();
      out[key] = list.map(entry => {
        if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !entry.id || entry.id.length > 200 ||
          typeof entry.name !== 'string' || entry.name.length > 500 || seen.has(entry.id)) throw new Error('物品名稱或識別碼不正確／重複');
        seen.add(entry.id);
        if (key !== 'shoppingList') {
          if (allIds.has(entry.id)) throw new Error('物品不能同時存在不同清單');
          allIds.add(entry.id);
        }
        for (const field of ['endDate','expiryDate','packageEndDate','openedDate','startDate','plannedStartDate','reminderDate','snoozedUntil'])
          if (entry[field] && !validDate(entry[field])) throw new Error('物品日期格式不正確');
        if (entry.openedShelfDays != null && (!Number.isInteger(entry.openedShelfDays) || entry.openedShelfDays < 1 || entry.openedShelfDays > 3650)) throw new Error('開封天數必須為 1–3650');
        if (entry.image && (typeof entry.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(entry.image))) throw new Error('照片格式不正確');
        entry={...entry};
        for(const field of ['createdBy','lastEditedBy'])if(entry[field]!=null)entry[field]=validateEditor(entry[field]);
        for(const field of ['createdByAt','lastEditedAt','deletedAt'])if(entry[field]!=null&&(!Number.isSafeInteger(entry[field])||entry[field]<=0||entry[field]>8640000000000000))throw new Error('物品紀錄時間不正確');
        for(const field of ['createdBySource','lastEditedBySource'])if(entry[field]!=null&&!['legacy-backfill','device-credential','self-reported'].includes(entry[field]))throw new Error('編輯人來源格式不正確');
        return key === 'shoppingList' ? {...entry} : normalize({...entry});
      });
    }
    if (data.settings) {
      if (typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('設定格式不正確');
      for (const key of SETTINGS) if (Object.hasOwn(data.settings,key)) {
        const value = data.settings[key];
        if (typeof value !== 'string' || value.length > 500000) throw new Error('設定內容不正確');
        if (/categories|overrides|order/.test(key)) {
          let parsed; try { parsed=JSON.parse(value); } catch { throw new Error('分類／排序設定不正確'); }
          const array = /deleted|order/.test(key);
          if (array ? !Array.isArray(parsed) || parsed.some(v=>typeof v!=='string') : !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('分類／排序設定不正確');
          if (!array) for (const [id,cat] of Object.entries(parsed)) {
            if (['__proto__','constructor','prototype'].includes(id) || !cat || typeof cat !== 'object' || typeof cat.label !== 'string') throw new Error('分類設定不正確');
            if (cat.items && (!Array.isArray(cat.items) || cat.items.some(v=>!v || typeof v!=='object'))) throw new Error('分類細項不正確');
          }
        }
        out.settings[key]=value;
      }
    }
    return out;
  }
  // Incoming records win only when the user explicitly selects merge. Moving
  // a record between collections must remove the prior location as well.
  function mergeSnapshots(local, incoming) {
    const a=validateSnapshot(local), b=validateSnapshot(incoming);
    const incomingIds=new Set(['items','archivedItems','recentlyDeletedItems'].flatMap(k=>b[k].map(x=>x.id)));
    const out={...a,settings:{...a.settings,...b.settings}};
    for (const key of COLLECTIONS) {
      const ids=key==='shoppingList'?new Set(b[key].map(x=>x.id)):incomingIds;
      out[key]=[...a[key].filter(x=>!ids.has(x.id)),...b[key]];
    }
    for (const key of ['lifespan_tracker_custom_categories_v1','lifespan_preset_category_overrides']) {
      if (a.settings[key] && b.settings[key]) out.settings[key]=JSON.stringify({...JSON.parse(a.settings[key]),...JSON.parse(b.settings[key])});
    }
    return validateSnapshot(out);
  }
  // Rebase pending edits onto the cloud without overwriting concurrent edits.
  function rebaseShared(base, local, remote) {
    const a=validateSnapshot(base),b=validateSnapshot(local),c=validateSnapshot(remote);
    const keys=['items','archivedItems','recentlyDeletedItems'];
    const records=data=>new Map(keys.flatMap(key=>data[key].map(item=>[item.id,{key,item}])));
    const before=records(a),pending=records(b),cloud=records(c),conflicts=[];
    const content=record=>{if(!record)return null;const item={...record.item};for(const key of ['createdBy','createdByAt','createdBySource','lastEditedBy','lastEditedAt','lastEditedBySource'])delete item[key];return JSON.stringify({key:record.key,item:Object.fromEntries(Object.entries(item).sort(([x],[y])=>x.localeCompare(y)))});};
    const out={...c};for(const key of keys)out[key]=[];
    for(const id of new Set([...before.keys(),...pending.keys(),...cloud.keys()])) {
      const old=before.get(id),mine=pending.get(id),theirs=cloud.get(id);
      const changed=content(mine)!==content(old),remoteChanged=content(theirs)!==content(old);
      if(changed&&remoteChanged&&content(mine)!==content(theirs))conflicts.push(id);
      const chosen=changed&&!remoteChanged?mine:theirs;
      if(chosen)out[chosen.key].push(chosen.item);
    }
    out.settings={...c.settings};
    for(const key of new Set([...Object.keys(a.settings),...Object.keys(b.settings),...Object.keys(c.settings)])) {
      if(b.settings[key]===a.settings[key])continue;
      if(c.settings[key]!==a.settings[key]&&b.settings[key]!==c.settings[key]){conflicts.push(key);continue;}
      if(b.settings[key]===undefined)delete out.settings[key];else out.settings[key]=b.settings[key];
    }
    return {snapshot:validateSnapshot(out),conflicts};
  }
  function nextReminder(item) {
    if (item.usageState==='pending' || !item.endDate || item.reminderType==='none' || Number(item.warnDays) < 0) return null;
    let date = item.reminderDate || offset(item.endDate,-(Number.isInteger(item.warnDays)?item.warnDays:1));
    const lead=Math.min(Math.max(0,Number(item.warnDays)||0),item.openedEndDate?Math.max(0,item.openedShelfDays-1):Infinity);
    const effective = offset(item.endDate,-lead);
    // Opened expiry can only bring a reminder forward, never postpone it.
    if (item.openedEndDate && effective < date) date=effective;
    if (item.snoozedUntil) date=item.snoozedUntil;
    const time=/^([01]\d|2[0-3]):[0-5]\d$/.test(item.reminderTime || '')?item.reminderTime:'09:00';
    return new Date(date+'T'+time+':00');
  }
  const api={SETTINGS,COLLECTIONS,SOURCES,validDate,offset,normalize,validateSnapshot,validateEditor,mergeSnapshots,rebaseShared,nextReminder};
  if (typeof module==='object' && module.exports) module.exports=api;
  root.ExpiryLifecycle=api;
})(typeof window==='object'?window:globalThis);
