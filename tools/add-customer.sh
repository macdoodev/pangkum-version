#!/usr/bin/env bash
# เพิ่มลูกค้าใหม่: ดึงโปรเจกต์ของเขาลงมา (ใช้เก็บ appsscript.json ของเขาไว้) แล้วจดลง customers.csv
. "$(dirname "$0")/common.sh"
[ $# -ge 2 ] || { echo "ใช้: tools/add-customer.sh <ชื่อร้าน> <scriptId> [deploymentId] [webAppUrl]"; exit 1; }
name="$1"; sid="$2"; dep="${3:-}"; url="${4:-}"
case "$name" in *[!A-Za-z0-9._-]*|"") echo "ชื่อร้านใช้ได้เฉพาะ a-z A-Z 0-9 . _ -"; exit 1;; esac
dir="$ROOT/customers/$name"
[ -e "$dir" ] && { echo "มีลูกค้าชื่อ $name อยู่แล้ว"; exit 1; }
mkdir -p "$dir"; printf '{"scriptId":"%s"}\n' "$sid" > "$dir/.clasp.json"
if ! pull_customer "$dir"; then
  echo "ดึงโปรเจกต์ไม่ได้ — เช็คว่า (1) ลูกค้าแชร์ให้บัญชีของคุณเป็น Editor แล้ว (2) เปิด Apps Script API แล้ว (3) clasp login แล้ว"
  sed 's/^/   /' "$dir/.pull.log" 2>/dev/null | tail -5; rm -rf "$dir"; exit 1
fi
if [ -z "$dep" ]; then
  echo "Deployment ที่มีในโปรเจกต์นี้ (เลือกตัวที่เป็น Web app ที่ลูกค้าใช้อยู่ ไม่ใช่ @HEAD):"
  ( cd "$dir" && $CLASP deployments </dev/null ) || true
  echo "→ ใส่ Deployment ID ลงในคอลัมน์ที่ 3 ของ customers.csv"
fi
[ -f "$ROOT/customers.csv" ] || echo "name,scriptId,deploymentId,webAppUrl" > "$ROOT/customers.csv"
echo "$name,$sid,$dep,$url" >> "$ROOT/customers.csv"
echo "เพิ่ม $name แล้ว · เลขเวอร์ชันที่เขาใช้: $(ver_of "$dir/Code.gs" || true)"
