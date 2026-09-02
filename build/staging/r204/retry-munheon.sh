#!/bin/zsh
# r204 retry daemon: fetch the 거북선 문헌편 whole (127,831,863 bytes).
# The server drops connections ~10 min in at daytime rates (measured this
# round: 645.9 s, 16,236,512 bytes served); range GETs hang, so no resume.
# Loop the whole plain GET hourly — the early-morning window served r202's
# 140 MB whole. Fresh session cookie per attempt; stop on byte-exact size.
D=/Users/augustgweon/Ships/build/staging/r204
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
REF="https://www.seamuse.go.kr/main/board/academicreport/info/4452"
URL="https://www.seamuse.go.kr/board/fileDown/FILE_000000000056499/1"
WANT=127831863
for i in $(seq 1 20); do
  sz=$(stat -f %z "$D/geobukseon-munheon.pdf" 2>/dev/null || echo 0)
  if [ "$sz" = "$WANT" ]; then echo "$(date '+%F %T') attempt $i: already complete" >> "$D/retry-munheon.log"; break; fi
  curl -s -m 30 -c "$D/cookies-retry.txt" -A "$UA" -o /dev/null "$REF"
  curl -s -m 5400 -b "$D/cookies-retry.txt" -A "$UA" -e "$REF" \
    -o "$D/geobukseon-munheon.pdf" \
    -w "$(date '+%F %T') attempt $i: HTTP %{http_code} size %{size_download} time %{time_total}s\n" \
    "$URL" >> "$D/retry-munheon.log" 2>&1
  sz=$(stat -f %z "$D/geobukseon-munheon.pdf" 2>/dev/null || echo 0)
  if [ "$sz" = "$WANT" ]; then echo "$(date '+%F %T') attempt $i: COMPLETE byte-exact" >> "$D/retry-munheon.log"; break; fi
  sleep 3600
done
