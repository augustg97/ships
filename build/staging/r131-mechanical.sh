#!/bin/bash
# r131 mechanical chain: apply the rake authoring, measure, audit, build.
# Run ONLY after the opening pass is done (it edits web/data/vessels.json).
set -uo pipefail
PY="$HOME/Modeling Studio/.venv/bin/python"
cd "$HOME/Ships" || exit 1

echo "== apply"
python3 build/staging/apply-r131.py || exit 1

echo "== fleet sweep"
"$PY" build/staging/sweep_loa_r129.py > build/staging/sweep-r131-after.txt 2>build/staging/sweep-r131-stderr.txt
grep -E "slave-ship|container|ever-given|carrier " build/staging/sweep-r131-after.txt

echo "== measure slave-ship"
"$PY" Research/measure_ship.py --ship slave-ship > build/measure-slave-ship-r131-after.txt 2>&1
tail -3 build/measure-slave-ship-r131-after.txt

echo "== measure container"
"$PY" Research/measure_ship.py --ship container > build/measure-container-r131-after.txt 2>&1
tail -3 build/measure-container-r131-after.txt

echo "== audit"
"$PY" Research/run_audit.py > build/staging/audit-r131-run1.txt 2>build/staging/audit-r131-stderr.txt
echo "audit exit: $?"
tail -2 build/staging/audit-r131-stderr.txt

echo "== build site"
python3 build/build_site.py 2>&1 | tail -3

echo "MECHANICAL-DONE"
