/**
 * เมนู Other Tools — กดแล้วถ้ายังไม่ได้อนุญาตสิทธิ์ จะมีหน้าต่างพร้อมลิงก์อนุญาตขึ้นในชีตเลย
 * (แทนที่ onOpen เดิมทั้งก้อน — อย่าให้มี onOpen ซ้ำสองที่)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Pang Kum')
    .addItem('🔑 รีเซ็ต PIN เจ้าของ', 'resetOwnerPinMenu')   // อยู่ใน Code.gs
    .addItem('ℹ️ เวอร์ชันระบบ', 'mVersion')
    .addToUi();
  ui.createMenu('Other Tools')
    .addItem('🔑 อนุญาตสิทธิ์', 'mAuth')
    .addItem('⬆️ อัปเดตระบบจาก GitHub', 'mUpdate')
    .addItem('🩺 ตรวจความพร้อมระบบอัปเดต', 'mReady')
    .addSeparator()
    .addItem('setupDailyBackup', 'mSetupDailyBackup')
    .addItem('checkBackup', 'mCheckBackup')
    .addItem('testBackup', 'mTestBackup')
    .addToUi();
}
// หมายเหตุ: onOpen มีที่เดียวคือไฟล์นี้ (Code.gs ไม่มี onOpen แล้ว) — ถ้ามีสองที่ Apps Script จะใช้แค่ตัวเดียวและเมนูอีกชุดหาย

/* ---------- ตัวช่วยขออนุญาตสิทธิ์ในหน้าชีต ---------- */

// คืน URL สำหรับอนุญาตสิทธิ์ ถ้ายังต้องอนุญาต (ไม่ต้องอนุญาต = null)
function authUrl_() {
  const info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  return info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED
    ? info.getAuthorizationUrl() : null;
}

function showAuthDialog_(url) {
  const body = url
    ? '<p>ต้องอนุญาตสิทธิ์เพิ่มก่อนใช้เมนูนี้</p>' +
      '<p><a href="' + url.replace(/&/g, '&amp;') + '" target="_blank" ' +
      'style="display:inline-block;padding:10px 18px;background:#1D9E75;color:#fff;border-radius:8px;text-decoration:none">คลิกเพื่ออนุญาตสิทธิ์</a></p>' +
      '<p style="font-size:13px;color:#666">อนุญาตเสร็จแล้ว กลับมาที่ชีต กดเมนูเดิมอีกครั้ง</p>'
    : '<p>ระบบฟ้องว่าสิทธิ์ไม่พอ แต่ไม่ได้ให้ลิงก์อนุญาตมา</p>' +
      '<p style="font-size:13px;color:#666">ให้เปิด ส่วนขยาย &gt; Apps Script แล้วเรียกใช้ฟังก์ชันใดก็ได้หนึ่งครั้ง หรือเช็กว่าไฟล์ appsscript.json ไม่ได้ล็อกสิทธิ์ (oauthScopes) ไว้</p>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<div style="font-family:sans-serif;font-size:15px">' + body + '</div>')
      .setWidth(380).setHeight(210),
    'อนุญาตสิทธิ์');
}

// รันฟังก์ชันของเมนู: ถ้าต้องอนุญาตสิทธิ์ (หรือพังเพราะสิทธิ์ไม่พอ) ให้ขึ้นหน้าต่างอนุญาตแทน
function runAuthed_(fn) {
  const url = authUrl_();
  if (url) { showAuthDialog_(url); return; }
  try {
    fn();
  } catch (e) {
    if (/not sufficient|permission|authoriz/i.test(String(e && e.message))) { showAuthDialog_(authUrl_()); return; }
    throw e;
  }
}

function toast_(msg) { SpreadsheetApp.getActive().toast(msg, 'Other Tools', 6); }

/* ---------- ตัวห่อของแต่ละเมนู ---------- */
function mAuth() {
  const url = authUrl_();
  if (url) showAuthDialog_(url); else toast_('อนุญาตสิทธิ์ครบแล้ว ใช้งานเมนูอื่นได้เลย');
}
function mSetupDailyBackup() { runAuthed_(function () { setupDailyBackup(); toast_('ตั้งเวลาสำรองข้อมูลรายวันแล้ว'); }); }
function mCheckBackup()      { runAuthed_(function () { checkBackup(); toast_('ตรวจแล้ว ดูผลที่ Apps Script > การเรียกใช้'); }); }
function mTestBackup()       { runAuthed_(function () { testBackup(); toast_('สำรองข้อมูลทดสอบเสร็จแล้ว'); }); }

