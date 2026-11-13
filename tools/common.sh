#!/usr/bin/env bash
# ตัวช่วยร่วมของสคริปต์อัปเดต Pang Kum (ใช้ได้กับ bash บน macOS/Linux)
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLASP="${CLASP:-clasp}"
TRACK="Code.gs ClientCode.gs Index.html Menu.gs Updater.gs"   # ไฟล์ที่เราเป็นเจ้าของ: อัปเดตทับได้ และตรวจว่าลูกค้าแก้เองไหม
SEED="Backup.gs"                                   # ไฟล์ที่ลูกค้าตั้งค่าเองได้ (อีเมลสำรอง ฯลฯ): ลงให้ครั้งแรกเท่านั้น ไม่ทับ
MANIFEST="$ROOT/releases/manifest.txt"             # รายการ "แฮชไฟล์ ชื่อไฟล์ เวอร์ชัน" ของทุกเวอร์ชันที่เคยปล่อย

# แฮชของไฟล์ หลังตัดความต่างที่ไม่สำคัญ (ขึ้นบรรทัด CRLF และช่องว่าง/บรรทัดว่างท้ายไฟล์) เพราะ Apps Script อาจปรับให้
sha() {
  local h
  h="$(perl -0pe 's/\r//g; s/\s+\z//' "$1" | { sha256sum 2>/dev/null || shasum -a 256; } | cut -d' ' -f1)"
  echo "$h"
}
ver_of() { grep -m1 -o 'APP_VERSION = [0-9][0-9.]*' "$1" 2>/dev/null | sed 's/.*= //'; }
cur_ver() { ver_of "$ROOT/src/Code.gs"; }

# ลงทะเบียนไฟล์ใน src/ เป็นเวอร์ชันที่ปล่อย (ทำซ้ำได้ ไม่ซ้ำบรรทัด)
register_release() {
  local v f h; v="$(cur_ver)"; [ -n "$v" ] || { echo "หา APP_VERSION ใน src/Code.gs ไม่เจอ"; exit 1; }
  mkdir -p "$ROOT/releases"; touch "$MANIFEST"
  for f in $TRACK; do
    h="$(sha "$ROOT/src/$f")"
    grep -q "^$h $f " "$MANIFEST" || echo "$h $f v$v" >> "$MANIFEST"
  done
}
# สถานะไฟล์หนึ่งไฟล์ของลูกค้า: cur = ตรงต้นฉบับล่าสุด · old = เป็นเวอร์ชันเก่าที่เราเคยปล่อย · mod = ไม่รู้จัก (ลูกค้าแก้เอง)
fstat() {  # $1 = ไฟล์ของลูกค้า  $2 = ชื่อไฟล์
  local h; h="$(sha "$1")"
  if [ "$h" = "$(sha "$ROOT/src/$2")" ]; then echo cur
  elif grep -q "^$h $2 " "$MANIFEST" 2>/dev/null; then echo old
  else echo mod; fi
}
# รายชื่อลูกค้าจาก customers.csv (ชื่อ,scriptId,deploymentId,webAppUrl) · $1 = ชื่อ หรือ all
rows() {
  [ -f "$ROOT/customers.csv" ] || { echo "ยังไม่มี customers.csv (ใช้ tools/add-customer.sh)" >&2; return 0; }
  awk -F, -v n="${1:-all}" 'NR>1 && NF>=2 && $1 !~ /^[ \t]*#/ && $1 != "" && (n=="all" || $1==n)' "$ROOT/customers.csv"
}
# clasp pull ลงโฟลเดอร์ลูกค้า แล้วทำให้ชื่อไฟล์เป็น .gs (clasp บางเวอร์ชันดึงมาเป็น .js)
pull_customer() {  # $1 = โฟลเดอร์ลูกค้า
  local dir="$1" n
  ( cd "$dir" && $CLASP pull </dev/null >"$dir/.pull.log" 2>&1 ) || return 1
  for n in Code ClientCode Menu Updater Backup; do [ -f "$dir/$n.js" ] && mv -f "$dir/$n.js" "$dir/$n.gs"; done
  return 0
}
