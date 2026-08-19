#!/bin/bash
PY="$HOME/Modeling Studio/.venv/bin/python"
TOOL="$HOME/Modeling Studio/tools/frame_baseline.py"
OUT="$HOME/Ships/build/staging/ratchet-r131-open.txt"
: > "$OUT"
FAIL=0
for f in ship-steamer ship-dreadnought aboard-carrier aboard-cable aboard-titanic \
         aboard-yamato aboard-preussen ship-wyoming aboard-wyoming ship-treasure \
         aboard-treasure ship-clipper aboard-clipper shipwright-ahead shipwright-astern \
         shipwright-furled shipwright-hounds shipwright-corbis ship-azzam ship-endurance \
         action-salamis board-salamis action-gravelines action-lepanto wake-plan \
         ship-ever-given sea-ever-given passage-sahul sea-dugout-floor; do
  "$PY" "$TOOL" check --project "$HOME/Ships" --frame "$f" >> "$OUT" 2>&1
  rc=$?
  echo "FRAME:$f EXIT:$rc" >> "$OUT"
  [ $rc -ne 0 ] && FAIL=1
done
echo "OPENPASS-DONE FAIL:$FAIL" >> "$OUT"
