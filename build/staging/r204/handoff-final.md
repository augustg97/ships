## Round 204 — 2026-09-02 — the fetch outruns the round: the 문헌편 measured, detached, and handed forward; Wayback walls the round a third time

**Residual 1 WORKED, not closed — the finding is about the server
(build/staging/r204/JUDGMENT.md).** Coordinates re-verified against fresh
infoData (route note: `/main/.../infoData/4452` now serves the SPA shell;
the data lives at `/resources/academicreport/infoData/4452?nttId=4452`,
session cookie first). The fileDown route established by probe:
`/board/fileDown/FILE_000000000056499/1` — no `/main`, no `/resources`;
both prefixed forms answer HTTP 200 with the 25 KB SPA shell, so a 200 is
not the file, check the magic bytes. The correct route's plain GET answers
`Content-Length: 127831863` byte-exact against fileMg, body `%PDF-1.6`,
the 문헌편's own name in Content-Disposition. A range GET HANGS past two
minutes (worse than r202's 1,240-byte error answer) — plain GET remains
the only working form.

**The blocker, measured not judged: throughput 11–37 KB/s across three
sampled windows. 128 MB at the best sustained 37 KB/s is ~58 minutes; the
close gate is ~46 minutes measured off r203 (the ratchet alone 38:
06:49:24 → 07:27:12); 58 + 46 > 80. The fetch cannot land beside the gates
at this rate — r202's 140 MB landed in-round, so the server can do better;
this morning it did not.** And a SECOND blocker measured before the round
closed: the first detached curl (double-fork daemon, PID 74988 — it did
survive the wrapper's group kill as designed) was CLOSED BY THE SERVER at
645.9 s with 16,236,512 bytes served (dl-munheon.log's own exit line:
`HTTP 200 size 16236512 time 645.926969s`) — a per-connection cap near
eleven minutes at daytime rate. No resume exists: range GETs hang. The
whole file must land inside ONE fast connection, and the only fetches
that ever ran whole (r202's 140 MB at 04:38, r203's pair at 05:11) both
ran in the early-morning window. The response: a RETRY DAEMON
(retry-munheon.sh, PID 78416, own session, double-forked) loops the whole
plain GET hourly — fresh session cookie each attempt, overwrites the
partial, stops on byte-exact 127,831,863, 20 attempts cap, log to
retry-munheon.log — so an overnight attempt can land in the fast window.
The target file is gitignored by name this round (>100 MB class),
alongside the 본문편's future name.

**NEXT ROUND, first thing: read build/staging/r204/retry-munheon.log.**
A `COMPLETE byte-exact` line → stat the PDF at exactly 127,831,863 and
mine it. Attempts still logging → leave the daemon alone and work another
residual. Daemon dead without success (`pgrep -f retry-munheon.sh` empty,
no COMPLETE line) → relaunch it by the same double-fork, and prefer an
early-morning firing for any in-round attempt. Then MINE: the
이충무공전서 documentary
record behind the panokseon's ground-tackle and horong warrants — 닻,
닻돌, 碇/矴, 호롱, 물레, 녹로 — and the 전서's hull dimensions against the
panokseon card's numbers. The 본문편 (785 MB, ~5.9 h at today's rate) is a
separate decision: same detached pattern, started at a round's open.

**Residual 4 ATTEMPTED a third round, three walls named:** Wayback CDX
429 instantly (the block outlives a day), archive.ph 429 with its 55 KB
limit page, timetravel.mementoweb.org dead outright (HTTP 000). And r202's
PSAS "pdf" re-read: 10 KB of the login wall's HTML saved under the paper's
name — the path was never open. The dhow's 1.8 m shank stands as drawn, a
stated reconstruction named in the provenance.

**App change: NONE — nothing mined, nothing to write into the record; the
tree change is two .gitignore lines (the >100 MB class, named in advance).
Audit 33/0 (audit.json `[]`, "checked 33 hulls, 0 problems"). Opening 64
ATTRIBUTED under residual 23's own condition, verified at round start:
r203's close exited 0 all-within-tolerance on this HEAD and only
build/loop.log moved since. Close 64 run IN FULL on the same rendered
tree — the attribution's own test: ALL 64 WITHIN TOLERANCE, ZERO accepts,
exit 0 (close-ratchet.out); worst mover globe-default 0.046%/0.011, its
documented capture flap at the same figure as r202 and r203; FRAME-LOG
untouched, no baseline moved.**

**Rule 1: the globe-default capture read by eye from _current mid-ratchet
(frames are final as written). Rule 0, answered on it: the frame reads as
a rendered world, not a chart — a lit Atlantic hemisphere with the
seafloor's relief through the water and ship models, not dots, on the
routes. Three facts a viewer can read off it: the Mid-Atlantic Ridge runs
the length of the ocean as a raised spine in the bathymetry; at 1590,
July, the era card states the Middle Passage carried 12.5 M people on
36,000+ voyages (1514–1866, sourced to the SlaveVoyages trans-Atlantic
database) while seaborne trade reads "no aggregate record survives" —
rule 10's honest unknown, on screen; a column of carracks stands down the
mid-Atlantic with the Spanish Armada and Lepanto marked red in the North
Sea and Mediterranean, and the era's voyage list runs Zheng He to Drake.**

**Deployed: data-version 1788361098. Push log read this round (the r198
rule); live stamp verified.**

**Named residuals, in order (r203's list, renumbered):** (1) HEAD, in
flight: the 문헌편 retry daemon — read retry-munheon.log first (the three
states above), mine on completion; the 본문편 fetch a separate planned
round. (2) Kozushima 1993
weighing (print-only stands). (3) r187 emaki plate. (4) r182 grapnel shank
— three walls 429/dead again this round; retry from a cooler week.
(5) — . (6) r177 Lucian's second machine. (7) r173 cog Gangspill. (8) r173
cog castles. (9) r173 cog rudder slab. (10) r176 sekibune class-size
(kiwari read). (11) boxy classes: top (18), channel/cheek/cathead.
(12) Preussen mast livery. (13) Endurance forecastle. (14) Azzam crest
span. (15) r164 risen black unpierced. (16) r165 fantail gallery wings.
(17) r166 screen glass. (18) r171 quarter-gallery sashes. (19) r171
authored tier fractions. (20) r172 the 74's lower capstan barrel.
(21) CLOSED r202. (22) CLOSED r203. (23) CLOSED THIS ROUND — the
attribution condition it stated was verified and taken, and the close 64
ran whole on the same tree. (24) NEW r204, owed: next round's opening 64 —
attribute ONLY if this round's close passed whole and nothing but
build/loop.log and build/staging/r204/* (no frame fetches either) moved;
else run it in full.

