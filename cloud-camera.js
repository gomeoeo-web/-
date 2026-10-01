// 1.9.18 — public endpoint only; no API key or developer password in the app.
const ENDPOINT = 'https://expiry-ai.gomeoeo.workers.dev/api/recognize';
const CONSENT_KEY = 'expiry_cloud_photo_consent_openai_v2';

export function defaultPhotoReminder(expiryDate, now = new Date()) {
  const defaults = {remindDaysBefore:3,remindTime:'09:00'};
  if (!dateOrNull(expiryDate,true)) return defaults;
  const [year,month,day] = expiryDate.split('-').map(Number);
  const daysLeft = Math.round((Date.UTC(year,month-1,day) - Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())) / 86400000);
  if (daysLeft >= 3) return defaults;
  const disabled = {remindDaysBefore:-1,remindTime:null};
  if (daysLeft < 0) return disabled;
  // Future dates use the start of expiry day; today's expiry uses end of day.
  const deadline = daysLeft === 0 ? new Date(year,month-1,day,23,59) : new Date(year,month-1,day);
  let reminder = new Date(year,month-1,day-1,9);
  if (reminder <= now) {
    reminder = new Date(Math.floor((now.getTime()+deadline.getTime()) / 2 / 60000) * 60000);
    if (reminder <= now) reminder = new Date(Math.ceil((now.getTime()+1) / 60000) * 60000);
  }
  if (reminder >= deadline) return disabled;
  const date = `${reminder.getFullYear()}-${String(reminder.getMonth()+1).padStart(2,'0')}-${String(reminder.getDate()).padStart(2,'0')}`;
  const time = `${String(reminder.getHours()).padStart(2,'0')}:${String(reminder.getMinutes()).padStart(2,'0')}`;
  return {remindDaysBefore:Math.round((Date.UTC(year,month-1,day) - Date.UTC(reminder.getFullYear(),reminder.getMonth(),reminder.getDate())) / 86400000),
    remindTime:time,reminderDate:date,hasCustomTime:true};
}

function updateConsentButton() {
  if (typeof document === 'undefined') return;
  const button = document.getElementById('btnRevokeCloudPhotoConsent');
  if (!button) return;
  let accepted = false;
  try { accepted = localStorage.getItem(CONSENT_KEY) === 'yes'; } catch {}
  button.hidden = !accepted;
}

let activeRecognitionController = null;
let isRecognizing = false;
// Session-only exact-image cache. Never stores photographs or uses fuzzy matches
// which might confuse identical packaging with a different expiry date.
const recognitionCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
let cacheGeneration = 0;
export function clearRecognitionCache() {
  recognitionCache.clear();
  cacheGeneration++;
}
async function imageFingerprint(blob) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function isCloudCameraBusy() {
  return isRecognizing || !!activeRecognitionController;
}

export function setCloudCameraBusy(busy) {
  if (typeof document === 'undefined') return;
  const shutterBtn = document.getElementById('btnCameraShutter');
  const albumBtn = document.getElementById('btnCameraAlbum');
  const confirmBtn = document.getElementById('btnApplyNlpConfirm');
  const consentAcceptBtn = document.querySelector('[data-accept]');

  const targets = [shutterBtn, albumBtn, confirmBtn, consentAcceptBtn].filter(Boolean);
  targets.forEach(btn => {
    btn.disabled = !!busy;
    btn.classList.toggle('disabled', !!busy);
    btn.classList.toggle('loading', !!busy);
    if (busy) {
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.removeAttribute('aria-disabled');
    }
  });
}

export function cancelCurrentRecognition() {
  if (activeRecognitionController) {
    try {
      activeRecognitionController.abort();
    } catch (err) {
      console.log('取消辨識中斷：', err);
    }
    activeRecognitionController = null;
  }
  isRecognizing = false;
  setCloudCameraBusy(false);
  if (typeof document !== 'undefined') {
    const hud = document.getElementById('aiScanLoadingModal');
    if (hud) {
      hud.classList.remove('active');
      hud.style.display = 'none';
    }
    if (typeof window !== 'undefined' && typeof window.unlockBodyScroll === 'function') {
      window.unlockBodyScroll();
    }
  }
}

