## Round 212 — 2026-09-03 — the cog's Gangspill: the recovered timber itself gives the form, and it stands on the castle top Ellmers names

**Queue check first: August's second list stands WORKED IN FULL (r57). r211's residual 2 was
the head task — r173's cog Gangspill, the medieval capstan on the aftcastle top — and it is
DONE: drawn from the object's own museum record, on the castle drawn in r205, with an audit
branch behind it proven both ways (build/staging/r212/JUDGMENT.md).**

**The record, and it is the best kind: the timber itself.** The DSM's collection database
(museum-digital:bremen object 3, Inv. I/11066/14; r212/dsm-gangspill.md, fetched whole) says
the Gangspill was found when the Bremen cog was raised from the Weser in the 1960s — the
ORIGINAL capstan came up with the wreck, the sentence r173 could not find for the windlass.
Oak, **D 56 cm, H 176 cm**, the museum's own measurements. The museum's description fixes the
form: the handspikes shipped into RECTANGULAR HOLES in the body, and "das Windentau lief um
den unteren Holzkegel" — the rope ran round the LOWER wooden cone. That is Falconer's machine
the other way up: the rope-drum is a cone at the foot and the bars pass through the head above
it; no whelps, no drumhead disc, no pawls. The DSM photograph (r212/gangspill-dsm.jpg, an
oblique museum plate with no scale) gives the proportions as reads: the head a squared
eight-sided block a little over half the height, wider than the neck so it stands on a
shoulder; the cone widening to the foot. Use per the museum: working the square sail round to
the wind. Position per Ellmers (r173): "a capstan on its top" of the aftcastle.

**The change (web/js/hull.js, a `form: 'spill'` branch ahead of the r172 Georgian builder,
which is now gated `form !== 'spill'`; before-copy r212/hull.before.js). Record:
`capstan: {form 'spill', diaM 0.56, heightM 1.76, atU 0.82, onCastle true, bars 2}` +
capstanProvenance on the cog (web/data/vessels.json), naming which numbers are the museum's,
which are text reads (station ±0.06 u), which are photograph reads (no scale), which are
class defaults (two through-shipped spikes, the step). Built: a squared oak step on the
castle planking; the cone, 0.56 m at the foot to 0.40 at the neck, 0.81 m tall; the head,
eight flats non-indexed, 0.54 m across, 0.95 m tall, on a shoulder; two 2.0 m handspikes
through the head at right angles, one above the other, horizontal because a horizontal hole
lets them lie no other way. It stands on the castle deck at the castle's own station — the
deck height read from the same castle record the castle is built from. PARTS.capstan card
now describes the medieval form beside the Georgian.**

**Measured (measure_ship): spill-cone dia 0.56, foot at 4.13 m — the castle deck at that
station; spill-head top 5.89, 1.76 m foot to top, the record's; spill-bar at 1.18 and 1.49 m
over the foot — chest height.**

**The audit branch (Research/audit-hulls.js, synced to web/ and docs/): THE MEDIEVAL SPILL IS
THE RECOVERED TIMBER'S FORM.** Every part read from vertices — the first draft keyed the
head on geometry class, and a non-indexed head carries no parameters, so the audit convicted
the faithful builder ("nothing stands above the cone"); rule 8, the audit checked first, the
r173 lesson a second time. Arms: S-CONE (the lowest part is one body on the axis widening
toward the deck — a whelp is off the axis and cannot pass for it), S-HEAD (broader than the
neck, above the cone), S-BARS (each crosses the axis inside the head's height; count the
record's), S-SIZE (foot ±15%, height ±12%), S-STAND (foot on the castle deck at its station,
read off the castle's own plank vertices), S-STATURE (record-blind: bars 0.9–1.6 m over the
foot, spindle 1.2–2.2 m). Proven: inject-a severs the builder (Georgian machine under a
'spill' record) → the cog alone, "a spill with no cone to take the rope"; inject-b drags
heightM to 3.2 under the faithful builder → the cog alone, three record-blind convictions
(spikes 2.20 and 2.65 m over the foot, spindle 3.20 m), S-SIZE silent as it must be. Clean
tree 33/0 (r212/audit.out).

**Witnessed (rule 1) before the run: r212/spill-astern.png, spill-quarter2.png,
spill-quarter.png, read whole — from astern the eight-sided head on its cone standing on the
square step in the castle planking, the two pale handspikes crossed through the head at two
heights, the breastrail forward of it and the mast beyond; from the starboard quarter the
same machine against the water inside the parapet.**

RATCHET_PARAGRAPH

**Gates: audit 33/0 on the edited tree with the new branch; both injections as predicted;
build after the run, the r207 order. web/index.html carries the same stamp and is in this
commit's path list (the r209 rule).**

**Named residuals, in order (r211's list, renumbered):** (1) CLOSED this round — the cog's
Gangspill. NEW from it: the DSM series "Bremer Kogge" holds 21 objects; whether the
Bratspill (the windlass barrel) is among them settles r173's open question the same way —
one fetch. Also NEW: no cable is rigged on either of the cog's machines; when one is, the
museum's use (the yard worked round to the wind) says where it leads. (2) HEAD, r213: **the
vessel survey continues — r173's cog rudder slab (old 7): the rudder reads as a pale
untextured slab below the sternpost in profile.** (3) Kozushima 1993 weighing (print-only
stands). (4) r187 emaki plate. (5) r182 grapnel shank — retry from a cooler week. (6) r177
Lucian's second machine. (7) r176 sekibune class-size (kiwari read), paired with r211's
top question. (8) Preussen mast livery. (9) Endurance forecastle. (10) Azzam crest span.
(11) r164 risen black unpierced. (12) r165 fantail gallery wings. (13) r166 screen glass.
(14) r171 quarter-gallery sashes. (15) r171 authored tier fractions. (16) r172 the 74's
lower capstan barrel. (17) the cathead's supporting knee is a block. (18) the readiness
transient: keep the r208 rule.

BUILD_PARAGRAPH
