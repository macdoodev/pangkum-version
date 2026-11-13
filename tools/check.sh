#!/usr/bin/env bash
# ตรวจลูกค้า: ใช้เวอร์ชันไหน / ตรงต้นฉบับไหม / ลูกค้าแก้โค้ดเองหรือเปล่า  (ไม่แก้อะไรในโปรเจกต์ลูกค้า)
. "$(dirname "$0")/common.sh"
target="${1:-all}"; tmp="$(mktemp)"; rows "$target" > "$tmp"
[ -s "$tmp" ] || { echo "ไม่พบลูกค้า '$target' ใน customers.csv"; rm -f "$tmp"; exit 1; }
printf '%-18s %-9s %s\n' "ร้าน" "เวอร์ชัน" "สถานะ"
while IFS=, read -r name sid dep url; do
  dir="$ROOT/customers/$name"
  [ -d "$dir" ] || { printf '%-18s %-9s %s\n' "$name" "-" "ยังไม่ได้ add-customer"; continue; }
  if ! pull_customer "$dir"; then printf '%-18s %-9s %s\n' "$name" "-" "❌ ดึงไม่ได้ (ยังเป็น Editor อยู่ไหม / เปิด Apps Script API / clasp login)"; continue; fi
  v="$(ver_of "$dir/Code.gs")"; v="${v:+v$v}"; cur=""; old=""; mod=""; miss=""
  for f in $TRACK; do
    if [ ! -f "$dir/$f" ]; then miss="$miss $f"; continue; fi
    case "$(fstat "$dir/$f" "$f")" in cur) cur="$cur $f";; old) old="$old $f";; mod) mod="$mod $f";; esac
  done
  msg=""
  [ -n "$mod" ]  && msg="⚠ แก้เอง:$mod"
  [ -n "$old" ]  && msg="$msg เก่ากว่าต้นฉบับ:$old"
  [ -n "$miss" ] && msg="$msg ยังไม่มีไฟล์:$miss"
  [ -z "$msg" ]  && msg="✓ ตรงต้นฉบับล่าสุด"
  live=""
  if [ -n "${url:-}" ] && command -v curl >/dev/null 2>&1; then
    lv="$(curl -fsSL --max-time 15 "${url}$(case "$url" in *\?*) echo '&';; *) echo '?';; esac)page=ver" 2>/dev/null | head -c 20)"
    [ -n "$lv" ] && live=" · เว็บจริงตอบ v$lv"
  fi
  printf '%-18s %-9s %s%s\n' "$name" "${v:-ไม่มีเลข}" "${msg# }" "$live"
done < "$tmp"
rm -f "$tmp"
echo; echo "ต้นฉบับล่าสุดในเครื่องนี้: v$(cur_ver)"
