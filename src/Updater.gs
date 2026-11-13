/**
 * Updater.gs — ระบบอัปเดตโค้ดจาก GitHub (ใช้ร่วมกันได้หลายแอพ: คัดลอกไฟล์นี้ไปวางทั้งไฟล์)
 *
 * ต้องมีในโปรเจกต์ของแอพ (ฟังก์ชัน/ค่าที่ไฟล์นี้เรียกใช้):
 *   APP_VERSION, APP_DATE          ค่าคงที่เลขเวอร์ชัน/วันที่ของแอพ (ไฟล์นี้ไม่ประกาศเอง)
 *   authOwner_(pin)                ตรวจว่าเป็นเจ้าของ (throw ถ้าไม่ใช่)
 *   set_()                         คืน object ค่าตั้งค่า ต้องมีช่อง update_url (ลิงก์ version.json)
 *   rows_(name), sh_(name), withLock_(fn), bust_()   ตัวช่วยชีตของแอพ (ใช้ใน saveUpdateUrl)
 *   audit_(type, a, b)             บันทึกประวัติ (จะลบบรรทัดที่เรียกก็ได้)
 * ฟังก์ชันที่หน้าเว็บ/เมนูเรียก: checkUpdate(pin, force) · applyUpdate(pin) · checkReady(pin) · saveUpdateUrl(pin, url)
 * ฟังก์ชันที่เมนูในชีตเรียก (Menu.gs): updCheck_(force) · updApply_() · updReadiness_()
 * อย่าประกาศชื่อเหล่านี้ซ้ำในไฟล์อื่น (โดยเฉพาะ const) — ไม่งั้นขึ้น "Identifier ... has already been declared"
 * สิทธิ์ที่ต้องมีใน appsscript.json: script.projects, script.deployments, script.external_request
 * ต้องผูกสคริปต์กับโปรเจกต์ Google Cloud มาตรฐาน + เปิด Apps Script API (ดู README หัวข้อ "ตั้งค่าครั้งเดียว")
 */
function verCmp_(a, b) { const p = v => String(v == null ? '' : v).replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0), x = p(a), y = p(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; }
function saveUpdateUrl(pin, url) { // บันทึกลิงก์ไฟล์เวอร์ชันแยกจากฟอร์มตั้งค่าอื่น (ใช้กับปุ่ม "ตรวจเวอร์ชันใหม่")
  authOwner_(pin); const u = String(url == null ? '' : url).trim();
  if (u && !/^https:\/\/\S+$/i.test(u)) throw new Error('ลิงก์ไฟล์เวอร์ชันต้องขึ้นต้นด้วย https://');
  return withLock_(() => {
    let r = rows_('Settings').find(x => x.key == 'update_url');
    if (!r) { sh_('Settings').appendRow(['update_url', '']); r = { _row: sh_('Settings').getLastRow() }; }
    sh_('Settings').getRange(r._row, 2).setNumberFormat('@').setValue(u.slice(0, 500)); bust_(); return true;
  });
}
function updKey_(u) { return 'upd:' + u.length + ':' + u.slice(-40); }
function updCheck_(force) { // ดูไฟล์ version.json ที่ update_url ชี้ (เก็บผลไว้ 6 ชม.) แล้วเทียบกับ APP_VERSION · ใช้ทั้งหน้าเว็บและเมนูในชีต
  const u = String(set_().update_url || '').trim(); if (!u) throw new Error('ยังไม่ได้ใส่ลิงก์ไฟล์เวอร์ชัน');
  const c = CacheService.getScriptCache(), ck = updKey_(u); let j = null;
  if (!force) { try { j = JSON.parse(c.get(ck) || 'null'); } catch (e) { j = null; } }
  if (j && !Array.isArray(j.files)) j = null; // ผลที่แคชไว้จากเวอร์ชันก่อนหน้า (ยังไม่มีรายการไฟล์) → ดึงใหม่
  if (!j) {
    let res; try { res = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true }); } catch (e) { throw new Error('เปิดลิงก์เวอร์ชันไม่ได้ (ถ้าเพิ่งอัปเดตระบบ ให้เปิดเมนู Other Tools > อนุญาตสิทธิ์ ในชีตก่อน): ' + String(e && e.message).slice(0, 100)); }
    if (res.getResponseCode() !== 200) throw new Error('เปิดลิงก์เวอร์ชันไม่ได้ (รหัส ' + res.getResponseCode() + ')');
    let x; try { x = JSON.parse(res.getContentText()); } catch (e) { throw new Error('ไฟล์เวอร์ชันไม่ใช่ JSON'); }
    if (!x || x.version == null) throw new Error('ไฟล์เวอร์ชันต้องมีช่อง "version"');
    const strs = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map(v => String(v)).filter(Boolean);
    j = { version: String(x.version).slice(0, 20), notes: String(x.notes || '').slice(0, 600), link: /^https:\/\/\S+$/.test(String(x.link || '')) ? String(x.link).slice(0, 300) : '', date: String(x.date || '').slice(0, 20),
      files: (Array.isArray(x.files) ? x.files : []).slice(0, 30).map(f => ({ path: String((f && f.path) || ''), sha256: String((f && f.sha256) || '').toLowerCase(), seed: !!(f && f.seed) })), // ไฟล์ที่ติดตั้งให้อัตโนมัติ (seed = ลงให้เฉพาะเมื่อยังไม่มี ไม่ทับของเดิม)
      remove: strs(x.remove, 20), scopes: strs(x.scopes, 20) };
    c.put(ck, JSON.stringify(j), 21600);
  }
  return { cur: APP_VERSION, latest: j.version, newer: verCmp_(j.version, APP_VERSION) > 0, notes: j.notes, link: j.link, date: j.date, canApply: j.files.length > 0, j: j };
}
function checkUpdate(pin, force) { authOwner_(pin); const r = updCheck_(force); delete r.j; return r; }

