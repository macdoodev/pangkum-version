#!/usr/bin/env bash
# ออกเวอร์ชันใหม่ในขั้นเดียว: สร้าง src/ClientCode.gs จาก client/client.js → สร้าง version.json (พร้อมแฮช) → ลงทะเบียนแฮชใน releases/manifest.txt
# ใช้: tools/release.sh ["ข้อความบอกว่ามีอะไรใหม่"] ["ลิงก์วิธีอัปเดต"]
# ก่อนรัน: เพิ่มเลข APP_VERSION / APP_DATE ใน src/Code.gs   · หลังรัน: git add -A && git commit && git push (ลูกค้าจะเห็นแบนเนอร์ "มีเวอร์ชันใหม่" ภายในไม่เกิน 1 ชม. หรือกดตรวจเองได้ทันที)
. "$(dirname "$0")/common.sh"
node "$ROOT/tools/build-client.js" || exit 1
node "$ROOT/tools/make-version.js" "$@" || exit 1
register_release
echo "ลงทะเบียน v$(cur_ver) แล้ว — ต่อไป: git add -A && git commit -m \"v$(cur_ver)\" && git push"
