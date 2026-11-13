// จำลอง Apps Script เพื่อทดสอบตรรกะใน Updater.gs (ไม่ต่อ Google จริง)
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
const SRC = process.argv[2] || require('path').join(__dirname, '..', 'src');
function makeEnv(sc) {
  const calls = [], cache = {};
  const sha = s => crypto.createHash('sha256').update(s).digest('hex');
  const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => typeof body === 'string' ? body : JSON.stringify(body), getContent: () => Array.from(Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))).map(b => b > 127 ? b - 256 : b) });
  const base = 'https://raw.example/x/', rawFiles = { 'src/Code.gs': 'const A=1;//new', 'src/Updater.gs': 'function u(){}//new' };
  const vj = { version: '41', date: '2026-11-13', notes: 'n', files: Object.keys(rawFiles).map(p => ({ path: p, sha256: sha(rawFiles[p]) })) };
  let versions = sc.versionCount, nextVer = sc.versionCount + 1;
  const ctx = {
    console, Logger: { log() {} }, APP_VERSION: 40, APP_DATE: 'd',
    authOwner_() {}, set_: () => ({ update_url: base + 'version.json' }), bust_() {}, audit_() {}, rows_: () => [], sh_: () => ({}), withLock_: f => f(),
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    Utilities: { DigestAlgorithm: { SHA_256: 1 }, computeDigest: (a, bytes) => Array.from(crypto.createHash('sha256').update(Buffer.from(bytes.map(b => b & 255))).digest()).map(b => b > 127 ? b - 256 : b), newBlob: bytes => ({ getDataAsString: () => Buffer.from(bytes.map(b => b & 255)).toString('utf8') }) },
    ScriptApp: {
      getScriptId: () => 'SID', getOAuthToken: () => 'TOK', getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/DEP1/exec' }),
      AuthMode: { FULL: 1 }, AuthorizationStatus: { REQUIRED: 'R', NOT_REQUIRED: 'N' },
      getAuthorizationInfo: () => ({ getAuthorizationStatus: () => 'N', getAuthorizationUrl: () => 'https://auth' })
    },
    UrlFetchApp: {
      fetch(url, opt) {
        opt = opt || {}; const m = (opt.method || 'get').toLowerCase(); calls.push(m + ' ' + url.replace('https://script.googleapis.com/v1/projects/SID', ''));
        if (url.startsWith(base + 'version.json')) return resp(200, vj);
        for (const p of Object.keys(rawFiles)) if (url.startsWith(base + p)) return resp(200, rawFiles[p]);
        if (url.startsWith('https://oauth2.googleapis.com/tokeninfo')) return resp(200, { scope: sc.scopes.join(' ') });
        const path = url.replace('https://script.googleapis.com/v1/projects/SID', '');
        if (sc.apiError) return resp(403, { error: { message: sc.apiError } });
        if (path.startsWith('/content?versionNumber=')) return resp(200, { files: sc.deployedFiles });
        if (path === '/content' && m === 'get') return resp(200, { files: sc.headFiles });
        if (path === '/content' && m === 'put') return resp(200, {});
        if (path.startsWith('/versions?') && m === 'get') { const n = Math.min(versions, 50); return resp(200, { versions: Array(n).fill({}), nextPageToken: undefined }); }
        if (path === '/versions' && m === 'post') { versions++; return resp(200, { versionNumber: nextVer++ }); }
        if (path === '/deployments' && m === 'get') return resp(200, { deployments: [{ deploymentId: 'DEP1', deploymentConfig: { versionNumber: 7 }, entryPoints: [{ entryPointType: 'WEB_APP' }] }] });
        if (path.startsWith('/deployments/') && m === 'put') return resp(200, {});
        return resp(404, { error: { message: 'unexpected ' + path } });
      }
    }
  };
  // versions list ต้องนับรวมทุกหน้า: จำลองหน้าละ 50 ด้วย token
  ctx.UrlFetchApp.fetchOrig = ctx.UrlFetchApp.fetch;
  ctx.UrlFetchApp.fetch = function (url, opt) {
    const mm = /\/versions\?pageSize=50(?:&pageToken=(\d+))?/.exec(url);
    if (mm && (!opt || !opt.method || opt.method === 'get')) { const off = Number(mm[1] || 0), left = Math.max(0, versions - off), n = Math.min(50, left); calls.push('get /versions?page@' + off); return resp(200, { versions: Array(n).fill({}), nextPageToken: off + n < versions ? String(off + n) : undefined }); }
    return ctx.UrlFetchApp.fetchOrig(url, opt);
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC + '/Updater.gs', 'utf8') + '\nthis.__x={updApply_,updReadiness_,updApi_,updVerCount_};', ctx);
  return { x: ctx.__x, calls };
}
const files = (s) => [{ name: 'appsscript', source: '{}' }, { name: 'Code', source: s }];
const good = ['https://www.googleapis.com/auth/script.projects', 'https://www.googleapis.com/auth/script.deployments', 'https://www.googleapis.com/auth/script.external_request'];
let n = 0; const ok = (m) => console.log('✓', ++n, m);

// A: Cloud project ปิด API → ข้อความจริง + ลิงก์ + เลขโปรเจกต์
{ const { x } = makeEnv({ versionCount: 10, scopes: good, apiError: 'Apps Script API has not been used in project 497993472175 before or it is disabled. Enable it by visiting https://console...' });
  const r = x.updReadiness_(); const api = r.find(c => c.name === 'เรียก Apps Script API');
  assert(!api.ok && /497993472175/.test(api.msg) && /ข้อความจาก Google/.test(api.msg) && /project=497993472175/.test(api.link)); ok('readiness: cloud_api มีข้อความดิบ + ลิงก์ project'); }
