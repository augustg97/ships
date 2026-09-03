#!/bin/zsh
# r205 retry daemon: fetch the 거북선 본문편 whole (784,858,884 bytes) — the
# r204 문헌편 pattern verbatim (that daemon landed its file on attempt 2).
# Server drops connections ~10 min in at daytime rates; range GETs hang, so
# no resume. Loop the whole plain GET hourly for the early-morning window.
# Fresh session cookie per attempt; stop on byte-exact size. -m raised to
# 14400: 785 MB needs the time even in a good window.
D=/Users/augustgweon/Ships/build/staging/r205
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
REF="https://www.seamuse.go.kr/main/board/academicreport/info/4452"
URL="https://www.seamuse.go.kr/board/fileDown/FILE_000000000056499/2"
OUT=/Users/augustgweon/Ships/build/staging/r204/geobukseon-bonmun.pdf
WANT=784858884
for i in $(seq 1 20); do
  sz=$(stat -f %z "$OUT" 2>/dev/null || echo 0)
  if [ "$sz" = "$WANT" ]; then echo "$(date '+%F %T') attempt $i: already complete" >> "$D/retry-bonmun.log"; break; fi
  curl -s -m 30 -c "$D/cookies-bonmun.txt" -A "$UA" -o /dev/null "$REF"
  curl -s -m 14400 -b "$D/cookies-bonmun.txt" -A "$UA" -e "$REF" \
    -o "$OUT" \
    -w "$(date '+%F %T') attempt $i: HTTP %{http_code} size %{size_download} time %{time_total}s\n" \
    "$URL" >> "$D/retry-bonmun.log" 2>&1
  sz=$(stat -f %z "$OUT" 2>/dev/null || echo 0)
  if [ "$sz" = "$WANT" ]; then echo "$(date '+%F %T') attempt $i: COMPLETE byte-exact" >> "$D/retry-bonmun.log"; break; fi
  sleep 3600
done
