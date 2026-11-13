
(function(){window.__ok=1;
let PAGE='customer',INIT=window.__INIT||null;_st='JS ทำงานแล้ว';
const $=s=>document.querySelector(s);
let _pend=0;
const run=(fn,...a)=>new Promise((ok0,no0)=>{_pend++;let _d=0;const ok=v=>{if(!_d){_d=1;_pend--;}ok0(v)},no=e=>{if(!_d){_d=1;_pend--;}no0(e)};_st='รอเซิร์ฟเวอร์: '+fn;const t0=Date.now(),t=setTimeout(()=>no(new Error('เซิร์ฟเวอร์ไม่ตอบสนอง — ตรวจสอบว่า Deploy เป็น New version แล้ว')),60000);google.script.run.withSuccessHandler(v=>{clearTimeout(t);dbg(fn,t0);_st='ได้ข้อมูลจาก '+fn;ok(v)}).withFailureHandler(e=>{clearTimeout(t);dbg(fn+' (ผิดพลาด)',t0);if(e&&e.message&&String(e.message).indexOf('หมดเวลาเข้าระบบ')>=0&&PAGE=='staff')sesLost();no(e)})[fn](...a)});
function dbg(fn,t0){if(!window.__DBG)return;window.__DBG.push(fn+' '+(Date.now()-t0)+' ms');let e=$('#dbg');if(!e){e=document.createElement('div');e.id='dbg';e.style.cssText='position:fixed;left:4px;bottom:64px;background:rgba(0,0,0,.78);color:#fff;font:11px monospace;padding:4px 6px;border-radius:6px;z-index:60;max-width:75%;pointer-events:none';document.body.appendChild(e);}e.innerHTML=window.__DBG.slice(-8).join('<br>');}
const money=n=>Number(n).toLocaleString('th-TH');
const gid=u=>{const m=String(u).match(/[?&]id=([\w-]+)/);return m?m[1]:'';};
const sm=(u,w)=>{u=String(u);const id=/drive\.google\.com\/thumbnail/.test(u)?gid(u):'';return id?'https://lh3.googleusercontent.com/d/'+id+'=w'+(w||200):u.replace('sz=w640','sz=w'+(w||200));};
window._idc=window._idc||{};
function imgTag(u,key,cls,w){ // รูปจาก Drive: ลองลิงก์ตรงก่อน → ลิงก์เดิม → ให้เซิร์ฟเวอร์ส่งเป็นข้อมูลรูป (กันกรณี Safari บล็อก)
  const c=window._idc[key];const src=c||sm(u,w);
  return `<img class="${cls}" src="${src}" data-k="${esc(key)}" data-o="${esc(String(u).replace('sz=w640','sz='+('w'+(w||200))))}" referrerpolicy="no-referrer" onerror="imgErr(this)" alt="">`;
}
function imgErr(el){
  const st=+el.dataset.f||0;el.dataset.f=st+1;
  if(st==0&&el.dataset.o&&el.dataset.o!=el.getAttribute('src')){el.src=el.dataset.o;return;}
  if(st<=1&&el.dataset.k){const k=el.dataset.k;run('getImgData',k).then(u=>{if(u){window._idc[k]=u;el.src=u;}}).catch(()=>{});}
}
const ST={PENDING_PAY:'รอชำระ',QUEUED:'รอทำ',COOKING:'กำลังทำ',READY:'พร้อมรับ'};
let lines=[],LID=0,menu=[],pin='',role='',tab='orders',timer,G={note:'',options:[],promos:[]};
const pcs=o=>o.items.reduce((a,i)=>a+i.qty,0);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const uiBox=(m,btns)=>new Promise(res=>{const old=document.getElementById('ua');if(old)old.remove();const d=document.createElement('div');d.id='ua';d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  d.innerHTML='<div style="background:var(--bg,#fff);color:var(--fg,#111);border-radius:16px;padding:20px;max-width:360px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.3);text-align:center"><div style="font-size:17px;line-height:1.5;white-space:pre-wrap;word-break:break-word">'+esc(m)+'</div><div style="display:flex;gap:10px;margin-top:16px;justify-content:center">'+btns.map((b,i)=>'<button class="'+(b.pri?'pri':'')+'" style="flex:1;font-size:16px;padding:10px" onclick="uaOk('+i+')">'+esc(b.t)+'</button>').join('')+'</div></div>';
  document.body.appendChild(d);window._ua=v=>{d.remove();window._ua=null;res(v);};});
function uaOk(i){if(window._ua)window._ua(i==0);}
window.alert=m=>{uiBox(String(m),[{t:'ตกลง',pri:1}]);};
const ask=m=>uiBox(String(m),[{t:'ตกลง',pri:1},{t:'ยกเลิก'}]).then(v=>v);
(function(){if(document.getElementById('cssx'))return;const s=document.createElement('style');s.id='cssx';s.textContent='button:not(.pri){border-color:#9aa3b2}@media (prefers-color-scheme:dark){button:not(.pri):not(:disabled){background:#2f3542;color:#f3f4f6;border:1px solid #8b95a7}button.pri{background:var(--pri);color:#fff;border-color:var(--pri)}.note{border-color:#8b95a7}}';document.head.appendChild(s);})();
const err=e=>alert(e&&e.message?e.message:e);
const showErr=e=>{$('#app').innerHTML='<div class="done"><p>เกิดข้อผิดพลาด:<br>'+esc(e&&e.message?e.message:e)+'</p></div>'};

/* ---- shared menu/cart ---- */
function chg(id,d){
  const m=menu.find(x=>x.menu_id==id);if(!m)return;
  if(d>0){
    if(cnt(id)>=m.avail)return;
    if(needDlg(m))return addDlg(id);
    const l=lines.find(x=>x.menu_id==id&&!x.opts.length&&!x.note);if(l)l.qty++;else lines.push({id:++LID,menu_id:id,qty:1,opts:[],note:''});
  }else{for(let i=lines.length-1;i>=0;i--)if(lines[i].menu_id==id){lines[i].qty--;if(lines[i].qty<1)lines.splice(i,1);break;}}
  drawMenu();
}
const mtHtml=m=>`<b>${esc(m.name)}</b>${m.type=='SET'?' <span class="tag">เซ็ต</span>':''}<div class="mut">${money(m.price)} บาท/${esc(m.unit||'ชิ้น')}${m.avail>0?(m.avail<=5?' · <span class="low">เหลือ '+m.avail+'</span>':(PAGE=='customer'||m.avail>=9999?'':' · เหลือ '+m.avail)):''}</div>${m.contents?`<div class="mut">${esc(m.contents)}</div>`:''}${promoTag(m)}`;
const ctlHtml=m=>m.avail<1?'<span class="sold">หมด</span>':`<div class="st"><button onclick="chg('${m.menu_id}',-1)">−</button><b>${cnt(m.menu_id)}</b><button onclick="chg('${m.menu_id}',1)">+</button></div>`;
const CSS_M='#menu.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;padding:4px 16px 12px}.mc{background:var(--card);border:1px solid var(--bd);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}.mimgw{position:relative;aspect-ratio:1/1;background:var(--bd);cursor:pointer;overflow:hidden}.mimg{width:100%;height:100%;object-fit:cover;display:block}.mph{display:flex;align-items:center;justify-content:center;height:100%;font-size:46px;opacity:.45}.mc .mt{padding:8px 10px 0;flex:1}.mc .mt b{font-size:17px;line-height:1.25}.mc .ctl{padding:8px 10px 10px;display:flex;justify-content:center}.mc .st{justify-content:space-between;width:100%}.mc .st button{min-width:52px}.mc.sd .mimg{filter:grayscale(1);opacity:.5}.mc.sd .mimgw{cursor:default}.mq{position:absolute;top:8px;right:8px;background:var(--pri);color:#fff;min-width:40px;height:40px;padding:0 10px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;box-shadow:0 2px 6px rgba(0,0,0,.4);border:2px solid #fff}.mc .st b{font-size:30px;min-width:34px;text-align:center}.mc.on{border:2px solid var(--pri)}.mc.on .st b{color:var(--pri)}.mq:empty{display:none}';
function mcInject(){if(document.getElementById('css_m'))return;const s=document.createElement('style');s.id='css_m';s.textContent=CSS_M;document.head.appendChild(s);}
const mqHtml=m=>cnt(m.menu_id)>0?String(cnt(m.menu_id)):'';
const mcHtml=m=>`<div class="mc${m.avail<1?' sd':''}${cnt(m.menu_id)>0?' on':''}"><div class="mimgw" onclick="chg('${m.menu_id}',1)">${m.img?imgTag(m.img,'menu:'+m.menu_id,'mimg',600):'<div class="mph">🍽️</div>'}<div class="mq">${mqHtml(m)}</div></div><div class="mt">${mtHtml(m)}</div><div class="ctl">${ctlHtml(m)}</div></div>`;
function drawMenu(){
  const box=$('#menu');if(!box)return;
  if(PAGE=='customer'){mcInject();box.classList.add('mgrid');}
  const sig=menu.map(m=>m.menu_id+'|'+(m.img||'')).join(',');
  if(box.dataset.sig===sig&&box.children.length==menu.length){ // โครงเดิม: อัปเดตเฉพาะข้อความ/ปุ่ม ไม่แตะรูป → รูปไม่กระพริบ
    menu.forEach((m,k)=>{const r=box.children[k],t=r.querySelector('.mt'),c=r.querySelector('.ctl'),a=mtHtml(m),b=ctlHtml(m);if(t.innerHTML!==a)t.innerHTML=a;if(c.innerHTML!==b)c.innerHTML=b;const q=r.querySelector('.mq');if(q){const v=mqHtml(m);if(q.textContent!==v)q.textContent=v;r.classList.toggle('sd',m.avail<1);r.classList.toggle('on',cnt(m.menu_id)>0);}});
  }else{
    box.dataset.sig=sig;
    box.innerHTML=PAGE=='customer'?menu.map(mcHtml).join(''):menu.map(m=>`<div class="row"><div style="display:flex;gap:10px;align-items:center">${m.img?imgTag(m.img,'menu:'+m.menu_id,'thumb',200):''}<div class="mt">${mtHtml(m)}</div></div><div class="ctl">${ctlHtml(m)}</div></div>`).join('');
  }
  const t=calcCart();
  $('#sum').innerHTML=t.n?`${t.n} รายการ · <b>${money(t.net)} บาท</b>${t.promo?` <span class="mut">(โปรลด ${money(t.promo)})</span>`:''}`:'ยังไม่ได้เลือก';$('#go').disabled=!t.n;
}

/* ---- customer ---- */
function lazy(){
  const ap=im=>{menu.forEach(m=>m.img=im.menu[m.menu_id]||'');window._logo=im.logo||'';window._qr=im.qr||'';window._pp=im.pp||0;setLogo(window._logo);if($('#menu')&&$('#sum'))drawMenu();};
  if(window._imgs)ap(window._imgs);
  else if(window.__IMG){window._imgs=window.__IMG;window.__IMG=null;ap(window._imgs);}
  else run('getImages').then(im=>{window._imgs=im;ap(im);}).catch(()=>{});
  if(PAGE=='customer'){const show=q=>{const e=$('#qm');if(e)e.textContent='คิวตอนนี้รอประมาณ '+q.queueMin+' นาที';};if(window.__Q){show(window.__Q);window.__Q=null;}else run('getQueue').then(q=>{show(q);if(q.expired&&!$('#trk'))customer();}).catch(()=>{});}
}
async function customer(keep){
  stopTrack();if(!keep)lines=[];const d=INIT||await run('getMenu');INIT=null;menu=d.menus;G={note:d.note,options:d.options||[],promos:d.promos||[],coupons:d.coupons||[],act:d.activity||'',svc:d.svc||{}};if(keep)clampLines();
  $('#app').innerHTML=`<header><div id="lg"></div><h1>${esc(d.shop)}</h1><div class="mut" id="qm">กำลังเช็คคิว...</div>${d.note?`<div class="note">${esc(d.note)}</div>`:''}</header><div id="menu"></div><footer><span id="sum"></span><button id="go" class="pri" onclick="cartDlg()">ยืนยันสั่ง</button></footer>`;drawMenu();lazy();
}
/* ---- ติดตามสถานะออเดอร์ของลูกค้า + แจ้งเมื่อพร้อมรับ ---- */
let tk=null,onVis=null;
function unlockAudio(){try{const C=window.AudioContext||window.webkitAudioContext;if(!window._ac&&C)window._ac=new C();if(window._ac&&window._ac.state=='suspended')window._ac.resume();}catch(e){}}
function beep(){try{const a=window._ac;if(!a)return;[0,.3,.6].forEach(t=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(a.destination);o.start(a.currentTime+t);o.stop(a.currentTime+t+.2);});}catch(e){}}
function buzz(){try{if(navigator.vibrate)navigator.vibrate([400,150,400,150,800]);}catch(e){}}
const SAVED='psm_order';
function saveOrd(o){try{localStorage.setItem(SAVED,JSON.stringify(o));}catch(e){}}
function loadOrd(){try{const o=JSON.parse(localStorage.getItem(SAVED)||'null');return o&&Date.now()-o.t<4*3600*1000?o:null;}catch(e){return null;}}
function clearOrd(){try{localStorage.removeItem(SAVED);}catch(e){}}
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
function stopTrack(){clearTimeout(window._fabT);const _f=document.getElementById('tfab');if(_f)_f.remove();clearInterval(tk);tk=null;if(onVis){document.removeEventListener('visibilitychange',onVis);onVis=null;}}
function track(o){
  stopTrack();let last='',alerted=false;
  const autoB=r=>o.auto?'<div class="note" style="text-align:left;margin-bottom:10px">🧪 โหมดทดสอบ · ไม่ต้องจ่ายเงินจริง · '+(r.paid?'':'แนบสลิปเป็นรูปอะไรก็ได้ ระบบถือว่าจ่ายแล้ว · ')+(r.man?'กดปุ่มสีเขียวตามขั้นตอน':'หน้าจอเลื่อนอัตโนมัติ')+'</div>':'';
  const cb=r=>{const u=/^https?:/.test(r.survey||'')?r.survey:'';return r.status=='DONE'&&u?`<div class="note" style="text-align:left;margin-top:14px;border:2px solid var(--pri)"><b>${esc(r.msg||'ช่วยตอบแบบสอบถามสั้นๆ ให้เรา ขอบคุณค่ะ')}</b><div style="margin-top:8px"><a href="${esc(u)}" target="_blank" rel="noopener"><button class="pri" style="width:100%">ทำแบบสอบถาม</button></a></div></div>`:'';};
  const ab=r=>r.status=='DONE'&&r.activity?`<div class="note" style="text-align:left;margin-top:14px;border:2px solid var(--pri)"><b>🎁 ${esc(r.activity)}</b>${r.actMsg?`<div class="mut">${esc(r.actMsg)}</div>`:''}<div style="margin-top:8px"><button class="pri" style="width:100%" onclick="actDlg('${esc(o.queue_no)}')">เข้าร่วมกิจกรรม</button></div></div>`:'';
  const amtOf=r=>r.pay||o.payAmt||r.total||o.total;
  const qrBox=r=>r.status=='DONE'||r.status=='CANCELLED'||r.paid?'':`<div id="qrb" style="display:${window._qr||window._pp||o.auto?'block':'none'};margin:10px 0"><div class="note" style="text-align:left;border:2px solid var(--pri)"><b>💳 จ่ายด้วย QR (โอนผ่านแอพธนาคาร)</b>${o.auto&&!window._qr&&!window._pp?'<span class="mut"> · ตัวอย่างโหมดทดสอบ</span>':''}${payRows(r.total||o.total,amtOf(r),r.fee||o.fee)}<div class="mut">โอนแล้วแนบสลิปให้ร้านตรวจสอบ</div>${r.slip?'<div style="color:#16a34a;margin:6px 0"><b>✓ ส่งสลิปแล้ว</b> รอร้านตรวจสอบ</div>':r.rej?'<div style="color:#dc2626;margin:6px 0"><b>⚠ ร้านแจ้งว่าสลิปไม่ถูกต้อง</b>'+(r.rej!='สลิปไม่ถูกต้อง'?': '+esc(r.rej):'')+'<br>กรุณาตรวจยอดแล้วแนบสลิปใหม่</div>':''}<button class="pri" style="width:100%;margin-top:6px" onclick="qrDlg('${o.id}',${amtOf(r)},${o.auto?1:0},${(r.status=='PENDING_PAY'||(r.later&&!r.paid))?1:0},${r.total||o.total||0},${r.fee||o.fee||0})">${r.slip?'ดู QR / ส่งสลิปใหม่':r.rej?'แนบสลิปใหม่':(r.status=='PENDING_PAY'||(r.later&&!r.paid))?'จ่ายด้วย QR / แนบสลิป':'ดูหน้าจ่าย QR'}</button></div></div>`;
  const laterBox=r=>{const a=amtOf(r),t=r.total||o.total,fee=r.fee||o.fee;return `<div class="note" style="text-align:left;margin:12px 0;border:2px solid #f59e0b"><b>💵 ยอดที่ต้องจ่าย</b><div style="font-size:34px;font-weight:800">${money(a)} บาท</div>${t>a?`<div class="mut">ราคา ${money(t)} − ส่วนลด ${money(t-a)} (หักให้แล้ว)${fee?' · รวมค่าส่ง '+money(fee):''}</div>`:(fee?`<div class="mut">รวมค่าส่ง ${money(fee)} บาท</div>`:'')}<div style="margin-top:4px">${r.fulfil=='DELIVER'?'จ่ายตอนรับของ':'จ่ายที่ร้านตอนรับของ'}${window._qr||window._pp?' หรือโอนล่วงหน้าด้วย QR ก็ได้':''}</div></div>${qrBox(r)}`;};
  const pd=r=>{const p=r.paid;if(!p)return '';const g=Math.round((p.total+p.disc)*100)/100;return `<div class="note" style="text-align:left;margin:12px 0"><div class="row" style="border:0;padding:2px 0"><span>ยอดรวม</span><span>${money(g)} บาท</span></div>${p.disc>0?`<div class="row" style="border:0;padding:2px 0;color:#16a34a"><span>ส่วนลด${p.label?' ('+esc(p.label)+')':''}</span><b>− ${money(p.disc)} บาท</b></div>`:''}<div class="row" style="border:0;padding:2px 0"><b>ชำระจริง</b><b class="q2" style="font-size:28px">${money(p.total)} บาท</b></div></div>`;};
  const fab=r=>{clearTimeout(window._fabT);const old=document.getElementById('tfab');if(old)old.remove();
    if(!(o.auto&&r.man&&r.status!='DONE'&&r.status!='CANCELLED'))return;
    const L={PENDING_PAY:'ลองจ่ายเงิน',QUEUED:'ให้ร้านเริ่มทำอาหาร',COOKING:'อาหารเสร็จ พร้อมรับ',READY:'รับสินค้า'}[r.status]||'ขั้นต่อไป';
    window._fabT=setTimeout(()=>{if(document.getElementById('tfab')||!document.getElementById('trk'))return;const b=document.createElement('button');b.id='tfab';b.style.cssText='position:fixed;right:16px;bottom:20px;z-index:9000;padding:14px 22px;border-radius:999px;font-size:18px;font-weight:700;background:#16a34a;color:#fff;border:2px solid #fff;box-shadow:0 6px 20px rgba(0,0,0,.4)';b.textContent='👉 กดเพื่อ'+L;
      b.onclick=async()=>{b.disabled=true;b.textContent='กำลังไป…';try{await run('trialNext',o.id);}catch(e){}b.remove();last='';poll();};document.body.appendChild(b);},2500);};
  const draw=r=>{
    const s=r.status,key=s+(r.later?'L':'')+(r.paid?'P':'')+(r.slip?'S':'')+(r.rej?'R':'');if(key===last)return;last=key;fab(r);
    const again='<p><button onclick="newOrd()">สั่งเพิ่ม</button></p>';
    let h;
    if(s=='PENDING_PAY')h=`<div class="mut">เลขคิวของคุณ</div><div class="q">${o.queue_no}</div><p>${o.pieces} รายการ${o.claim?` · 🎟 ใช้คูปอง <b>${esc(o.claim.code)}</b>`:''}</p>${payRows(r.total||o.total,amtOf(r),r.fee||o.fee)}${r.slip?'<p><b>✓ ส่งสลิปแล้ว</b><br>รอร้านตรวจสอบและยืนยัน</p>':`<p><b>รอชำระเงิน</b>${r.fulfil=='DELIVER'?'':' ที่เคาน์เตอร์'}<br><b>ภายใน ${hhmm(r.payBy||o.payBy)} น.</b> <span id="cd" class="mut"></span></p>`}${qrBox(r)}<p class="mut">ออเดอร์จะเริ่มทำเมื่อชำระเงินแล้ว ยิ่งชำระเร็วยิ่งได้รับเร็ว${o.waitMin>0?`<br>ตอนนี้คิวรอประมาณ ${o.waitMin} นาที จึงเผื่อเวลาชำระให้เพิ่ม`:''}${r.slip?'':'<br>เกินเวลานี้ระบบจะยกเลิกออเดอร์อัตโนมัติ'}</p>`;
    else if(s=='QUEUED'||s=='COOKING')h=`<div class="mut">เลขคิวของคุณ</div><div class="q">${o.queue_no}</div><p><b>${r.later?'ร้านรับออเดอร์แล้ว กำลังเตรียม':'ชำระเงินแล้ว กำลังเตรียมออเดอร์'}</b><br>${r.fulfil=='DELIVER'?'ร้านจะนำไปส่งที่ '+esc(r.zone||'')+' — ร้านอาจโทรหาตามเบอร์ที่ให้ไว้':'รอรับประมาณ '+o.eta+' นาที'}</p>${r.later?laterBox(r):pd(r)}`;
    else if(s=='READY'){h=`<div style="background:#16a34a;color:#fff;border-radius:16px;padding:24px 12px"><div style="font-size:26px;font-weight:700">พร้อมรับแล้ว!</div><div style="font-size:112px;font-weight:800;line-height:1.1">${o.queue_no}</div><div>${r.fulfil=='DELIVER'?'ร้านกำลังนำไปส่ง':'เชิญรับสินค้าที่เคาน์เตอร์'}</div></div>${r.later?laterBox(r):pd(r)}`;if(!alerted){alerted=true;beep();buzz();}}
    else if(s=='DONE'){h=`<div class="mut">คิวของคุณ</div><div style="font-size:72px;font-weight:800;line-height:1.1;color:var(--pri)">${o.queue_no}</div><p><b>รับสินค้าแล้ว ขอบคุณที่ใช้บริการ</b></p>${r.later?laterBox(r):pd(r)}${again}`;stopTrack();}
    else{h=`<div class="mut">คิว ${o.queue_no}</div><p><b>ออเดอร์ถูกยกเลิกหรือหมดอายุ</b></p>${again}`;done();}
    const hadAgain=h.indexOf(again)>=0;if(hadAgain)h=h.split(again).join('');
    window.scrollTo(0,0);$('#app').innerHTML=`<div class="done" id="trk">${autoB(r)}${h}${cb(r)}${ab(r)}${s=='PENDING_PAY'||s=='QUEUED'||s=='COOKING'?'<p class="mut">เปิดหน้านี้ค้างไว้ จะมีเสียงและสั่นแจ้งเมื่อพร้อมรับ</p>':''}${hadAgain?again:''}</div>`;
  };
  const done=()=>{stopTrack();clearOrd();};
  const cd=()=>{const e=$('#cd');if(!e||!o.payBy)return;const m=Math.ceil((o.payBy-Date.now())/60000);e.textContent=m>0?'(เหลือ '+m+' นาที)':'(หมดเวลาแล้ว)';};
  const poll=async()=>{try{const r=await run('getOrderStatus',o.id);if(r.payBy&&r.payBy!==o.payBy){o.payBy=r.payBy;saveOrd(o);last='';}if($('#trk')||!last)draw(r);cd();}catch(e){}};
  poll();tk=setInterval(poll,window.__POLL||(o.auto?3000:8000));
  onVis=()=>{if(!document.hidden)poll();};document.addEventListener('visibilitychange',onVis);
}
function actDlg(q){
  const a=(G&&G.act)||'';
  dlg(`<h3>🎁 เข้าร่วมกิจกรรม</h3>${a?`<p class="mut">${esc(a)}</p>`:''}<label class="mut">เลขคิวของคุณ</label><input id="ac_q" value="${esc(q||'')}" autocapitalize="characters" autocomplete="off" style="width:100%;text-transform:uppercase"><label class="mut">อีเมล</label><input id="ac_e" type="email" autocomplete="email" placeholder="name@example.com" style="width:100%"><label class="mut">ข้อความ (ไม่บังคับ)</label><textarea id="ac_m" rows="4" maxlength="500" style="width:100%"></textarea><div class="acts"><button class="pri" id="ac_ok" onclick="actSend()">ส่ง</button><button onclick="closeDlg()">ยกเลิก</button></div>`);
}
async function actSend(){
  if(lk)return;const q=$('#ac_q').value.trim(),e=$('#ac_e').value.trim(),m=$('#ac_m').value.trim();
  if(!q)return alert('กรุณากรอกเลขคิว');if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))return alert('อีเมลไม่ถูกต้อง');
  $('#ac_ok').disabled=true;
  await act(async()=>{try{await run('joinActivity',{queue:q,email:e,msg:m,dev:dev()});closeDlg();alert('ขอบคุณค่ะ ลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อยแล้ว');}catch(x){err(x);const b=$('#ac_ok');if(b)b.disabled=false;}});
}
const HELP={
menu:['หน้านี้คืออะไร','รายการอาหาร/เครื่องดื่มที่ลูกค้าเห็นในหน้าสั่ง<ul><li>กด <b>+ เพิ่มเมนู</b> ใส่แค่ <b>ชื่อ + ราคา</b> ก็ขายได้ทันที (ไม่ต้องตั้งสต็อกหรือสูตร)</li><li>ใส่รูปด้วยจะขายดีขึ้น — ถ่ายรูปอาหารให้ชัด ใกล้ๆ แนวสี่เหลี่ยมจัตุรัส</li><li>ปุ่ม ▲ ▼ = จัดลำดับที่ลูกค้าเห็น</li><li>ของหมดวันนี้? กด <b>แก้ไข</b> แล้วติ๊ก "ปิดขาย" (ไม่ต้องลบ)</li></ul>'],
editMenu:['กรอกอะไรบ้าง','<b>ต้องใส่แค่ ชื่อ กับ ราคา</b> อย่างอื่นข้ามได้<ul><li><b>รูป</b> ใส่ทีหลังได้</li><li><b>หมายเหตุด่วน</b> เช่น ไม่เผ็ด / ไม่ใส่ผัก (บรรทัดละ 1 อย่าง) — ลูกค้าจะกดเลือกตอนสั่ง เหมาะกับร้านตามสั่ง</li><li><b>ชุดเซ็ต</b> = รวมหลายเมนูขายในราคาเดียว (ไม่ใช่เซ็ต เลือก "เมนูปกติ")</li></ul>'],
bom:['ส่วนนี้ไม่บังคับ — ไม่ตั้งสูตรก็ขายได้ปกติ','เมนูที่ไม่ตั้งสูตร <b>ขายได้ไม่จำกัด</b> ระบบแค่ไม่นับสต็อก/ต้นทุนให้<br>อยากรู้ต้นทุน กำไร และให้เมนูขึ้น "หมด" เมื่อของหมด ทำตามลำดับ:<ol><li><b>① วัตถุดิบ</b> — เพิ่มของที่ซื้อมา (เช่น หมูสับ หน่วย กรัม)</li><li><b>② สูตรเมนู</b> — กด "ตั้งสูตร" ที่เมนู แล้วใส่ว่า 1 จานใช้อะไรกี่หน่วย (เช่น หมูสับ 80)</li><li>แท็บ <b>สต็อก</b> — กดรับของเข้า</li></ol><span class="low">ระวัง: เมนูที่ใส่สูตรแล้ว ถ้าสต็อกเป็น 0 จะขึ้น "หมด" ทันที</span>'],
editIng:['วัตถุดิบ = ของที่ซื้อมาทำอาหาร','เช่น หมูสับ (หน่วย กรัม), ไข่ไก่ (หน่วย ฟอง), ถุงพลาสติก (ติ๊ก "ของนอกสูตร")<br>ราคาต่อหน่วยใส่คร่าวๆ ก่อนได้ — ตอนรับของเข้า ระบบจะใช้ราคาจริงเอง'],
promo:['โปรโมชั่นคืออะไร','ส่วนลดที่ <b>ระบบคิดให้ลูกค้าเองตอนสั่ง</b> เช่น ซื้อ 2 แถม 1, ลด 10% ช่วง 14:00–16:00<ul><li>ไม่ติ๊กเมนูเลย = ใช้กับทุกเมนู</li><li>ไม่ใส่วัน/เวลา = ใช้ตลอด</li><li>ไม่อยากใช้ชั่วคราว ให้ปิดใช้งาน (ไม่ต้องลบ)</li></ul>'],
editPromo:['วิธีกรอก','1) ตั้งชื่อ 2) เลือกชนิดโปร 3) ใส่ตัวเลข 4) เลือกเมนู (หรือเว้นว่าง = ทุกเมนู) 5) บันทึก — วัน/เวลาไม่ต้องใส่ถ้าใช้ตลอด'],
cp:['คูปองคืออะไร','ส่วนลดที่หักตอนจ่ายเงิน ตั้งชื่อรหัส (เช่น WELCOME10) แล้วเลือกวิธีใช้:<ul><li><b>พนักงานเลือกตอนคิดเงิน</b> — พนักงานเลือกเอง</li><li><b>ลูกค้ากดเลือกเอง</b> — ลูกค้าเห็นตอนสั่ง พนักงานไม่ต้องจำ</li><li><b>ลดอัตโนมัติ</b> — หักให้ทุกออเดอร์โดยไม่ต้องทำอะไร</li></ul>'],
editCp:['วิธีกรอก','รหัส: ตัวอักษรอังกฤษ/ตัวเลข เช่น WELCOME10 · ชนิด: ลดเป็น % หรือ ลดเป็นบาท · ยอดลดปัดเป็นบาทเต็มให้อัตโนมัติ'],
opt:['ตัวเลือกเสริมคืออะไร','ของที่ลูกค้าเลือกเพิ่มได้ตอนกด + ที่เมนู เช่น <b>ไข่ดาว +10 บาท</b>, <b>พิเศษ +10 บาท</b>, ซอสพริก (ฟรี)<br>จะผูกกับวัตถุดิบเพื่อตัดสต็อกหรือไม่ก็ได้ — ไม่ผูกก็ใช้งานได้'],
editOpt:['วิธีกรอก','ใส่ชื่อ + ราคาที่เพิ่ม (0 = ฟรี) · ไม่ติ๊กเมนู = ใช้กับทุกเมนู · ส่วน "ตัดสต็อกวัตถุดิบ" เว้นไว้ได้'],
set:['ตอนเริ่ม ต้องกรอกแค่ "ชื่อร้าน"','ค่าอื่นเว้นไว้ได้ · ส่วน "⚙️ ตั้งค่าอื่นๆ" ที่พับไว้ (ช่วงทดลอง, ทีวี, ใบเสร็จ, เดลิเวอรี่ ฯลฯ) ค่อยมาตั้งทีหลัง · แก้แล้วอย่าลืมกด <b>บันทึกการตั้งค่า</b> ด้านล่างสุด'],
stf:['พนักงาน','เพิ่มชื่อพนักงานแล้วตั้ง PIN ชั่วคราว (ตัวเลข) ให้เขาเข้าครั้งแรก ระบบจะให้เขาเปลี่ยน PIN เอง · เจ้าของเห็นทุกเมนู พนักงานเห็นเฉพาะงานหน้าร้าน']
};
function hpCss(){if(document.getElementById('css_hp'))return;const s=document.createElement('style');s.id='css_hp';s.textContent='.hp{background:var(--card);border:1px solid var(--bd);border-left:5px solid var(--pri);border-radius:10px;padding:8px 12px;margin:10px 0;font-size:17px}.hp summary,.hpsum{font-weight:700;cursor:pointer;padding:4px 0}.hp ul,.hp ol{margin:6px 0 4px;padding-left:22px}.adv{margin:12px 0}.adv>.hpsum{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:12px}.stp{display:flex;gap:12px;align-items:flex-start}.stn{flex:none;width:36px;height:36px;border-radius:50%;background:var(--bd);display:flex;align-items:center;justify-content:center;font-weight:800}.stp.ok .stn{background:#16a34a;color:#fff}.stp .opt{font-size:14px;background:var(--bd);border-radius:99px;padding:1px 10px;margin-left:6px;font-weight:400}';document.head.appendChild(s);}
function hpAdd(k){const h=HELP[k],m=$('#main');if(!h||!m||m.querySelector('.hp'))return;hpCss();let c=false;try{c=localStorage.getItem('psm_hp_'+k)=='0';}catch(e){}
  m.insertAdjacentHTML('afterbegin',`<details class="hp" ${c?'':'open'} ontoggle="try{localStorage.setItem('psm_hp_${k}',this.open?'1':'0')}catch(e){}"><summary>💡 ${h[0]}</summary>${h[1]}</details>`);}
