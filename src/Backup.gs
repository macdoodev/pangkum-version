// ===== สำรอง Google Sheets/Docs/Slides เป็นไฟล์ Excel/Word/PowerPoint อัตโนมัติทุกวัน =====
// ใช้ได้กับทุกโปรเจกต์/ทุกไฟล์: วางไฟล์นี้ใน Apps Script แล้วแก้ค่าด้านล่างเท่านั้น (ไม่พึ่ง Code.gs)
// ชื่อไฟล์ที่ได้: backup_<ชื่อไฟล์>_<วันที่เวลา>.xlsx   เช่น backup_Wallet - ตั้งค่า_2026-11-04_0200.xlsx
//
// วิธีติดตั้ง (ทำครั้งเดียว):
//  1) แก้ BACKUP_FILES ด้านล่าง (ถ้าสคริปต์นี้ผูกอยู่กับ Sheet ที่จะสำรอง เว้นว่างได้ = สำรอง Sheet ที่ผูกอยู่)
//  2) เลือกฟังก์ชัน testBackup กด "เรียกใช้" → อนุญาตสิทธิ์ (ขึ้น "Google hasn't verified this app" ให้กด Advanced → Go to ... → Allow)
//  3) ดู "บันทึกการดำเนินการ" ถ้าขึ้นสำเร็จและมีไฟล์ในโฟลเดอร์ ค่อยเรียก setupDailyBackup เพื่อตั้งเวลา
//  4) ตรวจสถานะภายหลังได้ด้วยฟังก์ชัน checkBackup

// ไฟล์ที่จะสำรอง: ใส่ ID ของไฟล์ (ส่วนระหว่าง /d/ กับ /edit ในลิงก์) เช่น ['1AbC...', '1XyZ...'] · เว้นว่าง [] = ไฟล์ที่สคริปต์นี้ผูกอยู่
const BACKUP_FILES = [];
const BACKUP_SAME_FOLDER = true;          // true = เก็บไฟล์สำรองไว้ในโฟลเดอร์เดียวกับไฟล์ต้นทาง (ไฟล์ที่อยู่หน้าแรก My Drive ก็เก็บที่หน้าแรก) · false = ใช้โฟลเดอร์รวมด้านล่าง
const BACKUP_SUBFOLDER = 'Backups';        // ชื่อโฟลเดอร์ย่อยที่สร้างในโฟลเดอร์ของไฟล์ต้นทาง เพื่อเก็บไฟล์สำรอง (ไม่มีจะสร้างให้) · ใส่ '' = เก็บในโฟลเดอร์เดียวกับไฟล์ต้นทางเลย
const BACKUP_FOLDER_NAME = 'Backups';     // ใช้เมื่อ BACKUP_SAME_FOLDER = false: ชื่อโฟลเดอร์รวมใน Drive (ไม่มีจะสร้างให้)
const BACKUP_FOLDER_ID = '';              // ใช้เมื่อ BACKUP_SAME_FOLDER = false: ถ้าอยากใช้โฟลเดอร์ที่มีอยู่แล้ว ใส่ ID ของโฟลเดอร์
const BACKUP_KEEP = 2;                    // เก็บไฟล์ล่าสุดกี่ไฟล์ต่อไฟล์ต้นทาง (ทำไฟล์ใหม่สำเร็จแล้วค่อยลบเก่า) · 1 = เก็บเฉพาะล่าสุด
const BACKUP_HOUR = 2;                    // ทำตอนกี่โมง (0-23 ตามเขตเวลาของโปรเจกต์ · ระบบอาจเริ่มช้าได้ไม่เกิน 1 ชั่วโมง)
const BACKUP_EMAIL = '';                  // ไม่บังคับ: ส่งไฟล์สำรอง/แจ้งเมื่อพลาด ไปอีเมลนี้ (ควรเป็นอีเมลนอก Google เผื่อบัญชีถูกระงับ)

const BK_TYPES_ = {   // ชนิดไฟล์ Google → รูปแบบที่ส่งออก
  'application/vnd.google-apps.spreadsheet': {path: 'spreadsheets', ext: 'xlsx'},
  'application/vnd.google-apps.document': {path: 'document', ext: 'docx'},
  'application/vnd.google-apps.presentation': {path: 'presentation', ext: 'pptx'}
};

function bkFolder_() {
  if (BACKUP_FOLDER_ID) return DriveApp.getFolderById(BACKUP_FOLDER_ID);
  const it = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);
}
// โฟลเดอร์ปลายทางของไฟล์ต้นทางหนึ่งไฟล์: โฟลเดอร์ที่ไฟล์อยู่ (ถ้าเปิดโหมดนี้) ไม่งั้นโฟลเดอร์รวม
function bkDest_(src) {
  if (BACKUP_SAME_FOLDER) {
    const ps = src.getParents();
    if (ps.hasNext()) {
      const parent = ps.next();
      if (!BACKUP_SUBFOLDER) return parent;
      const sub = parent.getFoldersByName(BACKUP_SUBFOLDER);   // โฟลเดอร์ย่อยภายในโฟลเดอร์ของไฟล์ต้นทาง
      return sub.hasNext() ? sub.next() : parent.createFolder(BACKUP_SUBFOLDER);
    }
  }
  return bkFolder_();
}
function bkIds_() {
  if (BACKUP_FILES.length) return BACKUP_FILES.map(function (x) { return String(x).trim(); }).filter(Boolean);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('สคริปต์นี้ไม่ได้ผูกกับ Sheet และยังไม่ได้ใส่ ID ใน BACKUP_FILES');
  return [ss.getId()];
}
const bkEsc_ = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };

