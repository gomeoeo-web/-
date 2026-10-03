/* 1.10.0 UI and offline-first shared spaces. Existing storage keys stay intact. */
window.installExpiry110 = function (app) {
  'use strict';
  const L=window.ExpiryLifecycle, $=id=>document.getElementById(id), esc=app.escape;
  const SHOP='lifespan_shopping_v110', BACKUP='lifespan_backup_time_v110', RECOVERY='lifespan_restore_recovery_v110';
  const SYNC='lifespan_shared_space_v110';
  const EDITOR_PROFILE='lifespan_shared_editor_profile_v1';
  let editorProfile=read(EDITOR_PROFILE,null);
  const validAvatar=value=>typeof value==='string'&&value.length<=100000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
  function editorIdentity() {
    if(!editorProfile?.id){editorProfile={id:crypto.randomUUID(),name:'未命名編輯人',avatar:''};localStorage.setItem(EDITOR_PROFILE,JSON.stringify(editorProfile));}
    return {id:editorProfile.id,name:String(editorProfile.name||'未命名編輯人').slice(0,30),avatar:validAvatar(editorProfile.avatar)?editorProfile.avatar:''};
  }
  function editorAvatar(editor,className='shared-editor-avatar') {
    const badge=document.createElement('span');badge.className=className;
    const name=String(editor?.name||'未命名編輯人');badge.title=name;badge.setAttribute('aria-label','編輯人：'+name);
    if(validAvatar(editor?.avatar)){const image=document.createElement('img');image.src=editor.avatar;image.alt='';badge.append(image);}
    else badge.textContent=Array.from(name.trim())[0]||'人';
    return badge;
  }
  function sharedRecordTime(value) {
    return Number.isFinite(value)&&value>0?new Date(value).toLocaleString('zh-TW',{hour12:false}):'時間未記錄';
  }
  function sharedEditorDetails(item) {
    const details=document.createElement('div');details.className='shared-editor-history';
    for(const [label,timeLabel,editor,time] of [
      ['建立人','建立時間',item.createdBy,item.createdByAt||item.createdAt],
      ['最後編輯人','最後修改時間',item.lastEditedBy,item.lastEditedAt||item.updatedAt]
    ]){
      const row=document.createElement('div');row.className='shared-editor-detail';
      const text=document.createElement('span');
      text.textContent=`${label}：${editor?.name||'尚未記錄'} · ${timeLabel}：${sharedRecordTime(time)}`;
      row.append(editorAvatar(editor),text);details.append(row);
    }
    return details;
  }
  function sharedOperationText(item,filter='active') {
    const label=filter==='deleted'?'刪除人':filter==='archived'?'封存人':'新增人';
    const editor=filter==='active'?item.createdBy:item.lastEditedBy;
    return `${label}：${editor?.name||'尚未記錄'}`;
  }
  function editProfile(backToShared=false) {
    let avatar=validAvatar(editorProfile?.avatar)?editorProfile.avatar:'',loading=false;
    open('共享空間編輯人',`<p>設定此裝置的編輯人。編輯共享物品時會記錄名稱、頭像與時間。</p><div id="sharedProfilePreview" class="shared-profile-preview"></div><label>編輯人名稱<input id="sharedProfileName" maxlength="30" placeholder="例如：小明" value="${esc(editorProfile?.name||'')}"></label><label>頭像<input id="sharedProfileAvatar" type="file" accept="image/png,image/jpeg,image/webp"></label><div class="feature-actions">${button('sharedProfileRemove','移除頭像')}${button('sharedProfileSave','儲存')}${button('sharedProfileCancel','取消')}</div>`,'sharedProfile');
    const preview=()=>{$('sharedProfilePreview').replaceChildren(editorAvatar({name:$('sharedProfileName').value||'人',avatar}));};preview();
    $('sharedProfileName').oninput=preview;
    $('sharedProfileRemove').onclick=()=>{avatar='';$('sharedProfileAvatar').value='';preview();};
    $('sharedProfileAvatar').onchange=caught(async()=>{
      const input=$('sharedProfileAvatar'),file=input.files[0];if(!file)return;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('請選擇 5 MB 以下的 PNG、JPEG 或 WebP 圖片');
      loading=true;$('sharedProfileSave').disabled=true;$('sharedProfileRemove').disabled=true;
      const url=URL.createObjectURL(file);
      try {const image=new Image();image.src=url;await image.decode();if(!input.isConnected)return;
        const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const size=Math.min(image.naturalWidth,image.naturalHeight);
        canvas.getContext('2d').drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,96,96);avatar=canvas.toDataURL('image/jpeg',.8);preview();
      }finally{URL.revokeObjectURL(url);loading=false;if(input.isConnected){$('sharedProfileSave').disabled=false;$('sharedProfileRemove').disabled=false;}}
    });
    $('sharedProfileSave').onclick=caught(()=>{
      if(loading)return;const name=$('sharedProfileName').value.trim();if(!name)throw new Error('請填寫編輯人名稱');
      const profile={id:editorProfile?.id||crypto.randomUUID(),name,avatar};localStorage.setItem(EDITOR_PROFILE,JSON.stringify(profile));editorProfile=profile;
      backfillCachedEditors();
      $('sharedEditorProfileSettings').querySelector('.settings-icon').replaceChildren(editorAvatar(profile));$('sharedEditorProfileSettings').querySelector('.settings-desc').textContent=profile.name;
      app.toast('編輯人設定已儲存');if(backToShared)openSharedSettings();else dialog.close();
    });
    $('sharedProfileCancel').onclick=()=>backToShared?openSharedSettings():dialog.close();
  }
  const SHARED_DATA='lifespan_shared_data_v1_', SHARED_UI='lifespan_shared_ui_v1';
  const SHARED_SETTINGS=L.SETTINGS.filter(key=>/categories|category_overrides/.test(key));
  const SYNC_ENDPOINT='https://expiry-ai.gomeoeo.workers.dev';
  let shopping=read(SHOP,[]), connection=loadConnection(), busy=false, conflict=null, applying=false;
  let generation=0, dialogPurpose='', importData=null, syncTimer;
  let liveSocket=null,liveKey='',liveRetryTimer,liveHeartbeatTimer,livePongTimer,liveAttempts=0,liveRevision=0,liveBlockedKey='';
  const formSources={}, originalDates={}, pendingDates={};
  const emptyShared=()=>L.validateSnapshot({items:[],settings:{}});
  let sharedData=emptyShared();
  const SHARED_BASE='lifespan_shared_base_v1_';
  let sharedBase=connection?read(SHARED_BASE+connection.id,null):null;
  if(connection) {
    try {const cached=read(SHARED_DATA+connection.id,null);if(!cached)throw new Error('缺少快取');sharedData=L.validateSnapshot(cached);}
    catch {connection.needsRead=true;connection.dirty=false;}
  }
  let sharedUI=read(SHARED_UI,{filter:'active',sort:'expiry',view:'cards'}), sharedSearch='', sharedPillFilter='all';
  sharedUI.sort={expiry:'expiry_asc',name:'name_asc',newest:'created_desc'}[sharedUI.sort]||sharedUI.sort||'expiry_asc';
  sharedUI.filter='active';sharedUI.view='cards';
  // Upgrade old connections by reading the cloud into the isolated store. Never upload local items.
  if(connection&&!connection.isolated){connection.isolated=true;connection.dirty=false;connection.needsRead=true;persistConnection();}
  function read(key,fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function loadConnection() {
    const legacy=read(SYNC,null);let session;try{session=JSON.parse(sessionStorage.getItem(SYNC));}catch{}
    const saved=legacy?.token?legacy:(legacy?.id&&session?.id===legacy.id?session:null);if(!saved?.token)return null;
    localStorage.setItem(SYNC,JSON.stringify(saved));sessionStorage.setItem(SYNC,JSON.stringify(saved));return saved;
  }
  if(connection&&!connection.dirty&&!connection.needsRead)sharedBase=structuredClone(sharedData);
  function rememberSharedBase(data) {
    const next=L.validateSnapshot(data);
    localStorage.setItem(SHARED_BASE+connection.id,JSON.stringify(next));sharedBase=next;
  }
  function persistConnection() {
    if(connection){localStorage.setItem(SYNC,JSON.stringify(connection));sessionStorage.setItem(SYNC,JSON.stringify(connection));}
    else {localStorage.removeItem(SYNC);sessionStorage.removeItem(SYNC);}
  }
  function resetSharedSpace() {
    stopLiveUpdates();clearTimeout(syncTimer);
    connection=null;sharedData=emptyShared();sharedBase=null;conflict=null;generation++;
    sharedUI={filter:'active',sort:'expiry_asc',view:'cards'};
    sharedSearch='';sharedPillFilter='all';liveBlockedKey='';syncRetryCount=0;
    editorRoom=null;editorRecord=null;
    const keys=Object.keys(localStorage).filter(key=>key.startsWith(SHARED_DATA)||key.startsWith(SHARED_BASE)||key===SHARED_UI);
    keys.forEach(key=>localStorage.removeItem(key));persistConnection();
    const search=$('sharedSearch');if(search)search.value='';
    if(app.editorScope()==='shared')app.closeEditor();
    if(app.sheetScope()==='shared')app.closeSheet();
    if(dialog.open)dialog.close();
    refresh();
  }
  function snapshot() {
    const settings={}; for(const key of L.SETTINGS) {const value=localStorage.getItem(key);if(value!==null)settings[key]=value;}
    return {schemaVersion:1,version:'1.10.0',exportedAt:Date.now(),...app.data(),shoppingList:shopping,settings};
  }
  async function sharedSnapshot(source=sharedData) {
    const data=structuredClone(source);
    data.settings=Object.fromEntries(Object.entries(data.settings).filter(([key])=>SHARED_SETTINGS.includes(key)));
    for(const key of L.COLLECTIONS)for(const item of data[key]||[]) {
      if(!item.image||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(item.image))continue;
      if(typeof item.image!=='string'||!/^data:image\/(svg\+xml|gif|bmp|avif|jpg|jpeg|png|webp)[;,]/i.test(item.image))throw new Error('「'+item.name+'」的照片無法同步，請重新選取照片');
      const image=new Image();
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{image.src='';reject(new Error('「'+item.name+'」的照片讀取逾時'));},5000);
        image.onload=()=>{clearTimeout(timer);resolve();};
        image.onerror=()=>{clearTimeout(timer);reject(new Error('「'+item.name+'」的照片無法讀取，請重新選取照片'));};
        image.src=item.image;
      });
      if(!image.naturalWidth||!image.naturalHeight)throw new Error('「'+item.name+'」的照片尺寸不正確');
      const ratio=Math.min(1,2048/image.naturalWidth,2048/image.naturalHeight),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);item.image=canvas.toDataURL('image/png');
    }
    return L.validateSnapshot(data);
  }
  function downloadable(data,name) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  let exportingBackup=false;
  function recordBackup(time) {
    try {localStorage.setItem(BACKUP,JSON.stringify(time));refresh();app.toast('備份已儲存，上次備份時間已更新');}
    catch {app.toast('備份已儲存，但無法記錄備份時間');}
  }
  async function backup() {
    if(exportingBackup)return;
    exportingBackup=true;
    let writable;
    try {
      const data=snapshot(), name='期效管家備份_'+app.today()+'.json';
      if(typeof window.showSaveFilePicker==='function') {
        const handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'JSON 備份檔案',accept:{'application/json':['.json']}}]});
        writable=await handle.createWritable();
        await writable.write(JSON.stringify(data,null,2));
        await writable.close();writable=null;
        recordBackup(Date.now());
      } else {
        downloadable(data,name);
        open('確認備份已儲存',`<p>請先確認「${esc(name)}」已成功下載並儲存在裝置上。</p><p>確認已儲存後，才會更新上次備份時間。</p><div class="feature-actions">${button('backupNotSaved','尚未儲存')}${button('backupSaved','已確認儲存')}</div>`,'backupSaved');
        $('backupNotSaved').onclick=()=>dialog.close();
        $('backupSaved').onclick=()=>{recordBackup(Date.now());dialog.close();};
      }
    } catch(error) {
      if(writable)try {await writable.abort();}catch {}
      app.toast(error.name==='AbortError'?'已取消匯出，備份時間未更新':'備份儲存失敗，備份時間未更新');
    } finally {exportingBackup=false;}
  }
  async function applySnapshot(data,{recovery=true}={}) {
    data=L.validateSnapshot(data);
    const before=snapshot(), stored={};
    const keys=[...L.SETTINGS,'lifespan_tracker_ios_v10','lifespan_archive_items_v1','lifespan_recently_deleted_v1',SHOP];
    for(const key of keys)stored[key]=localStorage.getItem(key);
    // Write everything before touching in-memory data. Roll back on quota errors.
    if(recovery)localStorage.setItem(RECOVERY,JSON.stringify(before));
    try {
      for(const key of L.SETTINGS){if(data.settings[key]!=null)localStorage.setItem(key,data.settings[key]);else localStorage.removeItem(key);}
      localStorage.setItem('lifespan_tracker_ios_v10',JSON.stringify(data.items));
      localStorage.setItem('lifespan_archive_items_v1',JSON.stringify(data.archivedItems));
      localStorage.setItem('lifespan_recently_deleted_v1',JSON.stringify(data.recentlyDeletedItems));
      localStorage.setItem(SHOP,JSON.stringify(data.shoppingList));
    } catch(error) {
      for(const [key,value] of Object.entries(stored)) {if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}
      throw new Error('儲存空間不足，原有資料已保留');
    }
    applying=true;
    try { shopping=data.shoppingList;app.replace(data);app.render(); }
    finally { applying=false; }
    try { await app.reschedule(); } catch { app.toast('資料已儲存，但通知排程未確認，請在設定重新檢查'); }
    refresh();
  }
  const dialog=document.createElement('dialog');dialog.id='featuresDialog';dialog.className='features-dialog ios-modal-backdrop';dialog.style.display='none';
  dialog.innerHTML='<div class="ios-modal-card"><div class="sheet-drag-handle"></div><div class="feature-dialog-header ios-modal-header"><h2 id="featureDialogTitle"></h2><button type="button" class="btn-modal-close" id="featureDialogClose" aria-label="關閉">✕</button></div><div class="ios-modal-scroll"><div id="featureDialogBody"></div><p id="featureDialogError" role="alert"></p></div></div>';
  dialog.setAttribute('aria-labelledby','featureDialogTitle');document.body.append(dialog);
  $('featureDialogClose').onclick=()=>dialog.close();
  const nativeClose=dialog.close.bind(dialog);
  let closingFeature=null, disposeFeature=null;
  function cleanupFeature() {const dispose=disposeFeature;disposeFeature=null;dispose?.();}
  dialog.close=value=>{
    if(closingFeature)return closingFeature;
    cleanupFeature();
    closingFeature=new Promise(resolve=>app.closeOverlay(dialog,()=>{nativeClose(value);resolve();}));
    closingFeature.finally(()=>{closingFeature=null;});return closingFeature;
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
  window.SheetGestures.bindSheetDrag(dialog,()=>{if(dialogPurpose!=='shared')dialog.close();},dialog.querySelector('.ios-modal-scroll'));
  window.SheetGestures.containModalScroll(dialog);
  dialog.addEventListener('close',()=>{cleanupFeature();app.unlockOverlay();});
  dialog.addEventListener('click',e=>{if(e.target===dialog&&dialogPurpose!=='shared')dialog.close();});
  function open(title,html,purpose='') {
    cleanupFeature();
    dialogPurpose=purpose;dialog.dataset.purpose=purpose;$('featureDialogTitle').textContent=title;$('featureDialogBody').innerHTML=html;$('featureDialogError').textContent='';
    if(!dialog.open){app.lockOverlay();dialog.style.display='flex';dialog.showModal();}
  }
  function button(id,text) {return `<button type="button" class="feature-button" id="${id}">${text}</button>`;}
  function caught(action) {return async()=>{try{await action();}catch(e){$('featureDialogError').textContent=e.message;app.toast(e.message);}};}
  function counts(data) {return `使用中／待用 ${data.items.length} 件 · 封存 ${data.archivedItems.length} 件 · 最近刪除 ${data.recentlyDeletedItems.length} 件`;}
  async function previewImport(raw) {
    importData=L.validateSnapshot(raw);
    if(Array.isArray(raw)||!Object.hasOwn(raw,'settings')) importData.settings=snapshot().settings;
    open('匯入備份',`<p>${counts(importData)}</p><p>目前資料：${counts(snapshot())}</p><p>合併會保留其他物品，同識別碼採用備份內容；取代會還原整份備份。套用前會保存本機復原點。</p><div class="feature-actions">${button('importMerge','合併')}${button('importReplace','取代')}</div>`,'import');
    $('importMerge').onclick=caught(async()=>{await applySnapshot(L.mergeSnapshots(snapshot(),importData));changed();dialog.close();app.toast('備份已合併');});
    $('importReplace').onclick=caught(async()=>{await applySnapshot(importData);changed();dialog.close();app.toast('備份已還原');});
  }
  // Add opened-life and provenance controls to both creation paths.
  function createForm(prefix,host) {
    const block=document.createElement('fieldset');block.className='feature-form';block.id=prefix+'Lifecycle';block.hidden=true;block.setAttribute('aria-hidden','true');
    block.innerHTML=`<legend>開封期限與日期來源</legend><label>包裝到期日（可空）<input id="${prefix}PackageDate" type="date"></label><label>開封日期（未開封留空）<input id="${prefix}OpenedDate" type="date"></label><label>開封後使用天數<input id="${prefix}OpenedDays" type="number" min="1" max="3650" placeholder="依包裝標示填寫"></label><p id="${prefix}EffectiveDate" aria-live="polite"></p><p id="${prefix}DateSource"></p><label id="${prefix}EstimateWrap" hidden><input id="${prefix}EstimateConfirmed" type="checkbox">我已確認這是估算日期，會核對包裝標示</label>`;
    host.append(block);
    block.addEventListener('input',()=>updateForm(prefix));
    $(prefix+'PackageDate').addEventListener('input',()=>{
      const original=$(prefix==='item'?'itemEndDate':'nlpConfirmDate');if(original)original.value=$(prefix+'PackageDate').value;
      originalDates[prefix]=original?.value;
      if($(prefix+'Pending')?.checked){$(prefix+'PendingEnd').value=$(prefix+'PackageDate').value;pendingDates[prefix]=$(prefix+'PendingEnd').value;}
      formSources[prefix]='manual';$(prefix+'EstimateWrap').hidden=true;updateForm(prefix);
    });
  }
  createForm('item',$('itemForm'));
  createForm('nlp',document.querySelector('#nlpConfirmModal .ios-modal-scroll') || document.querySelector('#nlpConfirmModal .ios-modal-body'));
  function fillForm(prefix,item={}) {
    formSources[prefix]=item.dateSource || (item.expirySource==='package'?'package':item.isEstimated?'estimated':item.source?.startsWith('cloud')?'legacy':'manual');
    $(prefix+'PackageDate').value=item.packageEndDate || (item.hasEndDate===false?'':item.endDate || item.expiryDate) || '';
    $(prefix+'OpenedDate').value=item.openedDate||'';$(prefix+'OpenedDays').value=item.openedShelfDays||'';
    $(prefix+'EstimateConfirmed').checked=!!item.estimateConfirmed;
    originalDates[prefix]=$(prefix==='item'?'itemEndDate':'nlpConfirmDate')?.value;
    pendingDates[prefix]=$(prefix+'PendingEnd')?.value;
    $(prefix+'EstimateWrap').hidden=formSources[prefix]!=='estimated';updateForm(prefix);
  }
  function readForm(prefix) {
    const oldField=$(prefix==='item'?'itemEndDate':'nlpConfirmDate');
    const waiting=$(prefix+'Pending')?.checked,oldDate=waiting?$(prefix+'PendingEnd')?.value:oldField?.value;
    const previous=waiting?pendingDates[prefix]:originalDates[prefix];
    if(oldDate!==previous){$(prefix+'PackageDate').value=oldDate||'';formSources[prefix]='manual';$(prefix+'EstimateWrap').hidden=true;}
    if(waiting)pendingDates[prefix]=oldDate;else originalDates[prefix]=oldDate;
    const elapsed=$(prefix==='item'?'btnModeElapsed':'btnNlpTrackElapsed')?.classList.contains('active');
    const packageDate=!waiting&&elapsed?'':$(prefix+'PackageDate').value;
    return {packageEndDate:packageDate || null,openedDate:$(prefix+'OpenedDate').value||null,
      openedShelfDays:$(prefix+'OpenedDays').value?Number($(prefix+'OpenedDays').value):null,dateSource:formSources[prefix]||'manual',estimateConfirmed:$(prefix+'EstimateConfirmed').checked};
  }
  function validateForm(prefix) {
    const d=readForm(prefix);
    if(d.openedShelfDays!==null&&(!Number.isInteger(d.openedShelfDays)||d.openedShelfDays<1||d.openedShelfDays>3650)){app.toast('開封後天數需為 1–3650 的整數');return false;}
    if(d.openedDate&&!d.openedShelfDays){app.toast('請填寫開封後使用天數');return false;}
    if(d.openedDate&&d.openedDate>app.today()){app.toast('開封日期不能晚於今天');return false;}
    return true;
  }
  function updateForm(prefix) {
    const d=readForm(prefix),sample=L.normalize({...d,usageState:$(prefix+'Pending')?.checked?'pending':'active'});
    $(prefix+'EffectiveDate').textContent='提醒到期日：'+(sample.endDate||'未設定')+'（包裝與開封期限取較早日期）';
    $(prefix+'DateSource').textContent='日期來源：'+L.SOURCES[d.dateSource];
  }
  function decorate(item,prefix) {
    const d=readForm(prefix);
    const elapsed=prefix==='item'?document.getElementById('btnModeElapsed')?.classList.contains('active'):document.getElementById('btnNlpTrackElapsed')?.classList.contains('active');
    if(elapsed&&!d.openedDate)d.packageEndDate=null;
    Object.assign(item,d,{endDate:d.packageEndDate,updatedAt:Date.now(),snoozedUntil:null});L.normalize(item);return item;
  }
  for(const [prefix,id] of [['item','itemEndDate'],['nlp','nlpConfirmDate']])for(const event of ['input','change'])$(id)?.addEventListener(event,()=>{
    $(prefix+'PackageDate').value=$(id).value;formSources[prefix]='manual';$(prefix+'EstimateWrap').hidden=true;updateForm(prefix);
  });
  const settings=document.createElement('div');settings.className='settings-group feature-settings';
  settings.innerHTML=`<button type="button" class="settings-row-btn" id="manageSharedSpace"><span class="settings-icon" aria-hidden="true"><svg class="app-ui-icon" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5"/></svg></span><span class="settings-info"><span class="settings-title">共享同步空間設定</span><span class="settings-desc">管理共享空間與邀請碼</span></span><span class="settings-row-actions"><span class="settings-chevron" aria-hidden="true">›</span></span></button><div class="shared-sync-footer"><p id="syncStatus" aria-live="polite"></p></div>`;
  document.querySelector('#settingsModal .settings-version-wrap').before(settings);
  const profileRow=$('btnOpenArchive').cloneNode(true);profileRow.id='sharedEditorProfileSettings';profileRow.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));profileRow.querySelector('.trash-badge-count')?.remove();profileRow.querySelector('.settings-title').textContent='共享空間編輯人';profileRow.querySelector('.settings-desc').textContent='自訂編輯人名稱與頭像';profileRow.querySelector('.settings-icon').replaceChildren(editorAvatar(editorProfile));settings.prepend(profileRow);profileRow.onclick=()=>editProfile();
  $('manageSharedSpace').onclick=openShared;
  function changed() {
    if(applying)return;
    refresh();
  }
  function applySharedSnapshot(data,{dirty=false}={}) {
    if(!connection)throw new Error('請先建立或加入共享空間');
    const next=L.validateSnapshot(data);
    if(pruneSharedDeleted(next))dirty=true;
    if(backfillSharedEditors(next))dirty=true;
    next.settings=Object.fromEntries(Object.entries(next.settings).filter(([key])=>SHARED_SETTINGS.includes(key)));
    const dataKey=SHARED_DATA+connection.id,previous=localStorage.getItem(dataKey);let wrote=false;
    try {
      if(dirty&&sharedBase)localStorage.setItem(SHARED_BASE+connection.id,JSON.stringify(sharedBase));
      localStorage.setItem(dataKey,JSON.stringify(next));
      wrote=true;
      if(dirty){localStorage.setItem(SYNC,JSON.stringify({...connection,dirty:true}));sessionStorage.setItem(SYNC,JSON.stringify({...connection,dirty:true}));}
    } catch {
      if(wrote){if(previous===null)localStorage.removeItem(dataKey);else localStorage.setItem(dataKey,previous);}
      throw new Error('儲存空間不足，共享變更未儲存');
    }
    if(editorRoom===connection&&editorRecord){
      const canonical=next.items.find(item=>item.id===editorRecord.id);
      const content=item=>{const copy={...item};for(const key of ['createdBy','createdByAt','createdBySource','lastEditedBy','lastEditedAt','lastEditedBySource'])delete copy[key];return JSON.stringify(copy);};
      if(canonical&&content(canonical)===content(editorRecord))editorRecord=structuredClone(canonical);
    }
    sharedData=next;
    if(dirty){connection.dirty=true;generation++;clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(false),0);}
    refresh();
  }
  function mutateShared(action) {
    const data=structuredClone(sharedData);action(data);
    const previous=new Map(['items','archivedItems','recentlyDeletedItems'].flatMap(key=>sharedData[key].map(item=>[item.id,{key,item}])));
    const now=Date.now();let editor;
    for(const key of ['items','archivedItems','recentlyDeletedItems'])for(const item of data[key]){
      const old=previous.get(item.id);
      if(!old||old.key!==key||JSON.stringify(old.item)!==JSON.stringify(item)){
        editor??=editorIdentity();
        if(!old){item.createdBy={...editor};item.createdByAt=now;}
        else if(old.item.createdBy){item.createdBy=structuredClone(old.item.createdBy);item.createdByAt=old.item.createdByAt;}
        item.lastEditedBy={...editor};item.lastEditedAt=now;item.lastEditedBySource='self-reported';
      }
    }
    applySharedSnapshot(data,{dirty:true});
  }
  function pruneSharedDeleted(data) {
    const now=Date.now(),before=data.recentlyDeletedItems.length;
    data.recentlyDeletedItems=data.recentlyDeletedItems.filter(item=>{
      const deletedAt=Number(item.deletedAt);
      return !Number.isFinite(deletedAt)||deletedAt<=0||now-deletedAt<7*86400000;
    });
    return data.recentlyDeletedItems.length!==before;
  }
  function backfillSharedEditors(data) {
    let changed=false;
    for(const key of ['items','archivedItems','recentlyDeletedItems'])for(const item of data[key]){
      const known=item.lastEditedBy?.name?item.lastEditedBy:editorProfile?.name?editorIdentity():null;
      if(!known)continue;
      if(!item.createdBy){item.createdBy=structuredClone(known);item.createdBySource='legacy-backfill';changed=true;}
      if(!item.lastEditedBy){item.lastEditedBy=structuredClone(known);changed=true;}
      if(!Number.isFinite(item.lastEditedAt)&&Number.isFinite(item.updatedAt)){item.lastEditedAt=item.updatedAt;changed=true;}
    }
    return changed;
  }
  function backfillCachedEditors() {
    if(!connection||connection.needsRead)return;
    const data=structuredClone(sharedData);
    if(backfillSharedEditors(data))applySharedSnapshot(data,{dirty:true});
  }
  function cleanupSharedDeleted() {
    if(!connection)return;
    const data=structuredClone(sharedData);
    if(pruneSharedDeleted(data))applySharedSnapshot(data,{dirty:true});
  }
  function safeEndpoint(value) {
    if(value!==SYNC_ENDPOINT)throw new Error('此裝置曾連線其他同步服務，請先中斷後重新加入');
    return SYNC_ENDPOINT;
  }
  function randomHex(bytes) {return [...crypto.getRandomValues(new Uint8Array(bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
  let creationChallenge='';
  function encodeInvite(c) {
    return btoa(String.fromCharCode(...(c.id+c.token).match(/../g).map(x=>parseInt(x,16)))).replace(/\+/g,'-').replace(/\//g,'_');
  }
  function decodeInvite(value) {
    const code=value.trim();
    if(/^OWNER1\.[A-Za-z0-9_-]{107}$/.test(code)){
      const hex=Array.from(atob(code.slice(7).replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0).toString(16).padStart(2,'0')).join('');
      return [hex.slice(0,32),hex.slice(32,96),hex.slice(96,160)];
    }
    if(/^[A-Za-z0-9_-]{64}$/.test(code)){
      const hex=Array.from(atob(code.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0).toString(16).padStart(2,'0')).join('');
      return [hex.slice(0,32),hex.slice(32)];
    }
    const parts=code.split('.');
    if(parts.length===2&&/^[a-f0-9]{32}$/.test(parts[0])&&/^[a-f0-9]{64}$/.test(parts[1]))return parts;
    throw new Error('請貼上完整邀請碼');
  }
  function openShared() {
    let operating=false,creationReady=false,active=true,challengeId;
    creationChallenge='';
    const invite=connection?encodeInvite(connection):'';
    open('共享同步空間設定',`${connection?`<section class="shared-invite-panel" aria-labelledby="sharedInviteTitle"><h3 id="sharedInviteTitle">共享空間邀請碼</h3><p>家人在另一台裝置選擇「加入共享空間」，貼上此碼即可加入。</p><textarea id="sharedInviteCode" readonly rows="3" aria-label="共享空間邀請碼" spellcheck="false">${esc(invite)}</textarea>${button('copyInvite','複製完整邀請碼')}<p>邀請碼可讀取與修改共享資料，請只交給信任的人。</p></section>`:`<label>用戶名稱（加入時必填）<input id="sharedJoinName" maxlength="30" required autocomplete="nickname" placeholder="例如：小明" value="${esc(editorProfile?.name && editorProfile.name !== '未命名編輯人' ? editorProfile.name : '')}"></label><p id="sharedJoinNameError" role="alert" hidden></p><p>頭像可保持預設，加入後可在共享空間編輯人設定中修改。</p><label>加入家人的共享空間<input id="syncInvite" autocomplete="off" spellcheck="false" placeholder="貼上共享空間邀請碼"></label><p>建立新空間會從空白清單開始；加入空間只載入共享物品。本機物品與設定保持原樣。</p>`}<div class="feature-actions">${connection?button('disconnectSpace','中斷此裝置')+(connection.ownerToken?button('rotateInvite','更新邀請碼')+button('deleteSpace','刪除雲端共享空間'):''):button('createSpace','建立共享空間')+button('joinSpace','加入共享空間')}</div><p id="sharedDetail"></p>`,'shared');
    disposeFeature=()=>{active=false;if(challengeId!==undefined)window.turnstile?.remove(challengeId);};
    const sessionNotice=document.createElement('p');sessionNotice.textContent='此裝置會記住共享連線，關閉瀏覽器後仍可繼續使用。共用裝置使用完畢時，請選擇「中斷此裝置」。';$('sharedDetail').before(sessionNotice);
    if(connection?.ownerToken){
      const recovery='OWNER1.'+btoa(String.fromCharCode(...(connection.id+connection.token+connection.ownerToken).match(/../g).map(x=>parseInt(x,16)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      const panel=document.createElement('section');panel.className='shared-invite-panel';panel.innerHTML='<h3>建立者復原碼</h3><p>請自行保存在安全處。此碼可恢復建立者管理權限，請勿分享給其他成員。</p><textarea id="sharedOwnerRecovery" readonly rows="4" aria-label="建立者復原碼" spellcheck="false"></textarea>'+button('copyOwnerRecovery','複製建立者復原碼');$('sharedDetail').before(panel);$('sharedOwnerRecovery').value=recovery;
      $('copyOwnerRecovery').onclick=caught(async()=>{try{await navigator.clipboard.writeText(recovery);app.toast('建立者復原碼已複製');}catch{$('sharedOwnerRecovery').focus();$('sharedOwnerRecovery').select();app.toast('請複製已選取的建立者復原碼');}});
    }
    if(!connection) {
      $('createSpace').disabled=true;
      const createButton=$('createSpace');
      const joinButton=$('joinSpace'),inviteInput=$('syncInvite');
      const updateActions=()=>{
        if(!active)return;
        createButton.disabled=operating||!creationReady||!!inviteInput.value.trim();
        joinButton.disabled=operating;
      };
      inviteInput.addEventListener('input',updateActions);
      inviteInput.addEventListener('change',updateActions);
      const challenge=document.createElement('div');challenge.id='sharedCreationChallenge';createButton.closest('.feature-actions').before(challenge);
      challenge.textContent='正在確認建立空間的安全驗證…';
      (async()=>{
        const response=await fetch(SYNC_ENDPOINT+'/api/shared-config',{redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw new Error('無法確認安全驗證');
        const config=await response.json();if(!active)return;
        if(config.requireChallenge===false){creationReady=true;updateActions();challenge.remove();return;}
        if(!config.siteKey){challenge.textContent='暫時無法建立共享空間，請稍後再試。仍可加入既有空間。';return;}
        if(!window.turnstile)await new Promise((resolve,reject)=>{
          const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=resolve;script.onerror=reject;document.head.append(script);
        });
        if(!active)return;challenge.textContent='';
        challengeId=window.turnstile.render(challenge,{sitekey:config.siteKey,action:'shared_create',callback:token=>{if(!active)return;creationChallenge=token;creationReady=true;updateActions();},'expired-callback':()=>{if(!active)return;creationChallenge='';creationReady=false;updateActions();},'error-callback':()=>{if(!active)return;creationChallenge='';creationReady=false;updateActions();}});
      })().catch(()=>{if(active)challenge.textContent='無法完成安全驗證，請關閉後重試。';});
      const resetActions=()=>{operating=false;updateActions();};
      $('createSpace').onclick=caught(async()=>{
        if(!active||connection||busy||operating||!creationReady||inviteInput.value.trim())return;
        operating=true;
        $('createSpace').disabled=true;$('joinSpace').disabled=true;
        try {
          connection={endpoint:SYNC_ENDPOINT,id:randomHex(16),token:randomHex(32),ownerToken:randomHex(32),revision:0,dirty:true,isolated:true,connectedAt:Date.now(),status:'待同步'};
          sharedBase=emptyShared();
          try {applySharedSnapshot(emptyShared());}catch(error){connection=null;throw error;}
          generation++;persistConnection();
          await sync(true);
          if(connection?.revision>0){if(active)openShared();}
          else {const reason=connection?.status||'未收到建立成功的回應';connection=null;creationReady=false;creationChallenge='';persistConnection();refresh();const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent='建立未完成：'+reason+'。請關閉後重新驗證再試。';$('sharedCreationChallenge')?.after(notice);app.toast('建立未完成：'+reason);}
        } finally {resetActions();}
      });
      $('joinSpace').onclick=caught(async()=>{
        if(!active||connection||busy||operating)return;
        const nameInput=$('sharedJoinName'),name=nameInput.value.trim();
        const nameError=$('sharedJoinNameError');
        if(!name || name.length>30){
          nameError.textContent='請填寫用戶名稱（最多 30 字）';nameError.hidden=false;
          nameInput.setAttribute('aria-invalid','true');nameInput.focus();return;
        }
        nameError.hidden=true;nameInput.removeAttribute('aria-invalid');
        const [id,token,ownerToken]=decodeInvite($('syncInvite').value);
        const profile={id:editorProfile?.id||crypto.randomUUID(),name,avatar:validAvatar(editorProfile?.avatar)?editorProfile.avatar:''};
        localStorage.setItem(EDITOR_PROFILE,JSON.stringify(profile));editorProfile=profile;
        $('sharedEditorProfileSettings').querySelector('.settings-icon').replaceChildren(editorAvatar(profile));
        $('sharedEditorProfileSettings').querySelector('.settings-desc').textContent=name;
        const next={endpoint:SYNC_ENDPOINT,id,token,...(ownerToken?{ownerToken}:{}),revision:0,dirty:false};
        operating=true;$('createSpace').disabled=true;$('joinSpace').disabled=true;
        try {
        const remote=await request(next,'POST',{revision:0,action:'registerMember'});if(!remote.snapshot)throw new Error('共享空間不存在或邀請碼已失效');
        const data=L.validateSnapshot(remote.snapshot);connection={...next,revision:remote.revision,dirty:false,isolated:true,status:'已同步',lastSyncedAt:Date.now()};
        try {rememberSharedBase(data);applySharedSnapshot(data);}catch(e){connection=null;throw e;}
        generation++;persistConnection();refresh();if(active)openShared();
        } finally {resetActions();}
      });
    } else {
      $('sharedDetail').textContent=`空間 ${connection.id.slice(0,8)} · ${connection.status||'待同步'}${connection.ownerToken?' · 您是建立者':' · 成員'}`;
      $('copyInvite').onclick=caught(async()=>{try{await navigator.clipboard.writeText(invite);app.toast('完整邀請碼已複製');}catch{$('sharedInviteCode').focus();$('sharedInviteCode').select();app.toast('請複製已選取的完整邀請碼');}});
      $('sharedInviteCode').onclick=()=> $('sharedInviteCode').select();
      $('disconnectSpace').onclick=()=>{if(busy){app.toast('請等待同步完成');return;}if(!confirm('中斷此裝置同步？此裝置的共享物品與快取將清空，本機物品與設定不受影響。'))return;resetSharedSpace();};
      if(connection.ownerToken) {
        $('rotateInvite').onclick=caught(async()=>{
          if(busy||conflict)throw new Error('請先完成同步或處理衝突');
          if(!confirm('更新邀請碼後，舊邀請碼立即失效，其他成員需使用新碼重新加入。'))return;
          const current=connection,nextToken=randomHex(32);busy=true;
          try {const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nextToken));
            const result=await request(current,'POST',{revision:current.revision,nextTokenHash:[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')});
            if(result.conflict)throw new Error('雲端已有新資料，請立即同步後再更新邀請碼');
            current.token=nextToken;current.revision=result.revision;persistConnection();openShared();app.toast('邀請碼已更新，舊碼已失效');
          } finally {busy=false;}
        });
        $('deleteSpace').onclick=caught(async()=>{if(busy)throw new Error('請等待同步完成');if(!confirm('確定刪除整個雲端共享空間？所有成員的邀請碼將失效，本機資料保留。'))return;await request(connection,'DELETE');connection=null;sharedData=emptyShared();conflict=null;generation++;persistConnection();dialog.close();refresh();app.toast('共享空間已刪除');});
      }
    }
  }
  async function request(c,method,data) {
    if(!c.editorToken){c.editorToken=randomHex(32);if(c===connection)persistConnection();}
    if(method==='PUT'||data?.action==='registerMember')data={...data,editorProfile:editorIdentity()};
    const response=await fetch(`${safeEndpoint(c.endpoint)}/api/spaces/${c.id}`,{method,headers:{Authorization:'Bearer '+c.token,...(c.ownerToken?{'X-Space-Owner':c.ownerToken}:{}),'X-Editor-Token':c.editorToken,...(method==='PUT'&&c.revision===0&&creationChallenge?{'X-Turnstile-Token':creationChallenge}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
    const body=await response.json().catch(()=>({message:'同步服務回應格式不正確'}));
    if(response.ok&&Array.isArray(body.members)){c.members=body.members;if(c===connection)persistConnection();}
    if(response.status===409)return {...body,conflict:true};
    if(response.status===429){c.retryAfter=Date.now()+Math.max(60,Math.min(3600,Number(response.headers.get('Retry-After'))||60))*1000;throw new Error(body.message||'同步過於頻繁，請稍後再試');}
    if(c===connection && (([401,403].includes(response.status)&&/移除共享空間|邀請碼不正確或已失效/.test(body.message||'')) || [404,410].includes(response.status))) {
      resetSharedSpace();app.toast('已離開共享空間，共享物品已清空');
    }
    if(data?.action==='registerMember'&&((response.status===400&&body.message==='邀請碼格式不正確')||(response.status===403&&body.message==='只有建立者可以更新邀請碼')))throw new Error('雲端共享服務尚未更新，請部署新版後端後再查看成員');
    if(!response.ok){const error=new Error(body.message||'同步失敗，資料保留於本機');error.status=response.status;throw error;}return body;
  }
  let syncFlight=null;
  let syncRetryCount=0;
  function retryPendingSync(current) {
    if(connection!==current||conflict||liveBlockedKey===liveIdentity()||!navigator.onLine||(!current.dirty&&liveRevision<=current.revision))return;
    const delay=Math.max(Math.min(300000,1000*2**Math.min(syncRetryCount++,9)),(current.retryAfter||0)-Date.now());
    clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(false),delay+Math.random()*500);
  }
  function stopLiveUpdates() {
    clearTimeout(liveRetryTimer);clearTimeout(liveHeartbeatTimer);clearTimeout(livePongTimer);
    const socket=liveSocket;liveSocket=null;liveKey='';liveRevision=0;
    if(socket){socket.onclose=null;socket.close();}
  }
  function liveIdentity(){return connection?[connection.endpoint,connection.id,connection.token,connection.ownerToken||''].join('|'):'';}
  function requestLiveRevision() {
    if(connection&&!conflict&&(connection.dirty||liveRevision>connection.revision))sync(false);
  }
  function startLiveUpdates() {
    if(!connection||connection.revision<1||document.hidden||!navigator.onLine){stopLiveUpdates();return;}
    const key=liveIdentity();if(liveBlockedKey===key)return;
    if(liveSocket&&liveKey===key)return;
    if(liveRetryTimer&&liveKey===key)return;
    stopLiveUpdates();liveKey=key;
    const current=connection;let socket;
    try {
      const endpoint=new URL(safeEndpoint(current.endpoint));endpoint.protocol='wss:';endpoint.pathname='/api/spaces/'+current.id;
      socket=new WebSocket(endpoint.href,['expiry-sync','token.'+current.token,...(current.ownerToken?['owner.'+current.ownerToken]:[]),...(current.editorToken?['editor.'+current.editorToken]:[])]);
    } catch {return;}
    liveSocket=socket;
    const heartbeat=()=>{
      if(liveSocket!==socket||socket.readyState!==WebSocket.OPEN)return;
      socket.send('ping');livePongTimer=setTimeout(()=>socket.close(),20000);
    };
    socket.onopen=()=>{if(liveSocket!==socket)return;liveAttempts=0;liveHeartbeatTimer=setTimeout(heartbeat,60000);};
    socket.onmessage=event=>{
      if(liveSocket!==socket||connection!==current||liveIdentity()!==key)return;
      if(event.data==='pong'){clearTimeout(livePongTimer);liveHeartbeatTimer=setTimeout(heartbeat,60000);return;}
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.type==='revision'&&Number.isSafeInteger(message.revision)&&message.revision>0){
        liveRevision=Math.max(liveRevision,message.revision);requestLiveRevision();
      } else if(message.type==='deleted'||message.type==='revoked') {
        resetSharedSpace();app.toast(message.type==='deleted'?'共享空間已刪除，共享物品已清空':'已離開共享空間，共享物品已清空');
      }
    };
    socket.onclose=event=>{
      if(liveSocket!==socket)return;
      liveSocket=null;clearTimeout(liveHeartbeatTimer);clearTimeout(livePongTimer);
      if(event.code===4003||event.code===4004){resetSharedSpace();app.toast('已離開共享空間，共享物品已清空');return;}
      if(connection!==current||document.hidden||!navigator.onLine)return;
      const delay=Math.min(300000,1000*2**Math.min(liveAttempts++,9))+Math.random()*500;
      liveRetryTimer=setTimeout(()=>{liveRetryTimer=null;startLiveUpdates();},delay);
    };
  }
  function sync(manual=false) {
    if(syncFlight)return syncFlight;
    syncFlight=performSync(manual).finally(()=>{
      syncFlight=null;
      if(connection&&!conflict&&!(connection.retryAfter>Date.now())&&['已同步','本機變更待同步'].includes(connection.status)&&liveRevision>connection.revision){clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(false),250);}
    });return syncFlight;
  }
  async function performSync(manual=false) {
    cleanupSharedDeleted();
    if(!connection){if(manual)app.toast('請先在共享空間頁建立或加入空間');return;}
    if(connection.retryAfter>Date.now()){retryPendingSync(connection);if(manual)app.toast('同步暫停，請稍後再試');return;}
    if(busy)return;if(conflict){if(manual)showConflict();return;}
    if(!navigator.onLine){connection.status='離線，變更已保存在本機';persistConnection();refresh();return;}
    busy=true;const current=connection;let again=false;current.status='同步中';refresh();
    try {
      for(let attempt=0;attempt<3;attempt++) {
      const version=generation;
      const payload=current.dirty?{revision:current.revision,snapshot:await sharedSnapshot()}:null;
      const result=await request(current,payload?'PUT':'GET',payload);
      if(connection!==current)return;
      if(result.conflict||(!payload&&result.snapshot&&(generation!==version||current.dirty))) {
        const merged=L.rebaseShared(sharedBase||emptyShared(),sharedData,result.snapshot);
        if(merged.conflicts.length){conflict={...result,conflict:true};current.status='同一物品有其他裝置變更，請處理同步衝突';app.toast(current.status);showConflict();return;}
        applySharedSnapshot(merged.snapshot,{dirty:true});rememberSharedBase(result.snapshot);current.revision=result.revision;current.needsRead=false;
        again=true;continue;
      }
      if(payload){
        current.revision=result.revision;rememberSharedBase(result.snapshot||payload.snapshot);
        if(generation===version){current.dirty=false;if(result.snapshot)applySharedSnapshot(result.snapshot);}
      }
      else if(result.snapshot&&(result.revision!==current.revision||current.needsRead)) {
        rememberSharedBase(result.snapshot);applySharedSnapshot(result.snapshot);current.revision=result.revision;current.needsRead=false;
      } else if(!result.snapshot&&current.revision>0)throw new Error('共享空間已刪除，請中斷後重新建立');
      again=current.dirty;
      if(again)continue;
      break;
      }
      current.status=current.dirty?'本機變更待同步':'已同步';current.lastSyncedAt=Date.now();if(manual)app.toast(current.status);
      syncRetryCount=0;
    } catch(error) {again=false;if(connection===current)current.status=error.message+'；本機資料保留';if(manual||current.dirty)app.toast(error.message);if(![400,401,403,404,410,413,415].includes(error.status))retryPendingSync(current);}
    finally {busy=false;if(connection===current){persistConnection();if(again&&!conflict){clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(false),250);}}refresh();}
  }
  function showConflict() {
    const remote=conflict;if(!remote?.snapshot){app.toast('同步衝突，請稍後再試');return;}
    open('同步衝突',`<p>此裝置的共享資料：${counts(sharedData)}</p><p>雲端共享資料：${counts(L.validateSnapshot(remote.snapshot))}</p><p>合併時同識別碼採用雲端資料。採用雲端資料會取代此裝置尚未同步的共享變更，可先匯出共享備份。</p><div class="feature-actions">${button('conflictBackup','匯出共享備份')}${button('conflictMerge','合併並同步')}${button('conflictRemote','採用雲端資料')}</div>`,'conflict');
    $('conflictBackup').onclick=()=>downloadable(sharedData,'共享空間備份_'+app.today()+'.json');
    $('conflictMerge').onclick=caught(async()=>{applySharedSnapshot(L.mergeSnapshots(sharedData,remote.snapshot),{dirty:true});rememberSharedBase(remote.snapshot);connection.revision=remote.revision;conflict=null;dialog.close();await sync(true);});
    $('conflictRemote').onclick=caught(async()=>{
      const before=generation;rememberSharedBase(remote.snapshot);applySharedSnapshot(remote.snapshot);connection.revision=remote.revision;
      connection.dirty=generation!==before;connection.status=connection.dirty?'本機變更待同步':'已同步';
      connection.lastSyncedAt=Date.now();conflict=null;persistConnection();dialog.close();refresh();
    });
  }
  function sheet(item) {
    if(!item)return;
    $('btnSheetAddShared').hidden=app.sheetScope()==='shared';
    $('btnSheetPending').hidden=app.sheetScope()==='shared';
    const old=$('sheetLifecycleDetails');if(old)old.remove();
    const detail=document.createElement('div');detail.id='sheetLifecycleDetails';detail.className='feature-sheet-detail';
    const dateSource=item.dateSource==='legacy'?'未記錄':L.SOURCES[item.dateSource]||'未記錄';
    detail.textContent=`日期來源：${dateSource}`;
    $('sheetDetailsList').append(detail);
    $('sheetSharedEditor')?.remove();
    if(app.sheetScope()==='shared'){
      const editor=sharedEditorDetails(item);editor.id='sheetSharedEditor';$('sheetDetailsList').append(editor);
    }
  }
  let addingToShared=false;
  $('btnSheetAddShared').onclick=async()=>{
    if(addingToShared||app.sheetScope()!=='local')return;
    if(!connection){openShared();app.toast('請先建立或加入共享空間，再點擊「加入共享空間」');return;}
    const source=app.data().items.find(item=>item.id===app.activeId());if(!source)return;
    const room=connection,category=structuredClone(app.categories()[source.category]||{label:'其他',emoji:'📦',items:[]});
    const copy=structuredClone(source);if(copy.usageState==='pending'){copy.usageState='active';copy.startDate=app.today();copy.plannedStartDate=null;}copy.id=crypto.randomUUID();copy.createdAt=copy.updatedAt=Date.now();
    addingToShared=true;$('btnSheetAddShared').disabled=true;
    try {
      const prepared=await sharedSnapshot({items:[copy],settings:{}});
      if(connection!==room)throw new Error('共享空間已變更，請重新加入物品');
      mutateShared(data=>{
        const record=prepared.items[0],existing=sharedCategories()[copy.category];
        if(!existing||JSON.stringify(existing)!==JSON.stringify(category)) {
          const id='shared_'+crypto.randomUUID(),key='lifespan_tracker_custom_categories_v1',cats=JSON.parse(data.settings[key]||'{}');
          cats[id]=category;data.settings[key]=JSON.stringify(cats);record.category=id;
        }
        data.items.unshift(record);
      });
      app.closeSheet();app.toast('已加入共享空間，本機物品保留');
    } catch(error){app.toast(error.message);}
    finally {addingToShared=false;$('btnSheetAddShared').disabled=false;}
  };
  function sharedCategories() {
    const cats=structuredClone(window.DEFAULT_CATEGORIES||{other:{label:'其他'}});
    for(const key of SHARED_SETTINGS) {
      let values;try {values=JSON.parse(sharedData.settings[key]||(key.includes('deleted')?'[]':'{}'));}catch {continue;}
      if(key.includes('deleted')){for(const id of values)delete cats[id];}
      else for(const [id,value] of Object.entries(values))cats[id]={...cats[id],...value};
    }
    return cats;
  }
  function saveSharedUI() {localStorage.setItem(SHARED_UI,JSON.stringify(sharedUI));renderShared();}
  const sharedSortLabels={custom:'自訂義順序',expiry_asc:'到期日 升冪',expiry_desc:'到期日 降冪',created_desc:'加入時間 降冪',created_asc:'加入時間 升冪',name_asc:'名稱'};
  function openSharedSort() {
    const ids=sharedData.items.map(item=>item.id);
    let order=[...new Set([...(sharedUI.order||[]).filter(id=>ids.includes(id)),...ids])];
    function render() {
      const options=$('sortModalOptionsList').cloneNode(true);
      options.removeAttribute('id');
      for(const card of options.querySelectorAll('[data-sort]')) {
        const mode=card.dataset.sort;
        delete card.dataset.sort;card.dataset.sharedSort=mode;
        card.classList.toggle('active',sharedUI.sort===mode);
        card.setAttribute('aria-pressed',String(sharedUI.sort===mode));
        const description=card.querySelector('.sort-card-desc');
        description.textContent=description.textContent.replaceAll('主頁','共享');
      }
      const nameOption=options.querySelector('[data-shared-sort="created_asc"]').cloneNode(true);
      nameOption.dataset.sharedSort='name_asc';nameOption.classList.toggle('active',sharedUI.sort==='name_asc');nameOption.setAttribute('aria-pressed',String(sharedUI.sort==='name_asc'));
      nameOption.querySelector('.sort-card-title').textContent=sharedSortLabels.name_asc;
      nameOption.querySelector('.sort-card-desc').textContent='依物品名稱排列共享物品';options.append(nameOption);
      const customSection=$('customOrderSection').cloneNode(true);customSection.removeAttribute('id');customSection.style.display=sharedUI.sort==='custom'?'block':'none';
      const customList=customSection.querySelector('.custom-order-items-list');customList.removeAttribute('id');
      customList.innerHTML=order.map((id,index)=>`<div class="order-item-row"><div class="order-item-left"><span class="order-rank-badge">${String(index+1).padStart(2,'0')}</span><span class="order-item-title">${esc(sharedData.items.find(item=>item.id===id)?.name||'')}</span></div><div class="order-item-actions"><button type="button" class="btn-move-order btn-move-up" data-shared-order="${index}" data-step="-1" aria-label="上移" ${index===0?'disabled':''}>▲</button><button type="button" class="btn-move-order btn-move-down" data-shared-order="${index}" data-step="1" aria-label="下移" ${index===order.length-1?'disabled':''}>▼</button></div></div>`).join('');
      open('排序方式與自訂順序',`<p class="modal-section-intro">選擇共享空間物品清單的排列依據與順序：</p>${options.outerHTML}${customSection.outerHTML}`,'sharedSort');
      dialog.querySelectorAll('[data-shared-sort]').forEach(el=>el.onclick=()=>{sharedUI.sort=el.dataset.sharedSort;sharedUI.order=order;saveSharedUI();render();});
      dialog.querySelectorAll('[data-shared-order]').forEach(el=>el.onclick=()=>{const index=Number(el.dataset.sharedOrder),next=index+Number(el.dataset.step);[order[index],order[next]]=[order[next],order[index]];sharedUI.order=order;saveSharedUI();render();});
    }
    render();
  }
  document.querySelectorAll('[data-shared-filter]').forEach(button=>button.onclick=()=>{sharedPillFilter=button.dataset.sharedFilter;renderShared();});
  $('sharedSort').onclick=openSharedSort;
  const sharedSettings=document.createElement('button');
  sharedSettings.type='button';sharedSettings.id='sharedSettingsButton';sharedSettings.setAttribute('aria-label','共享空間設定');sharedSettings.title='共享空間設定';
  sharedSettings.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="18" r="2" fill="currentColor"/></svg>';
  sharedSettings.querySelector('svg').setAttribute('aria-hidden','true');
  const sharedSettingsLabel=document.createElement('span');sharedSettingsLabel.textContent='共享空間設定';sharedSettings.append(sharedSettingsLabel);
  const sharedCountSettings=document.createElement('div');sharedCountSettings.className='shared-count-settings';
  $('sharedSortCount').after(sharedCountSettings);sharedCountSettings.append(sharedSettings,$('sharedSort'));sharedSettings.onclick=openSharedSettings;
  function openSharedSettings() {
    cleanupSharedDeleted();
    const settingsRow=(source,id,title,description,icon)=>{
      const row=$(source).cloneNode(true);row.id=id;
      row.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      row.querySelector('.settings-title').textContent=title;
      row.querySelector('.settings-desc').textContent=description;
      row.querySelector('.trash-badge-count')?.remove();
      if(icon)row.querySelector('.settings-icon').innerHTML=icon;
      return row.outerHTML;
    };
    const manage=settingsRow('btnOpenArchive','sharedSpaceManage','設定共享空間','管理共享空間與邀請碼',sharedSettings.querySelector('svg').outerHTML);
    const archive=settingsRow('btnOpenArchive','sharedArchivedRecords','已封存共享空間物品','永久封存不刪除，隨時可解除封存');
    const deleted=settingsRow('btnOpenRecentlyDeleted','sharedDeletedRecords','最近刪除共享空間物品','保留 7 天內刪除之物品，7 天後自動清除');
    const profile=settingsRow('sharedEditorProfileSettings','sharedEditorProfile','共享空間編輯人',editorProfile?.name||'自訂編輯人名稱與頭像',editorAvatar(editorProfile).outerHTML);
    const members=settingsRow('btnOpenArchive','sharedMembers','查看共享空間成員','查看成員與編輯人資訊','<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.65"/></svg>');
    open('共享空間設定',`<div class="settings-group">${manage}${profile}${members}</div><div class="settings-group">${archive}${deleted}</div><div class="feature-actions">${button('sharedLiveSyncNow','立即同步')}</div>`,'sharedSettings');
    const syncTime=document.createElement('span');syncTime.id='sharedLastSyncTime';syncTime.setAttribute('aria-live','polite');
    $('sharedLiveSyncNow').append(syncTime);updateSharedSyncTime();
    $('sharedLiveSyncNow').onclick=()=>sync(true);
    $('sharedMembers').onclick=openSharedMembers;
    $('sharedEditorProfile').onclick=()=>editProfile(true);
    const deletedCount=sharedData.recentlyDeletedItems.length;
    if(deletedCount){const badge=document.createElement('span');badge.id='sharedTrashBadgeCount';badge.className='trash-badge-count';badge.textContent=deletedCount;badge.setAttribute('aria-label',`最近刪除 ${deletedCount} 項`);$('sharedDeletedRecords').querySelector('.settings-row-actions').prepend(badge);}
    $('sharedSpaceManage').onclick=openShared;
    $('sharedDeletedRecords').onclick=()=>openSharedRecords('deleted');
    $('sharedArchivedRecords').onclick=()=>openSharedRecords('archived');
  }
  async function openSharedMembers() {
    if(!connection){app.toast('請先建立或加入共享空間');return;}
    const current=connection;
    open('共享空間成員','<p id="sharedMembersStatus" role="status">正在載入成員…</p><div id="sharedMemberList"></div>'+button('sharedMembersBack','返回共享空間設定'),'sharedMembers');
    $('sharedMembersBack').onclick=openSharedSettings;
    try {
      const result=await request(current,'POST',{revision:current.revision,action:'registerMember'});
      if(connection!==current||!$('sharedMemberList'))return;
      $('sharedMembersStatus').textContent=`目前 ${result.members.length} 位成員（依裝置）`;
      for(const member of result.members){
        const row=document.createElement('div');row.className='shared-member-row';
        const avatar=document.createElement('button');avatar.type='button';avatar.className='shared-member-avatar';avatar.setAttribute('aria-label','查看 '+member.name+' 的頭貼');avatar.append(editorAvatar(member));
        avatar.onclick=()=>{open(member.name+' 的頭貼','<div id="sharedMemberPortrait"></div>'+button('sharedAvatarBack','返回成員列表'),'sharedMemberAvatar');const portrait=editorAvatar(member);portrait.classList.add('shared-member-portrait');$('sharedMemberPortrait').append(portrait);$('sharedAvatarBack').onclick=openSharedMembers;};
        const label=document.createElement('span');label.textContent=member.name+(member.isOwner?' · 建立者':member.legacy?' · 舊版成員':'');row.append(avatar,label);
        if(current.ownerToken&&!member.isOwner){const remove=document.createElement('button');remove.type='button';remove.className='feature-btn';remove.textContent='移除';remove.onclick=caught(async()=>{if(!confirm('確定移除「'+member.name+'」？此裝置將無法繼續存取共享空間。'))return;remove.disabled=true;try{const result=await request(current,'POST',{revision:current.revision,action:'removeMember',memberId:member.id});if(result.conflict)throw new Error('請同步後重新載入成員');current.needsRead=true;await openSharedMembers();app.toast('成員已移除');}finally{remove.disabled=false;}});row.append(remove);}
        $('sharedMemberList').append(row);
      }
    }catch(error){if($('sharedMembersStatus'))$('sharedMembersStatus').textContent='無法載入成員：'+error.message;}
  }
  function openSharedRecords(filter) {
    cleanupSharedDeleted();
    const room=connection,key=filter==='deleted'?'recentlyDeletedItems':'archivedItems';
    const records=connection?sharedData[key]:[];
    open(filter==='deleted'?'最近刪除共享空間物品':'已封存共享空間物品','<div id="sharedRecordList"></div>'+button('sharedRecordsBack','返回共享空間設定'),'sharedRecords');
    const list=$('sharedRecordList');
    if(!records.length){const empty=document.createElement('p');empty.textContent=filter==='deleted'?'尚無最近刪除的共享物品':'尚無封存的共享物品';list.append(empty);}
    for(const item of records) {
      const row=document.createElement('button');row.type='button';row.className='shared-record-row';
      const timestamp=filter==='deleted'?item.deletedAt:item.archivedAt;
      const date=timestamp?new Date(timestamp).toLocaleDateString('zh-TW'):'';
      row.innerHTML=`<span class="shared-record-icon" aria-hidden="true">${sharedIcon(item)}</span><span class="shared-record-copy"><span class="shared-record-name">${esc(item.name)}</span><span class="shared-record-meta">${esc(sharedCategories()[item.category]?.label||'其他')} · ${filter==='deleted'?'已刪除':'已封存'}${date?' · '+esc(date):''}</span></span><span class="shared-record-chevron" aria-hidden="true">›</span>`;
      row.setAttribute('aria-label','查看'+(filter==='deleted'?'已刪除':'封存')+'共享物品 '+item.name);
      const operator=document.createElement('span');operator.className='shared-record-meta shared-operation';operator.textContent=sharedOperationText(item,filter);row.querySelector('.shared-record-copy').append(operator);
      row.onclick=()=>{if(connection!==room){app.toast('共享空間已變更');openSharedSettings();return;}openSharedRecord(item,filter);};list.append(row);
    }
    $('sharedRecordsBack').onclick=openSharedSettings;
  }
  $('sharedCleanExpired').onclick=cleanExpiredShared;
  $('btnAddSharedEmpty').onclick=()=>openSharedItem();
  function cleanExpiredShared() {
    const room=connection;
    const expired=sharedData.items.filter(item=>item.usageState!=='pending'&&app.metrics(item).hasEndDate&&app.metrics(item).status==='expired');
    if(!room||!expired.length)return;
    confirmShared('清除已過期共享物品',`將 ${expired.length} 項已過期物品移至共享空間的「最近刪除」？`,()=>{
      if(connection!==room)throw new Error('共享空間已變更，請重新操作');
      const now=Date.now(),expiredIds=new Set(expired.map(item=>item.id));
      mutateShared(data=>{
        const moved=data.items.filter(item=>expiredIds.has(item.id)&&item.usageState!=='pending'&&app.metrics(item).hasEndDate&&app.metrics(item).status==='expired');
        if(!moved.length)throw new Error('共享物品狀態已變更，請重新操作');
        data.items=data.items.filter(item=>!expiredIds.has(item.id));
        data.recentlyDeletedItems.unshift(...moved.map(item=>({...item,deletedAt:now})));
      });
      app.toast(`已將 ${expired.length} 項過期共享物品移至最近刪除`);
    });
  }
  function renderShared() {
    const connected=!!connection,cats=sharedCategories(),filter='active';
    const allItems=sharedData.items;
    const expiredCount=allItems.filter(item=>app.metrics(item).hasEndDate&&app.metrics(item).status==='expired').length;
    const urgentCount=allItems.filter(item=>app.metrics(item).hasEndDate&&app.metrics(item).status==='urgent').length;
    $('sharedPillCountAll').textContent=allItems.length;
    $('sharedPillCountUrgent').textContent=urgentCount;
    $('sharedPillCountExpired').textContent=expiredCount;
    document.querySelectorAll('[data-shared-filter]').forEach(button=>button.classList.toggle('active',button.dataset.sharedFilter===sharedPillFilter));
    $('sharedCleanExpired').hidden=!expiredCount;
    const icon=$('sharedNoticeIconWrapper');
    if(expiredCount){
      icon.className='notice-icon-wrapper expired';
      icon.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      $('sharedNoticeTitle').innerHTML=urgentCount?`有 <span class="notice-num expired">${expiredCount}</span> 項已過期、<span class="notice-num urgent">${urgentCount}</span> 項即將到期`:`有 <span class="notice-num expired">${expiredCount}</span> 項已過期`;
    }else if(urgentCount){
      icon.className='notice-icon-wrapper warning';
      icon.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      $('sharedNoticeTitle').innerHTML=`有 <span class="notice-num urgent">${urgentCount}</span> 項即將到期`;
    }else{
      icon.className='notice-icon-wrapper';
      icon.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      $('sharedNoticeTitle').textContent='今天都在週期內';
    }
    $('sharedSortLabel').textContent=sharedSortLabels[sharedUI.sort]||sharedSortLabels.expiry_asc;
    let list=allItems;
    if(sharedPillFilter==='urgent')list=list.filter(item=>app.metrics(item).hasEndDate&&app.metrics(item).status==='urgent');
    else if(sharedPillFilter==='expired')list=list.filter(item=>app.metrics(item).hasEndDate&&app.metrics(item).status==='expired');
    const query=sharedSearch.trim().toLocaleLowerCase();
    list=list.filter(x=>!query||[x.name,x.location,x.notes,cats[x.category]?.label].join(' ').toLocaleLowerCase().includes(query));
    list=app.sortShared(list,sharedUI.sort,sharedUI.order||[]);
    $('sharedSortCount').textContent=sharedPillFilter==='urgent'?`將到期 共 ${list.length} 項物品`:sharedPillFilter==='expired'?`已過期 共 ${list.length} 項物品`:`共 ${list.length} 項物品`;
    const grid=$('sharedItemsGrid');grid.classList.toggle('shared-list-mode',sharedUI.view==='list'||document.documentElement.dataset.screenFit==='tablet');grid.replaceChildren();
    for(const item of list) {
      if(filter==='active') {
        const card=app.sharedCard(item,sharedIcon(item),cats[item.category]?.label||'其他');
        if(item.createdBy){const avatar=editorAvatar(item.createdBy);avatar.title='建立人：'+(item.createdBy.name||'未命名編輯人');avatar.setAttribute('aria-label',avatar.title);avatar.classList.add('shared-card-editor');card.append(avatar);}
        const operator=document.createElement('div');operator.className='shared-operation';operator.textContent=sharedOperationText(item);card.querySelector('.card-summary')?.append(operator);
        card.classList.add('shared-item-card');card.dataset.sharedId=item.id;card.setAttribute('aria-label','管理共享物品 '+item.name);grid.append(card);continue;
      }
      const card=document.createElement('article');card.className='ios-item-card shared-item-card';card.dataset.sharedId=item.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','管理共享物品 '+item.name);
      const status=window.getItemStatusConfig(item,app.today());
      const icon=item.image?`<img src="${esc(item.image)}" class="card-thumb-img" alt="${esc(item.name)}">`:window.getItemIcon(item,window.DEFAULT_CATEGORIES?.[item.category]?null:cats[item.category]?.emoji||'📦');
      const metric=filter==='archived'?({used:'已用完',discarded:'已丟棄'}[item.completionStatus]||'已封存'):filter==='deleted'?'已刪除':filter==='pending'?'待用 · '+(item.plannedStartDate||'未設定開始日'):status.text;
      card.innerHTML=`<div class="card-summary"><div class="card-top-row"><div class="card-icon-box">${icon}</div><span class="card-category-tag">${esc(cats[item.category]?.label||item.category||'其他')}</span></div><div class="card-item-title">${esc(item.name)}</div><div class="card-status-progress"><div class="card-metric-sub ${status.subMetricClass}">${esc(metric)}</div>${filter==='active'?`<div class="card-progress-bar progress-bar-container"><div class="card-progress-fill progress-bar-fill ${status.progressClass}" style="width:${status.width};background-color:${status.color}"></div></div>`:''}</div><div class="shared-card-date">${item.endDate?'到期 '+esc(item.endDate):'未設定到期日'}${item.location?' · '+esc(item.location):''}</div>${item.notes?`<div class="card-note-preview">${esc(item.notes)}</div>`:''}</div>`;
      app.bindCard(card,item.id,()=>filter==='archived'||filter==='deleted'?openSharedRecord(item,filter):app.openSharedSheet(item.id));
      const operator=document.createElement('div');operator.className='shared-operation';operator.textContent=sharedOperationText(item,filter);card.querySelector('.card-summary')?.append(operator);
      card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();filter==='archived'||filter==='deleted'?openSharedRecord(item,filter):app.openSharedSheet(item.id);}};grid.append(card);
    }
    $('sharedEmpty').hidden=list.length>0;
    $('sharedEmpty').style.display=list.length?'none':'flex';
    $('sharedEmptyTitle').textContent=!connected?'建立屬於你們的共享空間':query?'沒有符合條件的物品':sharedPillFilter==='urgent'?'目前沒有將到期的共享物品':sharedPillFilter==='expired'?'目前沒有已過期的共享物品':'尚無共享物品';
    $('sharedEmptyDescription').textContent=!connected?'建立新空間，或使用邀請碼加入家人的空間。':query?'試試其他名稱或分類。':'點擊「＋」新增物品，和家人一起管理。';
    app.resizePage();
  }
  function quickShared(text) {
    const parsed=window.parseNaturalInput(text,new Date(),structuredClone(sharedData.items),null);
    if(!parsed?.success){app.toast('請輸入共享物品名稱');return;}
    window.openNlpConfirmModal({...parsed,destination:'shared'});
  }
  let editorRoom=null,editorRecord=null,resetConfirmation=null;
  function prepareSharedEditor() {
    if(!connection){openShared();app.toast('請先建立或加入共享空間');return false;}
    editorRoom=connection;editorRecord=null;
    return true;
  }
  function sharedIcon(item,imageClass='card-thumb-img') {
    if(item.image)return `<img src="${esc(item.image)}" class="${esc(imageClass)}" alt="${esc(item.name||'物品')}">`;
    const cats=sharedCategories();
    return window.getItemIcon(item,window.DEFAULT_CATEGORIES?.[item.category]?null:cats[item.category]?.emoji||'📦');
  }
  function openSharedPicker(entry) {
    open(entry.detail?'選擇細項':'選擇分類','<div class="icon-picker-options" role="listbox" aria-labelledby="featureDialogTitle"></div>','sharedPicker');
    const list=dialog.querySelector('[role="listbox"]');
    for(const option of entry.select.options) {
      const row=document.createElement('button');row.type='button';row.className='icon-picker-option';row.setAttribute('role','option');row.disabled=option.disabled;
      row.setAttribute('aria-selected',String(option.selected));row.tabIndex=option.selected?0:-1;
      const icon=sharedIcon({category:entry.detail?entry.category.value:option.value,subCategory:entry.detail?option.value:''});
      row.innerHTML=`<span>${icon}</span><span>${esc(option.textContent.replace(/^➕\s*/,''))}</span><span class="icon-picker-check" aria-hidden="true">${option.selected?'✓':''}</span>`;
      row.onclick=()=>{entry.select.value=option.value;dialog.close().then(()=>{entry.select.dispatchEvent(new Event('input',{bubbles:true}));entry.select.dispatchEvent(new Event('change',{bubbles:true}));window.syncIconPickers?.();});};
      list.append(row);
    }
    list.onkeydown=event=>{const rows=[...list.querySelectorAll('button:not(:disabled)')];let index=rows.indexOf(document.activeElement);if(event.key==='ArrowDown')index=(index+1)%rows.length;else if(event.key==='ArrowUp')index=(index-1+rows.length)%rows.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=rows.length-1;else return;event.preventDefault();rows.forEach((row,i)=>row.tabIndex=i===index?0:-1);rows[index]?.focus();};
    const selected=list.querySelector('[aria-selected="true"]')||list.querySelector('button');selected?.focus();selected?.scrollIntoView({block:'nearest'});
  }
  function openSharedItem(input={}) {
    if(!connection){if(!dialog.open||dialogPurpose!=='shared')openShared();return;}
    if($('itemModal').style.display==='flex'&&!Object.keys(input).length)return;
    editorRoom=connection;
    const existing=sharedData.items.find(x=>x.id===(input.targetId||input.id));
    editorRecord=existing?structuredClone(existing):null;
    if(existing)app.openSharedEditor({...existing,...input,id:existing.id});
    else if(Object.keys(input).length)app.openSharedEditor({...input,id:'',endDate:input.expiryDate||input.endDate||null,packageEndDate:input.expiryDate||input.endDate||null,hasEndDate:!!(input.expiryDate||input.endDate),dateSource:input.isEstimated||input.autoInferred?.hasEndDate?'estimated':input.expirySource==='package'?'package':'manual',reminderType:input.reminderType||'none',history:[],startDate:input.startDate||app.today()});
    else app.openSharedEditor(null);
  }
  function saveSharedItem(record) {
    if(record.usageState==='pending'){record={...record,usageState:'active',startDate:record.startDate||app.today(),plannedStartDate:null};}
    if(connection!==editorRoom)throw new Error('共享空間已變更，請重新開啟物品');
    const current=sharedData.items.find(x=>x.id===record.id);
    if(editorRecord&&JSON.stringify(current)!==JSON.stringify(editorRecord))throw new Error('此物品已在其他裝置變更，請重新開啟');
    mutateShared(data=>{const next={...current,...record,history:current?.history||[],createdAt:current?.createdAt||Date.now(),updatedAt:Date.now()};const index=data.items.findIndex(x=>x.id===next.id);if(index<0)data.items.unshift(next);else data.items[index]=next;});
    editorRecord=structuredClone(sharedData.items.find(x=>x.id===record.id));
  }
  function confirmShared(title,message,action) {
    open(title,`<p>${esc(message)}</p><div class="feature-actions">${button('sharedConfirmCancel','取消')}${button('sharedConfirmApply','確認')}</div>`,'sharedConfirm');
    $('sharedConfirmCancel').onclick=()=>dialog.close();
    $('sharedConfirmApply').onclick=caught(()=>{action();dialog.close();});
  }
  function sharedAction(action,id=app.activeId()) {
    const room=connection,item=sharedData.items.find(x=>x.id===id);if(!room||!item)return;
    const content=record=>{if(!record)return null;const copy={...record};for(const key of ['createdBy','createdByAt','createdBySource','lastEditedBy','lastEditedAt','lastEditedBySource'])delete copy[key];return JSON.stringify(copy);};
    const ensure=()=>{if(connection!==room)throw new Error('共享空間已變更');if(content(sharedData.items.find(x=>x.id===id))!==content(item))throw new Error('物品已在其他裝置變更，請重新開啟');};
    const update=change=>{ensure();mutateShared(data=>{const record=data.items.find(x=>x.id===id);change(record,data);record.updatedAt=Date.now();});};
    const finish=()=>{app.closeSheet();if($('itemModal').style.display==='flex'&&app.editorScope()==='shared')app.closeEditor();};
    if(action==='edit'){app.closeSheet();openSharedItem(item);return;}

    if(action==='duplicate') {
      ensure();mutateShared(data=>{const cloned=structuredClone(item);cloned.id=crypto.randomUUID();cloned.name+=' (複製)';cloned.createdAt=cloned.updatedAt=Date.now();cloned.history=[];cloned.openedDate=null;cloned.snoozedUntil=null;cloned.dateSource='manual';if(cloned.usageState!=='pending'){cloned.startDate=app.today();if(cloned.hasEndDate)cloned.endDate=L.offset(app.today(),parseInt(cloned.durationDays,10)||180);}else{cloned.startDate=null;cloned.durationDays=null;}cloned.packageEndDate=cloned.endDate;data.items.unshift(L.normalize(cloned));});finish();app.toast('已複製共享物品');return;
    }
    if(action==='pending')return;
    if(action==='start') {
      const start=item.plannedStartDate||app.today();
      if(start>app.today()){app.toast('開始日期尚未到，可在「編輯物品資訊」修改');return;}
      if(item.endDate&&item.endDate<start){app.toast('到期日期早於開始日期，請先修改');return;}
      update(record=>{record.usageState='active';record.startDate=start;record.plannedStartDate=null;if(record.openedShelfDays&&!record.openedDate)record.openedDate=app.today();record.durationDays=record.endDate?Math.max(1,Math.round((Date.parse(record.endDate)-Date.parse(start))/86400000)):null;L.normalize(record);});sharedUI.filter='active';saveSharedUI();finish();app.toast('已開始使用');return;
    }
    if(action==='reset') {
      if(!resetConfirmation||resetConfirmation.id!==id||resetConfirmation.until<Date.now()||!$('btnSheetReset').classList.contains('confirm-active')) {resetConfirmation={id,until:Date.now()+4000};$('btnSheetResetText').textContent='確定重設？再次點擊確認';$('btnSheetReset').classList.add('confirm-active');app.toast('請再次點擊以確認重設週期');setTimeout(()=>{if(resetConfirmation?.id===id&&resetConfirmation.until<=Date.now()){resetConfirmation=null;if(app.sheetScope()==='shared'&&app.activeId()===id){$('btnSheetResetText').textContent='重設週期';$('btnSheetReset').classList.remove('confirm-active');}}},4000);return;}
      resetConfirmation=null;
      update(record=>{record.history=[...(record.history||[]),{resetDate:app.today(),daysUsed:app.metrics(record).elapsedDays,note:'定期換新/重新開始'}];record.startDate=app.today();if(record.hasEndDate)record.endDate=L.offset(app.today(),Number(record.durationDays)||180);record.packageEndDate=record.endDate;record.openedDate=record.openedShelfDays?app.today():null;record.dateSource='manual';record.snoozedUntil=null;L.normalize(record);});finish();app.toast('已重設共享物品週期');
      return;
    }
    if(['archive','delete'].includes(action)) {
      const deleting=action==='delete';
      confirmShared(deleting?'刪除物品':'封存物品',deleting?`將「${item.name}」移至最近刪除？`:`確定將「${item.name}」保存至封存紀錄？`,()=>{update((record,data)=>{data.items=data.items.filter(x=>x.id!==id);if(deleting)data.recentlyDeletedItems.unshift({...record,deletedAt:Date.now()});else data.archivedItems.unshift({...record,archivedAt:Date.now()});});finish();app.toast(deleting?'已移至共享最近刪除':'已保存至共享封存紀錄');});
    }
  }
  const sharedCommands={btnSheetEdit:'edit',btnSheetReset:'reset',btnSheetDuplicate:'duplicate',btnSheetPending:'pending',btnSheetStart:'start',btnSheetArchive:'archive',btnSheetDelete:'delete'};
  document.addEventListener('click',event=>{
    const control=event.target.closest('button');if(!control)return;
    if(control.id==='btnModalDeleteItem'&&app.editorScope()==='shared'&&$('itemModal').style.display==='flex'){event.preventDefault();event.stopImmediatePropagation();sharedAction('delete',app.editorId());return;}
    if(app.sheetScope()!=='shared'||$('actionSheet').style.display!=='flex'||!sharedCommands[control.id])return;
    event.preventDefault();event.stopImmediatePropagation();try{sharedAction(sharedCommands[control.id]);}catch(error){app.toast(error.message);}
  },true);
  function openSharedRecord(item,filter) {
    const room=connection;
    open('共享物品紀錄',`<h3>${esc(item.name)}</h3><p>${esc(item.location||'')} ${esc(item.notes||'')}</p><p>${filter==='deleted'?'刪除':'封存'}時間：${new Date(item.deletedAt||item.archivedAt).toLocaleString('zh-TW',{hour12:false})}</p>${button('sharedRecordRestore','還原至共享物品')}${button('sharedRecordBack','返回清單')}`,'sharedRecord');
    const operator=document.createElement('p');operator.className='shared-operation';operator.textContent=sharedOperationText(item,filter);
    $('sharedRecordRestore').before(operator,sharedEditorDetails(item));
    $('sharedRecordBack').onclick=()=>openSharedRecords(filter);
    $('sharedRecordRestore').onclick=caught(()=>{if(connection!==room)throw new Error('共享空間已變更');mutateShared(data=>{const list=filter==='deleted'?data.recentlyDeletedItems:data.archivedItems,index=list.findIndex(x=>x.id===item.id);if(index<0)throw new Error('紀錄已變更');const [record]=list.splice(index,1);for(const key of ['deletedAt','archivedAt','completedAt','completionStatus'])delete record[key];record.updatedAt=Date.now();data.items.unshift(record);});dialog.close();});
  }
  function openSharedCategories() {
    const room=connection,cats=sharedCategories();
    open('共享分類',`<p>${Object.values(cats).map(x=>esc(x.label)).join(' · ')}</p><label>新增共享分類<input id="sharedCategoryName" maxlength="60" placeholder="例如：公共備品"></label>${button('sharedCategoryAdd','新增分類')}`,'sharedCategories');
    $('sharedCategoryAdd').onclick=caught(()=>{if(connection!==room)throw new Error('共享空間已變更');const name=$('sharedCategoryName').value.trim();if(!name)throw new Error('請輸入分類名稱');const id='shared_'+crypto.randomUUID();mutateShared(data=>{const key='lifespan_tracker_custom_categories_v1',cats=JSON.parse(data.settings[key]||'{}');cats[id]={label:name,emoji:'📦',items:[]};data.settings[key]=JSON.stringify(cats);});app.selectSharedCategory(id);openSharedCategories();});
  }
  function updateSharedSyncTime() {
    const label=$('sharedLastSyncTime');if(!label)return;
    label.textContent=connection?.lastSyncedAt
      ? '上次同步：'+new Date(connection.lastSyncedAt).toLocaleString('zh-TW',{hour12:false,timeZone:'Asia/Taipei'})
      : '尚未同步';
  }
  function refresh() {
    updateSharedSyncTime();
    const list=document.documentElement.dataset.screenFit==='tablet';document.body.classList.toggle('compact-list-mode',list);
    const last=read(BACKUP,null);$('lastBackupText').textContent=last?'上次備份：'+new Date(last).toLocaleString('zh-TW',{hour12:false}):'尚未備份，建議定期匯出';
    $('syncStatus').textContent=connection?(connection.status||'待同步')+(connection.lastSyncedAt?' · '+new Date(connection.lastSyncedAt).toLocaleString('zh-TW',{hour12:false}):''):'尚未連線；資料儲存在本機';
    renderShared();
    startLiveUpdates();
  }
  document.addEventListener('expiry-data-change',changed);
  window.addEventListener('online',()=>{startLiveUpdates();if(connection?.dirty)sync(false);});
  window.addEventListener('offline',stopLiveUpdates);
  window.addEventListener('pagehide',stopLiveUpdates);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLiveUpdates();else {startLiveUpdates();if(connection?.dirty)sync(false);}});
  cleanupSharedDeleted();backfillCachedEditors();refresh();if(connection)setTimeout(()=>sync(false),500);
  return {snapshot,backup,previewImport,fillForm,validateForm,decorate,refresh,sheet,changed,sync,applySnapshot,openSharedItem,prepareSharedEditor,quickShared,sharedSnapshot:()=>structuredClone(sharedData),applySharedSnapshot,sharedCategories,sharedIcon,saveSharedItem,sharedAction,openSharedCategories,openSharedPicker};
};
