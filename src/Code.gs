// Pang Kum — เฟส 1 (Google Apps Script + Google Sheets)
// วิธีใช้: ผูกสคริปต์กับ Google Sheet เปล่า → รัน setup() ครั้งเดียว → Deploy เป็น Web app
// ตั้ง Time zone ของโปรเจกต์เป็น Asia/Bangkok (Project Settings) ทุกครั้งที่แก้โค้ดให้ Deploy "New version"

const SH = {
  Images: ['key', 'data'],
  Settings: ['key', 'value'],
  Menu: ['menu_id', 'name', 'price', 'active', 'unit', 'type', 'quick_notes'],
  Ingredients: ['ing_id', 'name', 'unit', 'stock', 'reorder_point', 'cost', 'is_pack'],
  Recipes: ['menu_id', 'ing_id', 'qty'],
  Orders: ['order_id', 'queue_no', 'created_at', 'channel', 'platform', 'external_ref', 'status', 'total', 'eta_min', 'created_by', 'expires_at', 'discount', 'coupon', 'device', 'ready_at', 'order_code', 'promo_disc', 'promo_note', 'is_test', 'paid_at', 'cust_name', 'cust_phone', 'order_note', 'fulfil', 'addr', 'zone', 'fee', 'pay_later', 'slip_id', 'slip_at', 'pay_method'],
  Order_Items: ['order_id', 'menu_id', 'name', 'qty', 'price', 'opts', 'note', 'detail', 'use'],
  Payments: ['payment_id', 'order_id', 'method', 'amount', 'paid_at', 'staff', 'slip_ref', 'reconciled'],
  Stock_Log: ['ts', 'ing_id', 'delta', 'reason', 'ref', 'staff'],
  Coupons: ['code', 'type', 'value', 'active', 'note', 'survey', 'mode'],
  Stock_Lots: ['lot_id', 'ing_id', 'date', 'qty_in', 'unit_cost', 'qty_left', 'note'],
  Lot_Use: ['day', 'lot_id', 'qty'],
  Cost_Ledger: ['date', 'type', 'ing_id', 'name', 'unit', 'qty', 'cost', 'ref'],
  Daily_Expense: ['date', 'name', 'amount'],
  Monthly_Expense: ['id', 'month', 'name', 'amount'],
  Daily_Check: ['date', 'key', 'label', 'sales', 'checked', 'diff'],
  Daily_Close: ['date', 'cash_expected', 'cash_counted', 'diff', 'transfer_total', 'note', 'closed_at', 'sales', 'discount', 'orders', 'delivery_sales', 'float', 'delivery_fee'],
  Staff: ['staff_id', 'name', 'role', 'pin_hash', 'salt', 'active', 'must_change', 'created_at'],
  Audit_Log: ['ts', 'staff_id', 'staff', 'action', 'target', 'detail', 'amount'],
  Options: ['opt_id', 'name', 'price', 'menu_ids', 'ing_id', 'ing_qty', 'active'],
  Promos: ['promo_id', 'name', 'type', 'menu_ids', 'x', 'y', 'value', 'start', 'end', 'days', 'date_from', 'date_to', 'active'],
  Set_Items: ['set_id', 'menu_id', 'qty'],
  Survey_Used: ['code', 'order_id', 'used_at', 'staff'],
  Activity: ['time', 'queue_no', 'email', 'message', 'order_id', 'device']
};
const TZ = Session.getScriptTimeZone();
const ACTIVE = ['PENDING_PAY', 'QUEUED', 'COOKING', 'READY'];
const TAIL = { orders: 600, items: 3000, big: 8000, act: 200 }; // หน้าที่เปิดบ่อยอ่านเฉพาะแถวล่าสุด ไม่ช้าลงเมื่อข้อมูลสะสมนาน
const r6_ = x => Math.round((Number(x) + Number.EPSILON) * 1e6) / 1e6;
const dstr_ = v => fmt_(v, 'yyyy-MM-dd');
const mstr_ = v => fmt_(v, 'yyyy-MM');

// ================= v2: PIN รายคน + บันทึกกิจกรรม, กันออเดอร์ปลอม, จอคิว, ตัวเลือก/เซ็ต/โปรโมชั่น, ช่วงทดลอง+แบบสอบถาม =================
const PIN_MIN = 6, SES_TTL = 21600; // PIN อย่างน้อย 6 หลัก · session อยู่ได้สูงสุด 6 ชม. (ต่ออายุอัตโนมัติเมื่อใช้งาน)
const WEAK_PINS = ['123456', '654321', '111111', '000000', '121212', '123123', '112233', '159753', '696969', '520520', '999999', '1234567', '12345678', '123456789', '0123456789'];
let ACTOR = null, STAFF_OK = false, STAFF_RANDOM = false; // ACTOR = พนักงานที่กำลังเรียกฟังก์ชันนี้ (ใช้บันทึกกิจกรรม/สต็อก)
const isTrue_ = v => v === true || String(v).toLowerCase() === 'true';
const norm_ = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const r2_ = x => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
const pad2_ = n => (n < 10 ? '0' : '') + n;
const trialOn_ = S => Number(S.trial_on) === 1 || String(S.trial_on).toLowerCase() === 'true';
const AUTO_ST = ['PENDING_PAY', 'QUEUED', 'COOKING', 'READY', 'DONE'];

function rowsTail_(n, k) {
  const key = n + '#' + k; if (RC && RC[key]) return RC[key];
  if (RC) { // เคยอ่านท้ายชีตนี้ไว้ด้วยจำนวนแถวที่มากกว่าแล้ว → ตัดมาใช้ ไม่ต้องอ่านซ้ำ
    let best = null; Object.keys(RC).forEach(x => { if (x.indexOf(n + '#') === 0) { const kk = Number(x.slice(n.length + 1)); if (kk >= k && (best === null || kk < best)) best = kk; } });
    if (best !== null) { const all = RC[n + '#' + best]; const res = all.length > k ? all.slice(all.length - k) : all; RC[key] = res; return res; }
  }
  const s = sh_(n), lr = s.getLastRow(), lc = s.getLastColumn(); let res = [];
  if (lr >= 2) {
    const first = Math.max(2, lr - k + 1), h = s.getRange(1, 1, 1, lc).getValues()[0], v = s.getRange(first, 1, lr - first + 1, lc).getValues();
    res = v.map((r, i) => { const o = { _row: first + i }; h.forEach((c, j) => o[c] = r[j]); return o; });
  }
  if (RC) RC[key] = res;
  return res;
}
// อ่านท้ายชีตเท่าที่จำเป็น: เริ่มจากน้อยๆ แล้วขยาย ×4 จนกว่า done(แถว) จะพอใจ · คืน null ถ้าถึงเพดาน kmax แล้วยังไม่พอ (ให้ผู้เรียกอ่านทั้งชีตเอง)
function rowsTailUntil_(n, k0, kmax, done) {
  for (let k = Math.min(k0, kmax); ; k = Math.min(k * 4, kmax)) {
    const t = rowsTail_(n, k);
    if (t.length < k || done(t)) return t;
    if (k >= kmax) return null;
  }
}
function activeRows_() { return rowsTailUntil_('Orders', TAIL.act, TAIL.orders, t => t[0].created_at instanceof Date && Date.now() - t[0].created_at.getTime() > 14 * 3600000); } // ออเดอร์ล่าสุดที่ครอบคลุม 14 ชม. (อ่านเท่าที่จำเป็น)
function rowsOfDay_(n, field, day) { // แถวของวันนั้น: อ่านจากท้ายชีตก่อน ถ้ายังไม่ถึงวันก่อนหน้าค่อยขยาย
  const t = rowsTailUntil_(n, 300, TAIL.big, t => t.length && dstr_(t[0][field]) < day);
  return (t || rows_(n)).filter(o => dstr_(o[field]) === day);
}
const ordersOfDay_ = day => rowsOfDay_('Orders', 'created_at', day);
function itemsByOrder_(ids) {
  const want = {}; ids.forEach(i => want[i] = []);
  if (!ids.length) return want;
  const t = rowsTailUntil_('Order_Items', Math.max(300, ids.length * 8), TAIL.big * 3, t => { const seen = {}; t.forEach(i => seen[i.order_id] = 1); return ids.every(i => seen[i]) && !want[t[0].order_id]; }); // แถวแรกของท้ายชีตอาจถูกตัดครึ่ง จึงต้องไม่ใช่ของออเดอร์ที่ต้องการ
  (t || rows_('Order_Items')).forEach(i => { if (want[i.order_id]) want[i.order_id].push(i); });
  return want;
}
function unpaidLater_(o) { return isTrue_(o.pay_later) && !(o.paid_at instanceof Date) && o.status !== 'CANCELLED'; }
function payable_(o) { return !!o && (o.status === 'PENDING_PAY' || unpaidLater_(o)); }
function estPay_(gross, promo, claim, fee) { const base = r4_(gross - promo), pk = pickCoupon_({}, base, claim || ''); return Math.ceil(r4_(base - pk.discount) - 1e-9) + (fee || 0); } // ยอดที่ลูกค้าต้องโอนโดยประมาณ (หลังคูปอง/ส่วนลดอัตโนมัติ)
function feeOf_(o) { // ค่าส่งของออเดอร์: ถ้าค่าในชีตเพี้ยน (ไม่ใช่ตัวเลข 0-5000) ให้คำนวณย้อนจากยอดรวมที่บันทึกไว้
  const n = Number(o.fee); if (isFinite(n) && n >= 0 && n <= 5000) return n;
  if (String(o.fulfil || '') !== 'DELIVER') return 0;
  try { const g = grossOf_(o.order_id), d = Number(o.total) - Math.ceil(r4_(g - Math.min(g, Number(o.promo_disc) || 0)) - 1e-9); return isFinite(d) && d > 0 && d <= 5000 ? Math.round(d) : 0; } catch (e) { return 0; }
}
function infOf_(o) { let pay = Number(o.total) || 0; if (payable_(o)) { try { const g = grossOf_(o.order_id); pay = estPay_(g, Math.min(g, Number(o.promo_disc) || 0), String(o.coupon || ''), feeOf_(o)); } catch (e) {} } return { f: String(o.fulfil || ''), later: unpaidLater_(o), total: Number(o.total) || 0, fee: feeOf_(o), zone: String(o.zone || ''), pay: pay }; }
function zones_(S) { // delivery_zones: บรรทัดละพื้นที่ "ชื่อ | ค่าส่ง | สั่งขั้นต่ำ | ส่งฟรีเมื่อครบ"
  return String((S || set_()).delivery_zones || '').split('\n').map(s => s.trim()).filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); if (!p[0]) return null; return { name: p[0].slice(0, 40), fee: Math.max(0, Number(p[1]) || 0), min: Math.max(0, Number(p[2]) || 0), free: Math.max(0, Number(p[3]) || 0) }; }).filter(Boolean).slice(0, 30);
}
function svcOf_(S) { const z = zones_(S); return { delivery: Number(S.delivery_on) === 1 && z.length > 0, zones: z, dnote: String(S.delivery_note || ''), later: String(S.pay_mode || '') === 'LATER', contact: Number(S.contact_req) === 1 }; }
function orderOf_(id) { const t = rowsTailUntil_('Orders', 80, TAIL.orders, t => t.some(x => x.order_id == id)); return t ? t.find(x => x.order_id == id) : rows_('Orders').find(x => x.order_id == id); }
function itemsOf_(id) { const t = rowsTailUntil_('Order_Items', 150, TAIL.items, t => t.some(i => i.order_id == id) && t[0].order_id !== id); return (t || rows_('Order_Items')).filter(i => i.order_id == id); }
function paymentsOf_(id) { const t = rowsTailUntil_('Payments', 100, TAIL.items, t => t.some(p => p.order_id == id && Number(p.amount) > 0)); return (t || rows_('Payments')).filter(p => p.order_id == id && Number(p.amount) > 0); }

function putStatus_(id, qn, st, payBy, t0, paid, inf) { try { const c = CacheService.getScriptCache(), o = { queue_no: qn, status: st }; if (payBy) o.payBy = payBy; if (t0) o.t0 = t0;
  const h = c.get('os:' + id), prev = h ? JSON.parse(h) : {};
  if (paid) o.paid = paid; else if (prev.paid && st !== 'CANCELLED' && st !== 'PENDING_PAY') o.paid = prev.paid; // เก็บยอดที่จ่ายจริงไว้โชว์ลูกค้า
  if (inf) o.inf = inf; else if (prev.inf) o.inf = prev.inf;
  if (prev.slip && st !== 'CANCELLED') o.slip = 1;
  if (prev.rej && !o.slip && st !== 'CANCELLED') o.rej = prev.rej;
  c.put('os:' + id, JSON.stringify(o), 21600); } catch (e) {} }
function getOrderStatus(id) { // ลูกค้าเรียกซ้ำๆ เพื่อดูสถานะ: อ่านจากแคชก่อน (เร็วและไม่แตะชีต) · ออเดอร์ทดสอบจะเลื่อนขั้นตามเวลาที่นี่
  id = String(id || ''); if (!/^[0-9a-f]{8}$/i.test(id)) return { status: 'UNKNOWN' };
  const c = CacheService.getScriptCache(), hit = c.get('os:' + id); let r = hit ? JSON.parse(hit) : null;
  if (!r) {
    const o = orderOf_(id); if (!o) return { status: 'UNKNOWN' };
    const pb = o.status === 'PENDING_PAY' && o.expires_at instanceof Date ? o.expires_at.getTime() : null, t0 = isTrue_(o.is_test) && o.created_at instanceof Date ? o.created_at.getTime() : 0;
    r = { queue_no: o.queue_no, status: o.status }; if (pb) r.payBy = pb; if (t0) r.t0 = t0;
    if (['QUEUED', 'COOKING', 'READY', 'DONE'].indexOf(o.status) >= 0) r.paid = { total: Number(o.total) || 0, disc: Number(o.discount) || 0, label: labelOf_(o.promo_note, { code: String(o.coupon || '') }) };
    r.inf = infOf_(o); if (o.slip_id) r.slip = 1; putStatus_(id, o.queue_no, o.status, pb, t0, r.paid, r.inf);
  }
  const SS = set_(), man = autoManual_(SS);
  if (r.t0 && !man && ACTIVE.indexOf(r.status) >= 0 && AUTO_ST.indexOf(autoTarget_(new Date(r.t0), SS)) > AUTO_ST.indexOf(r.status)) {
    withLock_(() => autoAdvanceAll_()); const h2 = c.get('os:' + id); if (h2) r = JSON.parse(h2);
  }
  const out = { queue_no: r.queue_no, status: r.status }; if (r.payBy) out.payBy = r.payBy; if (r.paid && r.status !== 'CANCELLED' && r.status !== 'PENDING_PAY') out.paid = r.paid;
  if (r.inf) { out.fulfil = r.inf.f; out.later = !!r.inf.later && !r.paid; out.total = r.inf.total; out.fee = r.inf.fee; out.zone = r.inf.zone; out.pay = r.inf.pay; }
  if (r.slip) out.slip = 1; else if (r.rej) out.rej = r.rej;
  if (r.t0 && man && ACTIVE.indexOf(r.status) >= 0) out.man = 1;
  if (r.status === 'DONE') { // ลูกค้ารับสินค้าแล้วจึงแสดงลิงก์แบบสอบถาม (ไม่ผูกกับโหมดช่วงทดลอง)
    const S = set_(), u = String(S.survey_url || '').trim();
    if (/^https?:\/\/\S+$/i.test(u)) { out.survey = u; out.msg = String(S.survey_msg || ''); const o = orderOf_(id); if (o && o.order_code) out.code = String(o.order_code); }
    const at = String(set_().activity_title || '').trim(); if (at) { out.activity = at; out.actMsg = String(set_().activity_msg || ''); }
  }
  return out;
}

// ---- ล็อตสต็อก (FIFO): แต่ละครั้งที่รับของเข้าเป็น 1 ล็อต ราคาต่อหน่วยของล็อตนั้นคงที่ ใช้ล็อตเก่าก่อน ----
const LOTQ = {}; // แถว → qty_left ที่ยังไม่ได้เขียนลงชีต
function ensureLots_() { // ครั้งแรก: ตั้งสต็อกที่มีอยู่เป็นล็อตยอดยกมา ราคาตามที่ตั้งไว้ในวัตถุดิบ
  const s = sh_('Stock_Lots'); if (s.getLastRow() >= 2) return;
  const ing = rows_('Ingredients').filter(i => Number(i.stock) > 0); if (!ing.length) return;
  s.getRange(2, 1, ing.length, 7).setValues(ing.map(i => [uid_(), i.ing_id, new Date(), Number(i.stock), r6_(i.cost), Number(i.stock), 'ยอดยกมา']));
  if (RC) delete RC['Stock_Lots'];
}
function addLot_(ingId, qty, unitCost, note) {
  const id = uid_(); sh_('Stock_Lots').appendRow([id, ingId, new Date(), r4_(qty), r6_(unitCost), r4_(qty), note || '']);
  if (RC) delete RC['Stock_Lots']; return id;
}
function lotsOf_(ingId) {
  return rows_('Stock_Lots').filter(l => l.ing_id == ingId).map(l => ({ id: l.lot_id, row: l._row, date: l.date, cost: Number(l.unit_cost), left: LOTQ[l._row] !== undefined ? LOTQ[l._row] : Number(l.qty_left) })).filter(l => l.left > 0);
}
function frontCost_(i) { const l = lotsOf_(i.ing_id)[0]; return l ? l.cost : (Number(i.cost) || 0); }
function fifo_(i, qty, opt) { // คิดต้นทุน qty หน่วยจากล็อตเก่าสุดก่อน; opt.commit = ตัดล็อตจริง, opt.sink = เก็บรายการตัดล็อตไว้ย้อนกลับ
  opt = opt || {}; let left = r4_(qty), cost = 0;
  for (const l of lotsOf_(i.ing_id)) {
    if (left <= 0) break;
    const take = Math.min(left, l.left); cost += take * l.cost; left = r4_(left - take);
    if (opt.commit) { LOTQ[l.row] = r4_(l.left - take); if (opt.sink) opt.sink.push([opt.day, l.id, take]); }
  }
  if (left > 0) cost += left * (Number(i.cost) || 0); // ล็อตไม่พอ (ข้อมูลไม่ตรง) ใช้ราคาที่ตั้งไว้ในวัตถุดิบ
  return { cost: r4_(cost), short: left };
}
function saveLots_() {
  const ks = Object.keys(LOTQ).map(Number); if (!ks.length) return;
  const lo = Math.min.apply(null, ks), hi = Math.max.apply(null, ks), span = rows_('Stock_Lots').slice(lo - 2, hi - 1);
  sh_('Stock_Lots').getRange(lo, 6, span.length, 1).setValues(span.map(l => [LOTQ[l._row] !== undefined ? LOTQ[l._row] : l.qty_left]));
  Object.keys(LOTQ).forEach(k => delete LOTQ[k]); if (RC) delete RC['Stock_Lots'];
}
function ledgerAdd_(vals) {
  if (!vals.length) return; const s = sh_('Cost_Ledger'), r0 = s.getLastRow() + 1;
  s.getRange(r0, 1, vals.length, 1).setNumberFormat('@'); s.getRange(r0, 1, vals.length, 8).setValues(vals); if (RC) delete RC['Cost_Ledger'];
}
function platformsCfg_() { // เดลิเวอรี่ที่ร้านใช้ (ตั้งในหน้าตั้งค่า) ถ้ายังไม่เคยตั้งใช้ค่าเริ่มต้นสำหรับช่องเลือกอย่างเดียว
  const raw = String(set_().delivery_platforms || '').trim();
  if (!raw) return { list: ['Grab', 'LINE MAN', 'Foodpanda', 'Shopee Food'], explicit: false };
  return { list: raw.split('\n').map(s => s.trim()).filter(Boolean), explicit: true };
}
const printOn_ = S => !(S.print_slip !== undefined && S.print_slip !== '' && Number(S.print_slip) === 0);
function channelRows_(os, ds) { // ยอดขายแยกช่องทาง: เงินสด โอน และแต่ละแพลตฟอร์มเดลิเวอรี่ (เพื่อเช็คกับยอดจริงทีละช่อง)
  const rows = [{ key: 'CASH', label: 'เงินสด', sales: r4_(ds.byMethod.CASH || 0) }, { key: 'TRANSFER', label: 'โอน', sales: r4_(ds.byMethod.TRANSFER || 0) }], by = {};
  os.filter(o => o.channel === 'DELIVERY').forEach(o => { const p = String(o.platform || '').trim() || 'อื่นๆ'; by[p] = r4_((by[p] || 0) + Number(o.total)); });
  const cfg = platformsCfg_(), names = cfg.explicit ? cfg.list.slice() : []; // เจ้าที่ตั้งไว้แสดงทุกวัน (แม้ยอดเป็น 0) เจ้าอื่นที่เคยมีออเดอร์ต่อท้าย
  Object.keys(by).sort().forEach(p => { if (names.indexOf(p) < 0) names.push(p); });
  names.forEach(p => rows.push({ key: 'P:' + p, label: p, sales: by[p] || 0 }));
  return rows;
}
function saleUsageOf_(os) { // วัตถุดิบที่ใช้ตามสูตรของออเดอร์เหล่านี้ (รวมตัวเลือกเพิ่มที่ผูกวัตถุดิบ)
  const by = itemsByOrder_(os.map(o => o.order_id)), rm = recMap_(rows_('Menu'), rows_('Recipes'), rows_('Set_Items')), use = {};
  os.forEach(o => (by[o.order_id] || []).forEach(it => { const u = itemUse_(it, rm); Object.keys(u).forEach(k => use[k] = r4_((use[k] || 0) + u[k])); }));
  return use;
}
function daySales_(day, os) {
  const byChannel = {}, byMethod = {}; let total = 0, discount = 0, fee = 0;
  os.forEach(o => { byChannel[o.channel] = (byChannel[o.channel] || 0) + Number(o.total); total += Number(o.total); discount += Number(o.discount) || 0; fee += feeOf_(o); });
  rowsOfDay_('Payments', 'paid_at', day).forEach(p => byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount));
  return { byChannel: byChannel, byMethod: byMethod, total: r4_(total), discount: r4_(discount), fee: r4_(fee) };
}

