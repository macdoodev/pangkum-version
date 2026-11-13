// สร้าง version.json จากไฟล์ใน src/ : อ่านเลขเวอร์ชันจาก APP_VERSION/APP_DATE ใน src/Code.gs แล้วคำนวณ sha256 ของแต่ละไฟล์
// ปุ่ม "อัปเดตระบบ" ของลูกค้าจะเทียบแฮชนี้ก่อนติดตั้ง (ถ้าไฟล์บน GitHub ไม่ตรง จะไม่แตะโปรเจกต์ลูกค้าเลย)
// ใช้: node tools/make-version.js ["ข้อความบอกว่ามีอะไรใหม่"] ["ลิงก์วิธีอัปเดต"]   (ไม่ใส่ = ใช้ค่าเดิมใน version.json)
// ใช้กับแอพอื่น: แก้รายการ FILES ด้านล่าง (ไฟล์ .gs/.html เท่านั้น · true = ไฟล์ตั้งค่าของลูกค้า ลงให้ครั้งแรกเท่านั้น ไม่ทับ)
const fs = require('fs'), path = require('path'), crypto = require('crypto'), root = path.join(__dirname, '..');
const FILES = [['src/Code.gs'], ['src/ClientCode.gs'], ['src/Index.html'], ['src/Menu.gs'], ['src/Updater.gs'], ['src/Backup.gs', true]];
const REMOVE = [];   // ชื่อไฟล์เก่าที่ให้ลบออกจากโปรเจกต์ลูกค้า เช่น ['Client']
const SCOPES = [];   // สิทธิ์เพิ่มที่เวอร์ชันนี้ต้องใช้ (เติมให้เฉพาะโปรเจกต์ที่ล็อก oauthScopes ไว้) เช่น ['https://www.googleapis.com/auth/calendar']
const code = fs.readFileSync(path.join(root, 'src/Code.gs'), 'utf8');
const v = /APP_VERSION\s*=\s*([0-9][0-9.]*)/.exec(code), d = /APP_DATE\s*=\s*'([^']*)'/.exec(code);
if (!v) { console.error('หา APP_VERSION ใน src/Code.gs ไม่เจอ'); process.exit(1); }
const vf = path.join(root, 'version.json'); let old = {}; try { old = JSON.parse(fs.readFileSync(vf, 'utf8')); } catch (e) {}
const out = {
  version: v[1], date: d ? d[1] : '', notes: process.argv[2] != null ? process.argv[2] : (old.notes || ''), link: process.argv[3] != null ? process.argv[3] : (old.link || ''),
  files: FILES.map(f => { const o = { path: f[0], sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f[0]))).digest('hex') }; if (f[1]) o.seed = true; return o; })
};
if (REMOVE.length) out.remove = REMOVE; if (SCOPES.length) out.scopes = SCOPES;
fs.writeFileSync(vf, JSON.stringify(out, null, 2) + '\n');
console.log('เขียน version.json · v' + out.version + ' · ' + out.files.length + ' ไฟล์');
