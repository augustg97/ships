# Round 204 — the fetch outruns the round: measured, detached, handed forward

## What this round is

Residual 1 (the r203 head): the 거북선 학술 복원 보고서, 문헌편 first.
The round's finding is about the SERVER, not the report: the file is real,
the route is right, and the throughput this morning cannot land 128 MB
inside one 80-minute round beside a 38-minute close gate. The download was
therefore detached from the round's process tree to finish on its own, and
the verification is owed to the next round.

## The coordinates, re-verified against fresh infoData this round

Route note: `/main/board/academicreport/infoData/4452` now serves the SPA
shell. The working data route is `/resources/academicreport/infoData/4452?nttId=4452`
(session cookie from a GET of the info page first). Files, byte counts
matching r203's record exactly:

| fileSn | ext | bytes | name |
|---|---|---|---|
| 0 | jpg | 308,379 | 본문편 표지 (cover) |
| 1 | pdf | 127,831,863 | 해양유산연구소 거북선 학술복원(문헌편) 2026 0630 웹용.pdf |
| 2 | pdf | 784,858,884 | 해양유산연구소 거북선 학술복원(본문편) 2026 0630 웹용.pdf |

## The fileDown route, established by probe

- `/board/fileDown/FILE_000000000056499/1` — CORRECT. Plain GET with
  browser UA + info-page referer + session cookie: HTTP 200,
  `Content-Length: 127831863` (byte-exact against fileMg), body `%PDF-1.6`,
  Content-Disposition names the 문헌편. Headers on disk (headers-munheon.txt).
- `/main/board/fileDown/...` and `/resources/board/fileDown/...` — both
  answer HTTP 200 with the 25 KB SPA shell. A 200 is not the file; check
  the magic bytes.
- A range GET (`-r 0-0`) on the correct route HANGS past two minutes — it
  did not even return r202's 1,240-byte error page this time. Plain GET
  remains the only working form, r203's instruction confirmed again.

## The measured blocker

Throughput sampled three ways during the round: ~20 KB/s (first 20 s
window), 36.8 KB/s (45 s window, 1.65 MB), ~11 KB/s (15 s window at 07:59).
At the best sustained rate, 128 MB ≈ 58 minutes. The round's own gate
arithmetic, measured off r203: close ratchet alone 38 minutes
(06:49:24 → 07:27:12), full close ~46 minutes. 58 + 46 > 80. The fetch and
the gates do not fit one round at this server's morning rate. r202's
140 MB landed in-round, so the server can be faster than today; today it
was not.

## What was done about it — and the second blocker

The curl was daemonized — double fork, own session (PID 74988, PGID 74987,
recorded in dl-munheon.pid) — and it DID survive the round machinery, but
the SERVER closed the connection at 645.9 s with 16,236,512 bytes served
(dl-munheon.log: `HTTP 200 size 16236512 time 645.926969s`) — a
per-connection cap near eleven minutes at daytime rate. With range GETs
hanging, there is no resume: the whole 128 MB must land inside one fast
connection, and the only whole-file fetches on this board's record
(r202's 140 MB at 04:38, r203's pair at 05:11) both ran in the
early-morning window.

So the hand-forward is a RETRY DAEMON: `retry-munheon.sh` (PID 78416, own
session, double-forked) loops the whole plain GET hourly — fresh session
cookie each attempt, overwrites the partial, stops on byte-exact
127,831,863, 20 attempts cap — logging each attempt's `-w` line to
`retry-munheon.log`.

**Next round, before trusting the file:** (1) read `retry-munheon.log` —
a `COMPLETE byte-exact` line is the signal; (2) `stat` the PDF at exactly
127,831,863 bytes; (3) if the daemon is dead without a COMPLETE line
(`pgrep -f retry-munheon.sh` empty), relaunch it by the same double-fork,
and prefer an early-morning firing for any in-round attempt. Then mine:
the 이충무공전서 documentary
record behind the panokseon's ground-tackle and horong warrants — 닻, 닻돌,
碇/矴, 호롱, 물레, 녹로 — and the 전서's own hull dimensions against the
panokseon card's drawn numbers. The 본문편 at 785 MB is 5.9 hours at
today's rate: a separate decision, probably the same detached pattern
started at a round's open.

## Residual 4, attempted a third round — every wall named

- Wayback CDX: HTTP 429 instantly (cdx-jom.txt is the 429 body, byte-alike
  to r202's) — the IP block outlives a day.
- archive.ph: HTTP 429 with a 55 KB limit page (archiveph-jom.html).
- timetravel.mementoweb.org: connection failed outright (HTTP 000).

The r202 dead-ends re-confirmed unchanged: PSAS 41 is a login wall (r202's
`vosmer-psas41-2011.pdf` is 10 KB of that wall's HTML, not a paper). The
dhow's 1.8 m shank stands as drawn: a stated reconstruction, named in the
provenance. Stands for a Wayback retry from a cooler IP or a later week.

## App change

None. Nothing was mined this round, so there is nothing to write into the
record — the one tree change is two .gitignore lines. Audit 33/0
(audit.json `[]`, stderr "checked 33 hulls, 0 problems"). Opening 64
ATTRIBUTED under residual 23's own condition: r203's close exited 0
all-within-tolerance on this HEAD (close-ratchet3.out) and only
build/loop.log moved between that exit and this round's start (git status
read at round start). The close 64 runs IN FULL on this round's tree —
which is the same rendered tree, so it is the attribution's test as well.