const APP_VERSION = 41, APP_DATE = '2026-11-13'; // ทุกครั้งที่ออกเวอร์ชันใหม่: เพิ่มเลขนี้ (ใช้ตรวจว่าแต่ละร้านใช้เวอร์ชันไหน)
function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter.page : '';
    if (p === 'ver') return ContentService.createTextOutput(String(APP_VERSION)); // ผู้ดูแลระบบเช็คเวอร์ชันของร้านจากลิงก์ ?page=ver
    if (p === 'diag') return diag_();
    if (p === 'test') return HtmlService.createHtmlOutput('<p id="a" style="font:18px sans-serif;padding:20px">HTML ok</p><script>var a=document.getElementById("a");a.textContent="HTML ok / JS ok";var t=Date.now();google.script.run.withSuccessHandler(function(){a.textContent+=" / server ok "+(Date.now()-t)+" ms"}).withFailureHandler(function(x){a.textContent+=" / server ERROR "+x.message}).ping();</script>');
    // ไม่ใช้ template: หน้าเว็บอ่านพารามิเตอร์ ?page= เองฝั่งเบราว์เซอร์
    let html = HtmlService.createHtmlOutputFromFile('Index').getContent();
    // ตรวจว่าวางไฟล์ถูกประเภท ถ้าผิดให้บอกชัดๆ แทนที่จะแสดงข้อความแปลกๆ ในหน้าเว็บ
    const bad = typeof CLIENT_B64 === 'undefined' ? 'ยังไม่พบไฟล์ ClientCode — ต้องสร้างเป็นไฟล์ชนิด Script (.gs) ชื่อ ClientCode แล้ววางเนื้อหาจาก ClientCode.gs'
      : (html.indexOf('id="app"') < 0 || html.indexOf('CLIENT_B64') >= 0) ? 'ไฟล์ Index (ชนิด HTML) มีเนื้อหาผิด — ต้องเป็นเนื้อหาจากไฟล์ Index.html ไม่ใช่ ClientCode.gs' : '';
    if (bad) return HtmlService.createHtmlOutput('<div style="font:16px sans-serif;padding:20px;line-height:1.6"><b>ตั้งค่าไฟล์ในโปรเจกต์ Apps Script ไม่ถูกต้อง</b><p style="color:#b91c1c">' + bad + '</p><p>ที่ถูกต้องต้องมี 3 ไฟล์: <b>Code</b> (Script) = Code.gs · <b>ClientCode</b> (Script) = ClientCode.gs · <b>Index</b> (HTML) = Index.html · และลบไฟล์ Client.html เก่าออก</p></div>');
    // ฝังโค้ดแอป + ข้อมูลแรกเป็น Base64 ในหน้าเลย หน้าจึงไม่ต้องรอเรียกเซิร์ฟเวอร์อีกรอบ
    try {
      if (html.indexOf('"__BOOT__"') >= 0) {
        const b64 = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(bootPayload_(p))).getBytes());
        const out = HtmlService.createHtmlOutput(html.replace('"__BOOT__"', '"' + b64 + '"'));
        return out.setTitle('Pang Kum').addMetaTag('viewport', 'width=device-width, initial-scale=1');
      }
    } catch (e2) { /* ฝังไม่ได้ → ใช้วิธีเดิม หน้าจะเรียก getBoot เอง */ }
    return HtmlService.createHtmlOutputFromFile('Index').setTitle('Pang Kum').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:20px">เกิดข้อผิดพลาด: ' + err.message + '<br>ตรวจสอบว่ามีไฟล์ชื่อ Index (HTML) ในโปรเจกต์</p>');
  }
}
function ping() { return 'pong'; }
// ส่งโค้ดฝั่งหน้าเว็บ (ไฟล์ Client) เป็นข้อความ แล้วให้หน้าเว็บนำไปรันเอง
function getClient() {
  return Utilities.newBlob(Utilities.base64Decode(CLIENT_B64)).getDataAsString('UTF-8');
}

function diag_() { // เปิด ?page=diag เพื่อตรวจว่าเซิร์ฟเวอร์ทำงานและใช้เวลาเท่าไร
  const out = [], t0 = Date.now();
  try {
    const ss = ss_(); out.push('spreadsheet: ' + (ss ? ss.getName() : 'ไม่พบ (สคริปต์ต้องสร้างจาก Extensions > Apps Script ในชีต)'));
    out.push('sheets: ' + ss.getSheets().map(s => s.getName()).join(', '));
    const m = getMenu(); out.push('getMenu OK: ' + m.menus.length + ' เมนู, ' + (Date.now() - t0) + ' ms');
  } catch (err) { out.push('ERROR: ' + err.message); }
  return HtmlService.createHtmlOutput('<pre style="font:15px monospace;padding:16px;white-space:pre-wrap">' + out.join('\n').replace(/</g, '&lt;') + '</pre>');
}

// ---------- helpers ----------
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
const SHC = {};
var OCOL = null;
function ocol_(name) { // ตำแหน่งคอลัมน์จริงของชีต Orders อ่านจากหัวตาราง (ไม่เดาจากลำดับในโค้ด)
  const s = sh_('Orders'); if (!OCOL) { const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(String); OCOL = {}; h.forEach((x, i) => { if (!(x in OCOL)) OCOL[x] = i + 1; }); }
  if (!OCOL[name]) throw new Error('ไม่พบคอลัมน์ ' + name + ' ในชีต Orders');
  return OCOL[name];
}
function sh_(n) { // สร้างชีตให้อัตโนมัติถ้ายังไม่มี และเพิ่มหัวคอลัมน์ใหม่ให้ชีตเดิมอัตโนมัติ (ไม่แตะข้อมูลเดิม)
  if (SHC[n]) return SHC[n];
  let s = ss_().getSheetByName(n);
  if (!s) {
    if (!SH[n]) return null;
    s = ss_().insertSheet(n); s.appendRow(SH[n]); s.setFrozenRows(1);
  } else if (SH[n]) {
    const lc = s.getLastColumn();
    if (lc < SH[n].length) s.getRange(1, lc + 1, 1, SH[n].length - lc).setValues([SH[n].slice(lc)]);
  }
  return SHC[n] = s;
}
let RC = null; // แคชการอ่านชีตชั่วคราว ใช้เฉพาะงานอ่านอย่างเดียว (getMenu) เพื่อให้โหลดเร็ว
function rows_(n) {
  if (RC && RC[n]) return RC[n];
  const v = sh_(n).getDataRange().getValues(); const h = v.shift();
  const res = v.map((r, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => o[k] = r[j]); return o; });
  if (RC) RC[n] = res;
  return res;
}
// ชื่อเดิมของระบบ (Pang Sieb Mai) แสดงเป็นชื่อใหม่ Pang Kum อัตโนมัติ ชื่ออื่นที่ตั้งเองไม่ถูกแตะ
function set_() { const o = { order_note: '' }; crows_('Settings').forEach(r => o[r.key] = r.value); if (o.shop_name === 'Pang Sieb Mai') o.shop_name = 'Pang Kum'; if (!o.prep_min_per_queue) o.prep_min_per_queue = o.prep_min_per_item || 2;
  if (!o.max_pending_per_device) o.max_pending_per_device = 2; if (!o.max_pending_total) o.max_pending_total = 15; if (!o.cust_max_items) o.cust_max_items = 20; if (!o.trial_prefix) o.trial_prefix = 'T';
  return o; }
// แคชข้อมูลที่แก้ไม่บ่อย (ตั้งค่า/เมนู/สูตร) 2 นาที เพื่อให้หน้าลูกค้าโหลดเร็ว เคลียร์เองเมื่อบันทึกจากหน้าเว็บ
function crows_(n) {
  const c = CacheService.getScriptCache(), k = 'c:' + n, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  const r = rows_(n); try { c.put(k, JSON.stringify(r), 120); } catch (e) {} return r;
}
function bust_() { CacheService.getScriptCache().removeAll(['c:Settings', 'c:Menu', 'c:Recipes', 'c:Coupons', 'c:Staff', 'c:Options', 'c:Promos', 'c:Set_Items', 'boot:c', 'disp']); }
function fmt_(v, f) { return v instanceof Date ? Utilities.formatDate(v, TZ, f) : String(v); }
function today_() { return fmt_(new Date(), 'yyyy-MM-dd'); }
function uid_() { return Utilities.getUuid().slice(0, 8); }
function withLock_(f) { // ภายใน lock อ่านแต่ละชีตครั้งเดียว (แคช RC) และเขียน Stock_Log รวดเดียวตอนจบ เพื่อให้เร็ว
  const l = LockService.getScriptLock(), prev = RC; l.waitLock(20000); RC = {};
  try { return f(); } finally { try { flushLog_(); } finally { RC = prev; l.releaseLock(); } }
}
let LOGQ = [];
function log_(ing, delta, reason, ref) { LOGQ.push([new Date(), ing, delta, reason, ref || '', ACTOR ? ACTOR.name : '']); if (RC === null) flushLog_(); }
function flushLog_() {
  if (!LOGQ.length) return; const q = LOGQ, s = sh_('Stock_Log'); LOGQ = [];
  s.getRange(s.getLastRow() + 1, 1, q.length, 6).setValues(q);
}
function saveStock_() { // เขียนคอลัมน์สต็อกทั้งหมดครั้งเดียว (ค่าในแคชถูกอัปเดตแล้ว)
  const ing = rows_('Ingredients'); if (!ing.length) return;
  sh_('Ingredients').getRange(2, 4, ing.length, 1).setValues(ing.map(i => [i.stock])); bustBoot_();
}
function auth_(tok, opt) {
  tok = String(tok || ''); const c = CacheService.getScriptCache();
  const raw = /^T[0-9a-f]{64}$/.test(tok) ? c.get('ses:' + tok) : null;
  if (!raw) throw new Error('หมดเวลาเข้าระบบ กรุณาเข้าสู่ระบบใหม่');
  const ses = JSON.parse(raw), u = staffTable_().find(s => s.staff_id == ses.id);
  if (!u || !isTrue_(u.active) || String(u.pin_hash).slice(0, 8) !== ses.pv) { c.remove('ses:' + tok); throw new Error('หมดเวลาเข้าระบบ กรุณาเข้าสู่ระบบใหม่'); }
  if (isTrue_(u.must_change) && !(opt && opt.allowPending)) throw new Error('ต้องเปลี่ยน PIN ก่อนใช้งาน');
  if (Date.now() - ses.t > 3600000) { ses.t = Date.now(); c.put('ses:' + tok, JSON.stringify(ses), SES_TTL); }
  return ACTOR = { id: u.staff_id, name: String(u.name), role: u.role };
}

// ปัดทศนิยม 4 ตำแหน่ง ป้องกันค่าคลาดเคลื่อนของ floating point (เช่น 0.1+0.2) ใช้กับสูตร BOM และสต็อก
const r4_ = x => Math.round((Number(x) + Number.EPSILON) * 10000) / 10000;

// จำนวนที่ขายได้ต่อเมนู = ค่าต่ำสุดของ (สต็อก ÷ ปริมาณในสูตร)
function avail_(menus, rm, ing) { // จำนวนที่ขายได้ต่อเมนู = ค่าต่ำสุดของ (สต็อก ÷ ปริมาณในสูตร)
  const st = {}; ing.forEach(i => st[i.ing_id] = Number(i.stock));
  const out = {};
  menus.forEach(m => {
    const r = rm[m.menu_id] || {}, ks = Object.keys(r);
    out[m.menu_id] = ks.length ? Math.max(0, Math.min.apply(null, ks.map(k => Math.floor(r4_((st[k] || 0) / Number(r[k])))))) : 9999; // ยังไม่ผูกสูตร = ไม่ตัดสต็อก ขายได้ไม่จำกัด
  });
  return out;
}
function queueCount_() { // จำนวนคิวที่ค้างอยู่ (จ่ายเงินแล้ว รอทำ/กำลังทำ)
  return rowsTail_('Orders', TAIL.act).filter(o => o.status === 'QUEUED' || o.status === 'COOKING').length;
}
function eta_(queues, S) { return Math.ceil(queues * Number(S.prep_min_per_queue) / Math.max(1, Number(S.parallel_slots) || 1)); }

