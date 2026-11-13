// แปลง client/client.js (โค้ดฝั่งหน้าเว็บ อ่านรู้เรื่อง) → src/ClientCode.gs (Base64)
// ใช้: node tools/build-client.js   · แก้โค้ดหน้าเว็บที่ client/client.js เท่านั้น อย่าแก้ ClientCode.gs ตรงๆ
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'client/client.js'), 'utf8');
const out = path.join(root, 'src/ClientCode.gs');
const head = '// โค้ดฝั่งหน้าเว็บ — สร้างจาก client/client.js ด้วย tools/build-client.js (อย่าแก้ไฟล์นี้ตรงๆ)\nconst CLIENT_B64 =\n  ';
const b = Buffer.from(src, 'utf8').toString('base64'), ch = [];
for (let i = 0; i < b.length; i += 120) ch.push("'" + b.slice(i, i + 120) + "'");
fs.writeFileSync(out, head + ch.join(' +\n  ') + ';\n');
console.log('เขียน', out, '·', ch.length, 'บรรทัด');
