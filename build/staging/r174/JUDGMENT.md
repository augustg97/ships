# r174 — The Chinese windlass: the bow machine two primary texts describe, on the two hulls of its tradition

## The question

r173 closed the cog and left residual (1): seven r172 hulls attest OTHER gear and draw
nothing, "junk and treasure-ship (the Chinese windlass Needham/Worcester describe)" first.
This round opens and closes those two. The other five (panokseon, sekibune, corbita, dhow,
trireme) stay silent, each still owed its own judgment.

## The sources, fetched this round

1. **Xu Jing, 宣和奉使高麗圖經 (Gaoli tujing), 1124, 卷三十四** — an eyewitness technical
   description of the Song sea ships (客舟) that carried the embassy to Korea, written by a
   man who sailed in them (saved as `gaoli-tujing-34.txt`, zh.wikisource). The machine,
   whole, in one sentence:

   > 船首兩頰柱中，有車輪，上綰藤索，其大如椽，長五百尺。下垂矴石，石兩旁，夾以二木鈎。
   > … 遇行則卷其輪，而收之。

   Between the two cheek-posts at the ship's head there is a winch wheel, on which is wound
   a rattan cable as thick as a rafter and five hundred feet long; below hangs the anchor
   stone, two wooden flukes clamped at its sides … getting under way, they roll the wheel
   up and recover it. A wheel journalled BETWEEN two posts with the cable wound ON it is a
   horizontal-axle windlass — the geometry is in the sentence. And the ship it stands on is
   長十餘丈 (ten-odd zhang, ~30+ m), 闊二丈五尺 — our junk's own size, class and era.

2. **Song Yingxing, 天工開物 (Tiangong Kaiwu), 1637, 舟車** — the Ming technical
   encyclopedia's grain-ship (漕舫) and sea-ship (海舟) chapters (saved as
   `tiangong-kaiwu.txt`, zh.wikisource). Three sentences carry the judgment:
   - 「凡鐵錨所以沉水系舟，一糧船計用五、六錨，最雄者曰看家錨，重五百斤內外，其餘頭用兩枝，
     梢用二枝。」 Five or six iron anchors per grain ship, the greatest ~500 catties; two
     worked at the HEAD, two at the stern.
   - 「風息開舟，則以**雲車**絞纜提錨使上。」 When the wind drops and the ship gets under
     way, the 雲車 ("cloud winch") winds the cable and raises the anchor. The machine,
     named.
   - 「頭面眉際樹兩木以系纜者曰**將軍柱**。」 Two timbers erected at the brow of the bow
     face to belay the cable: the "general's posts" — the same two bow posts Xu Jing's
     wheel turned between, five centuries later, now with a name.
   And the warrant that carries the machine to sea: 「凡遮洋運舡制，視漕船長一丈六尺，闊二
   尺五寸，**器具皆同**」 — the ocean-going transport is the grain ship's build, longer and
   broader, ITS GEAR ALL THE SAME; and 「元朝與國初運米者曰遮洋淺船」 — that sea transport
   is the ship of the Yuan and EARLY MING state fleets, the treasure fleet's own era and
   administration. Also fetched, for the record's texture: anchor cables are plaited from
   boiled bamboo strip (「若系錨纜，則破析青篾為之。其篾線入釜煮熟，然後糾絞」), where Xu
   Jing's were rattan.

3. **Named as NOT fetched:** Needham, *Science and Civilisation in China* IV.3, and
   Worcester, *The Junks and Sampans of the Yangtze* — every scan found is
   access-restricted (archive.org lending; fulltext search refused the items). r172's
   residual cited them secondhand; this round replaces that citation with the two primary
   texts above, both read whole in the original. No Worcester measurement of a junk
   windlass barrel was obtained — every dimension below is a named class default, none is
   a source read.

## The warrant, per hull

- **junk** (Chinese junk, 200–2026, loa 34, beam 9.8): DIRECT. The Gaoli tujing's 客舟 is
  a Song seagoing junk of ten-odd zhang — the drawn ship's own size, class and century —
  described by a passenger who watched the machine worked. The TGK confirms the same
  arrangement (bow posts, winch, cable) as standing practice five centuries on.