async function consent(signal) {
  try { if (localStorage.getItem(CONSENT_KEY) === 'yes') return true; } catch {}
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'cloud-consent-overlay';
    overlay.innerHTML = '<section class="cloud-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="cloudConsentTitle"><h2 id="cloudConsentTitle">使用雲端照片辨識</h2><p>選擇的照片會傳送至 Cloudflare 與 OpenAI GPT‑6 Luna，協助讀取商品和日期。本 App 後端不儲存照片；供應商依服務方案處理資料。</p><p>辨識可能出錯，儲存前請確認名稱與日期。你也可以選擇手動填寫。</p><button type="button" data-accept>同意並辨識</button><button type="button" data-cancel>改用手動填寫</button></section>';
    let finished = false;
    const onAbort = () => finish(false);
    const priorBodyOverflow = document.body.style.overflow;
    const onKeyDown = event => { if (event.key === 'Escape') finish(false); };
    const finish = value => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = priorBodyOverflow;
      overlay.remove();
      resolve(value);
    };
    const acceptBtn = overlay.querySelector('[data-accept]');
    const cancelBtn = overlay.querySelector('[data-cancel]');
    acceptBtn.onclick = () => {
      acceptBtn.disabled = true;
      acceptBtn.classList.add('loading');
      if (cancelBtn) cancelBtn.disabled = true;
      try { localStorage.setItem(CONSENT_KEY, 'yes'); } catch {}
      updateConsentButton();
      finish(true);
    };
    cancelBtn.onclick = () => finish(false);
    overlay.addEventListener('click', event => { if (event.target === overlay) finish(false); });
    document.body.style.overflow = 'hidden';
    document.body.append(overlay);
    document.addEventListener('keydown', onKeyDown);
    acceptBtn.focus({ preventScroll: true });
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) finish(false);
  });
}