// สำรองไฟล์เดียว: ส่งออก → สร้างไฟล์ใหม่ → ลบเก่าที่เกินจำนวน · คืนไฟล์ที่สร้าง
function bkOne_(id, stamp) {
  const src = DriveApp.getFileById(id), t = BK_TYPES_[src.getMimeType()], folder = bkDest_(src);
  if (!t) throw new Error('ชนิดไฟล์ไม่รองรับ (' + src.getMimeType() + ')');
  const res = UrlFetchApp.fetch('https://docs.google.com/' + t.path + '/d/' + id + '/export?format=' + t.ext, {headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) throw new Error('ส่งออกไม่สำเร็จ รหัส ' + res.getResponseCode() + ' (' + res.getContentText().slice(0, 120).replace(/\s+/g, ' ') + ')');
  const base = 'backup_' + src.getName().replace(/[\\\/:*?"<>|]/g, '-') + '_', blob = res.getBlob().setName(base + stamp + '.' + t.ext);
  if (blob.getBytes().length < 1000) throw new Error('ไฟล์ที่ได้เล็กผิดปกติ จึงไม่ลบไฟล์เก่า');
  const file = folder.createFile(blob);   // สร้างไฟล์ใหม่สำเร็จก่อน แล้วจึงลบไฟล์เก่า
  const re = new RegExp('^' + bkEsc_(base) + '\\d{4}-\\d{2}-\\d{2}_\\d{4}\\.' + t.ext + '$'), all = [], it = folder.getFiles();
  while (it.hasNext()) { const f = it.next(); if (re.test(f.getName())) all.push(f); }   // ลบเฉพาะไฟล์สำรองของไฟล์ต้นทางนี้
  all.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (let i = Math.max(1, BACKUP_KEEP); i < all.length; i++) all[i].setTrashed(true);   // ลงถังขยะ กู้คืนได้ 30 วัน
  return file;
}

// ทำงานหลัก (ตัวตั้งเวลาเรียกฟังก์ชันนี้) · ไฟล์ไหนพลาดจะข้ามไปทำไฟล์ต่อไป แล้วแจ้ง error รวมตอนท้าย
function backupNow() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm'), ids = bkIds_(), made = [], errs = [];
  ids.forEach(function (id) {
    try { const f = bkOne_(id, stamp); made.push(f); Logger.log('สำเร็จ: ' + f.getName() + ' → ' + f.getUrl()); }
    catch (e) { errs.push(id + ' : ' + e.message); Logger.log('ผิดพลาด ' + id + ' : ' + e.message); }
  });
  if (BACKUP_EMAIL) {
    if (made.length) MailApp.sendEmail({to: BACKUP_EMAIL, subject: 'สำรองข้อมูล ' + stamp, body: 'ไฟล์สำรองอัตโนมัติแนบมาด้วย' + (errs.length ? '\n\nที่ผิดพลาด:\n' + errs.join('\n') : ''), attachments: made.map(function (f) { return f.getBlob(); })});
    else MailApp.sendEmail(BACKUP_EMAIL, 'สำรองข้อมูลล้มเหลว ' + stamp, errs.join('\n'));
  }
  if (errs.length) throw new Error('สำรองไม่สำเร็จ ' + errs.length + ' ไฟล์:\n' + errs.join('\n'));
  return made.map(function (f) { return f.getUrl(); });
}

// ทดสอบด้วยมือ (ใช้ก่อนตั้งเวลา): ทำครั้งเดียวและแสดงผลใน "บันทึกการดำเนินการ"
function testBackup() { const r = backupNow(); Logger.log('เสร็จ: ' + r.join('\n')); return r; }

// ตั้งเวลาทุกวัน (เรียกซ้ำได้ ไม่สร้างซ้ำ)
function setupDailyBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'backupNow') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('backupNow').timeBased().everyDays(1).atHour(BACKUP_HOUR).create();
  Logger.log('ตั้งเวลาแล้ว: ทุกวันประมาณ ' + BACKUP_HOUR + ':00 (' + Session.getScriptTimeZone() + ')');
}

// ตรวจสถานะ: ตั้งเวลาไว้หรือยัง · เห็นไฟล์ต้นทางไหม · ไฟล์สำรองล่าสุดเมื่อไร
function checkBackup() {
  const tr = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'backupNow'; });
  Logger.log('ตัวตั้งเวลา: ' + (tr.length ? 'มี ' + tr.length + ' ตัว' : 'ยังไม่มี → ให้เรียก setupDailyBackup'));
  Logger.log('เขตเวลาโปรเจกต์: ' + Session.getScriptTimeZone());
  bkIds_().forEach(function (id) { try { Logger.log('ไฟล์ต้นทาง OK: ' + DriveApp.getFileById(id).getName()); } catch (e) { Logger.log('เข้าไฟล์ ' + id + ' ไม่ได้: ' + e.message); } });
  bkIds_().forEach(function (id) {
    try {
      const src = DriveApp.getFileById(id), folder = bkDest_(src), it = folder.getFiles(), pre = 'backup_' + src.getName().replace(/[\\\/:*?"<>|]/g, '-') + '_'; let latest = null, n = 0;
      while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(pre) === 0) { n++; if (!latest || f.getDateCreated() > latest.getDateCreated()) latest = f; } }
      Logger.log('โฟลเดอร์ "' + folder.getName() + '": มีไฟล์สำรองของ ' + src.getName() + ' ' + n + ' ไฟล์' + (latest ? ' ล่าสุด ' + latest.getName() : ''));
    } catch (e) { /* รายงานไว้ด้านบนแล้ว */ }
  });
}