- **treasure-ship** (1405–1435, loa 70, beam 18): FLEET-CLASS EXTENSION, stated as such.
  This hull's attestation field is "generated" — her own record attests no fitting, and her
  card says the famous dimensions are fiction. What is attested is the TRADITION: the TGK
  names the 雲車 for the grain ships and says the Yuan/early-Ming state SEA transports
  carried the same gear. The windlass drawn on her is the tradition's machine at her scale,
  not a find and not a plan — the provenance says so in the record itself (the r108
  lesson: an inference must not inherit a record's provenance).

## The numbers

Shell numbers from the read-only probe of the drawn hulls (`probe-bow.py`, run before any
edit): junk deck half-breadth at u 0.10 = 2.798 m (span 5.60); treasure-ship at u 0.10 =
5.238 m (span 10.48).

| hull | quantity | value | status |
|---|---|---|---|
| junk | station atU | 0.10 | TEXT read — 船首兩頰柱中, at the head between the cheek-posts; ±0.04 u |
| junk | barrel length | 4.60 m | CLASS GEOMETRIC — no length survives in either text; the barrel spans the foredeck between the posts. The probe read 5.60 m of deck at the loa-based station; the audit later measured 6.63 m at the DRAWN station (the builder stations on its own length parameter), so the probe was conservative and V-SPAN passes with more margin than planned: 2.30 ≤ 0.95·3.315 |
| junk | barrel diameter | 0.50 m | CLASS DEFAULT — thick enough to pass a rattan cable 大如椽 and take bored handspike holes; the only measured barrel in the project's records is the Kiel cog's 0.60 on 4.5 m |
| junk | post height | 1.60 m | CLASS DEFAULT — the standards are the 頰柱/將軍柱 mooring posts, rising above the barrel to take the cable's turns (系纜); a post that stops at the journal cannot belay |
| treasure | station atU | 0.10 | TEXT read — 頭用兩枝, anchors worked at the head, cable on the 將軍柱 at 頭面眉際; ±0.05 u |
| treasure | barrel length | 6.00 m | CLASS GEOMETRIC — a third of beam, between the posts on a 10.48 m foredeck. Passes V-SPAN: 3.00 ≤ 0.95·5.238 = 4.98 |
| treasure | barrel diameter | 0.60 m | CLASS DEFAULT — the Kiel cog's measured barrel, at a hull of greater scale; the borable bound (≤0.9) still holds |
| treasure | post height | 1.80 m | CLASS DEFAULT — as the junk's, scaled to her freeboard |
| both | barrel underside over deck | 0.30 m | CLASS DEFAULT — Falconer 1769 ("about a foot"), named cross-tradition as in r173; axis clamped [0.45, 0.90] — the machine is sized to the men |
| both | eight-square barrel, two shipped handspikes | — | CLASS MECHANISM — Falconer's bored-hole windlass, named cross-tradition; the TGK's 絞 (to wind by lever) is the same work |

## What is NOT established

- No dimension of any Chinese windlass barrel was fetched; both barrels are class defaults.
- Whether the 雲車 carried a ratchet or pawls is not established — none are drawn.
- The 500-catty 看家錨 is the GRAIN ship's anchor; no anchor weight for the treasure ships
  was fetched. The anchors themselves are a separate part and not this round's subject.
- 雲車 localization: the TGK names the machine and the bow posts but does not say in one
  sentence that the 雲車 stands AT the posts; the localization is Xu Jing's (船首兩頰柱中),
  carried forward. Stated here so the join is visible.

## The audit

Rule r173 is generic over `H.windlass` and covers both new records with no edit: V-WARRANT,
V-AXIS, V-SPAN (record length AND inside the planking at its own station — the live
constraint at a bow station), V-DIA, V-STANDARD, and the three record-blind counters
(axis 0.45–0.90 m over the deck; barrel ≤ 0.9 m borable; ≥ 0.12 m cable clearance).
`sim.py` proves the arms on the real shell numbers BEFORE any web/ edit; in-page sever
(vertical barrel on the junk under a present record; treasure-ship drawn with its record
deleted) and drag (junk barrelLenM 4.6→9.0 and treasure barrelDiaM 0.6→1.4 under the
FAITHFUL builder) prove conviction on exactly the expected arms.

Run results: sever convicted exactly as simulated (junk V-AXIS alone, treasure V-WARRANT
alone, 31 silent). Drag convicted record-blind arms only, on exactly the dragged hulls —
with one divergence from the sim: the treasure's dragged diameter drives the builder's
axis clamp to its 0.90 boundary, and in the page's floats 0.90 lands a hair over, so the
lever arm fired alongside the bore arm. The sim treated the boundary as inclusive; the
page did not. Both arms are record-blind, so the drag's claim — only record-blind arms
survive a lying record — holds; the exact-arm count was off by this one boundary case.