const isPack_ = i => i.is_pack === true || String(i.is_pack).toLowerCase() === 'true';
// วัตถุดิบที่ตั้งเป็น "ของใช้ประจำวัน" (ถุง/แก้ว ฯลฯ): ไม่อยู่ในสูตร ตัดสต็อกและนับเป็นต้นทุนตอนปิดวัน
function coupon_(code, gross) {
  code = String(code || '').trim(); if (!code) return { discount: 0, code: '' };
  const c = rows_('Coupons').find(x => String(x.code) === code && x.active !== false && !isTrue_(x.survey));
  if (!c) throw new Error('ไม่พบคูปองนี้หรือปิดใช้งานแล้ว');
  const v = Number(c.value) || 0, raw = c.type === 'PERCENT' ? gross * v / 100 : v;
  return { discount: Math.min(Math.floor(gross + 1e-9), Math.floor(raw + 1e-9)), code: String(c.code), label: String(c.code) };
}
function cpMode_(c) { const m = String(c.mode || '').toUpperCase(); return m === 'CUSTOMER' || m === 'AUTO' ? m : ''; }
function cpAmt_(c, gross) { const v = Number(c.value) || 0, raw = c.type === 'PERCENT' ? gross * v / 100 : v; return Math.min(Math.floor(gross + 1e-9), Math.floor(raw + 1e-9)); }
function autoCoupon_(gross) { // คูปองโหมด "ลดอัตโนมัติ": เลือกอันที่ลดได้มากที่สุด
  let best = null;
  crows_('Coupons').forEach(c => { if (c.code === '' || c.code == null || c.active === false || isTrue_(c.survey) || cpMode_(c) !== 'AUTO') return; const d = cpAmt_(c, gross); if (d > 0 && (!best || d > best.d)) best = { code: String(c.code), d: d }; });
  return best ? coupon_(best.code, gross) : { discount: 0, code: '' };
}
// ลำดับส่วนลดตอนรับเงิน: พนักงานเลือกเอง → (พนักงานกด "ไม่ใช้คูปอง") ไม่ลด → คูปองที่ลูกค้ากดไว้ → คูปองอัตโนมัติ
function pickCoupon_(co, base, claim) {
  co = co || {};
  if (String(co.coupon || '').trim()) return coupon_(co.coupon, base);
  if (co.noCoupon) return { discount: 0, code: '' };
  let r = null; if (claim) { try { r = coupon_(claim, base); } catch (e) {} }
  const a = autoCoupon_(base); // ลูกค้ากดคูปองไว้ แต่มีคูปองอัตโนมัติที่ลดมากกว่า → ใช้ใบที่ดีกว่า (ใช้ทีละใบ)
  return r && r.discount >= a.discount ? r : a;
}
function grossOf_(id) { return r4_(itemsOf_(id).reduce((a, i) => a + Number(i.qty) * Number(i.price), 0)); }
function ckOpts_() { // ตัวเลือกตอนคิดเงิน: คูปองที่เปิดใช้ (ไม่รวมคูปองสำหรับรหัสแบบสอบถาม)
  return {
    coupons: crows_('Coupons').filter(c => c.code !== '' && c.code != null && c.active !== false && !isTrue_(c.survey))
      .map(c => ({ code: String(c.code), type: c.type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT', value: Number(c.value) || 0, note: String(c.note || ''), mode: cpMode_(c) })),
    survey: false
  };
}
const PAYL = { CASH: 'เงินสด', TRANSFER: 'โอน', PLATFORM: 'ผ่านแพลตฟอร์ม' };
function rcpt_(qn, when, its, total, disc, code, pay, ocode) {
  const S = set_();
  return { shop: S.shop_name, queue_no: qn, total: total, discount: disc, coupon: code, pieces: its.filter(i => !/^ค่าจัดส่ง/.test(String(i.name))).reduce((a, i) => a + i.qty, 0), time: fmt_(when, 'dd/MM/yy HH:mm'), pay: pay, items: its,
    ocode: ocode || '', survey: ocode ? String(S.survey_url || '') : '', smsg: ocode ? String(S.survey_msg || '') : '' };
}
function getCheckoutOpts(pin) { auth_(pin); return ckOpts_(); }

function restore_(id, reason) {
  const rm = recMap_(rows_('Menu'), rows_('Recipes'), rows_('Set_Items')), ing = rows_('Ingredients'); let changed = false;
  const put = (i, add) => { i.stock = r4_(Number(i.stock) + add); log_(i.ing_id, add, reason, id); changed = true; };
  itemsOf_(id).forEach(it => { const u = itemUse_(it, rm); Object.keys(u).forEach(k => { const i = ing.find(z => z.ing_id == k); if (i && u[k] > 0) put(i, u[k]); }); });
  // เผื่อออเดอร์เก่าที่เคยตัดถุง/แก้วตอนคิดเงิน (เวอร์ชันก่อนหน้า)
  rowsTail_('Stock_Log', 600).filter(x => x.ref == id && x.reason === 'บรรจุภัณฑ์' && Number(x.delta) < 0).forEach(x => {
    const i = ing.find(z => z.ing_id == x.ing_id); if (i) put(i, r4_(-Number(x.delta)));
  });
  if (changed) saveStock_();
}
function expireNow_() { // ล็อกเฉพาะเมื่อมีออเดอร์หมดอายุจริง (อ่านอย่างเดียวจะได้ไม่ไปบล็อกการขาย)
  const now = new Date();
  if (!rowsTail_('Orders', TAIL.act).some(o => o.status === 'PENDING_PAY' && !o.slip_id && o.expires_at instanceof Date && o.expires_at < now)) return 0; // มีสลิปแล้ว = ไม่หมดเวลา รอร้านตรวจ
  return withLock_(() => expire_());
}
function expire_() { // เรียกภายใน lock เท่านั้น คืนจำนวนออเดอร์ที่หมดอายุ · เครื่องที่ปล่อยออเดอร์หมดอายุซ้ำๆ จะถูกบล็อกอัตโนมัติ
  const now = new Date(), c = CacheService.getScriptCache(); let n = 0;
  rowsTail_('Orders', TAIL.act).filter(o => o.status === 'PENDING_PAY' && !o.slip_id && o.expires_at instanceof Date && o.expires_at < now).forEach(o => {
    restore_(o.order_id, 'ออเดอร์หมดอายุ'); sh_('Orders').getRange(o._row, 7).setValue('CANCELLED'); o.status = 'CANCELLED'; putStatus_(o.order_id, o.queue_no, 'CANCELLED'); n++;
    const d = String(o.device || '');
    if (d) { const k = 'xp:' + d, m = (Number(c.get(k)) || 0) + 1; c.put(k, String(m), 7200); if (m >= 3) blockDevice_(d, 2 * 3600000); }
  });
  return n;
}

// ---------- customer / shared ----------
// โหลดเร็ว: อ่านเฉพาะสต็อกสด ส่วนรูปและเวลาคิวโหลดตามหลัง (getImages / getQueue)
function getMenu() {
  const S = set_(), all = crows_('Menu'), menus = all.filter(m => m.active !== false), rec = crows_('Recipes'), sets = crows_('Set_Items'), ing = rows_('Ingredients');
  const rm = recMap_(menus, rec, sets), av = avail_(menus, rm, ing), st = {}; ing.forEach(i => st[i.ing_id] = Number(i.stock));
  return {
    shop: S.shop_name, note: S.order_note || '', queueMin: null, logo: '',
    menus: menus.map((m, i) => ({ ord: i, menu_id: m.menu_id, name: m.name, price: Number(m.price), unit: m.unit || 'ชิ้น', type: m.type === 'SET' ? 'SET' : '', contents: m.type === 'SET' ? setText_(m.menu_id, all, sets) : '', notes: notesOf_(m), avail: av[m.menu_id], img: '' })).sort((a, b) => (a.avail < 1) - (b.avail < 1) || a.ord - b.ord), // ลำดับตามที่เจ้าของจัด · เมนูที่หมดไปอยู่ท้าย
    options: crows_('Options').filter(o => o.opt_id && o.name && o.active !== false).map(o => ({ opt_id: o.opt_id, name: String(o.name), price: Number(o.price) || 0, menu_ids: optMenus_(o), avail: o.ing_id && Number(o.ing_qty) > 0 ? Math.max(0, Math.floor(r4_((st[o.ing_id] || 0) / Number(o.ing_qty)))) : 9999 })),
    promos: activePromos_(),
    coupons: crows_('Coupons').filter(c => c.code !== '' && c.code != null && c.active !== false && !isTrue_(c.survey) && cpMode_(c)).map(c => ({ code: String(c.code), type: c.type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT', value: Number(c.value) || 0, note: String(c.note || ''), mode: cpMode_(c) })),
    activity: String(S.activity_title || '').trim(),
    svc: svcOf_(S)
  };
}
function getQueue() { RC = {}; try { const expired = expireNow_(); if (expired) RC = {}; return { queueMin: eta_(queueCount_(), set_()), expired: expired }; } finally { RC = null; } }
function getImgData(key) { // สำรองให้เบราว์เซอร์ที่โหลดรูปจาก Drive ไม่ได้ (เช่น Safari บน iPhone): ส่งรูปเป็นข้อมูลโดยตรง
  key = String(key || ''); if (key !== 'logo' && !/^menu:[\w-]+$/.test(key)) return '';
  const r = rows_('Images').find(x => x.key == key); if (!r) return '';
  const v = String(r.data || ''); if (v.indexOf('data:') === 0) return v;
  const id = imgUrlId_(v); if (!id) return '';
  const b = DriveApp.getFileById(id).getBlob();
  return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
}
function getImages() {
  const im = imgs_(), o = { logo: im.logo || '', qr: im.qr || '', pp: String(set_().pay_promptpay || '') ? 1 : 0, menu: {} };
  Object.keys(im).forEach(k => { if (k.indexOf('menu:') === 0) o.menu[k.slice(5)] = im[k]; });
  return o;
}

function placeOrder(cart, opt) {
  opt = opt || {};
  if (opt.staff) auth_(opt.pin); else opt = { dev: opt.dev, coupon: opt.coupon, name: opt.name, phone: opt.phone, note: opt.note, fulfil: opt.fulfil, zone: opt.zone, addr: opt.addr };
  const staff = !!opt.staff;
  return withLock_(() => {
    expire_();
    if (rows_('Daily_Close').some(r => dstr_(r.date) === today_())) throw new Error('วันนี้ปิดวันแล้ว รับออเดอร์เพิ่มไม่ได้ (เจ้าของกด "เปิดวันอีกครั้ง" ที่หน้าสรุปได้)');
    const S = set_(), c = CacheService.getScriptCache();
    let dev = '';
    if (!staff) { // ด่านกันออเดอร์ปลอมจากลูกค้า
      dev = String(opt.dev || '');
      if (!/^[A-Za-z0-9_-]{8,40}$/.test(dev)) throw new Error('ยืนยันเครื่องไม่ได้ กรุณารีเฟรชหน้าแล้วลองใหม่');
      if (isBlocked_(dev)) throw new Error('เครื่องนี้ถูกจำกัดการสั่งชั่วคราว กรุณาสั่งที่เคาน์เตอร์');
      if (c.get('rl:' + dev)) throw new Error('สั่งถี่เกินไป กรุณารอสักครู่แล้วลองใหม่');
      const pend = rowsTail_('Orders', TAIL.act).filter(o => o.status === 'PENDING_PAY'), mine = pend.filter(o => String(o.device) === dev).length;
      if (mine >= (Number(S.max_pending_per_device) || 2)) throw new Error('คุณมีออเดอร์ที่ยังไม่ได้ชำระ ' + mine + ' รายการ กรุณาไปชำระที่เคาน์เตอร์ก่อน (หรือรอให้หมดเวลา) แล้วค่อยสั่งเพิ่ม');
      if (pend.length >= (Number(S.max_pending_total) || 15)) throw new Error('ตอนนี้มีออเดอร์รอชำระจำนวนมาก กรุณาสั่งที่เคาน์เตอร์');
      if (String(S.pay_mode || '') === 'LATER' && rowsTail_('Orders', TAIL.act).filter(o => unpaidLater_(o) && String(o.device) === dev).length >= (Number(S.max_unpaid_per_device) || 8)) throw new Error('คุณมีออเดอร์ที่ยังไม่ได้ชำระหลายรายการ กรุณาชำระที่ร้านก่อนสั่งเพิ่ม');
    }
    const menus = rows_('Menu'), rec = rows_('Recipes'), ing = rows_('Ingredients'), sets = rows_('Set_Items'), ops = rows_('Options');
    const rm = recMap_(menus, rec, sets), av = avail_(menus, rm, ing), items = [], need = {}, per = {}, units = [];
    let gross = 0, qty = 0;
    (cart || []).forEach(l => {
      const m = menus.find(x => x.menu_id == l.menu_id && x.active !== false), q = Math.floor(Number(l.qty));
      if (!m || !(q >= 1)) return;
      const chosen = [];
      (Array.isArray(l.opts) ? l.opts : []).slice(0, 12).forEach(oid => {
        const o = ops.find(z => z.opt_id == oid && z.active !== false && optFits_(z, m.menu_id));
        if (!o) throw new Error('ตัวเลือกบางอย่างของ "' + m.name + '" ไม่มีแล้ว กรุณาเลือกใหม่');
        if (!chosen.some(z => z.opt_id == o.opt_id)) chosen.push(o);
      });
      per[m.menu_id] = (per[m.menu_id] || 0) + q;
      if (per[m.menu_id] > av[m.menu_id]) throw new Error('"' + m.name + '" ' + (av[m.menu_id] ? 'เหลือ ' + av[m.menu_id] + ' ที่' : 'หมดแล้ว'));
      Object.keys(rm[m.menu_id]).forEach(k => need[k] = r4_((need[k] || 0) + rm[m.menu_id][k] * q));
      chosen.forEach(o => { if (o.ing_id && Number(o.ing_qty) > 0) need[o.ing_id] = r4_((need[o.ing_id] || 0) + Number(o.ing_qty) * q); });
      const optSnap = chosen.map(o => ({ id: o.opt_id, name: String(o.name), price: Number(o.price) || 0, ing_id: String(o.ing_id || ''), qty: Number(o.ing_qty) || 0 }));
      const unit = r4_(Number(m.price) + optSnap.reduce((a, o) => a + o.price, 0));
      items.push({ m: m, q: q, unit: unit, opts: optSnap, note: cleanTxt_(l.note, 80), detail: m.type === 'SET' ? setText_(m.menu_id, menus, sets) : '', use: rm[m.menu_id] });
      for (let i = 0; i < q; i++) units.push({ menu_id: m.menu_id, price: Number(m.price) });
      gross += q * unit; qty += q;
    });
    if (!items.length) throw new Error('ยังไม่ได้เลือกสินค้า');
    if (!staff && qty > (Number(S.cust_max_items) || 20)) throw new Error('สั่งผ่านหน้านี้ได้ครั้งละไม่เกิน ' + (Number(S.cust_max_items) || 20) + ' รายการ หากต้องการมากกว่านี้กรุณาแจ้งที่เคาน์เตอร์');
    Object.keys(need).forEach(k => { const g = ing.find(i => i.ing_id == k); if (!g || Number(g.stock) < need[k]) throw new Error('วัตถุดิบ' + (g ? ' "' + g.name + '"' : '') + ' ไม่พอ กรุณาลดจำนวนหรือเอาตัวเลือกเพิ่มออก'); });
    const channel = staff && opt.channel === 'DELIVERY' ? 'DELIVERY' : 'STORE';
    const pm = staff && ['CASH', 'TRANSFER'].indexOf(opt.payMethod) >= 0 ? opt.payMethod : '';
    const method = channel === 'DELIVERY' ? 'PLATFORM' : pm;
    gross = r4_(gross);
    const pr = channel === 'DELIVERY' ? { discount: 0, applied: [] } : promoCalc_(units, activePromos_(), nowInfo_()); // เดลิเวอรี่ไม่ใช้โปรของร้าน
    const promoD = Math.min(gross, pr.discount), promoNote = pr.applied.map(a => a.name).join(' + ');
    let claim = ''; // ลูกค้ากดเลือกคูปองเอง: จดไว้กับออเดอร์ แล้วหักตอนชำระเงิน
    if (!staff && String(opt.coupon || '').trim()) {
      const cc = rows_('Coupons').find(x => String(x.code) === String(opt.coupon).trim() && x.active !== false && !isTrue_(x.survey) && cpMode_(x) === 'CUSTOMER');
      if (!cc || channel === 'DELIVERY') throw new Error('คูปองนี้ใช้ไม่ได้ (อาจปิดใช้งานแล้ว)'); claim = String(cc.code);
    }
    const sv = svcOf_(S), later = !staff && sv.later;
    const cname = cleanTxt_(opt.name, 40), cphone = String(opt.phone || '').replace(/[^0-9]/g, '').slice(0, 15), onote = cleanTxt_(opt.note, 200);
    let fulfil = '', zone = '', addr = '', fee = 0;
    if (!staff && String(opt.fulfil) === 'DELIVER') {
      if (!sv.delivery) throw new Error('ขณะนี้ร้านไม่มีบริการจัดส่ง');
      const z = sv.zones.find(x => x.name === String(opt.zone || '')); if (!z) throw new Error('กรุณาเลือกพื้นที่จัดส่ง');
      addr = cleanTxt_(opt.addr, 150); if (addr.length < 5) throw new Error('กรุณากรอกที่อยู่จัดส่งให้ครบ');
      const sub = r4_(gross - promoD); if (z.min > 0 && sub < z.min) throw new Error('พื้นที่ ' + z.name + ' สั่งขั้นต่ำ ' + z.min + ' บาท');
      fee = z.free > 0 && sub >= z.free ? 0 : z.fee; fulfil = 'DELIVER'; zone = z.name;
    }
    if (!staff && (sv.contact || fulfil === 'DELIVER')) { if (!cname) throw new Error('กรุณากรอกชื่อ'); if (cphone.length < 8) throw new Error('กรุณากรอกเบอร์โทรให้ถูกต้อง'); }
    const id = uid_(), cp = pm ? discountOf_(opt, r4_(gross - promoD), id, '') : { discount: 0, code: '' }; // คูปอง/รหัสแบบสอบถามใช้ตอนรับเงินหน้าร้านเท่านั้น
    const netI = Math.ceil(r4_(gross - promoD - cp.discount) - 1e-9), net = netI + fee, disc = r4_(gross - netI); // ปัดยอดชำระขึ้นเป็นบาทเต็ม (ค่าส่งบวกหลังหักส่วนลด)

    const trial = trialOn_(S), cnt = trial ? 0 : ordersOfDay_(today_()).length + 1, tcode = trial ? nextTrialCode_(S) : '', qn = trial ? tcode : S.queue_prefix + (cnt < 10 ? '0' + cnt : cnt); // ช่วงทดลอง: เลขคิวรันต่อเนื่อง (ตัวอักษร 1 ตัว + เลข 2 หลัก) และใช้เลขเดียวกันเป็นรหัสแบบสอบถาม
    const eta = eta_(queueCount_() + 1, S);
    const status = method || later ? 'QUEUED' : 'PENDING_PAY';
    const wait = eta_(queueCount_(), S), cap = Math.max(Number(S.pending_max_min) || 30, Number(S.pending_expire_min)), payMin = Math.min(Number(S.pending_expire_min) + wait, cap); // เวลารอชำระ = เวลาพื้นฐาน + เวลารอคิวตอนนี้ แต่ไม่เกินเพดาน
    const expires = method || later ? '' : new Date(Date.now() + payMin * 60000);
    const ocode = tcode, test = !staff && trialOn_(S) && Number(S.trial_auto) === 1; // โหมดทดสอบ: ระบบกดขั้นตอนพนักงานให้เอง

    Object.keys(need).forEach(k => { const i = ing.find(z => z.ing_id == k); i.stock = r4_(Number(i.stock) - need[k]); log_(k, -need[k], 'ขาย', id); });
    if (Object.keys(need).length) saveStock_();
    sh_('Orders').appendRow([id, qn, new Date(), channel, cleanTxt_(opt.platform, 40), cleanTxt_(opt.externalRef, 40), status, net, eta, staff ? ACTOR.name : 'ลูกค้า', expires, disc, cp.code || claim, dev, '', ocode, promoD, promoNote, test ? true : '', method ? new Date() : '', cname, '', onote, fulfil, addr, zone, fee || '', later ? true : '']);
    if (cphone) { const osh = sh_('Orders'); osh.getRange(osh.getLastRow(), ocol_('cust_phone')).setNumberFormat('@').setValue(cphone); } // เก็บเบอร์เป็นข้อความ (ไม่ตัดเลข 0 หน้า)
    const oi = sh_('Order_Items');
    oi.getRange(oi.getLastRow() + 1, 1, items.length, 9).setValues(items.map(x => [id, x.m.menu_id, x.m.name, x.q, x.unit, x.opts.length ? JSON.stringify(x.opts) : '', x.note, x.detail, JSON.stringify(x.use)]));
    if (method) sh_('Orders').getRange(sh_('Orders').getLastRow(), ocol_('pay_method')).setValue(method);
    if (method) sh_('Payments').appendRow([uid_(), id, method, net, new Date(), staff ? ACTOR.name : '', '', '']);
    if (cp.survey) { sh_('Survey_Used').appendRow([cp.code, id, new Date(), ACTOR.name]); if (RC) delete RC['Survey_Used']; }
    if (!staff) c.put('rl:' + dev, '1', 8);
    putStatus_(id, qn, status, expires ? expires.getTime() : null, test ? Date.now() : 0, method ? { total: net, disc: disc, label: labelOf_(promoNote, cp) } : null, { f: fulfil, later: later, total: net, fee: fee, zone: zone, pay: method ? net : estPay_(gross, promoD, claim, fee) });
    if (staff && method && method !== 'PLATFORM') { audit_('PAY', qn, PAYL[method] + ' (สั่งแทน)', net); if (cp.discount > 0) audit_('DISCOUNT', qn, cp.label || cp.code, cp.discount); }
    const rcItems = items.map(x => ({ name: x.m.name, qty: x.q, price: x.unit, extra: extraOf_(x.detail, x.opts, x.note) }));
    return { order_id: id, queue_no: qn, order_code: ocode, survey_url: ocode ? String(S.survey_url || '') : '', survey_msg: ocode ? String(S.survey_msg || '') : '', auto: test, step: autoStep_(S), total: net, discount: disc, claim: claim ? (() => { const pk = pickCoupon_({}, r4_(gross - promoD), claim); return { code: pk.code, discount: pk.discount }; })() : null, promo: promoD, promoNames: promoNote, eta: eta, status: status, later: later, fulfil: fulfil, fee: fee, payAmt: method ? net : estPay_(gross, promoD, claim, fee), expireMin: payMin, waitMin: wait, payBy: (method || later) ? null : expires.getTime(), pieces: qty,
      receipt: method ? rcpt_(qn, new Date(), rcItems, net, disc, labelOf_(promoNote, cp), PAYL[method], ocode) : null };
  });
}

// ---------- staff ----------
function staffData(pin) {
  const U = auth_(pin); RC = {};
  try {
    rowsTailUntil_('Orders', TAIL.act, TAIL.orders, t => t[0].created_at instanceof Date && Date.now() - t[0].created_at.getTime() > 14 * 3600000); // อ่านเท่าที่ครอบคลุมออเดอร์ 14 ชม.ล่าสุด
    if (expireNow_() + autoNow_()) RC = {};
    const act = activeRows_().filter(o => ACTIVE.indexOf(o.status) >= 0), dueRows = rowsTail_('Orders', TAIL.orders).filter(unpaidLater_), byId = itemsByOrder_(act.concat(dueRows.filter(d => !act.some(a => a.order_id === d.order_id))).map(o => o.order_id));
    const mapO = o => ({
      paidAt: o.paid_at instanceof Date ? o.paid_at.getTime() : (o.created_at instanceof Date ? o.created_at.getTime() : 0), createdAt: o.created_at instanceof Date ? o.created_at.getTime() : 0, paidTime: o.paid_at instanceof Date ? fmt_(o.paid_at, 'HH:mm') : '',
      order_id: o.order_id, queue_no: o.queue_no, status: o.status, channel: o.channel, platform: o.platform,
      external_ref: o.external_ref, total: Number(o.total), discount: Number(o.discount) || 0, coupon: (o.status === 'PENDING_PAY' || unpaidLater_(o)) ? labelOf_(o.promo_note, null) : labelOf_(o.promo_note, { code: String(o.coupon || '') }), claim: (o.status === 'PENDING_PAY' || unpaidLater_(o)) ? String(o.coupon || '') : '',
      name: String(o.cust_name || ''), phone: String(o.cust_phone || ''), note: String(o.order_note || ''), fulfil: String(o.fulfil || ''), addr: String(o.addr || ''), zone: String(o.zone || ''), fee: feeOf_(o), unpaid: unpaidLater_(o), slip: !!o.slip_id, pm: String(o.pay_method || ''), time: fmt_(o.created_at, 'HH:mm'),
      test: isTrue_(o.is_test), by: String(o.created_by || ''), dev: o.device ? String(o.device).slice(-4) : '', code: String(o.order_code || ''),
      payBy: o.status === 'PENDING_PAY' && o.expires_at instanceof Date ? fmt_(o.expires_at, 'HH:mm') : '',
      items: (byId[o.order_id] || []).map(i => ({ name: i.name, qty: Number(i.qty), extra: itemExtra_(i), inote: String(i.note || '') }))
    });
    const orders = act.map(mapO), due = dueRows.map(mapO);
    const ck = ckOpts_(), S = set_();
    return { orders: orders, due: due, coupons: ck.coupons, survey: ck.survey, auto: trialOn_(S) && Number(S.trial_auto) === 1, shop: S.shop_name, print: printOn_(S), role: U.role, who: U.name };
  } finally { RC = null; }
}

function payCore_(o, method, slipRef, co, forced) { // บันทึกรับเงิน 1 ออเดอร์ (เรียกภายใน lock แล้ว)
  const id = o.order_id, fee = feeOf_(o), gross = grossOf_(id), promo = Math.min(gross, Number(o.promo_disc) || 0), base = r4_(gross - promo);
  const cp = forced || discountOf_(co, base, id, String(o.coupon || ''));
  const netI = Math.ceil(r4_(gross - promo - cp.discount) - 1e-9), net = netI + fee, disc = r4_(gross - netI); // ปัดยอดชำระขึ้นเป็นบาทเต็ม
  const st = o.status === 'PENDING_PAY' ? 'QUEUED' : o.status;
  sh_('Orders').getRange(o._row, 7, 1, 7).setValues([[st, net, o.eta_min, o.created_by, '', disc, cp.code]]); sh_('Orders').getRange(o._row, 20).setValue(new Date()); sh_('Orders').getRange(o._row, ocol_('pay_method')).setValue(method);
  sh_('Payments').appendRow([uid_(), id, method, net, new Date(), ACTOR.name, slipRef ? cleanTxt_(slipRef, 40) : '', '']);
  putStatus_(id, o.queue_no, st, null, 0, { total: net, disc: disc, label: labelOf_(o.promo_note, cp) }, { f: String(o.fulfil || ''), later: false, total: net, fee: fee, zone: String(o.zone || ''), pay: net });
  if (cp.survey) { sh_('Survey_Used').appendRow([cp.code, id, new Date(), ACTOR.name]); if (RC) delete RC['Survey_Used']; }
  audit_('PAY', o.queue_no, PAYL[method] + (slipRef ? ' · อ้างอิง ' + cleanTxt_(slipRef, 40) : ''), net);
  if (cp.discount > 0) audit_('DISCOUNT', o.queue_no, cp.label || cp.code, cp.discount);
  const its = itemsOf_(id).map(itemRc_); if (fee > 0) its.push({ name: 'ค่าจัดส่ง (' + String(o.zone || '') + ')', qty: 1, price: fee, extra: '' });
  return { total: net, discount: disc, receipt: rcpt_(o.queue_no, o.created_at, its, net, disc, labelOf_(o.promo_note, cp), PAYL[method], String(o.order_code || '')) };
}
function receivePayment(pin, id, method, slipRef, co) {
  auth_(pin); co = co || {};
  return withLock_(() => {
    const o = orderOf_(id);
    if (!payable_(o)) throw new Error('ออเดอร์นี้รับเงินไม่ได้ (อาจหมดอายุหรือชำระแล้ว)');
    if (['CASH', 'TRANSFER'].indexOf(method) < 0) throw new Error('วิธีชำระไม่ถูกต้อง');
    return payCore_(o, method, slipRef, co, null);
  });
}
function receiveBill(pin, ids, method, slipRef, co) { // รับเงินรวมหลายออเดอร์ (บิลเดียว): คูปองคิดจากยอดรวม แล้วแบ่งส่วนลดตามสัดส่วน
  auth_(pin); co = co || {}; ids = (ids || []).map(String).filter((v, i, a) => a.indexOf(v) === i);
  if (!ids.length || ids.length > 20) throw new Error('เลือกออเดอร์ 1-20 รายการ');
  if (['CASH', 'TRANSFER'].indexOf(method) < 0) throw new Error('วิธีชำระไม่ถูกต้อง');
  return withLock_(() => {
    const os = ids.map(orderOf_); os.forEach(o => { if (!payable_(o)) throw new Error('มีออเดอร์ที่รับเงินไม่ได้ (ชำระแล้วหรือยกเลิก) กรุณารีเฟรชหน้า'); });
    const inf = os.map(o => { const g = grossOf_(o.order_id), p = Math.min(g, Number(o.promo_disc) || 0); return { o: o, b: r4_(g - p) }; }), B = r4_(inf.reduce((s, x) => s + x.b, 0));
    const claim = String((os.find(o => String(o.coupon || '')) || {}).coupon || ''), pk = pickCoupon_(co, B, claim);
    let left = pk.discount, tot = 0, disc = 0; const receipts = [];
    inf.forEach((x, i) => {
      const share = i === inf.length - 1 ? left : Math.min(left, Math.floor(pk.discount * x.b / (B || 1) + 1e-9)); left -= share;
      const r = payCore_(x.o, method, slipRef, null, { discount: share, code: share > 0 ? pk.code : '', label: pk.label || pk.code });
      tot += r.total; disc += r.discount; receipts.push({ id: x.o.order_id, receipt: r.receipt });
    });
    return { total: r4_(tot), discount: r4_(disc), count: os.length, receipts: receipts };
  });
}
function setStatus(pin, id, status) {
  auth_(pin);
  if (['COOKING', 'READY', 'DONE'].indexOf(status) < 0) throw new Error('สถานะไม่ถูกต้อง');
  return withLock_(() => {
    const o = orderOf_(id);
    if (!o || o.status === 'PENDING_PAY' || o.status === 'CANCELLED') throw new Error('เปลี่ยนสถานะไม่ได้');
    sh_('Orders').getRange(o._row, 7).setValue(status);
    if (status === 'READY') sh_('Orders').getRange(o._row, 15).setValue(new Date());
    if (status === 'DONE' && isTrue_(o.is_test)) restore_(id, 'ออเดอร์ทดสอบ (คืนสต็อก)');
    putStatus_(id, o.queue_no, status); try { CacheService.getScriptCache().remove('disp'); } catch (e) {}
    return true;
  });
}

function cancelOrder(pin, id, reason, block) {
  auth_(pin);
  return withLock_(() => {
    const o = orderOf_(id);
    if (!o || o.status === 'CANCELLED' || o.status === 'DONE') throw new Error('ยกเลิกไม่ได้');
    restore_(id, 'ยกเลิกออเดอร์'); sh_('Orders').getRange(o._row, 7).setValue('CANCELLED'); putStatus_(id, o.queue_no, 'CANCELLED');
    const pays = o.status === 'PENDING_PAY' ? [] : paymentsOf_(id);
    pays.forEach(p => sh_('Payments').appendRow([uid_(), id, p.method, -Number(p.amount), new Date(), ACTOR.name, 'คืนเงิน', '']));
    rows_('Survey_Used').filter(u => u.order_id == id).map(u => u._row).sort((a, b) => b - a).forEach(n => sh_('Survey_Used').deleteRow(n)); // คืนสิทธิ์รหัสแบบสอบถามที่ใช้กับออเดอร์นี้
    if (RC) delete RC['Survey_Used'];
    let extra = '';
    if (block && o.device) { blockDevice_(String(o.device), 24 * 3600000); extra = ' · บล็อกเครื่องผู้สั่ง 24 ชม.'; }
    audit_('CANCEL', o.queue_no, 'สถานะเดิม ' + o.status + (reason ? ' · เหตุผล: ' + cleanTxt_(reason, 80) : '') + extra, Number(o.total));
    try { CacheService.getScriptCache().remove('disp'); } catch (e) {}
    return true;
  });
}

function getReceipt(pin, id) {
  auth_(pin);
  const o = orderOf_(id); if (!o) throw new Error('ไม่พบออเดอร์');
  const p = o.status === 'PENDING_PAY' ? null : paymentsOf_(id)[0];
  const its = itemsOf_(id).map(itemRc_);
  return rcpt_(o.queue_no, o.created_at, its, Number(o.total), Number(o.discount) || 0, labelOf_(o.promo_note, { code: String(o.coupon || '') }), p ? PAYL[p.method] : 'ยังไม่ชำระ', String(o.order_code || ''));
}

function adjustStock(pin, ingId, delta, reason) {
  auth_(pin);
  return withLock_(() => {
    const i = rows_('Ingredients').find(x => x.ing_id == ingId); if (!i) throw new Error('ไม่พบวัตถุดิบ');
    const d = r4_(delta); if (!d) throw new Error('จำนวนต้องไม่เป็น 0');
    const ns = r4_(Number(i.stock) + d); if (ns < 0) throw new Error('สต็อกติดลบไม่ได้');
    ensureLots_();
    if (d > 0) addLot_(ingId, d, i.cost, reason || 'ปรับเพิ่ม'); // เพิ่มด้วยมือ: ล็อตใหม่ราคาตามที่ตั้งไว้ในวัตถุดิบ
    else { // ลด (ของเสีย ฯลฯ): ตัดล็อตเก่าก่อนและนับเป็นต้นทุน "ของเสีย/ส่วนต่าง" ของวันนี้
      const f = fifo_(i, -d, { commit: true }); saveLots_();
      ledgerAdd_([[today_(), 'WASTE', i.ing_id, i.name, i.unit, -d, f.cost, 'adj']]);
    }
    i.stock = ns; sh_('Ingredients').getRange(i._row, 4).setValue(ns); log_(ingId, d, reason || 'ปรับสต็อก', ''); audit_('STOCK_ADJUST', i.name, (d > 0 ? '+' : '') + d + ' ' + i.unit + ' · ' + (reason || 'ปรับสต็อก') + ' (เหลือ ' + ns + ')', d); return ns;
  });
}
function receiveStock(pin, ingId, qty, total, note) { // รับของเข้า: ราคาต่อหน่วย = ราคารวม ÷ จำนวน → เป็นล็อตใหม่
  auth_(pin);
  return withLock_(() => {
    const i = rows_('Ingredients').find(x => x.ing_id == ingId); if (!i) throw new Error('ไม่พบวัตถุดิบ');
    const q = r4_(qty), t = Number(total);
    if (!(q > 0)) throw new Error('จำนวนต้องมากกว่า 0'); if (!(t >= 0)) throw new Error('ราคารวมไม่ถูกต้อง');
    ensureLots_();
    const unit = r6_(t / q), lot = addLot_(ingId, q, unit, String(note || '').trim());
    i.stock = r4_(Number(i.stock) + q); sh_('Ingredients').getRange(i._row, 4).setValue(i.stock);
    sh_('Ingredients').getRange(i._row, 6).setValue(unit); // ราคาล่าสุด (ใช้ประมาณต้นทุนในหน้าสูตร)
    log_(ingId, q, 'รับของเข้า', lot); audit_('STOCK_RECEIVE', i.name, '+' + q + ' ' + i.unit + ' · ราคารวม ' + t, t); return { unit_cost: unit, stock: i.stock };
  });
}
function extendOrder(pin, id, minutes) { // พนักงานต่อเวลาชำระให้ออเดอร์ที่ยังไม่จ่าย (ลูกค้ายืนต่อแถวอยู่)
  auth_(pin); const m = Math.min(30, Math.max(1, Math.floor(Number(minutes)) || 5));
  return withLock_(() => {
    const o = orderOf_(id);
    if (!o || o.status !== 'PENDING_PAY') throw new Error('ต่อเวลาได้เฉพาะออเดอร์ที่ยังไม่ชำระ');
    const cur = o.expires_at instanceof Date ? o.expires_at.getTime() : Date.now(), to = new Date(Math.max(cur, Date.now()) + m * 60000);
    sh_('Orders').getRange(o._row, 11).setValue(to); putStatus_(id, o.queue_no, 'PENDING_PAY', to.getTime());
    audit_('EXTEND', o.queue_no, 'ต่อเวลาชำระถึง ' + fmt_(to, 'HH:mm'));
    return { payBy: fmt_(to, 'HH:mm'), ms: to.getTime() };
  });
}
function getStock(pin) {
  auth_(pin); RC = {};
  try {
    const lots = rows_('Stock_Lots');
    return { ingredients: rows_('Ingredients').map(i => ({
      ing_id: i.ing_id, name: i.name, unit: i.unit, stock: Number(i.stock), reorder_point: Number(i.reorder_point), low: Number(i.stock) <= Number(i.reorder_point),
      cost: Number(i.cost) || 0, is_pack: isPack_(i),
      lots: lots.filter(l => l.ing_id == i.ing_id && Number(l.qty_left) > 0).slice(0, 6).map(l => ({ date: fmt_(l.date, 'dd/MM/yy'), left: Number(l.qty_left), cost: Number(l.unit_cost) }))
    })) };
  } finally { RC = null; }
}

function summary(pin, day) { auth_(pin); const prev = RC; RC = {}; try { return summary_(day); } finally { RC = prev; } }
function summary_(day) {
  day = day || today_();
  const os = ordersOfDay_(day).filter(o => o.status !== 'CANCELLED' && !isTrue_(o.is_test) && !unpaidLater_(o)), ds = daySales_(day, os);
  const ing = rows_('Ingredients'), dc = rows_('Daily_Close'), c = dc.find(r => dstr_(r.date) === day);
  const lines = rows_('Cost_Ledger').filter(r => dstr_(r.date) === day).map(r => ({ type: r.type, name: r.name, unit: r.unit, qty: Number(r.qty), cost: Number(r.cost) }));
  if (!c) { // ยังไม่ปิดวัน: ประมาณต้นทุนวัตถุดิบที่ขายด้วย FIFO (ยังไม่ตัดล็อตจริง)
    const use = saleUsageOf_(os);
    Object.keys(use).forEach(k => { const i = ing.find(z => z.ing_id == k); if (i) lines.push({ type: 'SALE', name: i.name, unit: i.unit, qty: use[k], cost: fifo_(i, use[k]).cost }); });
  }
  const sum = t => r4_(lines.filter(l => l.type === t).reduce((a, l) => a + l.cost, 0));
  const exp = rows_('Daily_Expense').filter(r => dstr_(r.date) === day).map(r => ({ name: r.name, amount: Number(r.amount) }));
  const expTotal = r4_(exp.reduce((a, e) => a + e.amount, 0)), cost = { sale: sum('SALE'), count: sum('COUNT'), waste: sum('WASTE'), lines: lines };
  const out = {
    day: day, total: ds.total, count: os.length, discount: ds.discount, fee: ds.fee, byChannel: ds.byChannel, byMethod: ds.byMethod,
    cost: cost, expenses: exp, expTotal: expTotal, profit: r4_(ds.total - cost.sale - cost.count - cost.waste - expTotal),
    estimated: !c, closed: c ? { counted: Number(c.cash_counted), diff: Number(c.diff) } : null
  };
  out.rows = channelRows_(os, ds); out.splitDiff = r4_(out.rows.reduce((a, r) => a + r.sales, 0) - ds.total);
  if (c) {
    const fl = Number(c.float) || 0;
    out.closed = { counted: Number(c.cash_counted), diff: Number(c.diff), float: fl, drawer: r4_(Number(c.cash_counted) + fl) };
    out.checks = rows_('Daily_Check').filter(r => dstr_(r.date) === day).map(r => ({ key: r.key, label: r.label, sales: Number(r.sales), checked: r.checked === '' ? null : Number(r.checked), diff: r.diff === '' ? null : Number(r.diff) }));
    out.canReopen = dc.map(r => dstr_(r.date)).sort().pop() === day;
  } else {
    const pr = dc.filter(r => dstr_(r.date) < day).sort((a, b) => dstr_(a.date) < dstr_(b.date) ? -1 : 1).pop();
    out.lastFloat = pr && pr.float !== '' && pr.float != null ? Number(pr.float) : (Number(set_().change_float) || 0);
    out.blockers = ordersOfDay_(day).filter(o => ACTIVE.indexOf(o.status) >= 0 || unpaidLater_(o)).length;
    out.items = ing.map(i => ({ ing_id: i.ing_id, name: i.name, unit: i.unit, stock: Number(i.stock), is_pack: isPack_(i), cost: frontCost_(i) }));
    const prev = dc.map(r => dstr_(r.date)).filter(d => d < day).sort().pop();
    out.lastExpenses = prev ? rows_('Daily_Expense').filter(r => dstr_(r.date) === prev).map(r => ({ name: r.name, amount: Number(r.amount) })) : [];
  }
  return out;
}

function closeDay(pin, day, counted, note, pl) {
  auth_(pin); pl = pl || {};
  return withLock_(() => {
    day = day || today_();
    if (rows_('Daily_Close').some(r => dstr_(r.date) === day)) throw new Error('วันนี้ปิดแล้ว');
    autoAdvanceAll_(); // ออเดอร์ทดสอบที่ถึงเวลาแล้วให้จบก่อนตรวจรายการค้าง
    const all = ordersOfDay_(day), pending = all.filter(o => ACTIVE.indexOf(o.status) >= 0);
    if (pending.length) throw new Error('ยังมี ' + pending.length + ' ออเดอร์ค้างอยู่ (รอชำระ/กำลังทำ/พร้อมรับ) กรุณาจัดการให้เรียบร้อยก่อนปิดวัน');
    const unp = all.filter(unpaidLater_); if (unp.length) throw new Error('ยังมี ' + unp.length + ' ออเดอร์ที่ยังไม่ได้รับเงิน (เมนู "ค้างชำระ") กรุณารับเงินหรือยกเลิกก่อนปิดวัน');
    if (!(Number(counted) >= 0)) throw new Error('กรอกยอดเงินสดที่นับได้');
    const flt = r4_(pl.float) || 0; if (flt < 0) throw new Error('เงินทอนต้องไม่ติดลบ');
    const chk = pl.checks || {}; Object.keys(chk).forEach(k => { if (chk[k] !== '' && chk[k] != null && !(Number(chk[k]) >= 0)) throw new Error('ยอดเช็คของ "' + k + '" ไม่ถูกต้อง'); });
    const ing = rows_('Ingredients'), counts = pl.counts || {}, cl = [], el = [];
    Object.keys(counts).forEach(k => { // นับสต็อกจริง: ตรวจทั้งหมดก่อนเริ่มตัดอะไร
      const v = counts[k]; if (v === '' || v === null || v === undefined) return;
      const c = r4_(v), i = ing.find(z => z.ing_id == k); if (!i) return;
      if (!(c >= 0)) throw new Error('จำนวนที่นับของ "' + i.name + '" ไม่ถูกต้อง');
      if (c > Number(i.stock)) throw new Error('"' + i.name + '" นับได้ ' + c + ' มากกว่าสต็อกในระบบ (' + i.stock + ') ให้ใช้ "รับของเข้า" หรือ "ปรับ" ก่อน');
      cl.push({ i: i, c: c });
    });
    (pl.expenses || []).forEach(e => {
      const nm = String(e.name || '').trim(), am = r4_(e.amount); if (!nm && !am) return;
      if (!nm) throw new Error('กรอกชื่อค่าใช้จ่าย'); if (!(am >= 0)) throw new Error('จำนวนเงินค่าใช้จ่ายไม่ถูกต้อง');
      if (am > 0) el.push([day, nm, am]);
    });
    ensureLots_();
    const os = all.filter(o => o.status !== 'CANCELLED' && !isTrue_(o.is_test)), ds = daySales_(day, os), use = saleUsageOf_(os), led = [], lu = [], ref = 'close:' + day;
    Object.keys(use).forEach(k => { // ต้นทุนวัตถุดิบที่ขาย: ตัดล็อตเก่าก่อน
      const i = ing.find(z => z.ing_id == k); if (!i || !(use[k] > 0)) return;
      led.push([day, 'SALE', i.ing_id, i.name, i.unit, use[k], fifo_(i, use[k], { commit: true, day: day, sink: lu }).cost, ref]);
    });
    let stockChanged = false;
    cl.forEach(x => { // ส่วนต่างระหว่างสต็อกในระบบกับที่นับจริง = ใช้ไป (ของนอกสูตร) หรือของเสีย/ส่วนต่าง (วัตถุดิบในสูตร)
      const used = r4_(Number(x.i.stock) - x.c); if (!(used > 0)) return;
      led.push([day, isPack_(x.i) ? 'COUNT' : 'WASTE', x.i.ing_id, x.i.name, x.i.unit, used, fifo_(x.i, used, { commit: true, day: day, sink: lu }).cost, ref]);
      x.i.stock = x.c; log_(x.i.ing_id, -used, 'นับสต็อก', day); stockChanged = true;
    });
    saveLots_(); if (stockChanged) saveStock_();
    if (lu.length) { const s = sh_('Lot_Use'), r0 = s.getLastRow() + 1; s.getRange(r0, 1, lu.length, 1).setNumberFormat('@'); s.getRange(r0, 1, lu.length, 3).setValues(lu); }
    ledgerAdd_(led);
    if (el.length) { const s = sh_('Daily_Expense'), r0 = s.getLastRow() + 1; s.getRange(r0, 1, el.length, 1).setNumberFormat('@'); s.getRange(r0, 1, el.length, 3).setValues(el); }
    // เงินสดในลิ้นชักทั้งหมด − เงินทอนที่กันไว้ = เงินสดขายที่นับได้ (เงินทอนไม่นับเป็นยอดขาย)
    const exp = r4_(ds.byMethod.CASH || 0), cashCounted = r4_(Number(counted) - flt), diff = r4_(cashCounted - exp);
    const chRows = channelRows_(os, ds).map(r => {
      const has = r.key === 'CASH' || (chk[r.key] !== undefined && chk[r.key] !== '' && chk[r.key] !== null), v = r.key === 'CASH' ? cashCounted : (has ? r4_(chk[r.key]) : '');
      return [day, r.key, r.label, r.sales, v, v === '' ? '' : r4_(v - r.sales)];
    });
    const dk = sh_('Daily_Check'), k0 = dk.getLastRow() + 1; dk.getRange(k0, 1, chRows.length, 1).setNumberFormat('@'); dk.getRange(k0, 1, chRows.length, 6).setValues(chRows);
    audit_('CLOSE_DAY', day, 'ยอดขาย ' + ds.total + ' · ส่วนต่างเงินสด ' + diff, diff);
    sh_('Daily_Close').appendRow([day, exp, cashCounted, diff, ds.byMethod.TRANSFER || 0, note || '', new Date(), ds.total, ds.discount, os.length, ds.byChannel.DELIVERY || 0, flt, ds.fee]);
    const sum = t => r4_(led.filter(l => l[1] === t).reduce((a, l) => a + l[6], 0)), ex = r4_(el.reduce((a, e) => a + e[2], 0));
    return { diff: diff, float: flt, checks: chRows.map(r => ({ key: r[1], sales: r[3], checked: r[4] === '' ? null : r[4], diff: r[5] === '' ? null : r[5] })), cost: { sale: sum('SALE'), count: sum('COUNT'), waste: sum('WASTE') }, expTotal: ex, profit: r4_(ds.total - sum('SALE') - sum('COUNT') - sum('WASTE') - ex) };
  });
}
function reopenDay(pin, day) { // เจ้าของเท่านั้น และเปิดได้เฉพาะวันที่ปิดล่าสุด: คืนล็อต คืนสต็อกที่นับ ลบรายการต้นทุน/ค่าใช้จ่ายของวันนั้น
  authOwner_(pin);
  return withLock_(() => {
    const dc = rows_('Daily_Close'), c = dc.find(r => dstr_(r.date) === day);
    if (!c) throw new Error('วันนี้ยังไม่ได้ปิด');
    const latest = dc.map(r => dstr_(r.date)).sort().pop(); if (latest !== day) throw new Error('เปิดใหม่ได้เฉพาะวันที่ปิดล่าสุด (' + latest + ')');
    const lots = rows_('Stock_Lots'), uses = rows_('Lot_Use').filter(u => dstr_(u.day) === day);
    uses.forEach(u => { const l = lots.find(z => z.lot_id == u.lot_id); if (l) LOTQ[l._row] = r4_((LOTQ[l._row] !== undefined ? LOTQ[l._row] : Number(l.qty_left)) + Number(u.qty)); });
    saveLots_();
    const ing = rows_('Ingredients'), led = rows_('Cost_Ledger').filter(r => r.ref === 'close:' + day); let sc = false;
    led.forEach(r => { if (r.type === 'SALE') return; const i = ing.find(z => z.ing_id == r.ing_id); if (i) { i.stock = r4_(Number(i.stock) + Number(r.qty)); log_(i.ing_id, Number(r.qty), 'เปิดวันใหม่', day); sc = true; } });
    if (sc) saveStock_();
    const del = (name, arr) => arr.map(r => r._row).sort((a, b) => b - a).forEach(n => sh_(name).deleteRow(n));
    del('Lot_Use', uses); del('Cost_Ledger', led); del('Daily_Expense', rows_('Daily_Expense').filter(r => dstr_(r.date) === day)); del('Daily_Check', rows_('Daily_Check').filter(r => dstr_(r.date) === day)); del('Daily_Close', [c]);
    ['Lot_Use', 'Cost_Ledger', 'Daily_Expense', 'Daily_Check', 'Daily_Close'].forEach(n => { if (RC) delete RC[n]; });
    audit_('REOPEN_DAY', day, 'เปิดวันอีกครั้ง');
    return true;
  });
}

// ---------- setup (รันครั้งเดียว) ----------
function setup() {
  Object.keys(SH).forEach(n => sh_(n)); // สร้างชีตที่ยังไม่มี และเพิ่มคอลัมน์ใหม่ให้ชีตเดิม
  const seed = (n, rows) => { if (sh_(n).getLastRow() < 2) rows.forEach(r => sh_(n).appendRow(r)); };
  seed('Settings', [['shop_name', 'Pang Kum'], ['queue_prefix', 'A'], ['prep_min_per_queue', 2], ['parallel_slots', 2], ['pending_expire_min', 10], ['pending_max_min', 30], ['change_float', 0],
    ['max_pending_per_device', 2], ['max_pending_total', 15], ['cust_max_items', 20],
    ['order_note', 'เลือกเมนูที่ชอบได้หลายอย่าง\nกดยืนยันแล้วไปจ่ายเงินที่เคาน์เตอร์']]);
  seed('Menu', [['M01', 'ไส้แฮมชีส', 8, true, 'ชิ้น', '', ''], ['M02', 'ไส้โบโลน่า', 7, true, 'ชิ้น', '', '']]);
  seed('Ingredients', [['I01', 'ขนมปัง', 'ชิ้น', 200, 40, 1.5, false], ['I02', 'แฮม', 'ชิ้น', 100, 20, 2, false], ['I03', 'ชีส', 'ชิ้น', 100, 20, 2, false],
    ['I04', 'โบโลน่า', 'ชิ้น', 100, 20, 1.5, false], ['I05', 'ไม้เสียบ', 'ไม้', 500, 100, 0.3, false],
    ['I06', 'ถุง', 'ใบ', 300, 50, 0.5, true], ['I07', 'แก้ว', 'ใบ', 300, 50, 1.5, true]]);
  seed('Recipes', [['M01', 'I01', 1], ['M01', 'I02', 1], ['M01', 'I03', 1], ['M01', 'I05', 0.25], ['M02', 'I01', 1], ['M02', 'I04', 1], ['M02', 'I05', 0.25]]);
  ensureLots_();
  ensureStaff_(); // ย้าย PIN เดิม (ถ้ามี) หรือสร้างบัญชีเจ้าของ/พนักงานใหม่
  bust_();
  if (STAFF_RANDOM) { try { resetOwnerPin(); } catch (e) {} } // ติดตั้งใหม่ (ไม่มี PIN เดิม): ออก PIN ชั่วคราวของเจ้าของ ดูได้ที่ Execution log
}

// ---------- ตั้งค่า / เมนู / สูตร (เฉพาะ PIN เจ้าของ) ----------
function authOwner_(tok) { const u = auth_(tok); if (u.role !== 'owner') throw new Error('ต้องใช้สิทธิ์เจ้าของ'); return u; }
function imgs_() { const o = {}; rows_('Images').forEach(r => o[r.key] = r.data); return o; }
const IMG_FOLDER_NAME = 'PangKum_Images'; // ร้านเดิมที่มีโฟลเดอร์แล้วจะใช้โฟลเดอร์เดิมต่อ (จำ ID ไว้)
// โฟลเดอร์เก็บรูป: สร้างไว้ในโฟลเดอร์เดียวกับไฟล์ชีตนี้ (จำ ID ไว้ใน Script Properties)
function imgFolder_() {
  const props = PropertiesService.getScriptProperties(), saved = props.getProperty('IMG_FOLDER_ID');
  if (saved) { try { return DriveApp.getFolderById(saved); } catch (e) {} }
  const parents = DriveApp.getFileById(ss_().getId()).getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const it = parent.getFoldersByName(IMG_FOLDER_NAME);
  const f = it.hasNext() ? it.next() : parent.createFolder(IMG_FOLDER_NAME);
  props.setProperty('IMG_FOLDER_ID', f.getId());
  return f;
}
function imgUrlId_(v) { const m = String(v || '').match(/drive\.google\.com\/thumbnail\?id=([\w-]+)/); return m ? m[1] : ''; }
function putImg_(key, data) {
  const r = rows_('Images').find(x => x.key == key);
  const oldId = r ? imgUrlId_(r.data) : '';
  if (oldId) { try { DriveApp.getFileById(oldId).setTrashed(true); } catch (e) {} } // ลบไฟล์รูปเก่าออกจากโฟลเดอร์
  if (!data) { if (r) sh_('Images').deleteRow(r._row); return; }
  const m = String(data).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m || data.length > 600000) throw new Error('รูปไม่ถูกต้องหรือใหญ่เกินไป');
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], String(key).replace(/[^\w-]/g, '_') + '_' + Date.now() + '.' + ext);
  const f = imgFolder_().createFile(blob);
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {} // ให้ลูกค้าเห็นรูปในหน้าสั่ง
  const url = 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w640';
  if (r) sh_('Images').getRange(r._row, 2).setValue(url); else sh_('Images').appendRow([key, url]);
}
function getSettings(pin) {
  authOwner_(pin); const s = Object.assign({}, set_()); delete s.staff_pin; delete s.owner_pin;
  let url = ''; try { url = ScriptApp.getService().getUrl(); } catch (e) {}
  return { settings: s, logo: imgs_().logo || '', qr: imgs_().qr || '', base: url, ver: APP_VERSION, verDate: APP_DATE, trial: { seq: Number(PropertiesService.getScriptProperties().getProperty('TRIAL_SEQ')) || 0 } };
}
function saveSettings(pin, obj) {
  authOwner_(pin);
  return withLock_(() => {
    const put = (k, v, txt) => {
      let r = rows_('Settings').find(x => x.key == k);
      if (!r) { sh_('Settings').appendRow([k, '']); r = { _row: sh_('Settings').getLastRow() }; }
      const c = sh_('Settings').getRange(r._row, 2); if (txt) c.setNumberFormat('@'); c.setValue(v);
    };
    const cf = obj.change_float != null && String(obj.change_float).trim() !== '' ? Number(obj.change_float) : null;
    if (cf !== null && !(cf >= 0)) throw new Error('เงินทอนต้องไม่ติดลบ');
    const ps = obj.print_slip != null && String(obj.print_slip).trim() !== '' ? (String(obj.print_slip) === '0' ? 0 : 1) : null;
    let dp = null;
    if (obj.delivery_platforms != null) {
      const seen = {}, list = [];
      String(obj.delivery_platforms).split(/[\n,]/).map(s => s.trim()).filter(Boolean).forEach(s => {
        if (s.length > 30) throw new Error('ชื่อแพลตฟอร์มยาวเกินไป (ไม่เกิน 30 ตัวอักษร)');
        const k = s.toLowerCase(); if (!seen[k]) { seen[k] = 1; list.push(s); }
      });
      if (list.length > 12) throw new Error('ตั้งแพลตฟอร์มได้ไม่เกิน 12 เจ้า');
      dp = list.join('\n');
    }
    const num = ['prep_min_per_queue', 'parallel_slots', 'pending_expire_min', 'pending_max_min'], opt = ['order_note'];
    const lim = ['max_pending_per_device', 'max_pending_total', 'cust_max_items'];
    // ตรวจทุกอย่างก่อนเขียน
    const plan = [];
    num.concat(['shop_name', 'queue_prefix'], opt).forEach(k => {
      if (k === 'pending_max_min' && obj[k] == null) return;
      const v = String(obj[k] == null ? '' : obj[k]).trim(), isN = num.indexOf(k) >= 0;
      if (!v && opt.indexOf(k) < 0) throw new Error('กรุณากรอกให้ครบ');
      if (isN && !(Number(v) > 0)) throw new Error('ตัวเลขต้องมากกว่า 0');
      plan.push([k, isN ? Number(v || 0) : v, !isN]);
    });
    lim.forEach(k => { if (obj[k] == null || String(obj[k]).trim() === '') return; const v = Math.floor(Number(obj[k])); if (!(v >= 1 && v <= 999)) throw new Error('ค่าจำกัดออเดอร์ต้องอยู่ระหว่าง 1-999'); plan.push([k, v, false]); });
    ['display_msg', 'survey_msg', 'survey_sheet_name', 'survey_col', 'activity_title', 'activity_msg'].forEach(k => { if (obj[k] != null) plan.push([k, String(obj[k]).trim().slice(0, 300), true]); });
    if (obj.survey_url != null) { const u = String(obj.survey_url).trim(); if (u && !/^https?:\/\/\S+$/i.test(u)) throw new Error('ลิงก์แบบสอบถามต้องขึ้นต้นด้วย https://'); plan.push(['survey_url', u.slice(0, 500), true]); }
    if (obj.trial_step_sec != null && String(obj.trial_step_sec).trim() !== '') { const s = Math.floor(Number(obj.trial_step_sec)); if (!(s >= 2 && s <= 120)) throw new Error('วินาทีต่อขั้นตอนต้องอยู่ระหว่าง 2-120'); plan.push(['trial_step_sec', s, false]); }
    if (obj.update_url != null) { const u = String(obj.update_url).trim(); if (u && !/^https:\/\/\S+$/i.test(u)) throw new Error('ลิงก์ไฟล์เวอร์ชันต้องขึ้นต้นด้วย https://'); plan.push(['update_url', u.slice(0, 500), true]); }
    if (obj.trial_manual != null) plan.push(['trial_manual', String(obj.trial_manual) === '1' ? 1 : 0, false]);
    if (obj.trial_auto != null) plan.push(['trial_auto', String(obj.trial_auto) === '1' ? 1 : 0, false]);
    if (obj.survey_sheet_id != null) { let id = String(obj.survey_sheet_id).trim(); const m = id.match(/\/d\/([\w-]+)/); if (m) id = m[1]; if (id && !/^[\w-]{20,}$/.test(id)) throw new Error('ID ของชีตแบบสอบถามไม่ถูกต้อง (วาง ID หรือลิงก์ชีตทั้งลิงก์ได้)'); plan.push(['survey_sheet_id', id, true]); }
    if (obj.trial_prefix != null) { const p = norm_(obj.trial_prefix).slice(0, 1); if (!p) throw new Error('ตัวอักษรนำหน้าเลขคิวช่วงทดลองต้องเป็น 1 ตัว (A-Z หรือ 0-9)'); plan.push(['trial_prefix', p, true]); }
    const autoOn = String(obj.trial_auto) === '1'; // ติ๊ก "ทดสอบอัตโนมัติ" = เปิดช่วงทดลองให้ด้วย (ไม่งั้นโหมดอัตโนมัติไม่ทำงาน)
    if (obj.trial_on != null) plan.push(['trial_on', (String(obj.trial_on) === '1' || autoOn) ? 1 : 0, false]);
    else if (autoOn) plan.push(['trial_on', 1, false]);
    if (obj.pay_mode != null) plan.push(['pay_mode', String(obj.pay_mode) === 'LATER' ? 'LATER' : 'FIRST', true]);
    ['delivery_on', 'contact_req'].forEach(k => { if (obj[k] != null) plan.push([k, String(obj[k]) === '1' ? 1 : 0, false]); });
    if (obj.pay_promptpay != null) { const d = String(obj.pay_promptpay).replace(/\D/g, ''); if (d && d.length !== 10 && d.length !== 13 && d.length !== 15) throw new Error('เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน/นิติบุคคล 13 หลัก'); plan.push(['pay_promptpay', d, true]); }
    if (obj.pay_qr_note != null) plan.push(['pay_qr_note', String(obj.pay_qr_note).trim().slice(0, 150), true]);
    if (obj.delivery_note != null) plan.push(['delivery_note', String(obj.delivery_note).trim().slice(0, 200), true]);
    if (obj.delivery_zones != null) {
      const ls = String(obj.delivery_zones).split('\n').map(s => s.trim()).filter(Boolean); if (ls.length > 30) throw new Error('ตั้งพื้นที่จัดส่งได้ไม่เกิน 30 พื้นที่');
      ls.forEach((l, i) => { const p = l.split('|').map(x => x.trim()); if (!p[0]) throw new Error('บรรทัดที่ ' + (i + 1) + ': ใส่ชื่อพื้นที่ก่อน'); if (p[1] !== undefined && p[1] !== '' && !(Number(p[1]) >= 0)) throw new Error('บรรทัดที่ ' + (i + 1) + ': ค่าส่งต้องเป็นตัวเลข'); if (p[2] && !(Number(p[2]) >= 0)) throw new Error('บรรทัดที่ ' + (i + 1) + ': ยอดสั่งขั้นต่ำต้องเป็นตัวเลข'); if (p[3] && !(Number(p[3]) >= 0)) throw new Error('บรรทัดที่ ' + (i + 1) + ': ยอดส่งฟรีต้องเป็นตัวเลข'); });
      plan.push(['delivery_zones', ls.join('\n').slice(0, 1500), true]);
    }
    plan.forEach(a => put(a[0], a[1], a[2]));
    if (cf !== null) put('change_float', cf, false);
    if (ps !== null) put('print_slip', ps, false);
    if (dp !== null) put('delivery_platforms', dp, true);
    bust_(); try { CacheService.getScriptCache().remove('svy'); } catch (e) {}
    audit_('SETTINGS', '', 'บันทึกการตั้งค่า' + (obj.trial_on != null ? ' · ช่วงทดลอง ' + (String(obj.trial_on) === '1' ? 'เปิด' : 'ปิด') : ''));
    return true;
  });
}
function saveQr(pin, data) { authOwner_(pin); putImg_('qr', data || ''); bustBoot_(); return true; } // QR รับโอนของร้าน (เจ้าของอัปโหลดจากแอพธนาคาร)
function getQr() { // ลูกค้าเปิดหน้าจ่ายด้วย QR: ส่งรูปเป็นข้อมูล เพื่อให้กดบันทึกลงเครื่องได้
  const u = imgs_().qr, id = imgUrlId_(u); const pp = String(set_().pay_promptpay || ''); if (!id) return { data: '', note: String(set_().pay_qr_note || ''), pp: pp };
  const b = DriveApp.getFileById(id).getBlob();
  return { data: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()), note: String(set_().pay_qr_note || ''), pp: pp };
}
function submitSlip(id, data) { // ลูกค้าแนบสลิป: เก็บเป็นไฟล์ส่วนตัวในโฟลเดอร์รูป (ไม่เปิดลิงก์สาธารณะ) ให้พนักงานเปิดดูตอนตรวจ
  id = String(id || ''); if (!/^[0-9a-f]{8}$/i.test(id)) throw new Error('ไม่พบออเดอร์');
  const m = String(data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i); if (!m || String(data).length > 420000) throw new Error('รูปไม่ถูกต้องหรือใหญ่เกินไป');
  return withLock_(() => {
    const o = orderOf_(id); if (!o) throw new Error('ไม่พบออเดอร์'); if (!payable_(o) && !(isTrue_(o.is_test) && o.status !== 'CANCELLED')) throw new Error('ออเดอร์นี้ชำระแล้วหรือหมดอายุ');
    const c = CacheService.getScriptCache(), k = 'sl:' + id, n = Number(c.get(k)) || 0; if (n >= 3) throw new Error('แนบสลิปได้ไม่เกิน 3 ครั้งต่อออเดอร์');
    c.put(k, String(n + 1), 21600);
    let sid = 'TEST'; // โหมดทดสอบ: ไม่เก็บไฟล์สลิปลงไดรฟ์ ใส่แค่เครื่องหมายว่าแนบแล้ว
    if (!isTrue_(o.is_test)) {
      if (o.slip_id) { try { DriveApp.getFileById(String(o.slip_id)).setTrashed(true); } catch (e) {} }
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg'), f = imgFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'slip_' + o.queue_no + '_' + id + '_' + Date.now() + '.' + ext));
      sid = f.getId();
    }
    sh_('Orders').getRange(o._row, ocol_('slip_id')).setValue(sid); sh_('Orders').getRange(o._row, ocol_('slip_at')).setValue(new Date());
    if (o.status === 'PENDING_PAY' && o.expires_at instanceof Date) { const e = Date.now() + 15 * 60000; if (e > o.expires_at.getTime()) sh_('Orders').getRange(o._row, ocol_('expires_at')).setValue(new Date(e)); } // มีสลิปแล้ว ขยายเวลารอร้านตรวจ
    try { const h = c.get('os:' + id); if (h) { const r = JSON.parse(h); r.slip = 1; delete r.rej; if (r.payBy && Date.now() + 15 * 60000 > r.payBy) r.payBy = Date.now() + 15 * 60000; c.put('os:' + id, JSON.stringify(r), 21600); } } catch (e) {}
    if (isTrue_(o.is_test) && payable_(o)) { // โหมดทดสอบ: แนบรูปอะไรก็ได้ ถือว่าจ่ายจริงทันที (โหมดปกติร้านต้องตรวจสลิปเอง)
      const st = o.status === 'PENDING_PAY' ? 'QUEUED' : o.status, r = testPaid_(o, 'TRANSFER');
      sh_('Orders').getRange(o._row, 7).setValue(st); o.status = st;
      putStatus_(id, o.queue_no, st, null, o.created_at instanceof Date ? o.created_at.getTime() : 0, r.paid, r.inf);
      try { c.remove('disp'); } catch (e) {} RC = {};
      return 'PAID';
    }
    return true;
  });
}
function rejectSlip(pin, id, reason) { // ร้านตรวจแล้วสลิปไม่ถูกต้อง: ลบสลิป ให้ลูกค้าแนบใหม่ (ออเดอร์ไม่ถูกยกเลิก)
  auth_(pin); id = String(id || ''); reason = String(reason || '').trim().slice(0, 80) || 'สลิปไม่ถูกต้อง';
  return withLock_(() => {
    const o = orderOf_(id); if (!o || !o.slip_id) throw new Error('ออเดอร์นี้ไม่มีสลิป');
    if (!payable_(o)) throw new Error('ออเดอร์นี้ชำระแล้ว ส่งสลิปกลับไม่ได้');
    try { DriveApp.getFileById(String(o.slip_id)).setTrashed(true); } catch (e) {}
    sh_('Orders').getRange(o._row, ocol_('slip_id')).setValue(''); sh_('Orders').getRange(o._row, ocol_('slip_at')).setValue('');
    const c = CacheService.getScriptCache(); c.remove('sl:' + id);
    let pb = 0;
    if (o.status === 'PENDING_PAY') { pb = Date.now() + 15 * 60000; sh_('Orders').getRange(o._row, ocol_('expires_at')).setValue(new Date(pb)); } // ให้เวลาลูกค้าแนบสลิปใหม่
    try { const h = c.get('os:' + id); if (h) { const r = JSON.parse(h); delete r.slip; r.rej = reason; if (pb) r.payBy = pb; c.put('os:' + id, JSON.stringify(r), 21600); } } catch (e) {}
    return true;
  });
}
function getSlip(pin, id) { auth_(pin); const o = orderOf_(String(id || '')); if (!o || !o.slip_id) throw new Error('ยังไม่มีสลิป'); const b = DriveApp.getFileById(String(o.slip_id)).getBlob(); return { data: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()), at: fmt_(o.slip_at, 'dd/MM HH:mm'), queue_no: String(o.queue_no), total: infOf_(o).pay }; }
function saveLogo(pin, data) { authOwner_(pin); putImg_('logo', data || ''); bustBoot_(); return true; }

function getMenuAdmin(pin) {
  authOwner_(pin); const im = imgs_(), sets = rows_('Set_Items');
  return { menus: rows_('Menu').map(m => ({ menu_id: m.menu_id, name: m.name, price: Number(m.price), unit: m.unit || 'ชิ้น', active: m.active !== false, type: m.type === 'SET' ? 'SET' : '', quick_notes: String(m.quick_notes || ''),
    items: sets.filter(s => s.set_id == m.menu_id).map(s => ({ menu_id: s.menu_id, qty: Number(s.qty) })), img: im['menu:' + m.menu_id] || '' })) };
}
function moveMenu(pin, id, dir) { // เจ้าของเลื่อนเมนูขึ้น/ลง (สลับแถวกับเมนูที่อยู่ติดกันในชีต Menu) ลำดับนี้ใช้แสดงในหน้าสั่งของลูกค้าและพนักงาน
  authOwner_(pin);
  return withLock_(() => {
    const rows = rows_('Menu'), i = rows.findIndex(r => r.menu_id == id), j = i + (Number(dir) < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= rows.length) return false;
    const keys = SH.Menu, sh = sh_('Menu'), a = rows[i], b = rows[j], vals = r => keys.map(k => r[k] === undefined ? '' : r[k]);
    sh.getRange(a._row, 6, 1, 2).setNumberFormat('@'); sh.getRange(b._row, 6, 1, 2).setNumberFormat('@');
    sh.getRange(a._row, 1, 1, keys.length).setValues([vals(b)]); sh.getRange(b._row, 1, 1, keys.length).setValues([vals(a)]);
    if (RC) delete RC['Menu']; bust_(); audit_('MENU_MOVE', String(a.name), Number(dir) < 0 ? 'เลื่อนขึ้น' : 'เลื่อนลง');
    return true;
  });
}
function deleteMenu(pin, id) { // ลบเมนู/ชุดเซ็ตถาวร (เจ้าของ): ลบสูตร รายการส่วนประกอบเซ็ต และรูป · ออเดอร์เก่า/รายงานไม่กระทบ (เก็บชื่อและราคาไว้ในรายการออเดอร์แล้ว)
  authOwner_(pin);
  return withLock_(() => {
    RC = {}; const all = rows_('Menu'), r = all.find(x => x.menu_id == id);
    if (!r) throw new Error('ไม่พบเมนู (อาจถูกลบไปแล้ว)');
    const inSets = rows_('Set_Items').filter(s => s.menu_id == id).map(s => (all.find(m => m.menu_id == s.set_id) || {}).name).filter(Boolean);
    if (inSets.length) throw new Error('ลบไม่ได้: เมนูนี้เป็นส่วนประกอบของเซ็ต ' + inSets.filter((v, i, a) => a.indexOf(v) === i).join(', ') + ' (แก้หรือลบเซ็ตก่อน)');
    const act = activeRows_().filter(o => ACTIVE.indexOf(o.status) >= 0), byId = itemsByOrder_(act.map(o => o.order_id));
    const hit = act.filter(o => (byId[o.order_id] || []).some(i => i.menu_id == id));
    if (hit.length) throw new Error('ลบไม่ได้: มีออเดอร์ที่ยังไม่เสร็จมีเมนูนี้ (คิว ' + hit.map(o => o.queue_no).join(', ') + ') รอให้เสร็จก่อน หรือใช้ "ปิดขาย" แทน');
    const del = (name, test) => rows_(name).filter(test).map(x => x._row).sort((a, b) => b - a).forEach(n => sh_(name).deleteRow(n));
    del('Recipes', x => x.menu_id == id); del('Set_Items', x => x.set_id == id);
    try { putImg_('menu:' + id, ''); } catch (e) {}
    PropertiesService.getScriptProperties().setProperty('MENU_SEQ', String(Math.max(parseInt(String(id).slice(1)) || 0, Number(PropertiesService.getScriptProperties().getProperty('MENU_SEQ')) || 0)));
    sh_('Menu').deleteRow(r._row);
    RC = {}; bust_(); audit_('MENU_DELETE', String(r.name), 'ลบเมนู' + (r.type === 'SET' ? ' (ชุดเซ็ต)' : '') + ' ' + id);
    return true;
  });
}
function deleteIngredient(pin, id) { // ลบวัตถุดิบ (เจ้าของ): ลบไม่ได้ถ้ายังอยู่ในสูตรหรือตัวเลือกเสริม · ล็อตสต็อกคงประวัติไว้แต่ตัดยอดคงเหลือเป็น 0
  authOwner_(pin);
  return withLock_(() => {
    RC = {}; const r = rows_('Ingredients').find(x => x.ing_id == id);
    if (!r) throw new Error('ไม่พบวัตถุดิบ (อาจถูกลบไปแล้ว)');
    const menus = rows_('Menu'), inRec = rows_('Recipes').filter(x => x.ing_id == id).map(x => (menus.find(m => m.menu_id == x.menu_id) || {}).name || x.menu_id).filter((v, i, a) => a.indexOf(v) === i);
    if (inRec.length) throw new Error('ลบไม่ได้: วัตถุดิบนี้ยังอยู่ในสูตรของ ' + inRec.slice(0, 6).join(', ') + (inRec.length > 6 ? ' และอีก ' + (inRec.length - 6) + ' เมนู' : '') + ' (เอาออกจากสูตรก่อน)');
    const inOpt = rows_('Options').filter(o => o.ing_id == id).map(o => String(o.name));
    if (inOpt.length) throw new Error('ลบไม่ได้: วัตถุดิบนี้ถูกใช้ในตัวเลือกเสริม ' + inOpt.join(', ') + ' (แก้ตัวเลือกก่อน)');
    const left = Number(r.stock) || 0, lots = rows_('Stock_Lots').filter(l => l.ing_id == id && Number(l.qty_left) > 0);
    lots.forEach(l => sh_('Stock_Lots').getRange(l._row, 6).setValue(0)); if (RC) delete RC['Stock_Lots'];
    PropertiesService.getScriptProperties().setProperty('ING_SEQ', String(Math.max(parseInt(String(id).slice(1)) || 0, Number(PropertiesService.getScriptProperties().getProperty('ING_SEQ')) || 0)));
    sh_('Ingredients').deleteRow(r._row); RC = {};
    audit_('ING_DELETE', String(r.name), 'ลบวัตถุดิบ ' + id + (left > 0 ? ' · ยอดคงเหลือที่ถูกตัดทิ้ง ' + left + ' ' + (r.unit || '') : ''));
    return true;
  });
}
function saveMenu(pin, m, img) {
  authOwner_(pin);
  return withLock_(() => {
    const name = String(m.name || '').trim(), price = Number(m.price), unit = String(m.unit || '').trim() || 'ชิ้น', type = m.type === 'SET' ? 'SET' : '';
    const notes = String(m.quick_notes || '').split(/[\n,]/).map(s => cleanTxt_(s, 24)).filter(Boolean).slice(0, 8).join('\n');
    if (!name || !(price >= 0)) throw new Error('กรอกชื่อและราคาให้ถูกต้อง');
    const all = rows_('Menu'); let id = m.menu_id; const r = all.find(x => x.menu_id == id), comp = [];
    if (type === 'SET') {
      const seen = {};
      (m.items || []).forEach(c => {
        const q = Math.floor(Number(c.qty)); if (!(q >= 1)) return;
        if (seen[c.menu_id]) { seen[c.menu_id].qty += q; return; }
        const x = all.find(z => z.menu_id == c.menu_id); if (!x || x.type === 'SET' || c.menu_id == id) throw new Error('ส่วนประกอบของเซ็ตต้องเป็นเมนูปกติ');
        seen[c.menu_id] = { menu_id: c.menu_id, qty: q }; comp.push(seen[c.menu_id]);
      });
      if (!comp.length) throw new Error('ชุดเซ็ตต้องมีเมนูอย่างน้อย 1 รายการ');
    }
    if (r) {
      sh_('Menu').getRange(r._row, 2, 1, 4).setValues([[name, price, !!m.active, unit]]);
      const c = sh_('Menu').getRange(r._row, 6, 1, 2); c.setNumberFormat('@'); c.setValues([[type, notes]]);
      if (Number(r.price) !== price) audit_('MENU_PRICE', name, 'ราคา ' + Number(r.price) + ' → ' + price, price);
    } else {
      const n = Math.max(all.reduce((a, x) => Math.max(a, parseInt(String(x.menu_id).slice(1)) || 0), 0), Number(PropertiesService.getScriptProperties().getProperty('MENU_SEQ')) || 0) + 1;
      id = 'M' + pad2_(n); sh_('Menu').appendRow([id, name, price, !!m.active, unit, type, notes]);
    }
    const si = rows_('Set_Items').filter(s => s.set_id == id).map(s => s._row).sort((a, b) => b - a); si.forEach(n => sh_('Set_Items').deleteRow(n));
    if (comp.length) { const s = sh_('Set_Items'); s.getRange(s.getLastRow() + 1, 1, comp.length, 3).setValues(comp.map(c => [id, c.menu_id, c.qty])); }
    if (RC) delete RC['Set_Items'];
    if (img) putImg_('menu:' + id, img);
    bust_(); audit_('MENU_SAVE', name, (r ? 'แก้ไข' : 'เพิ่ม') + (type === 'SET' ? ' (ชุดเซ็ต)' : '') + (m.active ? '' : ' · ปิดขาย'));
    return id;
  });
}

function setupStatus(pin) { // หน้า "เริ่มต้นใช้งาน": นับว่าตั้งอะไรไปแล้วบ้าง
  authOwner_(pin); const S = set_(), menus = rows_('Menu').filter(m => m.menu_id && m.active !== false);
  const rec = {}; rows_('Recipes').forEach(r => { if (r.menu_id) rec[r.menu_id] = 1; });
  return { shop: String(S.shop_name || ''), menus: menus.length, withImg: menus.filter(m => imgs_().menu && imgs_().menu[m.menu_id]).length, ingredients: rows_('Ingredients').filter(i => i.ing_id).length, recipes: Object.keys(rec).length,
    staff: rows_('Staff').filter(s => s.staff_id && isTrue_(s.active)).length, orders: rows_('Orders').filter(o => o.order_id).length, logo: !!imgs_().logo, survey: !!String(S.survey_url || '').trim() };
}
function getBom(pin) {
  authOwner_(pin);
  return {
    menus: rows_('Menu').filter(m => m.menu_id).map(m => ({ menu_id: m.menu_id, name: m.name, price: Number(m.price), unit: m.unit || 'ชิ้น', type: m.type === 'SET' ? 'SET' : '' })),
    ingredients: rows_('Ingredients').map(i => ({ ing_id: i.ing_id, name: i.name, unit: i.unit, stock: Number(i.stock), reorder_point: Number(i.reorder_point), cost: Number(i.cost) || 0, is_pack: isPack_(i) })),
    recipes: rows_('Recipes').map(r => ({ menu_id: r.menu_id, ing_id: r.ing_id, qty: Number(r.qty) }))
  };
}
function saveIngredient(pin, g) {
  authOwner_(pin);
  return withLock_(() => {
    const name = String(g.name || '').trim(), cost = r4_(g.cost) || 0, pack = !!g.is_pack;
    if (!name) throw new Error('กรอกชื่อวัตถุดิบ');
    if (cost < 0) throw new Error('ราคาต้องไม่ติดลบ');
    const all = rows_('Ingredients'), r = all.find(x => x.ing_id == g.ing_id);
    if (r) {
      sh_('Ingredients').getRange(r._row, 2, 1, 2).setValues([[name, g.unit || '']]);
      sh_('Ingredients').getRange(r._row, 5, 1, 3).setValues([[Number(g.reorder_point) || 0, cost, pack]]); audit_('ING_SAVE', name, 'แก้ไข · ราคา ' + cost + ' · เตือนที่ ' + (Number(g.reorder_point) || 0)); return r.ing_id;
    }
    const n = Math.max(all.reduce((a, x) => Math.max(a, parseInt(String(x.ing_id).slice(1)) || 0), 0), Number(PropertiesService.getScriptProperties().getProperty('ING_SEQ')) || 0) + 1, id = 'I' + (n < 10 ? '0' + n : n), st = r4_(g.stock) || 0;
    ensureLots_();
    sh_('Ingredients').appendRow([id, name, g.unit || '', st, Number(g.reorder_point) || 0, cost, pack]);
    if (st > 0) { addLot_(id, st, cost, 'สต็อกตั้งต้น'); log_(id, st, 'สต็อกตั้งต้น', ''); }
    return id;
  });
}
function saveRecipe(pin, menuId, lines) {
  authOwner_(pin);
  return withLock_(() => {
    if (!rows_('Menu').some(m => m.menu_id == menuId)) throw new Error('ไม่พบเมนู');
    const ing = rows_('Ingredients'), sum = {};
    (lines || []).forEach(l => { if (ing.some(i => i.ing_id == l.ing_id) && r4_(l.qty) > 0) sum[l.ing_id] = r4_((sum[l.ing_id] || 0) + Number(l.qty)); });
    rows_('Recipes').filter(r => r.menu_id == menuId).map(r => r._row).reverse().forEach(n => sh_('Recipes').deleteRow(n));
    Object.keys(sum).forEach(k => sh_('Recipes').appendRow([menuId, k, sum[k]]));
    bust_(); audit_('RECIPE_SAVE', menuId, 'บันทึกสูตร ' + Object.keys(sum).length + ' รายการ');
    return true;
  });
}

// ---------- คูปองส่วนลด (เฉพาะ PIN เจ้าของ) ----------
function getCoupons(pin) {
  authOwner_(pin);
  return { coupons: rows_('Coupons').filter(c => c.code !== '' && c.code != null).map(c => ({
    code: String(c.code), type: c.type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT', value: Number(c.value) || 0, active: c.active !== false, note: String(c.note || ''), survey: isTrue_(c.survey), mode: cpMode_(c)
  })) };
}
function saveCoupon(pin, c, edit) {
  authOwner_(pin);
  return withLock_(() => {
    const code = String(c.code || '').trim().toUpperCase(), type = c.type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT', value = Number(c.value), note = String(c.note || '').trim(), survey = !!c.survey, mode = survey ? '' : cpMode_(c);
    if (!/^[A-Z0-9_-]{2,20}$/.test(code)) throw new Error('รหัสคูปองใช้ได้เฉพาะ A-Z 0-9 _ - ยาว 2-20 ตัว');
    if (survey && !/^[A-Z0-9]{2}$/.test(code)) throw new Error('คูปองแบบสอบถามต้องมีรหัส 2 ตัวอักษร/ตัวเลข (ตรงกับ 2 ตัวแรกของรหัสออเดอร์)');
    if (!(value > 0)) throw new Error('มูลค่าส่วนลดต้องมากกว่า 0');
    if (type === 'PERCENT' && value > 100) throw new Error('เปอร์เซ็นต์ต้องไม่เกิน 100');
    const r = rows_('Coupons').find(x => String(x.code) === code);
    if (edit && !r) throw new Error('ไม่พบคูปอง');
    if (!edit && r) throw new Error('มีรหัสคูปองนี้แล้ว');
    const s = sh_('Coupons'), row = r ? r._row : s.getLastRow() + 1;
    s.getRange(row, 1).setNumberFormat('@');
    s.getRange(row, 1, 1, 7).setValues([[code, type, value, !!c.active, note, survey, mode]]); bust_();
    audit_('COUPON_SAVE', code, (edit ? 'แก้ไข' : 'เพิ่ม') + ' · ' + (type === 'PERCENT' ? value + '%' : value + ' บาท') + (survey ? ' · แบบสอบถาม' : '') + (mode === 'CUSTOMER' ? ' · ลูกค้ากดเอง' : mode === 'AUTO' ? ' · ลดอัตโนมัติ' : '') + (c.active ? '' : ' · ปิดใช้'), value);
    return true;
  });
}

// ---------- ลดจำนวนรอบเรียกเซิร์ฟเวอร์ ----------
function getStaffMenu(pin) { auth_(pin); return Object.assign(getMenu(), ckOpts_(), { platforms: platformsCfg_().list }); } // หน้าสั่งแทน: เมนู + คูปอง + ถุง/แก้ว ในครั้งเดียว
function bootPayload_(page) { // โค้ดแอป + ข้อมูลเริ่มต้น (ลูกค้า: เมนู รูป เวลารอคิว / พนักงาน: โลโก้ ชื่อร้าน / จอคิว: เลขคิว)
  const o = { code: getClient(), page: page === 'staff' || page === 'display' ? page : '' };
  if (page === 'display') { try { o.disp = getDisplay(); } catch (e) {} return o; }
  if (page === 'staff') { try { o.img = getImages(); o.shop = set_().shop_name; } catch (e) {} return o; }
  const c = CacheService.getScriptCache(), hit = c.get('boot:c'); // ส่วนข้อมูลแคชไว้ 15 วินาที (ล้างทันทีเมื่อสต็อก/เมนู/รูปเปลี่ยน)
  if (hit) { const d = JSON.parse(hit); o.init = d.init; o.img = d.img; o.q = d.q; return o; }
  try {
    RC = {}; o.init = getMenu(); o.img = getImages(); o.q = { queueMin: eta_(queueCount_(), set_()) };
    try { c.put('boot:c', JSON.stringify({ init: o.init, img: o.img, q: o.q }), 15); } catch (e) {}
  } catch (e) { delete o.init; delete o.img; delete o.q; } finally { RC = null; }
  return o;
}
function bustBoot_() { try { CacheService.getScriptCache().remove('boot:c'); } catch (e) {} }
function getBoot(page) { return bootPayload_(page); } // วิธีสำรองถ้าฝังไปกับหน้าไม่ได้
function keepWarm() { set_(); return 'warm'; } // ตั้ง Trigger ทุก 5 นาทีให้เรียกฟังก์ชันนี้ เพื่อลดอาการช้าตอนเปิดครั้งแรกหลังไม่มีคนใช้

// ---------- ค่าใช้จ่ายรายเดือน (ค่าเช่า ค่าไฟ ฯลฯ) ----------
function saveMonthlyExpense(pin, e) {
  authOwner_(pin);
  return withLock_(() => {
    const month = String(e.month || ''), name = String(e.name || '').trim(), amount = r4_(e.amount);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('เดือนไม่ถูกต้อง');
    if (!name) throw new Error('กรอกชื่อรายการ'); if (!(amount >= 0)) throw new Error('จำนวนเงินไม่ถูกต้อง');
    const s = sh_('Monthly_Expense'), r = e.id ? rows_('Monthly_Expense').find(x => x.id == e.id) : null;
    if (e.id && !r) throw new Error('ไม่พบรายการ');
    const row = r ? r._row : s.getLastRow() + 1;
    s.getRange(row, 2).setNumberFormat('@'); s.getRange(row, 1, 1, 4).setValues([[r ? r.id : uid_(), month, name, amount]]);
    return true;
  });
}
function deleteMonthlyExpense(pin, id) {
  authOwner_(pin);
  return withLock_(() => { const r = rows_('Monthly_Expense').find(x => x.id == id); if (!r) throw new Error('ไม่พบรายการ'); sh_('Monthly_Expense').deleteRow(r._row); return true; });
}
function acc_(prefix) { // รวมตัวเลขรายวันของช่วง prefix ('YYYY' หรือ 'YYYY-MM') จากสรุปปิดวัน + บันทึกต้นทุน + ค่าใช้จ่ายรายวัน
  const D = {}, expBy = {}, day = d => D[d] || (D[d] = { date: d, closed: false, sales: 0, discount: 0, orders: 0, sale: 0, count: 0, waste: 0, exp: 0, fee: 0 });
  const legacy = {}, needFee = {}; let anyLegacy = false, anyNeed = false;
  rows_('Daily_Close').forEach(r => {
    const ds = dstr_(r.date); if (ds.indexOf(prefix) !== 0) return;
    const d = day(ds); d.closed = true;
    if (r.sales === '' || r.sales === undefined || r.sales === null) { legacy[ds] = 1; anyLegacy = true; }
    else { d.sales = Number(r.sales) || 0; d.discount = Number(r.discount) || 0; d.orders = Number(r.orders) || 0; }
    if (r.delivery_fee === '' || r.delivery_fee === undefined || r.delivery_fee === null) { needFee[ds] = 1; anyNeed = true; } // วันที่ปิดก่อนมีคอลัมน์ค่าส่ง: คำนวณย้อนหลังจากชีต Orders
    else d.fee = Number(r.delivery_fee) || 0;
  });
  if (anyLegacy || anyNeed) rows_('Orders').forEach(o => { const ds = dstr_(o.created_at); if ((legacy[ds] || needFee[ds]) && o.status !== 'CANCELLED' && !isTrue_(o.is_test)) { const d = D[ds]; if (legacy[ds]) { d.sales = r4_(d.sales + Number(o.total)); d.discount = r4_(d.discount + (Number(o.discount) || 0)); d.orders++; d.fee = r4_(d.fee + feeOf_(o)); } else if (!unpaidLater_(o)) d.fee = r4_(d.fee + feeOf_(o)); } });
  rows_('Cost_Ledger').forEach(r => {
    const ds = dstr_(r.date); if (ds.indexOf(prefix) !== 0) return;
    const d = day(ds), t = r.type === 'SALE' ? 'sale' : r.type === 'COUNT' ? 'count' : 'waste'; d[t] = r4_(d[t] + Number(r.cost));
  });
  rows_('Daily_Expense').forEach(r => {
    const ds = dstr_(r.date); if (ds.indexOf(prefix) !== 0) return;
    const d = day(ds); d.exp = r4_(d.exp + Number(r.amount)); expBy[r.name] = r4_((expBy[r.name] || 0) + Number(r.amount));
  });
  return { days: D, expBy: expBy };
}
function openDays_(prefix) { // วันที่มีออเดอร์แต่ยังไม่ได้ปิดวัน
  const closed = {}; rows_('Daily_Close').forEach(r => closed[dstr_(r.date)] = 1);
  const out = {}; rows_('Orders').forEach(o => { const ds = dstr_(o.created_at); if (ds.indexOf(prefix) === 0 && o.status !== 'CANCELLED' && !isTrue_(o.is_test) && !closed[ds]) out[ds] = (out[ds] || 0) + 1; });
  return Object.keys(out).sort().map(d => ({ date: d, orders: out[d] }));
}
const profitOf_ = d => r4_(d.sales - d.sale - d.count - d.waste - d.exp);
function reportMonth(pin, month) {
  authOwner_(pin); RC = {};
  try {
    month = month || today_().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('เดือนไม่ถูกต้อง');
    const a = acc_(month), days = Object.keys(a.days).sort().map(k => Object.assign({}, a.days[k], { profit: profitOf_(a.days[k]) }));
    const t = { sales: 0, discount: 0, orders: 0, sale: 0, count: 0, waste: 0, exp: 0, fee: 0 };
    days.forEach(d => Object.keys(t).forEach(k => t[k] = r4_(t[k] + d[k])));
    const me = rows_('Monthly_Expense').filter(r => mstr_(r.month) === month).map(r => ({ id: r.id, name: r.name, amount: Number(r.amount) }));
    const monthly = r4_(me.reduce((a, e) => a + e.amount, 0)), gross = r4_(t.sales - t.sale - t.count - t.waste);
    return {
      month: month, days: days, totals: Object.assign(t, { gross: gross, monthly: monthly, net: r4_(gross - t.exp - monthly) }),
      expBy: Object.keys(a.expBy).map(k => ({ name: k, amount: a.expBy[k] })), monthlyExp: me, openDays: openDays_(month)
    };
  } finally { RC = null; }
}
function reportYear(pin, year) {
  authOwner_(pin); RC = {};
  try {
    year = String(year || today_().slice(0, 4)); if (!/^\d{4}$/.test(year)) throw new Error('ปีไม่ถูกต้อง');
    const a = acc_(year), me = rows_('Monthly_Expense').filter(r => mstr_(r.month).indexOf(year) === 0), months = [];
    for (let m = 1; m <= 12; m++) {
      const key = year + '-' + (m < 10 ? '0' + m : m), t = { month: key, sales: 0, discount: 0, orders: 0, sale: 0, count: 0, waste: 0, exp: 0, fee: 0, closedDays: 0 };
      Object.keys(a.days).filter(k => k.indexOf(key) === 0).forEach(k => { const d = a.days[k]; ['sales', 'discount', 'orders', 'sale', 'count', 'waste', 'exp', 'fee'].forEach(f => t[f] = r4_(t[f] + d[f])); if (d.closed) t.closedDays++; });
      t.monthly = r4_(me.filter(r => mstr_(r.month) === key).reduce((s, r) => s + Number(r.amount), 0));
      t.gross = r4_(t.sales - t.sale - t.count - t.waste); t.net = r4_(t.gross - t.exp - t.monthly); months.push(t);
    }
    const tot = { sales: 0, discount: 0, orders: 0, sale: 0, count: 0, waste: 0, exp: 0, fee: 0, monthly: 0, gross: 0, net: 0, closedDays: 0 };
    months.forEach(m => Object.keys(tot).forEach(k => tot[k] = r4_(tot[k] + m[k])));
    return { year: year, months: months, totals: tot, openDays: openDays_(year) };
  } finally { RC = null; }
}
function exportReport(pin, kind, key) { // เขียนรายงานลงแท็บใหม่ในชีต (นักบัญชีเปิด/ดาวน์โหลดเป็น Excel หรือ PDF ได้)
  authOwner_(pin); let rows, name;
  if (kind === 'year') {
    const r = reportYear(pin, key); name = 'Report_' + r.year;
    rows = [['รายงานประจำปี', r.year], [], ['เดือน', 'ยอดขาย (รวมค่าส่ง)', 'ส่วนลดค่าสินค้า', 'ค่าส่ง', 'ออเดอร์', 'ต้นทุนวัตถุดิบที่ขาย', 'ของนอกสูตรที่ใช้', 'ของเสีย/ส่วนต่าง', 'กำไรขั้นต้น', 'ค่าใช้จ่ายรายวัน', 'ค่าใช้จ่ายรายเดือน', 'กำไรสุทธิ', 'วันที่ปิดแล้ว']]
      .concat(r.months.map(m => [m.month, m.sales, m.discount, m.fee, m.orders, m.sale, m.count, m.waste, m.gross, m.exp, m.monthly, m.net, m.closedDays]))
      .concat([['รวม', r.totals.sales, r.totals.discount, r.totals.fee, r.totals.orders, r.totals.sale, r.totals.count, r.totals.waste, r.totals.gross, r.totals.exp, r.totals.monthly, r.totals.net, r.totals.closedDays]]);
  } else {
    const r = reportMonth(pin, key); name = 'Report_' + r.month; const t = r.totals;
    rows = [['รายงานประจำเดือน', r.month], [], ['วันที่', 'ยอดขาย (รวมค่าส่ง)', 'ส่วนลดค่าสินค้า', 'ค่าส่ง', 'ออเดอร์', 'ต้นทุนวัตถุดิบที่ขาย', 'ของนอกสูตรที่ใช้', 'ของเสีย/ส่วนต่าง', 'ค่าใช้จ่ายรายวัน', 'กำไร', 'ปิดวันแล้ว']]
      .concat(r.days.map(d => [d.date, d.sales, d.discount, d.fee, d.orders, d.sale, d.count, d.waste, d.exp, d.profit, d.closed ? 'ใช่' : 'ยังไม่ปิด']))
      .concat([['รวม', t.sales, t.discount, t.fee, t.orders, t.sale, t.count, t.waste, t.exp, r4_(t.gross - t.exp), ''], [], ['ค่าใช้จ่ายรายเดือน']])
      .concat(r.monthlyExp.map(e => [e.name, e.amount])).concat([['รวมค่าใช้จ่ายรายเดือน', t.monthly], ['กำไรสุทธิ', t.net]]);
  }
  const w = rows.reduce((a, r) => Math.max(a, r.length), 1), ss = ss_(), s = ss.getSheetByName(name) || ss.insertSheet(name);
  s.clear(); s.getRange(1, 1, rows.length, w).setValues(rows.map(r => { const x = r.slice(); while (x.length < w) x.push(''); return x; }));
  return { name: name, url: ss.getUrl() + '#gid=' + s.getSheetId() };
}

// ===== v2 =====
function cleanTxt_(s, max) { // ตัดอักขระควบคุม และตัวอักษรนำที่ทำให้ชีตตีความเป็นสูตร (= + - @)
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/^[=+\-@\s]+/, '').trim().slice(0, max || 80);
}
function parseOpts_(v) { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function extraOf_(detail, opts, note) {
  const p = []; if (detail) p.push(String(detail));
  if (opts && opts.length) p.push('+ ' + opts.map(o => o.name).join(', '));
  if (note) p.push('หมายเหตุ: ' + note);
  return p.join(' · ');
}
function itemExtra_(i) { return extraOf_(i.detail, parseOpts_(i.opts), i.note); }
function itemRc_(i) { return { name: String(i.name), qty: Number(i.qty), price: Number(i.price), extra: itemExtra_(i) }; }
function labelOf_(promoNote, cp) { return [String(promoNote || ''), cp && (cp.label || cp.code) ? String(cp.label || cp.code) : ''].filter(Boolean).join(' + '); }
function itemUse_(it, rm) { // วัตถุดิบที่ใช้ของรายการนี้: ใช้สูตรที่บันทึกไว้ตอนสั่ง (ถ้าไม่มีใช้สูตรปัจจุบัน) + วัตถุดิบของตัวเลือกเพิ่ม
  const q = Number(it.qty) || 0, out = {}, add = (k, v) => { out[k] = r4_((out[k] || 0) + v); };
  let per = null; try { per = it.use ? JSON.parse(it.use) : null; } catch (e) {}
  if (!per || typeof per !== 'object') per = rm[it.menu_id] || {};
  Object.keys(per).forEach(k => add(k, Number(per[k]) * q));
  parseOpts_(it.opts).forEach(o => { if (o.ing_id && Number(o.qty) > 0) add(o.ing_id, Number(o.qty) * q); });
  return out;
}
function recMap_(menus, rec, sets) { // สูตรวัตถุดิบต่อ 1 หน่วยของแต่ละเมนู (ชุดเซ็ต = รวมสูตรของเมนูย่อย)
  const base = {};
  rec.forEach(r => { const b = base[r.menu_id] = base[r.menu_id] || {}; b[r.ing_id] = r4_((b[r.ing_id] || 0) + Number(r.qty)); });
  const out = {};
  menus.forEach(m => {
    if (m.type === 'SET') {
      const o = {};
      sets.filter(s => s.set_id == m.menu_id).forEach(s => { const b = base[s.menu_id] || {}; Object.keys(b).forEach(k => o[k] = r4_((o[k] || 0) + b[k] * Number(s.qty))); });
      out[m.menu_id] = o;
    } else out[m.menu_id] = base[m.menu_id] || {};
  });
  return out;
}
function setText_(setId, menus, sets) { return sets.filter(s => s.set_id == setId).map(s => { const m = menus.find(x => x.menu_id == s.menu_id); return (m ? m.name : s.menu_id) + ' ×' + Number(s.qty); }).join(' + '); }
function notesOf_(m) { return String(m.quick_notes || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean).slice(0, 8).map(s => s.slice(0, 24)); }
function optMenus_(o) { const v = String(o.menu_ids == null ? '' : o.menu_ids).trim(); return !v || v === '*' ? null : v.split(',').map(s => s.trim()).filter(Boolean); }
function optFits_(o, menuId) { const m = optMenus_(o); return !m || m.indexOf(String(menuId)) >= 0; }
function hm_(v) { if (v instanceof Date) return fmt_(v, 'HH:mm'); const m = String(v == null ? '' : v).trim().match(/^(\d{1,2}):(\d{2})/); return m ? (m[1].length < 2 ? '0' : '') + m[1] + ':' + m[2] : ''; }
function dtxt_(v) { if (v instanceof Date) return dstr_(v); const s = String(v == null ? '' : v).trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function normPromo_(p) {
  const ids = String(p.menu_ids == null ? '' : p.menu_ids).trim();
  return { promo_id: String(p.promo_id), name: String(p.name), type: String(p.type), menu_ids: !ids || ids === '*' ? null : ids.split(',').map(s => s.trim()).filter(Boolean),
    x: Number(p.x) || 0, y: Number(p.y) || 0, value: Number(p.value) || 0, start: hm_(p.start), end: hm_(p.end),
    days: String(p.days == null ? '' : p.days).split(',').map(s => s.trim()).filter(s => /^[0-6]$/.test(s)).map(Number), date_from: dtxt_(p.date_from), date_to: dtxt_(p.date_to) };
}
function activePromos_() { return crows_('Promos').filter(p => p.promo_id && p.name && p.active !== false).map(normPromo_); }
function nowInfo_() { const d = new Date(); return { hm: fmt_(d, 'HH:mm'), dow: Number(fmt_(d, 'u')) % 7, date: fmt_(d, 'yyyy-MM-dd') }; }
function promoOn_(p, now) {
  if (p.days.length && p.days.indexOf(now.dow) < 0) return false;
  if (p.date_from && now.date < p.date_from) return false;
  if (p.date_to && now.date > p.date_to) return false;
  if (p.start && p.end) { if (p.start <= p.end) { if (now.hm < p.start || now.hm >= p.end) return false; } else if (now.hm < p.start && now.hm >= p.end) return false; }
  return true;
}
function promoCalc_(units, promos, now) { // units = [{menu_id, price}] ต่อ 1 ชิ้น (ราคาเมนูไม่รวมตัวเลือกเพิ่ม) · แต่ละชิ้นได้โปรเดียว เรียงตามลำดับแถวในชีต
  const claimed = units.map(() => false), applied = []; let total = 0;
  promos.forEach(p => {
    if (!promoOn_(p, now)) return;
    const el = []; units.forEach((u, i) => { if (!claimed[i] && (!p.menu_ids || p.menu_ids.indexOf(String(u.menu_id)) >= 0)) el.push(i); });
    if (!el.length) return;
    let d = 0; const used = [];
    if (p.type === 'BXGY') { // ซื้อ x แถม y: ทุกๆ (x+y) ชิ้น ชิ้นที่ถูกที่สุด y ชิ้นฟรี
      const x = Math.max(1, Math.floor(p.x)), y = Math.max(1, Math.floor(p.y)), g = x + y, k = Math.floor(el.length / g);
      if (!k) return;
      el.sort((a, b) => units[b].price - units[a].price);
      el.slice(0, k * g).forEach((i, j) => { used.push(i); if (j % g >= x) d += units[i].price; });
    } else if (p.type === 'PERCENT') el.forEach(i => { d += units[i].price * p.value / 100; used.push(i); });
    else if (p.type === 'PRICE') el.forEach(i => { const cut = units[i].price - p.value; if (cut > 0) { d += cut; used.push(i); } });
    else if (p.type === 'AMOUNT') el.forEach(i => { d += Math.min(units[i].price, p.value); used.push(i); });
    d = r2_(d);
    if (d > 0) { used.forEach(i => claimed[i] = true); total += d; applied.push({ id: p.promo_id, name: p.name, amount: d }); }
  });
  return { discount: r2_(total), applied: applied };
}
function pinHash_(salt, pin) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + ':' + String(pin)).map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join(''); }
function pinProblem_(p) { // คืนข้อความปัญหา หรือ '' ถ้า PIN ใช้ได้
  p = String(p == null ? '' : p);
  if (!/^\d+$/.test(p)) return 'PIN ต้องเป็นตัวเลขเท่านั้น';
  if (p.length < PIN_MIN || p.length > 10) return 'PIN ต้องยาว ' + PIN_MIN + '-10 หลัก';
  if (/^(\d)\1+$/.test(p)) return 'PIN ห้ามเป็นเลขซ้ำกันหมด';
  let up = true, dn = true;
  for (let i = 1; i < p.length; i++) { const d = Number(p[i]) - Number(p[i - 1]); if (d !== 1) up = false; if (d !== -1) dn = false; }
  if (up || dn) return 'PIN ห้ามเป็นเลขเรียงกัน เช่น 123456';
  if (WEAK_PINS.indexOf(p) >= 0) return 'PIN เดาง่ายเกินไป';
  return '';
}
function randPin_() { let p; do { p = String(100000 + Math.floor(Math.random() * 900000)); } while (pinProblem_(p)); return p; }
function newSalt_() { return 's' + uid_() + uid_(); }
function ensureStaff_() { // ครั้งแรก: ย้าย PIN เดิมใน Settings มาเป็นบัญชีในชีต Staff (เก็บแบบ hash) และบังคับเปลี่ยน PIN ตอนเข้าครั้งแรก
  if (STAFF_OK) return;
  const s = sh_('Staff');
  if (s.getLastRow() < 2) {
    const l = LockService.getScriptLock(); l.waitLock(20000);
    try {
      if (s.getLastRow() < 2) {
        const legacy = {}; rows_('Settings').forEach(r => legacy[r.key] = r.value);
        if (!String(legacy.owner_pin || '')) STAFF_RANDOM = true;
        const mk = (id, name, role, pin) => { const salt = newSalt_(); return [id, name, role, pinHash_(salt, pin), salt, true, true, new Date()]; };
        const rows = [mk('U01', 'เจ้าของ', 'owner', String(legacy.owner_pin || '') || randPin_()), mk('U02', 'พนักงาน', 'staff', String(legacy.staff_pin || '') || randPin_())];
        s.getRange(2, 2, rows.length, 1).setNumberFormat('@'); s.getRange(2, 4, rows.length, 2).setNumberFormat('@');
        s.getRange(2, 1, rows.length, 8).setValues(rows);
        ['staff_pin', 'owner_pin'].forEach(k => { const r = rows_('Settings').find(x => x.key == k); if (r) sh_('Settings').getRange(r._row, 2).setValue(''); }); // ลบ PIN แบบข้อความล้วนออกจากชีต
        if (RC) { delete RC['Settings']; delete RC['Staff']; }
        bust_();
      }
    } finally { l.releaseLock(); }
  }
  STAFF_OK = true;
}
function staffTable_() { ensureStaff_(); return crows_('Staff'); }
function findStaffByPin_(pin) {
  const p = String(pin == null ? '' : pin).trim(); if (!p) return null;
  return staffTable_().find(s => isTrue_(s.active) && String(s.pin_hash) === pinHash_(s.salt, p)) || null;
}
function staffLogin(pin) { // เข้าสู่ระบบด้วย PIN → ได้ token ใช้เรียกฟังก์ชันอื่นแทน PIN (PIN ไม่ถูกส่งซ้ำทุกครั้ง)
  const c = CacheService.getScriptCache();
  if (c.get('al')) throw new Error('ใส่ PIN ผิดหลายครั้ง ระบบล็อกการเข้าสู่ระบบชั่วคราว 2 นาที กรุณารอแล้วลองใหม่');
  const u = findStaffByPin_(pin);
  if (!u) {
    const n = (Number(c.get('af')) || 0) + 1; c.put('af', String(n), 600);
    if (n >= 10) { c.put('al', '1', 120); c.remove('af'); }
    Utilities.sleep(600);
    throw new Error('PIN ไม่ถูกต้อง');
  }
  const tok = 'T' + (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  c.put('ses:' + tok, JSON.stringify({ id: u.staff_id, pv: String(u.pin_hash).slice(0, 8), t: Date.now() }), SES_TTL);
  ACTOR = { id: u.staff_id, name: String(u.name), role: u.role };
  audit_('LOGIN', '', isTrue_(u.must_change) ? 'เข้าด้วย PIN ชั่วคราว (ต้องเปลี่ยน)' : '');
  return { token: tok, name: String(u.name), role: u.role, must_change: isTrue_(u.must_change) };
}
function logoutStaff(tok) { try { CacheService.getScriptCache().remove('ses:' + String(tok)); } catch (e) {} return true; }
function changeOwnPin(tok, oldPin, newPin) {
  const me = auth_(tok, { allowPending: true }), c = CacheService.getScriptCache(), k = 'pc:' + me.id, n = (Number(c.get(k)) || 0) + 1;
  if (n > 6) throw new Error('เปลี่ยน PIN ผิดพลาดหลายครั้ง กรุณารอ 10 นาที');
  c.put(k, String(n), 600);
  return withLock_(() => {
    const rows = rows_('Staff'), u = rows.find(s => s.staff_id == me.id);
    if (!u || String(u.pin_hash) !== pinHash_(u.salt, String(oldPin))) throw new Error('PIN เดิมไม่ถูกต้อง');
    const bad = pinProblem_(newPin); if (bad) throw new Error(bad);
    if (String(newPin) === String(oldPin)) throw new Error('PIN ใหม่ต้องไม่ซ้ำกับ PIN เดิม');
    if (rows.some(s => s.staff_id != u.staff_id && isTrue_(s.active) && String(s.pin_hash) === pinHash_(s.salt, String(newPin)))) throw new Error('PIN นี้ไม่สามารถใช้ได้ กรุณาเลือก PIN อื่น');
    const salt = newSalt_(), h = pinHash_(salt, String(newPin)), sh = sh_('Staff');
    sh.getRange(u._row, 4, 1, 2).setNumberFormat('@'); sh.getRange(u._row, 4, 1, 2).setValues([[h, salt]]); sh.getRange(u._row, 7).setValue(false);
    if (RC) delete RC['Staff']; bust_();
    c.put('ses:' + tok, JSON.stringify({ id: u.staff_id, pv: h.slice(0, 8), t: Date.now() }), SES_TTL); c.remove(k);
    audit_('PIN_CHANGE', u.name, 'เปลี่ยน PIN ของตัวเอง');
    return true;
  });
}
function getStaff(pin) {
  authOwner_(pin);
  return { staff: rows_('Staff').filter(s => s.staff_id).map(s => ({ staff_id: s.staff_id, name: String(s.name), role: s.role === 'owner' ? 'owner' : 'staff', active: isTrue_(s.active), must_change: isTrue_(s.must_change) })), min: PIN_MIN };
}
function saveStaff(pin, s) { // เจ้าของเพิ่ม/แก้ไขพนักงาน และตั้ง PIN ชั่วคราวใหม่ (พนักงานต้องเปลี่ยนเองตอนเข้าครั้งถัดไป)
  authOwner_(pin);
  return withLock_(() => {
    const rows = rows_('Staff'), name = cleanTxt_(s.name, 30), role = s.role === 'owner' ? 'owner' : 'staff', active = s.active !== false, np = s.pin == null ? '' : String(s.pin).trim();
    if (!name) throw new Error('กรอกชื่อพนักงาน');
    const r = s.staff_id ? rows.find(x => x.staff_id == s.staff_id) : null; if (s.staff_id && !r) throw new Error('ไม่พบพนักงาน');
    if (rows.some(x => (!r || x.staff_id != r.staff_id) && isTrue_(x.active) && String(x.name).trim() === name)) throw new Error('มีชื่อนี้อยู่แล้ว');
    const otherOwners = rows.filter(x => isTrue_(x.active) && x.role === 'owner' && (!r || x.staff_id != r.staff_id));
    if ((role !== 'owner' || !active) && !otherOwners.length) throw new Error('ต้องมีเจ้าของที่ใช้งานอยู่อย่างน้อย 1 คน');
    if (!r && !np) throw new Error('ตั้ง PIN ชั่วคราวให้พนักงานใหม่');
    if (np) {
      const bad = pinProblem_(np); if (bad) throw new Error(bad);
      if (rows.some(x => (!r || x.staff_id != r.staff_id) && isTrue_(x.active) && String(x.pin_hash) === pinHash_(x.salt, np))) throw new Error('PIN นี้ไม่สามารถใช้ได้ กรุณาเลือก PIN อื่น');
    }
    const sh = sh_('Staff'); let id;
    if (r) {
      id = r.staff_id;
      sh.getRange(r._row, 2).setNumberFormat('@'); sh.getRange(r._row, 2, 1, 2).setValues([[name, role]]); sh.getRange(r._row, 6).setValue(active);
      if (np) { const salt = newSalt_(); sh.getRange(r._row, 4, 1, 2).setNumberFormat('@'); sh.getRange(r._row, 4, 1, 2).setValues([[pinHash_(salt, np), salt]]); sh.getRange(r._row, 7).setValue(true); }
    } else {
      const n = rows.reduce((a, x) => Math.max(a, parseInt(String(x.staff_id).slice(1)) || 0), 0) + 1, salt = newSalt_(), row = sh.getLastRow() + 1; id = 'U' + pad2_(n);
      sh.getRange(row, 2).setNumberFormat('@'); sh.getRange(row, 4, 1, 2).setNumberFormat('@');
      sh.getRange(row, 1, 1, 8).setValues([[id, name, role, pinHash_(salt, np), salt, active, true, new Date()]]);
    }
    if (RC) delete RC['Staff']; bust_();
    audit_('STAFF_SAVE', name, (r ? 'แก้ไข' : 'เพิ่ม') + ' · สิทธิ์ ' + (role === 'owner' ? 'เจ้าของ' : 'พนักงาน') + (active ? '' : ' · ปิดใช้งาน') + (np ? ' · ตั้ง PIN ชั่วคราวใหม่' : ''));
    return id;
  });
}
function resetOwnerPin() { // รันจากตัวแก้ไข Apps Script เมื่อลืม PIN เจ้าของ: ตั้ง PIN ชั่วคราวใหม่ให้เจ้าของ (ดูที่ Execution log) และปลดล็อกการเข้าสู่ระบบ
  ensureStaff_(); const rows = rows_('Staff'), o = rows.find(r => r.role === 'owner' && isTrue_(r.active)) || rows.find(r => r.role === 'owner');
  if (!o) throw new Error('ไม่พบบัญชีเจ้าของในชีต Staff');
  const pin = randPin_(), salt = newSalt_(), sh = sh_('Staff');
  sh.getRange(o._row, 4, 1, 2).setNumberFormat('@'); sh.getRange(o._row, 4, 1, 2).setValues([[pinHash_(salt, pin), salt]]); sh.getRange(o._row, 6, 1, 2).setValues([[true, true]]);
  const c = CacheService.getScriptCache(); c.remove('al'); c.remove('af'); bust_();
  Logger.log('PIN ชั่วคราวของ "' + o.name + '" = ' + pin + '  (ต้องเปลี่ยนตอนเข้าครั้งแรก)');
  return pin;
}
// เมนูในชีต (onOpen) อยู่ในไฟล์ Menu.gs — เมนู Pang Kum: รีเซ็ต PIN เจ้าของ / เวอร์ชันระบบ (ฟังก์ชัน resetOwnerPinMenu อยู่ด้านล่าง)
function resetOwnerPinMenu() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('รีเซ็ต PIN เจ้าของ', 'ระบบจะออก PIN ชั่วคราวใหม่ให้เจ้าของ (PIN เดิมใช้ไม่ได้อีก) และต้องเปลี่ยนตอนเข้าครั้งแรก\nดำเนินการต่อหรือไม่?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const pin = resetOwnerPin();
  ui.alert('PIN ชั่วคราวของเจ้าของ', pin + '\n\nเข้าสู่ระบบด้วย PIN นี้ แล้วระบบจะให้ตั้ง PIN ใหม่ทันที', ui.ButtonSet.OK);
}
// ลืม PIN เจ้าของ ผ่านอีเมล: ส่งรหัส 8 หลัก (อายุ 15 นาที) ไปที่อีเมล Google ของเจ้าของสคริปต์ · PIN เดิมยังใช้ได้จนกว่าจะยืนยันรหัสสำเร็จ
function ownerMail_() { let m = ''; try { m = Session.getEffectiveUser().getEmail(); } catch (e) {} if (!m) { try { m = Session.getActiveUser().getEmail(); } catch (e) {} } return m; }
function maskMail_(m) { const p = String(m).split('@'); return p.length < 2 ? '' : p[0].slice(0, 2) + '***@' + p[1]; }
function forgotPinInfo() { const m = ownerMail_(); if (!m) throw new Error('ยังไม่มีอีเมลเจ้าของระบบ ให้ใช้เมนู Pang Kum ในชีตแทน'); return { mail: maskMail_(m) }; }
function forgotPinSend() {
  const c = CacheService.getScriptCache(), m = ownerMail_();
  if (!m) throw new Error('ยังไม่มีอีเมลเจ้าของระบบ ให้ใช้เมนู Pang Kum ในชีตแทน');
  if (c.get('fp_w')) throw new Error('เพิ่งส่งรหัสไปแล้ว กรุณารอ 1 นาทีแล้วลองใหม่');
  const n = (Number(c.get('fp_n')) || 0) + 1; if (n > 5) throw new Error('ขอรหัสบ่อยเกินไป กรุณารอ 1 ชั่วโมง');
  c.put('fp_n', String(n), 3600); c.put('fp_w', '1', 60);
  const code = String(10000000 + Math.floor(Math.random() * 90000000)), salt = newSalt_();
  c.put('fp_c', JSON.stringify({ h: pinHash_(salt, code), s: salt }), 900); c.remove('fp_a');
  try { MailApp.sendEmail(m, 'รหัสรีเซ็ต PIN เจ้าของ', 'รหัสรีเซ็ต PIN เจ้าของร้าน: ' + code + '\nใช้ได้ภายใน 15 นาที\nหากคุณไม่ได้ขอ ไม่ต้องทำอะไร PIN เดิมยังใช้ได้ตามปกติ'); }
  catch (e) { c.remove('fp_c'); c.remove('fp_w'); throw new Error('ส่งอีเมลไม่ได้ (ต้องอนุญาตสิทธิ์ส่งอีเมลก่อน: เปิดตัวแก้ไข Apps Script รันฟังก์ชัน authorizeMail หนึ่งครั้ง แล้ว Deploy New version) หรือใช้เมนู Pang Kum ในชีตแทน'); }
  ACTOR = null; audit_('PIN_FORGOT_REQ', '', 'ขอรหัสรีเซ็ต PIN เจ้าของทางอีเมล');
  return { mail: maskMail_(m) };
}
function forgotPinReset(code, newPin) {
  const c = CacheService.getScriptCache(), raw = c.get('fp_c');
  if (!raw) throw new Error('รหัสหมดอายุหรือยังไม่ได้ขอรหัส');
  const a = (Number(c.get('fp_a')) || 0) + 1; c.put('fp_a', String(a), 900);
  if (a > 5) { c.remove('fp_c'); throw new Error('กรอกรหัสผิดหลายครั้ง กรุณาขอรหัสใหม่'); }
  const k = JSON.parse(raw);
  if (k.h !== pinHash_(k.s, String(code || '').trim())) { Utilities.sleep(600); throw new Error('รหัสไม่ถูกต้อง'); }
  const bad = pinProblem_(newPin); if (bad) throw new Error(bad);
  return withLock_(() => {
    const rows = rows_('Staff'), o = rows.find(r => r.role === 'owner' && isTrue_(r.active));
    if (!o) throw new Error('ไม่พบบัญชีเจ้าของ');
    if (rows.some(x => x.staff_id != o.staff_id && isTrue_(x.active) && String(x.pin_hash) === pinHash_(x.salt, String(newPin)))) throw new Error('PIN นี้ไม่สามารถใช้ได้ กรุณาเลือก PIN อื่น');
    const salt = newSalt_(), sh = sh_('Staff');
    sh.getRange(o._row, 4, 1, 2).setNumberFormat('@'); sh.getRange(o._row, 4, 1, 2).setValues([[pinHash_(salt, String(newPin)), salt]]); sh.getRange(o._row, 7).setValue(false);
    c.remove('fp_c'); c.remove('fp_a'); c.remove('al'); c.remove('af');
    if (RC) delete RC['Staff']; bust_();
    ACTOR = { id: o.staff_id, name: String(o.name), role: 'owner' }; audit_('PIN_FORGOT_DONE', o.name, 'ตั้ง PIN ใหม่ด้วยรหัสทางอีเมล');
    return true;
  });
}
function authorizeMail() { return maskMail_(ownerMail_()) + ' / ' + MailApp.getRemainingDailyQuota(); } // รันครั้งเดียวจากตัวแก้ไข เพื่ออนุญาตสิทธิ์ส่งอีเมล แล้ว Deploy เป็น New version
function audit_(action, target, detail, amount) {
  try {
    const a = ACTOR || {};
    sh_('Audit_Log').appendRow([new Date(), a.id || '', a.name || 'ระบบ/ลูกค้า', action, String(target == null ? '' : target), cleanTxt_(detail, 300), amount === undefined || amount === null || amount === '' ? '' : Number(amount)]);
  } catch (e) {}
}
function getAudit(pin, day) {
  authOwner_(pin); RC = {};
  try {
    day = /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? day : today_();
    const rows = rowsOfDay_('Audit_Log', 'ts', day).map(r => ({ time: fmt_(r.ts, 'HH:mm:ss'), who: String(r.staff), action: String(r.action), target: String(r.target), detail: String(r.detail), amount: r.amount === '' || r.amount == null ? null : Number(r.amount) }));
    rows.reverse();
    return { day: day, total: rows.length, rows: rows.slice(0, 600) };
  } finally { RC = null; }
}
function blockDevice_(dev, ms) {
  const p = PropertiesService.getScriptProperties(); let m = {}; try { m = JSON.parse(p.getProperty('BLK') || '{}'); } catch (e) {}
  const now = Date.now(); Object.keys(m).forEach(k => { if (m[k] < now) delete m[k]; }); m[dev] = now + ms; p.setProperty('BLK', JSON.stringify(m));
}
function isBlocked_(dev) { try { const m = JSON.parse(PropertiesService.getScriptProperties().getProperty('BLK') || '{}'); return !!m[dev] && m[dev] > Date.now(); } catch (e) { return false; } }
function trialPrefix_(S) { return (norm_(S.trial_prefix || 'T') + 'T').slice(0, 1); }
function nextTrialCode_(S) { // เรียกภายใน lock เท่านั้น
  const p = PropertiesService.getScriptProperties(), n = (Number(p.getProperty('TRIAL_SEQ')) || 0) + 1;
  p.setProperty('TRIAL_SEQ', String(n)); return trialPrefix_(S) + String(n).padStart(2, '0'); // 2 หลักก่อน เกิน 99 เป็น 3 หลัก เกิน 999 เป็น 4 หลัก
}
function exportTrial(pin) { // ส่งออกข้อมูลออเดอร์ช่วงทดลองทุกรอบเป็นแท็บ Trial_Log ในชีต: ใช้เทียบเลขคิว/รหัสในแบบสอบถามกับออเดอร์จริง (รอบ + เลขคิว + เวลา)
  authOwner_(pin);
  const cur = (Number(PropertiesService.getScriptProperties().getProperty('TRIAL_ROUND')) || 0) + 1, f = v => v instanceof Date ? fmt_(v, 'yyyy-MM-dd HH:mm:ss') : '';
  const its = {}; rows_('Order_Items').forEach(i => { (its[i.order_id] = its[i.order_id] || []).push(String(i.name) + ' x' + Number(i.qty)); });
  const os = rows_('Orders').filter(o => String(o.order_code || '') !== '');
  const out = os.map(o => {
    const m = /^(.*?)X(\d+)$/.exec(String(o.order_code)), round = m ? Number(m[2]) : cur, code = m ? m[1] : String(o.order_code);
    const t0 = o.paid_at instanceof Date ? o.paid_at : o.created_at, wait = o.ready_at instanceof Date && t0 instanceof Date ? Math.round((o.ready_at.getTime() - t0.getTime()) / 6000) / 10 : '';
    return [round, code, String(o.order_id), f(o.created_at), (its[o.order_id] || []).join(', '), Number(o.total), String(o.status), f(o.paid_at), f(o.ready_at), wait, isTrue_(o.is_test) ? 'อัตโนมัติ' : 'ปกติ'];
  }).sort((a, b) => a[0] - b[0] || String(a[3]).localeCompare(String(b[3])));
  const head = ['รอบ', 'เลขคิว (รหัสในแบบสอบถาม)', 'order_id', 'เวลาสั่ง', 'รายการ', 'ยอด', 'สถานะ', 'เวลาชำระ', 'เวลาพร้อมรับ', 'รอจนพร้อมรับ (นาที)', 'โหมด'], ss = ss_(), s = ss.getSheetByName('Trial_Log') || ss.insertSheet('Trial_Log');
  s.clear(); s.getRange(1, 1, 1, head.length).setValues([head]); s.setFrozenRows(1);
  s.getRange(2, 2, Math.max(1, out.length), 1).setNumberFormat('@');
  if (out.length) s.getRange(2, 1, out.length, head.length).setValues(out);
  audit_('TRIAL_EXPORT', '', 'ส่งออกข้อมูลช่วงทดลอง ' + out.length + ' ออเดอร์');
  return { name: 'Trial_Log', count: out.length, url: ss.getUrl() + '#gid=' + s.getSheetId() };
}
function resetTrial(pin) { // เจ้าของกดรีเซ็ต: เลขรหัสกลับไปเริ่มที่ 1 · รหัสของออเดอร์เก่าถูกเก็บถาวร (ต่อท้ายด้วย X+รอบ) ไม่ให้ชนกับรหัสใหม่ · ล้างรายการรหัสที่ใช้ไปแล้ว
  authOwner_(pin);
  let ex = null; try { ex = exportTrial(pin); } catch (e) {} // สำรองข้อมูลช่วงทดลองลงชีต Trial_Log ก่อนรีเซ็ตทุกครั้ง
  return withLock_(() => {
    const p = PropertiesService.getScriptProperties(), round = (Number(p.getProperty('TRIAL_ROUND')) || 0) + 1, sh = sh_('Orders'); let n = 0;
    const col = sh.getRange(2, 16, Math.max(1, sh.getLastRow() - 1), 1);
    if (sh.getLastRow() >= 2) { const v = col.getValues().map(r => [r[0] !== '' && !/\dX\d+$/.test(String(r[0])) ? (n++, String(r[0]) + 'X' + round) : r[0]]); col.setNumberFormat('@'); col.setValues(v); }
    const su = sh_('Survey_Used'); if (su.getLastRow() >= 2) su.deleteRows(2, su.getLastRow() - 1);
    p.setProperty('TRIAL_SEQ', '0'); p.setProperty('TRIAL_ROUND', String(round));
    if (RC) { delete RC['Orders']; delete RC['Survey_Used']; Object.keys(RC).forEach(k => { if (k.indexOf('Orders#') === 0) delete RC[k]; }); }
    audit_('TRIAL_RESET', '', 'รีเซ็ตรหัสออเดอร์ช่วงทดลอง (รอบที่ ' + round + ') · เก็บถาวร ' + n + ' รหัสเดิม');
    return { archived: n, round: round, exported: ex ? ex.count : null };
  });
}
function surveyCfg_() {
  const S = set_(); let id = String(S.survey_sheet_id || '').trim(); const m = id.match(/\/d\/([\w-]+)/); if (m) id = m[1];
  return id ? { id: id, tab: String(S.survey_sheet_name || '').trim(), col: String(S.survey_col || '').trim() } : null;
}
function colNum_(s) { let n = 0; String(s).toUpperCase().split('').forEach(ch => n = n * 26 + ch.charCodeAt(0) - 64); return n; }
function surveyList_(force) { // อ่านรหัสจากชีตที่ผูกกับ Google Form → [[รหัสที่ normalize แล้ว, เวลาที่ส่ง(ms) หรือ 0]]
  const cfg = surveyCfg_(); if (!cfg) return null;
  const c = CacheService.getScriptCache();
  if (!force) { const hit = c.get('svy'); if (hit) return JSON.parse(hit); }
  const ss = SpreadsheetApp.openById(cfg.id), sh = cfg.tab ? ss.getSheetByName(cfg.tab) : ss.getSheets()[0];
  if (!sh) throw new Error('ไม่พบแท็บ "' + cfg.tab + '" ในชีตแบบสอบถาม');
  const lc = sh.getLastColumn(), lr = sh.getLastRow(); let ci = 0;
  if (!cfg.col) throw new Error('ยังไม่ได้ตั้งคอลัมน์ที่เก็บรหัส (เช่น C หรือชื่อหัวคอลัมน์)');
  if (/^[A-Za-z]{1,2}$/.test(cfg.col)) ci = colNum_(cfg.col);
  else { const h = sh.getRange(1, 1, 1, Math.max(1, lc)).getValues()[0].map(x => String(x).trim()); ci = h.indexOf(cfg.col) + 1; if (!ci) throw new Error('ไม่พบหัวคอลัมน์ "' + cfg.col + '" ในชีตแบบสอบถาม'); }
  if (ci < 1 || ci > Math.max(1, lc)) throw new Error('คอลัมน์ที่ตั้งไว้ไม่อยู่ในชีตแบบสอบถาม');
  const list = [];
  if (lr >= 2) { const a = sh.getRange(2, 1, lr - 1, 1).getValues(), b = sh.getRange(2, ci, lr - 1, 1).getValues(); b.forEach((r, i) => { const k = norm_(r[0]); if (k) list.push([k, a[i][0] instanceof Date ? a[i][0].getTime() : 0]); }); }
  try { c.put('svy', JSON.stringify(list), 60); } catch (e) {}
  return list;
}
function surveySeen_(code, since) { // พบรหัสในแบบสอบถาม (ส่งหลังสั่งออเดอร์) หรือไม่ — ถ้าไม่พบในแคชจะอ่านชีตสดอีกครั้ง
  const ok = list => list.some(r => r[0] === code && (!r[1] || !since || r[1] >= since - 60000));
  return ok(surveyList_(false)) || ok(surveyList_(true));
}
function surveyDisc_(code, base, orderId) {
  code = norm_(code); if (!code) return { discount: 0, code: '' };
  if (!surveyCfg_()) throw new Error('ร้านยังไม่ได้ตั้งค่าชีตแบบสอบถาม');
  if (code.length < 4) throw new Error('รหัสไม่ถูกต้อง');
  const pre = code.slice(0, 2), cp = rows_('Coupons').find(x => norm_(x.code) === pre && x.active !== false && isTrue_(x.survey));
  if (!cp) throw new Error('รหัสสองตัวแรก "' + pre + '" ไม่ตรงกับคูปองแบบสอบถามที่เปิดใช้');
  const ord = rows_('Orders').find(o => norm_(o.order_code) === code);
  if (!ord || ['QUEUED', 'COOKING', 'READY', 'DONE'].indexOf(ord.status) < 0) throw new Error('ไม่พบรหัสออเดอร์นี้ (หรือออเดอร์ยังไม่ได้ชำระ/ถูกยกเลิก)');
  if (orderId && ord.order_id == orderId) throw new Error('ใช้รหัสของออเดอร์เดียวกันเป็นส่วนลดไม่ได้');
  if (rows_('Survey_Used').some(u => norm_(u.code) === code)) throw new Error('รหัสนี้ถูกใช้รับส่วนลดไปแล้ว');
  if (!surveySeen_(code, ord.created_at instanceof Date ? ord.created_at.getTime() : 0)) throw new Error('ยังไม่พบรหัสนี้ในแบบสอบถาม (ลูกค้าต้องส่งแบบสอบถามก่อน)');
  const v = Number(cp.value) || 0, raw = cp.type === 'PERCENT' ? base * v / 100 : v;
  return { discount: Math.min(base, r2_(raw)), code: code, label: 'แบบสอบถาม ' + code, survey: true };
}
function discountOf_(o, base, orderId, claim) { // ส่วนลดตอนรับเงิน: คูปองปกติ หรือรหัสแบบสอบถาม (เลือกอย่างใดอย่างหนึ่ง)
  if (o.survey && o.coupon) throw new Error('ใช้ส่วนลดได้ทีละอย่าง (คูปอง หรือ รหัสแบบสอบถาม)');
  return pickCoupon_(o, base, claim); // ส่วนลดจากรหัสแบบสอบถามเลิกใช้แล้ว (แบบสอบถามให้ทำหลังรับสินค้า)
}
function joinActivity(o) { // ลูกค้าเข้าร่วมกิจกรรม: เลขคิว + อีเมล + ข้อความ (ต่อ 1 ออเดอร์ได้ 1 ครั้ง)
  o = o || {}; const S = set_();
  if (!String(S.activity_title || '').trim()) throw new Error('ขณะนี้ยังไม่เปิดกิจกรรม');
  const q = norm_(o.queue), em = String(o.email || '').trim(), msg = String(o.msg || '').trim();
  if (!q) throw new Error('กรุณากรอกเลขคิว');
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(em) || em.length > 100) throw new Error('อีเมลไม่ถูกต้อง');
  if (msg.length > 500) throw new Error('ข้อความยาวเกินไป (ไม่เกิน 500 ตัวอักษร)');
  const c = CacheService.getScriptCache(), dev = String(o.dev || '').slice(0, 40);
  return withLock_(() => {
    const now = Date.now(), ord = rows_('Orders').filter(x => norm_(x.queue_no) === q && ['QUEUED', 'COOKING', 'READY', 'DONE'].indexOf(x.status) >= 0 && x.created_at instanceof Date && now - x.created_at.getTime() < 36 * 3600000)
      .sort((a, b) => b.created_at - a.created_at)[0];
    if (!ord) throw new Error('ไม่พบเลขคิวนี้ (ต้องเป็นออเดอร์ที่ชำระแล้วในช่วง 36 ชั่วโมงที่ผ่านมา) กรุณาตรวจสอบเลขคิวอีกครั้ง');
    if (rows_('Activity').some(x => String(x.order_id) === String(ord.order_id))) throw new Error('เลขคิวนี้เข้าร่วมกิจกรรมแล้ว');
    sh_('Activity').appendRow([new Date(), String(ord.queue_no), cleanTxt_(em, 100), cleanTxt_(msg, 500), String(ord.order_id), dev]);
    return true;
  });
}
function getActivity(pin) {
  authOwner_(pin);
  const rs = rows_('Activity').filter(r => r.email); const n = rs.length;
  return { title: String(set_().activity_title || ''), count: n, rows: rs.slice(-300).reverse().map(r => ({ time: fmt_(r.time, 'dd/MM HH:mm'), queue_no: String(r.queue_no), email: String(r.email), msg: String(r.message || '') })) };
}
function checkSurvey(pin, code, total) { auth_(pin); const r = surveyDisc_(code, Number(total) || 0, ''); return { discount: r.discount, label: r.label }; }
function testSurvey(pin) { authOwner_(pin); const l = surveyList_(true); return { count: l.length, sample: l.slice(-3).map(r => r[0]) }; }
function authorizeSurvey() { SpreadsheetApp.openById(ss_().getId()); return 'ok'; } // รันครั้งเดียวจากตัวแก้ไข เพื่อให้สิทธิ์อ่านชีตอื่น แล้ว Deploy เป็น New version
function getDisplay() {
  const c = CacheService.getScriptCache(), hit = c.get('disp'); if (hit) return JSON.parse(hit);
  const prev = RC; RC = {};
  try {
    if (autoNow_()) RC = {};
    const S = set_(), now = Date.now();
    const os = rowsTail_('Orders', TAIL.act).filter(o => o.created_at instanceof Date && now - o.created_at.getTime() < 14 * 3600000);
    const ts = o => (o.ready_at instanceof Date ? o.ready_at : o.created_at).getTime();
    const out = {
      shop: S.shop_name, msg: String(S.display_msg || ''), ts: now,
      ready: os.filter(o => o.status === 'READY' && o.fulfil !== 'DELIVER').sort((a, b) => ts(b) - ts(a)).map(o => ({ q: String(o.queue_no), t: ts(o) })),
      cooking: os.filter(o => (o.status === 'QUEUED' || o.status === 'COOKING') && o.fulfil !== 'DELIVER').sort((a, b) => a.created_at - b.created_at).map(o => String(o.queue_no))
    };
    try { c.put('disp', JSON.stringify(out), 3); } catch (e) {}
    return out;
  } finally { RC = prev; }
}
function getOptions(pin) {
  authOwner_(pin);
  return {
    options: rows_('Options').filter(o => o.opt_id).map(o => ({ opt_id: o.opt_id, name: String(o.name), price: Number(o.price) || 0, menu_ids: String(o.menu_ids || ''), ing_id: String(o.ing_id || ''), ing_qty: Number(o.ing_qty) || 0, active: o.active !== false })),
    menus: rows_('Menu').map(m => ({ menu_id: m.menu_id, name: String(m.name), type: m.type === 'SET' ? 'SET' : '' })),
    ingredients: rows_('Ingredients').map(i => ({ ing_id: i.ing_id, name: String(i.name), unit: String(i.unit) }))
  };
}
function saveOption(pin, o) {
  authOwner_(pin);
  return withLock_(() => {
    const name = cleanTxt_(o.name, 40), price = Number(o.price), ingId = String(o.ing_id || ''), iq = r4_(o.ing_qty) || 0;
    const mids = (Array.isArray(o.menu_ids) ? o.menu_ids : String(o.menu_ids || '').split(',')).map(s => String(s).trim()).filter(s => s && s !== '*');
    if (!name) throw new Error('กรอกชื่อตัวเลือก'); if (!(price >= 0)) throw new Error('ราคาที่เพิ่มต้องไม่ติดลบ');
    const menus = rows_('Menu'), ing = rows_('Ingredients');
    mids.forEach(s => { if (!menus.some(m => m.menu_id == s)) throw new Error('ไม่พบเมนู ' + s); });
    if (ingId && !ing.some(i => i.ing_id == ingId)) throw new Error('ไม่พบวัตถุดิบ');
    if (ingId && !(iq > 0)) throw new Error('ใส่ปริมาณวัตถุดิบที่ใช้ต่อ 1 หน่วย');
    const all = rows_('Options'), r = o.opt_id ? all.find(x => x.opt_id == o.opt_id) : null; if (o.opt_id && !r) throw new Error('ไม่พบตัวเลือก');
    const id = r ? r.opt_id : 'O' + pad2_(all.reduce((a, x) => Math.max(a, parseInt(String(x.opt_id).slice(1)) || 0), 0) + 1);
    const s = sh_('Options'), row = r ? r._row : s.getLastRow() + 1;
    s.getRange(row, 2).setNumberFormat('@'); s.getRange(row, 4).setNumberFormat('@');
    s.getRange(row, 1, 1, 7).setValues([[id, name, price, mids.join(','), ingId, ingId ? iq : '', o.active !== false]]);
    if (RC) delete RC['Options']; bust_();
    audit_('OPTION_SAVE', name, (r ? 'แก้ไข' : 'เพิ่ม') + ' · +' + price + ' บาท' + (o.active === false ? ' · ปิดใช้' : ''), price);
    return id;
  });
}
function getPromos(pin) {
  authOwner_(pin);
  return {
    promos: rows_('Promos').filter(p => p.promo_id).map(p => Object.assign(normPromo_(p), { active: p.active !== false, menu_ids: String(p.menu_ids || ''), days: String(p.days || '') })),
    menus: rows_('Menu').map(m => ({ menu_id: m.menu_id, name: String(m.name), type: m.type === 'SET' ? 'SET' : '' }))
  };
}
function savePromo(pin, p) {
  authOwner_(pin);
  return withLock_(() => {
    const name = cleanTxt_(p.name, 50), type = ['BXGY', 'PERCENT', 'PRICE', 'AMOUNT'].indexOf(p.type) >= 0 ? p.type : '';
    if (!name) throw new Error('กรอกชื่อโปรโมชั่น'); if (!type) throw new Error('เลือกประเภทโปรโมชั่น');
    const menus = rows_('Menu'), mids = (Array.isArray(p.menu_ids) ? p.menu_ids : String(p.menu_ids || '').split(',')).map(s => String(s).trim()).filter(s => s && s !== '*');
    mids.forEach(s => { if (!menus.some(m => m.menu_id == s)) throw new Error('ไม่พบเมนู ' + s); });
    const x = Math.floor(Number(p.x)) || 0, y = Math.floor(Number(p.y)) || 0, v = Number(p.value) || 0;
    if (type === 'BXGY' && !(x >= 1 && y >= 1)) throw new Error('ซื้อกี่ชิ้น แถมกี่ชิ้น ต้องมากกว่า 0');
    if (type === 'PERCENT' && !(v > 0 && v <= 100)) throw new Error('เปอร์เซ็นต์ต้องอยู่ระหว่าง 1-100');
    if (type === 'AMOUNT' && !(v > 0)) throw new Error('จำนวนเงินที่ลดต้องมากกว่า 0');
    if (type === 'PRICE' && !(Number(p.value) >= 0 && String(p.value).trim() !== '')) throw new Error('กรอกราคาพิเศษ');
    if (type === 'PRICE' && !mids.length) throw new Error('ราคาพิเศษต้องเลือกเมนูที่ใช้');
    const st = hm_(p.start), en = hm_(p.end);
    if ((st && !en) || (!st && en)) throw new Error('ใส่เวลาเริ่มและเวลาสิ้นสุดให้ครบทั้งสองช่อง'); if (st && st === en) throw new Error('เวลาเริ่มและสิ้นสุดต้องไม่เท่ากัน');
    const days = (Array.isArray(p.days) ? p.days : String(p.days || '').split(',')).map(s => String(s).trim()).filter(s => /^[0-6]$/.test(s)).join(',');
    const df = String(p.date_from || '').trim(), dt = String(p.date_to || '').trim();
    if ((df && !/^\d{4}-\d{2}-\d{2}$/.test(df)) || (dt && !/^\d{4}-\d{2}-\d{2}$/.test(dt))) throw new Error('วันที่ไม่ถูกต้อง'); if (df && dt && df > dt) throw new Error('วันเริ่มต้องไม่เกินวันสิ้นสุด');
    const all = rows_('Promos'), r = p.promo_id ? all.find(z => z.promo_id == p.promo_id) : null; if (p.promo_id && !r) throw new Error('ไม่พบโปรโมชั่น');
    const id = r ? r.promo_id : 'P' + pad2_(all.reduce((a, z) => Math.max(a, parseInt(String(z.promo_id).slice(1)) || 0), 0) + 1);
    const s = sh_('Promos'), row = r ? r._row : s.getLastRow() + 1;
    s.getRange(row, 2).setNumberFormat('@'); s.getRange(row, 4).setNumberFormat('@'); s.getRange(row, 8, 1, 5).setNumberFormat('@');
    s.getRange(row, 1, 1, 13).setValues([[id, name, type, mids.join(','), type === 'BXGY' ? x : '', type === 'BXGY' ? y : '', type === 'BXGY' ? '' : v, st, en, days, df, dt, p.active !== false]]);
    if (RC) delete RC['Promos']; bust_();
    audit_('PROMO_SAVE', name, (r ? 'แก้ไข' : 'เพิ่ม') + ' · ' + type + (p.active === false ? ' · ปิดใช้' : ''));
    return id;
  });
}
function autoStep_(S) { return Math.min(120, Math.max(2, Number(S.trial_step_sec) || 8)); }
function autoTarget_(created, S) {
  const e = (Date.now() - created.getTime()) / 1000, s = autoStep_(S);
  return e < s ? 'PENDING_PAY' : e < 2 * s ? 'QUEUED' : e < 3 * s ? 'COOKING' : e < 5 * s ? 'READY' : 'DONE';
}
function testPaid_(o, method) { // โหมดทดสอบ: จำลองรับเงิน 1 ออเดอร์ (เรียกภายใน lock) · หักส่วนลด/คูปองเหมือนตอนรับเงินจริง แต่ไม่บันทึกลงยอดขาย
  const sh = sh_('Orders'), id = o.order_id, fee = feeOf_(o), gross = grossOf_(id), promo = Math.min(gross, Number(o.promo_disc) || 0), base = r4_(gross - promo);
  const cp = pickCoupon_({}, base, String(o.coupon || '')), netI = Math.ceil(r4_(gross - promo - cp.discount) - 1e-9), net = netI + fee, disc = r4_(gross - netI);
  sh.getRange(o._row, 8).setValue(net); sh.getRange(o._row, 11).setValue(''); sh.getRange(o._row, 12).setValue(disc); sh.getRange(o._row, 13).setValue(cp.code || String(o.coupon || ''));
  sh.getRange(o._row, 20).setValue(new Date()); sh.getRange(o._row, ocol_('pay_method')).setValue(method);
  o.paid_at = new Date(); o.total = net; o.discount = disc;
  return { paid: { total: net, disc: disc, label: labelOf_(o.promo_note, cp) }, inf: { f: String(o.fulfil || ''), later: false, total: net, fee: fee, zone: String(o.zone || ''), pay: net } };
}
function advanceTest_(o, tg) { // เลื่อนออเดอร์ทดสอบ 1 ออเดอร์ไปสถานะ tg (เรียกภายใน lock)
  const sh = sh_('Orders');
  sh.getRange(o._row, 7).setValue(tg);
  let pd = null, pinf = null;
  if ((o.status === 'PENDING_PAY' && !(o.paid_at instanceof Date)) || (tg === 'DONE' && unpaidLater_(o))) { // ยังไม่จ่าย: จำลองรับเงิน (มีสลิป=โอน ไม่มี=เงินสด) ทั้งจ่ายก่อนทำและจ่ายตอนรับ
    const r = testPaid_(o, o.slip_id ? 'TRANSFER' : 'CASH'); pd = r.paid; pinf = r.inf;
  }
  if (tg === 'READY') sh.getRange(o._row, 15).setValue(new Date());
  if (tg === 'DONE') restore_(o.order_id, 'ออเดอร์ทดสอบ (คืนสต็อก)');
  o.status = tg; putStatus_(o.order_id, o.queue_no, tg, null, o.created_at.getTime(), pd, pinf);
}
function trialNext(id) { // ลูกค้ากดปุ่ม "ขั้นต่อไป" ในโหมดทดสอบ
  id = String(id || ''); if (!/^[0-9a-f]{8}$/i.test(id)) throw new Error('ไม่พบออเดอร์');
  return withLock_(() => {
    const o = orderOf_(id); if (!o || !isTrue_(o.is_test) || ACTIVE.indexOf(o.status) < 0) throw new Error('ใช้ได้เฉพาะออเดอร์ทดสอบที่ยังไม่จบ');
    const tg = AUTO_ST[AUTO_ST.indexOf(o.status) + 1]; if (!tg) return o.status;
    advanceTest_(o, tg); try { CacheService.getScriptCache().remove('disp'); } catch (e) {} RC = {}; return tg;
  });
}
function autoAdvanceAll_() { // เรียกภายใน lock เท่านั้น
  const S = set_(); let n = 0;
  rowsTail_('Orders', TAIL.act).filter(o => isTrue_(o.is_test) && ACTIVE.indexOf(o.status) >= 0 && o.created_at instanceof Date).forEach(o => {
    const tg = autoTarget_(o.created_at, S);
    if (AUTO_ST.indexOf(tg) <= AUTO_ST.indexOf(o.status)) return;
    advanceTest_(o, tg); n++;
  });
  if (n) { try { CacheService.getScriptCache().remove('disp'); } catch (e) {} if (RC) Object.keys(RC).forEach(k => { if (k.indexOf('Orders') === 0) delete RC[k]; }); }
  return n;
}
function autoManual_(S) { return Number(S.trial_manual) !== 0; } // ค่าเริ่มต้น: ลูกค้าทดลองกดปุ่ม "ขั้นต่อไป" เอง (ไม่เลื่อนอัตโนมัติตามเวลา)
function autoNow_() {
  if (autoManual_(set_())) return 0; // ล็อกเฉพาะเมื่อมีออเดอร์ทดสอบที่ถึงเวลาเลื่อนขั้นจริง
  const S = set_();
  const need = rowsTail_('Orders', TAIL.act).some(o => isTrue_(o.is_test) && ACTIVE.indexOf(o.status) >= 0 && o.created_at instanceof Date && AUTO_ST.indexOf(autoTarget_(o.created_at, S)) > AUTO_ST.indexOf(o.status));
  return need ? withLock_(() => autoAdvanceAll_()) : 0;
}