['vMenu','vBom','vOpt','vPromo','vCp','vSet','vStaffAdm'].forEach(()=>{});
async function vStart(){
  hpCss();try{localStorage.setItem('psm_started','1');}catch(e){}
  const [s,st]=await Promise.all([run('setupStatus',pin),run('getSettings',pin)]),base=st.base||'',lk=p=>base?base+(base.indexOf('?')<0?'?':'&')+'page='+p:'';
  const step=(n,ok,t,d,btn,opt)=>`<div class="card stp${ok?' ok':''}"><div class="stn">${ok?'✓':n}</div><div style="flex:1"><b>${t}</b>${opt?'<span class="opt">ไม่บังคับ</span>':''}<div class="mut">${d}</div>${btn?`<div style="margin-top:8px">${btn}</div>`:''}</div></div>`;
  const go=(t,l,pri)=>`<button class="${pri?'pri':''}" onclick="goTab('${t}')">${l}</button>`;
  const need=[s.shop?1:0,s.menus>0?1:0,s.staff>1?1:0].reduce((a,b)=>a+b,0);
  $('#main').innerHTML=`<h2>🚀 เริ่มต้นใช้งานทีละขั้น</h2><div class="mut">ทำ 2 ขั้นแรกก็เปิดขายได้แล้ว ที่เหลือไม่บังคับ ค่อยทำทีหลังได้</div>
  ${step(1,!!s.shop,'ตั้งชื่อร้าน','ใส่ชื่อร้านที่ลูกค้าจะเห็น (และโลโก้ ถ้ามี)',go('set','ไปตั้งค่าร้าน',!s.shop))}
  ${step(2,s.menus>0,'เพิ่มเมนู','ใส่ <b>ชื่อ + ราคา + รูป</b> ของแต่ละเมนู ก็ขายได้เลย ไม่ต้องตั้งสต็อก'+(s.menus?` (ตอนนี้มี ${s.menus} เมนู${s.withImg<s.menus?' · ยังไม่มีรูป '+(s.menus-s.withImg)+' เมนู':''})`:''),go('menu','ไปเพิ่มเมนู',s.shop&&!s.menus))}
  ${step(3,s.staff>1,'เพิ่มพนักงาน','ให้พนักงานแต่ละคนมี PIN ของตัวเอง ถ้าทำคนเดียวข้ามได้',go('stf','ไปเพิ่มพนักงาน'),1)}
  ${step(4,s.orders>0,'ลองสั่งดูหนึ่งครั้ง','กด "สั่งแทน" เลือกเมนู แล้วลองรับเงิน → ดูที่แท็บ "เตรียม" ว่าออเดอร์ขึ้นมาไหม'+(lk('customer')?'<br>หรือเปิดหน้าของลูกค้าเพื่อลองสั่งเอง: <a href="'+esc(lk('customer'))+'" target="_blank">เปิดหน้าสั่ง</a>':''),go('new','ไปที่ สั่งแทน'))}
  ${step(5,false,'ให้ลูกค้าเข้ามาสั่ง','พิมพ์ลิงก์/คิวอาร์โค้ดวางที่โต๊ะ หรือส่งให้ลูกค้า'+(lk('customer')?'<br><span style="word-break:break-all"><b>'+esc(lk('customer'))+'</b></span>':'<br>(ต้อง Deploy เป็น Web app ก่อนจึงจะมีลิงก์)')+(lk('display')?'<br>จอแสดงคิวบนทีวี: <span style="word-break:break-all"><b>'+esc(lk('display'))+'</b></span>':''))}
  ${step(6,s.ingredients>0&&s.recipes>0,'ตั้งสต็อกและสูตร','ทำตอนที่พร้อม ถ้าอยากรู้ต้นทุน/กำไร และให้เมนูขึ้น "หมด" เมื่อของหมด',go('bom','ไปที่ วัตถุดิบ/สูตร'),1)}
  <div class="mut" style="margin-top:12px">เปิดหน้านี้ได้อีกที่ "เมนูอื่นๆ ▾ → 🚀 เริ่มต้นใช้งาน"</div>`;
}
function dueGroups(){const g={};(window._due||[]).forEach(o=>{const k=o.phone||o.name||('Q'+o.queue_no);(g[k]=g[k]||{key:k,name:o.name,phone:o.phone,os:[]}).os.push(o);});return Object.values(g).sort((a,b)=>a.os[0].createdAt-b.os[0].createdAt);}
async function vDue(){
  await ordLoad();if(tab!='due')return;hpCss();const gs=dueGroups();
  $('#main').innerHTML=`<h2>💰 ค้างชำระ</h2><div class="mut">ออเดอร์ที่ลูกค้าสั่งแล้วแต่ยังไม่ได้จ่าย รวมเป็นบิลตามเบอร์โทร/ชื่อ กด "รับเงินทั้งบิล" เพื่อจ่ายรวมครั้งเดียว</div>`+(gs.length?gs.map((g,i)=>{const sum=g.os.reduce((s,o)=>s+o.total,0);return `<div class="card"><div class="top"><b style="font-size:20px">${esc(g.name||'ไม่ระบุชื่อ')}</b>${g.phone?` <a href="tel:${esc(g.phone)}">📞 ${esc(g.phone)}</a>`:''}</div>${g.os.map(o=>`<div class="row"><span><b>${o.queue_no}</b> <span class="tag ${o.status}">${ST[o.status]||'รับแล้ว'}</span>${o.fulfil=='DELIVER'?' 🛵':''}${o.slip?` <button onclick="slipDlg('${o.order_id}')">🧾 สลิป</button>`:''}<div class="mut">${o.items.map(it=>esc(it.name)+'×'+it.qty).join(', ')}</div></span><b>${money(o.total)}฿</b></div>`).join('')}<div class="row"><b>รวมทั้งบิล (${g.os.length} ออเดอร์)</b><b class="q2">${money(sum)}฿</b></div>${g.os.some(o=>o.slip)?'<div class="note" style="text-align:left">🧾 มีสลิปรอตรวจในบิลนี้ กดปุ่ม "🧾 สลิป" ที่ออเดอร์นั้นเพื่อตรวจและรับโอน</div>':''}<div class="acts">${g.os.some(o=>o.slip)?'':'<button class="pri" onclick="billDlg('+i+',\'CASH\')">💵 รับเงินสดทั้งบิล</button><button class="pri" onclick="billDlg('+i+',\'TRANSFER\')">🏦 รับโอนทั้งบิล</button>'}</div></div>`;}).join(''):'<p class="mut">ไม่มีออเดอร์ค้างชำระ</p>');
}
function billDlg(i,m){
  const g=dueGroups()[i];if(!g)return;const tot=g.os.reduce((s,o)=>s+(Number(o.total)||0),0),fee=g.os.reduce((s,o)=>s+fe(o.fee),0);
  window._pay={bill:g.os.map(o=>o.order_id),m:m,total:tot,fee:fee,svd:0};
  const cs=(window._ck||{}).coupons||[];let pre='',bd=0;const cl=(g.os.find(o=>o.claim)||{}).claim||'';
  cs.filter(x=>x.mode=='AUTO'||x.code==cl).forEach(x=>{const d=cuAmt(x,tot-fee);if(d>bd||(d==bd&&d>0&&x.code==cl)){bd=d;pre=x.code;}});
  dlg(`<h3>${m=='CASH'?'รับเงินสด':'รับโอน'} · ทั้งบิล ${g.os.length} ออเดอร์</h3><div class="mut">${esc(g.name||'')} ${esc(g.phone||'')}</div><div class="row"><span>ยอดรวม</span><b>${money(tot)} บาท</b></div>${ckBlock(pre)}${m=='TRANSFER'?'<label class="mut">ตรวจสลิปแล้ว — เลขอ้างอิง (เว้นว่างได้)</label><input id="ck_ref" style="width:100%">':''}<div class="mut" id="ck_dc"></div><div class="row"><span>ยอดที่ต้องรับ</span><b class="q2" id="ck_net">${money(tot)}</b></div><div class="acts"><button class="pri" id="ck_ok" onclick="confirmPay()">ยืนยันรับเงิน</button><button onclick="closeDlg()">ยกเลิก</button></div>`);ckCalc();
}
const QRLib=(function(){const M={},C={};function req(n){n=n.replace('./','');if(!C[n]){const m={exports:{}};M[n](m,m.exports,req);C[n]=m.exports}return C[n]}
M['QRMode']=function(module,exports,require){module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};
};
M['QRErrorCorrectLevel']=function(module,exports,require){module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};

};
M['QRMaskPattern']=function(module,exports,require){module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};
};
M['QRMath']=function(module,exports,require){var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;
};
M['QRPolynomial']=function(module,exports,require){var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;
};
M['QRBitBuffer']=function(module,exports,require){function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;
};
M['QR8bitByte']=function(module,exports,require){var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;
};
M['QRRSBlock']=function(module,exports,require){var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;
};
M['QRUtil']=function(module,exports,require){var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;
};
M['index']=function(module,exports,require){

















var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;
};
return req('index')})();
function qrSvg(text){const q=new QRLib(-1,0);q.addData(text);q.make();const n=q.getModuleCount(),m=4;let p='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))p+='M'+(c+m)+' '+(r+m)+'h1v1h-1z';return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+2*m} ${n+2*m}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;}
function crc16(s){let c=0xFFFF;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF;}return c.toString(16).toUpperCase().padStart(4,'0');}
function ppPayload(id,amt){id=String(id||'').replace(/\D/g,'');let t,a;if(id.length==10&&id[0]=='0'){t='01';a='0066'+id.slice(1);}else if(id.length==13){t='02';a=id;}else if(id.length==15){t='03';a=id;}else return '';const f=(k,v)=>k+String(v.length).padStart(2,'0')+v;const amount=Number(amt)>0?f('54',Number(amt).toFixed(2)):'';const m=f('00','A000000677010111')+f(t,a);const s=f('00','01')+f('01',amount?'12':'11')+f('29',m)+f('53','764')+amount+f('58','TH')+'6304';return s+crc16(s);}
function qrSync(){const e=$('#qrb');if(e)e.style.display=window._qr||window._pp?'block':'none';}
const payRows=(tot,amt,fee)=>`<div class="card" style="text-align:left;margin:8px 0"><div class="row"><span>ยอดรวม${fee?' (รวมค่าส่ง '+money(fee)+')':''}</span><b>${money(tot)} บาท</b></div>${tot>amt?`<div class="row"><span>ส่วนลด/คูปอง</span><b style="color:#16a34a">−${money(tot-amt)} บาท</b></div>`:''}<div class="row"><span><b>ยอดที่ต้องจ่าย</b></span><b style="font-size:20px">${money(amt)} บาท</b></div></div>`;
let _qf=null;
function qrPrep(src){_qf=null;const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=720;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,720,720);x.imageSmoothingEnabled=false;x.drawImage(im,0,0,720,720);c.toBlob(b=>{if(b)try{_qf=new File([b],'qr-pay.png',{type:'image/png'});}catch(e){}},'image/png');}catch(e){}};im.src=src;}
async function qrSave(){const f=_qf;if(f&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'QR จ่ายเงิน'});return;}catch(e){if(e&&e.name=='AbortError')return;}}
  const im=$('#qr_main');if(!im)return;const a=document.createElement('a');a.href=f?URL.createObjectURL(f):im.src;a.download='qr-pay.png';document.body.appendChild(a);a.click();a.remove();alert('ถ้ายังไม่เห็นรูปใน Photos ให้กดค้างที่รูป QR แล้วเลือก "บันทึกรูปภาพ"');}
