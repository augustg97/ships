# r211 — the sweep-derived boxy classes: top (18), channel/cheek/cathead — judgment, then the fix

The r168 probe sweep ranked every mesh of 12 triangles or fewer as "boxy". Four classes stood
in the residual list from r171 onward, each waiting on a judgment before a fix (r171's own
words). This is the judgment, class by class, from the record.

## channel — attested flat; the box stands
Falconer 1769, CHANNELS: "broad and thick planks projecting horizontally from the ship's
outside, abreast of and somewhat behind the masts." A channel is a plank. Its section is
rectangular in every plate. No conviction; no change.

## cathead — attested squared beam; the box stands
Falconer 1769, CAT-HEAD: "a strong beam of timber projecting almost horizontally over the
ship's bows." A squared beam. No conviction; no change. (The supporting knee is drawn as a
short block — a knee is a bracket; a form note, not a boxy conviction, and not this round.)

## cheek (the hounds) — a tapered knee, already shaped; the box stands
hull.js draws each cheek as a box whose lower half is narrowed to 35% (the knee's taper
toward the mast), which is the shape of the load it carries. The sweep counts triangles,
not form, so a deformed 12-triangle box is "boxy" by the criterion and right by the record.
No conviction; no change.

## top — the timbers stand, the PLATFORM was wrong
The 18 "boxy" meshes on a three-master are 3 × (2 trestletrees + 2 crosstrees) under the
tops plus 3 × 2 crosstree bars at the topmast heads. Trestletrees and crosstrees are
rectangular-section timbers in every record — a box is their right section. What the
sweep's criterion could not see is the platform, a 14-sided cylinder with plenty of
triangles: ONE bare round disc on every square-rigged hull from the 1380 cog to the 1902
Preussen.

The record: Lees, The Masting and Rigging of English Ships of War 1625–1860 — tops were
round until about 1710 and square-backed after (after side straight, fore side rounded,
planked over the crosstrees, the lubber's hole between the trestletrees round the
masthead). Before that the top was a fighting position with a bulwark: the WA Kraeck
engraving (c. 1470), the Mataró model, the Mary Rose.

The fix (hull.js buildTop, gated on the depicted year, the same key the top's existence is
gated on since the karchesion round):
- year ≥ 1710: a D in plan — semicircle of radius r forward, straight edge 0.70·r abaft the
  mast (length 0.85 of breadth; Steel's three-quarters, eased so the trestletrees' ends stay
  under the platform — DERIVED, no record gives this fleet's tops), with a rectangular
  lubber's hole cut between the trestletrees inside the crosstrees. ExtrudeGeometry.
- year < 1710: the round platform stays, and a bulwark ring stands on its rim, half the
  radius tall — DERIVED off the Kraeck's proportion.
- Breadth (2r = 0.4·B) unchanged: no record to move it by.

Which hulls get which, by hull.year in vessels.json:
round + bulwark: cog 1380, carrack 1500, slave-ship 1590, sekibune 1597, fluyt 1620,
east-indiaman 1620. Square-backed: ship-of-the-line 1780, clipper 1869, steamer 1870,
preussen 1902, endurance 1912.

The audit rule (Research/audit-hulls.js, THE TOP'S PLAN FORM IS DATED): per top group
(skipping the topmast Crosstrees by name), the platform = the child with the most
triangles; aft/forward extent in the group's frame with +x aft. Before 1710: ratio within
3% of 1 and some child ≥ 0.3·r tall (the bulwark). From 1710: ratio 0.55–0.85 and nothing
over 0.2·r (a 74's top carried no wall). Record-gated on H.year; no year, no rule.

Open, named: the sekibune carries a top at all only because her mast is 'square' rig and
her year clears the 1100 gate; no Japanese plate shows a masthead platform on a sekibune.
That is a per-vessel record question, not this class — carried as a residual.

## Witness (rule 1)
- shipwright-hounds (the 74's main lower masthead from the port quarter): the square-backed
  top read whole — straight edge aft toward the camera, semicircle forward, the lubber's
  hole open round the masthead, trestletrees and crosstrees under it. Diff: the three tops
  and nothing else. 0.326% / 0.187.
- ship-slave-ship (1590): three walled round tops, one per mast; diff shows the three tops
  and nothing else.
- ship-clipper: 0.036% / 0.016, within tolerance — the D-tops at frame scale.

## Gates
- Audit: checked 33 hulls, 0 problems (r211/audit.out), on the edited tree with the new rule.
- Ratchet: launched 12:48 after the audit and the witness captures.