// ================= อัปเดตโค้ดเองจาก GitHub (ปุ่มในหน้าตั้งค่า / เมนูในชีต) =================
// ต้องตั้งครั้งเดียวต่อโปรเจกต์: (1) appsscript.json มี scope script.projects + script.deployments (ดู tools/appsscript.json.example)
// (2) เจ้าของเปิด Apps Script API ที่ https://script.google.com/home/usersettings (3) กดเมนู Other Tools > อนุญาตสิทธิ์ หนึ่งครั้ง
function updApi_(method, path, body) {
  const opt = { method: method, contentType: 'application/json', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
  if (body) opt.payload = JSON.stringify(body);
  const res = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + path, opt), code = res.getResponseCode(), txt = res.getContentText();
  if (code >= 200 && code < 300) return JSON.parse(txt || '{}');
  let msg = ''; try { msg = String(JSON.parse(txt).error.message || ''); } catch (e) { msg = txt.slice(0, 300); }
  const raw = '\n\n[ข้อความจาก Google] ' + msg.replace(/\s+/g, ' ').slice(0, 300), fail = function (kind, text, link) { const er = new Error(text + raw); er.kind = kind; er.link = link || ''; er.raw = msg; throw er; };
  if (code === 403 || code === 401) {
    if (/insufficient authentication scopes|scope/i.test(msg)) fail('scope', 'ยังไม่ได้เพิ่มสิทธิ์สำหรับอัปเดตโค้ด\nให้เพิ่ม script.projects และ script.deployments ใน appsscript.json (Project Settings > ติ๊ก Show appsscript.json) แล้วกดเมนู Other Tools > อนุญาตสิทธิ์ ในชีต');
    if (/User has not enabled|usersettings/i.test(msg)) fail('user_api', 'บัญชีนี้ยังไม่ได้เปิดสวิตช์ Google Apps Script API\nเปิดที่ https://script.google.com/home/usersettings ด้วยบัญชีเจ้าของสคริปต์ รอ 1-5 นาที แล้วลองใหม่', 'https://script.google.com/home/usersettings');
    if (/has not been used in project|SERVICE_DISABLED|is disabled|not been enabled/i.test(msg)) {
      const pm = /project[ s]*(\d{6,})/i.exec(msg), pn = pm ? pm[1] : '';
      fail('cloud_api', 'โปรเจกต์ Google Cloud ของสคริปต์นี้ยังไม่ได้เปิด Apps Script API' + (pn ? ' (โปรเจกต์ ' + pn + ')' : '') + '\nถ้าเป็นโปรเจกต์ Default ที่ Google สร้างให้ คุณจะเปิดเองไม่ได้ → ต้องผูกสคริปต์กับโปรเจกต์ Cloud ของตัวเอง:\n1) สร้างโปรเจกต์ที่ console.cloud.google.com แล้วเปิด Apps Script API\n2) ตั้ง OAuth consent screen\n3) Apps Script > Project Settings > Change project > ใส่ Project number\n(ถ้าเป็นโปรเจกต์ที่คุณผูกเองอยู่แล้ว ให้กด Enable ที่ลิงก์ในข้อความ Google ด้านล่าง)', pn ? 'https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=' + pn : 'https://console.cloud.google.com/apis/library/script.googleapis.com');
    }
    fail('denied', 'Google ไม่อนุญาตให้อัปเดตโค้ด (' + code + ')');
  }
  if (method === 'post' && path === '/versions' && /exceed|limit|maximum|quota|too many/i.test(msg)) fail('versions_full', 'โปรเจกต์มีเวอร์ชันเต็มแล้ว (สูงสุด 200)\nลบเวอร์ชันเก่าที่ตัวแก้ไข Apps Script > Project history (ลบได้เฉพาะเวอร์ชันที่ไม่ได้ใช้ใน Deployment) แล้วลองใหม่');
  fail('other', 'Apps Script API ผิดพลาด (' + code + ')');
}
// นับจำนวนเวอร์ชันของโปรเจกต์ (สูงสุด 200) · คืน -1 ถ้านับไม่ได้
function updVerCount_() {
  try { let n = 0, tok = ''; for (let i = 0; i < 8; i++) { const r = updApi_('get', '/versions?pageSize=50' + (tok ? '&pageToken=' + encodeURIComponent(tok) : '')); n += (r.versions || []).length; tok = r.nextPageToken || ''; if (!tok) break; } return n; } catch (e) { return -1; }
}
const UPD_VER_WARN = 180, UPD_VER_MAX = 200;
function updFetch_(url) {
  let res; try { res = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now(), { muteHttpExceptions: true, followRedirects: true }); } catch (e) { throw new Error('ดึงไฟล์จาก GitHub ไม่ได้: ' + String(e && e.message).slice(0, 100)); }
  if (res.getResponseCode() !== 200) throw new Error('ดึงไฟล์ไม่ได้ (รหัส ' + res.getResponseCode() + '): ' + url.split('/').slice(-2).join('/'));
  return res;
}
function hex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join(''); }
// หา Web app deployment ที่ลิงก์ปัจจุบันชี้อยู่ (ไม่รวม @HEAD ที่ไม่มีเลขเวอร์ชัน) · คืน {ds: ทั้งหมด, target: ตัวที่เลือกได้ หรือ null}
function updDeployTarget_() {
  let url = ''; try { url = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  const ds = (updApi_('get', '/deployments').deployments || []).filter(function (d) { return d.deploymentConfig && d.deploymentConfig.versionNumber && (d.entryPoints || []).some(function (e) { return e.entryPointType === 'WEB_APP'; }); });
  const target = ds.find(function (d) { return url.indexOf('/s/' + d.deploymentId + '/') >= 0; }) || (ds.length === 1 ? ds[0] : null);
  return { ds: ds, target: target };
}
function updApply_() { // ไม่ตรวจสิทธิ์ที่นี่ (ผู้เรียก: applyUpdate = เจ้าของที่ล็อกอิน, mUpdate = เจ้าของชีต) · ดึงไฟล์ → ตรวจแฮช → สำรองเวอร์ชันเดิม → เขียนโค้ด → สร้างเวอร์ชัน → ชี้ Web app ไปเวอร์ชันใหม่
  const c = CacheService.getScriptCache(); if (c.get('upd_busy')) throw new Error('กำลังอัปเดตอยู่แล้ว กรุณารอสักครู่');
  c.put('upd_busy', '1', 300);
  try {
    const chk = updCheck_(true), j = chk.j, from = APP_VERSION;
    if (!chk.newer) throw new Error('เป็นเวอร์ชันล่าสุดแล้ว');
    if (!j.files.length) throw new Error('เวอร์ชันนี้ไม่มีรายการไฟล์สำหรับอัปเดตอัตโนมัติ (ให้วางไฟล์เอง)');
    const cur = updApi_('get', '/content'); // ทดสอบสิทธิ์ก่อนทำอย่างอื่น: ถ้าตั้งค่ายังไม่ครบจะรู้ทันที
    const names = {}; (cur.files || []).forEach(f => names[f.name] = f);
    if (!names.appsscript) throw new Error('ไม่พบไฟล์ appsscript.json ในโปรเจกต์');
    const u = String(set_().update_url || '').trim(), base = u.replace(/[?#].*$/, '').replace(/[^\/]*$/, '');
    const put = []; // ไฟล์ที่จะเขียน: ดึงและตรวจแฮชให้ครบทุกไฟล์ก่อน ไม่ครบ = ไม่แตะโปรเจกต์เลย
    j.files.forEach(f => {
      const m = /^([A-Za-z0-9_][A-Za-z0-9_.\/-]*?)\.(gs|html)$/.exec(f.path), ok = m && f.path.indexOf('..') < 0 && !/^\//.test(f.path);
      if (!ok) throw new Error('ชื่อไฟล์ในรายการอัปเดตไม่ถูกต้อง: ' + f.path);
      const name = m[1].split('/').pop(); if (name === 'appsscript') throw new Error('ห้ามอัปเดตไฟล์ appsscript.json ผ่านรายการไฟล์');
      if (f.seed && names[name]) return; // ไฟล์ตั้งค่าของลูกค้ามีอยู่แล้ว ไม่ทับ
      if (!/^[0-9a-f]{64}$/.test(f.sha256)) throw new Error('รายการไฟล์ขาดค่าตรวจสอบ (sha256): ' + f.path);
      const bytes = updFetch_(base + f.path).getContent();
      if (hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)) !== f.sha256) throw new Error('ไฟล์ ' + f.path + ' ไม่ตรงกับที่ประกาศไว้ — GitHub อาจยังส่งไฟล์เก่าค้างแคช (รอ 5 นาทีแล้วลองใหม่) หรือรายการเวอร์ชันยังไม่ได้อัปเดตตามไฟล์');
      put.push({ name: name, type: m[2] === 'html' ? 'HTML' : 'SERVER_JS', source: Utilities.newBlob(bytes).getDataAsString('UTF-8') });
    });
    if (!put.length) throw new Error('ไม่มีไฟล์ที่ต้องอัปเดต');
    // สำรองโค้ดปัจจุบัน (ย้อนกลับได้ที่ Deploy > Manage deployments) · ถ้าโค้ดที่แก้อยู่ตรงกับเวอร์ชันที่ Deploy อยู่ทุกไฟล์ ไม่ต้องสร้างเวอร์ชันสำรองซ้ำ (ประหยัดโควตา 200 เวอร์ชัน)
    const dp0 = updDeployTarget_(); let same = false;
    if (dp0.target) {
      try {
        const old = updApi_('get', '/content?versionNumber=' + dp0.target.deploymentConfig.versionNumber), a = {}; (old.files || []).forEach(function (f) { a[f.name] = f.source; });
        same = (cur.files || []).length === (old.files || []).length && (cur.files || []).every(function (f) { return a[f.name] === f.source; });
      } catch (e) { same = false; }
    }
    const vc = updVerCount_();
    if (vc >= 0 && vc + (same ? 1 : 2) > UPD_VER_MAX) throw new Error('โปรเจกต์มีเวอร์ชันอยู่ ' + vc + ' จากสูงสุด ' + UPD_VER_MAX + ' ไม่พอสำหรับอัปเดต (ยังไม่ได้แตะโค้ดใดๆ)\nลบเวอร์ชันเก่าที่ตัวแก้ไข Apps Script > Project history (เลือกลบได้เฉพาะเวอร์ชันที่ไม่ได้ใช้ใน Deployment) แล้วกดอัปเดตใหม่');
    const bk = same ? { versionNumber: dp0.target.deploymentConfig.versionNumber } : updApi_('post', '/versions', { description: 'ก่อนอัปเดตเป็น v' + j.version + ' (สำรองอัตโนมัติ)' });
    const byName = {}; put.forEach(f => byName[f.name] = f);
    const files = (cur.files || []).filter(f => f.name === 'appsscript' || j.remove.indexOf(f.name) < 0).map(f => byName[f.name] ? byName[f.name] : { name: f.name, type: f.type, source: f.source });
    put.forEach(f => { if (!names[f.name]) files.push(f); });
    if (j.scopes.length) { // ถ้าโปรเจกต์ล็อกสิทธิ์ไว้ (oauthScopes) และเวอร์ชันใหม่ต้องการสิทธิ์เพิ่ม → เติมให้ (ต้องกดอนุญาตสิทธิ์ใหม่หลังอัปเดต)
      const mf = files.find(f => f.name === 'appsscript');
      try { const o = JSON.parse(mf.source); if (Array.isArray(o.oauthScopes)) { let ch = false; j.scopes.forEach(sc => { if (o.oauthScopes.indexOf(sc) < 0) { o.oauthScopes.push(sc); ch = true; } }); if (ch) mf.source = JSON.stringify(o, null, 2); } } catch (e) { /* manifest อ่านไม่ได้ → ไม่แตะ */ }
    }
    updApi_('put', '/content', { files: files });
    const ver = updApi_('post', '/versions', { description: 'v' + j.version + (j.date ? ' (' + j.date + ')' : '') + ' จาก GitHub' });
    const dp = updDeployTarget_(), ds = dp.ds, target = dp.target;
    let msg = '';
    if (target) updApi_('put', '/deployments/' + target.deploymentId, { deploymentConfig: { scriptId: ScriptApp.getScriptId(), versionNumber: ver.versionNumber, manifestFileName: 'appsscript', description: 'v' + j.version } });
    else msg = (ds.length ? 'มี Web app หลายตัว ระบบเลือกให้ไม่ได้' : 'ยังไม่พบ Web app ที่ Deploy ไว้') + '\nให้กดเอง: ตัวแก้ไข Apps Script > Deploy > Manage deployments > แก้ไข (ดินสอ) > Version: New version > Deploy';
    bust_(); c.remove(updKey_(u));
    audit_('UPDATE', 'v' + from + ' → v' + j.version, (target ? 'อัปเดตและเปิดใช้แล้ว' : 'ติดตั้งโค้ดแล้ว รอ Deploy เอง') + ' · ไฟล์ ' + put.map(f => f.name).join(', ') + ' · สำรองไว้ที่เวอร์ชัน ' + bk.versionNumber);
    const used = vc < 0 ? -1 : vc + (same ? 1 : 2), warn = used >= UPD_VER_WARN ? 'เวอร์ชันของโปรเจกต์ใช้ไป ' + used + ' จาก ' + UPD_VER_MAX + ' ใกล้เต็มแล้ว\nควรลบเวอร์ชันเก่าที่ตัวแก้ไข Apps Script > Project history (ลบได้เฉพาะเวอร์ชันที่ไม่ได้ใช้ใน Deployment) ก่อนอัปเดตครั้งหน้า' : '';
    return { from: from, to: j.version, deployed: !!target, msg: msg, backup: bk.versionNumber, backupSkipped: same, versions: used, warn: warn, files: put.map(f => f.name) };
  } finally { c.remove('upd_busy'); }
}
function applyUpdate(pin) { authOwner_(pin); return updApply_(); }

// ================= ตรวจความพร้อมของระบบอัปเดต (เมนู 🩺 ตรวจความพร้อม / ปุ่มในหน้าตั้งค่า) =================
// คืนรายการ [{name, ok, warn, msg, link, linkText}] · ไม่ throw (ทุกด่านจับ error เอง) เพื่อให้เห็นผลทุกข้อในครั้งเดียว
const UPD_NEED_SCOPES = ['https://www.googleapis.com/auth/script.projects', 'https://www.googleapis.com/auth/script.deployments', 'https://www.googleapis.com/auth/script.external_request'];
function updReadiness_() {
  const out = [], add = function (name, ok, msg, o) { out.push(Object.assign({ name: name, ok: !!ok, warn: false, msg: msg || '', link: '', linkText: '' }, o || {})); };
  // 1) ลิงก์ไฟล์เวอร์ชัน
  let chk = null;
  try { chk = updCheck_(true); add('ลิงก์ไฟล์เวอร์ชัน', true, 'อ่านได้ · ล่าสุด v' + chk.latest + ' · ใช้อยู่ v' + chk.cur + (chk.newer ? ' (มีเวอร์ชันใหม่)' : '') + (chk.canApply ? '' : '\nไฟล์เวอร์ชันนี้ไม่มีรายการไฟล์ → อัปเดตอัตโนมัติไม่ได้ ต้องวางไฟล์เอง')); }
  catch (e) { add('ลิงก์ไฟล์เวอร์ชัน', false, String(e && e.message || e)); }
  // 2) สิทธิ์ (scope) ที่อนุญาตแล้วจริง
  let scopeOk = false;
  try {
    const info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    if (info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) add('สิทธิ์ที่อนุญาตแล้ว', false, 'ยังต้องอนุญาตสิทธิ์ → เปิดชีต เมนู Other Tools > 🔑 อนุญาตสิทธิ์', { link: info.getAuthorizationUrl(), linkText: 'คลิกเพื่ออนุญาตสิทธิ์' });
    else {
      const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(ScriptApp.getOAuthToken()), { muteHttpExceptions: true }), granted = String((JSON.parse(r.getContentText() || '{}')).scope || '').split(/\s+/);
      const miss = r.getResponseCode() === 200 ? UPD_NEED_SCOPES.filter(function (s) { return granted.indexOf(s) < 0; }) : [];
      if (r.getResponseCode() !== 200) add('สิทธิ์ที่อนุญาตแล้ว', true, 'ตรวจรายการสิทธิ์ไม่ได้ (ข้ามข้อนี้) — ผลข้อถัดไปจะบอกเอง', { warn: true });
      else if (miss.length) add('สิทธิ์ที่อนุญาตแล้ว', false, 'ขาดสิทธิ์: ' + miss.map(function (s) { return s.split('/').pop(); }).join(', ') + '\nเพิ่มใน appsscript.json (Project Settings > ติ๊ก Show appsscript.json > oauthScopes ตามไฟล์ appsscript.json.example) แล้วกด Other Tools > 🔑 อนุญาตสิทธิ์ อีกครั้ง');
      else { scopeOk = true; add('สิทธิ์ที่อนุญาตแล้ว', true, 'ครบ (script.projects, script.deployments, script.external_request)'); }
    }
  } catch (e) { add('สิทธิ์ที่อนุญาตแล้ว', false, String(e && e.message || e)); }
  // 3) เรียก Apps Script API ได้จริงไหม + ไฟล์ในโปรเจกต์
  let cur = null;
  try { cur = updApi_('get', '/content'); add('เรียก Apps Script API', true, 'เรียกได้ปกติ'); }
  catch (e) { add('เรียก Apps Script API', false, String(e && e.message || e), { link: e && e.link, linkText: e && e.link ? 'เปิดลิงก์แก้ไข' : '' }); }
  if (cur) {
    const names = (cur.files || []).map(function (f) { return f.name; }), low = {}, dup = [];
    names.forEach(function (n) { const k = n.toLowerCase(); if (low[k] && dup.indexOf(low[k]) < 0) dup.push(low[k]); if (low[k]) dup.push(n); low[k] = low[k] || n; });
    const want = ['Code', 'ClientCode', 'Index', 'Menu', 'Updater'], lack = want.filter(function (n) { return names.indexOf(n) < 0; });
    if (dup.length) add('ชื่อไฟล์ในโปรเจกต์', false, 'มีไฟล์ชื่อซ้ำกันต่างแค่ตัวพิมพ์เล็ก/ใหญ่: ' + dup.join(', ') + '\nลบตัวเก่าออก ไม่งั้นจะขึ้น error "Identifier ... has already been declared"');
    else add('ชื่อไฟล์ในโปรเจกต์', true, lack.length ? 'ยังไม่มีไฟล์: ' + lack.join(', ') + ' (อัปเดตจะเพิ่มให้เอง)' : 'ไม่ซ้ำกัน · ครบ', lack.length ? { warn: true } : {});
    // 4) Web app deployment
    try { const dp = updDeployTarget_(); if (dp.target) add('Web app ที่จะชี้เวอร์ชันใหม่', true, 'พบ Deployment เวอร์ชัน ' + dp.target.deploymentConfig.versionNumber); else add('Web app ที่จะชี้เวอร์ชันใหม่', false, dp.ds.length ? 'มี Web app หลายตัว ระบบเลือกให้ไม่ได้ (ต้องกด Deploy เองหลังอัปเดต)' : 'ยังไม่พบ Web app ที่ Deploy ไว้ → Deploy > New deployment > Web app ก่อน', { warn: true }); }
    catch (e) { add('Web app ที่จะชี้เวอร์ชันใหม่', false, String(e && e.message || e)); }
    // 5) จำนวนเวอร์ชัน
    const vc = updVerCount_();
    if (vc < 0) add('จำนวนเวอร์ชันที่ใช้ไป', true, 'นับไม่ได้ (ข้าม)', { warn: true });
    else if (vc >= UPD_VER_MAX - 2) add('จำนวนเวอร์ชันที่ใช้ไป', false, vc + ' จาก ' + UPD_VER_MAX + ' — เต็มแล้ว/เกือบเต็ม ต้องลบเวอร์ชันเก่าที่ Project history ก่อนอัปเดต');
    else add('จำนวนเวอร์ชันที่ใช้ไป', true, vc + ' จาก ' + UPD_VER_MAX + (vc >= UPD_VER_WARN ? ' — ใกล้เต็ม ควรลบเวอร์ชันเก่าที่ Project history' : ''), vc >= UPD_VER_WARN ? { warn: true } : {});
  }
  return out;
}
function checkReady(pin) { authOwner_(pin); return updReadiness_(); }