async function qrDlg(id,amt,demo,canSlip,tot,fee){
  const slipB=(demo||canSlip!==0)?`<button class="pri" style="width:100%;margin:10px 0 4px;font-size:17px" onclick="slipPick('${id}')">📎 แนบสลิป (หลังโอนแล้ว)</button>${demo?'<div class="mut" style="color:#b45309">🧪 โหมดทดสอบ: แนบรูปอะไรก็ได้ ระบบถือว่าจ่ายแล้ว</div>':''}`:'';
  dlg(`<h3>💳 จ่ายด้วย QR</h3>${payRows(tot||amt,amt,fee)}<div style="text-align:center"><div id="qr_img" style="min-height:120px" class="mut">กำลังโหลด QR…</div></div>${slipB}<ol class="mut" style="padding-left:20px"><li>สแกน QR ด้วยแอพธนาคาร หรือกด "บันทึกลงรูปภาพ" แล้วเปิดรูปจากแอพธนาคาร</li><li>โอน <b>${money(amt)}</b> บาท</li><li>กด "แนบสลิป" ร้านจะตรวจสอบและยืนยันให้</li></ol><div class="acts"><button onclick="closeDlg()">ปิด</button></div>`);
  const img=(src,extra)=>`<img id="qr_main" src="${src}" style="width:280px;max-width:100%;border-radius:12px;border:1px solid var(--bd)"><div style="margin:6px 0">${extra}<button onclick="qrSave()">💾 บันทึกลงรูปภาพ (Photos)</button><div class="mut">กดแล้วเลือก "บันทึกรูปภาพ" · หรือกดค้างที่รูป QR</div></div>`;
  try{const q=await run('getQr');const e=$('#qr_img');if(!e)return;const nt=q.note?`<div><b>${esc(q.note)}</b></div>`:'';
    if(!q.data&&!q.pp){if(!demo){e.textContent='ร้านยังไม่ได้ตั้ง QR';return;}const u='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrSvg('PANGKUM-DEMO '+amt));e.innerHTML=img(u,`<div style="color:#b45309"><b>ตัวอย่าง QR โหมดทดสอบ</b> — ยังไม่ใช่ QR จริงของร้าน</div>${nt}`);qrPrep(u);return;}
    if(q.pp){const u='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrSvg(ppPayload(q.pp,amt)));e.innerHTML=img(u,`<div style="color:#16a34a"><b>QR นี้มียอด ${money(amt)} บาทแล้ว</b> สแกนแล้วแอพธนาคารจะขึ้นยอดให้</div>${nt}`);qrPrep(u);return;}
    e.innerHTML=img(q.data,nt+'<div class="mut">QR ของร้านไม่มียอดในตัว โปรดใส่ยอดเองให้ตรง</div>');qrPrep(q.data);}catch(e){const x=$('#qr_img');if(x)x.textContent='โหลด QR ไม่สำเร็จ ลองใหม่อีกครั้ง';}
}
function slipPick(id){pickImg(1100,async u=>{if(lk)return;await act(async()=>{try{const sr=await run('submitSlip',id,u);closeDlg();alert(sr==='PAID'?'🧪 โหมดทดสอบ: ถือว่าชำระเงินแล้ว':'ส่งสลิปแล้ว ร้านจะตรวจสอบและยืนยันให้ค่ะ');}catch(e){err(e);}});});}
async function slipDlg(id){
  try{const s=await run('getSlip',pin,id);dlg(`<h3>🧾 สลิป · ${esc(s.queue_no)}</h3><div class="mut">ส่งเมื่อ ${esc(s.at)} · ยอดที่ควรได้รับ ${money(s.total)} บาท (หลังส่วนลด)</div><div style="text-align:center;max-height:60vh;overflow:auto"><img src="${s.data}" style="max-width:100%"></div><div class="mut">ตรวจยอดโอน ชื่อบัญชี และเวลาให้ตรงก่อนกดยืนยัน</div><div class="acts"><button class="pri" onclick="closeDlg();payDlg('${id}','TRANSFER')">✅ ถูกต้อง — รับโอน</button><button style="border-color:#dc2626;color:#dc2626" onclick="slipRejDlg('${id}')">❌ สลิปไม่ถูกต้อง</button><button onclick="closeDlg()">ปิด</button></div>`);}catch(e){err(e);}
}
function slipRejDlg(id){dlg(`<h3>❌ ให้ลูกค้าแนบสลิปใหม่</h3><div class="mut">ออเดอร์ไม่ถูกยกเลิก ลูกค้าจะเห็นข้อความแจ้งและแนบสลิปใหม่ได้ (แจ้งเหตุผลให้ลูกค้าเข้าใจ)</div><select id="rj_s" onchange="$('#rj_t').value=this.value" style="width:100%"><option value="">เลือกเหตุผลด่วน…</option><option>ยอดโอนไม่ตรง</option><option>ไม่ใช่สลิปของออเดอร์นี้</option><option>สลิปไม่ชัด อ่านไม่ออก</option><option>ยังไม่พบยอดเข้าบัญชี</option></select><input id="rj_t" maxlength="80" placeholder="เหตุผล (ไม่บังคับ)" style="width:100%"><div class="acts"><button class="pri" onclick="slipRej('${id}')">ส่งกลับให้ลูกค้าแนบใหม่</button><button onclick="closeDlg()">ยกเลิก</button></div>`);}
async function slipRej(id){const t=($('#rj_t')||{}).value||'';await act(async()=>{try{await run('rejectSlip',pin,id,t);closeDlg();window._h=null;window._od=null;toast('ส่งกลับให้ลูกค้าแนบสลิปใหม่แล้ว');stay();}catch(e){err(e);}});}
function upQr(){pickImg(800,async u=>{try{await run('saveQr',pin,u);window._imgs=null;vSet();}catch(e){err(e);}});}
async function delQr(){try{await run('saveQr',pin,'');vSet();}catch(e){err(e);}}
function newOrd(){clearOrd();customer();}
async function resumeOrd(){
  const o=loadOrd();if(!o||PAGE!='customer')return;
  try{const r=await run('getOrderStatus',o.id);if(['PENDING_PAY','QUEUED','COOKING','READY','DONE'].indexOf(r.status)>=0)track(o);else clearOrd();}catch(e){}
}
async function submitC(){
  if(lk)return;const sr=svcRead();if(sr.err)return alert(sr.err);unlockAudio();closeDlg();$('#go').disabled=true;
  await act(async()=>{
    try{const r=await run('placeOrder',cartArr(),Object.assign({dev:dev(),coupon:window._cu||''},sr.opt));window._cu='';window._sv=null;
      const o={id:r.order_id,payAmt:r.payAmt,claim:r.claim,later:r.later,fulfil:r.fulfil,fee:r.fee,queue_no:r.queue_no,total:r.total,expireMin:r.expireMin,waitMin:r.waitMin,payBy:r.payBy,eta:r.eta,pieces:r.pieces,auto:!!r.auto,t:Date.now()};saveOrd(o);track(o);
    }catch(e){err(e);await customer(true);}
  });
}
function clampLines(){ // หลังสั่งไม่ผ่าน: จำตะกร้าไว้ ลดเหลือเท่าที่ยังมี
  let ch=false;
  lines.forEach(l=>{const n=l.opts.length;l.opts=l.opts.filter(oid=>{const o=(G.options||[]).find(z=>z.opt_id==oid);return !o||o.avail>0;});if(l.opts.length!=n)ch=true;});
  menu.forEach(m=>{let over=cnt(m.menu_id)-Math.max(0,m.avail);for(let i=lines.length-1;i>=0&&over>0;i--){if(lines[i].menu_id!=m.menu_id)continue;const d=Math.min(over,lines[i].qty);lines[i].qty-=d;over-=d;ch=true;}});
  lines=lines.filter(l=>l.qty>0);
  if(ch)setTimeout(()=>toast('ของบางรายการเหลือไม่พอ ปรับจำนวนในตะกร้าให้แล้ว'),0);
}
/* ---- staff ---- */
function login(m){$('#app').innerHTML=`<div class="done"><div id="lg"></div><h2>พนักงาน</h2>${m?`<p class="low">${esc(m)}</p>`:''}<input id="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN ของคุณ" onkeydown="if(event.key=='Enter')doLogin()"><br><button class="pri" onclick="doLogin()">เข้าสู่ระบบ</button><p><a href="#" onclick="forgot();return false" class="mut">ลืม PIN เจ้าของ?</a></p></div>`;loadLogo();}
function forgot(){act(async()=>{try{const r=await run('forgotPinInfo');$('#app').innerHTML=`<div class="done"><h2>ลืม PIN เจ้าของ</h2><p class="mut">ระบบจะส่งรหัส 8 หลักไปที่อีเมลเจ้าของระบบ<br><b>${esc(r.mail)}</b><br>รหัสใช้ได้ 15 นาที · PIN เดิมยังใช้ได้จนกว่าจะยืนยันสำเร็จ<br>(พนักงานคนอื่นลืม PIN ให้เจ้าของตั้งใหม่ในหน้าจัดการพนักงาน)</p><button class="pri" onclick="forgotSend()">ส่งรหัสไปที่อีเมล</button><br><button onclick="login()">กลับ</button></div>`;}catch(e){err(e);}});}
function forgotSend(){act(async()=>{try{const r=await run('forgotPinSend');$('#app').innerHTML=`<div class="done"><h2>ตั้ง PIN ใหม่</h2><p class="mut">ส่งรหัสไปที่ ${esc(r.mail)} แล้ว</p><input id="fpc" inputmode="numeric" autocomplete="off" placeholder="รหัส 8 หลักจากอีเมล"><br><input id="fpn" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN ใหม่"><br><input id="fpn2" type="password" inputmode="numeric" autocomplete="off" placeholder="ยืนยัน PIN ใหม่"><br><button class="pri" onclick="forgotGo()">ตั้ง PIN ใหม่</button><br><button onclick="login()">ยกเลิก</button></div>`;}catch(e){err(e);}});}
function forgotGo(){const c=$('#fpc').value,p=$('#fpn').value;if(p!==$('#fpn2').value)return err('PIN ใหม่ทั้งสองช่องไม่ตรงกัน');act(async()=>{try{await run('forgotPinReset',c,p);login('ตั้ง PIN ใหม่แล้ว เข้าสู่ระบบได้เลย');}catch(e){err(e);}});}
async function doLogin(){const p=$('#pin').value;await act(async()=>{try{const r=await run('staffLogin',p);pin=r.token;role=r.role;window._who=r.name;if(r.must_change)return pinDlg(true);await enter();}catch(e){err(e);}});}
/* ---- รายงานรายเดือน / รายปี (เจ้าของ) ---- */
const ym=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
async function vRep(arg){
  const R=window._rp||(window._rp={mode:'month',key:ym()});
  if(arg&&arg.mode){R.mode=arg.mode;R.key=arg.mode=='month'?ym():ym().slice(0,4);}
  else if(typeof arg=='string'&&arg)R.key=arg;
  const bar=`<div class="card"><div class="acts"><button class="${R.mode=='month'?'pri':''}" onclick="vRep({mode:'month'})">รายเดือน</button><button class="${R.mode=='year'?'pri':''}" onclick="vRep({mode:'year'})">รายปี</button></div>${R.mode=='month'?`<input type="month" value="${R.key}" onchange="vRep(this.value)">`:`<input type="number" value="${R.key}" min="2000" max="2100" onchange="vRep(this.value)" style="width:120px">`}<div class="acts"><button onclick="expRep()">ส่งออกเป็นชีต (สำหรับนักบัญชี)</button></div><div id="rx" class="mut"></div></div>`;
  const warn=o=>o.openDays.length?`<div class="card"><b class="low">มีวันที่ยังไม่ปิดวัน ${o.openDays.length} วัน (ยังไม่นับในตัวเลข)</b><div class="mut">${o.openDays.map(x=>x.date+' ('+x.orders+' ออเดอร์)').join(' · ')}</div></div>`:'';
  const r=(t,v,cls)=>`<div class="row"><span>${t}</span><b class="${cls||''}">${c4(v)} ฿</b></div>`;
  if(R.mode=='year'){
    const d=await run('reportYear',pin,R.key);
    $('#main').innerHTML=bar+warn(d)+`<div class="card" style="overflow-x:auto"><h3>ปี ${d.year}</h3><table style="border-collapse:collapse;min-width:600px;width:100%"><tr class="mut"><th align="left">เดือน</th><th align="right">ยอดขาย</th><th align="right">ค่าส่ง</th><th align="right">ต้นทุน</th><th align="right">ค่าใช้จ่าย</th><th align="right">กำไรสุทธิ</th></tr>${d.months.map(m=>`<tr><td>${m.month}</td><td align="right">${money(m.sales)}</td><td align="right">${money(m.fee||0)}</td><td align="right">${c4(r4(m.sale+m.count+m.waste))}</td><td align="right">${c4(r4(m.exp+m.monthly))}</td><td align="right" class="${m.net<0?'low':''}">${c4(m.net)}</td></tr>`).join('')}<tr><td><b>รวม</b></td><td align="right"><b>${money(d.totals.sales)}</b></td><td align="right"><b>${money(d.totals.fee||0)}</b></td><td align="right"><b>${c4(r4(d.totals.sale+d.totals.count+d.totals.waste))}</b></td><td align="right"><b>${c4(r4(d.totals.exp+d.totals.monthly))}</b></td><td align="right" class="${d.totals.net<0?'low':''}"><b>${c4(d.totals.net)}</b></td></tr></table></div>`;
    return;
  }
  const d=await run('reportMonth',pin,R.key),t=d.totals;window._rm=d;
  $('#main').innerHTML=bar+warn(d)+`<div class="card"><h3>สรุปเดือน ${d.month}</h3>${r('ยอดขาย',t.sales)}${t.discount||t.fee?`<div class="mut">สินค้า ${money(t.sales-(t.fee||0)+(t.discount||0))}${t.discount?` − ส่วนลดค่าสินค้า ${money(t.discount)}`:''}${t.fee?` + ค่าส่ง ${money(t.fee)}`:''} = ${money(t.sales)} บาท · ${t.orders} ออเดอร์</div>`:`<div class="mut">${t.orders} ออเดอร์</div>`}${t.fee?r('↳ ค่าส่งที่เก็บจากลูกค้า (รวมในยอดขายแล้ว)',t.fee):''}${r('ต้นทุนวัตถุดิบที่ขาย (FIFO)',t.sale)}${r('ของนอกสูตรที่ใช้',t.count)}${r('ของเสีย/ส่วนต่างสต็อก',t.waste)}${r('<b>กำไรขั้นต้น</b>',t.gross,t.gross<0?'low':'')}${r('ค่าใช้จ่ายรายวัน',t.exp)}${d.expBy.map(e=>`<div class="mut" style="padding-left:12px">${esc(e.name)} ${c4(e.amount)} ฿</div>`).join('')}${r('ค่าใช้จ่ายรายเดือน',t.monthly)}${r('<b>กำไรสุทธิ</b>',t.net,t.net<0?'low':'')}</div>
  <div class="card"><h3>ค่าใช้จ่ายรายเดือน (ค่าเช่า ค่าไฟ ฯลฯ)</h3>${d.monthlyExp.map(e=>`<div class="row"><span>${esc(e.name)}</span><span>${c4(e.amount)} ฿ <button onclick="meEdit('${e.id}')">แก้ไข</button> <button onclick="meDel('${e.id}')">ลบ</button></span></div>`).join('')||'<p class="mut">ยังไม่มีรายการ</p>'}<div class="row"><input id="me_n" placeholder="ชื่อรายการ" style="flex:1;min-width:0"><input id="me_a" type="number" step="any" min="0" placeholder="บาท" style="width:120px"><button class="pri" onclick="meSave()">บันทึก</button></div></div>
  <div class="card" style="overflow-x:auto"><h3>รายวัน</h3><table style="border-collapse:collapse;min-width:560px;width:100%"><tr class="mut"><th align="left">วันที่</th><th align="right">ยอดขาย</th><th align="right">ค่าส่ง</th><th align="right">ต้นทุน</th><th align="right">ค่าใช้จ่าย</th><th align="right">กำไร</th></tr>${d.days.map(x=>`<tr><td>${x.date.slice(8)}${x.closed?'':' ⚠'}</td><td align="right">${money(x.sales)}</td><td align="right">${money(x.fee||0)}</td><td align="right">${c4(r4(x.sale+x.count+x.waste))}</td><td align="right">${c4(x.exp)}</td><td align="right" class="${x.profit<0?'low':''}">${c4(x.profit)}</td></tr>`).join('')}</table></div>`;
}
function meEdit(id){const e=(window._rm.monthlyExp||[]).find(x=>x.id==id);if(!e)return;window._meid=id;$('#me_n').value=e.name;$('#me_a').value=e.amount;}
async function meSave(){
  const n=$('#me_n').value.trim(),a=$('#me_a').value;if(!n||a==='')return alert('กรอกชื่อรายการและจำนวนเงิน');
  await act(async()=>{try{await run('saveMonthlyExpense',pin,{id:window._meid||'',month:window._rp.key,name:n,amount:Number(a)});window._meid=null;await vRep();}catch(e){err(e);}});
}
async function meDel(id){if(!await ask('ลบรายการนี้?'))return;await act(async()=>{try{await run('deleteMonthlyExpense',pin,id);await vRep();}catch(e){err(e);}});}
async function expRep(){
  await act(async()=>{try{const r=await run('exportReport',pin,window._rp.mode,window._rp.key);$('#rx').innerHTML=`ส่งออกแล้ว: <a href="${esc(r.url)}" target="_blank">เปิดแท็บ ${esc(r.name)} ในชีต</a>`;}catch(e){err(e);}});
}
function goTab(t){if(!t)return;if(t=='bom')window._sel=null;tab=t;staff();}
function stay(){if(tab=='orders'||tab=='prep')return refOrd();if(tab=='due')return vDue();goTab(tab);} // หลังกดปุ่ม: โหลดรายการใหม่ในหน้าเดิม ไม่สลับแท็บ ไม่วาดหัวหน้าใหม่ ไม่เด้งกลับขึ้นบนสุด
function staff(){
  $('#app').innerHTML=`<header><div id="lg"></div><h1>${esc(window._shop||'')}</h1><div class="mut">👤 ${esc(window._who||'')} · <a href="#" onclick="pinDlg(false);return false">เปลี่ยน PIN</a> · <a href="#" onclick="logout();return false">ออกจากระบบ</a></div><div id="autob" class="note" style="display:${window._auto?'block':'none'}">🧪 เปิด "ทดสอบอัตโนมัติ" อยู่ — ออเดอร์ที่ลูกค้าสั่งเองจะถูกกดขั้นตอนให้อัตโนมัติ และไม่นับยอดขาย (ปิดได้ที่ ตั้งค่า)</div><div id="updb" class="note" style="display:none;border:2px solid #dc2626"></div><nav>${[['orders','ออเดอร์'],['prep','เตรียม'],['new','สั่งแทน']].map(t=>`<button id="nb_${t[0]}" class="${tab==t[0]?'on':''}" onclick="goTab('${t[0]}')">${t[1]}${(window._nb||{})[t[0]]?' ('+window._nb[t[0]]+')':''}</button>`).join('')}<select id="more" class="${MORE().some(t=>t[0]==tab)?'on':''}" onchange="goTab(this.value)"><option value=""${MORE().some(t=>t[0]==tab)?'':' selected'}>เมนูอื่นๆ ▾</option>${MORE().map(t=>`<option value="${t[0]}"${tab==t[0]?' selected':''}>${t[1]}</option>`).join('')}</select></nav></header><main id="main"></main>`;
  updBanner();
  if((tab=='orders'||tab=='prep')&&window._h&&window._h[tab]&&!window._first)$('#main').innerHTML=window._h[tab];
  loadLogo();clearInterval(timer);Promise.resolve(({orders:vOrders,prep:vPrep,new:vNew,stock:vStock,sum:vSum,menu:vMenu,bom:vBom,cp:vCp,due:vDue,start:vStart,rep:vRep,set:vSet,opt:vOpt,promo:vPromo,stf:vStaffAdm,log:vLog})[tab]()).catch(e=>{const m=$('#main');if(m)m.innerHTML='<p class="low">เกิดข้อผิดพลาด: '+esc(e&&e.message?e.message:e)+'</p>'});
  if(tab=='orders'||tab=='prep')timer=setInterval(()=>{if(!document.hidden)refOrd().catch(()=>{});},8000);
}
const PREP={QUEUED:1,COOKING:1};
const ctc=o=>(o.name||o.phone)?`<div class="src">👤 <b>${esc(o.name)}</b> ${o.phone?`<a href="tel:${esc(o.phone)}" style="font-size:20px">📞 ${esc(o.phone)}</a>`:''}</div>`:'';
const noteBox=o=>{const ns=[];if(o.note)ns.push('🗒 '+o.note);o.items.forEach(i=>{if(i.inote)ns.push(i.name+': '+i.inote);});return ns.length?`<div class="note" style="text-align:left;border:2px solid #f59e0b;margin:6px 0">📝 <b>โน้ตจากลูกค้า</b>${ns.map(n=>`<div style="font-size:19px">${esc(n)}</div>`).join('')}</div>`:'';};
const slipBox=o=>o.slip&&(o.status=='PENDING_PAY'||o.unpaid)?`<div class="note" style="text-align:left;border:2px solid #16a34a;margin:6px 0">🧾 <b>ลูกค้าแนบสลิปแล้ว</b> <button onclick="slipDlg('${o.order_id}')">ดูสลิป / ตรวจสอบ</button></div>`:'';
const dlvBox=o=>o.fulfil=='DELIVER'?`<div class="note" style="text-align:left;border:2px solid var(--pri);margin:6px 0">🛵 <b>ส่งที่ ${esc(o.zone)}</b> · ค่าส่ง ${money(o.fee)} บาท<div style="font-size:19px">${esc(o.addr)}</div></div>`:'';
const PML={CASH:'เงินสด',TRANSFER:'โอน',PLATFORM:'แพลตฟอร์ม'};
const payTag=o=>o.status=='PENDING_PAY'?'<span class="tag" style="background:#fde68a;color:#7c2d12">⏳ รอจ่าย</span>':o.unpaid?'<span class="tag" style="background:#fecaca;color:#7f1d1d">⚠ ยังไม่จ่าย</span>':'<span class="tag" style="background:#bbf7d0;color:#14532d">✅ จ่ายแล้ว'+(o.pm?' · '+(PML[o.pm]||o.pm):'')+'</span>';
const hoBox=o=>o.status!='READY'?'':(o.unpaid||o.status=='PENDING_PAY')?`<div class="note" style="text-align:left;border:2px solid #dc2626;margin:6px 0">⚠ <b>ยังไม่ได้รับเงิน</b> — เก็บ <b>${money(o.total)}</b> บาท ก่อนส่งมอบ</div>`:`<div class="note" style="text-align:left;border:2px solid #16a34a;margin:6px 0">✅ <b>จ่ายแล้ว${o.pm?' ('+(PML[o.pm]||o.pm)+')':''}</b> — ส่งมอบได้เลย ไม่ต้องเก็บเงินอีก</div>`;
const ordCard=(o,seq)=>`<div class="card oc"><div class="top">${seq?`<span class="tag" style="font-size:22px;font-weight:700">ลำดับ ${seq}</span>`:''}<span class="q2">${o.queue_no}</span><span class="tag ${o.status}">${ST[o.status]}</span>${o.test?'<span class="tag">ทดสอบ</span>':''}${payTag(o)}${o.fulfil=='DELIVER'?'<span class="tag">🛵 ส่ง</span>':''}<b>${money(o.total)}฿</b></div><div class="src">${o.channel=='DELIVERY'?esc(o.platform)+' '+esc(o.external_ref):'หน้าร้าน'} · สั่ง ${o.time}${o.paidTime&&o.status!='PENDING_PAY'?' · จ่าย '+o.paidTime:''}${isCust(o)?' · ลูกค้าสั่งเอง'+(o.dev?' (เครื่อง …'+esc(o.dev)+')':''):(o.by?' · '+esc(o.by):'')}</div>${ctc(o)}${dlvBox(o)}${slipBox(o)}${noteBox(o)}<div class="its">${o.items.map(i=>`<div class="it"><span>${esc(i.name)}${i.extra?`<div class="mut" style="font-size:17px;line-height:1.3">${esc(i.extra)}</div>`:''}</span><b>× ${i.qty}</b></div>`).join('')}</div>${o.payBy?`<div class="low">ครบกำหนดชำระ ${o.payBy} น.</div>`:''}${o.claim?`<div class="low">🎟 ลูกค้าเลือกคูปอง ${esc(o.claim)} — ตอนรับเงินระบบจะหักให้</div>`:''}<div class="mut">${pcs(o)} รายการ${o.discount?' · ส่วนลด '+money(o.discount)+' บาท'+(o.coupon?' ('+esc(o.coupon)+')':''):''}</div>${hoBox(o)}<div class="acts">${acts(o)}</div></div>`;
async function ordLoad(){
  let d=window._first;window._first=null;
  if(!d&&window._od&&Date.now()-window._odT<2500)d=window._od;else{if(!d)d=await run('staffData',pin);window._od=d;window._odT=Date.now();}
  window._due=d.due||[];window._ord=d.orders;window._ck={coupons:d.coupons,survey:d.survey};window._auto=!!d.auto;{const e=$('#autob');if(e)e.style.display=window._auto?'block':'none';}
  const prep=d.orders.filter(o=>PREP[o.status]).sort((a,b)=>(a.paidAt-b.paidAt)||(a.createdAt-b.createdAt));
  const front=d.orders.filter(o=>!PREP[o.status]).sort((a,b)=>(a.status=='PENDING_PAY'?0:1)-(b.status=='PENDING_PAY'?0:1)||(a.createdAt-b.createdAt));
  window._nb={orders:front.length,prep:prep.length};
  [['orders','ออเดอร์'],['prep','เตรียม']].forEach(t=>{const e=$('#nb_'+t[0]);if(e)e.textContent=t[1]+(window._nb[t[0]]?' ('+window._nb[t[0]]+')':'');});
  return {prep:prep,front:front};
}
const refOrd=()=>tab=='prep'?vPrep():vOrders();
async function vOrders(){
  const d=await ordLoad();if(tab!='orders')return;
  $('#main').innerHTML=((window._due||[]).length?`<button class="pri" style="width:100%;margin-bottom:8px" onclick="goTab('due')">💰 ค้างชำระ ${(window._due||[]).length} ออเดอร์ — ดูบิล/รับเงิน</button>`:'')+(d.front.length?d.front.map(o=>ordCard(o)).join(''):'<p class="mut">ไม่มีออเดอร์รอชำระ/รอรับ</p>');
  (window._h=window._h||{}).orders=$('#main').innerHTML;
}
async function vPrep(){
  const d=await ordLoad();if(tab!='prep')return;
  $('#main').innerHTML=d.prep.length?'<p class="mut">เรียงตามเวลาที่จ่ายเงิน ทำจากบนลงล่าง</p>'+d.prep.map((o,k)=>ordCard(o,k+1)).join(''):'<p class="mut">ไม่มีออเดอร์ที่ต้องเตรียม</p>';
  (window._h=window._h||{}).prep=$('#main').innerHTML;
}
function acts(o){
  const b=(l,f,c)=>`<button class="${c||''}" onclick="${f}">${l}</button>`,id=o.order_id;
  if(o.status=='PENDING_PAY')return (o.slip?b('🧾 ตรวจสลิป',`slipDlg('${id}')`,'pri'):b('รับเงินสด',`payDlg('${id}','CASH')`,'pri')+b('รับโอน',`payDlg('${id}','TRANSFER')`,'pri')+b('ต่อเวลา +5 นาที',`extend('${id}')`))+b('ยกเลิก',`cancelO('${id}')`)+(isCust(o)&&o.dev?b('ยกเลิก+บล็อกเครื่อง',`cancelO('${id}',1)`):'');
  const nx={QUEUED:['พร้อมรับ','READY'],COOKING:['พร้อมรับ','READY'],READY:['รับแล้ว','DONE']}[o.status];
  return (o.unpaid?(o.slip?b('🧾 ตรวจสลิป',`slipDlg('${id}')`,'pri'):b('💵 รับเงินสด',`payDlg('${id}','CASH')`,'pri')+b('🏦 รับโอน',`payDlg('${id}','TRANSFER')`,'pri')):'')+b(nx[0],`stt('${id}','${nx[1]}')`,'pri')+(window._print===false?'':b('พิมพ์ใบ',`printSlip('${id}')`))+b('ยกเลิก',`cancelO('${id}')`);
}
/* ---- หน้าต่างคิดเงิน: คูปอง + ถุง/แก้ว ---- */
const c4=n=>Number(n||0).toLocaleString('th-TH',{maximumFractionDigits:4});
const r4=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
let lk=false;
/* กันกดซ้ำทุกปุ่ม: ปุ่มเดิม (คำสั่งเดียวกัน) กดซ้ำภายใน 0.8 วินาที หรือขณะที่ยังรอเซิร์ฟเวอร์อยู่ จะถูกข้าม · ปุ่มเพิ่ม/ลดจำนวน ปิดหน้าต่าง และเปลี่ยนหน้า ยกเว้น เพื่อให้กดรัวได้ */
(function(){const free=/^(uaOk|chg|lnQty|adQty|closeDlg|closeD|goTab|customer|cartDlg|login|vRep|vMenu|vBom|vCp|vPromo|vOpt|vStaffAdm|addLine|miAdd|miDel)\(/;let lastK='',lastT=0;
document.addEventListener('click',function(e){const b=e.target&&e.target.closest?e.target.closest('button,[onclick]'):null;if(!b||b.disabled)return;const k=b.getAttribute('onclick')||b.id||'';if(!k||free.test(k))return;const now=Date.now();
if(k===lastK&&(now-lastT<800||(now-lastT<15000&&(_pend>0||lk)))){e.stopPropagation();e.preventDefault();return;}
if(lk&&!/^(logout)\(/.test(k)){e.stopPropagation();e.preventDefault();return;}
lastK=k;lastT=now;},true);})();

function bz(on){let e=$('#bz');if(on&&!e){e=document.createElement('div');e.id='bz';e.textContent='กำลังบันทึก... กรุณารอสักครู่';e.style.cssText='position:fixed;top:0;left:0;right:0;text-align:center;padding:6px;background:var(--pri);color:#fff;z-index:40';document.body.appendChild(e);}if(!on&&e)e.remove();}
async function act(f){if(lk)return;lk=true;window._odT=0;bz(true);try{return await f();}finally{lk=false;bz(false);}}
function toast(t){const e=document.createElement('div');e.textContent=t;e.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#14532d;color:#fff;padding:12px 18px;border-radius:12px;z-index:50;max-width:90%;text-align:center;font-size:18px';document.body.appendChild(e);setTimeout(()=>e.remove(),6000);}
function setLogo(u){const e=$('#lg');if(e&&u)e.innerHTML=imgTag(u,'logo','logo',320);}
function loadLogo(){if(window._logo!==undefined)return setLogo(window._logo);if(window.__IMG){window._imgs=window.__IMG;window.__IMG=null;window._logo=window._imgs.logo||'';return setLogo(window._logo);}run('getImages').then(im=>{window._imgs=im;window._logo=im.logo||'';setLogo(window._logo);}).catch(()=>{});}
function dlg(h){const o=$('#dlgbox');if(o)o.remove();const d=document.createElement('div');d.id='dlgbox';d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9';d.innerHTML='<div class="card" style="max-width:420px;width:100%;max-height:90vh;overflow:auto;background:var(--bg)">'+h+'</div>';document.body.appendChild(d);}
function closeDlg(){const d=$('#dlgbox');if(d)d.remove();window._pay=null;}
function ckBlock(pre){return pre?`<div class="note" style="text-align:left;border:2px solid #16a34a">🎟 ลูกค้าเลือกคูปอง <b>${esc(pre)}</b> ไว้แล้ว ระบบหักให้อัตโนมัติ — <b>แค่ตรวจยอดแล้วกดยืนยัน</b></div><details style="margin:6px 0"><summary class="mut">เปลี่ยน/ยกเลิกคูปอง</summary>${ckHtml(pre)}</details>`:ckHtml(pre);}
function ckHtml(pre){
  const c=window._ck||{coupons:[]};
  return (c.coupons.length?`<div id="ck_cpw"><label class="mut">คูปองส่วนลด</label><select id="ck_cp" onchange="ckCalc()" style="width:100%"><option value="">ไม่ใช้คูปอง</option>${c.coupons.map(x=>`<option value="${esc(x.code)}" ${pre==x.code?'selected':''}>${esc(x.code)}${x.mode=='AUTO'?' (อัตโนมัติ)':x.mode=='CUSTOMER'?' (ลูกค้ากด)':''} — ลด ${x.type=='PERCENT'?c4(x.value)+'%':money(x.value)+' บาท'}${x.note?' · '+esc(x.note):''}</option>`).join('')}</select></div>`:'')+(c.survey?`<div id="ck_svw"><label class="mut">รหัสแบบสอบถาม (เช่น TR0007)</label><div class="acts" style="margin:0"><input id="ck_sv" placeholder="เว้นว่างถ้าไม่มี" autocapitalize="characters" autocomplete="off" style="flex:1;min-width:0;text-transform:uppercase" oninput="svReset()"><button onclick="svCheck()">ตรวจรหัส</button></div><div id="ck_svm" class="mut"></div></div>`:'');
}
function readCk(){const cp=$('#ck_cp'),sv=$('#ck_sv');return {coupon:cp?cp.value:'',noCoupon:!!cp&&!cp.value,survey:sv?sv.value.trim():''};}
function ckCalc(){
  const p=window._pay;if(!p||!$('#ck_net'))return;
  const cs=(window._ck||{}).coupons||[],cp=$('#ck_cp'),c=cp?cs.find(x=>x.code==cp.value):null;
  const B=Math.max(0,p.total-fe(p.fee));let d=c?(c.type=='PERCENT'?B*c.value/100:c.value):0;if(p.svd)d=p.svd;d=Math.max(0,Math.min(Math.floor(B+1e-9),p.svd?d:Math.floor(d+1e-9)));
  $('#ck_net').textContent=money(Math.round((p.total-d)*100)/100);$('#ck_dc').textContent=d?'ส่วนลด -'+money(d)+' บาท':'';
}
function ckShow(){
  const dl=$('#ch').value=='DELIVERY';$('#dl').style.display=dl?'flex':'none';
  $('#ckf').style.display=(!dl&&$('#pm').value)?'block':'none';drawMenu();
}
function payDlg(id,m){
  const o=(window._ord||[]).concat(window._due||[]).find(x=>x.order_id==id);if(!o)return;
  window._pay={id:id,m:m,total:Number(o.total)||0,fee:fe(o.fee),svd:0};
  const cs=(window._ck||{}).coupons||[];let pre='',bd=0;
  cs.filter(x=>x.mode=='AUTO'||x.code==o.claim).forEach(x=>{const d=cuAmt(x,o.total-fe(o.fee));if(d>bd||(d==bd&&d>0&&x.code==o.claim)){bd=d;pre=x.code;}});
  dlg(`<h3>${m=='CASH'?'รับเงินสด':'รับโอน'} · คิว ${o.queue_no}</h3><div class="row"><span>ยอดรวม</span><b>${money(o.total)} บาท</b></div>${ckBlock(pre)}${m=='TRANSFER'?'<label class="mut">ตรวจสลิปแล้ว — เลขอ้างอิง (เว้นว่างได้)</label><input id="ck_ref" style="width:100%">':''}<div class="mut" id="ck_dc"></div><div class="row"><span>ยอดที่ต้องรับ</span><b class="q2" id="ck_net">${money(o.total)}</b></div><div class="acts"><button class="pri" id="ck_ok" onclick="confirmPay()">ยืนยันรับเงิน</button><button onclick="closeDlg()">ยกเลิก</button></div>`);ckCalc();
}
async function confirmPay(){
  const p=window._pay;if(!p||lk)return;const c=readCk(),ref=($('#ck_ref')||{}).value||'';$('#ck_ok').disabled=true;
  await act(async()=>{
    try{if(p.bill){const r=await run('receiveBill',pin,p.bill,p.m,ref,c);closeDlg();window._h=null;window._od=null;toast('รับเงินทั้งบิลแล้ว '+money(r.total)+' บาท');stay();for(const x of (r.receipts||[]))await printSlip(x.id,x.receipt);return;}
      const r=await run('receivePayment',pin,p.id,p.m,ref,c);closeDlg();window._h=null;window._od=null;stay();await printSlip(p.id,r.receipt);}
    catch(e){err(e);const b=$('#ck_ok');if(b)b.disabled=false;}
  });
}
async function extend(id){await act(async()=>{try{const r=await run('extendOrder',pin,id,5);toast('ต่อเวลาชำระถึง '+r.payBy+' น.');await refOrd();}catch(e){err(e);}});}
async function stt(id,s){await act(async()=>{try{await run('setStatus',pin,id,s);window._h=null;await refOrd();}catch(e){err(e);}});}
async function cancelO(id,block){const why=prompt((block?'ยกเลิกและบล็อกเครื่องของผู้สั่ง 24 ชม.':'ยกเลิกออเดอร์นี้ (สต็อกจะถูกคืน)')+'\nเหตุผล (ไม่บังคับ):','');if(why===null)return;await act(async()=>{try{await run('cancelOrder',pin,id,why,!!block);await refOrd();}catch(e){err(e);}});}
async function printSlip(id,rc){
  if(window._print===false)return;
  const r=rc||await run('getReceipt',pin,id);
  $('#rc').innerHTML=`<div class="shop">${esc(r.shop)}</div><div style="text-align:center">คิว</div><div class="qn">${r.queue_no}</div>${r.items.map(i=>`<div>${esc(i.name)} ×${i.qty}<span style="float:right">${money(i.qty*i.price)}</span>${i.extra?`<div style="font-size:12px;line-height:1.3">${esc(i.extra)}</div>`:''}</div>`).join('')}<div>ทั้งหมด ${r.pieces} รายการ</div>${r.discount?`<div>ส่วนลด${r.coupon?' '+esc(r.coupon):''}<span style="float:right">-${money(r.discount)}</span></div>`:''}<hr><div><b>รวม</b><span style="float:right"><b>${money(r.total)}</b></span></div><div>${r.pay} · ${r.time}</div>`;
  window.print();
}
const smFresh=()=>window._sm&&Date.now()-window._sm.t<180000;
async function vNew(){
  const hit=smFresh(),d=hit?window._sm.d:await run('getStaffMenu',pin);window._sm={d:d,t:hit?window._sm.t:Date.now()};menu=d.menus;lines=[];G={note:d.note,options:d.options||[],promos:d.promos||[]};window._ck={coupons:d.coupons,survey:d.survey};
  $('#main').innerHTML=`<div class="card"><select id="ch" onchange="ckShow()"><option value="STORE">หน้าร้าน</option><option value="DELIVERY">เดลิเวอรี่</option></select> <select id="pm" onchange="ckShow()"><option value="">ยังไม่รับเงิน</option><option value="CASH">รับเงินสดแล้ว</option><option value="TRANSFER">รับโอนแล้ว</option></select><div id="dl" class="row" style="display:none"><select id="pf">${(d.platforms||['Grab','LINE MAN','Foodpanda','Shopee Food']).map(p=>`<option>${esc(p)}</option>`).join('')}<option>อื่นๆ</option></select><input id="xr" placeholder="เลขออเดอร์แพลตฟอร์ม"></div><div id="ckf" style="display:none">${ckHtml()}</div></div><div id="menu" style="padding:0"></div><footer><span id="sum"></span><button id="go" class="pri" onclick="cartDlg()">ตรวจสอบ/บันทึกออเดอร์</button></footer>`;drawMenu();lazy();
  if(hit)refreshNew();
}
async function refreshNew(){
  try{const d=await run('getStaffMenu',pin);window._sm={d:d,t:Date.now()};if(tab!='new'||!$('#menu'))return;menu.forEach(m=>{const n=d.menus.find(x=>x.menu_id==m.menu_id);if(n){m.avail=n.avail;m.ord=n.ord;}});menu.sort((a,b)=>(a.avail<1)-(b.avail<1)||a.ord-b.ord);G.options=d.options||G.options;G.promos=d.promos||G.promos;window._ck={coupons:d.coupons,survey:d.survey};clampLines();drawMenu();}catch(e){}
}
function resetNew(){
  lines=[];$('#ch').value='STORE';$('#pm').value='';$('#xr').value='';const c=$('#ck_cp');if(c)c.value='';const s=$('#ck_sv');if(s)s.value='';const sm=$('#ck_svm');if(sm)sm.textContent='';
  ckShow();
}
async function submitS(){
  if(lk)return;closeDlg();
  const dl=$('#ch').value=='DELIVERY',pm=dl?'':$('#pm').value,ck=readCk(),items=cartArr();$('#go').disabled=true;
  await act(async()=>{
    try{
      const r=await run('placeOrder',items,{staff:true,pin,channel:$('#ch').value,platform:dl?$('#pf').value:'',externalRef:dl?$('#xr').value:'',payMethod:pm,coupon:dl?'':ck.coupon,noCoupon:dl?false:ck.noCoupon,survey:dl?'':ck.survey});
      resetNew();toast('คิว '+r.queue_no+' · ยอด '+money(r.total)+' บาท'+(r.discount?' (ส่วนลด '+money(r.discount)+')':'')+' · ประมาณ '+r.eta+' นาที');
      refreshNew();
      if(r.receipt&&!dl)await printSlip(null,r.receipt);
    }catch(e){err(e);await refreshNew();}
  });
}
async function vStock(){
  const d=await run('getStock',pin);window._stk=d.ingredients;
  $('#main').innerHTML=d.ingredients.map(i=>`<div class="card"><div class="row" style="border:0;padding:0"><div><b>${esc(i.name)}</b>${i.is_pack?' <span class="tag">ของนอกสูตร</span>':''}<div class="mut">เตือนเมื่อ ≤ ${c4(i.reorder_point)} ${esc(i.unit)}</div></div><div><span class="${i.low?'low':''}"><b>${c4(i.stock)}</b> ${esc(i.unit)}</span></div></div>${i.lots.length?`<details><summary class="mut">ล็อตคงเหลือ (ใช้ก่อน → หลัง)</summary>${i.lots.map(l=>`<div class="row"><span>${l.date} · ${c4(l.left)} ${esc(i.unit)}</span><span>@ ${c4(l.cost)} ฿</span></div>`).join('')}</details>`:''}<div class="acts"><button class="pri" onclick="recvDlg('${i.ing_id}')">รับของเข้า</button><button onclick="adjDlg('${i.ing_id}')">ปรับ/ของเสีย</button></div></div>`).join('');
}
function recvCalc(){const q=Number($('#rq').value)||0,t=Number($('#rt').value)||0;$('#ru').textContent=q>0?c4(r4(t/q))+' บาท/หน่วย':'—';}
function recvDlg(id){
  const i=(window._stk||[]).find(x=>x.ing_id==id);if(!i)return;window._rid=id;
  dlg(`<h3>รับของเข้า · ${esc(i.name)}</h3><label class="mut">จำนวนที่รับ (${esc(i.unit)})</label><input id="rq" type="number" step="any" min="0" oninput="recvCalc()" style="width:100%"><label class="mut">ราคารวมที่จ่าย (บาท)</label><input id="rt" type="number" step="any" min="0" oninput="recvCalc()" style="width:100%"><div class="row"><span>ราคาต่อหน่วย</span><b id="ru">—</b></div><label class="mut">หมายเหตุ / ร้านค้า (ไม่บังคับ)</label><input id="rn" style="width:100%"><p class="mut">ระบบใช้ของล็อตเก่าก่อน และคิดต้นทุนตามราคาของแต่ละล็อต</p><div class="acts"><button class="pri" id="r_ok" onclick="recvSave()">บันทึกรับเข้า</button><button onclick="closeDlg()">ยกเลิก</button></div>`);
}
async function recvSave(){
  const q=Number($('#rq').value),t=$('#rt').value;if(!(q>0))return alert('กรอกจำนวนที่รับ');if(t==='')return alert('กรอกราคารวมที่จ่าย');
  await act(async()=>{try{await run('receiveStock',pin,window._rid,q,Number(t),$('#rn').value);closeDlg();await vStock();}catch(e){err(e);}});
}
function adjDlg(id){
  const i=(window._stk||[]).find(x=>x.ing_id==id);if(!i)return;window._rid=id;
  dlg(`<h3>ปรับสต็อก · ${esc(i.name)}</h3><div class="mut">ในระบบ ${c4(i.stock)} ${esc(i.unit)}</div><label class="mut">จำนวนที่ปรับ (ใส่ - ถ้าลด เช่น ของเสีย)</label><input id="aq" type="number" step="any" style="width:100%"><label class="mut">เหตุผล</label><input id="ar" value="ของเสีย" style="width:100%"><p class="mut">ถ้าลดสต็อก ระบบนับเป็นต้นทุน "ของเสีย/ส่วนต่าง" ของวันนี้ ถ้าเพิ่ม ใช้ราคาล่าสุดของวัตถุดิบ (ถ้ารับของมาใหม่ให้ใช้ "รับของเข้า")</p><div class="acts"><button class="pri" id="a_ok" onclick="adjSave()">บันทึก</button><button onclick="closeDlg()">ยกเลิก</button></div>`);
}
async function adjSave(){
  const n=Number($('#aq').value);if(!n)return alert('กรอกจำนวนที่ปรับ');
  await act(async()=>{try{await run('adjustStock',pin,window._rid,n,$('#ar').value||'ปรับสต็อก');closeDlg();await vStock();}catch(e){err(e);}});
}

async function vSum(day){
  const d=await run('summary',pin,typeof day=='string'?day:'');window._sm=d;
  const TL={SALE:'วัตถุดิบที่ขาย',COUNT:'ของนอกสูตรที่ใช้',WASTE:'ของเสีย/ส่วนต่าง'};
  const det=d.cost.lines.length?`<details><summary class="mut">ดูรายละเอียด</summary>${d.cost.lines.map(u=>`<div class="row"><span>${esc(u.name)} <span class="mut">${c4(u.qty)} ${esc(u.unit)} · ${TL[u.type]||u.type}</span></span><span>${c4(u.cost)} ฿</span></div>`).join('')}</details>`:'';
  const line=(t,v,id)=>`<div class="row"><span>${t}</span><b${id?` id="${id}"`:''}>${c4(v)} ฿</b></div>`;
  const costCard=`<div class="card"><h3>ต้นทุนและกำไร${d.estimated?' (ประมาณการ)':''}</h3>${line('ต้นทุนวัตถุดิบที่ขาย (FIFO)',d.cost.sale)}${line('ของนอกสูตรที่ใช้ (ถุง แก้ว ซอส)',d.cost.count,'cf_c')}${line('ของเสีย/ส่วนต่างสต็อก',d.cost.waste,'cf_w')}${line('ค่าใช้จ่ายรายวัน (ค่าแรง ฯลฯ)',d.expTotal,'cf_e')}${det}<div class="row"><span><b>กำไร</b></span><b id="cf_p" class="${d.profit<0?'low':''}">${c4(d.profit)} ฿</b></div>${d.estimated?'<p class="mut">ต้นทุนของนอกสูตร ของเสีย และค่าแรง จะนับเมื่อกรอกและปิดวัน · ค่าใช้จ่ายรายเดือนดูที่แท็บรายงาน</p>':''}</div>`;
  const exRow=e=>`<div class="row ex"><input class="en" placeholder="ชื่อรายการ" value="${esc(e.name)}" style="flex:1;min-width:0"><input class="ea" type="number" step="any" min="0" placeholder="บาท" value="${e.amount===''?'':e.amount}" oninput="cuCalc()" style="width:112px"><button onclick="this.parentNode.remove();cuCalc()">✕</button></div>`;
  window._exRow=exRow;
  const ctRow=p=>`<div class="row"><span>${esc(p.name)} <span class="mut">(ในระบบ ${c4(p.stock)} ${esc(p.unit)} · ${c4(p.cost)} ฿/${esc(p.unit)})</span></span><input class="ct" data-id="${p.ing_id}" type="number" min="0" step="any" placeholder="เหลือ" oninput="cuCalc()" style="width:112px"></div>`;
  const dfCell=(s,v)=>{if(v==null)return '<span class="df mut">—</span>';const x=r4(v-s);return `<span class="df ${x==0?'':'low'}">${x==0?'ตรง ✓':(x>0?'+':'')+c4(x)}</span>`;};
  const tot=r4(d.rows.reduce((a,r)=>a+r.sales,0));
  let salesCard;
  if(d.closed){
    const byK={};(d.checks||[]).forEach(c=>byK[c.key]=c);
    salesCard=`<div class="card"><input type="date" value="${d.day}" onchange="vSum(this.value)"><h3>ยอดขาย ${money(d.total)} บาท (${d.count} ออเดอร์)</h3>${d.discount||d.fee?`<div class="mut">สินค้า ${money(d.total-(d.fee||0)+(d.discount||0))}${d.discount?` − ส่วนลดค่าสินค้า ${money(d.discount)}`:''}${d.fee?` + ค่าส่ง ${money(d.fee)}`:''} = ${money(d.total)} บาท</div>`:''}<table class="ck"><tr><th align="left">ช่องทาง</th><th class="r">ยอดขาย</th><th class="r">เช็คยอด</th><th class="r">ส่วนต่าง</th></tr>${d.rows.map(r=>{const c=byK[r.key]||{};return `<tr><td>${esc(r.label)}</td><td class="r">${money(r.sales)}</td><td class="r">${c.checked==null?'—':money(c.checked)}</td><td class="r">${dfCell(r.sales,c.checked==null?null:c.checked)}</td></tr>`;}).join('')}<tr><td><b>รวม</b></td><td class="r"><b>${money(tot)}</b></td><td></td><td></td></tr></table><div class="row"><span>เงินทอนที่กันไว้ (ไม่รวมในยอดขาย)</span><b>${money(d.closed.float)} บาท</b></div><div class="mut">เงินสดในลิ้นชักทั้งหมด ${money(d.closed.drawer)} บาท = เงินสดขาย ${money(d.closed.counted)} + เงินทอน ${money(d.closed.float)}</div></div>`;
  }else{
    salesCard=`<div class="card"><input type="date" value="${d.day}" onchange="vSum(this.value)"><h3>ยอดขาย ${money(d.total)} บาท (${d.count} ออเดอร์)</h3>${d.discount||d.fee?`<div class="mut">สินค้า ${money(d.total-(d.fee||0)+(d.discount||0))}${d.discount?` − ส่วนลดค่าสินค้า ${money(d.discount)}`:''}${d.fee?` + ค่าส่ง ${money(d.fee)}`:''} = ${money(d.total)} บาท</div>`:''}<h3>เช็คยอดแต่ละช่องทาง</h3><div class="mut">กรอกยอดจริงที่ได้รับ เช่น ยอดโอนจากแอปธนาคาร ยอดที่ Grab จ่ายให้ ช่องไหนเว้นว่าง = ไม่เช็ค</div>
    <div class="row"><span>นับเงินสดในลิ้นชักทั้งหมด</span><input id="cnt" type="number" step="any" min="0" placeholder="บาท" oninput="ckSum()" style="width:132px"></div>
    <div class="row"><span>เงินทอนที่กันไว้ <span class="mut">(ไม่นับเป็นยอดขาย)</span></span><input id="flt" type="number" step="any" min="0" value="${d.lastFloat}" oninput="ckSum()" style="width:132px"></div>
    <table class="ck" id="ckt"><tr><th align="left">ช่องทาง</th><th class="r">ยอดขาย</th><th class="r">เช็คยอด</th><th class="r">ส่วนต่าง</th></tr>${d.rows.map(r=>`<tr data-k="${esc(r.key)}" data-s="${r.sales}"><td>${esc(r.label)}</td><td class="r">${money(r.sales)}</td><td class="r">${r.key=='CASH'?'<span id="cash_chk" class="mut">—</span>':'<input class="chk" type="number" step="any" min="0" placeholder="ยอดจริง" oninput="ckSum()" style="width:112px">'}</td><td class="r"><span class="df mut">—</span></td></tr>`).join('')}<tr><td><b>รวม</b></td><td class="r"><b>${money(tot)}</b></td><td></td><td></td></tr></table>${Math.abs(d.splitDiff)>0.005?`<div class="mut">ยอดแยกช่องทางต่างจากยอดขายรวม ${c4(d.splitDiff)} บาท (ออเดอร์ที่ชำระข้ามวัน)</div>`:''}<div class="row"><span>เงินทอนที่กันไว้ (แยกต่างหาก ไม่รวมยอดขาย)</span><b id="fl_show">${money(d.lastFloat)} บาท</b></div></div>`;
  }
  let closeBox;
  if(d.closed)closeBox=`<p>ปิดแล้ว · เงินสดขายที่นับได้ ${money(d.closed.counted)} · ส่วนต่างเงินสด ${money(d.closed.diff)}</p>${d.expenses.length?`<div class="mut">ค่าใช้จ่ายรายวัน: ${d.expenses.map(e=>esc(e.name)+' '+money(e.amount)).join(' · ')}</div>`:''}${role=='owner'&&d.canReopen?`<div class="acts"><button onclick="reopenD('${d.day}')">เปิดวันอีกครั้ง (แก้ไขรายการปิดวัน)</button></div>`:''}`;
  else{
    const packs=d.items.filter(i=>i.is_pack),recs=d.items.filter(i=>!i.is_pack);
    closeBox=`${d.blockers?`<p class="low">ยังมี ${d.blockers} ออเดอร์ค้างอยู่ (รอชำระ/กำลังทำ/พร้อมรับ) ต้องจัดการให้เรียบร้อยก่อนปิดวัน</p>`:''}<input id="nt" placeholder="หมายเหตุ" style="width:100%">
    <h3>ของนอกสูตร — นับจำนวนที่เหลือจริง</h3><div class="mut">ถุง แก้ว ซอส ฯลฯ ช่องไหนเว้นว่าง = วันนี้ไม่นับ ส่วนที่หายไปคิดเป็นต้นทุน</div>${packs.length?packs.map(ctRow).join(''):'<p class="mut">ยังไม่มีรายการ — ไปที่ สูตร → แก้ไขวัตถุดิบ → ติ๊ก "ของนอกสูตร"</p>'}
    <details><summary class="mut">นับวัตถุดิบในสูตร (ไม่บังคับ — ดูของเสีย/ส่วนต่าง)</summary>${recs.map(ctRow).join('')}</details>
    <h3>ค่าใช้จ่ายรายวัน</h3><div id="exs">${(d.lastExpenses.length?d.lastExpenses:[{name:'ค่าแรง',amount:''}]).map(exRow).join('')}</div><div class="acts"><button onclick="addEx()">+ เพิ่มรายการ</button></div>
    <button class="pri" onclick="closeD('${d.day}')">ปิดวัน</button>`;
  }
  $('#main').innerHTML=`${salesCard}${costCard}<div class="card"><h3>ปิดวัน</h3>${closeBox}</div>`;
}
function ckSum(){ // เทียบยอดจริงกับยอดขายทีละช่องทาง (เงินสด = นับในลิ้นชัก − เงินทอนที่กันไว้)
  const d=window._sm;if(!d||d.closed||!$('#ckt'))return;
  const cnt=$('#cnt').value,flt=Number($('#flt').value)||0;
  document.querySelectorAll('#ckt tr[data-k]').forEach(tr=>{
    const k=tr.dataset.k,s=Number(tr.dataset.s);let v=null;
    if(k=='CASH'){v=cnt===''?null:r4(Number(cnt)-flt);$('#cash_chk').textContent=v==null?'—':money(v);}
    else{const x=tr.querySelector('.chk').value;v=x===''?null:Number(x);}
    const e=tr.querySelector('.df');
    if(v==null){e.textContent='—';e.className='df mut';}else{const df=r4(v-s);e.textContent=df==0?'ตรง ✓':(df>0?'+':'')+c4(df);e.className='df '+(df==0?'':'low');}
  });
  $('#fl_show').textContent=money(flt)+' บาท';
}
function addEx(){$('#exs').insertAdjacentHTML('beforeend',window._exRow({name:'',amount:''}));}
function cuCalc(){
  const d=window._sm;if(!d||d.closed||!$('#cf_p'))return;
  let c=0,w=0,e=0;
  document.querySelectorAll('.ct').forEach(x=>{if(x.value==='')return;const p=d.items.find(i=>i.ing_id==x.dataset.id),used=p?Math.max(0,p.stock-(Number(x.value)||0)):0;if(!p)return;if(p.is_pack)c+=used*p.cost;else w+=used*p.cost;});
  document.querySelectorAll('.ex .ea').forEach(x=>e+=Number(x.value)||0);
  c=r4(c);w=r4(w);e=r4(e);const g=r4(d.total-d.cost.sale-c-w-e);
  $('#cf_c').textContent=c4(c)+' ฿';$('#cf_w').textContent=c4(w)+' ฿';$('#cf_e').textContent=c4(e)+' ฿';const p=$('#cf_p');p.textContent=c4(g)+' ฿';p.className=g<0?'low':'';
}
async function closeD(day){
  const c=$('#cnt').value;if(c==='')return alert('กรอกยอดเงินสดที่นับได้ (นับรวมเงินทอนในลิ้นชัก)');
  const flt=Number($('#flt').value)||0,checks={};document.querySelectorAll('#ckt .chk').forEach(e=>{if(e.value!=='')checks[e.closest('tr').dataset.k]=Number(e.value);});
  const counts={};document.querySelectorAll('.ct').forEach(e=>{if(e.value!=='')counts[e.dataset.id]=Number(e.value);});
  const expenses=[...document.querySelectorAll('.ex')].map(r=>({name:r.querySelector('.en').value,amount:Number(r.querySelector('.ea').value)||0}));
  const d=window._sm,noPack=d.items.some(i=>i.is_pack)&&!d.items.some(i=>i.is_pack&&counts[i.ing_id]!==undefined);
  if(!await ask((noPack?'ยังไม่ได้นับถุง/แก้ว/ซอสเลย ต้นทุนส่วนนี้จะไม่ถูกนับ\n\n':'')+'ปิดวันแล้วจะรับออเดอร์เพิ่มของวันนี้ไม่ได้ (เจ้าของเปิดวันอีกครั้งได้) ปิดวันเลยหรือไม่?'))return;
  await act(async()=>{try{const r=await run('closeDay',pin,day,Number(c),$('#nt').value,{counts:counts,expenses:expenses,float:flt,checks:checks});alert('ส่วนต่างเงินสด '+r.diff+' บาท · กำไรวันนี้ '+c4(r.profit)+' บาท');await vSum(day);}catch(e){err(e);}});
}
async function reopenD(day){
  if(!await ask('เปิดวันนี้อีกครั้ง? ระบบจะคืนสต็อกที่นับ คืนล็อต และลบรายการต้นทุน/ค่าใช้จ่ายของวันนี้ แล้วต้องปิดวันใหม่'))return;
  await act(async()=>{try{await run('reopenDay',pin,day);await vSum(day);}catch(e){err(e);}});
}
/* ---- เจ้าของ: ตั้งค่า / เมนู / สูตร ---- */
function pickImg(max,cb){
  const f=document.createElement('input');f.type='file';f.accept='image/*';
  f.onchange=()=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
    const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
    let q=.8,u;do{u=c.toDataURL('image/jpeg',q);q-=.1}while(u.length>250000&&q>.2);cb(u)};im.src=r.result};r.readAsDataURL(f.files[0])};
  f.click();
}
async function vSet(){
  const d=await run('getSettings',pin),s=d.settings;s.pending_max_min=s.pending_max_min||30;s.change_float=s.change_float||0;
  const printOn=s.print_slip===undefined||s.print_slip===''||Number(s.print_slip)!==0,dp=s.delivery_platforms||'Grab\nLINE MAN\nFoodpanda\nShopee Food';
  const on=k=>Number(s[k])===1||String(s[k]).toLowerCase()==='true';
  const f=(k,l,t,ph)=>`<label class="mut">${l}</label><input id="s_${k}" type="${t||'text'}" value="${esc(s[k])}" ${ph?`placeholder="${esc(ph)}"`:''} style="width:100%">`;
  const base=d.base||'',lk=p=>base?base+(base.indexOf('?')<0?'?':'&')+'page='+p:'(Deploy เป็น Web app ก่อนจึงจะมีลิงก์)';
  window._trialSeq=d.trial.seq;
  $('#main').innerHTML=`<div class="card"><h3>โลโก้ร้าน</h3>${d.logo?`<img class="logo" src="${d.logo}"><br>`:'<p class="mut">ยังไม่มีโลโก้</p>'}<button onclick="upLogo()">อัปโหลดโลโก้</button> ${d.logo?'<button onclick="delLogo()">ลบ</button>':''}</div>
  <div class="card"><h3>ข้อมูลร้าน</h3>${f('shop_name','ชื่อร้าน (แสดงหน้าสั่งของลูกค้า)')}${f('queue_prefix','ตัวอักษรนำหน้าเลขคิว เช่น A → คิว A01, A02')}${f('prep_min_per_queue','ทำ 1 คิวใช้เวลากี่นาที (ใช้ประมาณเวลารอให้ลูกค้า)','number')}${f('parallel_slots','ทำพร้อมกันได้กี่คิว (ถ้าคนเดียวใส่ 1)','number')}</div>
  <div class="card"><h3>บริการลูกค้า</h3>
  <label class="mut">การชำระเงิน</label><select id="s_pay_mode" style="width:100%"><option value="FIRST" ${s.pay_mode!='LATER'?'selected':''}>จ่ายก่อนทำ — ลูกค้าสั่งแล้วมาจ่ายที่เคาน์เตอร์ ร้านถึงเริ่มทำ</option><option value="LATER" ${s.pay_mode=='LATER'?'selected':''}>จ่ายตอนรับของ / รวมบิล — ร้านเริ่มทำทันที เก็บเงินทีหลัง (ต้องกรอกชื่อ+เบอร์)</option></select>
  <label style="display:block;margin:8px 0"><input type="checkbox" id="s_contact_req" ${+s.contact_req?'checked':''}> บังคับลูกค้ากรอกชื่อ + เบอร์โทร <span class="mut">(แบบจัดส่งบังคับอยู่แล้ว · จ่ายตอนรับของไม่บังคับ)</span></label>
  <label style="display:block;margin:8px 0"><input type="checkbox" id="s_delivery_on" ${+s.delivery_on?'checked':''}> เปิดบริการ ร้านจัดส่งเอง</label>
  <label class="mut">พื้นที่จัดส่ง — บรรทัดละ 1 พื้นที่ รูปแบบ: ชื่อพื้นที่ | ค่าส่ง | สั่งขั้นต่ำ | ส่งฟรีเมื่อครบ</label><textarea id="s_delivery_zones" rows="4" style="width:100%" placeholder="หมู่บ้านสุขใจ | 20 | 100 | 300&#10;ตำบลบางพลี | 40 | 150&#10;ตลาดเก่า | 0">${esc(s.delivery_zones||'')}</textarea>
  <div class="mut">ตัวอย่างบรรทัดแรก: ส่งหมู่บ้านสุขใจ ค่าส่ง 20 บาท สั่งขั้นต่ำ 100 บาท ส่งฟรีเมื่อครบ 300 บาท (ช่องหลังๆ เว้นว่างได้)</div>
  <h3 style="margin-top:14px">จ่ายด้วย QR โอนเงิน</h3><div class="mut">อัปโหลดรูป QR รับเงินของร้าน (บันทึกภาพจากแอพธนาคาร) ลูกค้าจะเห็นปุ่ม "จ่ายด้วย QR / แนบสลิป" ตอนสั่ง แล้วร้านเปิดดูสลิปตรวจสอบที่การ์ดออเดอร์</div>${d.qr?`<img src="${d.qr}" style="width:180px;border:1px solid var(--bd);border-radius:10px;margin:6px 0"><br>`:'<p class="mut">ยังไม่มี QR</p>'}<div class="acts"><button onclick="upQr()">${d.qr?'เปลี่ยนรูป QR':'อัปโหลดรูป QR'}</button>${d.qr?'<button onclick="delQr()">ลบ QR</button>':''}</div>
  <label class="mut"><b>ทางเลือก A (แนะนำ):</b> เลขพร้อมเพย์ของร้าน — ระบบสร้าง QR <b>พร้อมยอดเงิน</b> ให้ลูกค้าอัตโนมัติ (เบอร์มือถือ 10 หลัก หรือเลขบัตร ปชช./นิติบุคคล 13 หลัก)</label><input id="s_pay_promptpay" inputmode="numeric" maxlength="20" value="${esc(s.pay_promptpay||'')}" placeholder="เช่น 0812345678" style="width:100%">
  <div class="mut"><b>ทางเลือก B:</b> อัปโหลดรูป QR ด้านบน (ไม่มียอด) ใช้เมื่อรับด้วยเลขบัญชีธนาคารตรงๆ ถ้าตั้งทางเลือก A ไว้ ระบบจะใช้ A ก่อน</div>
  <label class="mut">ข้อความใต้ QR (ไม่บังคับ) เช่น พร้อมเพย์ 081-234-5678 ชื่อบัญชี ร้านปังคำ</label><input id="s_pay_qr_note" maxlength="150" value="${esc(s.pay_qr_note||'')}" style="width:100%">
  <label class="mut">ข้อความแจ้งลูกค้าเรื่องการส่ง (ไม่บังคับ)</label><input id="s_delivery_note" maxlength="200" value="${esc(s.delivery_note||'')}" style="width:100%" placeholder="เช่น ส่งเวลา 10:00-20:00 ใช้เวลาประมาณ 30-45 นาที">
  </div>
  <details class="adv"><summary class="hpsum">⚙️ ตั้งค่าอื่นๆ (ไม่จำเป็นตอนเริ่ม — ค่อยมาตั้งทีหลังได้)</summary><div class="card"><h3>เวลารอชำระเงิน</h3>${f('pending_expire_min','รอชำระพื้นฐาน (นาที) — ลูกค้าสั่งเองแล้วต้องมาจ่ายภายในเวลานี้ ไม่งั้นออเดอร์ถูกยกเลิก','number')}${f('pending_max_min','รอชำระสูงสุดรวมเวลารอคิว (นาที)','number')}</div>
  <div class="card"><h3>กันออเดอร์ปลอม</h3><div class="mut">ออเดอร์ที่ลูกค้าสั่งเองแต่ยังไม่จ่ายจะจองสต็อกไว้ จึงจำกัดไว้ดังนี้ (เครื่องที่ปล่อยออเดอร์หมดอายุซ้ำ 3 ครั้งจะถูกบล็อก 2 ชม. อัตโนมัติ · ปุ่ม "ยกเลิก+บล็อกเครื่อง" ที่หน้าออเดอร์บล็อก 24 ชม.)</div>${f('max_pending_per_device','ออเดอร์ค้างชำระได้สูงสุดต่อ 1 เครื่อง','number')}${f('max_pending_total','ออเดอร์ค้างชำระรวมทั้งร้านสูงสุด','number')}${f('cust_max_items','จำนวนรายการสูงสุดที่ลูกค้าสั่งเองต่อ 1 ออเดอร์','number')}</div>
  <div class="card"><h3>จอแสดงคิวหน้าร้าน (ทีวี)</h3><div class="mut">เปิดลิงก์นี้บนทีวี/แท็บเล็ต ไม่ต้องใช้ PIN แสดงเลขคิวที่พร้อมรับ มีเสียงเตือนเมื่อมีคิวใหม่ (แตะหน้าจอ 1 ครั้งเพื่อเปิดเสียง)</div><input readonly value="${esc(lk('display'))}" onclick="this.select()" style="width:100%">${f('display_msg','ข้อความวิ่งใต้จอ (ไม่บังคับ) เช่น ขอบคุณที่อุดหนุนค่ะ')}</div>
  <details class="adv"><summary class="hpsum">🧪 โหมดทดลอง (ใช้ตอนทดสอบระบบ — ปกติไม่ต้องเปิด)</summary><div class="card">
  <div class="mut">ไว้ให้คนลองใช้ระบบหรือเก็บข้อมูลวิจัย ไม่ต้องใช้ตอนขายจริง</div>
  <h3>① เลขคิวช่วงทดลอง</h3>
  <label><input type="checkbox" id="s_trial_on" ${on('trial_on')?'checked':''}> เปิดช่วงทดลอง — เลขคิวของทุกออเดอร์รันต่อเนื่อง (เช่น T01, T02 … ไม่รีเซ็ตรายวัน) และใช้เลขคิวนี้เป็นรหัสกรอกในแบบสอบถาม จนกว่าจะกดรีเซ็ต</label>
  ${f('trial_prefix','ตัวอักษรนำหน้าเลขคิวช่วงทดลอง (1 ตัว เช่น T) — เลขรัน 2 หลักก่อน เกิน 99 เป็น 3 หลัก เกิน 999 เป็น 4 หลัก','text')}
  <div class="row"><span>เลขคิวช่วงทดลองล่าสุด: <b>${window._trialSeq}</b></span><button onclick="resetTrialUi()">รีเซ็ตเลขคิว</button></div>
  <div class="row"><button onclick="exportTrialUi()">ส่งออกข้อมูลช่วงทดลอง (เทียบกับงานวิจัย)</button><span id="tx" class="mut">บันทึกเลขคิว/รหัส รายการ เวลาสั่ง-ชำระ-พร้อมรับ ของทุกรอบลงแท็บ Trial_Log</span></div>
  <h3 style="margin-top:14px">② ให้ลูกค้าทดลองสั่งโดยไม่ต้องจ่ายเงินจริง</h3>
  <select id="s_trial_mode" style="width:100%"><option value="off" ${!on('trial_auto')?'selected':''}>ปิด — ออเดอร์จริงตามปกติ</option><option value="manual" ${on('trial_auto')&&(s.trial_manual==null||on('trial_manual'))?'selected':''}>ลูกค้ากดปุ่มสีเขียว "ขั้นต่อไป" เองทีละขั้น (แนะนำ)</option><option value="timed" ${on('trial_auto')&&s.trial_manual!=null&&!on('trial_manual')?'selected':''}>ระบบเลื่อนขั้นให้เองตามเวลา</option></select>
  <div class="mut">ใช้กับออเดอร์ที่ลูกค้าสั่งเองเท่านั้น และไม่นับเป็นยอดขายจริง</div>
  ${f('trial_step_sec','(เฉพาะแบบเลื่อนตามเวลา) วินาทีต่อ 1 ขั้นตอน 2-120','number')}
  </div></details>
  <div class="card"><h3>แบบสอบถาม</h3>
  ${f('survey_url','ลิงก์แบบสอบถาม (Google Form) — ลูกค้าจะเห็นปุ่มนี้หลังรับสินค้าเรียบร้อยแล้ว (สถานะ "รับแล้ว")','url','https://forms.gle/...')}
  <label class="mut">ข้อความเชิญชวน (ไม่บังคับ) — แสดงเหนือปุ่มทำแบบสอบถาม</label><textarea id="s_survey_msg" rows="3" placeholder="เช่น ช่วยตอบแบบสอบถาม 1 นาที ให้เราปรับปรุงร้านให้ดีขึ้น ขอบคุณค่ะ" style="width:100%">${esc(s.survey_msg||'')}</textarea>
  <h3 style="margin-top:14px">กิจกรรม</h3>
  ${f('activity_title','ชื่อกิจกรรม — ใส่แล้วลูกค้าจะเห็นปุ่ม "เข้าร่วมกิจกรรม" (เว้นว่าง = ปิด)','text','เช่น ลุ้นรับของรางวัลประจำเดือน')}
  <label class="mut">รายละเอียด/กติกา (ไม่บังคับ)</label><textarea id="s_activity_msg" rows="3" style="width:100%">${esc(s.activity_msg||'')}</textarea>
  <button onclick="vAct()">ดูรายชื่อผู้เข้าร่วมกิจกรรม</button>
  </div>
  <div class="card"><h3>เงินทอน</h3>${f('change_float','เงินทอนตั้งต้น (บาท) — ค่าเริ่มต้นของ "เงินทอนที่กันไว้" ตอนปิดวัน','number')}</div>
  <div class="card"><h3>ใบเสร็จ</h3><label><input type="checkbox" id="s_print_slip" ${printOn?'checked':''}> พิมพ์ใบเสร็จอัตโนมัติ<div class="mut">ปิดไว้ถ้าร้านไม่มีเครื่องพิมพ์ ให้ดูออเดอร์จากหน้าจอแทน</div></label></div>
  <div class="card"><h3>เดลิเวอรี่</h3><label class="mut">เจ้าที่ร้านใช้ (บรรทัดละ 1 เจ้า) แสดงในหน้าสั่งแทนและหน้าสรุป</label><textarea id="s_delivery_platforms" rows="5" style="width:100%">${esc(dp)}</textarea></div>
  <div class="card"><h3>หน้าสั่งของลูกค้า</h3><label class="mut">คำอธิบายการสั่ง (แสดงในหน้าสั่งของลูกค้า)</label><textarea id="s_order_note" rows="4" style="width:100%">${esc(s.order_note)}</textarea></div>
  <div class="card"><h3>PIN</h3><div class="mut">PIN ตอนนี้แยกรายพนักงาน จัดการได้ที่เมนู "พนักงาน" · เปลี่ยน PIN ของตัวเองได้ที่ลิงก์ใต้ชื่อร้านด้านบน</div></div></details><div class="card" id="ver_card"><h3>เวอร์ชันระบบ</h3><div class="row"><span>ใช้อยู่ <b>${esc(d.ver||'-')}</b>${d.verDate?' ('+esc(d.verDate)+')':''}</span><button onclick="chkVer()">ตรวจเวอร์ชันใหม่</button> <button onclick="chkReady()">🩺 ตรวจความพร้อม</button></div>${f('update_url','ลิงก์ไฟล์เวอร์ชันล่าสุด (ผู้ให้บริการระบบให้มา) — เว้นว่าง = ไม่ตรวจ','url','https://...')}<div id="ver_r" class="mut" style="margin-top:6px"></div></div><button class="pri" onclick="saveSet()">บันทึกการตั้งค่า</button>`;
  if(s.update_url)chkVer(1);
  if(window._toVer){window._toVer=0;const e=$('#ver_card');if(e)e.scrollIntoView();}
}
const runq=(fn,...a)=>new Promise((ok,no)=>google.script.run.withSuccessHandler(ok).withFailureHandler(no)[fn](...a)); // เรียกเซิร์ฟเวอร์แบบเงียบ/ไม่จำกัดเวลา (ไม่นับใน _pend ที่ใช้กันกดซ้ำ)
function updBanner(){
  const e=$('#updb');if(!e)return;const u=window._upd;
  if(role!='owner'||!u||!u.newer){e.style.display='none';return;}
  e.style.display='block';
  e.innerHTML='🔔 <b>มีเวอร์ชันใหม่ '+esc(u.latest)+'</b>'+(u.date?' ('+esc(u.date)+')':'')+(u.notes?'<div style="font-size:16px">'+esc(u.notes)+'</div>':'')+'<div class="acts"><button class="pri" onclick="goUpdate()">ไปอัปเดตที่ ตั้งค่า</button></div>';
}
function goUpdate(){window._toVer=1;if(tab=='set'){const e=$('#ver_card');if(e)e.scrollIntoView();}else goTab('set');}
async function chkBanner(){ // ตรวจเวอร์ชันใหม่เงียบๆ หลังเข้าสู่ระบบและทุกชั่วโมง (ฝั่งเซิร์ฟเวอร์เก็บผลไว้ 6 ชม. ไม่ยิง GitHub ทุกครั้ง)
  if(role!='owner'||!pin)return;
  try{window._upd=await runq('checkUpdate',pin,false);updBanner();}catch(e){}
}
async function chkVer(auto){
  const el=$('#ver_r');if(!el)return;
  if(!auto){try{await run('saveUpdateUrl',pin,$('#s_update_url').value);}catch(e){el.innerHTML='<span class="low">'+esc(e&&e.message?e.message:e)+'</span>';return;}}
  el.textContent='กำลังตรวจ...';
  try{
    const r=await run('checkUpdate',pin,!auto);window._upd=r;updBanner();
    el.innerHTML=r.newer
      ?'<b class="low">มีเวอร์ชันใหม่ '+esc(r.latest)+(r.date?' ('+esc(r.date)+')':'')+'</b>'+(r.notes?'<div>'+esc(r.notes)+'</div>':'')
        +(r.canApply?'<div class="acts"><button class="pri" id="upd_go" onclick="doUpdate()">⬆️ อัปเดตระบบตอนนี้</button></div><div class="mut" style="font-size:15px">ระบบจะดึงโค้ดใหม่จาก GitHub มาติดตั้งให้เอง · ข้อมูลในชีตไม่ถูกแตะ · สำรองเวอร์ชันเดิมไว้ให้ย้อนกลับได้</div>'
          :(r.link?'<div><a href="'+esc(r.link)+'" target="_blank" rel="noopener">วิธีอัปเดต</a></div>':''))
      :'✓ เป็นเวอร์ชันล่าสุดแล้ว ('+esc(r.latest)+')';
  }catch(e){el.innerHTML=auto?'':'<span class="low">'+esc(e&&e.message?e.message:e)+'</span>';}
}
async function chkReady(){
  const el=$('#ver_r');if(!el)return;el.textContent='กำลังตรวจความพร้อม... (ประมาณ 5-15 วินาที)';
  try{
    const r=await run('checkReady',pin),bad=r.filter(c=>!c.ok).length;
    el.innerHTML=(bad?'<b class="low">ยังไม่พร้อม '+bad+' ข้อ</b>':'<b>✓ พร้อมใช้ปุ่มอัปเดตแล้ว</b>')+r.map(c=>'<div style="margin:6px 0">'+(c.ok?(c.warn?'⚠️':'✅'):'❌')+' <b>'+esc(c.name)+'</b>'+(c.msg?'<div class="mut" style="white-space:pre-line;font-size:15px">'+esc(c.msg)+'</div>':'')+(c.link&&/^https:\/\//.test(c.link)?'<div><a href="'+esc(c.link)+'" target="_blank" rel="noopener">'+esc(c.linkText||'เปิดลิงก์')+'</a></div>':'')+'</div>').join('');
  }catch(e){el.innerHTML='<span class="low" style="white-space:pre-line">'+esc(e&&e.message?e.message:e)+'</span>';}
}
async function doUpdate(){
  const u=window._upd;if(!u||!u.newer)return;
  if(!confirm('อัปเดตระบบเป็นเวอร์ชัน '+u.latest+' ?\n\n• ใช้เวลาประมาณ 20-60 วินาที อย่าปิดหน้านี้\n• ควรทำตอนไม่มีลูกค้าสั่งอยู่ (หน้าที่เปิดค้างอยู่ต้องรีเฟรช)\n• สำรองโค้ดเวอร์ชันเดิมไว้ให้ย้อนกลับได้\n• ข้อมูลในชีตไม่ถูกแตะ'))return;
  const el=$('#ver_r'),b=$('#upd_go');if(b)b.disabled=true;
  el.textContent='กำลังอัปเดต... (ดึงไฟล์จาก GitHub → ตรวจความถูกต้อง → ติดตั้ง → เปิดใช้เวอร์ชันใหม่) กรุณารอ';
  try{
    const r=await runq('applyUpdate',pin);
    if(r.deployed){el.innerHTML='<b>✓ อัปเดตเป็นเวอร์ชัน '+esc(r.to)+' แล้ว</b> กำลังโหลดหน้าใหม่...'+(r.warn?'<div class="low" style="white-space:pre-line">⚠️ '+esc(r.warn)+'</div>':'');setTimeout(()=>location.reload(),r.warn?9000:2500);}
    else el.innerHTML='<b class="low">ติดตั้งโค้ดเวอร์ชัน '+esc(r.to)+' แล้ว แต่ยังไม่ได้เปิดใช้อัตโนมัติ</b><div style="white-space:pre-line">'+esc(r.msg||'')+'</div>';
  }catch(e){if(b)b.disabled=false;el.innerHTML='<span class="low" style="white-space:pre-line">'+esc(e&&e.message?e.message:e)+'</span>';}
}
async function saveSet(){
  const o=setObj();
  try{await run('saveSettings',pin,o);window._print=o.print_slip!='0';window._h=null;alert('บันทึกแล้ว');vSet();}catch(e){err(e);}
}
function upLogo(){pickImg(400,async u=>{try{await run('saveLogo',pin,u);window._imgs=null;window._logo=undefined;vSet();}catch(e){err(e);}});}
async function delLogo(){try{await run('saveLogo',pin,'');window._imgs=null;window._logo=undefined;vSet();}catch(e){err(e);}}

async function vMenu(){
  const d=await run('getMenuAdmin',pin);window._menus=d.menus;
  $('#main').innerHTML=`<button class="pri" onclick="editMenu()">+ เพิ่มเมนู / ชุดเซ็ต</button>`+d.menus.map((m,k)=>`<div class="row card"><div style="display:flex;gap:10px;align-items:center">${m.img?`<img class="thumb" src="${m.img}">`:'<div class="thumb"></div>'}<div><b>${esc(m.name)}</b>${m.type=='SET'?' <span class="tag">เซ็ต</span>':''}${m.active?'':' <span class="mut">(ปิดขาย)</span>'}<div class="mut">${money(m.price)} บาท/${esc(m.unit||'ชิ้น')} · ${m.menu_id}</div>${m.type=='SET'?`<div class="mut">${m.items.map(i=>esc((d.menus.find(x=>x.menu_id==i.menu_id)||{}).name||i.menu_id)+' ×'+i.qty).join(' + ')}</div>`:''}</div></div><div style="display:flex;gap:4px;align-items:center"><button ${k==0?'disabled':''} onclick="mvMenu('${m.menu_id}',-1)" aria-label="เลื่อนขึ้น">▲</button><button ${k==d.menus.length-1?'disabled':''} onclick="mvMenu('${m.menu_id}',1)" aria-label="เลื่อนลง">▼</button><button onclick="editMenu('${m.menu_id}')">แก้ไข</button><button style="color:#dc2626;border-color:#dc2626" onclick="delMenu('${m.menu_id}')" aria-label="ลบ">ลบ</button></div></div>`).join('');
}
async function delMenu(id){const m=(window._menus||[]).find(x=>x.menu_id==id);if(!m)return;if(!await ask('ลบ "'+m.name+'" ถาวร?\n\n• สูตรและรูปของเมนูนี้จะถูกลบด้วย\n• ออเดอร์เก่าและรายงานยังอยู่ครบ\n• ถ้าแค่หยุดขายชั่วคราว ให้กด "แก้ไข" แล้วติ๊กปิดขายแทน'))return;act(async()=>{try{await run('deleteMenu',pin,id);window._sm=null;window._imgs=null;await vMenu();}catch(e){err(e);}});}
async function delIng(id){const i=((window._bom||{}).ingredients||[]).find(x=>x.ing_id==id);if(!i)return;if(!await ask('ลบวัตถุดิบ "'+i.name+'" ถาวร?'+(i.stock>0?'\n\n• ยังมีคงเหลือ '+c4(i.stock)+' '+i.unit+' ซึ่งจะถูกตัดทิ้ง':'')+'\n• ลบไม่ได้ถ้ายังอยู่ในสูตรหรือตัวเลือกเสริม'))return;act(async()=>{try{await run('deleteIngredient',pin,id);await vBom('ing');}catch(e){err(e);}});}
function mvMenu(id,d){act(async()=>{try{await run('moveMenu',pin,id,d);window._sm=null;window._imgs=null;await vMenu();}catch(e){err(e);}});}
const showPv=u=>{window._img=u;$('#pv').innerHTML=`<img class="thumb" src="${u}">`};
function editMenu(id){
  const m=(window._menus||[]).find(x=>x.menu_id==id)||{name:'',price:'',active:true,img:'',type:'',quick_notes:'',items:[]};window._img='';window._mid=id||'';window._mi=(m.items||[]).map(x=>({menu_id:x.menu_id,qty:x.qty}));
  $('#main').innerHTML=`<div class="card"><h3>${id?'แก้ไขเมนู':'เพิ่มเมนู'}</h3><input id="mn" placeholder="ชื่อเมนู เช่น ผัดกะเพราหมูสับ" value="${esc(m.name)}" style="width:100%"><input id="mp" type="number" step="any" placeholder="ราคา (บาท) เช่น 60" value="${m.price}" style="width:100%"><input id="mu" placeholder="หน่วยขาย เช่น ชิ้น, แก้ว, ถุง" value="${esc(m.unit||'ชิ้น')}" style="width:100%"><label class="mut">ประเภท</label><select id="mt" onchange="mtShow()" style="width:100%"><option value="">เมนูปกติ (ใช้สูตรวัตถุดิบของตัวเอง)</option><option value="SET" ${m.type=='SET'?'selected':''}>ชุดเซ็ต (รวมหลายเมนูในราคาเดียว)</option></select><div id="msetw" style="display:${m.type=='SET'?'block':'none'}"><div class="mut">เมนูในเซ็ต — ตัดสต็อกตามสูตรของแต่ละเมนู</div><div id="mi"></div><button onclick="miAdd()">+ เพิ่มเมนูในเซ็ต</button></div><label class="mut">หมายเหตุด่วนให้ลูกค้ากดเลือก (บรรทัดละ 1 อย่าง เช่น ไม่เผ็ด / ไม่ใส่ผัก) — ถ้ามีจะขึ้นหน้าต่างเลือกตอนกด +</label><textarea id="mq" rows="3" style="width:100%">${esc(m.quick_notes||'')}</textarea><label><input type="checkbox" id="ma" ${m.active?'checked':''}> เปิดขาย</label><div id="pv" style="margin:8px 0">${m.img?`<img class="thumb" src="${m.img}">`:''}</div><button onclick="pickImg(640,showPv)">เลือกรูป</button><div class="acts"><button class="pri" onclick="saveM('${id||''}')">บันทึก</button><button onclick="vMenu()">ยกเลิก</button></div></div>`;
  miDraw();
}
async function saveM(id){
  try{window._sm=null;window._imgs=null;window._logo=undefined;await run('saveMenu',pin,{menu_id:id,name:$('#mn').value,price:$('#mp').value,unit:$('#mu').value,active:$('#ma').checked,type:$('#mt').value,quick_notes:$('#mq').value,items:window._mi||[]},window._img||'');vMenu();}catch(e){err(e);}
}

async function vBom(a){
  const d=await run('getBom',pin);window._bom=d;
  if(a==='ing'||a==='rec'){window._bt=a;window._sel=null;}else if(typeof a=='string'&&a){window._bt='rec';window._sel=a;}
  if(!window._bt)window._bt=d.ingredients.length?'rec':'ing';
  if(window._sel&&!d.menus.some(x=>x.menu_id==window._sel&&x.type!='SET'))window._sel=null;
  const bt=window._bt,sel=window._sel,tabs=`<div class="acts" style="margin:6px 0"><button class="${bt=='ing'?'pri':''}" onclick="vBom('ing')" style="flex:1">① วัตถุดิบ<div style="font-size:14px;font-weight:400">ของที่ซื้อมาทำ</div></button><button class="${bt=='rec'?'pri':''}" onclick="vBom('rec')" style="flex:1">② สูตรเมนู<div style="font-size:14px;font-weight:400">ใช้ของอะไรบ้าง</div></button></div>`;
  let body='';
  if(bt=='ing'){
    body=`<p class="mut">รายการของที่ซื้อมาทำอาหาร เช่น หมูสับ ไข่ไก่ ข้าวสาร — ใช้เพื่อตัดสต็อกและคิดต้นทุน</p>
    <button class="pri" onclick="editIng()">+ เพิ่มวัตถุดิบ</button>`+(d.ingredients.length?d.ingredients.map(i=>`<div class="row card"><span><b>${esc(i.name)}</b> (${esc(i.unit)})${i.is_pack?' <span class="tag">ของนอกสูตร</span>':''}<div class="mut">คงเหลือ ${c4(i.stock)} · ราคาล่าสุด ${c4(i.cost)} บาท/${esc(i.unit)}</div></span><span style="display:flex;gap:4px"><button onclick="editIng('${i.ing_id}')">แก้ไข</button><button style="color:#dc2626;border-color:#dc2626" onclick="delIng('${i.ing_id}')" aria-label="ลบ">ลบ</button></span></div>`).join('')+`<div class="card" style="text-align:center"><div class="mut">เพิ่มวัตถุดิบครบแล้ว? ไปขั้นต่อไป</div><button class="pri" onclick="vBom('rec')">② ตั้งสูตรเมนู →</button></div>`:`<div class="card" style="text-align:center"><div style="font-size:40px">🥬</div><b>ยังไม่มีวัตถุดิบ</b><div class="mut">กด "+ เพิ่มวัตถุดิบ" ด้านบน หรือข้ามส่วนนี้ไปก็ได้ — เมนูจะขายได้ตามปกติ</div></div>`);
  }else if(!sel){
    const cnt={};d.recipes.forEach(r=>cnt[r.menu_id]=(cnt[r.menu_id]||0)+1);
    body=`<p class="mut">เลือกเมนูที่อยากตั้งสูตร <b>เมนูที่ไม่ตั้งสูตร ก็ขายได้ปกติ</b> (แค่ไม่ตัดสต็อกและไม่คิดต้นทุน)</p>`+(d.ingredients.length?'':`<div class="note">ยังไม่มีวัตถุดิบ — <a href="#" onclick="vBom('ing');return false">ไปเพิ่มที่ ① วัตถุดิบก่อน</a></div>`)+d.menus.map(m=>`<div class="row card"><div><b style="font-size:20px">${esc(m.name)}</b>${m.type=='SET'?' <span class="tag">เซ็ต</span>':''}<div class="mut">${m.type=='SET'?'เซ็ตใช้สูตรของเมนูที่อยู่ในเซ็ตให้อัตโนมัติ':cnt[m.menu_id]?'<span style="color:#16a34a">✓ มีสูตรแล้ว '+cnt[m.menu_id]+' อย่าง</span>':'ยังไม่มีสูตร · ขายได้ไม่จำกัด'}</div></div>${m.type=='SET'?'':`<button class="${cnt[m.menu_id]?'':'pri'}" onclick="vBom('${m.menu_id}')">${cnt[m.menu_id]?'แก้สูตร':'ตั้งสูตร'}</button>`}</div>`).join('');
  }else{
    const m=d.menus.find(x=>x.menu_id==sel);
    body=`<button onclick="vBom('rec')">← กลับไปรายการเมนู</button>
    <div class="card"><h2 style="margin:4px 0">สูตรของ: ${esc(m.name)}</h2><div class="mut">ทำ 1 ${esc(m.unit)} ใช้วัตถุดิบอะไรบ้าง?</div>${d.ingredients.length?'':`<div class="note" style="margin:8px 0">ยังไม่มีวัตถุดิบให้เลือก — <a href="#" onclick="vBom('ing');return false">ไปเพิ่มที่ ① วัตถุดิบก่อน</a></div>`}<div id="bl">${d.recipes.filter(r=>r.menu_id==sel).map(bomLine).join('')}</div><div class="acts"><button onclick="addLine()">+ เพิ่มวัตถุดิบ</button><button class="pri" onclick="saveBom()">บันทึกสูตร</button></div><div class="mut" style="margin-top:8px">ปริมาณใส่ทศนิยมได้ (เช่น ไม้เสียบ 0.25) · ของที่นับเป็นชิ้นไม่ได้ เช่น ถุง แก้ว ซอส ให้ติ๊ก "ของนอกสูตร" ที่ตัววัตถุดิบ · ไม่อยากตั้งสูตร กด ← กลับได้เลย</div></div>
    <div class="card"><h3>ต้นทุน / กำไร</h3><div id="cs"></div></div>
    <div class="card"><h3>คำนวณวัตถุดิบ</h3><input id="bn" type="number" min="1" value="10" oninput="calcBom()" style="width:112px"> ${esc(m.unit)}<div id="bc"></div></div>`;
  }
  $('#main').innerHTML=tabs+body;
  if(bt=='rec'&&sel)calcBom();
}
const bomLine=r=>`<div class="row bl"><select onchange="calcBom()">${_bom.ingredients.filter(i=>!i.is_pack||i.ing_id==r.ing_id).map(i=>`<option value="${i.ing_id}" ${i.ing_id==r.ing_id?'selected':''}>${esc(i.name)} (${esc(i.unit)})</option>`).join('')}</select><input type="number" step="any" min="0" value="${r.qty}" style="width:112px" oninput="calcBom()"><span class="mut ln" style="min-width:112px;text-align:right"></span><button onclick="this.parentNode.remove();calcBom()">✕</button></div>`;
function addLine(){$('#bl').insertAdjacentHTML('beforeend',bomLine({ing_id:'',qty:1}));calcBom();}
function readLines(){return [...document.querySelectorAll('#bl .bl')].map(e=>({ing_id:e.querySelector('select').value,qty:Number(e.querySelector('input').value)})).filter(l=>l.qty>0&&l.ing_id);}
function calcBom(){
  const n=Number($('#bn').value)||0,I=_bom.ingredients,m=_bom.menus.find(x=>x.menu_id==window._sel)||{price:0,unit:'ชิ้น'};
  document.querySelectorAll('#bl .bl').forEach(e=>{const i=I.find(x=>x.ing_id==e.querySelector('select').value),q=Number(e.querySelector('input').value)||0;e.querySelector('.ln').textContent=i?i.unit+' · '+c4(r4(q*i.cost))+' ฿':'';});
  const ls=readLines().filter(l=>I.some(x=>x.ing_id==l.ing_id));
  const cost=r4(ls.reduce((a,l)=>a+l.qty*I.find(x=>x.ing_id==l.ing_id).cost,0)),profit=r4(m.price-cost);
  $('#cs').innerHTML=ls.length?`<div class="row"><span>ต้นทุนวัตถุดิบ/${esc(m.unit)}</span><b>${c4(cost)} บาท</b></div><div class="row"><span>ราคาขาย/${esc(m.unit)}</span><b>${c4(m.price)} บาท</b></div><div class="row"><span>กำไร/${esc(m.unit)}</span><b class="${profit<0?'low':''}">${c4(profit)} บาท${m.price>0?' ('+Math.round(profit/m.price*1000)/10+'%)':''}</b></div><p class="mut">ยังไม่รวมถุง/แก้วและค่าแรง</p>`:'<p class="mut">ยังไม่มีสูตร</p>';
  $('#bc').innerHTML=ls.length?ls.map(l=>{const i=I.find(x=>x.ing_id==l.ing_id),need=r4(l.qty*n);return `<div class="row"><span>${esc(i.name)}</span><span class="${i.stock>=need?'':'low'}">ใช้ ${c4(need)} ${esc(i.unit)} (มี ${c4(i.stock)})</span></div>`}).join('')+`<p class="mut">ต้นทุนรวม ${c4(r4(cost*n))} บาท · ทำได้สูงสุดจากสต็อกตอนนี้: ${Math.min(...ls.map(l=>Math.floor(r4(I.find(x=>x.ing_id==l.ing_id).stock/l.qty))))} ${esc(m.unit)}</p>`:'<p class="mut">ยังไม่มีสูตร</p>';
}
async function saveBom(){try{await run('saveRecipe',pin,window._sel,readLines());alert('บันทึกสูตรแล้ว');vBom('rec');}catch(e){err(e);}}
function editIng(id){
  const i=(_bom.ingredients||[]).find(x=>x.ing_id==id)||{name:'',unit:'ชิ้น',cost:0,reorder_point:0,is_pack:false};
  $('#main').innerHTML=`<div class="card"><h3>${id?'แก้ไขวัตถุดิบ':'เพิ่มวัตถุดิบ'}</h3><label class="mut">ชื่อของที่ซื้อมา เช่น หมูสับ, ไข่ไก่, ข้าวสาร</label><input id="in" value="${esc(i.name)}" style="width:100%"><label class="mut">หน่วยที่ใช้นับ เช่น กรัม, ฟอง, ใบ, ชิ้น</label><input id="iu" value="${esc(i.unit)}" style="width:100%"><label class="mut">ราคาต่อ 1 หน่วยตั้งต้น (บาท) — ใช้ตอนยังไม่มีการรับของเข้า หลังจากนั้นระบบใช้ราคาที่รับเข้าจริง</label><input id="ic" type="number" step="any" min="0" value="${i.cost}" style="width:100%"><label class="mut">เตือนให้ซื้อเพิ่มเมื่อเหลือไม่เกิน (ใส่ 0 = ไม่ต้องเตือน)</label><input id="ir" type="number" step="any" min="0" value="${i.reorder_point}" style="width:100%">${id?'':`<label class="mut">ตอนนี้มีของนี้อยู่เท่าไร (ยังไม่แน่ใจใส่ 0 ได้ ค่อยรับของเข้าทีหลัง)</label><input id="is" type="number" step="any" min="0" value="0" style="width:100%">`}<label><input type="checkbox" id="ip" ${i.is_pack?'checked':''}> ของนอกสูตร เช่น ถุง/แก้ว/ซอส (ไม่ใส่ในสูตร · นับจำนวนที่เหลือตอนปิดวัน ส่วนที่หายไปคิดเป็นต้นทุน)</label><div class="acts"><button class="pri" onclick="saveIng('${id||''}')">บันทึก</button><button onclick="vBom('ing')">ยกเลิก</button></div></div>`;
}
async function saveIng(id){
  const name=$('#in').value.trim();if(!name)return alert('กรอกชื่อวัตถุดิบ');
  try{await run('saveIngredient',pin,{ing_id:id,name:name,unit:$('#iu').value,cost:Number($('#ic').value)||0,reorder_point:Number($('#ir').value)||0,stock:$('#is')?Number($('#is').value)||0:0,is_pack:$('#ip').checked});vBom('ing');}catch(e){err(e);}
}

/* ---- คูปองส่วนลด ---- */
async function vAct(){
  try{const d=await run('getActivity',pin);
  dlg(`<h3>🎁 ${esc(d.title||'กิจกรรม')} · ${d.count} คน</h3><div style="max-height:60vh;overflow:auto">${d.rows.length?d.rows.map(r=>`<div class="card" style="margin:6px 0"><b>${esc(r.queue_no)}</b> <span class="mut">${esc(r.time)}</span><div>${esc(r.email)}</div>${r.msg?`<div class="mut">${esc(r.msg)}</div>`:''}</div>`).join(''):'<p class="mut">ยังไม่มีผู้เข้าร่วม</p>'}</div><p class="mut">ข้อมูลทั้งหมดอยู่ในชีต "Activity" ด้วย</p><div class="acts"><button onclick="closeDlg()">ปิด</button></div>`);}catch(e){err(e);}
}
async function vCp(){
  const d=await run('getCoupons',pin);window._cps=d.coupons;
  $('#main').innerHTML=`<button class="pri" onclick="editCp()">+ เพิ่มคูปอง</button>`+(d.coupons.length?d.coupons.map(c=>`<div class="row card"><div><b>${esc(c.code)}</b>${c.survey?' <span class="tag">แบบสอบถาม</span>':''}${c.mode=='CUSTOMER'?' <span class="tag">ลูกค้ากดเอง</span>':c.mode=='AUTO'?' <span class="tag">ลดอัตโนมัติ</span>':''}${c.active?'':' <span class="mut">(ปิดใช้)</span>'}<div class="mut">ลด ${c.type=='PERCENT'?c4(c.value)+'%':money(c.value)+' บาท'}${c.note?' · '+esc(c.note):''}</div></div><button onclick="editCp('${esc(c.code)}')">แก้ไข</button></div>`).join(''):'<p class="mut">ยังไม่มีคูปอง</p>');
}
function editCp(code){
  const c=(window._cps||[]).find(x=>x.code==code)||{code:'',type:'PERCENT',value:'',active:true,note:'',survey:false};
  $('#main').innerHTML=`<div class="card"><h3>${code?'แก้ไขคูปอง':'เพิ่มคูปอง'}</h3><label class="mut">รหัสคูปอง (A-Z 0-9)</label><input id="cc" value="${esc(c.code)}" ${code?'readonly':''} style="width:100%;text-transform:uppercase"><label class="mut">ประเภทส่วนลด</label><select id="ct" style="width:100%"><option value="PERCENT" ${c.type=='PERCENT'?'selected':''}>เปอร์เซ็นต์ (%)</option><option value="AMOUNT" ${c.type=='AMOUNT'?'selected':''}>จำนวนเงิน (บาท)</option></select><label class="mut">มูลค่าส่วนลด</label><input id="cv" type="number" step="any" min="0" value="${c.value}" style="width:100%"><label class="mut">หมายเหตุ</label><input id="cn" value="${esc(c.note)}" style="width:100%">${c.survey?'':`<label class="mut">วิธีใช้คูปอง</label><select id="cm" style="width:100%"><option value="" ${!c.mode?'selected':''}>พนักงานเลือกตอนคิดเงิน</option><option value="CUSTOMER" ${c.mode=='CUSTOMER'?'selected':''}>ลูกค้ากดเลือกเองตอนสั่ง (หักตอนชำระเงิน)</option><option value="AUTO" ${c.mode=='AUTO'?'selected':''}>ลดอัตโนมัติตอนคิดเงิน (ไม่ต้องเลือก)</option></select><div class="mut">ถ้ามีคูปองอัตโนมัติหลายใบ ระบบใช้ใบที่ลดได้มากที่สุดใบเดียว · พนักงานเปลี่ยนเป็น "ไม่ใช้คูปอง" ได้ในหน้ารับเงิน</div>`}${c.survey?'<label><input type="checkbox" id="cs" checked> คูปองแบบสอบถามเดิม (เลิกใช้แล้ว — ใช้ไม่ได้ตอนคิดเงิน)</label>':''}<label><input type="checkbox" id="ca" ${c.active?'checked':''}> เปิดใช้งาน</label><div class="acts"><button class="pri" onclick="saveCp(${code?1:0})">บันทึก</button><button onclick="vCp()">ยกเลิก</button></div></div>`;
}
async function saveCp(edit){
  try{await run('saveCoupon',pin,{code:$('#cc').value,type:$('#ct').value,value:$('#cv').value,note:$('#cn').value,active:$('#ca').checked,mode:$('#cm')?$('#cm').value:'',survey:!!($('#cs')&&$('#cs').checked)},!!edit);vCp();}catch(e){err(e);}
}

/* ---- v2: ตะกร้า (หลายบรรทัด + ตัวเลือก + หมายเหตุ) + โปรโมชั่น ---- */
const r2=x=>Math.round((Number(x)+Number.EPSILON)*100)/100;



const cnt=id=>lines.filter(l=>l.menu_id==id).reduce((a,l)=>a+l.qty,0);
const optsFor=m=>(G.options||[]).filter(o=>!o.menu_ids||o.menu_ids.indexOf(m.menu_id)>=0);
const needDlg=m=>optsFor(m).length>0||(m.notes||[]).length>0;


const cartArr=()=>lines.map(l=>({menu_id:l.menu_id,qty:l.qty,opts:l.opts,note:l.note||''}));

















/* ---- v2: เข้าสู่ระบบ / PIN รายคน ---- */
let _sl=false;








/* ---- ออเดอร์ (พนักงาน) ---- */
const isCust=o=>o.by=='ลูกค้า'||o.by=='customer';



/* ---- หน้าต่างคิดเงิน: คูปอง / รหัสแบบสอบถาม ---- */
/* ---- เจ้าของ: ตั้งค่า ---- */






/* ---- เมนู (รองรับชุดเซ็ต + หมายเหตุด่วน) ---- */








/* ---- ตัวเลือกเมนู (ซอส/ท็อปปิ้ง) ---- */



/* ---- โปรโมชั่น ---- */
const DOW=['อา','จ','อ','พ','พฤ','ศ','ส'],PT={BXGY:'ซื้อ X แถม Y',PERCENT:'ลดเป็น %',AMOUNT:'ลดต่อชิ้น (บาท)',PRICE:'ราคาพิเศษ (บาท/ชิ้น)'};





/* ---- พนักงาน (PIN รายคน) ---- */



/* ---- บันทึกกิจกรรม ---- */
const ACT={LOGIN:'เข้าสู่ระบบ',PIN_CHANGE:'เปลี่ยน PIN',PAY:'รับเงิน',DISCOUNT:'ให้ส่วนลด',CANCEL:'ยกเลิกออเดอร์',EXTEND:'ต่อเวลาชำระ',STOCK_ADJUST:'ปรับสต็อก',STOCK_RECEIVE:'รับของเข้า',CLOSE_DAY:'ปิดวัน',REOPEN_DAY:'เปิดวันอีกครั้ง',SETTINGS:'ตั้งค่า',MENU_SAVE:'แก้เมนู',MENU_PRICE:'แก้ราคา',RECIPE_SAVE:'แก้สูตร',ING_SAVE:'แก้วัตถุดิบ',COUPON_SAVE:'แก้คูปอง',OPTION_SAVE:'แก้ตัวเลือก',PROMO_SAVE:'แก้โปรโมชั่น',STAFF_SAVE:'จัดการพนักงาน',TRIAL_RESET:'รีเซ็ตรหัสทดลอง'};
const RISK={CANCEL:1,DISCOUNT:1,STOCK_ADJUST:1,MENU_PRICE:1,REOPEN_DAY:1};

/* ---- คูปอง (เพิ่ม: คูปองแบบสอบถาม) ---- */



/* ---- โครงหน้าพนักงาน ---- */
const MORE=()=>[['due','💰 ค้างชำระ'],['stock','สต็อก'],['sum','สรุป']].concat(role=='owner'?[['start','🚀 เริ่มต้นใช้งาน'],['menu','เมนู/เซ็ต'],['opt','ตัวเลือก'],['promo','โปรโมชั่น'],['bom','วัตถุดิบ/สูตร (ไม่บังคับ)'],['cp','คูปอง'],['rep','รายงาน'],['stf','พนักงาน'],['log','บันทึกกิจกรรม'],['set','ตั้งค่า']]:[]);
/* ---- จอแสดงคิวหน้าร้าน (?page=display) ---- */
function nowInfo(){const d=new Date(),p=n=>String(n).padStart(2,'0');return {hm:p(d.getHours())+':'+p(d.getMinutes()),dow:d.getDay(),date:d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};}
function promoOn(p,now){
  if(p.days.length&&p.days.indexOf(now.dow)<0)return false;
  if(p.date_from&&now.date<p.date_from)return false;
  if(p.date_to&&now.date>p.date_to)return false;
  if(p.start&&p.end){if(p.start<=p.end){if(now.hm<p.start||now.hm>=p.end)return false;}else if(now.hm<p.start&&now.hm>=p.end)return false;}
  return true;
}
function promoCalc(units,promos,now){ // ต้องตรงกับ promoCalc_ ฝั่งเซิร์ฟเวอร์
  const claimed=units.map(()=>false),applied=[];let total=0;
  promos.forEach(p=>{
    if(!promoOn(p,now))return;
    const el=[];units.forEach((u,i)=>{if(!claimed[i]&&(!p.menu_ids||p.menu_ids.indexOf(String(u.menu_id))>=0))el.push(i);});
    if(!el.length)return;
    let d=0;const used=[];
    if(p.type=='BXGY'){const x=Math.max(1,Math.floor(p.x)),y=Math.max(1,Math.floor(p.y)),g=x+y,k=Math.floor(el.length/g);if(!k)return;el.sort((a,b)=>units[b].price-units[a].price);el.slice(0,k*g).forEach((i,j)=>{used.push(i);if(j%g>=x)d+=units[i].price;});}
    else if(p.type=='PERCENT')el.forEach(i=>{d+=units[i].price*p.value/100;used.push(i);});
    else if(p.type=='PRICE')el.forEach(i=>{const cut=units[i].price-p.value;if(cut>0){d+=cut;used.push(i);}});
    else if(p.type=='AMOUNT')el.forEach(i=>{d+=Math.min(units[i].price,p.value);used.push(i);});
    d=r2(d);if(d>0){used.forEach(i=>claimed[i]=true);total+=d;applied.push({id:p.promo_id,name:p.name,amount:d});}
  });
  return {discount:r2(total),applied:applied};
}
function lineUnit(l){const m=menu.find(x=>x.menu_id==l.menu_id);if(!m)return 0;return r4(m.price+l.opts.reduce((a,id)=>{const o=(G.options||[]).find(z=>z.opt_id==id);return a+(o?o.price:0);},0));}
function calcCart(){
  let gross=0,n=0;const units=[];
  lines.forEach(l=>{const m=menu.find(x=>x.menu_id==l.menu_id);if(!m)return;gross+=l.qty*lineUnit(l);n+=l.qty;for(let i=0;i<l.qty;i++)units.push({menu_id:l.menu_id,price:m.price});});
  const dl=$('#ch')&&$('#ch').value=='DELIVERY',pr=dl?{discount:0,applied:[]}:promoCalc(units,G.promos||[],nowInfo()),d=Math.min(gross,pr.discount);
  const net=Math.ceil(r4(gross-d)-1e-9);return {n:n,gross:r4(gross),promo:r4(gross-net),applied:pr.applied,net:net};
}
function promoTag(m){const now=nowInfo(),ps=(G.promos||[]).filter(p=>(!p.menu_ids||p.menu_ids.indexOf(m.menu_id)>=0)&&promoOn(p,now));return ps.length?`<div class="mut" style="color:var(--pri)">🏷 ${ps.map(p=>esc(p.name)).join(' · ')}</div>`:'';}
function addDlg(id){
  const m=menu.find(x=>x.menu_id==id);if(!m)return;
  const left=m.avail-cnt(id);if(left<1)return;
  window._ad={id:id,qty:1,opts:[],note:'',left:left};
  const os=optsFor(m);
  dlg(`<h3>${esc(m.name)} <span class="mut">${money(m.price)} ฿</span></h3>${m.contents?`<div class="mut">${esc(m.contents)}</div>`:''}${os.length?`<div class="mut" style="margin-top:8px">ตัวเลือกเพิ่ม</div>${os.map(o=>`<label class="row" style="cursor:pointer"><span><input type="checkbox" ${o.avail<1?'disabled':''} onchange="adTog('${o.opt_id}',this.checked)"> ${esc(o.name)}${o.avail<1?' <span class="sold">หมด</span>':''}</span><span>${o.price?'+'+money(o.price)+' ฿':'ฟรี'}</span></label>`).join('')}`:''}${(m.notes||[]).length?`<div class="mut" style="margin-top:8px">หมายเหตุด่วน (กดเพื่อเพิ่ม)</div><div class="acts">${m.notes.map((n,i)=>`<button onclick="adNote(${i})">${esc(n)}</button>`).join('')}</div>`:''}<input id="ad_note" maxlength="80" placeholder="หมายเหตุเพิ่มเติม เช่น ไม่เผ็ด ไม่ใส่ผัก" oninput="adNoteIn(this.value)" style="width:100%"><div class="row"><span>จำนวน</span><div class="st"><button onclick="adQty(-1)">−</button><b id="ad_q">1</b><button onclick="adQty(1)">+</button></div></div><div class="row"><span>รวม</span><b id="ad_t"></b></div><div class="acts"><button class="pri" onclick="adOk()">เพิ่มลงตะกร้า</button><button onclick="closeDlg()">ยกเลิก</button></div>`);
  adCalc();
}
function adCap(){const a=window._ad;let cap=a.left;a.opts.forEach(oid=>{const o=(G.options||[]).find(z=>z.opt_id==oid);if(o)cap=Math.min(cap,o.avail);});return Math.max(1,cap);}
function adTog(oid,on){const a=window._ad;a.opts=a.opts.filter(x=>x!=oid);if(on)a.opts.push(oid);if(a.qty>adCap())a.qty=adCap();adCalc();}
function adQty(d){const a=window._ad;a.qty=Math.max(1,Math.min(adCap(),a.qty+d));adCalc();}
function adNote(i){const a=window._ad,m=menu.find(x=>x.menu_id==a.id),t=(m.notes||[])[i];if(!t)return;const e=$('#ad_note');if(a.note.indexOf(t)<0){e.value=((a.note?a.note+' ':'')+t).slice(0,80);a.note=e.value;}}
function adNoteIn(v){window._ad.note=v;}
function adCalc(){const a=window._ad,m=menu.find(x=>x.menu_id==a.id),u=r4(m.price+a.opts.reduce((s,id)=>{const o=(G.options||[]).find(z=>z.opt_id==id);return s+(o?o.price:0);},0));$('#ad_q').textContent=a.qty;$('#ad_t').textContent=money(r4(u*a.qty))+' ฿';}
function adOk(){const a=window._ad;if(!a)return;const nt=a.note.trim(),same=lines.find(l=>l.menu_id==a.id&&l.note==nt&&[...l.opts].sort().join()==[...a.opts].sort().join());if(same)same.qty+=a.qty;else lines.push({id:++LID,menu_id:a.id,qty:a.qty,opts:a.opts.slice(),note:nt});closeDlg();drawMenu();}
function setNote(id,v){const l=lines.find(x=>x.id==id);if(l)l.note=v;}
function lnQty(id,d){const l=lines.find(x=>x.id==id);if(!l)return;const m=menu.find(x=>x.menu_id==l.menu_id);if(d>0&&cnt(l.menu_id)>=m.avail)return;l.qty+=d;if(l.qty<1)lines=lines.filter(x=>x.id!=id);drawMenu();if(lines.length)cartDlg();else closeDlg();}
function cartDlg(){
  if(!lines.length)return;const t=calcCart(),stf=PAGE=='staff';
  dlg(`<h3>ตรวจสอบรายการ</h3>${lines.map(l=>{const m=menu.find(x=>x.menu_id==l.menu_id),ex=l.opts.map(id=>{const o=(G.options||[]).find(z=>z.opt_id==id);return o?o.name+(o.price?' (+'+money(o.price)+')':''):'';}).filter(Boolean).join(', ');return `<div class="card" style="margin:6px 0"><div class="row" style="border:0;padding:0"><b>${esc(m.name)}</b><span>${money(lineUnit(l)*l.qty)} ฿</span></div>${m.contents?`<div class="mut">${esc(m.contents)}</div>`:''}${ex?`<div class="mut">+ ${esc(ex)}</div>`:''}<input value="${esc(l.note)}" maxlength="80" placeholder="หมายเหตุ เช่น ไม่เผ็ด ไม่ใส่ผัก" oninput="setNote(${l.id},this.value)" style="width:100%"><div class="st" style="margin-top:6px"><button onclick="lnQty(${l.id},-1)">−</button><b>${l.qty}</b><button onclick="lnQty(${l.id},1)">+</button></div></div>`;}).join('')}<div class="row"><span>รวม</span><b>${money(t.gross)} ฿</b></div>${t.applied.map(a=>`<div class="row"><span>🏷 ${esc(a.name)}</span><b>-${money(a.amount)} ฿</b></div>`).join('')}<div class="row"><span>ยอดสุทธิ</span><b class="q2">${money(t.net)}</b></div>${stf?'':cuHtml(t)}${stf?'':svcHtml(t)}${stf?'':`<p class="mut">${(G.svc||{}).later?'ยืนยันแล้วร้านจะเริ่มทำให้เลย ชำระเงินตอนรับของ (โปรโมชั่นคิดให้อัตโนมัติ)':'ยืนยันแล้วไปชำระเงินที่เคาน์เตอร์ (โปรโมชั่นคิดให้อัตโนมัติ)'}</p>`}<div class="acts"><button class="pri" onclick="${stf?'submitS':'submitC'}()">${stf?'บันทึกออเดอร์':'ยืนยันสั่ง'}</button><button onclick="closeDlg()">แก้ไข</button></div>`);if(!stf){cuCalc();svChg();}
}
function svSaved(){try{return JSON.parse(localStorage.getItem('psm_cust')||'{}');}catch(e){return {};}}
function svcHtml(t){
  const sv=G.svc||{},sd=svSaved(),S=window._sv=window._sv||{f:'PICKUP',zone:'',addr:'',name:sd.name||'',phone:sd.phone||'',note:''};
  const need=sv.contact||S.f=='DELIVER',hasC=!!(S.name||S.phone||S.note);
  return `<div class="card" style="margin-top:10px"><b>ข้อมูลการรับสินค้า</b>
  ${sv.delivery?`<label class="mut">รับสินค้าแบบไหน</label><select id="sv_f" onchange="svChg()" style="width:100%"><option value="PICKUP" ${S.f=='PICKUP'?'selected':''}>รับเองที่ร้าน</option><option value="DELIVER" ${S.f=='DELIVER'?'selected':''}>ให้ร้านจัดส่ง</option></select>
  <div id="sv_d" style="display:${S.f=='DELIVER'?'block':'none'}"><label class="mut">พื้นที่จัดส่ง</label><select id="sv_z" onchange="svChg()" style="width:100%"><option value="">— เลือกพื้นที่ —</option>${(sv.zones||[]).map(z=>`<option value="${esc(z.name)}" ${S.zone==z.name?'selected':''}>${esc(z.name)} · ค่าส่ง ${z.free?'(ฟรีเมื่อครบ '+money(z.free)+') ':''}${money(z.fee)} บาท${z.min?' · ขั้นต่ำ '+money(z.min):''}</option>`).join('')}</select><label class="mut">ที่อยู่จัดส่ง (บ้านเลขที่ ซอย จุดสังเกต)</label><textarea id="sv_a" rows="2" maxlength="150" style="width:100%" oninput="window._sv.addr=this.value">${esc(S.addr)}</textarea>${sv.dnote?`<div class="mut">${esc(sv.dnote)}</div>`:''}</div>`:''}
  <details id="sv_ct" ${need||hasC?'open':''} style="margin-top:6px"><summary class="mut" style="cursor:pointer">＋ ใส่ชื่อ / เบอร์โทร / ข้อความถึงร้าน <span id="sv_opt">${need?'(ต้องกรอก)':'(ไม่บังคับ)'}</span></summary>
  <label class="mut">ชื่อ</label><input id="sv_n" maxlength="40" value="${esc(S.name)}" style="width:100%" oninput="window._sv.name=this.value">
  <label class="mut">เบอร์โทร — ให้ร้านโทรกลับได้</label><input id="sv_p" type="tel" inputmode="tel" maxlength="15" value="${esc(S.phone)}" style="width:100%" oninput="window._sv.phone=this.value">
  <label class="mut">ข้อความถึงร้าน (ไม่บังคับ) เช่น ขอรับเวลา 12:30, ไม่เผ็ดทุกจาน</label><textarea id="sv_m" rows="2" maxlength="200" style="width:100%" oninput="window._sv.note=this.value">${esc(S.note)}</textarea></details>
  <div class="row" id="sv_fee" style="display:none"><span>ค่าจัดส่ง</span><b id="sv_feev"></b></div><div class="row" id="sv_tot" style="display:none"><b>ยอดรวมค่าส่ง</b><b class="q2" id="sv_totv"></b></div></div>`;
}
function svFee(t){const S=window._sv||{};if(S.f!='DELIVER')return null;const z=((G.svc||{}).zones||[]).find(x=>x.name==S.zone);if(!z)return null;return {z:z,fee:(z.free>0&&t.net>=z.free)?0:z.fee,low:z.min>0&&t.net<z.min};}
function svChg(){const S=window._sv=window._sv||{},f=$('#sv_f'),z=$('#sv_z');if(f)S.f=f.value;if(z)S.zone=z.value;const d=$('#sv_d');if(d)d.style.display=S.f=='DELIVER'?'block':'none';const ct=$('#sv_ct'),so=$('#sv_opt'),nd=((G.svc||{}).contact)||S.f=='DELIVER';if(ct&&nd)ct.open=true;if(so)so.textContent=nd?'(ต้องกรอก)':'(ไม่บังคับ)';const t=calcCart(),x=svFee(t);
  const fr=$('#sv_fee'),tr=$('#sv_tot');if(fr){fr.style.display=x?'flex':'none';tr.style.display=x?'flex':'none';if(x){$('#sv_feev').textContent=x.low?'ยอดไม่ถึงขั้นต่ำ '+money(x.z.min)+' บาท':(x.fee?money(x.fee)+' บาท':'ฟรี');$('#sv_totv').textContent=money(t.net+x.fee)+' ฿';}}}
function svcRead(){ // ตรวจข้อมูลก่อนส่ง · คืน {err} หรือ {opt}
  const sv=G.svc||{},S=window._sv||{},t=calcCart(),o={};if(!$('#sv_n'))return {opt:o};
  S.name=$('#sv_n').value.trim();S.phone=$('#sv_p').value.replace(/[^0-9]/g,'');S.note=$('#sv_m').value.trim();
  const del=S.f=='DELIVER'&&sv.delivery;
  if(del){S.zone=$('#sv_z').value;S.addr=$('#sv_a').value.trim();const x=svFee(t);if(!x)return {err:'กรุณาเลือกพื้นที่จัดส่ง'};if(x.low)return {err:'พื้นที่ '+x.z.name+' สั่งขั้นต่ำ '+money(x.z.min)+' บาท'};if(S.addr.length<5)return {err:'กรุณากรอกที่อยู่จัดส่งให้ครบ'};}
  if(sv.contact||del){if(!S.name)return {err:'กรุณากรอกชื่อ'};if(S.phone.length<8)return {err:'กรุณากรอกเบอร์โทรให้ถูกต้อง'};}
  try{localStorage.setItem('psm_cust',JSON.stringify({name:S.name,phone:S.phone}));}catch(e){}
  return {opt:{name:S.name,phone:S.phone,note:S.note,fulfil:del?'DELIVER':'',zone:del?S.zone:'',addr:del?S.addr:''}};
}
const fe=f=>{f=Number(f);return isFinite(f)&&f>=0&&f<=5000?f:0;};
function cuAmt(c,base){base=Math.max(0,Number(base)||0);const raw=c.type=='PERCENT'?base*c.value/100:c.value;return Math.min(Math.floor(base+1e-9),Math.floor(raw+1e-9));}
function cuHtml(t){
  const cs=(G.coupons||[]),cu=cs.filter(c=>c.mode=='CUSTOMER'),au=cs.filter(c=>c.mode=='AUTO');
  if(window._cu&&!cu.some(c=>c.code==window._cu))window._cu='';
  const sel=window._cu||'';
  return (cu.length?`<div style="margin-top:8px"><label class="mut">🎟 คูปองส่วนลด (กดเลือกได้)</label><select id="cu_sel" onchange="cuPick(this.value)" style="width:100%"><option value="">ไม่ใช้คูปอง</option>${cu.map(c=>`<option value="${esc(c.code)}" ${sel==c.code?'selected':''}>${esc(c.code)} — ลด ${c.type=='PERCENT'?c4(c.value)+'%':money(c.value)+' บาท'}${c.note?' · '+esc(c.note):''}</option>`).join('')}</select><div class="row" id="cu_row" style="display:${sel?'flex':'none'}"><span>ยอดหลังใช้คูปอง (ประมาณ)</span><b class="q2" id="cu_net"></b></div></div>`:'')+(au.length?`<div class="mut" style="margin-top:6px">🎟 ร้านมีส่วนลดอัตโนมัติตอนชำระเงิน: ${au.map(c=>esc(c.code)+' ลด '+(c.type=='PERCENT'?c4(c.value)+'%':money(c.value)+' บาท')).join(', ')}</div>`:'');
}
function cuPick(v){window._cu=v;cuCalc();}
function cuCalc(){const e=$('#cu_net');if(!e)return;const c=((G.coupons)||[]).find(x=>x.code==window._cu),t=calcCart();$('#cu_row').style.display=c?'flex':'none';if(c){let d=cuAmt(c,t.net);(G.coupons||[]).filter(x=>x.mode=='AUTO').forEach(x=>{d=Math.max(d,cuAmt(x,t.net));});e.textContent=money(r4(t.net-d))+' ฿ (ลด '+money(d)+')';}}
function dev(){ // รหัสเครื่องลูกค้า ใช้จำกัดจำนวนออเดอร์ค้างต่อเครื่อง
  const mk=()=>{try{if(window.crypto&&crypto.randomUUID)return 'd'+crypto.randomUUID().replace(/-/g,'').slice(0,20);}catch(e){}return 'd'+Math.random().toString(36).slice(2,12)+Date.now().toString(36);};
  try{let d=localStorage.getItem('psm_dev');if(!d||!/^[A-Za-z0-9_-]{8,40}$/.test(d)){d=mk();localStorage.setItem('psm_dev',d);}return d;}catch(e){return window._dv||(window._dv=mk());}
}
function sesLost(){if(_sl)return;_sl=true;clearInterval(timer);pin='';role='';window._first=null;window._h=null;setTimeout(()=>{_sl=false;},1500);login('หมดเวลาเข้าระบบ กรุณาใส่ PIN อีกครั้ง');}
async function enter(){const d=await run('staffData',pin);role=d.role;window._shop=d.shop;window._print=d.print;window._who=d.who;window._auto=!!d.auto;window._first=d;tab='orders';try{if(role=='owner'&&!localStorage.getItem('psm_started'))tab='start';}catch(e){}staff();if(role=='owner'){setTimeout(chkBanner,1200);if(!window._updT)window._updT=setInterval(chkBanner,3600000);}setTimeout(()=>{run('getStaffMenu',pin).then(m=>{window._sm={d:m,t:Date.now()};}).catch(()=>{});},600);}
function pinForm(forced){return `<h3>${forced?'ตั้ง PIN ใหม่ก่อนเริ่มใช้งาน':'เปลี่ยน PIN'}</h3><p class="mut">${forced?'คุณเข้าด้วย PIN ชั่วคราว กรุณาตั้ง PIN ส่วนตัวของคุณ · ':''}PIN เป็นตัวเลข 6-10 หลัก ห้ามเลขซ้ำหรือเรียงกัน (เช่น 123456) และต้องไม่ซ้ำกับของคนอื่น</p><input id="pin_o" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN ปัจจุบัน" style="width:100%"><input id="pin_n" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN ใหม่" style="width:100%"><input id="pin_n2" type="password" inputmode="numeric" autocomplete="off" placeholder="ยืนยัน PIN ใหม่" style="width:100%"><div class="acts"><button class="pri" onclick="savePin(${forced?1:0})">บันทึก PIN</button>${forced?'<button onclick="logout()">ออก</button>':'<button onclick="closeDlg()">ยกเลิก</button>'}</div>`;}
function pinDlg(forced){if(forced)$('#app').innerHTML=`<div class="done" style="max-width:420px;margin:0 auto;text-align:left">${pinForm(true)}</div>`;else dlg(pinForm(false));}
async function savePin(forced){
  const o=$('#pin_o').value,n=$('#pin_n').value;if(n!==$('#pin_n2').value)return alert('PIN ใหม่ทั้งสองช่องไม่ตรงกัน');
  await act(async()=>{try{await run('changeOwnPin',pin,o,n);if(forced)await enter();else{closeDlg();alert('เปลี่ยน PIN แล้ว');}}catch(e){err(e);}});
}
async function logout(){try{await run('logoutStaff',pin);}catch(e){}pin='';role='';clearInterval(timer);window._h=null;window._first=null;closeDlg();login();}
function svReset(){const p=window._pay;if(p)p.svd=0;const m=$('#ck_svm');if(m)m.textContent='';ckCalc();}
async function svCheck(){
  const code=($('#ck_sv')||{}).value||'';if(!code.trim())return;const base=window._pay?window._pay.total:calcCart().net;
  await act(async()=>{try{const r=await run('checkSurvey',pin,code,base);const p=window._pay;if(p)p.svd=r.discount;$('#ck_svm').innerHTML='✓ '+esc(r.label)+' ลด '+money(r.discount)+' บาท';ckCalc();}catch(e){const p=window._pay;if(p)p.svd=0;$('#ck_svm').innerHTML='<span class="low">'+esc(e&&e.message?e.message:e)+'</span>';ckCalc();}});
}
function setObj(){
  const o={};['shop_name','queue_prefix','prep_min_per_queue','parallel_slots','pending_expire_min','pending_max_min','change_float','order_note','max_pending_per_device','max_pending_total','cust_max_items','display_msg','trial_prefix','trial_step_sec','survey_url','survey_msg','activity_title','activity_msg','update_url'].forEach(k=>o[k]=$('#s_'+k).value);
  o.pay_mode=$('#s_pay_mode').value;o.contact_req=$('#s_contact_req').checked?'1':'0';o.delivery_on=$('#s_delivery_on').checked?'1':'0';o.delivery_zones=$('#s_delivery_zones').value;o.delivery_note=$('#s_delivery_note').value;o.pay_qr_note=$('#s_pay_qr_note').value;o.pay_promptpay=$('#s_pay_promptpay').value;o.print_slip=$('#s_print_slip').checked?'1':'0';o.delivery_platforms=$('#s_delivery_platforms').value;o.trial_on=$('#s_trial_on').checked?'1':'0';{const tm=$('#s_trial_mode').value;o.trial_auto=tm=='off'?'0':'1';o.trial_manual=tm=='timed'?'0':'1';}return o;
}
async function testSvy(){
  const o=setObj();$('#svy_r').textContent='กำลังทดสอบ...';
  try{await run('saveSettings',pin,o);const r=await run('testSurvey',pin);$('#svy_r').innerHTML='✓ เชื่อมต่อได้ พบรหัส '+r.count+' รายการ'+(r.sample.length?' · ล่าสุด: '+r.sample.map(esc).join(', '):'');}
  catch(e){$('#svy_r').innerHTML='<span class="low">'+esc(e&&e.message?e.message:e)+'</span>';}
}
async function exportTrialUi(){await act(async()=>{try{const r=await run('exportTrial',pin);$('#tx').innerHTML=`ส่งออก ${r.count} ออเดอร์แล้ว: <a href="${esc(r.url)}" target="_blank">เปิดแท็บ ${esc(r.name)} ในชีต</a>`;}catch(e){err(e);}});}
async function resetTrialUi(){
  if(!await ask('รีเซ็ตเลขคิวช่วงทดลองให้เริ่มที่ 01 ใหม่?\n\n• ระบบจะสำรองข้อมูลออเดอร์ช่วงทดลองทั้งหมดลงแท็บ Trial_Log ในชีตก่อน\n• ออเดอร์ใหม่จะได้เลขคิวซ้ำกับรอบเก่า (เช่น T01 อีกครั้ง)\n• ควรแยกหรือลบคำตอบเก่าในชีตแบบสอบถามก่อน ไม่งั้นรหัสจะปนกัน'))return;
  await act(async()=>{try{const r=await run('resetTrial',pin);alert('รีเซ็ตแล้ว (เก็บถาวร '+r.archived+' รหัสเดิม)'+(r.exported!=null?'\nสำรองข้อมูล '+r.exported+' ออเดอร์ไว้ในแท็บ Trial_Log ของชีตแล้ว':''));vSet();}catch(e){err(e);}});
}
function miDraw(){
  const plain=(window._menus||[]).filter(x=>x.type!='SET'&&x.menu_id!=window._mid);
  $('#mi').innerHTML=window._mi.map((c,i)=>`<div class="row"><select onchange="miSet(${i},'menu_id',this.value)" style="flex:1;min-width:0">${plain.map(x=>`<option value="${x.menu_id}" ${x.menu_id==c.menu_id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><input type="number" min="1" step="1" value="${c.qty}" style="width:84px" oninput="miSet(${i},'qty',this.value)"><button onclick="miDel(${i})">✕</button></div>`).join('');
}
function miSet(i,k,v){window._mi[i][k]=k=='qty'?Number(v):v;}
function miDel(i){window._mi.splice(i,1);miDraw();}
function miAdd(){const p=(window._menus||[]).find(x=>x.type!='SET'&&x.menu_id!=window._mid);if(!p)return alert('ยังไม่มีเมนูปกติ');window._mi.push({menu_id:p.menu_id,qty:1});miDraw();}
function mtShow(){$('#msetw').style.display=$('#mt').value=='SET'?'block':'none';}
async function vOpt(){
  const d=await run('getOptions',pin);window._op=d;
  const nm=ids=>!ids?'ทุกเมนู':ids.split(',').map(i=>esc((d.menus.find(m=>m.menu_id==i)||{}).name||i)).join(', ');
  $('#main').innerHTML=`<button class="pri" onclick="editOpt()">+ เพิ่มตัวเลือก (ซอส/ท็อปปิ้ง)</button><p class="mut">ลูกค้าเลือกเพิ่มได้ตอนกด + ที่เมนู · ถ้าผูกวัตถุดิบ ระบบจะตัดสต็อกและบอก "หมด" ให้เอง · หมายเหตุอิสระ (ไม่เผ็ด ไม่ใส่ผัก) ลูกค้าพิมพ์เพิ่มได้ในตะกร้าทุกเมนู</p>`+(d.options.length?d.options.map(o=>`<div class="row card"><div><b>${esc(o.name)}</b> <span class="tag">${o.price?'+'+money(o.price)+' ฿':'ฟรี'}</span>${o.active?'':' <span class="mut">(ปิดใช้)</span>'}<div class="mut">ใช้กับ: ${nm(o.menu_ids)}${o.ing_id?' · ตัดสต็อก '+esc((d.ingredients.find(i=>i.ing_id==o.ing_id)||{}).name||o.ing_id)+' '+c4(o.ing_qty):''}</div></div><button onclick="editOpt('${o.opt_id}')">แก้ไข</button></div>`).join(''):'<p class="mut">ยังไม่มีตัวเลือก</p>');
}
function editOpt(id){
  const d=window._op,o=d.options.find(x=>x.opt_id==id)||{name:'',price:0,menu_ids:'',ing_id:'',ing_qty:'',active:true},sel=o.menu_ids?o.menu_ids.split(','):[];
  $('#main').innerHTML=`<div class="card"><h3>${id?'แก้ไขตัวเลือก':'เพิ่มตัวเลือก'}</h3><input id="on" placeholder="ชื่อ เช่น ซอสพริก, ชีสเพิ่ม" value="${esc(o.name)}" style="width:100%"><label class="mut">ราคาที่เพิ่มต่อ 1 ชิ้น (บาท, 0 = ฟรี)</label><input id="op" type="number" step="any" min="0" value="${o.price}" style="width:100%"><label class="mut">ใช้กับเมนู (ไม่ติ๊กเลย = ทุกเมนู)</label>${d.menus.map(m=>`<label class="row" style="cursor:pointer"><span><input type="checkbox" class="om" value="${m.menu_id}" ${sel.indexOf(m.menu_id)>=0?'checked':''}> ${esc(m.name)}${m.type=='SET'?' (เซ็ต)':''}</span></label>`).join('')}<label class="mut">ตัดสต็อกวัตถุดิบ (ไม่บังคับ)</label><select id="oi" style="width:100%"><option value="">ไม่ตัดสต็อก</option>${d.ingredients.map(i=>`<option value="${i.ing_id}" ${i.ing_id==o.ing_id?'selected':''}>${esc(i.name)} (${esc(i.unit)})</option>`).join('')}</select><input id="oq" type="number" step="any" min="0" placeholder="ปริมาณที่ใช้ต่อ 1 ชิ้น" value="${o.ing_qty||''}" style="width:100%"><label><input type="checkbox" id="oa" ${o.active?'checked':''}> เปิดใช้</label><div class="acts"><button class="pri" onclick="saveOpt('${id||''}')">บันทึก</button><button onclick="vOpt()">ยกเลิก</button></div></div>`;
}
async function saveOpt(id){
  try{await run('saveOption',pin,{opt_id:id,name:$('#on').value,price:$('#op').value,menu_ids:[...document.querySelectorAll('.om:checked')].map(e=>e.value),ing_id:$('#oi').value,ing_qty:$('#oq').value,active:$('#oa').checked});vOpt();}catch(e){err(e);}
}
function promoText(p){return p.type=='BXGY'?`ซื้อ ${p.x} แถม ${p.y}`:p.type=='PERCENT'?`ลด ${c4(p.value)}%`:p.type=='AMOUNT'?`ลดชิ้นละ ${c4(p.value)} บาท`:`ราคาพิเศษ ${c4(p.value)} บาท`;}
async function vPromo(){
  const d=await run('getPromos',pin);window._pr=d;
  const nm=ids=>!ids?'ทุกเมนู':ids.split(',').map(i=>esc((d.menus.find(m=>m.menu_id==i)||{}).name||i)).join(', ');
  $('#main').innerHTML=`<button class="pri" onclick="editPromo()">+ เพิ่มโปรโมชั่น</button><p class="mut">ระบบคิดให้อัตโนมัติตอนลูกค้าสั่ง · แต่ละชิ้นได้โปรเดียว เรียงตามลำดับในรายการ (ลำดับแถวในชีต Promos) · ไม่ใช้กับออเดอร์เดลิเวอรี่ · ซื้อ X แถม Y = ทุก (X+Y) ชิ้น ชิ้นที่ถูกที่สุด Y ชิ้นฟรี</p>`+(d.promos.length?d.promos.map(p=>`<div class="row card"><div><b>${esc(p.name)}</b>${p.active?'':' <span class="mut">(ปิดใช้)</span>'}<div class="mut">${promoText(p)} · ${nm(p.menu_ids)}</div><div class="mut">${p.start&&p.end?p.start+'-'+p.end+' น.':'ทั้งวัน'} · ${p.days.length?'วัน '+p.days.split(',').map(x=>DOW[x]).join(' '):'ทุกวัน'}${p.date_from||p.date_to?' · '+(p.date_from||'…')+' ถึง '+(p.date_to||'…'):''}</div></div><button onclick="editPromo('${p.promo_id}')">แก้ไข</button></div>`).join(''):'<p class="mut">ยังไม่มีโปรโมชั่น</p>');
}
function ptShow(){const t=$('#pt').value;$('#pxy').style.display=t=='BXGY'?'flex':'none';$('#pv1').style.display=t=='BXGY'?'none':'block';$('#pvl').textContent=t=='PERCENT'?'เปอร์เซ็นต์ที่ลด':t=='AMOUNT'?'ลดต่อชิ้น (บาท)':'ราคาพิเศษต่อชิ้น (บาท) — ต้องเลือกเมนู';}
function editPromo(id){
  const d=window._pr,p=d.promos.find(x=>x.promo_id==id)||{name:'',type:'BXGY',menu_ids:'',x:2,y:1,value:'',start:'',end:'',days:'',date_from:'',date_to:'',active:true},sel=p.menu_ids?p.menu_ids.split(','):[],ds=p.days?p.days.split(','):[];
  $('#main').innerHTML=`<div class="card"><h3>${id?'แก้ไขโปรโมชั่น':'เพิ่มโปรโมชั่น'}</h3><input id="pn" placeholder="ตั้งชื่อโปรให้จำง่าย เช่น ซื้อ 2 แถม 1" value="${esc(p.name)}" style="width:100%"><select id="pt" onchange="ptShow()" style="width:100%">${Object.keys(PT).map(k=>`<option value="${k}" ${p.type==k?'selected':''}>${PT[k]}</option>`).join('')}</select><div id="pxy" class="row" style="display:none"><span>ซื้อ</span><input id="px" type="number" min="1" step="1" value="${p.x||''}" style="width:80px"><span>แถม</span><input id="py" type="number" min="1" step="1" value="${p.y||''}" style="width:80px"></div><div id="pv1"><label class="mut" id="pvl"></label><input id="pv" type="number" step="any" min="0" value="${p.value}" style="width:100%"></div><label class="mut">ใช้กับเมนู (ไม่ติ๊กเลย = ทุกเมนู)</label>${d.menus.map(m=>`<label class="row" style="cursor:pointer"><span><input type="checkbox" class="pm" value="${m.menu_id}" ${sel.indexOf(m.menu_id)>=0?'checked':''}> ${esc(m.name)}${m.type=='SET'?' (เซ็ต)':''}</span></label>`).join('')}<label class="mut">ช่วงเวลาของวัน (เว้นว่าง = ทั้งวัน)</label><div class="row"><input id="ps" type="time" value="${p.start}"><span>ถึง</span><input id="pe" type="time" value="${p.end}"></div><label class="mut">เฉพาะวัน (ไม่ติ๊กเลย = ทุกวัน)</label><div class="acts">${DOW.map((n,i)=>`<label><input type="checkbox" class="pd" value="${i}" ${ds.indexOf(String(i))>=0?'checked':''}> ${n}</label>`).join(' ')}</div><label class="mut">ช่วงวันที่ (ไม่บังคับ)</label><div class="row"><input id="pf1" type="date" value="${p.date_from}"><span>ถึง</span><input id="pt1" type="date" value="${p.date_to}"></div><label><input type="checkbox" id="pa" ${p.active?'checked':''}> เปิดใช้</label><div class="acts"><button class="pri" onclick="savePr('${id||''}')">บันทึก</button><button onclick="vPromo()">ยกเลิก</button></div></div>`;
  ptShow();
}
async function savePr(id){
  try{await run('savePromo',pin,{promo_id:id,name:$('#pn').value,type:$('#pt').value,x:$('#px').value,y:$('#py').value,value:$('#pv').value,menu_ids:[...document.querySelectorAll('.pm:checked')].map(e=>e.value),start:$('#ps').value,end:$('#pe').value,days:[...document.querySelectorAll('.pd:checked')].map(e=>e.value),date_from:$('#pf1').value,date_to:$('#pt1').value,active:$('#pa').checked});vPromo();}catch(e){err(e);}
}
async function vStaffAdm(){
  const d=await run('getStaff',pin);window._sf=d;
  $('#main').innerHTML=`<button class="pri" onclick="editStf()">+ เพิ่มพนักงาน</button><p class="mut">พนักงานทุกคนมี PIN ของตัวเอง (${d.min}-10 หลัก) · PIN ที่เจ้าของตั้งให้เป็นแบบชั่วคราว พนักงานต้องเปลี่ยนเองตอนเข้าครั้งแรก · ระบบบันทึกว่าใครยกเลิก ให้ส่วนลด ปรับสต็อก (ดูที่เมนู "บันทึกกิจกรรม") · แนะนำให้ปิดบัญชี "พนักงาน" ที่ใช้ร่วมกันหลังสร้างบัญชีรายคนแล้ว</p>`+d.staff.map(s=>`<div class="row card"><div><b>${esc(s.name)}</b> <span class="tag">${s.role=='owner'?'เจ้าของ':'พนักงาน'}</span>${s.active?'':' <span class="mut">(ปิดใช้)</span>'}${s.must_change?' <span class="tag">รอเปลี่ยน PIN</span>':''}</div><button onclick="editStf('${s.staff_id}')">แก้ไข</button></div>`).join('');
}
function editStf(id){
  const s=window._sf.staff.find(x=>x.staff_id==id)||{name:'',role:'staff',active:true};
  $('#main').innerHTML=`<div class="card"><h3>${id?'แก้ไขพนักงาน':'เพิ่มพนักงาน'}</h3><input id="fn" placeholder="ชื่อ" value="${esc(s.name)}" style="width:100%"><select id="fr" style="width:100%"><option value="staff" ${s.role=='staff'?'selected':''}>พนักงาน (รับออเดอร์ รับเงิน สต็อก)</option><option value="owner" ${s.role=='owner'?'selected':''}>เจ้าของ (ทุกเมนู รวมตั้งค่า/รายงาน)</option></select><label class="mut">${id?'ตั้ง PIN ชั่วคราวใหม่ (เว้นว่าง = ไม่เปลี่ยน)':'PIN ชั่วคราว'} — พนักงานจะต้องเปลี่ยนเองตอนเข้าครั้งแรก</label><input id="fp" type="password" inputmode="numeric" autocomplete="off" style="width:100%"><label><input type="checkbox" id="fa" ${s.active?'checked':''}> เปิดใช้งาน</label><div class="acts"><button class="pri" onclick="saveStf('${id||''}')">บันทึก</button><button onclick="vStaffAdm()">ยกเลิก</button></div></div>`;
}
async function saveStf(id){
  try{await run('saveStaff',pin,{staff_id:id,name:$('#fn').value,role:$('#fr').value,pin:$('#fp').value,active:$('#fa').checked});vStaffAdm();}catch(e){err(e);}
}
async function vLog(day){
  const L=window._lg||(window._lg={day:'',act:''});if(typeof day=='string')L.day=day;
  const d=await run('getAudit',pin,L.day);L.day=d.day;window._lgd=d;
  const by={};d.rows.forEach(r=>{const b=by[r.who]||(by[r.who]={cancel:0,disc:0,adj:0});if(r.action=='CANCEL')b.cancel++;if(r.action=='DISCOUNT')b.disc=r4(b.disc+(r.amount||0));if(r.action=='STOCK_ADJUST')b.adj++;});
  const rows=d.rows.filter(r=>!L.act||r.action==L.act);
  $('#main').innerHTML=`<div class="card"><input type="date" value="${d.day}" onchange="vLog(this.value)"><select onchange="window._lg.act=this.value;vLog()" style="margin-left:6px"><option value="">ทุกกิจกรรม</option>${Object.keys(ACT).map(k=>`<option value="${k}" ${L.act==k?'selected':''}>${ACT[k]}</option>`).join('')}</select><div class="mut">${d.total} รายการ${d.total>d.rows.length?' (แสดง '+d.rows.length+' ล่าสุด)':''}</div></div>
  <div class="card" style="overflow-x:auto"><h3>สรุปรายคน</h3><table class="ck"><tr><th align="left">พนักงาน</th><th class="r">ยกเลิก</th><th class="r">ส่วนลดที่ให้ (฿)</th><th class="r">ปรับสต็อก</th></tr>${Object.keys(by).map(w=>`<tr><td>${esc(w)}</td><td class="r">${by[w].cancel}</td><td class="r">${money(by[w].disc)}</td><td class="r">${by[w].adj}</td></tr>`).join('')||'<tr><td class="mut" colspan="4">ไม่มีข้อมูล</td></tr>'}</table></div>
  <div class="card" style="overflow-x:auto"><table class="ck"><tr><th align="left">เวลา</th><th align="left">ใคร</th><th align="left">ทำอะไร</th><th align="left">รายละเอียด</th><th class="r">฿</th></tr>${rows.map(r=>`<tr><td>${r.time}</td><td>${esc(r.who)}</td><td class="${RISK[r.action]?'low':''}">${esc(ACT[r.action]||r.action)}</td><td>${esc(r.target)}${r.detail?' · '+esc(r.detail):''}</td><td class="r">${r.amount==null?'':money(r.amount)}</td></tr>`).join('')||'<tr><td class="mut" colspan="5">ไม่มีรายการ</td></tr>'}</table></div>`;
}
function speak(q){try{if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance('คิว '+String(q).split('').join(' ')+' พร้อมรับแล้วค่ะ');u.lang='th-TH';u.rate=.9;speechSynthesis.speak(u);}catch(e){}}
function display(){
  stopTrack();
  const st=document.createElement('style');
  st.textContent="html,body{height:100%;margin:0}body{padding:0!important;background:#0b0d12!important;color:#fff!important;overflow:hidden;cursor:none;font-family:'Sarabun',system-ui,sans-serif}#tv{height:100vh;display:flex;flex-direction:column;padding:2vh 2.5vw;box-sizing:border-box}.tvh{display:flex;justify-content:space-between;align-items:baseline}.tvs{font-size:4.5vh;font-weight:700}#tvc{font-size:4.5vh;color:#9aa3b2}.tvb{flex:1;display:flex;gap:2.5vw;min-height:0;margin-top:1.5vh}.tvl{flex:1.8;background:#12351f;border-radius:2vh;padding:2vh 2vw;display:flex;flex-direction:column;min-width:0}.tvq{flex:1;background:#1a1e27;border-radius:2vh;padding:2vh 2vw;display:flex;flex-direction:column;min-width:0}.tvl h2,.tvq h2{margin:0 0 1.5vh;font-size:4vh}.tvl h2{color:#86efac}.tvq h2{color:#fdba74}#tvr{flex:1;display:grid;gap:1.5vw;align-content:center;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr))}.rd{background:#16a34a;color:#fff;border-radius:2vh;text-align:center;font-weight:800;line-height:1.1;padding:1vh 0;font-size:var(--fs,14vh)}.rd{position:relative;isolation:isolate}.rd::before{content:'';position:absolute;inset:0;border-radius:inherit;background:#fde047;opacity:0;z-index:-1}.rd.new{animation:fc .6s ease-in-out 12}.rd.new::before{animation:fo .6s ease-in-out 12}@keyframes fo{50%{opacity:1}}@keyframes fc{50%{color:#111}}.tve{grid-column:1/-1;text-align:center;font-size:5vh;color:#86efac;opacity:.6}#tvp{display:flex;flex-wrap:wrap;gap:1.2vh 1.2vw;align-content:flex-start;overflow:hidden}.pq{background:#2a3040;border-radius:1.2vh;padding:.6vh 1.2vw;font-size:5vh;font-weight:700;color:#fed7aa}#tvm{margin-top:1.5vh;font-size:3.6vh;color:#fde68a;text-align:center;min-height:4vh}#tvu{position:fixed;left:50%;top:1vh;transform:translateX(-50%);background:rgba(0,0,0,.8);border:1px solid #64748b;border-radius:2vh;padding:.6vh 2vw;font-size:2.6vh;line-height:1.3;text-align:center;z-index:5;cursor:pointer;white-space:nowrap;color:#fde68a}#tvo{position:fixed;right:1vw;bottom:1vh;font-size:2.5vh;color:#f87171;display:none}.rd{min-width:0;white-space:nowrap}@media (max-width:719px),(max-aspect-ratio:21/20){.tvb{flex-direction:column}.tvl{flex:1.5}.tvq{flex:1}.tvl h2,.tvq h2{font-size:3.4vh;margin-bottom:1vh}.pq{font-size:4vh}.tvs,#tvc{font-size:3.6vh}}";
  document.head.appendChild(st);
  $('#app').innerHTML='<div id="tv"><div class="tvh"><div class="tvs" id="tvs"></div><div id="tvc"></div></div><div class="tvb"><section class="tvl"><h2>เชิญรับสินค้า</h2><div id="tvr"></div></section><section class="tvq"><h2>กำลังเตรียม</h2><div id="tvp"></div></section></div><div id="tvm"></div><div id="tvu">แตะหน้าจอ/กดปุ่มใดก็ได้ 1 ครั้ง เพื่อเปิดเสียงเรียกคิว</div><div id="tvo">ขาดการเชื่อมต่อ กำลังลองใหม่…</div></div>';
  const tv={s:$('#tvs'),c:$('#tvc'),r:$('#tvr'),p:$('#tvp'),m:$('#tvm'),u:$('#tvu'),o:$('#tvo')};
  let seen=null,lastKey='',last=null;const fresh={};
  const unl=()=>{if(window._snd)return;unlockAudio();window._snd=true;tv.u.remove();['click','keydown','touchstart'].forEach(e=>document.removeEventListener(e,unl));try{if(navigator.wakeLock)navigator.wakeLock.request('screen').catch(()=>{});}catch(e){}beep();};
  tv.u.onclick=unl;['click','keydown','touchstart'].forEach(e=>document.addEventListener(e,unl)); // แตะที่ไหนหรือกดปุ่มรีโมตก็ได้ ป้ายเล็กไม่บังเลขคิว
  setTimeout(()=>{if(tv.u.parentNode)tv.u.remove();},25000); // ไม่มีเมาส์/รีโมท: ซ่อนหน้าขอเปิดเสียง แสดงคิวต่อโดยไม่มีเสียง
  setInterval(()=>{tv.c.textContent=new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});},1000);
  const draw=d=>{
    last=d;const rd=d.ready||[],n=rd.length,now=Date.now();
    const cur=rd.map(x=>x.q);let nw=[];
    if(seen===null)seen=new Set(cur);else{nw=cur.filter(q=>!seen.has(q));seen=new Set(cur);}
    nw.forEach(q=>{fresh[q]=now+12000;});
    if(nw.length&&window._snd){beep();nw.slice(0,3).forEach((q,i)=>setTimeout(()=>speak(q),1200+i*2500));}
    const key=JSON.stringify([cur,d.cooking,d.msg,d.shop,Object.keys(fresh).filter(q=>fresh[q]>now),innerWidth,innerHeight]);
    if(key==lastKey)return;lastKey=key;
    tv.s.textContent=d.shop||'';tv.m.textContent=d.msg||'';
    const narrow=innerWidth<720||innerHeight>innerWidth*1.05,shown=rd.slice(0,12),ml=Math.max(2,...shown.map(x=>String(x.q).length));
    let cols,fh;
    if(narrow){cols=n<=6?1:2;const rows=Math.ceil(Math.max(1,shown.length)/cols);fh=Math.max(4,Math.min(14,(42/rows-3.6)/1.1));} // จอเล็ก/แนวตั้ง: คนละแถว
    else{cols=n<=1?1:n<=4?2:3;fh=n<=1?26:n<=2?20:n<=4?14:n<=6?11:9;}
    const fw=((narrow?84:54)/cols-3)/(0.66*ml); // ขนาดตัวอักษรต้องไม่กว้างเกินช่อง
    tv.r.style.setProperty('--cols',cols);tv.r.style.setProperty('--fs','min('+fh.toFixed(1)+'vh,'+fw.toFixed(1)+'vw)');
    tv.r.innerHTML=n?rd.slice(0,12).map(x=>`<div class="rd${fresh[x.q]>now?' new':''}">${esc(x.q)}</div>`).join('')+(n>12?`<div class="tve">และอีก ${n-12} คิว</div>`:''):'<div class="tve">ยังไม่มีออเดอร์ที่พร้อมรับ</div>';
    tv.p.innerHTML=(d.cooking||[]).slice(0,40).map(q=>`<div class="pq">${esc(q)}</div>`).join('');
  };
  let fails=0;
  window.addEventListener('resize',()=>{lastKey='';if(last)draw(last);});
  const tick=async()=>{try{const d=await run('getDisplay');fails=0;tv.o.style.display='none';draw(d);}catch(e){if(++fails>=3)tv.o.style.display='block';}};
  setInterval(()=>{if(last&&Object.keys(fresh).some(q=>fresh[q]<=Date.now()&&fresh[q]>Date.now()-6000)){lastKey='';draw(last);}},4000); // เลิกกระพริบเมื่อครบเวลา
  if(window.__DISP){draw(window.__DISP);window.__DISP=null;}
  tick();setInterval(tick,5000);
}

const _t0=Date.now(),_iv=setInterval(()=>{const e=$('#ld');if(e)e.textContent='กำลังโหลด... '+Math.round((Date.now()-_t0)/1000)+' วินาที ['+_st+']';else clearInterval(_iv)},1000);
let started=false;
const start=p=>{if(started)return;started=true;const q=window.__PAGE||(Array.isArray(p)?p[0]:p);PAGE=q=='staff'?'staff':q=='display'?'display':'customer';Promise.resolve(PAGE=='staff'?login():PAGE=='display'?display():customer().then(resumeOrd)).catch(showErr);};
try{google.script.url.getLocation(l=>{if(l&&l.parameter&&l.parameter.debug)window.__DBG=[];start(l&&l.parameter&&l.parameter.page);});}catch(e){start('')}
setTimeout(()=>start(''),4000);

{const wv=n=>{const f=eval(n);const g=async function(...a){const r=await f.apply(this,a);if(n=='vBom'&&window._sel)return r;hpAdd(n=='vStaffAdm'?'stf':n.slice(1).toLowerCase()=='bom'?'bom':n.slice(1).toLowerCase());return r;};return g;};
vMenu=wv('vMenu');vBom=wv('vBom');vOpt=wv('vOpt');vPromo=wv('vPromo');vCp=wv('vCp');vSet=wv('vSet');vStaffAdm=wv('vStaffAdm');
const we=(n,k)=>{const f=eval(n);return function(...a){const r=f.apply(this,a);hpAdd(k);return r;};};
editMenu=we('editMenu','editMenu');editIng=we('editIng','editIng');editOpt=we('editOpt','editOpt');editPromo=we('editPromo','editPromo');editCp=we('editCp','editCp');}
Object.assign(window,{chkVer,chkReady,doUpdate,goUpdate,slipRejDlg,slipRej,uaOk,qrSave,qrDlg,slipPick,slipDlg,upQr,delQr,qrSync,vDue,billDlg,svChg,vStart,hpAdd,vAct,actDlg,actSend,cuPick,cuCalc,delMenu,delIng,mvMenu,exportTrialUi,forgot,forgotSend,forgotGo,newOrd,imgErr,$,act,acts,adCalc,adCap,adNote,adNoteIn,adOk,adQty,adTog,addDlg,addEx,addLine,adjDlg,adjSave,beep,buzz,bz,calcBom,calcCart,cancelO,cartDlg,chg,ckCalc,ckHtml,ckShow,ckSum,clearOrd,closeD,closeDlg,confirmPay,cuCalc,customer,dbg,delLogo,dev,display,dlg,doLogin,drawMenu,editCp,editIng,editMenu,editOpt,editPromo,editStf,enter,expRep,extend,goTab,lazy,lineUnit,lnQty,loadLogo,loadOrd,login,logout,meDel,meEdit,meSave,miAdd,miDel,miDraw,miSet,mtShow,nowInfo,payDlg,pickImg,pinDlg,pinForm,printSlip,promoCalc,promoOn,promoTag,promoText,ptShow,readCk,readLines,recvCalc,recvDlg,recvSave,refreshNew,reopenD,resetNew,resetTrialUi,resumeOrd,saveBom,saveCp,saveIng,saveM,saveOpt,saveOrd,savePin,savePr,saveSet,saveStf,sesLost,setLogo,setNote,setObj,showPv,speak,staff,stopTrack,stt,submitC,submitS,svCheck,svReset,testSvy,toast,track,unlockAudio,upLogo,vBom,vCp,vLog,vMenu,vNew,vOpt,vOrders,vPromo,vRep,vSet,vStaffAdm,vStock,vSum});
})();
