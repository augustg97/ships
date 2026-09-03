#!/bin/bash
# r213: push, then poll the live page for the meta name="data-version" content="…" (the r209 grep looked for
# data-version="…" and read nothing for thirty polls; the page carries the value in content=).
cd /Users/augustgweon/Ships
LOG=build/staging/r213/push.log
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "$(date '+%Y-%m-%d %H:%M:%S %Z')  docs/index.html data-version $STAMP" >> $LOG
OUT=$(git push origin main 2>&1); RC=$?
echo "$(date '+%Y-%m-%d %H:%M:%S %Z')  git push origin main rc=$RC → $(echo "$OUT" | tail -1)" >> $LOG
[ $RC -ne 0 ] && { echo "PUSH FAILED rc=$RC"; echo "$OUT"; exit 2; }
for i in $(seq 1 40); do
  sleep 30
  LIVE=$(curl -s -H 'Cache-Control: no-cache' "https://augustg97.github.io/ships/index.html?nocache=$(date +%s)" | grep -o 'name="data-version" content="[0-9]*"' | grep -o '[0-9]*')
  if [ "$LIVE" = "$STAMP" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S %Z')  live data-version $LIVE — matches docs/ after $((i*30)) s" >> $LOG
    echo "LIVE OK $LIVE after $((i*30)) s"; exit 0
  fi
done
echo "$(date '+%Y-%m-%d %H:%M:%S %Z')  live data-version still $LIVE after 20 min (want $STAMP)" >> $LOG
echo "LIVE STALE $LIVE want $STAMP"; exit 1
