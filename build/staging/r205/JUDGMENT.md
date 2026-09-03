# r205 JUDGMENT — the verifying firing (20:27), on work inherited from the 08:51 firing

## How the round ran

The 08:51 firing built the cog aftcastle (residual 8), regenerated the six cog
profile captures, ran the audit (33/0, its audit.out), rebuilt docs/, and hit
the usage-credit wall; its close ratchet died at 09:40 on ERR_CONNECTION_REFUSED
(the :8149 server was down) and the round was killed with the tree edited,
uncommitted, no FRAME-LOG entry, no staging JUDGMENT. Every firing 09:50–20:17
failed auth. This firing (20:27) verified the inherited work rather than
redoing it.

## What was verified, item by item

1. **The diff, read whole.** vessels.json: `castle {fromU 0.70, toU 0.94,
   deckHM 1.95, railHM 1.0}` + castleProvenance (text reads ±0.04 u named,
   class-default heights named, Lahn 1992 named as the unfetched superseding
   source, no forecastle stated from the wreck) + windlassProvenance updated
   to say the castle is now drawn. hull.js: the castle block — lofted plank
   deck (per-plank meshes, the snapBand lesson), through-beams past the sides,
   posts, two-band stanchion parapet, breastrail/taffrail, the two side cabins
   with the helmsman's passage between, doors — and the handspike rest-angle
   fork under the deck (steep spikes would stand through a deck at ~4.15 m).
   PARTS.castle card text added. All consistent with Ellmers's sentence
   (Drassana, fetched whole r173), which is the stated warrant.
2. **Audit re-run on the final tree this firing:** checked 33 hulls,
   0 problems (audit2.out).
3. **Eye pass (rule 1):** castle-quarter-crop.png — open platform on posts,
   plank deck with per-plank tones, windlass legible beneath, handspikes near
   horizontal, cabin wall and door behind; port.png — castle sits on the
   sheer, parapet clear; stern.png — the helmsman's passage reads as the open
   bay between the two cabin end walls, rudder below. All three read as the
   reconstruction's arrangement.
4. **Close ratchet in full**, this firing (close-ratchet2.out) — predictions
   in PREDICTIONS-close.md, written before the run finished.

## The retry daemon closed residual 1's fetch

retry-munheon.log: attempt 1 cut by the server at 17,440,104 bytes (the r204
per-connection cap again); attempt 2 (09:52) served the WHOLE 문헌편 in
1780.5 s — COMPLETE byte-exact 127,831,863, %PDF-1.6, on disk, gitignored by
name. The daemon stopped itself as designed. pdfinfo: 151 pages, unencrypted.
pdffonts: NO fonts — a pure image scan; pdftotext returns nothing. Mining =
rendering plates (pdftoppm) and reading them by eye, the r203 method.

## The 문헌편 mapped this firing (page numbers are PDF pages; printed = pdf−1)

- pdf 7 ff.: chronological documents, hanmun + Korean, opening with 태종실록
  1413 (the first 거북선 mention, Imjin ferry) and 1415 탁신's 龜船之法.
- pdf 120: 「이충무공전서」 section opens (어제신도비명, 책선무1등공신교서).
- **pdf 121–122: 권수 도설(圖說) <거북선(龜船)> — the 귀선지제 WHOLE, hanmun
  then translation: 저판 10쪽 length 64자 8치, head 12자 / waist 14자 5치 /
  tail 10자 6치; 현판 7쪽 each side, 7자 5치 high, lowest plank 68자 to
  topmost 113자, all 4치 thick; 노판 4쪽 4자 high with 현자포 holes; 축판
  7쪽 with the 1자 2치 rudder hole in the 6th plank; 신방/가룡/방패/언방;
  개판(귀배판) 11 planks a side with the 1자 5치 mast gap; turtle head 4자
  3치 × 3자; 10 oars and 22 gunports a side, 12 doors; the
  통제영/전라좌수영 differences printed as differences (fewer dragon-head
  holes, 龜紋 on the 좌수영 boat's 覆板, per-side counts).** This is the
  panokseon card's own documentary tradition, now on disk at print quality.
- pdf 127: 난중일기 excerpts (1592.2.27 거북선 방포 시험, 1592.4.12 현자포
  firing trial from the 거북선).
- pdf 130: 권14 부록 6 기실 하; 지봉유설 excerpt on the same page run.
- pdf 135–136: 만기요람 군정편 excerpts — 주사(舟師) 총례 and <귀선(龜船)>,
  its own 龜船 description (十字細路, 錐刀, 銃穴 counts).
- ~pdf 140–151: 회화 속 거북선 — the plates chapter: 전함도 and 수군조련도
  십곡병 (국립중앙박물관), reproduced at archive resolution with colour bars —
  the album tradition r203 named behind the panokseon's anchor and windlass
  warrants. At 60 dpi the fleet detail is illegible; the mining round renders
  these pages at 300+ dpi and crops.

## App change THIS firing: none

The inherited app change is the round's whole app change. This firing's tree
adds staging evidence only (renders, extracts, this file). No prediction was
outstanding for the 문헌편 numbers — nothing mined into the record yet; the
도설 read above is a LOCATOR, not a mined claim. Writing 전서 numbers into
vessels.json happens next round with the plates read at full resolution and
each number checked against the panokseon card's existing warrants.