// อัปเดตโค้ดจาก GitHub จากในชีต (ใช้สำรองกรณีหน้าเว็บเปิดไม่ได้ หรือกดจากหน้าตั้งค่าไม่ได้)
function mUpdate() {
  runAuthed_(function () {
    const ui = SpreadsheetApp.getUi();
    try {
      const c = updCheck_(true);
      if (!c.newer) { ui.alert('อัปเดตระบบ', 'เป็นเวอร์ชันล่าสุดแล้ว (v' + c.cur + ')', ui.ButtonSet.OK); return; }
      if (!c.canApply) { ui.alert('อัปเดตระบบ', 'มีเวอร์ชันใหม่ v' + c.latest + ' แต่เวอร์ชันนี้ไม่รองรับการอัปเดตอัตโนมัติ' + (c.link ? '\nวิธีอัปเดต: ' + c.link : ''), ui.ButtonSet.OK); return; }
      if (ui.alert('อัปเดตระบบ', 'มีเวอร์ชันใหม่ v' + c.latest + ' (ใช้อยู่ v' + c.cur + ')\n' + (c.notes || '') + '\n\nอัปเดตเลยหรือไม่? (ข้อมูลในชีตไม่ถูกแตะ)', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
      const r = updApply_();
      ui.alert('อัปเดตระบบ', (r.deployed ? 'อัปเดตเป็น v' + r.to + ' เรียบร้อย — เปิดหน้าเว็บใหม่ได้เลย' : 'ติดตั้งโค้ด v' + r.to + ' แล้ว แต่ยังไม่ได้เปิดใช้\n' + r.msg) + (r.warn ? '\n\n⚠️ ' + r.warn : ''), ui.ButtonSet.OK);
    } catch (e) {
      // แสดงข้อความจริงในหน้าต่างเลย (ไม่ปล่อยเป็น error เงียบๆ ในหน้า การเรียกใช้) พร้อมทางไปตรวจความพร้อม
      ui.alert('อัปเดตระบบไม่สำเร็จ', String(e && e.message || e) + '\n\nลองเมนู Other Tools > 🩺 ตรวจความพร้อมระบบอัปเดต เพื่อดูว่าขาดอะไรบ้างในครั้งเดียว', ui.ButtonSet.OK);
    }
  });
}

// ตรวจความพร้อมของระบบอัปเดตแล้วแสดงผลเป็นรายการ ✅/⚠️/❌ พร้อมลิงก์แก้ไข
function mReady() {
  runAuthed_(function () {
    let list;
    try { list = updReadiness_(); } catch (e) { list = [{ name: 'ตรวจความพร้อม', ok: false, msg: String(e && e.message || e), link: '', linkText: '' }]; }
    const esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    const bad = list.filter(function (x) { return !x.ok; }).length;
    const rows = list.map(function (x) {
      return '<div style="margin:0 0 10px"><div>' + (x.ok ? (x.warn ? '⚠️' : '✅') : '❌') + ' <b>' + esc(x.name) + '</b></div>' +
        (x.msg ? '<div style="font-size:13px;color:#555;white-space:pre-line;margin-left:24px">' + esc(x.msg) + '</div>' : '') +
        (x.link && /^https:\/\//.test(x.link) ? '<div style="margin-left:24px;font-size:13px"><a href="' + esc(x.link) + '" target="_blank">' + esc(x.linkText || 'เปิดลิงก์') + '</a></div>' : '') + '</div>';
    }).join('');
    const head = bad ? '<p style="color:#b00020"><b>ยังไม่พร้อม ' + bad + ' ข้อ</b> แก้ตามรายการด้านล่างแล้วกดตรวจอีกครั้ง</p>' : '<p style="color:#1D9E75"><b>พร้อมใช้งานปุ่มอัปเดตแล้ว</b></p>';
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<div style="font-family:sans-serif;font-size:14px">' + head + rows + '</div>').setWidth(520).setHeight(460), 'ตรวจความพร้อมระบบอัปเดต');
  });
}

function mVersion() {
  SpreadsheetApp.getUi().alert('Pang Kum', 'เวอร์ชันระบบ ' + APP_VERSION + ' (' + APP_DATE + ')\n\nเปิดลิงก์ Web app ตามด้วย ?page=ver เพื่อดูเลขเวอร์ชันที่ใช้งานจริงอยู่', SpreadsheetApp.getUi().ButtonSet.OK);
}
