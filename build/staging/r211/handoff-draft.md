## Round 211 — 2026-09-03 — the boxy classes judged, and the top takes its dated form: round and walled before 1710, square-backed after

**Queue check first: August's second list stands WORKED IN FULL (r57). r210's residual 2 was
the head task — the sweep-derived boxy classes, top (18) and channel/cheek/cathead, judgment
first — and it is DONE: three classes judged attested and left standing, the fourth fixed at
the class level with an audit rule behind it (build/staging/r211/JUDGMENT.md).**

**The judgment, from the record.** The r168 sweep's criterion is triangle count (≤ 12), which
sees a section and not a form. CHANNEL: Falconer 1769, "broad and thick planks projecting
horizontally from the ship's outside" — a plank; the box is its section. CATHEAD: Falconer,
"a strong beam of timber projecting almost horizontally over the ship's bows" — a squared
beam. CHEEK: hull.js already narrows the knee's lower half to 35%, the taper of the load it
carries; a deformed 12-triangle box, boxy by the count and right by the record. TOP: the 18
are 3 × (2 trestletrees + 2 crosstrees) under the tops and 3 × 2 crosstree bars at the
topmast heads — rectangular-section timbers in every record. No conviction on any of the
four. What the criterion could not see was the top's PLATFORM: a 14-sided cylinder with
plenty of triangles, one bare round disc on every square-rigged hull from the 1380 cog to
the 1902 Preussen.

**The record on tops.** Lees, The Masting and Rigging of English Ships of War 1625–1860:
tops were round until about 1710 and square-backed after — after side straight, fore side
rounded, planked over the crosstrees, the lubber's hole between the trestletrees round the
masthead. Before that the top was a fighting position and carried a bulwark: the WA Kraeck
engraving (c. 1470), the Mataró model, the Mary Rose.

**The change (web/js/hull.js buildTop, gated on S.year, the depicted year — the same key
the top's existence has been gated on since the karchesion round; before-copy at
r211/hull.before.js).** From 1710: a D in plan, semicircle of radius r forward, straight
edge 0.70·r abaft the mast, length 0.85 of breadth (Steel's three-quarters eased so the
trestletrees' after ends stay under the platform — DERIVED, no record gives this fleet's
tops), with a rectangular lubber's hole cut between the trestletrees inside the crosstrees;
one ExtrudeGeometry. Before 1710: the round platform stays and a bulwark ring stands on its
rim, half the radius tall — DERIVED off the Kraeck's proportion. Breadth 2r = 0.4·B is
unchanged: nothing in the record to move it by. By hull.year: round and walled — cog 1380,
carrack 1500, slave-ship 1590, sekibune 1597, fluyt 1620, east-indiaman 1620; square-backed
— ship-of-the-line 1780, clipper 1869, steamer 1870, preussen 1902, endurance 1912. The
Top's card text now says the form is dated. The timbers under the top keep their boxes,
with the judgment written above them in the code.

**The audit rule (Research/audit-hulls.js, THE TOP'S PLAN FORM IS DATED, synced to web/ and
docs/).** Per top group, skipping the topmast Crosstrees by name: the platform is the child
with the most triangles; aft and forward extents measured in the group's frame with hull +x
aft. Before 1710: aft within 3% of forward, and some child at least 0.3·r tall (the
bulwark). From 1710: aft 0.55–0.85 of forward, and nothing on the platform over 0.2·r — the
bulwark is the fighting top's; a 74's top carried none. Record-gated on H.year: no year, no
top, no rule.
