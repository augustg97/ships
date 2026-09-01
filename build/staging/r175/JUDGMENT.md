# r175 — the panokseon's horong: the Korean tradition's bow windlass, judged before drawn

The r172 residual's queue head. The question: does the panokseon carry an anchor
windlass, and whose machine is it? The Korean name is 호롱 (horong, 揚錨機), and the
sources below were fetched THIS round; none of the residual's five hulls had any prior
research in the tree (grep: "rokuro/호롱" appear only in the residual lists themselves).

## What each source can support — and what it cannot

1. **The living tradition's form** — 옛 돛단배의 언어(3), opinionnews.co.kr/news/articleView.html?idxno=3665
   (a Korean sailing-terminology article on the surviving hanseon craft): the horong is
   a cylindrical drum; "원통형 양쪽에 손잡이(가지)가 십자 '+'로 끼워서 모두 4명이 돌릴
   수 있다" — crossed bars as a +, four men working it; and the structural sentence:
   "긴 막대 2개를 다른 위치에서 관통하게 만들어야 튼튼하다" — TWO LONG BARS PASS
   THROUGH the drum at different points. The drum holds about one coil (~200 m) of
   anchor cable. Form and working read; NO dimension of the naval machine.

2. **The naval line's own album, and its build record** — the Gakseondobon (各船圖本,
   c. 1797, six plates: 전선 warship, 병선, 조선 grain ship…):
   - encykorea E0000455: the 전선 (warship) plate draws 돛대·닻·노·키 — masts, ANCHOR,
     oars, rudder. The encyclopedia names NO horong on the warship plate. **That gap is
     the warrant's shape and the provenance states it.**
   - seamuse.go.kr/research/ship_research/info/112 (National Maritime Heritage
     Institute): their 2011 reconstruction of the album's 조선 plate (24 m long; the
     institute page says beam 8.8 m, the launch news 7.5 m — the discrepancy is noted
     and neither number is used) carries "호롱과 치가 선수와 선미에" — the horong at
     the BOW, the rudder at the stern. The full build record ("전통선박 조선기술
     4(2012)_조운선.pdf") is named on the page and was NOT fetched.
   - christianwr.com/news/articleView.html?idxno=33471 (launch news, 2011): "두 개의
     돛과 키, 호롱 등이 그대로 재현됐다" — the horong was IN the plate and faithfully
     recreated. The article's photo (fetched, 500 px wide, hull ≈ 450 px → ≈ 19 px/m;
     saved as joweunseon-2011.jpg + bow crop): the machine stands on the open foredeck
     just abaft the stem board, its bars swinging in the fore-aft vertical plane — an
     athwartships horizontal drum. **Form read only; at 19 px/m this plate supports no
     dimension** (the Azzam rule).

3. **The tradition's depth** — the institute's component classification of the
   excavated Goryeo ships: "정박구(닻, 호롱, 닻돌, 엄말)" — anchoring gear: anchor,
   HORONG, anchor stone, eommal. Seen twice in seamuse.go.kr search excerpts; the
   carrying page was NOT pinned (info/81 Mado 1 and info/103 Dallido were fetched and
   do not carry it), so the provenance cites it as the institute's classification, no
   finer, and does NOT claim any wreck physically preserved a horong timber. cha.go.kr
   (Mado 4, 1417–21, the earliest excavated Joseon grain carrier) anchors the
   tradition's continuity into the panokseon's own dynasty; its page carries no horong
   detail.

4. **The contested placement** — encykorea E0021834 (배): the hanseon structural
   description fixes an anchor-winding drum at the STERN: "고물비우에 키[舵]를 꽂고,
   닻을 감아올리는 굴통도 만들어 고정한다." The institute's naval-line build puts the
   horong at the bow. Rule 9: the record carries both — the drawn machine follows the
   naval line's build record (bow), and the stern variant is named in the provenance.

## The judgment

The horong is the Korean tradition's anchor windlass and the panokseon's warrant is a
**NAVY-TRADITION EXTENSION**, stated in the provenance itself (the r108/r174 shape):
her attestation is "generated"; the machine is attested in her own navy's album
(c. 1797, on the grain-ship plate; the warship plate shows the anchor, and whether it
also draws the windlass is NOT established by the sources fetched), in the institute's
classification of the Goryeo wrecks' gear, and in the living tradition by name. No
source puts a horong on a 16th-century warship directly. The record says exactly that.

## The change

`windlass: {atU: 0.10, barrelLenM: 3.8, barrelDiaM: 0.5, throughBars: true}` +
windlassProvenance on the panokseon. Every dimension's status named:

- **atU 0.10** — PHOTO/TEXT read ±0.05 (at the bow, abaft the stem, forward of the
  sangjang's drawn leading edge at u 0.16 and the foremast at 0.15).
- **barrelLenM 3.8** — GEOMETRIC class default: the drawn deck is 5.79 m wide at the
  drawn station (probe-bow.py, read-only, run BEFORE any record was written:
  zmax 2.894 m at u 0.10). Half-span 1.9 m against the V-SPAN bound 0.95 × 2.894 =
  2.75 m.
- **barrelDiaM 0.5** and the 0.30 m underside — CLASS DEFAULTS, Falconer 1769
  cross-tradition, exactly as the cog (r173) and the junk (r174).
- **throughBars** — the tradition's OWN form read (source 1's through-bars sentence +
  the replica photo), replacing Falconer's single-ended thrust-in handspikes for this
  record only. Bar length 2.0 m is a CLASS DEFAULT (0.75 m of grip beyond the drum each side);
  bar stations along the barrel and the resting angles are DRAWN, not recorded — at
  rest the bars lie near-horizontal (±1.15 rad from vertical): measure_ship caught the
  first draft's 2.4 m near-vertical bars stabbing 0.5 m through the foredeck, and the
  replica photo shows the crew leaves them low.
- **No postHM** — no Korean belaying-post attestation; the standards are Falconer's.

buildWindlass grows ONE parameter (the r174 discipline): under `throughBars` the two
spikes become two long straight bars centred ON the axis, passing through the drum at
different stations, crossed — each projecting both sides, one man's grip at each of
the four ends.

## The audit

Rule r173 is generic over H.windlass: V-WARRANT, V-AXIS, V-SPAN, V-DIA, V-STANDARD and
the three record-blind counters cover the horong with NO edit. The new record field
gets its own watcher (a record field no arm can see is a silent lie):

**V-THROUGH** — when `R.throughBars`: every long thin round timber in the windlass
group (extent ratio ≥ 2.5, length ≥ 1.2 m, cross ≤ 0.15 m — the bars, not the barrel
and not the 0.32 m journals) must STRADDLE the axis: its centre within 0.25 m of the
barrel's axis height and of the ship's centreline-normal plane at its own station.
A single-ended Falconer spike (spL 1.7 m, seated 0.22 m into the hole) rides its
centre (spL/2 − seat) = 0.63 m out from the axis along its own direction — offset
components ≈ (0.33, 0.54) m at the drawn 0.55 rad — and convicts at the 0.25 m gate.
Sim below runs these numbers before any web/ edit.

## Sim (run on the probe's real numbers, before any web/ edit)

- Faithful: axis 0.30 + 0.25 = 0.55 ∈ [0.45, 0.90] ✓; clearance under 0.30 ≥ 0.12 ✓;
  dia 0.5 ≤ 0.9 ✓; half-span 1.90 ≤ 2.75 ✓; bars centred on the axis → V-THROUGH
  silent. All arms silent.
- Sever (builder ignores throughBars, draws the Falconer spikes under the horong
  record): V-THROUGH convicts on the offsets above; every other arm silent.
- Drag (record barrelLenM 3.8 → 7.0 under the FAITHFUL builder): the record-vs-drawn
  arms stay silent (the builder obeys the lying record), and the shell arm convicts:
  half-span 3.50 > 2.75 — "a windlass through the planking", the drawn deck's own
  verdict. Expected on exactly the panokseon.

## Scope

The panokseon ONLY. The sekibune's machine is NOT this one: the minamichita wasen
museum describes the rokuro worked from the yagura AFT, serving halyards, tender and
anchor through a mast-top block — a different machine in a different place, owed its
own judgment (residual updated). Corbita, dhow, trireme stay silent, each owed its
own; the trireme's may rightly end silent.

## In-page results (final code)

- Audit faithful: 33 hulls, 0 problems.
- Sever: 2 convictions, panokseon only, both V-THROUGH at 0.63 m — the sim's own number.
- Drag: 1 conviction, panokseon only, 'a windlass through the planking — barrel 7.00 m
  across a deck 6.27 m wide at its station'. The page's 6.27 m vs the sim's 5.79 m is
  the r174-noted station divergence (the audit measures at the builder's drawn station,
  the probe at the loa-based one); the probe was CONSERVATIVE, so the faithful record's
  V-SPAN margin at the drawn station is larger than planned (1.90 m half-span against
  a 2.98 m bound). The drag's claim holds: exactly the dragged hull, exactly the
  record-blind shell arm.
