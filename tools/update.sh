#!/usr/bin/env bash
# อัปเดตลูกค้า: ดึงของเขามาเช็ค → (ไม่ถูกแก้เอง) ใส่ไฟล์ใหม่ → push → deploy ลิงก์เดิม
# ใช้: tools/update.sh <ชื่อร้าน|all> [--dry-run] [--force]
#   --dry-run  บอกว่าจะทำอะไรโดยไม่ push
#   --force    ลูกค้าแก้โค้ดเองก็เขียนทับ (สำรองไฟล์ของเขาไว้ใน backups/ ก่อนเสมอ)
. "$(dirname "$0")/common.sh"
target="${1:-}"; [ -n "$target" ] || { sed -n '2,6p' "$0"; exit 1; }
shift; dry=0; force=0
for a in "$@"; do case "$a" in --dry-run) dry=1;; --force) force=1;; *) echo "ไม่รู้จัก $a"; exit 1;; esac; done
V="$(cur_ver)"; [ -n "$V" ] || { echo "หา APP_VERSION ใน src/Code.gs ไม่เจอ"; exit 1; }
for f in $TRACK $SEED; do [ -f "$ROOT/src/$f" ] || { echo "ไม่พบ src/$f"; exit 1; }; done
register_release
tmp="$(mktemp)"; rows "$target" > "$tmp"
[ -s "$tmp" ] || { echo "ไม่พบลูกค้า '$target' ใน customers.csv"; rm -f "$tmp"; exit 1; }
ok=0; skip=0; fail=0; same=0; stamp="$(date +%Y%m%d-%H%M)"
while IFS=, read -r name sid dep url; do
  dir="$ROOT/customers/$name"
  [ -d "$dir" ] || { echo "[$name] ข้าม: ยังไม่ได้ add-customer"; skip=$((skip+1)); continue; }
  if ! pull_customer "$dir"; then echo "[$name] ❌ ดึงโปรเจกต์ไม่ได้ (ดู $dir/.pull.log)"; fail=$((fail+1)); continue; fi
  before="$(ver_of "$dir/Code.gs")"; mod=""; changed=""
  bv="${before:+v$before}"; bv="${bv:-เวอร์ชันเก่า}"
  for f in $TRACK; do
    [ -f "$dir/$f" ] || { changed="$changed $f"; continue; }
    s="$(fstat "$dir/$f" "$f")"; [ "$s" = mod ] && mod="$mod $f"; [ "$s" != cur ] && changed="$changed $f"
  done
  if [ -z "$changed" ]; then echo "[$name] $bv ล่าสุดอยู่แล้ว"; same=$((same+1)); continue; fi
  if [ -n "$mod" ]; then
    if [ $force -eq 0 ]; then echo "[$name] ⚠ ข้าม: ลูกค้าแก้ไฟล์เอง:$mod  (ดูของเขา: customers/$name/ · ถ้าจะทับให้ใส่ --force)"; skip=$((skip+1)); continue; fi
    if [ $dry -eq 0 ]; then bk="$ROOT/backups/$name-$stamp"; mkdir -p "$bk"; for f in $mod; do cp "$dir/$f" "$bk/$f"; done; echo "[$name] สำรองไฟล์ที่ลูกค้าแก้ไว้ที่ backups/$name-$stamp/"; fi
  fi
  if [ $dry -eq 1 ]; then echo "[$name] (ทดลอง) $bv → v$V จะเปลี่ยน:$changed"; continue; fi
  for f in $TRACK; do cp "$ROOT/src/$f" "$dir/$f"; done
  [ -f "$dir/$SEED" ] || cp "$ROOT/src/$SEED" "$dir/$SEED"
  if ! ( cd "$dir" && $CLASP push -f </dev/null >"$dir/.push.log" 2>&1 ); then echo "[$name] ❌ push ไม่สำเร็จ (ดู $dir/.push.log)"; fail=$((fail+1)); continue; fi
  if [ -n "${dep:-}" ]; then
    if ! ( cd "$dir" && $CLASP deploy -i "$dep" -d "v$V" </dev/null >"$dir/.deploy.log" 2>&1 ); then echo "[$name] ⚠ push แล้ว แต่ deploy ไม่สำเร็จ (ดู $dir/.deploy.log) — ลิงก์ Web app ยังเป็นเวอร์ชันเดิม"; fail=$((fail+1)); continue; fi
    echo "[$name] ✓ $bv → v$V (deploy ลิงก์เดิมแล้ว)"
  else
    echo "[$name] ✓ push v$V แล้ว แต่ยังไม่มี Deployment ID ใน customers.csv จึงยังไม่ได้ deploy — ลูกค้าต้องกด Deploy > Manage deployments > New version เอง"
  fi
  echo "$(date '+%F %T') $name $bv -> v$V$([ -n "$mod" ] && echo ' (force)')" >> "$ROOT/updates.log"; ok=$((ok+1))
done < "$tmp"
rm -f "$tmp"
echo; echo "สรุป: อัปเดตแล้ว $ok · ล่าสุดอยู่แล้ว $same · ข้าม $skip · ผิดพลาด $fail"
[ $fail -eq 0 ]
