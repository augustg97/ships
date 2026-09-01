## Round 188 — 2026-09-01 — the treasure-ship's anchors take the corpus's scale: the r184 promise paid

**The r187 queue head OPENED AND CLOSED (build/staging/r188/JUDGMENT.md): the r184
provenance promised "a measured surviving four-claw anchor would replace all three and
this field says so" — Matsui fig. 3 (paper p. 39, READ ON THE PLATE this round) is that
anchor, three of them. Caption verbatim, after 王冠倬 2000: (a) 蓬莱水城出土 1984, 全長
2.15 m, 456 kg — the complete Ming find from the Penglai naval fortress; (b)
山東省梁山県宋金河出土 1956, 全長 1.36 m, shank inscribed 「甲字五百六十号 八十五斤
洪武五年」 — a 甲-series arsenal serial with an AS-MADE weight, 85 catties ≈ 50 kg,
dated 1372; (c) 泉州四湖港出土 1981, 残高 2.68 m, 758.3 kg, missing parts dotted.**

**The derivation: cube-law from Penglai (k = 456/2.15³ ≈ 46 kg/m³). The recorded
500-catty (~295 kg) sheet lands at 1.86 m full length (was drawn 2.4); the 300-catty
pair inference at 1.57 m (was 2.0), carried to the stern pair. Quanzhou cross-checks
consistent (a complete 2.68 m cube-scales to ~880 kg; the incomplete find's 758 kg is a
lower bound). THE ROUND'S FIND: the Liangshan inscription is a datum the residual did
not carry — an as-made weight showing the corpus spans a stocky naval build (46 kg/m³)
and a slender small-craft build (20 kg/m³), better than 2× apart. Sensitivity NAMED in
the provenance: a power law through both dated Ming points gives 1.96/1.77 m — sheet
inside the audit's 12% band, pair at its edge. Penglai, the naval-fortress find of the
state build the forging text describes, is the calibrator for a state ship's tackle.**

**Class not instance: ironAnchors converted to the r187 yotsume convention — record
fields renamed sheetLenM/bowerLenM/sternLenM and now carry the FULL crown-to-ring
length a find's 全長 measures; makeAnchor splits it internally (shD = 0.046·full,
shank = full − 2.78·shD) so the drawn ring top lands at the field's value; V-SHANK
(world-AABB of the shank mesh) replaced by V-LEN — per anchor, shank + head-ring
extents projected on the shank's own world axis, the V-YLEN geometry-through-matrix
form, sorted against the record's lengths. Card row gains the concrete sizes and their
source; provenance rewritten with calibrator, cross-check, sensitivity and the standing
that remains (claw sweep still a woodcut default — the finds are not measured
part-by-part).**

**Measured (rule 4/1): audit V-LEN reads every drawn crown-to-ring length equal to
its record through the 45° stow (33/0 — the rule and builder agree on the convention);
measure_ship walks the five assemblies — bow set u 0.029–0.058 on the foredeck, stern
pair and coils u 0.91–0.95 at y 10.5–10.9, the r185-measured poop roof; the drag proof's
own read (2.19 = 1.35 × the drawn 1.622 m shank) confirms the projection sees the
geometry, not a box.**

**Audit 33/0 on the final code (all edits landed before the run; the r187 double-run
was one run this round — the first live run WAS the final tree, and the solo re-checks
rendered the same code again).**

**Proofs on final code: drag (sheet shank stretched 1.35× under a faithful record) →
exactly ONE conviction, V-LEN "crown to ring head 2.19 m along the shank's own axis —
the record's full length is 1.86", read through the stow spin; sever (one anchor's claw
tips stripped) → exactly ONE, V-CLAWS "16 claw points drawn for 5 anchors", V-LEN
silent.**

**Looked at (rules 0/1): the profile tool's port broadside with its u-ruler
(z-port-center.png — centre crop, the r187 neighbour trap avoided) and the plan's bow
and stern crops at 3×. The frame reads as a rendered vessel. Three facts a viewer can
read: three four-clawed iron anchors lie recovered on the foredeck — sheet on the
centreline, one either side — cables led aft to the windlass bar; a fourth lies on the
poop's dark top roof with its cable flaked in a coil beside it, its twin behind the
furled after-sail bundle (the r185 occluder, named); the five battened lugsails are
dropped into their stacks and the median rudder hangs aft of u 1.00. Card row shot
(z-tre-card-anchor.png): renders whole with the new calibration sentence, plain type,
rawStar False.**

**Frames: the owed opening 64 PAID AND PURE — launched 09:28 on the unedited tree;
edits were staged in build/staging and LANDED ATOMICALLY (mv) only after frames 41/42
(ship-treasure, aboard-treasure — the only edit-bearing frames) had captured; 64/64
within tolerance, 0 movers, 0 BLANK, EXIT:0, ship-treasure 0.000 and aboard-treasure
0.000 on the unedited tree. Close (the r174 solo fallback): ship-treasure 0.034% on
final code — read and located, the anchors' own pixels — ACCEPTED with FRAME-LOG
reason (r132-in-advance), then 0.000; aboard-treasure 0.002% flap-level, within
tolerance, not accepted (the r184 precedent). ⚠ solos WIPE _current (frame_baseline
rmtree's it per check) — an accept must directly follow its own frame's check; this
round hit the same wall r187's kill report named, and the sequence that works is
check → accept → re-check.**

**Deployed: data-version 1788282548. Live verify below.**

**Named residuals, in order:** (1) NEW r188, small: fig. 3a self-scales (全長 2.15 m in
its own caption) — a part-proportion pass could replace the claw-sweep woodcut default;
plate and px/m to be named per the Azzam rule. (2) r187: the 1433 Jingu Kogo engi emaki
warship-anchor plate — fetch in resolution if it surfaces open. (3) r187: the two
ray-free anchor rest rules (grapnel, stoneAnchor) still compare against the sheer
FUNCTION, not the drawn plank — move to the surface-asked form. (4) r186: the panokseon
stone-station inference (Taean reproduction photo). (5) r182 grapnel shank
reconstruction. (6) r183 junk stone bar class default. (7) r177 Lucian's second
machine. (8) r173 cog Gangspill. (9) r173 cog castles. (10) r173 cog rudder slab.
(11) r176 sekibune class-size (kiwari read). (12) boxy classes: top (18),
channel/cheek/cathead. (13) Preussen mast livery. (14) Endurance forecastle.
(15) Azzam crest span. (16) r164 risen black unpierced. (17) r165 fantail gallery
wings. (18) r166 screen glass. (19) r171 quarter-gallery sashes. (20) r171 authored
tier fractions. (21) r172 the 74's lower capstan barrel. (22) r181 eraSm dead fallback
branch (app.js:1353).