function dateOrNull(value, evidence) {
  if (!evidence || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

export async function resizeCanvasToBlob(canvas, maxDimension = 1024, quality = 0.7) {
  let targetCanvas = canvas;
  if (typeof document !== 'undefined' && canvas && (canvas.width > maxDimension || canvas.height > maxDimension)) {
    const maxSide = Math.max(canvas.width, canvas.height);
    const scale = maxDimension / maxSide;
    const targetWidth = Math.round(canvas.width * scale);
    const targetHeight = Math.round(canvas.height * scale);
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = targetWidth;
    resizedCanvas.height = targetHeight;
    const ctx = resizedCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      targetCanvas = resizedCanvas;
    }
  }
  return new Promise(resolve => targetCanvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function recognizeCanvas(canvas, photoDataUrl) {
  if (isCloudCameraBusy()) throw new Error('正在辨識，請稍候。');
  activeRecognitionController = new AbortController();
  const controller = activeRecognitionController;
  const generation = cacheGeneration;
  isRecognizing = true;
  setCloudCameraBusy(true);
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    if (!await consent(controller.signal)) throw new Error('已選擇手動填寫，照片未上傳。');
    if (controller.signal.aborted) {
      const abortErr = new Error('辨識已取消');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    setCloudCameraBusy(true);
    // 768px keeps product labels readable while reducing vision input tokens.
    const blob = await resizeCanvasToBlob(canvas, 768, 0.7);
    if (controller.signal.aborted) {
      const abortErr = new Error('辨識已取消');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('照片太大，請靠近單一商品再拍一次。');
    const fingerprint = await imageFingerprint(blob);
    if (controller.signal.aborted) throw new DOMException('辨識已取消', 'AbortError');
    for (const [key, value] of recognitionCache) if (Date.now() - value.at >= CACHE_TTL) recognitionCache.delete(key);
    const cached = fingerprint && recognitionCache.get(fingerprint);
    let payload;
    if (cached) {
      payload = { success: true, result: structuredClone(cached.result) };
    } else {
      if (!navigator.onLine) throw new Error('目前沒有網路，請手動填寫或連線後重新拍照。');
      if (window.getSmartLensQuotaInfo?.().remaining <= 0) throw new Error('今日智慧鏡頭辨識額度已達上限，請明天再試或手動填寫。');
      window.consumeSmartLensQuota?.();
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob, signal: controller.signal, credentials: 'omit' });
      try {
        payload = await response.json();
      } catch {
        if (controller.signal.aborted) throw new DOMException('辨識已取消', 'AbortError');
        throw new Error('辨識服務尚未就緒，請先手動填寫。');
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || '辨識暫時無法完成，請手動填寫。');
    }
    if (controller.signal.aborted) throw new DOMException('辨識已取消', 'AbortError');
    const result = payload.result;
    if (!result || typeof result.recognized !== 'boolean' || typeof result.name !== 'string') throw new Error('辨識結果不完整，請手動確認。');
    if (!cached && fingerprint && generation === cacheGeneration && result.recognized && result.name.trim()) {
      // Keep only small validated results, never errors or unrecognized images.
      if (recognitionCache.size >= 8) recognitionCache.delete(recognitionCache.keys().next().value);
      recognitionCache.set(fingerprint, { at: Date.now(), result: structuredClone(result) });
    }
    const matched = window.matchCategoryAndSubCategory?.(result.name || '');
    const modelCategory = Object.hasOwn(window.DEFAULT_CATEGORIES || {}, result.category)
      ? result.category
      : 'other';
    // Prefer a concrete local name match over the model's broad visual guess.
    // For example, a name containing "光泉鮮乳" is a dairy product even when
    // the image model labels the package as fresh produce ("fresh").
    const category = matched?.category && matched.category !== 'other'
      ? matched.category
      : (modelCategory !== 'other' ? modelCategory : (matched?.category || 'other'));
    const printedDate = dateOrNull(result.expiryDate, result.expiryEvidence);
    const shelfLife = result.recognized && ['food','fresh','drinks','snack'].includes(category)
      ? result.shelfLife : null;
    let estimate = null;
    if (!printedDate && Number.isInteger(shelfLife?.days) && shelfLife.days >= 1 && shelfLife.days <= 365 &&
        ['unopened_estimate','purchased_today'].includes(shelfLife.basis) && typeof shelfLife.conditions === 'string' &&
        shelfLife.conditions.trim() && typeof shelfLife.evidence === 'string' && shelfLife.evidence.trim()) {
      try {
        const source = new URL(shelfLife.sourceUrl);
        if (source.protocol === 'https:' && !source.username && !source.password) {
          const today = new Date();
          const startDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
          const end = new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()+shelfLife.days));
          estimate = {...shelfLife,startDate,expiryDate:end.toISOString().slice(0,10),sourceUrl:source.href};
        }
      } catch {}
    }
    // Keep a useful product name even when the model cannot map it to a
    // category. The confirmation dialog will use `other` instead of dropping
    // the name and forcing the user to type it again.
    const name = result.name.trim().slice(0, 100) || '未辨識物品';
    const subCategory = (matched && matched.category === category) ? (matched.subCategory || '') : '';
    const autoInferred = window.inferItemLifespanOrUsageDate?.(name, category, subCategory);
    if (!printedDate && !estimate && result.recognized && ['food','fresh','drinks','snack'].includes(category)) {
      // A local reminder estimate also works with older cloud responses that
      // contain no search metadata. Never present it as a searched batch date.
      const dairy = /鮮乳|鮮奶|牛奶|牛乳|生乳|全脂乳|低脂乳/.test(name) && !/保久|長效|ESL|奶粉|餅乾|糖果|調味|優酪|豆/.test(name);
      const kuangChuanMilk = dairy && /光泉.*(?:鮮乳|鮮奶)/.test(name);
      const defaultDays = {food:7,fresh:3,drinks:7,snack:30}[category];
      const days = dairy ? (kuangChuanMilk ? 13 : 12) : (Number.isInteger(autoInferred?.durationDays) && autoInferred.durationDays > 0
        ? Math.min(autoInferred.durationDays,defaultDays) : defaultDays);
      const today = new Date();
      const startDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const end = new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()+days));
      estimate = {days,startDate,expiryDate:end.toISOString().slice(0,10),basis:dairy ? 'unopened_estimate' : 'purchased_today',
        conditions:dairy ? '未開封冷藏；暫以今天起算，實際有效日期以瓶身為準。' : '暫以今天購買且新鮮起算，請依包裝保存方式。',
        evidence:kuangChuanMilk ? '光泉官網列示一般光泉鮮乳冷藏保存13天，為總保存期限，非此瓶剩餘天數。' : '依食品類型的大致提醒天數，非即時網路搜尋結果。',
        sourceUrl:kuangChuanMilk ? 'https://www.kuangchuan.com.tw/Product/Milk' : null,
        sourceTitle:kuangChuanMilk ? '光泉鮮乳產品資料' : null,sourceType:kuangChuanMilk ? 'reference' : 'local'};
    }
    const expiryDate = printedDate || estimate?.expiryDate || null;
    const localEstimate = !!estimate && (!estimate.sourceUrl || !!estimate.sourceType);
    const estimateNotice = estimate ? `估算到期日：${expiryDate}（約 ${estimate.days} 天）。\n${estimate.basis === 'unopened_estimate' ? '未開封，暫以今天起算；以包裝日期為準。' : '暫以今天購買起算；以包裝日期為準。'}` : '';
    const notes = printedDate ? '日期原文：' + result.expiryEvidence.slice(0,300)
      : estimate ? `${estimateNotice}\n保存條件：${estimate.conditions}\n參考依據：${estimate.evidence}\n此日期為提醒估算，非包裝有效期限。${estimate.sourceUrl ? `\n來源：${estimate.sourceTitle || '食品保存指引'} ${estimate.sourceUrl}` : ''}` : '';
    return { success: true, source: cached ? 'cloud-cache' : 'cloud', name, category, subCategory, autoInferred,
      isEstimated:!!estimate,expirySource:printedDate ? 'package' : estimate ? (localEstimate ? 'local' : 'web') : null,
      shelfLife:estimate,startDate:estimate?.startDate,
      emoji: window.DEFAULT_CATEGORIES?.[category]?.emoji || matched?.emoji || '📦', expiryDate, hasEndDate: !!expiryDate, ...defaultPhotoReminder(expiryDate), image: photoDataUrl,
      recognitionNotice: [result.recognized ? '' : '暫定名稱，請確認物品名稱。', category === 'other' ? '分類暫選「其他」。' : '', printedDate ? '到期日：' + expiryDate + '，請核對包裝。' : estimateNotice || (result.shelfLifeStatus === 'unavailable' ? '未讀到效期，也未取得可靠的網路保存期限，請核對包裝或手動設定。' : '未讀到效期，請手動設定。'), typeof result.uncertainty === 'string' ? result.uncertainty.slice(0, 200) : ''].filter(Boolean).join('\n'),
      notes };
  } catch (error) {
    if (error.name === 'AbortError' || controller.signal.aborted) {
      console.log('辨識已主動中斷或取消：', error.message || 'AbortError');
      const abortErr = new Error('辨識已取消');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    if (error instanceof TypeError) throw new Error('無法連線至辨識服務，請確認網路或稍後重試。');
    throw error;
  } finally {
    clearTimeout(timer);
    if (activeRecognitionController === controller) {
      activeRecognitionController = null;
      isRecognizing = false;
      setCloudCameraBusy(false);
    }
  }
}

if (typeof window !== 'undefined') {
  window.recognizeCloudCamera = recognizeCanvas;
  window.resizeCanvasToBlob = resizeCanvasToBlob;
  window.isCloudCameraBusy = isCloudCameraBusy;
  window.setCloudCameraBusy = setCloudCameraBusy;
  window.cancelCurrentRecognition = cancelCurrentRecognition;
  window.revokeCloudPhotoConsent = () => {
    cancelCurrentRecognition();
    clearRecognitionCache();
    try { localStorage.removeItem(CONSENT_KEY); } catch {}
    updateConsentButton();
    alert('已撤回雲端照片同意。下次拍照辨識會重新詢問。');
  };
  updateConsentButton();
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateConsentButton, { once: true });
  }
  window.addEventListener?.('storage', event => {
    if (event.key === CONSENT_KEY || event.key === null) updateConsentButton();
  });
}