// B: user toggle ปิด
{ const { x } = makeEnv({ versionCount: 10, scopes: good, apiError: 'User has not enabled the Apps Script API. Enable it by visiting https://script.google.com/home/usersettings then retry.' });
  const api = x.updReadiness_().find(c => c.name === 'เรียก Apps Script API'); assert(!api.ok && /usersettings/.test(api.link)); ok('readiness: user_api ชี้ usersettings'); }
// C: scope ขาด
{ const { x } = makeEnv({ versionCount: 10, scopes: [good[2]], headFiles: files('a'), deployedFiles: files('a') });
  const s = x.updReadiness_().find(c => c.name === 'สิทธิ์ที่อนุญาตแล้ว'); assert(!s.ok && /script\.projects/.test(s.msg) && /script\.deployments/.test(s.msg)); ok('readiness: ตรวจ scope ขาดได้'); }
// D: ชื่อไฟล์ซ้ำต่างตัวพิมพ์
{ const { x } = makeEnv({ versionCount: 10, scopes: good, headFiles: [{ name: 'appsscript', source: '{}' }, { name: 'ClientCode', source: 'a' }, { name: 'Clientcode', source: 'b' }], deployedFiles: [] });
  const f = x.updReadiness_().find(c => c.name === 'ชื่อไฟล์ในโปรเจกต์'); assert(!f.ok && /Clientcode/.test(f.msg) && /ClientCode/.test(f.msg)); ok('readiness: จับไฟล์ชื่อซ้ำ Clientcode/ClientCode'); }
// E: โค้ดตรงกับเวอร์ชันที่ Deploy → ข้ามสำรอง สร้างแค่ 1 เวอร์ชัน
{ const { x, calls } = makeEnv({ versionCount: 20, scopes: good, headFiles: files('same'), deployedFiles: files('same') });
  const r = x.updApply_(); const posts = calls.filter(c => c === 'post /versions').length;
  assert.strictEqual(posts, 1); assert(r.backupSkipped && r.backup === 7 && r.deployed && r.versions === 21 && !r.warn); ok('apply: ข้ามเวอร์ชันสำรองเมื่อโค้ดตรง (สร้าง 1 เวอร์ชัน, backup=เวอร์ชันที่ deploy)'); }
// F: โค้ดต่างจากที่ Deploy → สร้างสำรอง + เวอร์ชันใหม่ = 2
{ const { x, calls } = makeEnv({ versionCount: 20, scopes: good, headFiles: files('edited'), deployedFiles: files('orig') });
  const r = x.updApply_(); assert.strictEqual(calls.filter(c => c === 'post /versions').length, 2); assert(!r.backupSkipped && r.versions === 22); ok('apply: สร้างเวอร์ชันสำรองเมื่อโค้ดต่างจากที่ Deploy (2 เวอร์ชัน)'); }
// G: เวอร์ชัน 199 และต้องสำรอง → หยุดก่อนแตะโค้ด
{ const { x, calls } = makeEnv({ versionCount: 199, scopes: good, headFiles: files('edited'), deployedFiles: files('orig') });
  assert.throws(() => x.updApply_(), /ไม่พอสำหรับอัปเดต/); assert(!calls.includes('put /content') && !calls.includes('post /versions')); ok('apply: เวอร์ชัน 199 + ต้องสำรอง → หยุดก่อนเขียนโค้ด'); }
// H: เวอร์ชัน 199 แต่ข้ามสำรองได้ → ผ่าน (ต้องการ 1)
{ const { x } = makeEnv({ versionCount: 199, scopes: good, headFiles: files('same'), deployedFiles: files('same') });
  const r = x.updApply_(); assert(r.deployed && r.versions === 200 && /ใกล้เต็ม/.test(r.warn)); ok('apply: เวอร์ชัน 199 แต่ข้ามสำรอง → อัปเดตได้ และเตือนเต็ม'); }
// I: เตือนที่ 180
{ const { x } = makeEnv({ versionCount: 179, scopes: good, headFiles: files('same'), deployedFiles: files('same') });
  const r = x.updApply_(); assert(r.versions === 180 && r.warn); ok('apply: ถึง 180 → มี warn'); }
// J: นับเวอร์ชันหลายหน้า (120)
{ const { x } = makeEnv({ versionCount: 120, scopes: good }); assert.strictEqual(x.updVerCount_(), 120); ok('นับเวอร์ชันข้ามหน้าได้ (120)'); }
// K: ทุกอย่างปกติ → readiness ผ่านหมด
{ const { x } = makeEnv({ versionCount: 30, scopes: good, headFiles: [{ name: 'appsscript', source: '{}' }, { name: 'Code', source: 'a' }, { name: 'ClientCode', source: 'a' }, { name: 'Index', source: 'a' }, { name: 'Menu', source: 'a' }, { name: 'Updater', source: 'a' }], deployedFiles: [] });
  const r = x.updReadiness_(); assert(r.every(c => c.ok), JSON.stringify(r.filter(c => !c.ok))); ok('readiness: ปกติผ่านครบ ' + r.length + ' ข้อ'); }
console.log('ALL PASS');
