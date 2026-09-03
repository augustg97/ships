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

**Proven to fire (rule 8, the audit checked first; r211/inject-a.json, inject-b.json).**
inject-a severs the builder — every top back to the bare disc, any ring removed: 11 problems on
exactly the 11 square-rigged hulls, each on its own arm — cog, carrack, sekibune, fluyt,
east-indiaman, slave-ship "walled for the wrong century" (1/1, 2/2, 1/1, 2/2, 3/3, 3/3 tops);
ship-of-the-line, clipper, steamer, endurance, preussen "the wrong century's form" at ratio 1.00
(3, 3, 3, 1, 5 tops). inject-b severs the record from the build on one hull — the slave ship
built as if at 1800: both arms convict her alone, 3 of 3, ratio 0.70 against a record year of
1590. Clean tree: checked 33 hulls, 0 problems (r211/audit.out).

**Witnessed (rule 1) before the run: shipwright-hounds solo — the 74's main lower masthead
from the port quarter, the square-backed top read whole, straight edge aft toward the camera,
semicircle forward, the lubber's hole open round the masthead, trestletrees and crosstrees
under it; ship-slave-ship solo — three walled round tops, one a mast. Both diffs read: the tops
and nothing else.**

**The close ratchet, RUN WHOLE in one attempt (build/staging/r211/close-ratchet.out, 12:48:09
→ 13:28:46, ~38 s a frame under load 6–21): 64 frames, 7 movers, every one read and accepted
(FRAME-LOG.md, seven entries stamped 13:29) — shipwright 0.062%/0.024, shipwright-ahead
0.052%/0.024, shipwright-furled 0.293%/0.128, shipwright-hounds 0.326%/0.187, ship-steamer
0.101%/0.044, ship-slave-ship 0.126%/0.063, ship-sekibune 0.094%/0.071. Every diff image was
read: the changed pixels are mastheads only — the tops, and on shipwright-furled the rigging
passing them. ship-clipper 0.036%, ship-preussen 0.044%, ship-endurance 0.024%: their new tops
sit inside tolerance at frame scale. globe-default at its documented 0.046%/0.011 flap an
eleventh round. No readiness abort. Rule 0 answered on shipwright-hounds, read whole from
_current: it reads as a rendered world — canvas bellying in a breeze around a made mast with
its wooldings, the top in perspective against open water. Three facts a viewer can read off it
without a legend: the card prints 57.0 m length overall and 14.60 m beam for the 74; the main
lower masthead carries a square-backed top with the lubber's hole open round the mast and the
topmast shrouds spreading from its rim; the scale bar at lower right reads 2 metres against the
neighbour's top.**

**Gates: audit 33/0 on the edited tree with the new rule; both injections as predicted; build
after the run, the r207 order. web/index.html carries the same stamp and is in this commit's
path list (the r209 rule).**

**Named residuals, in order (r210's list, renumbered):** (1) CLOSED this round — the
sweep-derived boxy classes. NEW from it: **the sekibune carries a top at all** only because
her mast is 'square' rig and 1597 clears the 1100 gate; no Japanese plate shows a masthead
platform on a sekibune — a per-vessel record question, to be read with (8)'s kiwari read; until
then she draws the class's walled round top. (2) HEAD, r212: **the vessel survey continues —
r173's cog Gangspill (old 7), the medieval capstan on the aftcastle top, attested by Ellmers
and the Kiel build record; the castle it stands on was drawn in r205.** (3) Kozushima 1993
weighing (print-only stands). (4) r187 emaki plate. (5) r182 grapnel shank — retry from a
cooler week. (6) r177 Lucian's second machine. (7) r173 cog rudder slab. (8) r176 sekibune
class-size (kiwari read), now paired with the top question. (9) Preussen mast livery. (10)
Endurance forecastle. (11) Azzam crest span. (12) r164 risen black unpierced. (13) r165
fantail gallery wings. (14) r166 screen glass. (15) r171 quarter-gallery sashes. (16) r171
authored tier fractions. (17) r172 the 74's lower capstan barrel. (18) the cathead's supporting
knee is a block; a knee is a bracket — form, not boxy, small. (19) the readiness transient: no
abort this round at timeout 150 s under load 6–21; keep the r208 rule.

**Build PUBLISHED, data-version 1788467565, docs/ 10 entries; web/index.html
carries 1788467565. Push receipt and live stamp: appended below after the push, per the r198 rule.**
