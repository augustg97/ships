# HANDOFF — Ships

*Written 2026-08-01, end of kickoff + round 1.*

## What this is

**The world ocean as a machine of wind, current and ice — and the ships built to cross it.**
Live: **https://augustg97.github.io/ships/** · repo `augustg97/ships`, Pages from `main:/docs`
· local `~/Ships`, dev server port **8149** (registered in `~/.claude/launch.json`).

Read `SCOPE.md` first — it is the contract, and §13 carries the decisions of record and §14 the
one amendment already forced by the sources.

## State

**v1 is live and the gate passes.** Data version 1785571065, verified live.

- **The substrate** is composed per pixel in one fragment shader: GEBCO 2026 bathymetry at
  2.44 km as a four-level tile pyramid, monthly SST / chlorophyll / cloud, NCEP 10 m wind, and a
  measured sea-ice margin. **There is no basemap image anywhere in the project.**
- **The spine** is a passage-making model — time-dependent Dijkstra over the wind field with a
  per-rig polar — rendered as a field of isochrones on the real ocean. 69,045 of 70,902
  navigable cells in ~340 ms.
- **423 ports, 17 vessel types with polars, 8 chapters, 8 battles.**

## The score, and it is the point

The engine computes an East Indiaman Lisbon→Batavia in **119 days** against a recorded
**237–253**. **It is fast by a factor of two**, and every missing term pushes that way: no
currents, no sea state, no port time (the VOC spent ~a month at the Cape), a vector-mean wind
with a floor, and a departure from Lisbon rather than Texel.

What comes out *right* is the ordering and the asymmetries: eastbound Atlantic beats westbound,
the galleon's return leg far exceeds its outbound, and a dhow leaving Calicut in January reaches
Aden while the same dhow in July cannot leave at all. That last one is the monsoon calendar
falling out of the wind field with nothing authored.

`Research/modeling/passages.py` holds the recorded corpus and is in the build gate.

## What the next session should do, in order

1. **A1 — currents.** The largest hole. Try OSCAR v2.0 at PO.DAAC first (CC-BY per its JSON-LD,
   anonymous fetch worked in testing), then the AOML drifter climatology. Both the set-and-drift
   term and the water-frame correction are already written and inert in `web/js/route.js`.
2. **A2 — the scalar-mean wind**, so the force-3 floor can be *deleted* rather than retuned.
3. **B1 — generated hulls.** The largest piece of August's original ask still outstanding, and
   the inputs are all located: HAER measured drawings (public domain, real lines plans), Scottish
   Maritime Museum half-hulls (CC0 on Zenodo), MAN Table 1.01 for block coefficients.
4. **B2 — animate the Armada** off Medina Sidonia's own journal, which gives the wind day by day.

## Traps specific to this subject

- **Calendars.** The Armada is English Old Style, ten days behind Spanish New Style. Russia was
  Julian until 1918, so Tsushima has two dates. Japan changed in 1873. Prehistoric dates are
  BP = before 1950 and are never silently mixed with BCE.
- **Jutland times:** British reports GMT, German CET. Mixing them creates ghost events an hour
  apart — *Lützow* is scuttled at 01:45 or 02:45 depending on whose account you are reading.
- **Tonnage is not one unit.** Burden, builder's old measurement, gross/net register,
  displacement, deadweight and TEU are different quantities and must never share an axis.
- **CLIWOC longitudes are not Greenwich.** Only 45% of its 287,114 positions are: 67,000 use
  Tenerife (Ferro), 10,000 Paris, plus Cádiz, London, the Lizard, St Helena — and 30,230 are
  Unknown. Plotting them naively misplaces a quarter of 18th-century shipping by ~17°.
- **Three famous numbers that are wrong**, all checked at kickoff: the Brouwer "12 months to 6"
  (SCOPE §14), Zheng He's 138 m treasure ship (from a 1597 *novel*; the dock is 41 m wide against
  a claimed 52 m beam), and "six points off the wind" (a heading, not progress — GPS-instrumented
  replicas make good 71–90° and lose ground above force 4).
- **SlaveVoyages is CC BY-NC.** Cite it; do not republish it. The published aggregates are fine.
- **NASA NEO is decommissioned 1 September 2026.** Everything wanted from it is mirrored in
  `data/ocean/`; the upstream will be gone.

## Commands

```bash
cd ~/Ships/build
python3 fetch_ocean.py     # NASA NEO mirror (already done; NEO dies 2026-09-01)
python3 build_fields.py    # GEBCO + surface fields -> data/master, web/fields
python3 build_tiles.py     # the pyramid -> web/fields/z0..z3
python3 build_data.py      # ports, vessels, chapters, battles, about
python3 build_site.py      # THE GATE, then web/ -> docs/. The only publication route.
```

`web/fields/` is gitignored and regenerable; `docs/` carries the published copy, levels 0–2 only.

## Round 9 — 2026-08-04 — ships on the water, and the three layers

**The ships were in orbit because of one cross product.** `makeBasis(fwd × up, up, fwd)` is
LEFT-handed; `Quaternion.setFromRotationMatrix` does not check and returns a valid quaternion
that is not the transform asked for. Written three times in this codebase, wrong in two of them.
Consorts reached +1,250 km and −646 km; the flagship at local (0,0,0) was always right, which is
why single hulls looked fine for eight rounds. One `tangentBasis()` now, right-handed by
construction. Full account in `Research/PASSAGE.md`.

Also: consort stations are dropped onto the SPHERE (the tangent plane leaves it at 210 km per
ship-length), and ships beyond `acos(R/d)` are culled — the same horizon threshold the chart
lettering learned in round 2.

**Verified:** 112 hulls × 8 eras × 4 zooms, worst altitude **3.1 km** (was 1,250). 14 of 14
tracks have Y along the radius. The cull fires on an antipodal ship and passes one underfoot.
Passage courses 090/000/180/270 point east/north/south/west; its sun reprojects onto the globe's
sun with dot 1.0000.

**The three layers** (`Research/LAYERS.md`): "What lives in the water" was a measurable dead
switch — 0.16 % of pixels, mean 0.008 — because its ramp put open ocean at 0.12 against an OFF
value of 0.16. Rebuilt; 11.6 % of water pixels move over the Benguela and the upwelling ribbon
is legible. Cloud rebuilt with parallax, wind advection, two scales and a cast shadow. Wind
streaks elongated 6.8:1 → 19:1 with a third less amplitude, because the eye reads wind from
elongation, not contrast.

**STILL OPEN, and it is the big one:** a continuous descent from orbit to sea level. The globe
stops at 765 km, where a 42 m ship is 0.077 px and the token has to be 1,670 × true scale. The
Passage jumps straight to 100 m off a hull. Between them there is nothing, and that gap is what
"a simulated ocean with simulated ships on a global scale" means. It needs: the wheel range
extended, the token exaggeration converging to 1.0 as altitude falls, and the Passage's
near-field water anchored under the camera rather than under one ship.

---

## Round 14 — 2026-08-04

Items from August's eight-point list, in the order they were taken.

**(3) Ships on land — the standing one.** Four faults, each of which had survived because the
check for it was run on something adjacent to the thing that was wrong.

* *The seams.* A voyage is a dozen passages stitched end to end and each was smoothed against
  itself. All 97 corners over 60 degrees, and both 180-degree reversals, were within a kilometre
  of a stitch. Finishing now runs on the assembled track (`finishTrack` in route.js).
* *The datum.* Era 0 is 60,000 BP and the shader draws the shoreline 68 m lower, while the
  router planned on modern coastlines. `FINE` held a boolean decided once; it holds elevation
  now and the datum is a parameter (`setSeaLevel`). The audit had been reading the sea level
  once, before the era loop, which is why four rounds never saw it.
* *The curve, again.* 0 of 84,000 track points ashore and hulls still on New Britain, because
  smoothing accepted a move whose POINT was wet while the SEGMENT it created cut the headland.
  Segments are tested at 1 km on the great circle now; where a sidestep cannot clear one, a
  small A* on the fine grid plans the channel (`fineDetour`); where that fails the span is
  re-planned across a widening window.
* *gcWet excludes its endpoints*, so it could not by itself stop a point being moved ashore.

Measured, 63 tracks: **0 track points ashore; 194 of 1,382,871 drawn-curve samples ashore
(0.014%)**, from 11.45% when this work began. The residue is ~6 segments in the Flores/Timor
low-stand straits and among the Fijian islands, where the 4.9 km grid has no navigable channel.
A level-3 mask is the only thing that would close it.

**(4) Movement.** Uneven spacing was the "freezing then jumping" — the fleet interpolates
between waypoints at a constant rate, so a 0.4 km step and a 5 km step take the same time.
Resampled to constant arc length: median 4.00 km, p99/p01 = 1.19. Corners over 60 degrees:
**10**, from 97, and the survivors are real landfalls. Consort stations are found by bisection
and eased. Ships hold traffic separation under COLREGS (`avoidPass`): **0 overlapping hulls**.

**(6) Pace.** `clamp(hours/10, 100, 420)` hit its floor at both ends of the fleet, so screen
speed was proportional to route LENGTH and Magellan at 5.8 kn outran the box boat at 16. No
ceiling now: km/s = knots x 4.41 for every hull, exactly. The container ship is the fastest
thing on the map at 71 km/s, down from 200.

**(7) The fleet.** 13 voyages to 62, and all 25 hull types now sail — 16 of them never had.
Suez and Panama are carved passages carrying the year they opened.

**(2) The door.** Clicking a hull calls `followShip()`; the card's button called
`closePassage()`, which begins `if (!PSGV.on) return`, and `followShip` never sets `PSGV.on`.
The button was wired to a function guaranteed to do nothing on the only path a user can take.
One exit now (`leaveShip`), and it flies.

**(5) The fleet list** gives ship and live position, and a click flies to where she actually is.

**(1) The wake.** The near-field sea is one mesh at the origin of a scene anchored under the
ship, so its wave field travelled with the hull — she could make 16 knots with the water beside
her going nowhere. `uDrift` makes the waves belong to the ground. Bow wave, Kelvin arms at
19.47 degrees and a turbulent band astern are in SEA_FRAG. The waterline time compression is
derived now (C = 8577) rather than chosen, so a ship moves through the water at her own speed.

**(8) Models.** The container stow was `high = 5 + ((bay*3) % 3)` — always 5, a level slab
245 m long, under a comment saying stows are never level. It has a profile now (stepping down
forward, wings cut for the bridge sightline), hatch covers, lashing bridges, a bulbous bow and
a forecastle.

### Open
* ~6 blocked segments needing a finer mask.
* Era 4 costs 4.9 s to build cold (1.1 s cached).
* The Shipwright still builds the yard's 24 unselected hulls coarse, which is correct, but the
  camera pan to a newly selected ship is slow enough to look stuck.

---

## Round 19 — 2026-08-05 · performance, and the close-up as a place you go

**The interaction August asked for.** The wheel used to run continuously from orbit to the
waterline, so ordinary zooming crossed into the near field. The map has a floor now
(`MAP_FLOOR_M` = 12 km) and the near field is engaged by `S.follow`, not by altitude — so a
viewer who never clicks a hull never renders it. Click a ship to go aboard; zoom out inside the
close-up to back off (clamped at 45 km, which at the standing 15° depression puts the eye at
11.6 km — the map's own floor, so the two views join instead of jumping); the button is the way
out and returns you to the top-down map at its lowest, over the water she is in. `#z=` still
addresses altitude directly, which is what the descent baselines use.

**Where the performance problem actually was.** Not the frame: the map costs 1.8 ms and the
close-up 0.8 ms steady-state. (My first measurement of the descent said 9 ms; that was first-call
shader compilation, which is why you measure twice.) It was one long stall in the place a viewer
clicks most — routing thirteen voyages and building forty hulls inside the era button's handler.

| | before | after |
|---|---|---|
| era click, revisit | 2,720 ms freeze | **0–1 ms** |
| era click, first visit | 2,720 ms | 0–1 ms + a 2.4 s fill over 143 frames |
| worst frame during the fill | — | **77 ms** |
| near-field meshes, 5 ships in the patch | 12,850 | **2,586** |
| near-field triangles, same | 798,520 | **247,096** |

Five things got it there: the fleet build is a queue with a per-frame budget; `finishTrack`
**yields between its passes**, because a budget alone could not help when one voyage's finishing
is 310 ms in one lump; hulls are cached per vessel type (`buildShip` had run once per VOYAGE);
the datum is quantised to 5 m so a half-metre era difference stops invalidating the routing grid;
the fine elevation array is no longer rebuilt on a datum change (it holds elevation, and the datum
is applied at every read — that was 2.3 s of the 2.4); and the four grid signatures that exist
across the whole timeline are kept.

**The close-up, looked at for the first time.** `#f=<voyage id>` makes it addressable, so it has
baselines now (`aboard`, `aboard-off`). The first capture showed three faults: the map's chart
lettering was drawn across the water in front of the ship; the ground and the water had **two
different atmospheres** (the ground hazed to pale grey over 90 km, the water to dark blue over a
distance derived from the ship's length, so the ocean went flat within a kilometre of the hull
while a coast thirty kilometres off stayed bright); and the Kelvin arms read as searchlights.
All three fixed. The card also read "Wind —" the whole time, because `PSGV.wind` is written only
by the other way in.

**⚠ Frozen must mean frozen for the easings.** The heading damping, the consort station and the
traffic alteration all advanced once per FRAME regardless of dt — a clock, and pinning the others
does not pin those. `descent` came back 1.7% different on every capture.

### Open
* **The four near-field frames flap** by ~0.5% of pixels on some full runs, a different one each
  time, while being byte-identical when captured alone. Two settled states somewhere in the
  near-field path. Written up in `Research/baselines/FRAME-LOG.md`; do not accept those frames
  without looking.
* The near ground is still flat-shaded within a texel — the 4.9 km raster has no gradient at
  close range, and the sub-texel *shading* perturbation remains deliberately unshipped (round 12).
* The turbulent band astern still has a straight leading edge; it reads as a sheet, not churn.

---

## Round 20 — 2026-08-05 · the Titanic, and a check that asks whether it is right

**What happened to her.** The deckhouse tiers are built about their own centre and
`tier.position` was never set, so every wall sat at y = 0 — below the waterline of a hull whose
deck is 19 m up. Only the railings were positioned off `base`. The screen got a black hull under
a lattice of white rails, and had done for as long as the deckhouse had existed. Three more, all
class-level: funnel height was `beam × 1.55` for every vessel ever built (Titanic 43.7 m against a
real 19, Yamato 60 against 28); funnels were threaded into the gaps *between masts*, so a liner
with two pole masts stacked four funnels into two positions; and `rig: 'none'` fell through to the
square-rig case and got fidded topmast and topgallant — spars whose whole purpose is to be sent
down — putting 126 m of mast on Yamato and 56.7 on Dreadnought's stated 34.

**`Research/audit-hulls.js` — the durable part.** The frame ratchet compares each view against its
own last capture, so it catches change and is blind to wrongness. `ship-titanic` sat green for
rounds showing a liner with no superstructure, exactly as `ship-container` sat green photographing
the ship of the line. Eleven rules that ask questions of the model instead: air draught against the
hull's length, with different limits for sail and motor; anything declared must be drawn; a
deckhouse must exist **and be above the deck**; funnels may not share a station; nothing may
overhang the side, measured against the flight deck where there is one.

⚠ Four of its first thirteen findings were the audit being wrong, and each correction is a fact
worth keeping: a square-rigger's mast truck really does approach her own length; a carrier's island
really is her superstructure and really does overhang; a rigid wing really is sail; and **a tag
sits on a GROUP, not on every mesh in it** — asking for `o.isMesh && userData.part` reported that
the Titanic had no superstructure and the container ship no containers. Run it every round; add a
rule whenever a fault gets past the ratchet.

**The map floor is 300 km**, measured to be where the token exaggeration peaks. Below it the ramp
unwinds toward true scale and the ship *shrinks*: 65 km long and 35.6% of the frame at 300 km, 17 km
at 150, 3 km at 60, and 100 m — 2% of the frame — at the old 12 km floor. **The close-up's far
stand-off is 2.6 km**, from 45 km, where a 57 m hull was a single dark pixel in an empty field.

### Open — asked for and NOT done this round
* **Water parity between the Sea and the Shipwright.** The Shipwright's widest view has visibly
  better water than the close-up's. Not attempted.
* **The grid texture** at very close zoom is now unreachable from the map, but its source was never
  identified and it may still appear in the close-up.
* The `map-floor` frame at 300 km reads murky, with the wind-streak layer smearing at that zoom.
* The near-field frames still flap (see FRAME-LOG).

---

## Round 21 — 2026-08-05 · three faults, none of them where they looked

**The ghost ship.** Clicking a name in the era's list built its own hull, wake and animation —
a complete second model of a voyage the era fleet was already sailing. All three symptoms follow
from the duplication: it survived era changes because `selectEra` never touched it; it could not
be clicked because `pickTrack` raycasts `eraTracks`; and it sailed over land because its path was
the raw waypoints slerped at 26 points a leg, not the routed track — every coastline correction
this project has made was in the *other* model. Deleted. The selected voyage is now a line on the
**routed** track, drawn by the same helper the hover uses. Verified: 13 hulls before the click and
13 after, the line's vertex count equals the track's, 0 stray hulls after an era change.

**No land in the close-up — and nothing was wrong with the land.** `followAz` was the constant
2.4 radians, so which way you faced going aboard was fixed and whether her coast was in frame was
luck. Measured on the Athenian armada: land 121 m high 6 km away on a bearing of 79°, a camera
looking along 137°, a 34° field of view — 58° off axis, behind the viewer's shoulder. The same
position through `#c=`/`#z=` showed the coastline plainly. Going aboard now looks toward the
nearest land within sight, scanned on the router's own fine coastline.

⚠ **Choosing the frame was itself the lesson.** The first `aboard-coast` put the guano clipper a
thousand kilometres off Chile. The spot was then chosen by sweeping every ship in every era at the
frozen instant for the one nearest to *lit* land. `aboard` and `aboard-off` both sit in open water
— a view never captured near a coast cannot defend the coast.

**One ocean, not two.** `rippleFade` keyed off `uScale`, which is the eye height: from a deck the
close-up's fine ripple was gone 200 m from the hull, while the Shipwright hard-codes 150 and kept
it to 750. Same shader, same wave table, two different oceans. Whether a ripple is worth drawing
is a question about pixels — it stops being visible where its wavelength falls below one, at
`λ · screenHeight / (2 tan(fov/2))`, about 6 km. `SHIPS_SEA.rippleRange()` computes it once from
the camera and every view that draws water is handed it.

### Open
* The near-field frames still flap (`aboard`, `aboard-coast` this run) — see FRAME-LOG.
* The near ground is flat-shaded within a texel; ridged domain-warped noise is the real answer.
* The grid texture at very close zoom — still unidentified, now unreachable from the map.
* The map-floor frame at 300 km reads murky; the wind-streak layer smears at that zoom.
* Titanic's tiers read as flat plates rather than a stepped house with windows.

---

## Round 23 — 2026-08-06 · the fleet survey begins

`Research/survey-hulls.js` — companion to the audit. The audit asks whether a ship is WRONG;
this asks whether it is CRUDE, and neither question can be answered from a picture. It measures
floating parts (a mesh whose box touches no other), box meshes (twelve triangles is a cube),
triangles per metre of hull (the only fair comparison between a 400 m box boat and a 9 m
dugout), material variety, and which part KINDS are made entirely of boxes.

**The fleet, crudest first (triangles per metre of hull).** This is the work queue:

| | tris/m | meshes | note |
|---|---|---|---|
| carrier | 384 | 54 | 337 m of ship in fifty-four meshes |
| container | 399 | 2570 | 2,528 of those are containers, which *are* boxes |
| yamato | 540 | 120 | |
| titanic | 579 | 190 | |
| great-eastern | 828 | 368 | |
| dreadnought | 872 | 119 | |
| wyoming | 1118 | 164 | |
| preussen | 1250 | 209 | |
| steamer | 1632 | 231 | |
| treasure-ship | 2011 | 152 | |
| …the sailing ships run 2,600–15,000 and are the best-served end | | | |

The modern steel ships are the crude end, which is the opposite of where the hand-work has gone.
`gratingx52`, `channelx4` and the like in the boxy-parts column are **not** faults — a grating
is bars and a channel is a plank.

**Fixed this round, both found by geometry and invisible from any single viewpoint:**
* The container ship's funnel stood **17.2 m from the nearest part of the ship**, its base 47 m
  up, hanging over open deck. A funnel is the top of an uptake; it now rises from an engine
  casing that reaches the deck, which is also why a real one sits where it does.
* The Great Eastern's and the steamer's boat-deck **rails floated beside their own stanchions**
  — mine from last round: I moved the posts onto the lofted deck edge and left the rails at a
  constant half-breadth. There is one `railHalf(x)` now, read by both.

Both classes are now audit rules (13 rules; all 25 hulls pass).

### Next, in order
1. **carrier** — crudest by a wide margin, and a flight deck is mostly markings and edge detail.
2. **yamato, titanic, dreadnought** — the boxy-superstructure family.
3. Titanic's tiers still read as stepped plates rather than a house with real fronts.
4. Container ship's accommodation block is still a plain white box.

**Round 24 — the carrier, and why the loop kept not running.**

The carrier's island was one box and one cylinder. Rebuilt as what an island actually is — the
only part of a carrier allowed to be tall, so its shape is a list of everything that cannot go
under an armoured flat deck: navigating bridge low and forward, flying control above and aft
where a controller can see the landing area and the round-down behind him, uptakes carried up
through the middle, a mast whose job is height for the radar. Three stepped tiers each standing
on the one below, glass where the bridge and pri-fly are, two uptakes, four fixed radar faces,
mast with yardarms. 54 meshes to 66; no floating parts; audit clean.

⚠ The flight deck was NOT the reason it ranked crudest — markings, arrestor wires, catapult
tracks and flush lifts were all already there. Worth checking what is actually missing before
rebuilding what is not.

**THE LOOP: three mechanisms tried, and why each failed.**
1. `ScheduleWakeup` — set for 18:05, never fired.
2. `CronCreate` at */10 — eighteen consecutive firings missed over three hours.
   Both are session-only and fire only while the REPL is idle, which this environment never is.
3. A cloud schedule cannot help: this work needs the local repo, the :8149 server and the
   Playwright frame harness, none of which exist there.

So: a local launchd agent, `~/Library/LaunchAgents/com.august.ships-loop.plist`, 600 s interval,
running `build/loop-round.sh` which runs `claude -p` against `build/loop-prompt.md`. Loaded.
⚠ It is BLOCKED on credentials — `claude -p` returns "OAuth session expired and could not be
refreshed" because the CLI's token lives with the desktop session and a background process
cannot refresh it. The script checks this first and logs what to do rather than failing
silently. Once `claude` is run once interactively and signed in, the next firing starts work.
Two smaller things the smoke test caught: macOS has no `timeout` (background watchdog instead),
and rounds outlast the interval (atomic lock dir, 90-minute staleness clear).

Next vessel: **container** (399 tris/m) — accommodation block is still a plain white box —
then **yamato** (547).

---

## Round 25 — 2026-08-06 · the fittings follow the build

**Round 24 said the carrier was done, and from seven of eight bearings she was not.** The island
rebuild was verified from the one baseline bearing only. Spinning her (`SW.shipSpin`, eight
captures) showed: a timber barn-door RUDDER hung on the sternpost, 17.5 m past the transom of a
nuclear carrier and 4 m out of the water, in timber brown — those were the "bronze wedges" in
the stern-quarter capture; a timber TRANSOM, timber RAIL and planked timber weather deck under
the flight deck; the flight deck a slab FLOATING over the hull, open air visible straight
through below it from any low bearing; and the island's "glass" reading as a 17 m cream stripe.

**The class, not the instance: every hull got the timber-era fittings regardless of
`build`.** Fixed in `buildShip` and friends, keyed off `S.build`:
* steel/iron builds get a steel backbone (keel, frames, posts — the stage card always said
  "STEEL: FRAMES, THEN WELDED PLATE"), steel rail, steel transom in the topside's paint.
* the weather deck keys off what the DECK was, not the hull: Titanic and Yamato stay planked
  (teak, hinoki — correct), a flight deck and a container ship's deck are bare steel.
* a motor ship's rudder is a BALANCED plate under the counter, wholly below the waterline and
  inside her own length — the stern-hung barn door is now timber-builds only.
* declared `screws` are drawn (bronze, five blades, shafts into the run) — `screws: 4` added to
  the carrier's data. Below water, so visible mainly in the dry-dock stages.
* flight-deck ships get the HANGAR AND GALLERY casing, lofted from the hull's own half-breadth
  at the sheer, hull to deck slab, with bay openings under the deck-edge lifts. The deck no
  longer floats.
* the island: glass is now dark panes behind mullions (the round-22 liner lesson — and the
  sternlight glass already knew the recipe); the cream stripe was actually the RADAR strip,
  found by raycasting the bright pixels — a SPY array face is ~4 m, not 17, and panel grey.

**Three new audit rules** (16 total; all 25 hulls pass): steel/iron rudders stay below the
waterline and inside the stern; declared screws must be drawn and stay wet; a flight deck must
stand on a hangar casing that spans sheer-to-slab. Carrier: 66 → 123 meshes, 385 → 391 tris/m.

**The flap has a second cause, and it is fonts.** globe-default moved 1.016% and the diff was
nothing but label halos; aboard-off and descent showed voyage lists and cards ghosted a few
pixels off. Each frame opens a COLD page; a capture before the serif arrives rasterises every
label in the fallback font. The harness ready expr now also requires
`document.fonts.status === 'loaded'` (frames.json). The water-flap class (round 22) is separate
and may remain.

### Next, in order
1. **container** (399 tris/m) — the accommodation block is still a plain white box; also her
   new steel deck/rail from this round should be looked at from all angles, not one.
2. **carrier, the deck park** — she still carries no aircraft, and a bare deck is the one thing
   left that does not resemble the ship. Real dimensions (an 18 m fighter), parked clear of the
   angled deck and foul line: starboard bow (z +0.28–0.42 deckW), the street aft of the island,
   the fantail. Declare a `deckPark` count in data and audit it like containers.
3. **yamato** (547), then titanic's tiers (stepped plates, no fronts).
4. Sea-view spot check of every steel ship whose rail/deck/rudder changed this round.

---

## Round 26 — 2026-08-06 · landing the killed round, and the flap was never fonts

**The 04:45 loop firing did the container ship and was killed at 50 minutes** — after the
acceptances, before HANDOFF/commit/push. This round verified all of it and landed it. Nothing
in it was taken on trust: audit re-run (25/25), ratchet re-run, spin captures looked at from
four bearings, hull.js diff read.

**What the killed round built (container, 399 tris/m → the rebuild):** the stow, hatch covers
and forecastle are lofted from the hull's own half-breadth at their own stations — at bay 0 the
deck is 35 m across and the old constant-width cover was 53, four columns of boxes over open
water from every bow bearing. Bays are laid around the house, not the reverse (that order is
how a 30 m gap of bare deck opened last time). Stack height is CAPPED BY THE BRIDGE — the
wheelhouse floor stands above the tallest box forward of it, which is the one constraint the
ship's own card states. Eight cabin decks with mullioned window bands, stair towers, bridge
wings out to the ship's side ON STRUTS, lifeboat capsules in davits, radar mast, raked
elliptical funnel on the engine casing. Two new audit rules (18 total): cargo may not pass the
hull side at its own station; the bridge must see over the stow.

**The frame flap: round 25 blamed fonts, and there are no fonts to blame.** The stylesheet has
no @font-face — the serif stack is all local (Iowan Old Style, Palatino, Georgia), so
`document.fonts.status` is 'loaded' trivially and the ready-expr clause is a no-op. The real
mechanism: CSS transitions run on the browser's wall clock, which `?frozen` never touched.
`.lbl` carries `transition:opacity .35s` — every capture caught the sea/port labels at a
different point of their fade, which is exactly the "label halos" in the globe-default diffs.
The killed round's fix (frozen mode injects `*{transition:none;animation:none}`) is the right
class fix. Proof this round: `Research/flap_test.py` (new tool) captures a frame twice in fresh
pages and diffs the runs against each other — globe-default, descent, descent-high all
**0.000% run-to-run**. Their baselines held pre-freeze mid-fade states; accepted as one-time
settles, reasons in FRAME-LOG. Ratchet now fully green.

**Two new repeatable tools** from the killed round, kept: `Research/spin_capture.py` (eight
bearings + four low ones — the survey that catches what one baseline bearing cannot) and
`Research/run_audit.py` (the audit without hand-driving the browser). Plus this round's
`flap_test.py`. `_spin/` and `_flap/` are now gitignored scratch, like `_current/`.

⚠ **The loop has now killed two consecutive rounds at 50 minutes.** A vessel rebuild plus
full verification does not fit the watchdog. Either raise the watchdog past the ratchet's
~8-minute runs, or split rounds: build one firing, verify-and-land the next. This round WAS
the second half of that split, done by hand.

### Next, in order
1. **carrier, the deck park** — she still carries no aircraft, and a bare deck is the one
   thing left that does not resemble the ship. Real dimensions (an 18 m fighter), parked clear
   of the angled deck and foul line: starboard bow (z +0.28–0.42 deckW), the street aft of the
   island, the fantail. Declare a `deckPark` count in data and audit it like containers.
2. **yamato** (547 tris/m), then **titanic's tiers** (stepped plates, no fronts).
3. Sea-view spot check of every steel ship whose rail/deck/rudder changed in round 25.

---

## Round 27 — 2026-08-06 · the deck park, and the landing area ran the wrong way

**Landed round 26 first** (it was verified but sitting uncommitted — the watchdog killed it
before the commit both times), then did the carrier's deck park, queue item 1.

**The landing area was mirrored and on the wrong half of the ship.** Read straight off the
code before touching the park: the strip was centred FORWARD of amidships with its forward
end drifting to STARBOARD, and the arrestor wires sat beside the bow catapults. A landing
area exists so a missed wire flies off the BOW: it begins at the stern round-down near the
centreline and runs forward-port at nine degrees. Confirmed in the before-spin, fixed
structurally: `landingStrip(S)` is now ONE derivation — exported on `SHIPS_HULL` — and the
edge lines, centreline, foul line, wires, waist catapult and the parking audit all read it,
so they cannot disagree again. Wires went four → THREE (Ford's AAG; four is Nimitz) and
moved to the aft end of the strip, where a hook actually crosses the deck.

**The deck park (queue item 1).** `deckPark: 12` declared in the carrier's hull data and
drawn: an 18 m strike fighter in real metres — fuselage, radome, canopy, twin canted fins,
stabs, gear — with wings FOLDED, the single most legible fact about a parked naval
fighter. Three parks, clear of the strip and the foul line by construction: four on the
starboard bow, four in the street aft of the island, four on the fantail. Verified in the
plan view and the spin: three groups on deck, nothing floating, nothing foul of the lines.
One audit rule (19 total): declared aircraft drawn at the declared count, standing ON the
deck (not floating/sunk), inside the deck edge, and clear of the landing corridor — the
corridor from the builder's own `landingStrip()`, not from copied numbers. 25/25 pass.

**The last flap was a throttle.** aboard moved 0.476% and flap_test showed it LIVE (two
fresh pages in one session disagree); descent moved 1.039% but deterministic per session.
Cropping the two runs: one had "OCEAN STEAMER · 37°N 1°W · FAR SIDE" in the voyage row
meta, the other just "OCEAN STEAMER" — `refreshFleetList` writes the position suffix on a
500 ms throttle and `__FRAME_READY` never waited for it. Frozen mode now refreshes
unthrottled, so the first painted frame already carries the settled text. (Round 26's CSS
freeze was real but was the OTHER half of the class.)

After the fix the ratchet proved it: descent and aboard went GREEN on their own (0.022% /
0.017%), and the frames whose baselines held the un-settled text — globe-crossing,
aboard-off, aboard-coast — moved once by exactly the list and nothing else, each looked at
and accepted as one-time settles. Final board: all frames within tolerance.

### Next, in order
1. **yamato** (547 tris/m) — and note: `buildTurrets` points forward turrets' guns toward
   +x, which is the STERN (bow is -x; the carrier's catapults prove the convention). Check
   from the spin before assuming; if so the fix is one sign, but look at superfiring pairs.
2. **titanic's tiers** (stepped plates, no fronts).
3. Sea-view spot check of every steel ship whose rail/deck/rudder changed in round 25.
4. The loop watchdog still kills a full build+verify round at 50 min (two kills, then this
   round ran to the wire). Raise `sleep 3000` in build/loop-round.sh toward 4800 — the
   stale-lock clear at 90 min leaves room — or keep splitting build/land across firings.

**The live site had been stale since round 25 and nobody could see it.** Every legacy
Pages build since 956a72b (04:19 local) errored instantly with "Page build failed." and
nothing else — content exonerated (the last-good→first-bad docs diff is four text files,
.nojekyll present, Pages operational, a forced rebuild of the same commit failed in 0 s).
The live stamp still said 1786012084 while three rounds pushed on top. Rule 6 exists for
exactly this: A SUCCESSFUL PUSH IS NOT A SUCCESSFUL DEPLOY. Fixed structurally: deployment
moved to the Pages WORKFLOW build (.github/workflows/pages.yml, build_type=workflow) which
has real logs — if it breaks again it will say why.

## Round 27 — 2026-08-06 — Yamato was a liner; now she is a battleship

**The fault was the class, not the vessel.** `buildSuperstructure` is a LINER builder — white
window-banded tiers over 80% of the length — and it ran for every decked ship without a flight
deck. On Yamato that buried all three main turrets inside the deckhouse (invisible from all
twelve bearings), stood a buff-and-black trademark funnel amidships and a brown timber pole for
a mast. Under it, three more faults in `buildTurrets` itself: the forward guns pointed at the
STERN (one sign, exactly as round 26's note predicted), the barrels were 34 m long because they
scaled off turret radius rather than calibre (a 46 cm/45 rifle is 21 m), and the superfiring
mount's barbette floated 3.3 m above the deck because the raise moved the whole group up.

**Structural fixes, all class-level, in hull.js:**
- A turreted ship now gets `buildCitadel`, never the liner house: two grey decks lofted from
  the hull's own half-breadth, whose SPAN IS DERIVED from the turret stations (the
  superstructure fills the gap between the end turrets — that is why battleships look as they
  do), a stacked bridge tower at the mast station (`towerH` from the record), a main
  rangefinder at its head, and secondary mounts from the record (`secondaries`).
- One `gunhouse()` builds every mount at any calibre — main and secondary are the same object
  at two sizes. Guns face the bow; aft mounts are turned; barrel length is `calibre × 45`;
  the barbette runs down past the deck, and a raised mount's barbette grows by the raise.
- `turretStations(S)` reads `turretAt` from the data (funnelStations pattern), read by both
  the turrets and the citadel — one derivation of where the battery stands.
- Warship livery follows the build: grey funnel (a company's buff-and-black is a trademark,
  and a navy has none), grey steel masts. Both keyed on `S.turrets`.
- Data: yamato gets turretAt/towerH/secondaries/second mast at real stations off the plan;
  dreadnought gets turretAt [0.28, 0.68, 0.80] and turretRaise [0,0,0] (she predates
  superfiring). She took the whole class change and reads correctly — checked from her own
  spin capture, `_spin/dreadnought-after/`.

**Deliberately not done:** the FORWARD 15.5 cm secondary. Between No.2's gunhouse and the
tower foot there is not room for it at this abstraction without interpenetrating one or the
other — tried at deck 0 (embedded in the shelter-deck face, the audit caught it), at deck 1
(its barrels pass through No.2's roof). The real mount nests INTO the pagoda foot; modelling
that means merging it with the tower geometry, which is a finer resolution than one round
buys. The aft mount is in. Logged here per rule 5.

**The audit grew three rules and was right once.** New in audit-hulls.js: (1) no gunhouse or
gun mesh centred inside superstructure geometry (barbettes exempt — passing through decks is
their job); (2) every mount's barrels must clear its gunhouse toward the end of the ship it
faces; (3) every turret group's bottom must rest on its own support — the sheer at its
station or a superstructure surface beneath it — which is the rule the floating superfiring
barbette needed. Rule 1 fired on the first citadel build (fwd secondary embedded in the
shelter deck) and the geometry was wrong, not the audit: 1 for 5 lifetime.

**Measured.** Audit 25/25 clean. Ratchet: every pre-existing frame ≤ 0.022%/0.013 — the class
change moved nothing that was not a turreted ship, and no committed frame photographed one,
which is exactly the blindness `ship-yamato` (new baseline, accepted with reason) now closes.
Sea view verified aboard `#f=tenichigo`. Rule 0, on that frame: it reads as a rendered world —
wind-streaked water, coastal relief, a hull with weight; three facts a viewer can name: a WWII
battleship with a pagoda mast, so Japanese; her position off the southern Japanese coast,
course 257°; nine guns in three triple turrets, two forward superfiring, one aft.

### Next, in order
1. **titanic's tiers** (stepped plates, no fronts) — carried from round 26.
2. **The steel stern quarter, as a class**: from astern every steel ship shows a full-lit pale
   transom with the black sternpost stripe proud of it, over the pale sand of the unpainted
   underwater body. Three separate reads (transom lighting, sternpost material, antifouling
   colour), all fleet-wide, all visible in `_spin/yamato-after/b315.png`.
3. Sea-view spot check of every steel ship whose rail/deck/rudder changed in round 25 —
   still owed from the round-26 queue.
4. The watchdog is already at 80 min (done in bae5bd3); the queue item is settled.

**The deploy needed one more structural fix: the Pages SITE OBJECT was wedged.** Round 26
moved to the workflow build; its run — and this round's first run — uploaded the artifact
fine and then hung at `deployment_in_progress` for the action's full 10-minute timeout. The
site's own API state was `status: "errored"`, inherited from the legacy builder's instant
failures, and no deployment could clear it from either pipeline. The fix was to DELETE and
recreate the Pages site (`gh api -X DELETE repos/augustg97/ships/pages`, then POST with
`build_type=workflow`) and re-run the workflow. The stamp went live while the run was still
polling. So for the next round: the check that matters is the LIVE STAMP, and a run that
reports failure after a 10-minute status-polling hang may still have deployed — but a stamp
that does not move within a few minutes of the artifact upload means the site object is
wedged again, and recreating it is the remedy that worked.

## Round 28 — 2026-08-06 — The tiers get their fronts, and the boats find their deck

**The queue item was "titanic's tiers (stepped plates, no fronts)" and the fault was four
class faults sharing one cause: nothing owned the house.** The tiers were a centred wedding
cake (`0.80 − f*0.34`, equal steps fore and aft); the tier ends were blank single-colour caps;
the boats — whose own card says "stowed under davits on the boat deck" — sat at the HULL
SHEER, four decks below their davits' deck, reading as blisters riveted to the side; and the
funnels rose from the sheer, so Titanic's 19 m stacks (a record number, measured above the
boat deck) spent 12 m hidden inside the house and showed 7, with the black top half the
visible funnel instead of a fifth. The cowl ventilators, at B×0.30 off centre at the sheer,
have been buried inside the accommodation for as long as the tiers have existed — invisible
from every bearing, and no one missed them.

**One derivation now owns the house: `linerHouse(S)`** (the landingStrip/turretStations
pattern), read by the superstructure, the boats, the funnels and the audit. Fronts ALIGN
(small setback per tier — the ship is conned from the forward end of the top deck); afts
CASCADE (each exposed roof is the promenade of the deck below, and it gets rails). The walls
are ONE banded loft wound around the whole perimeter — arc length carries the mullion rhythm
through the corners — so a blank front is no longer a thing the builder can build. The top
deck carries the BRIDGE: a wheelhouse that is more glass than wall, with open wings running
to the hull's own side at that station, flush, railed. Boats stow on the top of the house
with their davits standing ON the deck (pitch may close from 1.38 to 1.30 boat-lengths
before boats are cut; then it is fewer boats, never closer). Titanic's house span is from
the plan: `houseAt: [0.225, 0.875]`.

**The funnel datum is the record's datum.** Where the record locates the house (`houseAt`),
the stack stands on the highest covering tier and funnelH keeps its recorded meaning. Where
the house is the default abstraction, the stack keeps the SHEER datum — raising Great
Eastern's 30 m stacks onto her inferred house top made them out-tower her own 34 m foremast,
and the funnel-height audit rule caught it before any eye did (the audit is now right 2 of 6
lifetime). `linerHouse().recorded` carries the distinction; builder and audit read the same
flag.

**Audit: three new rules, 25/25 clean.** (1) boats stow within chock height of the top of
the house; (2) a powered decked ship has a bridge, on the boat deck, at the FRONT of the
house; (3) every funnel casing sits on its own deck — covering tier where recorded, sheer
otherwise. All keyed off SHIPS_HULL.linerHouse, so they cannot drift from the builder.

**Ratchet: three frames moved, each looked at, classified, accepted.** ship-titanic 15.14%
(the round's work — verified from 12 bearings in `_spin/titanic-after`; funnel rake proven
aft by world-space measurement after a pixel eyeball misread it, funnel top +1.66 m toward
the boats' end); ship-great-eastern 2.28% (class change; funnels unchanged on their sheer
datum); aboard 0.585% (the steamer carries the class change into the Sea view — wheelhouse
at her bow end, boats on the house). Final board all green.

**globe-default flapped 1.016% and it is NOT this round's change.** The diff is label halos
only — the exact signature frames.json already documents. Diagnosis this round: the app uses
ONLY system fonts ("Iowan Old Style" etc.), so `document.fonts` never has a pending load and
round 27's fonts clause in the ready expr is VACUOUS — it guards nothing. The flap is a rare
cold-start rasterisation transient: full-suite run flapped, immediate re-check 0.000%,
flap_test run1-vs-run2 0.000%. It can only produce a false RED, never a false green. The
structural fix is to vendor the serif as a real webfont (OFL — then document.fonts genuinely
governs it and rasterisation is machine-independent). That is a dependency decision like the
RGBELoader note — decide before writing code.

**Deliberately not done:** Titanic's forecastle and poop as separate raised decks with real
well decks — the house abstraction still meets open deck at both ends without the breaks; her
masts are unraked and white where the real ones were raked and buff; the funnel buff
(0xd8cfbb, from the museum model) is paler than White Star buff — recolour only after an A/B
against a dated reference, per rule 4.

### Next, in order
1. **The steel stern quarter, as a class** (carried from round 27): full-lit pale transom,
   sternpost stripe proud of it, antifouling colour — three fleet-wide reads, see
   `_spin/yamato-after/b315.png`.
2. Sea-view spot check of the remaining steel ships from round 25 (aboard/steamer done this
   round; the rest still owed).
3. The serif-webfont dependency decision (closes the globe-default false-RED class).
4. Titanic fine structure: forecastle/poop breaks, raked buff masts, funnel buff A/B.

---

## Round 29 — 2026-08-06 — Two faults the ratchet cannot see, and a ruler that ran off the page

**Run from the interactive session, not the loop.** I took `build/.loop.lock` at 09:59 so the
10:08 firing would skip, and released it at the end. Nothing here touches the vessel queue —
round 28 had just landed Titanic's house, and both of us rebuilding the same ship is the exact
collision the lock exists to prevent. This round is the OTHER half of the standing task: the
fleet-wide presentation faults, found by reading four committed baselines cold.

**Why they had survived 28 rounds.** The ratchet compares each frame to its own last accepted
version, so a fault present when a frame was FIRST accepted is invisible to it forever — it is
a change detector pointed at a set of pictures that already contained the bug. Both faults below
were in every committed Shipwright baseline. Neither is subtle; nobody had looked with the
question "what is wrong here" rather than "what moved".

**1. Markdown rendered as punctuation, on 20 of the 25 vessels.** Titanic's panel read "built
for \*\*size and comfort\*\*". Measured across the data: **24 bold spans and 14 italic spans**,
and since the italics are mostly journal titles (`*Nature*`), the citations were broken too.
The copy is written in markdown and nothing between the data and the DOM ever parsed it. Two
render sites, the same expression in both — `app.js:1140`, which is the SHARED card fed by era,
port, vessel and battle text (seven call sites), and `shipwright.js:572`. One `proseHTML()` now
serves both. It escapes FIRST and emphasises second, because escaping afterwards cannot tell the
tags it just wrote from the data's own angle brackets; and it does bold before italic, which is
why neither rule needs a lookbehind — every doubled star is consumed before a single one is
looked for. Verified against all **142** strings in `web/data/*.json`: zero literal asterisks
left, `***west***` (the caravel's volta do mar) correctly nests, and the one 182-character
`<em>` is the slave-ship's licensing note, which really is a whole italic paragraph.

**2. The scale ruler was drawn inside the part panel.** `#swRuler` at `left:24px/bottom:120px`;
`#swPart` at `left:18px/bottom:104px` standing at least 132 px tall. The ruler occupied the part
panel's first line and "500 m" printed through "Click any timber, rope or sail." on every ship.
Moved to the right-hand column, which is free at every viewport height: `#swList` is capped at
`calc(100vh - 250px)` from a top of 66 px, so it always stops 250 px short of the bottom and a
ruler ending ~150 px up cannot reach it.

**3. And moving it exposed the real fault, which was never the position.** On the voyaging canoe
the relocated bar still lay across the *Bent on* panel, because the bar's width is unbounded.
`steps` began at **5 m**: a 19 m hull filling the frame wants a 2.6 m bar, and with nothing
below 5 the picker had to round UP, so the bar came out at twice its 190 px target — the one
case where the target is not approximated but abandoned. Worse, `Math.abs(c - rawM)` is nearest
by SUBTRACTION on a geometric series, which is biased to the larger step at every gap. Now
`[1, 2, 5, …]` chosen by `Math.abs(Math.log(c / rawM))`, which is scale-free. Measured: dugout
667 px → 267 px, canoe 316 px → 126 px, and trireme/dhow/titanic/container unchanged — the
large hulls were always fine, which is why only the small ones moved. The label takes a
singular at 1 m.

**One thing checked and deliberately NOT fixed.** Dark rectangles appear to bleed past the fleet
list in every Shipwright frame. `--panel` is `rgba(7,21,34,.90)` — 90% opaque — so that is the
hull showing through a translucent panel, by design. It looked like a z-order bug and was not.

**Measured.** Audit 25/25, 0 problems. Ratchet **24/24 green** after accepting the eleven moved
frames (the ten `ship-*` and `shipwright`) — and the moved set being EXACTLY the Shipwright
frames, with `aboard`, `action`, `descent*`, `map-floor`, `sea-magnified` and the globes all at
0.000%, is itself the evidence that the change is confined to where it was aimed. Both fixes
looked at on screen: `ship-titanic` shows **size and comfort** in bold with a clean bottom-left
hint and "50 METRES" bottom-right; `ship-canoe` shows "1 METRE" clear of every panel.

**`globe-default` is confirmed a false RED, not a regression.** It came up 1.016% — the identical
figure round 27 logged — and the diff is PURE map labels, nothing else on the globe. It then
returned 0.000% on the next run. The identical percentage is not a coincidence and not evidence
of a real change: the label set is fixed, so the transient is bimodal (the halos rasterise or
they do not), which is why it reproduces the same number rather than a scatter. Round 27's
structural remedy — vendoring an OFL serif as a real webfont so `document.fonts` actually
guards something — is the right one and is still queued.

### Next, in order
1. **The steel stern quarter, as a class** (carried from rounds 27–28): full-lit pale transom,
   sternpost stripe proud of it, antifouling colour — see `_spin/yamato-after/b315.png`.
2. **Yamato's deck is bare** — no secondaries, no AA, no boats, no catapult, and the funnel
   reads as a flat card from some bearings; check it is not a single-sided plane, which is a
   fault already fixed once elsewhere. She is a citadel with nothing on it.
3. Sea-view spot check of the remaining steel ships from round 25.
4. The serif-webfont dependency decision (closes the `globe-default` false-RED class).
5. **The land in the Sea close-up** is a featureless brown ramp meeting the water in a straight
   line — no ridges, no shoreline. That is what LAND_DETAIL was written to prevent, and the
   `aboard` frame says it is not reaching this camera. Check on a high coast, not off the
   Peloponnese.
6. Titanic fine structure: forecastle/poop breaks, raked buff masts, funnel buff A/B.

**⚠ THIS ROUND IS COMMITTED AND PUSHED BUT NOT DEPLOYED — GITHUB ACTIONS AND PAGES WERE BOTH
IN MAJOR OUTAGE.** `ffc3333` is on `main`; the live stamp is still `1786032589` (round 28's).
The symptoms, in the order they appeared: two pushes to `main` created no workflow run at all,
a `workflow_dispatch` created one that sat at `waiting` for 15+ minutes without starting a
step, and a second dispatch returned **HTTP 500**. The Pages site object was healthy throughout
(`build_type: workflow`, status not `errored`), so this is NOT round 28's wedged site.
`githubstatus.com` then confirmed it: **Actions `major_outage`, Pages `major_outage`, a critical
incident under investigation.**

I first wrote this up as a repo-specific "push webhook did not fire" fault and that diagnosis
was wrong — the API check came after. Recording the mistake because the shape of it recurs in
this project: three symptoms that all pointed at our configuration, and the actual cause was
upstream and global. **Check `githubstatus.com` before diagnosing a deploy, not after.**

**What the next round must do:** the working tree is clean and green — do NOT redo this work.
Confirm the live stamp; if it is still behind, dispatch `gh workflow run pages.yml --ref main`
once Actions is operational, and verify the stamp moves.

**The durable lesson, which survives the misdiagnosis:** after pushing, confirm a run exists
for YOUR sha (`gh run list --limit 1 --json headSha`) — not merely that the push succeeded, and
not that the newest run is green, because the newest run may belong to the previous commit.
Deploy failure modes now on record: the legacy builder erroring instantly (move to the workflow
build), the site object wedged in `errored` (delete and recreate the Pages site), and an
upstream Actions outage (wait for it, and do not "fix" the repo in the meantime).

---

## Round 30 — 2026-08-06 — Yamato gets her battery: the citadel was never bare, the record was

**The queue said "no secondaries, no AA, no boats, no catapult" and three of the four were a
RECORD fault, not a builder fault.** The builder has drawn declared secondaries since round 27 —
but the record declared one of Yamato's four 15.5 cm turrets and nothing else, so the citadel
stood bare and looked like a builder that couldn't furnish a deck. The round is therefore mostly
data plus three small classes, all record-driven so the next battleship gets them for free:

**1. The secondary battery, complete.** `secondaries` now supports `wing: true` — a PAIR at the
upper tier's deck edge, port and starboard — and `deck: N` now means N levels above the citadel
roof, with the gunhouse riser carrying the barbette down through the intervening height so a
raised mount cannot float (the main battery's round-26 rule, inherited because they are one
`gunhouse()` derivation). All mounts train fore-and-aft at rest, as the Kure fitting-out
photographs show — trained abeam the wing pair read as bare drums from broadside, barrels
foreshortened to nothing; that pose was tried and recaptured before being rejected. The citadel
SPAN now derives from the secondaries as well as the main turrets: the deck runs forward to seat
the superfiring mount's barbette, which on the real ship is exactly why the shelter deck runs
round No.2 barbette.

**2. The high-angle battery, a new class.** `aa: [{at}, …]`, one entry per side-pair, drawn
mirrored on the upper tier edge: platform, pedestal, shield block, twin barrels ELEVATED 40° —
the elevated barrel being the whole legible difference between an AA gun and everything else
aboard. Six 12.7 cm twins on Yamato, stations picked clear of the wing turrets' train.

**3. The stern aviation deck, a new class.** A battleship's quarterdeck aft of the last turret
was her airfield, and 70 m of bare olive deck was wrong for a reason no "boats" item could fix:
Yamato stowed her boats and floatplanes BELOW decks (deliberately not drawn), and what showed
was `catapults: {at, lenM}` — two trainable box-girder catapults with launch rails at the deck
edge, angled outboard in a V opening astern — and `sternCrane`, post and raked jib right aft,
because a floatplane lands on the sea and must be lifted back aboard. Guarded to the sheer
datum; the carrier keeps her own flight-deck kind.

**Audit: three new rules, one rule refined, 25/25 clean both before-fix and after.** (1) the
record's battery is the drawn battery MOUNT FOR MOUNT — mains + 1 per centreline secondary + 2
per wing pair, no fewer, no more ("declared but not drawn" could never see three missing of
four, because SOME secondary was drawn); (2) high-angle pairs drawn both sides, inside the beam,
standing on the citadel; (3) catapults drawn as a mirrored pair with each turntable resting on
the sheer, plus the crane when declared. The wrong-way-guns rule briefly grew an
outboard-trained exemption and lost it the same round when the abeam pose was rejected — an
exemption guarding nothing is round 29's vacuous-fonts fault wearing armour.

**Ratchet: ONE frame moved, ship-yamato, 0.242%, accepted.** The diff is the citadel cluster
and the quarterdeck and nothing else — the moved set being exactly the aimed set, again. Twelve
bearings captured in `_spin/yamato-r30` before and after the wing-train correction; funnel
checked from all four low bearings and it is a true 24-segment cylinder from everywhere — the
"flat card" in the queue was not reproducible, closed as not-a-fault.

**⚠ A TRAP FOUND, NOT YET FIXED: `build_data.py` no longer produces `vessels.json`.** Every
hull refinement since round 26 — `turretAt`, `towerH`, `funnelH`, `funnelAt`, metre-based
masts, secondaries, and now `aa`/`catapults`/`sternCrane` — exists ONLY in `web/data/
vessels.json`, hand-edited, while `build_data.py` still holds the round-25 abstractions.
Re-running build_data.py would silently wipe five rounds of hull work. Either fold the JSON
state back into the generator or make the generator refuse to overwrite a newer vessels.json —
that is a one-round chore and it should happen before anyone touches build_data.py for any
other reason.

**Deploy status: round 29's outage continued through this round's work** — Actions and Pages
both `major_outage` at 11:40. Stamp for this round is 1786043728; see the end-of-round note
below for what actually got live.

### Next, in order
1. **The steel stern quarter, as a class** (carried from rounds 27–29): full-lit pale transom,
   sternpost stripe proud of it, antifouling colour — reconfirmed this round in
   `_spin/yamato-r30/b315.png`, the pale transom wedges are impossible to miss behind the new
   crane. Three fleet-wide reads.
2. **Fold the hand-edited vessels.json back into build_data.py** (the trap above), or guard the
   generator. Before anything else touches build_data.py.
3. Sea-view spot check of the remaining steel ships from round 25.
4. The serif-webfont dependency decision (closes the globe-default false-RED class).
5. The land in the Sea close-up: featureless brown ramp, check on a high coast.
6. Titanic fine structure: forecastle/poop breaks, raked buff masts, funnel buff A/B.
7. Yamato round 2, if her queue slot comes round again: the 25 mm tertiary battery, deck
   aircraft, boat-stowage hatches, and the pagoda's searchlight platforms — all deliberately
   not done this round to keep one vessel one round.

---

## Round 31 — 2026-08-06 — The steel fleet had been flat since round 27: the plating pass was dead code

**The stern-quarter read carried since round 27 was three symptoms of one fault class: two
models of one surface, one of them invisible.** The queue item said "full-lit pale transom,
sternpost stripe proud of it, antifouling colour" — and pulling on it found something much
bigger than the stern.

**1. The iron plating pass was UNREACHABLE, and had been since round 27's commit 4987717.**
That commit cut the early `uIron` branch down to flat `col = uTopside` believing the
land-and-butt block "further down" would take over — but the block further down sits inside
the WOODEN else, where uIron cannot exceed 0.5. Brace-depth trace proved it; Great Eastern's
broadside confirmed it empirically: no portholes, no plates, a featureless slab. So every
"fix" landed on that block since — the plate patchwork (r27), the porthole rims (r27), the
streaks — was maintenance on code that never ran, verified by commit message rather than by
pixels. All nine steel/iron hulls rendered flat topside paint above water and — worse — the
WOODEN TALLOW-AND-WEED bottom below it, because underwater-non-copper fell through to the
18th-century branch. The pass is now its own branch owning the whole depth: plates from sheer
to keel, antifouling below the boot-top, streaks that start at the deck edge (the old runDown
peaked BELOW the waterline — never seen, never A/B'd), and porthole rows moved into the
freeboard — they were written at uWaterline+0.42 and +0.61, v = 1.04 and 1.23, ABOVE THE
SHEER, and could never have drawn even from a live branch.

**2. buildHullGeometry was a stale copy of surfacePoint.** The skin (and the end caps, and
the deck edge) had a private parametrisation WITHOUT the counter flare — so the transom plate,
built from the true surface, stood out past the hull as a pair of pale wings. The skin, caps
and deck now ask surfacePoint itself; the flare reaches the stern and the hull closes into its
own full-width cap.

**3. The steel transom plate and proud sternpost are gone as a class.** A steel ship's stern
is her own shell plating: buildStern (a MeshStandardMaterial panel in scene light — the
full-lit pale grey) is now timber-only, the hull cap is the transom, painted by the hull
shader. The stem bar and stern frame on a steel build are drawn one thickness INSIDE the
shell, as the castings they are — visible in the skeleton stages, closed over by the plate.

**4. The "sternpost stripe" was never the sternpost.** buildHullGeometry's forward-difference
normals collapse to zero at u=1 and v=1 (min(1,u+e) clamps to u), and normalize((0,0,0)) in
the shader is black: a black stripe up every stern edge and a black rim along every deck edge,
fleet-wide, timber and steel alike. Two-sided clamped differences fixed both at once.

**Audit: two new rules, proven live by running them against the stashed pre-fix hull.js**
(they fired on yamato/carrier/container et al.), then 25/25 clean on the fix: (1) no
'transom'-tagged part on a steel/iron build; (2) stem/sternpost bbox inside the planking bbox
on a welded hull. The dead-shader-branch class itself is NOT auditable from geometry — the
lesson recorded instead: **a fix verified by its commit message is not verified; the round-27
"84 distinct levels" measurement was satisfied by lighting alone.** Only the rendered pixels
of the surface in question count.

**Ratchet: 14 frames moved, every one classified, all accepted.** Steel ships 7.3–9.9% (the
restored plating, portholes on Great Eastern/Titanic/steamer, antifouling bottoms), wooden
ships 0.13–0.28% (deck-edge black rim gone), aboard/aboard-off/map-floor 0.10–0.24% (the same
classes reaching the Sea view and map token). Twelve-bearing spins captured before acceptance
for all nine steel ships plus ship-of-the-line and fluyt: `_spin/<ship>-r31/`. Diffs confined
to the aimed set in every frame.

**Deploy: BLOCKED at time of writing — the round 29–30 GitHub outage was still running**
(Actions and Pages both `major_outage` at this round's start; live stamp still 1786032589 =
round 28). This round's stamp is **1786046545**. Next session: if the live stamp is still
behind, `gh workflow run pages.yml --ref main` once githubstatus.com shows Actions
operational, then verify the stamp moves. Round 29's lesson stands: check githubstatus.com
BEFORE diagnosing the repo.

### Next, in order
1. **Fold the hand-edited vessels.json back into build_data.py** or guard the generator
   (carried from round 30 — build_data.py would silently wipe six rounds of hull work).
   Before anything else touches build_data.py.
2. **Period-correct steel dress, as a class:** the restored pass paints one Victorian scheme
   fleet-wide — salmon antifouling, gold sheer line, riveted lands — on ships from 1858 to
   2017. A welded 1966/2015 hull shows weld seams not riveted lands, oxide-red bottom, no
   gold cove stripe; Yamato's bottom was dark hull-red. Key the scheme off the era.
3. **The float datum:** every ship shows ~2 m of antifouling above the still-water line in
   the Shipwright (visible in all r31 spins, pre-existing). Either the display trim is
   deliberate light-load or the vertical datum is off — measure before tuning.
4. Sea-view spot check of the remaining steel ships from round 25 (partially covered: aboard
   and aboard-off frames now show the new plating and were accepted).
5. The serif-webfont dependency decision (closes the globe-default false-RED class).
6. The land in the Sea close-up: featureless brown ramp, check on a high coast.
7. Titanic fine structure: forecastle/poop breaks, raked buff masts, funnel buff A/B.
8. Yamato round 2: 25 mm tertiary battery, deck aircraft, boat-stowage hatches, pagoda
   searchlight platforms.

---

## Round 32 — 2026-08-06 — The dress is a date: fastening, bottom colour and cove line are now era facts

**Queue items 1 and 2, both done, plus one fault found on the way.**

**1. build_data.py is guarded.** `write()` now recursively compares the keys of the file on
disk against the keys the generator emits; if the disk copy carries keys the generator does not
produce, it refuses and names them, requiring `--force`. Proven live: running build_data.py
against the real vessels.json refused with 27 unknown keys (turretAt, aa, catapults, lenM, the
polar table…) and left the file byte-identical; ports.json, still generator-owned, rewrote
byte-identically. Any future hand-edit that adds a key arms the guard automatically. Limit
recorded in the comment: a hand-edit that only changes VALUES under existing keys is invisible
to it — every recorded refinement added keys.

**2. The steel dress is keyed off the era, as a class.** The restored plating pass painted one
Victorian scheme (salmon bottom, gilt cove, riveted lands) on ships 1858–2017. Now: each steel
hull carries `year` in vessels.json (the year DEPICTED, midpoint convention where the type
spans); hull.js derives `uWeld` (welded ≥ 1950), `uBottom` (salmon pre-1890 → red-brown oxide
1890–1955 → modern oxide red, per-ship `bottom` override for Yamato's dark IJN hull-red), and
`uCove` from a per-ship data field (documented gilt stripes only: great-eastern, steamer,
titanic). The shader renders the described scheme: the welded branch has flush hairline butts
on a coarser plate grid, no rivets, weaker block-tone patchwork, and the HUNGRY HORSE — shell
dished between web frames at uFrames·0.26, a real spacing — while the riveted branch is
bit-identical to round 31 (plateTone rewritten as 0.97 + amp·(hash−0.5), same numbers).

**3. Found on the steamer's frame: the stage card called every steel ship block-built and
welded.** Titanic and Yamato both wore "STEEL: FRAMES, THEN WELDED PLATE" — prefabricated
blocks are a post-war method and a 1912 shell is three million rivets. TRADITION now has a
`steelRiveted` entry and the lookup uses the same era key: steel + year < 1950 → riveted
story. Preussen/dreadnought/titanic/yamato get it; container/carrier/usv keep the welded one.

**Audit: two new DATA rules** (geometry cannot see paint): a steel hull without `year` — the
silent-Victorian-fallback fault — and a cove line on a ≥1950 hull. Proven live by breaking the
data (container year deleted, carrier cove added): both fired, exit 1; restored, 25/25 clean.

**Ratchet: 6 moved, 3 new, all classified and accepted; the controls sat still.** The A/B that
matters: **ship-great-eastern 0.000%** — pre-1890 dress is pixel-identical, so the refactor
changed only what the era rule says changes. Moved: titanic 0.503% (red-brown bottom, card),
yamato 1.087% (dark hull-red, cove gone, card), container 0.905% / carrier 0.419% / usv 0.612%
(welded dress), aboard-off 0.173% (the class reaching the Sea view). New baselines:
ship-preussen, ship-steamer, ship-dreadnought — every steel hull now scored individually.
Twelve-bearing spins in `_spin/{container,titanic,yamato}-r32/`. Wooden fleet, globes, action:
0.000–0.016%, untouched.

**Rule 0 check, written:** the frames read as a rendered world — sea, sky, a floating hull lit
by one sun. Three facts a viewer can read off ship-yamato/low090: a pagoda-masted battleship
with three main turrets; a dark-red antifouled bottom under a grey riveted topside; she draws
~11 m, the boot-top drawing the load line. Off ship-container/b090: a ~400 m box ship stacked
eight high; a white island aft; a welded blue-black shell over modern oxide red.

**Deploy: stamp this round is 1786052194.** At round start Actions/Pages were still
`major_outage` and round 31's dispatched run 31127645943 had FAILED — live stamp was stuck at
1786043728 (round 30). See the end-of-round note below for what actually went live.

### Next, in order
1. **The float datum** (carried): every ship shows ~2 m of antifouling above the still-water
   line in the Shipwright — clearly visible again in yamato-r32/low090. Measure before tuning.
2. Sea-view spot check of the remaining steel ships from round 25 (aboard/aboard-off cover two).
3. The serif-webfont dependency decision (closes the globe-default false-RED class).
4. The land in the Sea close-up: featureless brown ramp, check on a high coast.
5. Titanic fine structure: forecastle/poop breaks, raked buff masts, funnel buff A/B.
6. Yamato round 2: 25 mm tertiary battery, deck aircraft, boat-stowage hatches, pagoda
   searchlight platforms.
7. Period dress, second pass if wanted: welded-hull boot-topping band as a distinct painted
   band; weld-seam sheen A/B in raking light; preussen P-liner white waterline check.

**End-of-round deploy note: LIVE.** The push of 21ba0b9 created no workflow run (ffc3333's
failure mode, still active), but a manual `gh workflow run pages.yml --ref main` succeeded at
~21:50 UTC even with githubstatus still showing Actions/Pages `major_outage` — run
31128442199, completed success, and the live stamp moved 1786043728 → **1786052194**, this
round's. Rounds 31 and 32 are both live. Lesson kept from round 29, sharpened: the status
page is evidence about the platform, not about your run — during a partial outage, dispatch
anyway and judge by the run and the stamp.

---

## Round 33 — 2026-08-06 — She floats at her marks: the datum was a bounding box, not a waterline

**Queue item 1, the float datum, measured then fixed as a class — plus one fault found by the
measurement and one two-models-of-one-number violation found on the way.**

**1. The measurement (before touching anything).** `Research/measure-datum.js`, run in-page
like the audit, per hull: where the skin bottoms out, where the Box3 floor is, and which part
owns the floor. Result: **the skin bottoms at exactly -draught on all 25 hulls** (error 0.000
fleet-wide) — surfacePoint puts the load waterline at local y = 0 by construction, so the
paint line at v = 0.62 and the geometric waterline agree. But both views floated her from
`keelBottom + draught`, and keelBottom is the Box3 floor of the whole group: the keel timber
(0.055·draught + 0.02 below the rabbet), the screw, or the bulb. The sea therefore sat 0.03 m
(dugout) to 0.97 m (container) below her marks, per hull — the "~2 m of antifouling" of
r31–32, the rest of which is wave trough plus a low camera, both physical. The two comments
telling the trireme-sat-in-four-metres story (shipwright.js, passage.js) date from a
parametrisation that no longer exists; both are rewritten.

**2. The fix, in one place.** hull.js userData now records `waterlineY: 0` as a construction
fact with the r33 measurement in the comment; the Shipwright (`SW.waterY`) and all three
passage.js float sites consume it. keelBottom stays for what it is good for: the dry-dock
floor and the Yard's framing.

**3. Found by the measurement: the container's bulb hung 0.97 m below the keel.** No ship can
dry-dock with anything under the baseline — the blocks take her weight on the keel. The bulb
now rides as deep as it can with its underside faired to the baseline (`max(-draught·0.62,
bulbR - draught)`). Deepest part on all 25 hulls is now the keel.

**4. The Shipwright drew one sea and floated ships on another.** Its `uWave` uniform was
`seaWaveUniform()` — wind 7.0 by default — while its floatShip call passes 6.5: hulls rode a
sea 14% smaller than the one drawn under them. The uniform now takes 6.5, with a comment
binding the two numbers. (The Passage already kept them in step per frame; the Action floats
nothing, so its 7.0 sea is self-consistent.)

**Audit: two new rules, both proven live by breaking the state first.** (1) `skin off her
marks` — the skin must bottom at -draught, guarding the construction fact the datum now relies
on (broke surfacePoint by 5%: fired on all 25; restored: clean). (2) `hangs below the keel` —
the keel is the deepest thing on the ship (reverted the bulb: fired on container at -16.97 vs
keel -16.90; restored: clean). 25/25 clean at round end.

**Ratchet: 17 frames moved, every one looked at, all 17 accepted.** Shipwright frames
6.2–13.4% (the re-scaled drawn sea moves most of the pixels; the waterline band the rest),
aboard/aboard-off/aboard-coast 0.74–1.38% (the Sea-view drop off the old lift). The pictures
now agree from Yamato (boot-top at the water, dark red only in the troughs) to the trireme
(blades reaching the sea). Globes, action, descent, map-floor, sea-magnified: 0.000–0.022%,
untouched — except **globe-default at 1.02%, which is the standing serif-webfont false-RED**
(diff is text labels only; left un-accepted; queue item unchanged).

**Rule 0 check, written:** the frames read as a rendered world — a sun-lit swell, a coast
where the frame calls for one, a hull wet to her boot-top. Three facts off ship-titanic: a
four-funnel liner with a black riveted shell and two porthole rows; red-brown antifouling
below a boot-top the sea actually touches; she draws ~10.5 m at her marks. Three off
aboard-coast: a trireme under sail and oar; land ~5 km off her beam; her wake bends with her
course.

**Known limit recorded, not a fault:** floatShip averages bow/mid/aft (1,2,1)/4, so a hull
much longer than the 118 m swell can sit with midship water a few decimetres up the boot-top
while the ends ride high — Great Eastern at the frozen instant heaves -0.78 m with local
surface -0.39 m. That is the model's stated long-ship behaviour, now measured. Also: stated
draught is to the SKIN; the keel timber hangs ~5.5% of draught deeper, so the deepest point
exceeds the card's draught by that much — invisible afloat, worth folding into the draught
convention only if the card ever claims "water she needs".

### Next, in order
1. Sea-view spot check of the remaining steel ships from round 25 (aboard/aboard-off cover two).
2. The serif-webfont dependency decision (closes the globe-default false-RED class — flaked
   again this round).
3. The land in the Sea close-up: featureless brown ramp, check on a high coast.
4. Titanic fine structure: forecastle/poop breaks, raked buff masts, funnel buff A/B.
5. Yamato round 2: 25 mm tertiary battery, deck aircraft, boat-stowage hatches, pagoda
   searchlight platforms.
6. Period dress, second pass if wanted: welded-hull boot-topping band as a distinct painted
   band; weld-seam sheen A/B in raking light; preussen P-liner white waterline check.

**End-of-round deploy note: LIVE, stamp 1786053656.** The push of 00c7a96 again created no
workflow run (the ffc3333 mode is still active — treat it as standing until a push-triggered
run appears). Manual `gh workflow run pages.yml --ref main` → run 31129001186, completed
success, live stamp 1786052194 → 1786053656, verified with a cache-busted fetch.

---

## Round 34 — 2026-08-06 — Titanic to her own drawings: the profile was 1.6× too tall, and the record closed on itself

**Queue item 1 (the Sea-view spot check) and queue item 4 (Titanic fine structure), and the
spot check's biggest find was inside the queue item: her whole VERTICAL model was wrong, not
just her fittings.**

**1. The spot check, seven steel hulls in the Sea close-up.** Temp frames on the voyage URLs
(`e5&f=cable`, `e6&f=preussenvoy|titanicvoy|jutland|kidobutai|tenichigo`, `e7&f=mayflowerusv`),
each looked at. Sound: great-eastern (funnels, masts, paddle wheel, gaff canvas all read),
preussen (five-master under sail), yamato (pagoda, turrets, wooden deck, hull-red bottom), usv
(small but correct). Logged for the queue: **the carrier reads near-black from every angle in
both views** — hers, not the sun's; the Shipwright baseline shows the same charcoal hull and
deck against a real Ford-class haze grey — and **dreadnought's dark-olive deck goes black in
Sea light** (both now queue items below). Titanic's faults went to item 2.

**2. Titanic, rebuilt against the record, class mechanisms throughout.**

* **The height fault.** `freeboard: 18.5` was her BOAT-DECK height above water used as shell
  freeboard, where the fleet convention (checked across all ten steel/iron hulls) is
  waterline→shell deck. Four white tiers then stacked on top of it: drawn boat deck **30.3 m**
  over the water against the record's **19**, funnel tops at 49 m against ~39, and her masts
  (48.7 m) LEVEL with the funnels instead of 20 m above them — which is why the Sea view
  showed a white slab with invisible masts. Now: freeboard 10.1 (C deck), three storeys of
  house, `boatDeckM: 19.0` in the data, and the drawn boat deck derives to 18.98 m.
* **The record closes on itself, which is the check that the mapping is right.** Forecastle
  128 ft + well 50 + bridge superstructure 550 + well 50 + poop 106 = 884 ft against her
  882.75 ft LOA (ggarchives/titanicandco/ET deck guides). `houseAt` moved to the record's
  stations `[0.202, 0.849]` — the drawn house length stays exactly 550 ft (167.6 m) — and
  with `wellM: 15.2` the forecastle break lands 37.1 m abaft the FP (record 39.0 m from the
  stem head ✓) and the poop break 23.9 m forward of u=1 (record 32.3 m less the ~8 m counter
  overhang the loft does not carry ✓). Fore well and aft well fall out as the record's 50 ft.
* **`shellTiers: 1` — a house tier can be SHELL.** The 550 ft bridge superstructure was side
  plating carried up: full-breadth, near-flush, black, a window row in black steel. Tier 0
  now wears the topside colour at B·0.015 inset; the white house (two storeys, two window
  rows) stands on it. This is a linerHouse/buildSuperstructure mechanism any hull can use.
* **`buildRaisedEnds()` — forecastle and poop as data.** Walls lofted around the hull's own
  perimeter (surfacePoint − B·0.015, so they cannot overhang by construction), following the
  hull's own SHEER station by station, one storey high, in the hull's paint; planked deck
  strip lofted the same way; railed all round with the one-polyline posts+bars idiom from
  round 25. Driven by `wellM` + `houseAt`; only Titanic carries the fields this round.
* **Masts.** Rake 9.46° aft (the record: masts and funnels raked 2 in per foot), heights so
  the trucks stand at `mastTopM: 62.5` (circa 205 ft above the load line, the Marconi aerial
  height); mainmast moved 0.735 → 0.878 — it stood in the AFT WELL, abaft all four funnels,
  not mid-house. `mastLivery: 'buff'` — White Star masts wore the funnel buff, and the
  white-lower/black-upper Great Eastern scheme was wrong on her.
* **Funnels.** `funnelRake: 9.46` (default stays 0.085 rad for the rest of the fleet, bit
  identical). **Buff A/B, decided by looking:** old 0xd8cfbb reads near-white cream in both
  views; `buff: "#c9a267"` reads as the "pale orange-yellow" of the sources. The shade is
  CONTESTED — tan ↔ orange-yellow ↔ near-pink (#f1ab91) all defended — said in the data
  comment per rule 9.
* **Perspective, not a fault, measured anyway:** in wide Shipwright bearings the foremast
  APPEARS to rake forward while the mainmast rakes aft. In-page measurement: both masts lean
  +8.7 m aft, tops at 62.2/62.6 m. Verticals far off the camera axis diverge outward at 34°
  FOV; the eye was wrong and the measurement is on file.

**3. Audit: two new DATA rules + one rule fixed, all proven live.** `house off the record`
(freeboard + decks·(beam·0.105) must land on boatDeckM ± 0.5 — the double-counted-datum class)
and `mast tops off the record` (built mast bb vs mastTopM ± 1.5, rake included). Broke the
data (boatDeckM 25, mastTopM 75): both fired; restored: 25/25 clean. And `cargo off the deck
edge` sampled the hull at ONE station (the mesh's bb centre) — the new forecastle wall is one
mesh spanning a tapering bow, widest at its aft end, so the centre-station test flagged
geometry that is lofted FROM surfacePoint and cannot overhang (audit wrong, 5th time; rule 8
held). It now takes the max hull half-breadth over 5 stations across the mesh's span — the
original container-bow fault (9 m past the side, taper across one bay ≈ 2–3 m) still trips
by arithmetic.

**Ratchet:** **28 frames, 3 moved, 2 accepted, 1 left standing.**
`ship-titanic` 25.648% — the rebuild, accepted after 12 spin bearings (`_spin/titanic-r34/`),
the close frame and the Sea view were each looked at. `ship-yamato` 0.179% — edge-only: the
neighbouring COARSE titanic hull in the fleet line dropped to her corrected freeboard;
accepted. `globe-default` 1.023% — the standing serif-webfont false-RED, diff is text labels
only (verified), left un-accepted; it sat at 0.008% in this round's pre-flight and flaked in
the closing check, so the class is alive and remains queued. Everything else 0.000–0.022%,
including ship-great-eastern and ship-steamer at 0.000% — the A/B controls proving the
linerHouse/superstructure/funnel refactors are bit-identical where no data opts in — and
`aboard-titanic` NEW, committed as the liner's Sea-view baseline.

**Rule 0 check, written:** the frames read as a rendered world — a swell with a horizon, a
hull wet at her marks, one sun doing the lighting. Three facts off ship-titanic/b090: a
four-funnel liner whose buff funnels and masts rake visibly aft together; black shell one
storey above two well decks, white above it, boats at the davits; two porthole rows under a
gilt cove on a riveted black side. Three off aboard-titanic: she is ~270 m with the house
amidships and breaks fore and aft; her masts out-tower her funnels; red-brown antifouling
shows only where the trough drops below her marks.

### Next, in order
1. **The carrier's tone** (r34 spot check): charcoal hull/deck against a real haze-grey
   Ford class — near-black silhouette in the Sea view from every angle. Measure against
   reference imagery before touching the constant; it is one material colour, not a shader.
2. **Dreadnought's deck colour** (r34 spot check): dark olive that reads black in Sea light;
   the record says holystoned wood decks. Check the deck material convention for pre-1920
   warships as a class.
3. The serif-webfont dependency decision (globe-default false-RED; 0.008% in this round's
   pre-flight, 1.023% in the closing check — it flakes WITHIN a round, which is the class).
4. The land in the Sea close-up: featureless brown ramp, check on a high coast.
5. Yamato round 2: 25 mm tertiary battery, deck aircraft, boat-stowage hatches, pagoda
   searchlight platforms.
6. Titanic remainder, if wanted: crow's nest height from the record (drawn at 0.66 of the
   mast, likely ~10 m high), funnel stations against the GA drawing, A-deck open promenade
   forward (hers were enclosed — the Olympic tell), docking bridge on the poop.
7. Period dress, second pass if wanted: welded boot-topping band; weld-seam sheen A/B;
   preussen P-liner white waterline check.

**End-of-round deploy note: LIVE, stamp 1786058340.** The push of 28c342b created no run
within a minute — but r33's push run (31129373376) did eventually fire 36 minutes late, so
the mode has shifted from "never fires" to "fires late"; treat a missing run as late, not
dead, and dispatch anyway. Manual `gh workflow run pages.yml` → run 31131412718, completed
success, live stamp verified 1786053656 → **1786058340** with a cache-busted fetch.

---

## Round 35 — 2026-08-06 — One bug was both queue items: every deck in the fleet was lit from under the sea

**Queue items 1 and 2 (the carrier's black cutout, dreadnought's black deck) turned out to be
ONE class bug, plus a paint job.** This round ran in fragments — several sessions died waiting
on the ratchet render and the loop restarted them — so the closing session re-verified
everything from scratch rather than trusting the fragments' claims: audit re-run, every moved
frame re-rendered fresh, the carrier re-measured on the new render.

**1. The winding fix, hull.js `buildDeckGeometry` — the class find of the round.** The deck
grid declared every normal `(0,1,0)` and wound its triangles `(a,c,b)` — clockwise from above.
three.js's double-sided lighting flip trusts the WINDING: seen from above the faces were back
faces, the up-normals were flipped down, and every weather deck in the fleet was lit by the
GROUND half of the hemisphere light. The carrier's "charcoal deck" and dreadnought's "dark
olive deck that goes black in Sea light" were both sunlit decks lit as if they faced the sea
floor. No picture ratchet can catch it, because a consistently wrong deck never changes.
Verified by hand (both triangles of the fixed `(a,b,c),(c,b,d)` cross to +Y for the deck's
vertex layout) and empirically: the audit's new **`winding contradicts declared normals`**
rule samples ~40 faces per MeshStandardMaterial mesh, compares geometric to declared normals,
and fires on >50% disagreement — the killed session proved it live by reverting the fix
(fired fleet-wide) and restoring it (25/25 clean).

**2. The carrier's paint, rebuilt from compensations to albedos.** Deck 0x23272b / island
0x2b3036 / topside #4e545b were soot values each tuned to look right under one rig and wrong
under the other. Measured against the 8 Apr 2017 sea-trials broadside (US Navy, PD): island
as bright as wake foam, deck ~0.9× of it, shell 0.2–0.6× — the only near-black on a Ford is
the deck-edge overhang's shadow, which the renderer casts itself. Now: FS 26270 haze grey
(#848a8e) on every vertical including the hangar casing (its darkness must come from the
shadow, as on the ship), MIL-PRF-24667 non-skid 0x4e5357 on the deck — the weathered shade
is CONTESTED (fresh coats near-black, worn decks mid grey; said in the code) — and the
deck-edge lifts wear deck paint, not vertical-surface paint. **Measured on the fresh
ship-carrier render: island 131 > deck 126 > shell 60 > sea 29** — the reference pattern,
and she reads grey from all bearings in both views (spin + both baselines looked at).

**3. `deckSteel` — the covering is a fact of the SHIP.** The lighting fix exposed a planked
timber deck the 2026 composite USV had been invisibly wearing (the old heuristic guessed
steel only from flightDeck/containers). `deckSteel` in the record now overrides the guess;
only the USV carries it this round. Verified: her deck reads steel grey with hatch seams.

**4. Ratchet: 29 frames, 16 moved, 15 accepted as one class, 1 left standing.** The 13
ship-* frames + shipwright + aboard-coast are all the winding fix (diffs confined to deck
surfaces and hatch gratings — each diff image looked at; ship-carrier 5.406% adds the paint,
ship-usv 1.358% adds deckSteel). `globe-default` 1.023%/0.274 is the standing serif-webfont
text-only flake (diff verified text-only again), left un-accepted, still queued. Passes
include `aboard-titanic` 0.039% and **`aboard-carrier` 0.000% — the new Sea-view baseline
committed this round, bit-identical to the interrupted session's render, which is the
determinism proof.** Audit 25/25 clean, from the served files.

**Rule 0 check, written:** the frames read as a rendered world — one sun, a swell, hulls wet
at their marks. Three facts off ship-carrier: a Ford-class carrier in haze grey with a
near-black non-skid deck park and white runway stripes angled to port; the island small, to
starboard, brightest surface in frame; red antifouling at the stem where the trough drops.
Three off ship-dreadnought: holystoned wood weather deck pale at bow and quarter; two buff
funnels with black caps abaft a tripod-adjacent mast; main battery in grey turrets fore and
aft with wing barbettes.

**New class find, QUEUED with values (data-only, one line per vessel):** engine-driven cards
without `speedKn` show the RIG POLAR as "best speed" — the exact fault the r34 Titanic fix
documented (`shipwright.js` ~line 571). Live wrong numbers: carrier 16.0 kn (record's own row:
"in excess of 30"), dreadnought 9.6 (record: 21), yamato (record: 27), steamer 9.6 (Great
Britain: 12.25), container 16.0 (record: ~21 slow-steaming), usv 16.0 (a 22 m wing-sail
drone; Saildrone Surveyor ~3–5 kn — CONTESTED which number is "service"). Not fixed this
round because the card text is in every ship frame and the edit would have split the
in-flight ratchet run; it is a six-line vessels.json edit plus one ratchet pass next round.

**A trap hit and cleared:** TWO servers were listening on :8149 — the correct one (web/,
IPv4) and a stale one serving the REPO ROOT on IPv6 from an interrupted session. A fetch of
localhost could resolve to either stack. The root server was killed; if frames ever come back
wrong-looking with panels intact, check `lsof -nP -iTCP:8149` FIRST.

### Next, in order
1. **speedKn for the six engine-driven records** (values above; one ratchet pass, frames
   move by card text only).
2. The serif-webfont dependency decision (globe-default false-RED; flaked within r34 and
   again this round at the same 1.023%).
3. The land in the Sea close-up: featureless brown ramp, check on a high coast.
4. Yamato round 2: 25 mm tertiary battery, deck aircraft, boat-stowage hatches, pagoda
   searchlight platforms.
5. Titanic remainder, if wanted: crow's nest height, funnel stations against the GA drawing,
   enclosed A-deck promenade forward, docking bridge on the poop.
6. Period dress, second pass if wanted: welded boot-topping band; weld-seam sheen A/B;
   preussen P-liner white waterline check.

**End-of-round deploy note: LIVE, stamp 1786069279.** The failure mode may have healed: the
push of d965acf created run 31141000795 within EIGHT SECONDS — but the manual dispatch fired
on top of it and the concurrency group CANCELLED the push run, so the dispatch (31141007753,
completed success) did the deploy. Next round: give the push run a minute before dispatching,
because dispatching now cancels a healthy push run rather than backstopping a missing one.
Live stamp verified 1786058340 → **1786069279** with a cache-busted fetch.

---

## Round 36 — 2026-08-06 — The record's speed in both views, and Yamato's second pass

**Queue item 1 closed, and it was bigger than queued: the speedKn fix was needed in TWO
places.** The six engine-driven records got their service speeds (carrier 30.0 — the record's
own "in excess of 30" floor; dreadnought 21.0; yamato 27.0; steamer 12.25 — Great Britain's
own row; container 21.0 slow-steaming; usv 4.0 with a new Speed row saying **contested** for
a hull that harvests its drive). The Shipwright card was already fixed (r34); but the NEW
aboard-yamato baseline caught the SEA card showing "Best speed 9.6 kn" against a record 27 —
`app.js` shipCard reads `shipKn()`, which is the ROUTING POLAR's max. Same class, second
instance. The card now carries the record's number labelled "Service speed" where `speedKn`
exists; the pacing stays on `shipKn()`, and the gap between them is the front page's stated
factor of two, not a bug to hide. Verified rendered in both views (ship-yamato card 27.0,
aboard-yamato card 27.0).

**Yamato round 2 — all four queue items, record-driven and class-extensible.**
1. **`aaLight: [{at}]`** — the 25 mm close-in battery, one entry per side-pair: eight
   shielded triples on raised BANDSTANDS along the amidships structure (drum, tub, pedestal,
   shield, three slim barrels elevated 46°), matching her 1941 completion fit of 24 barrels.
   The card's new "Anti-aircraft, as completed" row carries the same numbers, and the 1945
   ~150-barrel trajectory.
2. **`searchlights: 8`** — platforms winged off the pagoda in pairs, one pair per tower
   level working upward, derived from the tower's own `levels` array so a different pagoda
   carries them at its own heights. Bracket → platform → pedestal → drum → glass face; from
   broadside they read as the dark circles stacked up the tower that period photographs show.
3. **`floatplanes: 2`** — a real floatplane builder (main float, two-bay biplane, cowl and
   stopped prop, canopy, wingtip floats, hinomaru as geometry through the fuselage and on
   the upper wing). One rides the PORT CATAPULT — built inside the catapult group so plane
   and beam train together and cannot come apart (A11's lesson) — nose at the launch end;
   the second parks on the centreline seated on the deck's own camber
   (`cos((z/b)·π/2)·b·0.035`, the same cosine buildDeckGeometry draws).
4. **`deckHatches: [{at,z,lenM,widM}]`** — three quarterdeck stowage hatches (two abeam,
   one centreline), coaming + sectioned cover + seams, seated on the cambered deck. The
   card's Aircraft row says WHY the decks are empty: 46 cm muzzle blast wrecks anything
   left in the open, so boats and aircraft stow below and come up to the crane.

**A survey scare resolved by measurement, not by eye:** from b270 a pale ~7 m cylinder lay
"detached" on the port quarterdeck. Probing every mesh box in the region in the live page:
it is the port catapult's inboard beam half trained across the deck, turntable amidships —
real, attached, and 0.5 m clear of the parked plane's wingtip. The eye was wrong and the
measurement is on file (rule 8's spirit, applied to a survey read).

**Audit: FOUR new rules, all proven live by break-and-restore.** The class: a record field
that silently stops producing geometry — or produces it adrift — is invisible to every
picture. `light battery miscounted` (2× per side-pair), `searchlights miscounted`,
`floatplane stands on nothing` (float bottom vs sheer at its own station, catapult riders
allowed), `hatch off the deck` (coaming vs the cambered deck, the audit re-deriving the
same cosine). Broke the data (searchlights 9) and the builder (hatch +2 m, single-side
aaLight, plane at +6 m): all four fired, restored: 25/25 clean, from the served files.
`declared but not drawn` also knows all four new fields now.

**Ratchet: 30 frames — 12 moved or new, all classified and accepted, closing check all
0.000–0.049 within tolerance.** `ship-yamato` 0.334% is the round (diff verified: confined
to the new fittings + card text; hull and sea bit-identical). `aboard-yamato` NEW, committed
with the corrected card. `aboard-titanic` 0.074% card-text-only. Five ship-* frames +
aboard-carrier 0.027–0.040% card text (the speedKn class), accepted so the stable diff
cannot stack under a future change. **And a baseline artefact found:** `aboard` 0.082% /
`aboard-off` 0.055% each carried dark land-sliver wedges over the steamer's bow and stern
decks in the r35 baselines — the fragment-close had captured a transient. Two independent
r36 renders agree the decks are clean; accepted with the artefact named. `globe-default`
passed at 0.013% both runs this round — the serif flake did not fire, class still queued.

**Rule 0 check, written:** the frames read as a rendered world — one sun, a swell, a hull
wet at her marks. Three facts off ship-yamato/b270: a floatplane with red hinomaru riding
the port catapult, angled outboard over the stern; three flush stowage hatches on an
otherwise empty quarterdeck abaft the aft turret's guns; the amidships structure crowded
with shielded mounts, triple barrels elevated together. Three off aboard-yamato: a pagoda
foremast out-towering a single funnel; a wood-tan weather deck between grey citadel decks;
her card giving 27.0 kn as service speed while she stands off a brown coast.

### Next, in order
1. **Yamato's funnel is vertical; hers raked ~25° aft** — the broadside's biggest remaining
   resemblance gap. A `funnelRake` record field on the funnel builder, class-level (Kongō,
   Ise, most IJN capital ships rake; Dreadnought's stacks are vertical, so it must be data).
2. The serif-webfont dependency decision (globe-default false-RED; did not fire this round,
   the class is still open).
3. The land in the Sea close-up: featureless brown ramp, check on a high coast (visible
   behind aboard-yamato now — it is the next thing the eye snags on in that frame).
4. Titanic remainder, if wanted: crow's nest height, funnel stations against the GA
   drawing, enclosed A-deck promenade forward, docking bridge on the poop.
5. Period dress, second pass if wanted: welded boot-topping band; weld-seam sheen A/B;
   preussen P-liner white waterline check.

**End-of-round deploy note: LIVE, stamp 1786072100.** The healing held: the push of 5257c45
created its own pages run, which completed success with NO manual dispatch — the first
clean push-triggered deploy since the failure mode began. The r35 advice (give the push run
a minute before dispatching) is now the standing procedure. Live stamp verified
1786069279 → **1786072100** with a cache-busted fetch.

---

## Round 37 — 2026-08-06 — The funnel wears the record's rake

**Queue item 1 closed: `funnelRake` is now worn, and wearing it properly forced a structural
fix.** The field existed since the Titanic round (9.46°) but the builder rotated the WHOLE
funnel group — casing included — and at Yamato's real angle that broke: the boiler casing is a
DECKHOUSE, the house over the fiddley, vertical walls by construction, and tilting it 25° lifted
its forward base edge 2.5 m off the deck. So buildFunnel now keeps the casing plumb and rakes
only the UPTAKE, rotated about its root, with the root sunk to the casing floor so the tilted
base rim stays hidden inside the casing at any recorded angle; the steam pipe's foot is pinned
inside the casing footprint and raked parallel, so it cannot float when the stack leans hard.
The livery cap is measured down from the HEAD so the buried root does not stretch it.

**Data: Yamato `funnelRake: 25`** — her single trunked uptake's recorded inclination, and most
of her broadside identity — and **Dreadnought `funnelRake: 0`**, because her stacks stood plumb
and a vertical stack must be sayable in data, not by luck of a default. Titanic keeps her 9.46;
Great Eastern and the steamer keep the mild default lean (4.87°). Verified rendered: the Yamato
funnel leans hard aft between pagoda and mainmast in BOTH views; Dreadnought's two stacks stand
plumb; Titanic's four still rake with plumb casings under them.

**Audit: one new rule, `funnel rake not worn`, proven by break-and-restore.** The class: a
rotation that silently stops being applied is invisible to every existing rule — the funnel is
present, at its station, at its height, and WRONG. The stack is a cylinder along its local +y,
so the world direction of that axis IS the drawn rake; every stack is measured and the worst
answers, so one plumb funnel among raked sisters is caught. Broke the builder (rotation zeroed):
fired on exactly the four raked ships and passed Dreadnought, whose record and drawing agree at
0°. Restored: 25/25 clean from the served files.

**Ratchet: 30 frames — 5 moved, all classified and accepted, closing check all within
tolerance.** ship-yamato 0.432% and aboard-yamato 0.063% are the rake itself (diffs confined to
the funnel). ship-dreadnought 0.829% is the two stacks standing up straight. ship-titanic 0.108%
and ship-great-eastern 0.177% are the class edge: plumb casings, pinned pipe feet, and the cap
boundary landing on a different vertex ring of the lengthened stack cylinder. ship-steamer moved
0.019%, under limit, same cause.

**Rule 0 check, written:** the frames read as a rendered world, not a chart. Three facts off
ship-yamato: the funnel leans ~25° aft directly abaft the pagoda; the floatplane rides the port
catapult angled over the stern; the aft turret's three barrels point astern over an empty
quarterdeck with three flush hatches. Three off ship-dreadnought: two plumb buff-grey stacks
with black heads; five turrets with twin 12-inch barrels; a single pole mast carrying its
spotting top forward of the fore funnel.

**Seen while verifying, queued rather than patched (rule 5):** Dreadnought's foremast stands
FORWARD of her fore funnel here; the real ship's tripod stood ABAFT it — the famous design
error that put the spotting top in the funnel smoke. That is a mast-station data fix plus
possibly a tripod builder, not a one-liner; it is queue material.

### Next, in order
1. The serif-webfont dependency decision (globe-default false-RED; did not fire r36 or r37,
   the class is still open).
2. The land in the Sea close-up: featureless brown ramp behind aboard-yamato — the next thing
   the eye snags on in that frame.
3. **Dreadnought's foremast abaft the fore funnel** (new this round; the real ship's spotting
   top stood in the smoke, and ours stands clear where hers did not).
4. Titanic remainder, if wanted: crow's nest height, funnel stations against the GA drawing,
   enclosed A-deck promenade forward, docking bridge on the poop.
5. Period dress, second pass if wanted: welded boot-topping band; weld-seam sheen A/B;
   preussen P-liner white waterline check.

**End-of-round deploy note: LIVE, stamp 1786075399.** Second clean push-triggered deploy in a
row: the push of 82e35de created run 31146774263, in progress within seconds, completed success
with no manual dispatch. Live stamp verified 1786072100 → **1786075399** with a cache-busted
fetch of the data-version meta tag.

---

## Round 38 — 2026-08-06 — Dreadnought becomes the record's ship; a stranded round finished

**This round was found abandoned in the tree.** The 21:25 and 22:15 loop rounds ended with no
log summary, no HANDOFF entry, and ten files modified but uncommitted — the full Dreadnought
overhaul, built and stamped but never verified, accepted, or shipped. Standing instruction is
"do not leave the tree uncommitted"; this round's job was to verify that work honestly and
finish it, and everything below was re-proven from the served files, not assumed.

**Queue item 3 closed, and it grew into the class fix it wanted.** Dreadnought now wears her
real arrangement, verified against three records fetched this round (the Wikipedia article, the
1911 profile/plan drawing, photograph H61017):

* **`turretSide`** (parallel to `turretRaise`): ±1 stands a main-battery mount at the deck edge.
  Her five twin 12-inch houses now sit A–P–Q–X–Y — three centreline, P/Q on the wings giving
  the eight-gun broadside her card always claimed. Wing mounts train fore-and-aft at rest.
* **`tripod` / `tripodRake`** on a mast record: two struts and a spotting top, feet aft on the
  foremast (26°, H61017), feet forward on the main (14°), landing in the X–Y gap — the mainmast
  stands BETWEEN X and Y, which the profile drawing confirms. The foremast stands at 0.425,
  ABAFT the fore funnel at 0.385: the famous error that put the spotting top in the smoke, now
  faithfully wrong, and the part card says so.
* **`turretRadius` is now the gun's, not the ship's**: R = min(beam·0.22, calibre·15.4). A twin
  12-inch house is ~9.4 m over the plates (was 10 m), Yamato's triple 46 cm is 14.2 m against
  her real ~15 (was 15.6). Rangefinder ears R·2+cal·2 = 15.1 m on Yamato's real 15; at 2.5R a
  wing mount's ears out-reached the hull.
* **The citadel waists between the wing barbettes** — only centreline turrets bound it
  fore-and-aft; the wings pinch its width, which is why the real ship reads as two blocks
  joined by a spine. `towerAt` unpins the bridge from masts[0], which the mast move forced.
* **`funnelScale`**: her aft stack served twice the boilers and photographs show it plainly
  fatter — 0.88/1.14, and the stacks stand at 0.385/0.515.
* Engine strings corrected on three cards: Titanic "triple expansion + turbine", Dreadnought
  "steam turbine", Yamato "geared turbines".

**Audit: 25/25 clean, and the round's three new rules were each proven by break-and-restore
this session.** Zeroing `turretSide` in the builder fired `wing turret not on the wing`
(record [-1,0,0,0,1] vs drawn [0,0,0,0,0]) AND `turret buried in the superstructure` — the two
coincident centreline houses landed inside the citadel, so the new loft-aware buried test sees
through the waist. Zeroing the strut lean fired `tripod not worn` on all four struts. Restored:
25/25 from the served files.

**Surveyed from four bearings**, the broadside baseline plus stern-quarter, bow-quarter and
near-overhead captures driven through `SW.shipSpin` in the live page: wings at the deck edge
both sides, nothing floating, nothing interpenetrating, A and the wings trained forward, X and
Y astern, the waist visibly narrowing beside the wing barbettes.

**Ratchet: 4 moved of 30, all classified, accepted with reasons, closing check all-clean.**
ship-dreadnought 4.347% is the whole topside rebuilt over a hull that did not move (diff shows
only a dotted sheer trace beyond the superstructure). ship-yamato 0.472% is the three main
houses shrinking to calibre size. ship-titanic 0.058% and aboard-yamato 0.052% are card text
and the distant turrets respectively.

**Rule 0 check, written:** the frame reads as a rendered world. Three facts off
ship-dreadnought: a main-battery turret stands at the port deck edge amidships, trained toward
the bow; the tripod foremast rises directly abaft the fore funnel, struts planted aft; of her
two plumb grey stacks the after one is plainly fatter. Off the stern quarter: X and Y point
astern with the short main tripod standing between them.

**A trap paid for this round, recorded:** during break-and-restore, `git checkout -- hull.js`
restored the COMMITTED file and silently discarded the round's own uncommitted work — recovered
byte-identical from the built docs/ copy. On an uncommitted tree, break-and-restore must
restore by re-editing (sed back, or a stashed copy), never by git checkout.

### Next, in order
1. The serif-webfont dependency decision (globe-default false-RED; has not fired since r35,
   the class is still open).
2. The land in the Sea close-up: featureless brown ramp behind aboard-yamato.
3. **Dreadnought's anti-torpedo net booms and shelf** — the row of diagonal spars along the
   hull is the most conspicuous thing in H61017 that our broadside lacks; period-defining
   (fitted 1906, landed by WWI). A `netDefence` record field, class-level.
4. Titanic remainder, if wanted: crow's nest height, funnel stations against the GA drawing,
   enclosed A-deck promenade forward, docking bridge on the poop.
5. Period dress, second pass if wanted: welded boot-topping band; weld-seam sheen A/B;
   preussen P-liner white waterline check.

**End-of-round deploy note: LIVE, stamp 1786080947.** Third clean push-triggered deploy in a
row: the push of 8bd536f created run 31151709154, completed success with no manual dispatch.
Live stamp verified 1786075399 → **1786080947** with a cache-busted fetch of the data-version
meta tag.

---

## Round 39 — 2026-08-06 — the net defence: Dreadnought wears her diagonals

**Queue item 3 closed, as the class fix it asked for.** `netDefence` on a hull record now hangs
the anti-torpedo outfit on the side: a net shelf riding the hull's own curve, the steel-wire
net rolled on it, and the record's 40 ft booms (Torpedo net, Wikipedia: 12 m spars, pinned at
or below the main-deck edge, swung against the ship at sea) stowed in the row of down-aft
diagonals that is the most conspicuous thing in photograph H61017 — re-fetched and LOOKED AT
this round before writing geometry. Twelve booms per side over u 0.28–0.92, spacing ~8.3 m,
droop 14°, every heel and tip pinned to `surfacePoint` at its own station and height so the
row follows the taper instead of standing off it. One derivation — `SHIPS_HULL.netDefenceGeom`
— feeds the builder AND the audit rule. Dreadnought's card gains a "Net defence" row; the part
card says the nets were landed early in WWI (net-cutters, speed), which is also the honest
label for the one tension left: her Sea voyage is Jutland 1916, and the hull is depicted
as-built 1906, nets and all.

**Audit: 25/25 clean; the new rule proven by break-and-restore three ways** (restore by
re-edit, never `git checkout` — last round's trap). Flattening the droop to 0° fired `net boom
not stowed` ("a boom points (0.99, -0.00, 0.15)"); drawing 5 of 12 booms fired `net defence
not worn` ("24 booms derived from the record, 10 drawn"); the one-side break also proved the
count arm — and taught a smaller trap: `sed` on `for (const sgn of [1, -1])` hits every
mirrored fitting in hull.js, so break something UNIQUE to the class under test. The rule also
asserts each boom lies fore-and-aft against the plating at its own station (|z| within the
hull's own half-breadth there ± tolerance), out of the water, under the deck edge, and that
the shelf spans the declared run.

**Ratchet: 1 moved of 30 — ship-dreadnought 0.325%, accepted with reason.** The diff image is
the net defence alone: the shelf line and twelve diagonals, nothing else in the frame moved.
Closing check pending at write time; verified before commit below. Surveyed from twelve
bearings via spin_capture (8 high, 4 low): both sides wear the row, diagonals descend aft on
both sides, nothing floats, nothing pierces the boot-topping, the shelf tracks the taper at
bow and stern ends of the run.

**Rule 0 check, written:** the frame reads as a rendered world. Three facts off
ship-dreadnought: a row of a dozen spars stowed in matching down-aft diagonals along the hull
side below a continuous shelf line; five twin-gun turrets, two of them at the deck edges; the
tripod foremast directly abaft the fore funnel with its struts planted aft.

### Next, in order
1. The serif-webfont dependency decision (globe-default false-RED; has not fired since r35,
   the class is still open).
2. The land in the Sea close-up: featureless brown ramp behind aboard-yamato.
3. Titanic remainder, if wanted: crow's nest height, funnel stations against the GA drawing,
   enclosed A-deck promenade forward, docking bridge on the poop.
4. Period dress, second pass if wanted: welded boot-topping band; weld-seam sheen A/B;
   preussen P-liner white waterline check.
5. Depicted-year fittings, if ever wanted as a class: the Sea could pass a voyage year into
   buildShip and gate dated fittings (nets 1906–1914) — queue material only; today the part
   card carries the date honestly.

**End-of-round deploy note: LIVE, stamp 1786083736.** Fourth clean push-triggered deploy in a
row: the push of 7ff8738 created run 31154303774, completed success with no manual dispatch.
Live stamp verified 1786080947 → **1786083736** with a cache-busted fetch of the data-version
meta tag.

---

## Round 41 — 2026-08-07 — August's eleven: the interaction half, and a hull that has weight

**Run from the interactive session, holding `build/.loop.lock`.** ⚠ The round before this one
**left the tree uncommitted** — the Great Eastern paddle-box rebuild, its new `paddlebox` audit
rules and three new frames — because it ran out of turns waiting on the frame check. Its own log
records audit 25/25 with break-and-restore proofs. **I did not verify that work and my changes
are committed on top of it**, so the frames it moved (`ship-great-eastern`, `ship-preussen`,
`ship-steamer`, `ship-dreadnought`) carry both causes and its next round should satisfy itself
about the paddle box independently. Rule for the future, and the loop-prompt already says it:
*do not leave the tree uncommitted* — a half-round is worse than no round, because the next
worker cannot tell whose change they are looking at.

### Seven of August's eleven items, done and looked at

1. **The camera follows a clicked voyage** (`stepTrackVoyage`). It flew to where she was at that
   instant and let go; on a map running ten hours a second that is a picture of empty ocean
   within seconds. Now the click arms a follow that eases (0.075/frame, not a lock — a hard lock
   makes the ocean look like it is sliding past a fixed ship), holds ALTITUDE because following
   is a pan and the zoom is the viewer's, unwraps the dateline before easing, and is cancelled by
   any deliberate camera move, era change or `clearVoyage`.
2. **`#card` no longer runs under the era strip.** It sat at `top:150` with
   `max-height:calc(100vh − 290px)`, so its foot landed at 760 in a 900 px window and the strip
   that carries the year stands from 734.
3. **The ship's slip no longer buries the readout.** `#psgCard` was fixed at `top:78`; `#readout`
   stands from 16 and runs past it, which is the six-pixel sliver down one side that reads as a
   bug. ⚠ My first attempt fixed the wrong pair — I moved `#card` DOWN, and the panel being
   obscured was above, not below. Looking at the frame is what caught it.
   ⚠⚠ AND THE SECOND ATTEMPT WAS INERT FOR A BETTER REASON, WORTH KEEPING: the visibility test
   was `el.offsetParent !== null`, and **a `position: fixed` element's offsetParent is null by
   specification**. Every panel in this column is fixed, so all of them reported hidden, every
   measurement fell through to its fallback constant, and both overlaps stayed exactly as they
   were — while the CSS variables were demonstrably present in the built file. It reads as "the
   custom properties are not arriving"; they arrive carrying the old numbers. Test visibility by
   measuring the box (`getBoundingClientRect().height > 1` plus a computed-display check), never
   by offsetParent, anywhere in this codebase.
   The whole left column is now MEASURED, in order — readout, slip, card — by `syncPanelInsets()`
   publishing `--psg-top`, `--card-top` and `--erabar-h`. A ResizeObserver rather than a resize
   listener, because the thing that changes most is the era strip's own wrapping, which no window
   event reports.
4. **A hull has weight now.** See the long note in `sea.js`. The old `floatShip` sampled three
   points and meaned them, so a 337 m carrier spanning three swells and twelve chop wavelengths
   got an average with no physical meaning that swung with the full amplitude of the sea. Heave
   is the MEAN over the waterplane and pitch and roll its first moments, and for a sinusoid those
   integrals are exact — no sampling at all. `sinc(kμL/2)` is the whole of "big ships are steady":
   carrier in the 118 m swell → 0.049, dugout → 0.991. Then roll alone gets the damped-oscillator
   response, because ships are narrow and the length filter barely touches roll; the IMO
   weather-criterion period gives 16.7 s for the carrier against 3.5 s for the dugout.
   **Measured, heave range in a 7 m/s sea:** dugout 4.35 m, canoe 4.01, trireme 3.29, titanic
   0.37, carrier **0.21**, container 0.22. It still answers weather: carrier 0.07 / 0.21 / 0.87 m
   at wind 2 / 7 / 15. Nothing here was tuned — the numbers fall out of integrating along the hull.
9. **The fleet strip scrolls, visibly.** It always did — 2.6 m of hulls in a window showing
   nineteen — but macOS draws overlay scrollbars only while they move, so the rest was reachable
   and unadvertised. Always-visible scrollbar, a wheel handler (a mouse sends only deltaY, so on
   a horizontal strip it did nothing), and the selection is scrolled into view.
10. **Neighbours are built fine.** Only the selected hull was ever fine, and fine is what adds
    the RUDDER, stem, sternpost, wales and channels — so a neighbour was not a rougher ship, it
    was a ship with no rudder, which is exactly what you see pulled back far enough to hold three
    or four. `FINE_WINDOW = 9` around the selection, one hull built or dropped per frame so the
    upgrade lands while the camera is still easing. ⚠ In FROZEN mode the window is completed in
    one go or captures would photograph a half-drained queue.
11. **The zoom carries across ships.** `SW.dist` multiplies a per-vessel `fit`, so it was already
    scale-relative and resetting it to 1.12 threw the viewer's zoom away at every step. Kept now,
    floored at 1.0 so a very close zoom opens out rather than cropping the next ship. Ships of
    very different size need no special case — `fit` grows 46× from dugout to container ship.
8. **Era titles and ledes rewritten** toward description rather than aphorism: "The ocean crossed,
   and taken" → "Ocean navigation, empire and the Atlantic slave trade"; "the end of the wind" →
   "Iron hulls and steam propulsion"; "the sea as a cost line" → "Containerisation and modern
   shipping" (tab "The box" → "Containers").

### Next, in order — the four content items, which are a project not a round

**5, 6 and 7 are the remaining ones and they need SOURCING, which is why they are not done here.**

1. **Images on the Shipwright cards (item 6), and this is the licensing decision.** The standing
   instruction is to source aggressively for internal use — but **this site is on a public
   GitHub Pages URL**, and a photograph is not a paraphrase: republishing one is the exposure
   that text never was. Do NOT resolve this by hotlinking or by scraping image search.
   **Use Wikimedia Commons and take only PD or CC-licensed files**, which is not a compromise
   here — most of this fleet is pre-1929 and genuinely public domain (Titanic, Great Eastern,
   Preussen, Dreadnought, Wyoming, Yamato), and the modern ones (container ship, carrier, USV)
   have CC-BY or CC0 files. Build `build/fetch_images.py` on the pattern already used for the
   HDRIs: fetch by Commons file title through the API, record licence, author and source URL in
   `web/data/ASSETS.json`, write to `web/data/assets/ships/`, and **render the credit line in the
   card** — the credit is a requirement of the licence, not a nicety. Check the first-paint
   budget in `build_site.py` before adding 25 photographs to it.
2. **Voyage and era cards, richer (item 5).** Aim at a museum label rather than a Wikipedia dump:
   the card already has `rows` (the record) and `cite`. What is missing is a picture, a route
   diagram, and two or three more paragraphs of context. The prose pipeline now renders markdown
   emphasis, so the copy can carry it.
3. **The tone pass (item 7)** — engaged but objective and balanced — is a read of every `text`
   field in `vessels.json`, `chapters.json`, `voyages.json` and `battles.json`. The era ledes are
   done as the worked example of the register wanted. The slave-ship and empire copy is where
   balance matters most and where it is currently best; the punchiness to remove is mostly in the
   vessel blurbs.
4. Then back to the ship-model survey queue: the steel stern quarter as a class, and the
   serif-webfont dependency decision that closes the `globe-default` false-RED.

---

## Round 42 — 2026-08-07 — Wyoming: the record's six-master, and four class fixes she surfaced

**Back on the round-23 survey queue.** Carrier, container, yamato, titanic, great-eastern and
dreadnought were done; **wyoming (1118 tris/m, 164 meshes) was next.** She was six poles with
six gaff sails on a bare hull: no bowsprit on a ship whose 140 m LOA against 110 m on deck IS
the head and spanker overhang, no topmasts and none of her 22 sails beyond the six lowers, no
deckhouses on a type whose crew lived entirely on deck, and `bowsprit: 0.0` in the data. Now:
fidded topmasts (white lower, black upper) with six jib-headed topsails, five headsails on a
near-level spike bowsprit held down by bobstays, spring stays masthead to masthead, fore and
after deckhouses with the wheel abaft the after house, and the spanker boom standing out over
the counter. 1199 tris/m, 231 meshes, nothing floating; audit 25/25.

### Every fault generalised — the four class fixes

1. **The aftermost gaff boom collapsed to its floor, fleet-wide.** The boom clamp's fallback
   obstruction for a mast with none astern was `0.5 + 0.06` — a station just abaft MIDSHIPS —
   so gapAft went negative on any mast aft of it and the boom fell to `lower * 0.16`. Measured
   on Wyoming: booms [12.9, 12.9, 12.0, 12.0, 12.0, **6.7**] — the spanker, the one boom the
   comment two lines down says may overhang the stern, was the shortest spar on the ship. Now
   `obstruct = 1.04` past the stern; her spanker draws 17.2 m. Great Eastern's spanker grew the
   same way, which is one of the two reasons her frame moved.
2. **Every gaff and settee quad wore a SLIT below the peak.** The quadrilateral was two
   makeTriSail triangles sharing the tack→peak diagonal, and the corner-crease/scallop noise
   scales with each triangle's own luff — the two luffs differ, so the shared edge carried two
   different z values and the cloth hung open along it. Visible on every gaff sail in the spin
   captures once you look. `makeQuadSail` (one parameterisation over the whole cloth, luff and
   head laced hard, leech free with the twist growing aloft) replaces the pair for gaff and
   settee both; the dhow's frame moved for this reason alone and looks right.
3. **The card's "deck to truck" silently carried the freeboard.** `rigTop` is the bounding box
   over the WATERLINE; the label says deck. Wyoming's card read 46.8 m over a 42 m mast —
   matching the record by accident, wrong twice. Both labels ("Rig, deck to truck" and "Air
   draught, above deck") now subtract the freeboard; every masted card's digit moved a few
   metres toward honest, which is the small third patch in the titanic/dhow/GE diffs.
4. **A schooner's stay web is not a square-rigger's.** mastTops was square-only, so gaff ships
   had no stays at all; and the square rig's deck-anchored forestay would pass through the gaff
   sail standing in that gap, its standing backstay through its own boom's arc. Gaff mastheads
   now register and get SPRING STAYS masthead to masthead — the near-horizontal line that ties
   the whole rig together in every six-master photograph — and no backstays, which were never
   rigged there. The headsail stays are the foremast's forestays, drawn from the same two
   points as each sail's luff so stay and sail cannot come adrift.

**Record-driven, not implied:** the gaff topsail is gated on `topsail` per mast, NOT on the
topmast — Great Eastern's reference model shows her six topmasts standing BARE, and she keeps
them bare while Wyoming's record (22 sails) sets six. New data grammar this round:
`headsails: n`, `deckhouses: [{a,b,hM,wF}]`, `helmAt`, and `topmast`/`topsail` per mast.

### Audit: 4 new rules, all proven by break-and-restore

(1) spanker not the shortest boom (skipped when funnels legitimately clamp it) — proven by
moving mast 6 to u=0.99: fires at 5.4 m vs 20.8; (2) declared headsails drawn forward of the
foremast — proven by deleting the bowsprit with the suit still declared: "5 in the record, 0
drawn" (⚠ mutating `headsails` itself cannot fire it — builder and audit read the same record);
(3) declared topsail flies above 0.75·lower at its own mast — proven by dropping the topmast;
(4) deckhouses at the record's count, on the deck, inside the rail, and the wheel on the sheer
— proven with wF=2.0: "reaches 12.2 m off centre, hull side 6.0 m". All 25 hulls pass clean.

### Frames

Two NEW baselines for the vessel (`ship-wyoming`, `aboard-wyoming` — era 6, `f=wyomingvoy`),
plus `aboard-cable` accepted, which a previous round added to frames.json and left with no
committed baseline. Three moved, every one classified and logged: ship-dhow 3.34% (the settee
cloth), ship-great-eastern 2.09% (quads + spanker + card digit; hull/funnels/paddle untouched),
ship-titanic 0.13% (card digit + a neighbour's rig at the frame edge).

**Rule 0 check, written:** the frame reads as a rendered world. Three facts off ship-wyoming:
six identical gaff sails carrying jib-headed topsails on fidded topmasts, white below the
doubling and black above; a suit of five jibs running from a near-level spike bowsprit up the
foremast; a long white after house with a row of lights, and the spanker boom standing out
past the counter.

⚠ **`build/fetch_images.py` sits UNTRACKED in the tree** — another session's start on the
round-41 images item (Commons fetch with licence capture, 159 lines, no assets fetched yet).
Not mine, not verified, deliberately not committed with this round; whoever owns the images
item should pick it up or bin it.

### Next, in order
1. **preussen (1248 tris/m)** — next on the survey queue. Round 32 also left "preussen P-liner
   white waterline check" pending.
2. Then **steamer (1713)**, **treasure-ship (2011)**.
3. The standing carried items: serif-webfont dependency decision (globe-default false-RED
   class); the Sea's featureless brown land behind aboard-yamato; Titanic remainder; August's
   items 5–7 (images/cards/tone), which are a project not a round.

**End-of-round deploy note: LIVE, stamp 1786095030.** Fifth clean push-triggered deploy in a
row: the push of 6227b4a created run 31168030167, completed success, live stamp verified
1786083736 → **1786095030** with a cache-busted fetch of the data-version meta tag.

---

## Round 43 — 2026-08-07 — The plates: item 6 shipped, from another session's stranded work

**Not the queue item, and here is why.** Round 42 flagged `build/fetch_images.py` as untracked.
What the tree actually held by this round's start was the whole of item 6 implemented and
abandoned mid-verification — 22 Commons photographs fetched, `plates.json` and the ASSETS
licence book written, card wiring in `app.js`/`shipwright.js`, the panel bounded — last touched
02:58, the session dead and its loop lock cleared stale at 04:37. Unverified work sitting in
every file the frame ratchet renders blocks clean attribution of ANY model change, so the round
was: verify it, own it, ship it, and write the Preussen survey for next round. Binning a
licence-clean implementation of a queued item would have been waste.

**What it is.** `build/fetch_images.py` fetches by Commons file title: the 1280 px thumbnail
(never the 40 MB original), with licence, artist and credit captured **in the same API call**,
written to `web/data/assets/ASSETS.json` (the licence book), from which `web/data/plates.json`
(the runtime manifest: caption, credit, licence) is rebuilt every run so the two cannot drift.
`showCard` and `swFillCard` render the plate above the prose with the credit line, escaped, and
a graceful no-plate fallback. The Shipwright left panel is now bounded and scrolls — with the
long accounts it previously grew past the window and cut off mid-sentence. Where no photograph
can exist the plate declares itself: the fluyt is the Beerstraaten painting ("no fluyt
survives"), the treasure ship a museum model ("her true size is contested"), the slave ship the
Brookes stowage diagram ("published by abolitionists as evidence").

**Verified, not assumed:**
- Manifest ↔ files 1:1 (22/22); every plate credited and licensed: 13 PD, 3 CC BY-SA 4.0,
  1 × 3.0, 2 × 2.0, 2 Attribution, 1 CC0. Licence strings came from Commons extmetadata at
  fetch time, recorded in the book.
- **Looked at:** the `shipwright` and `ship-preussen` frames full-size (plate renders,
  letterboxed, correct ship); the fluyt/slave-ship/treasure-ship JPGs against their captions;
  all 14 diff images individually. Every diff is the card panel only — model, sea, fleet strip
  untouched in all 14.
- Audit 25/25 clean with the work in the tree. First paint 8.45 MB of 8.6 — plates are lazy,
  outside first paint, 6.8 MB on disk.
- Frame ratchet run twice. 14 movers, percentages identical across runs (deterministic), each
  accepted with its own logged reason. Two frames (`globe-steam` 0.05%-ish, `action`) flagged in
  the FIRST heavy run only and proved **transients**: re-captured in isolation they are
  pixel-identical twice over and pass against the committed baseline. The class: distant-ship
  glyphs (the Armada line, a globe marker) shimmer a hair under machine load. Not accepted.

**Rule 0, written:** the shipwright frame reads as a rendered world. Three facts off it: the
74's double gun-deck checker with her ports drawn; the photograph of Victory at Portsmouth
above four paragraphs of her account; the fleet drawn up behind at true relative scale, the
East Indiaman's stern towards us. (And a fourth, the honest one: Preussen's card photograph
now stands beside a model wearing a tenth of her canvas — the plate makes the survey queue's
case better than any audit number.)

**Gaps left, deliberately, in the images item:**
1. `ERA_PLATE` maps 'Reed & plank' → `corbita`, a plate that was never fetched — that era card
   silently shows no image. Fetch a corbita/Roman-merchantman plate or re-key it.
2. No plates for dugout, dhow, cog (no Commons title chosen). Card falls back cleanly.
3. Era and voyage cards render plates live but NO baseline frame captures either (era cards
   show only on click; the aboard frames show the readout panel, not the prose card). Same
   `showCard` path as the vessel cards, which are captured. A `globe-era-card` frame would
   close this.

### Preussen, surveyed for round 44 (from this round's ship-preussen frame)

She is next (1248 tris/m) and the frame says why: **five masts carrying scattered rags where
the record puts a wall.** Specifically:
1. **The builder has no double-sail grammar.** Her 30 square sails hang six to a mast — course,
   lower+upper topsail, lower+upper topgallant, royal — on six yards. The model draws one sail
   per fidded segment (`only: 3` → three cloths), so the rig is one-third present, with
   two-storey holes between tiers. CLASS fix: every post-1850 square rigger (clipper too —
   double topsails) needs a per-mast yard list, not a segment count.
2. **No fore-and-aft canvas at all:** her record is 47 sails = 30 square + 12 staysails +
   4 jibs + 1 gaff spanker on the jigger. Wyoming's round built the `headsails` grammar and
   gaff stack — reuse both; mast-to-mast staysails are new grammar.
3. **`bowsprit: 0.1`** — near-invisible, on a ship with a full spike bowsprit carrying 4 jibs.
4. **P-liner livery check (pending since r32):** model shows black over anti-fouling red with
   no white line; Laeisz ships carried the white boot-topping band at the waterline.
5. **The polar is a copy-paste class fault:** preussen, clipper and ship-of-the-line share one
   polar (beat 80/95, curve max 5.8) — her own card row says 20.5 kn, so the card is wrong
   twice on one panel. Data work, not geometry; scope it separately.

### Next, in order
1. **preussen** (the survey above — do the rig grammar as the class fix).
2. Then **steamer (1713)**, **treasure-ship (2011)**.
3. Carried: serif-webfont decision (globe-default false-RED class); featureless brown land
   behind aboard-yamato; Titanic remainder; items 5 & 7 (voyage/era card enrichment, tone pass).

**Post-deploy fix, same round:** Preussen's live credit line read "Unknown authorUnknown
author" — Commons wraps unknown authors in two spans and fetch_images.py's tag-strip glued the
copies. Class fix (`undouble` in the script's extraction) plus the one data instance, in the
book and the manifest both.

**End-of-round deploy note: LIVE, stamp is in the r43 deploy-note commit.** Sixth and seventh
clean push-triggered deploys in a row (the plates commit, then this fix).

---

## Round 44 — 2026-08-07 — Preussen: the record's 47 sails, from a stranded tree

**The queue item, found built and stranded.** The tree at round start held the whole Preussen
rig implemented by an earlier session that died waiting on its ratchet run — three successive
rounds started, said "standing by for the ratchet report", and terminated with nothing landed.
The lesson is in the log: **ending the turn to wait on a harness-tracked background task ends
the round**; the fourth session waited on the ratchet PID in a foreground until-loop and the
round completed. This round verified the stranded work independently, ran the ratchet to the
end, classified, and shipped it.

**What the work is.** One class fix and its dependents, all data-gated on the record:
1. **Per-mast yard lists** (`yards: ["course","ltop","utop","ltg","utg","royal"]`) replace the
   one-sail-per-fidded-segment ceiling. `crossYard` factored out so the three-tier and listed
   paths build the identical spar; the PLAN table also carries `top`/`tg` for a pre-Howes list
   and the clipper's single topgallant over double topsails — the next square rigger is data.
2. **Mast-to-mast staysails** (`staysails: n` on the after mast) — luff IS the stay, drawn
   from the same two points; twelve in her four gaps.
3. **The full-rigger's spanker** (`spanker: true` on a square mast) reuses the gaff block with
   the throat at 0.55 of the lower mast, where the P-liner photographs put it.
4. **Jib stays climb to the fore topmast head** on a square foremast (they capped at 0.94 of
   the LOWER mast — four jibs squashed into the bottom quarter of a 45 m foremast).
5. **Boot-topping band** as data-declared shader livery (`boot: "#e2ddd3"`, uBoot/uBootOn in
   HULL_FRAG) — black over white over red, the Flying-P silhouette; closes the r32 check.
   Sail arithmetic closes: 30 square + 12 staysails + 4 jibs + 1 spanker = her record's 47.

**Verified this round, not carried on trust:** shaders compile; bundle re-run byte-identical
(md5 unchanged); audit copies identical in Research/, web/, docs/; audit **25/25 clean** with
the three new rig rules (yard census per station, staysail census per gap, spanker quad abaft
its mast); served page confirmed to be the working tree (two servers sit on :8149 — pid 3134
serves web/ and answers localhost first; the root-serving IPv6 one is a standing hazard).

**Frames.** Full ratchet run: **one mover, ship-preussen 21.081%**, diff read full-size —
every moved pixel is the vessel, her water, her card digits and her fleet thumbnail; all
panels black, no neighbour moved. Accepted, reason in FRAME-LOG. New `aboard-preussen`
baseline committed; my fresh capture matched the stranded session's at **0.000%**, which is
determinism proven across two sessions. No transients this run (r43's globe-steam/action
shimmer did not recur).

**Rule 0, written:** ship-preussen reads as a rendered world. Three facts off it: six yards
crossed on every one of five masts with the canvas walling the gaps the crew could not have
worked; the staysail staircase threading each gap and four jibs running to the fore topmast
head; the white boot-topping line between black topside and red anti-fouling. (Honest fourth:
her card still says 5.8 kn best speed — the shared-polar fault, r43's survey, still scoped
separately as data work.)

### Next, in order
1. **steamer (1713 tris/m)** — next on the survey queue.
2. Then **treasure-ship (2011)**.
3. **Preussen polar** — she shares beat 80/95 / max 5.8 kn with clipper and ship-of-the-line;
   her card row says 20.5 kn. Data work, one polar per vessel class at least.
4. Carried: serif-webfont decision (globe-default false-RED class); featureless brown land
   behind aboard-yamato; Titanic remainder; items 5 & 7 (voyage/era card enrichment, tone
   pass); r43's plate gaps (corbita era plate; dugout/dhow/cog plates; a globe-era-card frame).

**End-of-round deploy note: LIVE, stamp 1786104587 → 1786115031**, verified with a
cache-busted fetch of the data-version meta tag. Eighth clean push-triggered deploy in a row.

---

## Round 45 — 2026-08-07 — The steamer: an 1870 barque-rigged liner from the record, and two class faults every metal ship carried

**The queue item: steamer (1713 tris/m).** The survey (12 spin bearings, before) found her
carrying two scattered cloths per mast under bare poles (the pre-r44 ceiling), a Mediterranean
lateen on the mizzen of a Victorian steamer, a near-invisible bowsprit with nothing on it, a
full-length two-tier liner house (1900s shape on an 1870 hull), and 10.6 m anchors laid across
the forecastle beside a pale timber beakhead.

**The record.** Oceanic (1871) — the type-defining 1870s liner, one funnel, four masts — was
rigged a **four-masted barque**: square on three masts, fore-and-aft on the jigger. So the
existing mast structure was right and only the grammar was missing; all of it now exists as
data from r42/r44:
1. Square masts get `yards: ["course","ltop","utop","tg"]` — Howes double topsails, universal
   on new builds by 1870, single topgallant. Twelve square cloths where six rags hung.
2. The lateen became `rig: "gaff", topmast: true, topsail: true` — the jigger spanker and gaff
   topsail. Deck-to-truck self-measured 38.3 → 44.8 m on the card.
3. `staysails: 2` in each square-square gap; `headsails: 3` on a real bowsprit (0.12, steeve
   12). The staysail grammar needs square masts both ends — the mizzen–jigger gap stays empty,
   which is restraint, not omission.
4. `houseAt: [0.28, 0.66]` — the midship bridge structure with the funnel at its forward end,
   open decks fore and aft.

**Two CLASS faults found by looking, fixed at the class:**
- **Anchors scaled with the hull forever** (`shank = L * 0.115`, calibrated on a 74). Real
  anchors stopped growing when hulls did not — Titanic's centre anchor, the largest ever
  hand-forged, is 5.7 m over all on 269 m of ship. The law now saturates past L=48
  (`min(L,48)*0.115 + max(0,L-48)*0.004`); Preussen's 17 m monsters, Wyoming's 15 m and the
  steamer's 10.6 m all came down to forge size. New audit rule: no anchor spans over 8.5 m.
- **Every hull with a bowsprit got a wooden beakhead and headrails** — 18th-century timber
  head on iron ships. `buildHead` is now gated on `S.iron`; Preussen and the steamer lost the
  timber head, Wyoming (wooden) keeps hers.

**The audit was wrong a fifth time**, and the fix is in the file: the staysail census gated on
mast stations at `(at−0.5)·lwl` while the builder adds the hull's own rake shift — a drawn,
correct staysail sat 6 cm outside a fixed 0.8 m gate. The gate now scales with the hull
(`lwl*0.03`) and asks the sail's KIND (`tri`), because once the gate admits rake it admits a
raked mast's own narrow upper squares too. Audit **25/25 clean** with the anchor rule added.

**Frames.** Full ratchet: **five movers, all classified, all accepted with logged reasons** —
ship-steamer 25.8% (the rebuild itself, plus neighbours shifted by the grown hull extent),
aboard 2.2% (same hull in the Great Western close-up, vessel-only), shipwright 1.3% (steamer at
frame edge + forge-capped anchors along the line), ship-preussen 0.07% and ship-wyoming 0.06%
(bows only: anchors, and Preussen's timber head gone). Verification ratchet re-run after the
accepts.

**Rule 0, written:** ship-steamer reads as a rendered world. Three facts off it: a black iron
hull with gold cove line and porthole rows under a buff black-topped funnel; three square masts
each crossing course, double topsails and topgallant, with staysails threading the gaps and
three jibs running to the fore topmast head; white boats and red cowl ventilators on a midship
deckhouse with open decks fore and aft. (Honest fourth: her card says 12.3 kn service speed
over a polar whose curve tops at 9.6 — the shared-polar class fault again, still scoped as
separate data work.)

### Next, in order
1. **treasure-ship (2011 tris/m)** — next on the survey queue.
2. **Polars, one per vessel class** — steamer card says 12.3 kn over a 9.6 kn curve; Preussen
   says 20.5 over 5.8 shared with clipper and ship-of-the-line. One data round closes both.
3. Carried: serif-webfont decision (globe-default false-RED class); featureless brown land
   behind aboard-yamato; Titanic remainder; items 5 & 7 (voyage/era card enrichment, tone
   pass); r43's plate gaps (corbita era plate; dugout/dhow/cog plates; a globe-era-card frame).

**End-of-round deploy note: LIVE, stamp 1786115031 → 1786117132**, verified with a
cache-busted fetch of the data-version meta tag. Ninth clean push-triggered deploy in a row.
The globe-default 1.016% mover in the verification ratchet proved a TRANSIENT (the documented
serif-webfont label-halo class): isolated re-capture passed twice against the committed
baseline. Not accepted; the webfont decision stays carried.

---

## Round 46 — 2026-08-07 — The treasure ship: Reddish's numbers finally drawn as the fan they describe, and the bulkhead hull given its own ends

**First, the unlogged round between 45 and this one.** Commit 4b59b05 (09:28) closed carried
items 5 and 7 — the card now measures its own track (great-circle sum over the waypoints,
labelled "in this model"; Fuzhou tea race 13,756 nm against ~14,000 actual) and four posed
card lines became descriptive. It was pushed but never verified live and left no HANDOFF
entry. Verified this round: its stamp **1786119344 confirmed live** by cache-busted fetch
before this round's build. Tenth clean deploy, verified late.

**The queue item: treasure-ship (2011 tris/m) — the LAST item on the round-23 crudest-first
table.** The survey (12 spin bearings, before) found: five white RECTANGLES for sails — the
code cited Reddish's measured junk proportions and then drew parallel battens under a level
head, which is a square rig's silhouette; a sharp European yacht bow on a hull whose own
stage card says "bulkheads, then planking"; open uncapped shell ends past the stem timbers;
a door-sized rudder invisible from every bearing; no aft castle; and a rig with no running
rigging at all — no sheets, no halyards, on the one rig famous for being worked entirely
from the deck.

**The record, and what it forced:**
1. **Reddish's numbers describe a FAN.** Boom and battens equal within 5%, luff and yard
   two-thirds of the boom, leech 1.75 booms: those close only if the yard stands steep
   (~60°) and the battens swing up progressively to meet it — the high-peaked profile in
   the card's own reference photograph. The junk branch now lays the spars first (boom,
   five battens fanned by `THB·(k/nb)^1.4`, yard at 60°) and cuts the cloth to them, one
   quad panel per pair of spars, from the SAME endpoint arrays — spar and canvas cannot
   disagree. Straight-line leech lands at 1.6 booms; Reddish's 1.75 is measured along
   roached panel edges we do not cut, and the comment says so.
2. **Sheets and halyard drawn** — a sheetlet to every batten end gathered to a crowfoot
   (clamped by `gapAft` so the aftermost sail cannot sheet to a point past the taffrail),
   halyard from the yard's slings to the masthead, both living in the sail's own group so
   they swing with it. New PARTS entries: sheet, halyard.
3. **A bulkhead hull ends in bulkheads** (class, both junks): `buildJunkEnds` lofts bow and
   stern transom caps from the hull's own end sections at u=0.002/0.998; stem and sternpost
   are gated off for `build: "bulkhead"`. Fineness raised in DATA (treasure 0.40/0.52, junk
   0.36/0.46) — the bluntness is the ship's own lines, not a formula change, so no other
   hull moved. New PARTS: bowtransom, sterntransom.
4. **The median rudder at the record's scale** — the Longjiang yard's own ground gave an
   11.07 m rudder post. `buildRudderGeometry` grew a bulkhead branch: chord 9.5% of lwl,
   stock standing up the transom notch, foot at 1.25× draught BELOW the bottom, because
   lowered it is the leeway board of a keel-less hull. The prism builder was generalised to
   N points (the 4-point index table it replaces falls out as the N=4 case). The audit's
   below-the-keel rule gets ONE documented exemption: the junk rudder drawn lowered; she
   dry-docks with it raised in its trunk, which is what tackles-in-a-trunk are FOR. The
   rudder.what text now also carries the Han-era precedence (pottery models, 1st c. CE).
5. **The aft castle from the record** (`poop: [from, to, tiers]` — treasure 2 tiers, junk
   1): walls lofted off the hull's own half-breadth and sheer, each tier stepped inboard,
   roofs carried out past the walls, lattice openings at their own stations. And the rig
   reads the castle from the SAME data: masts inside the poop span raise their sail foot
   over it and shrink the fan to the hoist left below the truck — the record's small jigger
   over the poop — and the crowfoot lands ON the roof, where the after sheets were worked.

**Found while finishing, fixed at the source:** the audit's part-contact rule caught the
new rudder floating 0.6 m clear of the transom (bbox gap) — the blade's leading edge now
rides at 2% chord off the stern surface, in its trunk, which is also where the real one
lived. The audit was RIGHT this time (its record stands at five wrong calls, this was not
a sixth). Three new audit rules: bulkhead ends (caps exist, backbone absent), junk spar
census (7 per mast — boom, five battens, yard), junk rudder (chord ≥5.5% lwl, foot below
the bottom). Audit **25/25 clean**; copies verified identical in Research/, web/, docs/.

**Frames.** Full ratchet: **two movers, both classified from full-size diffs, both
accepted with logged reasons** — ship-junk 20.466% (the rebuild itself: both junks carry
every class fix; her water and card move with her, panels black), ship-dhow 0.494% (the
rebuilt junk's fan poking into the dhow frame's left edge — the r45 steamer-at-frame-edge
class; no dhow pixels moved). **Two NEW baselines committed: ship-treasure,
aboard-treasure** (Zheng He outbound, e=4&f=zhenghe — ⚠ era 3 leaves the app waiting
forever and __FRAME_READY never fires; the frame note carries the warning). Shipwright
frame did NOT move: the default vessel is neither junk, and neither stands in its frame.
Verification ratchet re-run after the accepts: see deploy note below.

**Rule 0, written:** ship-treasure reads as a rendered world. Three facts off it: five
battened lugsails fanned to steep yards, each worked by a sheetlet crowfoot led to the
deck; a hull that ends square at both ends with no stem, its quarters carried up into a
two-tier latticed castle with overhanging roofs; the great median rudder slung below the
stern transom, reaching under the bottom. (Honest fourth: her card still shares the junk
polar curve with the 34 m coaster — 4.9 kn best on both — the shared-polar class fault,
scoped as the next round's data work.)

**Data also touched:** the duplicate "Scholarly range" row label on her card became "By
scholar" for the per-author estimates.

### Next, in order
1. **Polars, one per vessel class** — the round-23 crudest-first queue is DONE (treasure
   ship was its last row; the sailing ships below 2,600–15,000 tris/m are the best-served
   end). The standing card fault is now the loudest: steamer says 12.3 kn over a 9.6 kn
   curve, Preussen 20.5 over 5.8 shared with clipper and ship-of-the-line, treasure ship
   and coastal junk share one junk curve. One data round, one polar per class, closes the
   whole class.
2. Carried: serif-webfont decision (globe-default false-RED class); featureless brown land
   behind aboard-yamato; Titanic remainder; r43's plate gaps (corbita era plate;
   dugout/dhow/cog plates; a globe-era-card frame).
3. Worth a look someday: asking for a voyage in the wrong era (#e=3&f=zhenghe) hangs the
   app with __FRAME_READY never set — a wrong-hash page should still paint.

**End-of-round deploy note: LIVE, stamp 1786119344 → 1786123059**, verified with a
cache-busted fetch of the data-version meta tag. Eleventh clean push-triggered deploy in a
row (the tenth was the unlogged 4b59b05 round, verified late, above). Verification ratchet
after the accepts: **all 36 frames within tolerance, no transients this run** — and the two
new baselines re-captured at 0.000%, so the treasure-ship and aboard-treasure frames are
deterministic from birth.

---

## Round 47 — 2026-08-07 — Every vessel gets her own polar, and the card stops contradicting the router

**This round inherited an uncommitted tree.** Two sessions (10:59 and 11:36 starts) did the
polar derivation and died before verifying it — the second while the ratchet was still
capturing, leaving seven modified files, two new Research files, and no commit. Everything
below was verified from scratch this session before being trusted: audit re-run, every diff
read, every moved frame classified from its image, both new Research files read against the
data they claim to describe.

**The queue item: one polar per vessel class — the shared-polar card fault, carried since
the steamer round.** Until now 25 vessels shared 8 curves; the card printed Preussen's
20.5 kn over the corbita's 5.8-kn curve and Yamato's 27 over a shared 9.6. The structure of
the fix (Research/POLARS.md has the table, Research/polars.py the derivation, and the
derivation **reruns byte-identical** against the shipped vessels.json):

1. **Shape is the rig's, scale is the vessel's.** Each rig's researched angular curve,
   normalized, times a per-vessel `max8` anchored to a figure from the vessel's own record,
   named in `polar.anchor {kn, kind, source}` — and `kind` matters, because route.js
   saturates sail curves at 1.55× reference: a logged **burst** anchors the ceiling
   (Preussen 20.5/1.55 → 13.2), a **passage** must fit under it, an **engine's** curve IS
   its at-sea speed, unscaled.
2. **Great Eastern is an engine at last** — she routed as a pure gaff schooner that could
   not sail within 55° of the wind, a steamer with a 7.3 m screw and 17 m paddles. Beat
   0/0, speedKn 14, routes at 12. The USV's rig label said "diesel motorship" against a
   card reading no canvas — now "wind, wave and solar", at her real 4 kn, not the
   phantom 16.
3. **The engine card stops printing beat angles.** Titanic's card once read "closest made
   good, light airs: 0°" — a beat angle on a turbine liner. An engine card now carries the
   record's speed AND the speed the router crosses oceans at, labeled as what each is
   ("12.25 kn trial" beside "10.0 kn at sea, in the model — the router uses this").
4. **The east-indiaman curve is pinned byte-for-byte** — the front page's 119-day
   falsification test rides on it; polars.py asserts it.
5. **Six audit rules** in the polar block: anchor present; engine curve equals its anchor;
   engine curve vs card speedKn (the steamer fault); burst at the 1.55× ceiling; passage
   under the ceiling and the curve under twice its record; no two vessels byte-share a
   curve. All six tested against the live page.

**Found while verifying, fixed at the class: the prose shared curves too.** The dugout
carried the trireme's whole rigNote — "8.3 kn sprint", Olympias's own measured figure, on
a logboat anchored at 3.0 kn — and the shared-curve rule cannot see text. Her note now
states her own record (Kaifu's Sugime crossing: 225 km of Kuroshio in 45 h ≈ 3 kn, the
same figure her card rows already carried), her rig reads "paddles" (the model draws no
mast, and none is attested this early), and a **seventh rule** holds every rigNote's stated
speeds under that hull's own 1.55× ceiling. Run against the faulty data it fired exactly
once, on the dugout, and passed the trireme, whose record it is. Audit **25/25 clean**
after the fix, copies verified identical in Research/, web/, docs/.

**Also set right:** POLARS.md claimed the oar-floor wind-scaling gap was "logged in
MODEL-GAPS" — it was not. It is now B9 (the muscle floor sits in a sail curve, so route.js
slows the paddlers in a calm; a router change, not a data change). And MODEL-GAPS B1
("vessel hulls are not drawn at all") is marked superseded by rounds 24–46 — it described
a world three eras of work ago.

**Frames: 20 movers, all classified from their full-size diffs, 30 baselines accepted with
logged reasons.** Three classes: (a) the eight engine shipwright cards, 1.2–3.8% — the new
card rows and the reference photo reflowed under them; (b) ten aboard/sea scenes plus
map-floor, 1.2–56.6% — **each vessel stands elsewhere on her track at the frozen instant
now her polar is her own** (aboard-wyoming's readout moved 42°01′N 70°22′W → 42°02′N
70°20′W, course 098→082; the trireme rides off Cape Malea at her own 5.4 kn); (c)
globe-default 0.057% — era-0 route markers repositioned, dugout slower, canoe faster; NOT
the webfont transient this time, the diff shows markers, not label halos. Eight sailing
shipwright cards moved sub-threshold (~0.03%, the "best speed, moderate breeze" label and
the vessel's own number) and were accepted anyway to keep the baselines exact.

**Rule 0, written:** ship-great-eastern reads as a rendered world. Three facts off it: a
black iron hull pierced by a long row of portholes, driven by a midship paddle wheel under
a fan of radial floats; six masts of fore-and-aft canvas standing between buff, black-capped
funnels; a card that holds 14.0 kn service speed beside 12.0 kn at sea in the model, 0°
closest made good — straight upwind, under power. (Honest fourth: her paddling ancestors
still wind-scale — B9 — so a calm slows the dugout's crew, which is the loudest wrongness
the polars leave behind.)

### Next, in order
1. **B9, the oar floor** — give the polar a wind-independent floor term the router does not
   scale. The dugout and trireme are the class; the fix is in route.js, not the data.
2. Carried: serif-webfont decision (globe-default false-RED class — note this round's
   globe-default mover was real and accepted); featureless brown land behind aboard-yamato;
   Titanic remainder; r43's plate gaps (corbita era plate; dugout/dhow/cog plates; a
   globe-era-card frame); wrong-era voyage hash (#e=3&f=zhenghe) hangs before first paint.

**End-of-round deploy note (written by the r48 session, which inherited this round
uncommitted): LIVE, stamp 1786123059 → 1786129104**, verified with a cache-busted fetch of
the data-version meta tag. The r47 sessions died before committing; the r48 session
re-verified everything from scratch — audit re-run 25/25, full ratchet re-run **all 36
frames 0.000–0.007%, within tolerance** — then committed (6b9c3e5) and pushed. Twelfth
clean push-triggered deploy in a row.

---

## Round 48 — 2026-08-07 — Muscle is not a sail: the oar floor, and the beat-angle compensator it exposed

**This round also inherited an uncommitted tree.** The 12:12 session implemented B9
completely — data, router, card, four audit rules, stamp — and was killed at 12:35 while
the frame ratchet was still capturing. Everything was re-verified from scratch this
session before being trusted: every diff read, copies confirmed identical across
Research/, web/, docs/; `polars.py` rerun byte-stable; audit re-run **25/25 clean**; all
four new floor rules re-fired exactly once each on faults injected in-page (mutating
`APP.vessels` before eval'ing the audit — no data files touched); and the router measured
old-formula-vs-new through the page's own `compilePolar`/`polarSpeed` at 96 (vessel, wind,
angle) points.

**The queue item: B9, the oar floor.** `polar.floor {kn, lossKnPerMs, source}` is thrust
`route.js` never wind-scales, less a measured windage per m/s of head component (cosine
forward of the beam, zero abaft — precompiled into the polar like everything else the
inner loop touches). `polarSpeed` returns max(sail, muscle), the floor ignores the beat
gate, and windage only ever subtracts — the fair-wind help is already in the curve.
Measured: the trireme holds 5.4 kn in a calm at every heading (was 0–1.1), makes
Olympias's own 2.9 dead upwind at the 8 m/s reference, and her sail still wins when a
fresh wind serves. Sail vessels and engines byte-identical in behaviour at every sampled
point. Trireme 5.4/0.31 from Olympias's measured pair; dugout 3.0 from the Kuroshio
crossing, windage inherited fractionally from Olympias and stated as an inference in the
data. Cards: beat rows labelled "under sail", plus two floor rows ("under oar, any
heading — a calm does not slow her" / "made good dead upwind, fresh breeze — windage,
not a beat limit"), verified by capture on both vessels.

**Found while verifying, fixed at the class: the two muscled hulls carried beat angles of
30/45 — pointing tighter than a modern sloop, while every real rig family carries its
researched pair (square 80/95, lateen 72/84, junk 62/70, gaff 55/68, crab claw 75/82).**
The pair was a compensator from before the floor existed: impossible pointing was the only
way an oared hull could make windward ground, and the moment the r48 card printed
"closest made good **under sail**: 30°" it became a stated falsehood — the router
measurement showed the trireme making 5.7 kn to windward *under sail* in a near-gale. Now
the floor does the upwind work, the pair is the rig's own: trireme 80/95 (her single
square sail is the ancient-square class, the corbita's pair; Olympias's sail trials found
her windward ability poor), dugout 90/105 (the undrawn fair-wind mat sail claims nothing
to windward). The two fixes need each other — honest beat angles without the floor strand
the galley at 0 kn upwind; the floor without honest beat angles keeps the card lying.
**Two more audit rules** (six this round): every sailing hull's beat pair must equal its
rig family's researched pair (fired exactly twice on the faulty data, on exactly the two
hulls), and a rig outside the family table is itself a finding. Derivation recorded in
`polars.py` (`BEAT`, applied beside `FLOOR`), reruns byte-stable.

**Latent, logged, not fixed:** `battle.js` wind-scales its speeds too
(`btPolarSpeed(...) * (0.55 + force·0.09)`) — the same B9 class in a second consumer —
but only the Armada carries a playable campaign and both its fleets (carrack, fluyt) are
sail, so no muscled hull is paced by it today. If a galley action (Salamis, Lepanto,
Myeongnyang) ever gets a campaign, it needs the floor first.

**A trap re-armed and cleared:** TWO servers were listening on :8149 again (one from
Aug 2, cwd `web/`; one from Aug 6, `--directory web`). Checked both before capturing —
both serve `web/`, so no stale-root hazard this time, but the r33 lesson stands: check
`lsof` before trusting the port.

**Frames (completed by the fifth session on this round): 36/36 captured, one mover.**
Four consecutive sessions died mid-capture the same way: each backgrounded the ratchet and
ended its turn to wait, and the loop harness kills the round's children when the turn ends.
The fix is procedural and permanent: **run the ratchet in the foreground, frame by frame**
(`check --frame <name>` in batches of nine, ~25 s each) — never background it, never wait
on it. The one mover was ship-trireme, 2.441%, classified from its diff: entirely the card
column — the two floor rows, the beat pair relabeled "under sail" at the rig's own 80/95,
and the reference photo reflowed under them. Hull and sea byte-still. Accepted with reason.
Note the per-frame harness wipes `_current/` each run, so classify a mover **immediately**
after its check, or re-run that frame.

---

## Round 49 — 2026-08-07 — The card prints the rig, not the mesh: a subtitle that denied a sail the rows describe

Found while looking at the new ship-dugout frame (added to the ratchet this round — the
vessel whose data changed had no baseline): her card read "THE FIRST SEA CRAFT · **NO
SAIL**" directly above two "closest made good **under sail**" rows. The subtitle keyed
'no sail' off `hull.masts.length` — the mesh's mast count — so every mastless hull had
its rig text overridden, in both card views (`shipwright.js:578`, `yard.js:108`, the same
expression duplicated). Four hulls printed wrong or lesser lines: the dugout's
contradiction; the USV reading "no sail" a full round after r47 set her label to "wind,
wave and solar" (the fixed data never printed); carrier and container hiding their engine
descriptions.

**The class fix:** one composer, `SHIPS_SW.rigLine(vessel)` — always the polar's own rig,
'no sail' only as the fallback for a hull with no rig at all — used by both views, exported
for the audit. **Two data corrections fell out of making the line print.** The dugout's rig
is now "paddles, with a mat sail for fair winds", naming the sail her beat rows describe
the way the trireme's line names her square sail (the mat sail is Haddon & Hornell's, cited
in her rigNote since r47; still undrawn, still unattested that early — the *text* no longer
denies it). And the carrier's hidden label turned out to be **"diesel motorship" on a
Gerald R. Ford class** — corrected to "nuclear steam, four shafts" (two A1B reactors). Both
set in `polars.py`, which reruns byte-stable.

**Two audit rules** (both in the r49 block of audit-hulls.js): every hull carries a
nonempty `polar.rig`, and `rigLine` run over all 25 must end with it. Fired on injected
faults in-page: blanking an engine's rig → the first rule, exactly once; restoring the old
mast-keyed composer → the second rule on exactly the four mastless hulls, the historical
fault reproduced and caught. Clean run **25/25** after the fix. The yard view's subtitle
node verified returning the corrected line through the same composer.

**Frames: four movers, all classified from their diffs, all accepted with logged reasons.**
ship-dugout 1.187% and ship-container 2.276% — the longer subtitle wraps the header and
shifts every card row one line down, diff entirely card reflow; ship-usv 0.042% and
ship-carrier 0.046% — one-line text swaps, sub-threshold, accepted anyway to keep the
baselines exact (r47 precedent). The ratchet grew 36 → 37 frames: ship-dugout added, first
baseline looked at before committing.

**Rule 0, written:** ship-dugout reads as a rendered world. Three facts a viewer can read
off it: a single hollowed log, sheer-swept at both ends, riding low with a metre of
freeboard amidships; open ocean to the horizon under a clear sky, the swell scaled to
dwarf her; a card that holds 3.0 kn under paddle beside 4.2 kn best under her fair-wind
mat sail, closest made good 90° — beam work only, nothing to windward.

### Next, in order
1. **B9's second consumer** — `battle.js` still wind-scales via
   `btPolarSpeed(...) * (0.55 + force·0.09)`; harmless today (only the Armada campaign is
   playable, both fleets sail) but any galley action (Salamis, Lepanto, Myeongnyang) needs
   the floor first.
2. Carried: serif-webfont decision (globe-default false-RED class); featureless brown land
   behind aboard-yamato; Titanic remainder; r43's plate gaps (corbita era plate;
   dugout/dhow/cog plates; a globe-era-card frame); wrong-era voyage hash
   (#e=3&f=zhenghe) hangs before first paint.

**End-of-round deploy note: LIVE, stamp 1786129104 → 1786137697**, verified with a
cache-busted fetch of the data-version meta tag. Rounds 48 and 49 shipped together in
a839b5a — audit 25/25 with eight new rules across the two rounds, ratchet 37/37 with six
baselines accepted for reasons and one added. Thirteenth clean push-triggered deploy in a
row. The procedural lesson of this round outlives it: the ratchet runs foreground,
frame by frame — four sessions died backgrounding it.

---

## Round 50 — 2026-08-07 — One model of how a ship moves: the battle stops keeping its own

**The queue item: B9's second consumer.** `battle.js` carried its own polar interpolator —
`btPolarSpeed(curve, rel) * (0.55 + force·0.09)` — no beat gate, no oar floor, no engine
rule. Harmless-looking (the only playable campaign is the Armada, both fleets sail), but it
was the r48 fault alive in a second consumer, and its own file header claimed "one model of
how a ship moves, used everywhere." Now that is true by construction: the second model is
DELETED. Each fleet's polar is compiled once at open by route.js's own `compilePolar`, every
frame asks route.js's `polarSpeed` (Beaufort → m/s by the scale's defining v = 0.836·B^1.5,
once per day), and the beat computation moved into its own `polarBeat` in route.js so the
battle's HELM can ask the same gate the speed model enforces: a ship whose direct course
would make no way falls to the nearer beat limb and holds it — what a helmsman with a
station to windward actually does. A hull with a floor or an engine always makes way, so
her helm is never clamped. ⚠ Load order stands: route.js loads AFTER battle.js, so its
globals are touched at runtime only (btOpen and later), never at parse time.

**Measured, old formula vs new, through the page's own functions (192 points, table in
`Research/measure-battle-r50.py` output):** the trireme in a calm made 2.0–2.9 kn under the
old battle model (the wind-scaled crew) and makes 5.4 at every heading now — Olympias's own
cruise; at force 7 dead upwind the old model gave her 4.4 kn (a near-gale on the nose
HELPED her), the new gives 0.6 — the floor less windage. Force 5 head-to-wind: 2.5 kn
against Olympias's measured ~2.9 at the 8 m/s reference. The sail fleets: inside the gate
the old model ghosted a carrack to windward at up to 5.4 kn; new is 0, the router's own
gate; abaft it the shift is −10% to +18% across campaign forces (√wind replacing the linear
force scale). And the battle SAILED: unfrozen, all 40 ships making way on days 0, 3 and 9 —
including Portland, the one NE-wind day, where the helm clamp holds them on the beat limb
instead of stalling head to wind.

**Three audit rules (r50 block), each proven by in-page break-and-restore:** (1) *a calm
does not slow a floored hull through the RUNNING model* — compilePolar + polarSpeed at
0 m/s must return exactly the floor; wrapping polarSpeed with a wind scale fired it on
exactly dugout and trireme. This one would have caught the original B9 and now guards every
consumer at once. (2) *btPolarSpeed stays dead* — redefining it fired once; the likeliest
regression is a revert. (3) *the shared model stays reachable* — compilePolar / polarSpeed /
polarBeat must be page globals; blanking polarBeat fired it, naming the function. The
calm-floor rule is guarded on all three globals, because polarSpeed calls polarBeat and a
missing one would otherwise throw the audit before the rule that names the fault can run.
Clean run 25/25 after each restore. B9 closed in MODEL-GAPS.md with the second consumer.

**Frames: 37/37 within tolerance, zero movers** — the change is behavioral (speeds over
time) and the frozen capture pins dt = 0 over snapped stations, so no picture was owed a
move. Ratchet run foreground, frame by frame, batches of nine (the r48/49 lesson; no
session died this round). Two servers on :8149 again — checked both with lsof before
capturing, both serve web/, no stale-root hazard.

**Rule 0, written:** the action frame reads as a rendered world. Three facts a viewer can
read off it: a fleet strung out hull-down on the horizon at its real 7 km separation, small
because the view is true scale; the long white-flecked swell ranks of a force-6 day fading
into the haze the sky shares; a card holding the record — 30 July 1588, wind WSW force 6,
the Armada holding the weather gauge with the fleets 7.0 km apart.

### Next, in order
1. Carried: serif-webfont decision (globe-default false-RED class); featureless brown land
   behind aboard-yamato; Titanic remainder; r43's plate gaps (corbita era plate;
   dugout/dhow/cog plates; a globe-era-card frame); wrong-era voyage hash (#e=3&f=zhenghe)
   hangs before first paint.
2. A galley action is now UNBLOCKED: Salamis, Lepanto and Myeongnyang have battle cards and
   the floor works at true scale — staging one is a campaign-data task (days, winds,
   ranges from the record), not an engine task.

**End-of-round deploy note: LIVE, stamp 1786137697 → 1786139194**, verified with a
cache-busted fetch of the data-version meta tag; the live battle.js confirmed carrying
compilePolar and zero btPolarSpeed. Fourteenth clean push-triggered deploy in a row.

---

## Round 51 — 2026-08-07 — The clipper is Cutty Sark at last, and the creases learn what a jib is

**The vessel: clipper — the r44 note "the clipper's single topgallant over double topsails —
the next square rigger is data" closed.** She was nine cloths on the old three-tier path
(`only: 3`), no headsails on four bare jib stays, no staysails, no spanker, bare mastheads.
Now, all data, all grammar that already existed: `yards: [course, ltop, utop, tg, royal]` on
each mast (the PLAN's own `tg` entry, written for her in r44, finally used), `headsails: 4`,
`staysails: 3` in each gap, `spanker: true` on the mizzen, the two white deckhouses of every
photograph and the open wheel right aft (`deckhouses`, `helmAt` — Wyoming's r42 grammar).
Survey: 2,628 → 3,024 tris/m, 239 → 294 meshes, nothing floating. Audit 25/25.

**The class fix the first render exposed: every crease term in `makeTriSail` scaled with the
LUFF alone.** Tuned on the lateen's 20–30 m yards, applied to a flying jib on a 45 m stay, the
four wrinkle terms summed to over two metres of crease and the whole head suit hung as laundry —
the clipper made it undeniable, Preussen's committed baseline carries it milder. A crease is
slack, and how much slack a sail carries is what `belly` already states — so the creases now
follow the sail's own set, normalised to the lateen they were tuned on and capped there
(`slack = min(1, belly/0.055)`, hull.js). The controls prove the tuning preserved: ship-dhow
(lateen) and ship-canoe (crab claw) both moved **0.000%**. Six frames moved, every diff read:
all six are tri sailcloth only — jibs, staysails, gaff topsails, on the subject and on
frame-edge neighbours — no hull, no sea, no square canvas. Accepted with reasons.

**The audit's station-gate class struck its sixth and seventh time, and the sixth kills the
class in that rule for good.** Rule 5 (yard census) gated on a fixed radius round
`(at−0.5)·lwl` — no hull rake shift, no allowance for a raked mast carrying its royal 3.4 m
abaft its own foot — and reported the mizzen "5 yards in the record, 1 crossed" on a correct
drawing. Rewritten with NO gate: every square cloth is assigned to its **nearest** square-mast
station, so the census is exact whatever the shared bias. Rule 2 (headsail census) then counted
the fore royal into the jib suit — the foremast rakes forward, so the royal stood wholly forward
of the bare station — fixed the way rule 6's fifth strike was: a headsail is a `tri` cloth,
square canvas cannot masquerade, gate scales with the hull. **Proofs, all in-page:** a misnamed
yard (`royale`) fires rule 5 exactly once, "4 sails crossed" against 5 declared; a jib deleted
from the drawn model (builder wrapped) fires rule 2 once, "3 drawn" against 4; the OLD gate
re-evaled over today's data reproduces the false positive (6 counted); restored, 25/25 clean.

**Scale anchored to her record.** The drawn stack (heightM 26/29/25 with the 0.60/0.50 fidded
proportions) put the card at 52.5 m deck to truck against RMG's attested 47 m main mast, and the
drawn sail area's 2,980 m² "match" of her record's 2,976 was the oversized rig compensating for
the stunsails the model does not draw. heightM now 23.2/25.9/22.3 (ratios kept): card prints
**46.9 m**, drawn area **2,463 m²** of the record's 2,976 — the honest gap is the studding-sail
set, logged as **B10** in MODEL-GAPS. The serif-webfont false-RED fired once on globe-default
(1.016%, diff pure text labels) and was 0.000% on rerun — the class stays open, still queue.

**Frames: 37 → 39** (ship-clipper, aboard-clipper; both looked at before committing; the
aboard note carries the era-5 warning — a wrong-era voyage hash still hangs before first
paint). Ratchet run foreground; ⚠ new procedural lesson: the per-frame harness wipes `_diff`
as well as `_current`, so a BATCH of nine wipes the earlier movers' diffs — classify each mover
from its own solo re-run, immediately.

**Rule 0, written:** ship-clipper reads as a rendered world. Three facts a viewer can read off
it: a long black composite hull with copper below and a clipper bow, dwarfed by her own rig;
five yards crossed on every mast with royals atop, four jibs running to the fore topmast head
and the spanker standing over the counter; two white deckhouses on a flush deck, the wheel open
right aft. Off aboard-clipper: the wool run's card — 30°13′S 38°01′W, course 018°, force 2 —
over a ship leaving a real wake.

### Next, in order
1. Carried: serif-webfont decision (globe-default false-RED class, fired again this round);
   featureless brown land behind aboard-yamato; Titanic remainder; r43's plate gaps (corbita
   era plate; dugout/dhow/cog plates; a globe-era-card frame); wrong-era voyage hash hang.
2. A galley action stays unblocked (r50): Salamis, Lepanto, Myeongnyang are campaign-data
   tasks.
3. **B10 if wanted:** stunsails as a builder feature — the clipper's missing ~500 m² is the
   set her passages were famous for; applies to Preussen-class rigs too.
4. The survey queue proper is exhausted twice over; next-crudest without a dedicated round is
   **ship-of-the-line (3,100 tris/m)**, but she was the verified reference hull — the detail
   gaps in SHIPWRIGHT-QUEUE §"Detail gaps" (head/beakhead, stern furniture) are worth more.

**End-of-round deploy note: LIVE, stamp 1786139194 → 1786142761**, verified with a cache-busted
fetch of the data-version meta tag; the live hull.js confirmed carrying the slack factor and the
live vessels.json the clipper's yard lists and 23.2/25.9/22.3 masts. Fifteenth clean
push-triggered deploy in a row.

---

## Rounds 52–54 — 2026-08-07 — RECOVERED LOG: three commits that never wrote their handoff

These three rounds committed, deployed and moved baselines but did not append to this file, so
the queue below carried no record of what they closed. Reconstructed from the commit bodies and
FRAME-LOG; the next section's status marks are the durable result. *Do not repeat this omission
— a round that does not write its handoff forces the next worker to re-derive the state of the
queue from git archaeology, which cost this round its first hour.*

- **Round 52 (`0808530`) — items 2, 3, 4, 5.** Era cards rewritten from 2,939 to 14,971
  characters with four record rows per era, naming the polities and companies that drove each
  era's shipbuilding; the three constructions August quoted are gone. The era-card/date-card
  overlap was a hard-coded `--card-top: 150` fallback meeting a readout that actually starts at
  66; measured now. Shipwright headings renamed to "History and service" / "Measurements and
  sources" / "Performance under sail and power". Boarding a ship now opens the voyage's own
  card beside the slip (`showVoyageCard` extracted, not copied). Also corrected round 51's sail
  mirror: negating the belly at the top of the loop pushed the crease/roband/slack terms back
  through the plane and the cloth crumpled; the mirror now happens once at the vertex.
- **Round 53 (`965b33c`) — items 6, 7.** The Sea view's scene contained zero light objects —
  every ShaderMaterial surface carried the sun as a uniform, so the omission was invisible
  until MeshStandardMaterial hulls resolved to black. A key and hemisphere light now derive
  from the same `sunVector(S.month)` the water uses. Consorts got independent station-keeping:
  two incommensurate periods per axis, phased by hull index, driven by `clockS()`.
- **Round 54 (`8bc24de`) — items 8, 10.** Eight colonisation voyages added (madagascar,
  columbus2, saovicente, legazpi, jamestown, mayflower, capecolony, firstfleet — vinland and
  middlepassage already existed), same schema as the existing 62. The wake's straight lines
  were three `step()` calls, not a texture seam; every edge is now a smoothstep sized from the
  beam, the band starts at the stern, the arms hold 19.47°, and transverse crests at
  λ = 2πV²/g were added. Verified on aboard-clipper.

---

## Round 55 — 2026-08-07 — Item 1 closed: the fleet seen from ahead, and a bearing the URL can name

**The task the queue actually left open.** Round 52 wrote "NOT YET CONFIRMED FROM AHEAD" on the
sail mirror and round 53 confirmed only preussen, from one low bearing. Item 1 names five
vessels and two bearings. All ten are now looked at: **ship-of-the-line, clipper, preussen,
east-indiaman and carrack, each from dead ahead (b=0) and from the quarter (b=135), and every
one carries her canvas forward of the masts.** From ahead the cloth hides its own yard and mast
— the masts appear only in the tier gaps and above the royals, with yardarm tips at the sail
corners; from the quarter the masts stand nearest the camera with the cloth bellied away beyond
them, which is the exact reverse of the aback fault. The clipper and preussen show their head
suits edge-on from dead ahead as a thin white line down the centreline — correct, that is what
fore-and-aft canvas does at that bearing. The small bar mid-topsail on the ship of the line is
the top platform standing proud of the near-flat head region of the sail behind it — the belly
grows head-to-foot, so at platform height the cloth is close to the mast plane. Also physical.

**The new grammar: `#b=<degrees>` names the bearing a ship is seen from,** on her own compass —
0 ahead, 90 abeam, 135 the quarter, 180 astern. The Shipwright's camera never moves; the ship
turns under it, so the bearing resolves to `shipSpin = lon + π/2 − b`. ⚠ **The first
implementation was 27° off from a formula that was itself correct**, and the cause is a class
this codebase already knows: app.js computed the spin at selection time reading `SW.lon`, but
`swFrame` overwrites `SW.lon = 0.42` every frame and the constructor says 0.9 — the hash was
applied before the first frame ran. State must be resolved where it is owned: app.js now
records only the request (`SW.viewFromDeg`) and swFrame resolves it against the lon it actually
uses. A pointerdown clears the request so the drag keeps the helm.

**One frame kept as the standing guard: `shipwright-ahead`** (ship of the line, `b=0`). Every
square sail in the fleet goes through `makeSail`, so one bow-on baseline catches the whole
aback class if it regresses. The other nine verification captures were looked at and deleted —
ten standing bearings would be maintenance, not coverage.

**Queue status settled** (see marks in the next section): items 1–8 and 10 are done; **item 9
— sourced running metrics on the top-left card — is the next unfinished item**, and it is a
research task before it is a UI task: trade volume and tonnage by era need sources or
derivations, labelled as one or the other, per rule 10. Item 11 continues the survey (steamer,
treasure-ship, steel stern quarter, serif-webfont decision).

**Rule 0, written on `shipwright-ahead`:** it reads as a rendered world — a bow-on ship at
anchorage scale on open water, hulls of her neighbours standing off either side. Three facts a
viewer can read off it: a 74's beakhead and head rails under a bowsprit steeved dead at the
viewer, with the guns run out down both broadsides; five tiers of square canvas bellied toward
the viewer, deeper at the foot than the head, yardarm tips showing at the corners; the fleet
list and the 20-metre scale bar placing her 57 m against the dugout's 9.

Audit 25/25 clean. Frames 39 → 40.

---

## Round 56 — 2026-08-07 — RECOVERED LOG: item 9, the readout learns provenance

Committed (`2395823`, 22:51) and deployed live (stamp 1786167174) but wrote no handoff — the
same omission as rounds 52–54, reconstructed the same way, from the commit body, METRICS.md
and FRAME-LOG. **Item 9 closed in one commit: the top-left card carries running metrics across
time, every figure labelled sourced or derived.**

- **The data**: `web/data/metrics.json` (new, 279 lines) carries the series; the provenance
  record is `Research/METRICS.md` (new), every figure verified against its named source that
  day. Volume: Stopford Table 1.2 spliced with UNCTAD RMT, 1840 (20 Mt) → 2024 (12.1 Gt), with
  the 2023/2024 base revision handled so the displayed series never moves backwards. Value:
  WTO merchandise exports 1950–2022 ($62 bn → $24.9 tn) beside the ICS 2019 seaborne figure
  ($14 tn) — **not the same quantity**; UNCTAD's trade-share row (~80% by volume goes by sea)
  is what lets them share a panel. Fleet (1945 derived from GI Roundtable 25, 2025 sourced from
  RMT), Rome's grain (derived, the centre of Rickman–Garnsey–Mattingly), attested passage times
  (Pliny, Landnámabók, Great Western), voyages per year (DAS, SlaveVoyages), Uluburun's cargo.
- **The display rules** (app.js `updateReadout`): a row shows only inside its window and at or
  past its earliest point, with the point's own year printed beside it — a 2019 number can
  never appear under 1955; each row carries `sourced — <cite>` or `derived — <cite>` beneath
  it; when no series is live the standing line is *"no aggregate record survives"*, which is
  the finding, not filler. Nothing before 1950 for value, deliberately: pre-modern aggregates
  are reconstructions with error bars wider than the numbers.
- **The refusals are in the record too**: Unger's early-modern fleet series excluded because
  the secondary quotations disagree by more than 2× and the paper is paywalled — adding it
  needs the actual paper.
- **Frames**: 21 baselines moved, all readout-text-only diffs, all accepted with one logged
  reason (FRAME-LOG 22:51). Verified on globe-modern: three rows, each with its year and its
  provenance line.

---

## THE QUEUE — August's second list, 2026-08-07. Work these in order.

**STATUS, updated round 57: the second list is WORKED IN FULL. Items 1–10 — 1 verified r55,
2/3/4/5 done r52, 6/7 done r53, 8/10 done r54, 9 done r56 (recovered log above). Item 11's
four named pieces: steamer r45, treasure-ship r46, the steel stern quarter verified settled
r57, the serif-webfont decision decided and shipped r57. The standing vessel survey is the
task again; the carried items live in round 57's "Next".**

**1. THE SAILS WERE ABACK ON EVERY SQUARE-RIGGER — fixed in this commit, verify it.**
`makeSail` clamped the belly to local +z and `rotation.y = PI/2` maps that to hull +x, which
this file defines as AFT. So the canvas sat abaft its yard on every square sail in the fleet,
which is what a sail looks like when it is *aback* — caught on the wrong side, driving the ship
astern. Now negated so it bellies forward, to leeward. **Look at ship-of-the-line, clipper,
preussen, east-indiaman and the carrack from ahead and from the quarter and confirm the canvas
is forward of the masts.** Fore-and-aft sails (`makeTriSail`, `makeQuadSail`) are NOT affected —
they are not quarter-turned, so their belly already goes athwartships to leeward.

**2. ERA CARDS: REWRITE THEM PROPERLY.** They are too short, too thin, and written in the
aphoristic register August has now rejected three times. Banned constructions, quoted from him:
"the ocean stops being a wind field and becomes a distance", "and it works", "it has simply
stopped being the thing that decides". These are not intelligible sentences; they gesture at a
point instead of stating it. Replace with **rich, detailed, Wikipedia-style, objective and
compelling** description — several paragraphs per era, concrete, with names, dates and numbers.
**And cover the SEAFARING SOCIETIES of each era**: which polities, civilisations and companies
were building ships, financing voyages, colonising, and therefore driving the technology —
Austronesian expansion, Phoenicia, Athens, Song China, the Norse, Venice and Genoa, Portugal and
Castile, the VOC and EIC, Britain, the US, Japan, Maersk. Say who was doing it and why.

**3. THE ERA CARD STILL OVERLAPS THE DATE CARD at top left.** `syncPanelInsets()` already
measures readout → slip → card and publishes `--card-top`; the era card evidently is not
honouring it, or is shown by a path that does not call the sync. Find why. ⚠ Do NOT test
visibility with `offsetParent` — it is null for `position: fixed`, which already made one fix
silently inert (round 41).

**4. THE VOYAGE CARD SHOULD BE VISIBLE IN THE SEA CLOSE-UP.** Clicking a ship opens `#psgCard`
but not the voyage's own card. Both should show — the slip for where she is, the card for what
the passage was.

**5. SHIPWRIGHT HEADINGS ARE VAGUE.** "What she was" and "On the record" go. Use descriptive
headings that say what is under them, e.g. "History and service" / "Construction and rig" and
"Measurements and sources". Same register rule as item 2.

**6. SHIPS IN THE SEA VIEW RENDER AS BLACK SILHOUETTES.** See August's second screenshot: at
mid zoom the hulls are flat black cut-outs, not the detailed models. Suspect the token/
exaggerated-scale path draws an unlit proxy, or the material loses its lighting at that range.
Establish which before changing anything.

**7. THE CROSSING-ERA CANOES MOVE IN RIGID PARALLEL PAIRS.** They hold station like a formation
flight. Consorts need independent motion — station-keeping with slack, individual heading noise,
and separation that varies. Remember the standing instruction: these are island-sized pieces on
a board, so exaggerate the motion to read at that scale, but make it plausible.

**8. COLONISATION VOYAGES ARE MISSING FROM THE SEA VIEW.** Add the voyages that carried
colonisation — Austronesian settlement, Norse Vinland, the Portuguese and Spanish Atlantic and
Pacific, the Dutch and English companies, the convict and settler routes, the Middle Passage
(already present as the slave ship — connect it). Same schema as the existing 62.

**9. THE TOP-LEFT CARD SHOULD CARRY RUNNING METRICS ACROSS TIME.** Total volume and value of
seaborne trade by era, and whatever else the model can honestly support — fleet tonnage,
voyages per year, passage times. ⚠ These must be SOURCED or DERIVED, and labelled as one or the
other. A number with no provenance in the readout is worse than an empty readout, and this
project's rule 10 already says "unknown" is a legitimate return.

**10. THE WAKE IN THE CLOSE-UP IS BAD.** See August's third screenshot: a hard straight line
across the water ahead of the ship and another through the middle — a foam texture with a
visible seam, not a wake. This needs to be a real disturbance: bow wave breaking off the stem,
a divergent Kelvin pattern at the right half-angle (19.47°), transverse waves between the arms,
a turbulent foam trail aft that decays, and NO straight edges anywhere. Measure the current
foam field before rewriting it — the seam is likely a UV or a `localMetres` wrap.

**11. And the standing survey continues**: steamer, treasure-ship, the steel stern quarter, the
serif-webfont decision.

---

## Round 57 — 2026-08-08 — Item 11 closed out: the stern quarter was already won, and the serif stops being the machine's

**First, the missing round 56 handoff was reconstructed** (recovered-log section above) — the
same omission as rounds 52–54, found the same way, from the commit body and FRAME-LOG. Item 9
was already closed and deployed (stamp 1786167174); only the record was missing.

**The steel stern quarter (carried since round 27) is settled, by looking, not by fixing.**
Four diagnosis captures through the r55 `#b=` grammar — yamato from the quarter (b=135) and
dead astern (b=180), titanic and the carrier from the quarter — and all three of round 27's
reads are already corrected in the code the fleet runs today: the transom sits in its own
overhang shadow (the r31 counter-flare work), no black sternpost stands proud of a welded
stern (`buildStemGeometry` pulls steel posts one thickness inboard), and the underwater body
is era-dated oxide red, per-ship where the record says so (`buildShip`: Yamato's IJN hull-red,
not Victorian salmon). The item had been carried by inertia through the rounds that fixed it;
what it still needed was exactly what rule 1 demands — the after bearings rendered and looked
at. The diagnosis frames were deleted after reading; the baseline set stays at 40.

**The serif-webfont decision (carried since round 28): DECIDED — vendor, and the candidate was
chosen by measurement.** The false-RED class: with an all-system serif stack (Iowan Old Style
et al.), `document.fonts` had nothing to govern, and a cold-start rasterisation transient
flapped globe-default ~1% in label halos (struck r28, r45, r51). Two OFL candidates were
downloaded (variable weight+italic, latin subset) and A/B'd against the committed
globe-default baseline, per the RGBELoader note's own rule — measured, not judged by eye:

- Literata: 2.701% of pixels moved, mean |Δ| 2.113
- **Source Serif 4: 1.555% moved, mean |Δ| 1.255 — chosen**, visibly the same chart register

Wired as `"Ships Serif"` ahead of the old stack in `--serif` (styles.css `@font-face`,
`font-display: block`), files at `web/data/assets/fonts/source-serif-4/` with OFL provenance
in ASSETS.json, and — the part that closes the class — `markReady()` now refuses a frozen
capture until `document.fonts.ready` resolves, a clause that is no longer vacuous because the
font it waits for is one we serve. **Proof: two cold captures of identical code differ by
0.000% of pixels, mean |Δ| 0.0000.** Residual: the two CJK glyphs on Yamato's card (大和)
still rasterise from system fallback; the halo flap was latin label text, which is now ours
everywhere.

**All 40 baselines moved and all 40 were accepted with the class reason** — range 0.317%
(action) to 2.177% (globe-modern), none BLANK. Four representative diffs read before
accepting: globe-modern (labels ghosted, voyage-list rows reflowed where new letter widths
re-wrapped a name), aboard-yamato (panels only, hull/wake/horizon black), action (tabs, the
battle card, one row of small ghosts at the fleet line), ship-junk (card, fleet list, scale
numbers; the junk herself untouched). Verification ratchet re-run after the accepts: 40/40
green. Audit 25/25 clean. ⚠ Procedural, the r51 lesson sharpened: `accept` consumes the
`_current` from the LAST check, and every solo check wipes `_current` — a batch of forty
checks followed by forty accepts fails on all forty (silently, if you tail the output).
Check-then-accept must be a PAIR, per frame, and the first accept batch of this round did
fail exactly that way before the pairing fixed it.

**Rule 0, written on globe-default in the new face:** it reads as a rendered world — a relief
Atlantic under July light with fleets mid-ocean, not a chart with dots. Three facts a viewer
can read off it: the Middle Passage's 12.5 M people on 36,000+ voyages, sourced to
SlaveVoyages, on the 1590 card; Lisboa and the Spanish Armada standing on the coast of a
composed Iberia; the era strip running from Crossing (70,000 BP) to Containers (1950–2026)
with Ocean Crossing lit.

### Next, in order
1. **The survey is the standing task again.** Per r51: next-crudest is ship-of-the-line
   (3,100 tris/m) but she is the verified reference hull — the SHIPWRIGHT-QUEUE "Detail gaps"
   (head/beakhead, stern furniture) are worth more than her triangle count suggests.
2. Carried: featureless brown land behind aboard-yamato; Titanic remainder (forecastle/poop
   breaks, raked buff masts, funnel buff A/B); r43's plate gaps (corbita era plate;
   dugout/dhow/cog plates; a globe-era-card frame); wrong-era voyage hash (#e=3&f=zhenghe)
   hangs before first paint.
3. A galley action stays unblocked (r50): Salamis, Lepanto, Myeongnyang are campaign-data
   tasks. B10 stunsails if wanted (clipper's missing ~500 m²; applies to Preussen-class too).

---

## Round 58 — 2026-08-08 — The stern was buried inside the ship she was built for

**The task: SHIPWRIGHT-QUEUE "Detail gaps" per r57's pointer — and the first finding was that
the queue file itself was stale.** Item 3 (head and beakhead) claimed "the bow currently ends
in a bare stem"; `buildHead` has drawn the knee, rails, timbers, platform and gammoning for
rounds, gated on the `head:` data field. Marked done in the queue with the lesson: check the
CODE before trusting the list. Item 4 — the stern furniture — was the real work.

**First, the camera had to learn to look at a hull.** The Shipwright's whole-rig framing puts
a 57 m ship in ~250 px, and every close zoom framed the hull behind the bottom panels because
the aim point rides at a fixed 34% of the RIG's height. Three params extend the r55 `#b=`
grammar: **`&z=<dist>`** (the wheel's own SW.dist, set after the selection settles because
swOpen clamps dist ≥ 1.0 as it runs), **`&l=<deg>`** (camera latitude, the drag's own SW.lat),
**`&y=<metres>`** (the height the camera looks AT — resolved in swFrame against the extents it
owns, the viewFromDeg pattern, because lookT is recomputed every frame). What a frame cannot
name it cannot watch; the stern had never been watchable.

**The finding, from the first stern capture ever taken: the 74 showed a bare planked wall.**
The counter flare (`S.transom`, in `surfacePoint` itself) works and she HAS a broad stern —
but `buildStern`'s fitted plate was still sampled at u = 0.985, and the flared skin runs to
u = 1.0. The plate, the five lights keyed to its bounding box and the two gallery half-barrels
all stood up to 0.9 m INSIDE the hull — invisible from every bearing, on every timber transom
ship, for as long as the counter flare has existed. The two pale "horns" at the quarters were
the barrels' ends poking through the skin.

**The rebuild, all off `surfacePoint(u = 1)` — no plate, no second parametrisation.** The
hull's shader-planked end cap IS the transom face (it already carries seams and paint the
plate could not match). On it: stern-light tiers as pale frames + recessed glass + centre
mullion, row widths read off the surface at each row's own height (the counter widens rising,
so the upper tier is wider — the model's own trapezoid); mouldings banding each tier (tagged
'transom', keeping that stage card reachable); a taffrail arc with balusters, rising to the
centre; quarter-gallery drums lofted AROUND the corner line the stern face and topside share —
every edge sampled off the surface, swelling from nothing at the foot (the finial drop) to a
cornice lid, with panes at the same heights as the light tiers, because the galleries were the
same cabins carried round the corner.

**Whether a ship carries stern lights is a fact of the record, so it is DATA:** new
`sternLights` field — 74: 2, East Indiaman: 2, fluyt: 1 (her narrow tuck's pair of small
lights), and deliberately NONE on the cog (1100, unglazed), the 1501 nau, Wyoming's schooner
transom or the clipper's counter. Galleries stay gated on `gunDecks` (74 + Indiaman), storeys
follow the tiers. All three gainers rendered and looked at from astern and the quarter.

**The audit learned the class** (the standing rule: every new fault class becomes a rule):
"stern furniture buried in the hull" — drawn sternlight/gallery geometry must stand at or
abaft `part.planking.x[1]` — plus declared-but-not-drawn for both fields. **Proven by fault
injection in-page**: wrapping buildShip to shift the drawn furniture 1 m forward reproduces
the burial on exactly the three sternLights ships (0.80–0.91 m inboard) and both gallery
ships; sternLights declared on steel Titanic fires declared-but-not-drawn once; restored,
25/25 clean.

**Ratchet: 41 frames (40 + the new standing guard `shipwright-astern`, the 74 dead astern at
z=0.35 l=6 y=7 — every timber transom ship shares buildStern, so one bearing watches the
class).** Two movers, both diffs read before accepting: `shipwright` 0.115% and
`shipwright-ahead` 0.051%, and in both the ONLY moved pixels are neighbouring hulls' sterns
gaining their lights and taffrails — no sea, no rig, no panels. Accepted with the class
reason. The three diagnosis frames were deleted after reading (the r55 rule: verification
captures are not baselines).

**⚠ The serif false-RED class struck an EIGHTH time, and r57's closure is dented.** Solo
globe-default check: 1.078% / mean 0.296 — the label-halo profile — then 0.000% on four
surrounding runs (the batch scored it clean). r57's `document.fonts.ready` gate demonstrably
does not close the whole class. The diff was LOST before I could read it: every solo check
wipes `_diff`, so a transient's diff must be COPIED OUT the moment it appears, before any
further check runs — sharper form of the r51/r57 lesson. Class stays open, unclassified by
image, matched by profile.

**Rule 0, written on shipwright-astern:** it reads as a rendered world — a broad-sterned 74
on open water from dead astern, close enough to read her cabin windows. Three facts a viewer
can read off it: two tiers of glazed stern lights under a taffrail, the upper tier wider
because the counter flares as it rises; quarter-gallery drums at both corners with their
cornices; the guns run out along both broadsides beyond the stern's shoulder, with the fleet
list and 5-metre scale bar placing her against her neighbours.

**Audit 25/25 clean. Frames 40 → 41.**

### Next, in order
1. **Survey continues.** Remaining true detail gaps (SHIPWRIGHT-QUEUE, now corrected): rig
   remainder of item 2 (sheets, tacks, halyards, lifts, topmast shroud sets), item 7 furled
   sails as a state, item 9 wooldings/mast bands/cheeks, item 10's waterway. The r58 camera
   grammar (`#b/#z/#l/#y`) makes any of these verifiable close-up now.
2. Carried: serif false-RED (EIGHTH strike, see above — next flap: copy the diff out
   immediately); featureless brown land behind aboard-yamato; Titanic remainder; r43's plate
   gaps; wrong-era voyage hash hang.
3. Galley action unblocked; B10 stunsails if wanted.

**End-of-round deploy note: LIVE, stamp 1786169817 → 1786176903**, verified with a cache-busted
fetch of the data-version meta tag; the live hull.js confirmed carrying the rebuilt buildStern
and the live vessels.json the three sternLights fields. Sixteenth clean push-triggered deploy
in a row.

---

## Rounds 59–61 — 2026-08-09 — RECOVERED LOG, written round 62

**The handoff was omitted for three consecutive rounds — the same omission as rounds 52–54
and 56, reconstructed the same way, from the commit bodies and FRAME-LOG.** All three rounds
built, deployed and verified; only the record was missing.

**Round 59 (`a0501e3`) — the rig remainder, the daylight theme, and August's eight items.**
Two large pieces in one round. First, SHIPWRIGHT-QUEUE detail-gap item 2 closed: lifts from
every yardarm, sheets and tacks for every course, halyard falls to the rail, futtock shrouds,
rattled topmast shrouds and a light topgallant set from new crosstrees — all led from points
the builder already placed, one merged mesh per category per mast, and buildRigging's last
unlit THREE.Line hairlines converted to lit prism ropeMesh. Second, the palette inverted into
the daylight register of an Admiralty chart — dark ink on buff paper, the ocean dark against a
light ground. The globe lettering deliberately did NOT invert (it sits on water, not page),
and the background needed setClearColor AND scene.background because the sea view renders two
passes with autoClear=false. ⚠ The first attempt set scene.background before scene existed,
which killed boot and returned ZERO frames — a colour change that kills boot looks exactly
like one that did not apply. Also in the round, from August's list: landward() reach 140 →
900 km with the drawn coast compressed into the near field and the TRUE range printed on the
card; containers on the coarse hull (the Sea view had drawn a 400 m box boat bare); the
voyage card unblocked in the close-up (body.in-passage #card was display:none !important);
consorts pooled per track; Shipwright part cards removed, fleet strip chronological, zoom-out
to 26×; the splash subtitle removed and the loading note rewritten. All 41 baselines moved
with the theme and were accepted with the class reason.

**Round 60 (`7f4793b`) — the close-up kept the night theme in three places, and the consorts
were in dead code.** The consorts had been reported done twice; the first fix was added to
psgOpen(), which is defined and never called. The live path is followShip → psgFleet, keyed
by track name, so one hull per voyage was all it could hold. Moved into psgFleet with the
same `together` rule the map uses. The three contrast faults were one class: colours that
never went through the custom properties, so the daylight pass swept past them — .c-prose
cream on paper, #psgCard carrying its own pre-.panel night palette, #voyList receding to
opacity .28 tuned against a dark ground (now .62). Row cells gained the same markdown
emphasis pass as prose, so a *Ming Shi* citation stops printing its asterisks. **Left open,
explicitly: the "Nearest land" row renders its placeholder — the cell is not filled on the
live path.**

**Round 61 (`e343c48`) — four ships, a minifier, and eight things the audit would not let
past.** EVER GIVEN, AZZAM, ENDURANCE, QUEEN MARY 2: hull data, voyages with real waypoints,
prose, Commons plates with licences. The byte budget refused to publish at 8.62 against 8.6,
and the remaining fat was this project's own comments — so docs/ is minified and web/ is not
(a SCANNER, not a regex, because // inside a string is not a comment): 1.71 → 1.19 MB, first
paint 8.62 → 8.14. The audit found eight faults on the new hulls, all from copying an
existing ship — shared polars, wind floors on motor ships, Titanic's cove line on a welded
liner — and one fault was the AUDIT'S: its rig table had no barquentine, so Endurance was held
to a full-rigged ship's polar. Audit 29/29 after fixes. The fleet is 29 hulls now, not 25 —
**the finishing rule's "all 25 hulls" is stale; the number that matters is ALL of them.**

---

## Round 62 — 2026-08-10 — Three cards told the truth at last, and the ninth strike of the label flap was read as an image

**First, the record: rounds 59–61 had no handoff.** Reconstructed above from the commit
bodies and FRAME-LOG, the same recovery as rounds 52–54 and 56. The r61 deploy was verified
live this round (stamp 1786341590 matched docs/ before any work began).

**The "Nearest land" row now fills on the path users take (r60's carry).** The fill shipped
in r59 inside followShip, ABOVE the passageCard() call that creates the card — so
`if (PSGV.card && lw)` was false on every real boarding and the placeholder survived. Same
lesson as r60's consorts: correct code wired to a moment that never exists. The fill moved
into passageCard(), which owns the row; every caller gets it now, and the null cases are
honest per rule 10 — router not ready keeps the dash ("unknown"), a scan that found nothing
prints "none within 486 nm" (the scan's own 900 km reach, derived from LAND_REACH_KM, not a
second copy of the number). Verified on screen: the Great Western's slip reads
"Cobh · 55 nm N" off the Irish coast; the carrier's reads "Tazerka Oil Terminal · 32 nm WSW"
in the Strait of Sicily.

**The wrong-era voyage hash no longer hangs the app (r43's carry).** #e=3&f=zhenghe asked for
a 1415 voyage in AD 500–1400, whose fleet can never contain her; applyHashView's board loop
held __FRAME_READY through 900 retries. The class fix is in applyHash: a voyage names its own
era — the record carries a year, the chapters carry spans, and a derivable era outranks a
contradictory hand-typed one. This also fixes `#f=` with no `#e=` at all, which only ever
worked when the boot default era happened to contain the voyage. Two more gate leaks closed in
the same block: an id in no voyages.json used to take the gate before discovering it could
never clear it (existence is knowable immediately; only the TRACK needs retries), and the
upgradesDone wait's give-up branch stopped rearming with shipSelectPending still true — a
give-up path must release the gate it holds. Verified by rendering #e=3&f=zhenghe: it paints
the treasure fleet in era 4, consort under sail, both cards up.

**The diagnosis frame caught a third fault: "12° 60′ N".** passageReadout floored the degrees
and rounded the minutes separately, so 12.9999° printed as 12° plus sixty minutes. Round ONCE,
in minutes, and derive both fields from the result. Verified: the same position reads
"13° 00′ N 45° 56′ E".

**⚠ THE LABEL FLAP STRUCK A NINTH TIME, AND THE DIFF WAS FINALLY READ AS AN IMAGE — the
"serif transient" story was wrong, or at least incomplete.** globe-default flagged
1.145%/0.337 in the first full run. The r58 rule (copy the diff out before anything wipes it)
was followed, and the picture is not ghosting: the labels are ABSENT — every sea name, port
and battle gone, except one sea-name fragment frozen at the bottom corner, where a mid-boot
camera would have projected it. Three cold probe runs showed the healthy state (451 markers,
10 visible, zero page errors), so the strike is a batch-load race: nothing in markReady()
ever asked whether the label layer had caught up with the camera it projects from. The gate
now requires `labelsSettled` — one completed updateLabels pass with no flight active (or the
deliberate hidden state of the close-up, which is also settled) — on the sea view only,
because the other views never run updateLabels and a gate they cannot satisfy is a hang.
The serif work (r57) stays: the r43 fallback-metrics doubling was real. But the class that
kept striking through the fonts.ready clause now has a mechanism that explains why fonts
could not close it, and a gate aimed at that mechanism. **If it strikes a tenth time, the
first question is whether the diff shows ABSENT labels or MOVED labels — they are different
faults.**

**Ratchet: two full runs.** First run flagged five: globe-default (above, transient, NOT
accepted — the second run scored it 0.000% against the unchanged baseline) and four aboard
frames (carrier, preussen, wyoming, clipper) at 1.0–1.8%, which are the land-row fill where
the port name wraps to a second line and reflows the card — diffs read before accepting: card
text and reflow only, scene untouched. Accepted with the class reason. The seven aboard
frames whose text fits one line moved 0.02–0.04%, under tolerance. Final run: **41/41 green,
globe-default 0.000%.** Audit 29/29 clean, twice (before and after the gate work).
⚠ Procedural: a full 41-frame check now takes ~19 minutes on a loaded machine and outlives
the 600 s tool timeout — run it as a background task writing to a log, and wait on the PID or
the log, not on a sleep.

**Also: build/loop-prompt.md's finishing rule said "all 25 hulls" — stale since r61 made it
29.** Now says every hull, with the count dated.

**Rule 0, written on globe-default in the final run:** it reads as a rendered world — the
July Atlantic in relief under daylight, fleets mid-ocean between composed coasts, dark water
on chart paper. Three facts a viewer can read off it: the Middle Passage's 12.5 M people on
36,000+ voyages, sourced to SlaveVoyages, on the 1590 card; LISBOA standing on the Iberian
coast with a tick to its harbour; the era strip running Crossing (70,000–8,000 BP) to
Containers (1950–2026) with Ocean Crossing lit.

### Next, in order
1. **Survey continues.** SHIPWRIGHT-QUEUE remaining true gaps: item 7 furled sails as a
   state, item 8 anchors catted with cable, item 9 mast bands/wooldings/cheeks, item 10 deck
   camber and waterway. The r58 camera grammar makes each verifiable close-up.
2. Carried: featureless brown land behind aboard-yamato; Titanic remainder
   (forecastle/poop breaks already partly done — check the code first, the r58 lesson);
   r43's plate gaps (corbita era plate; dugout/dhow/cog plates; globe-era-card frame).
3. Galley action unblocked (Salamis, Lepanto, Myeongnyang are campaign-data tasks); B10
   stunsails if wanted.

**End-of-round deploy note: LIVE, stamp 1786341590 → 1786383743**, verified with a
cache-busted fetch of the data-version meta tag; the live minified app.js confirmed carrying
labelsSettled and the passageCard land fill. Seventeenth clean push-triggered deploy in a row.

---

## Round 63 — 2026-08-10 — The fleet learns to stow its canvas, and a stranded round is landed whole

**This round began with 540 uncommitted lines in the tree: a complete furled-sails
implementation (SHIPWRIGHT-QUEUE item 7) built by a session that was cut off waiting for its
frame ratchet — twice.** The 11:13 and 12:00 sessions each started the ~19-minute 42-frame
check, ended their turn to wait for the notification, and the `claude -p` process exited on
turn end, orphaning the check mid-run. The work itself was sound; what it never got was its
verification loop closed. This round closed it: audit re-run, both ratchet passes run to
completion, movers classified from their diffs, built, deployed, verified live.
**Procedural, and it matters for every future round: do not end the turn to wait for a
background check. Hold it open with foreground waits on the PID** (a 560 s python poll per
tool call, repeated), or the session dies and the check runs on as an orphan — which is the
exact collision that overwrote a previous run's captures (see the loop-round.sh note below).

**The work being landed: `buildShip(H, {furled:true})` — the canvas STATE, not a smaller
sail.** A furled sail is a roll of cloth on the spar it is bent to, and `makeFurl` builds it
from three facts: the radius is the sail's own area put back on the spar (a course stows fat,
a royal thin, nothing hand-sized); gaskets pinch the roll at ~2 m intervals so it scallops;
a square sail's harbour stow gathers a bunt at the slings, which is why a laid-up
square-rigger's yards read as cigars. Every rig furls per its own practice, from the same
spar points the set sail hangs on: square sails roll on their braced yards with clews hauled
to the quarters (and the sheets re-led there — a sheet to a set clew on a stowed sail is a
rope to empty air); gaff sails drop the gaff onto a roll lashed along the boom; the
jib-headed topsail comes down entirely, leaving the topmast bare as the harbour photographs
show; a junk eases its halyard and the battens stack onto the boom, cloth pooching between
each pair; lateen and settee brail to their hoisted yard; the crab claw scissors shut about
its tack; staysails gather down their stays; jibs bundle along the bowsprit — the first cut
ran them up the stay and the head rig wore a row of standing cocoons. The roll's material is
its own decision: matching the sail shader's flax NUMBER made the rolls near paper-white,
because MeshStandardMaterial goes through ACES and sRGB and the sail's ShaderMaterial does
not; matched by eye in the same light instead.

**The state is a view choice, so it lives in the view: `&sail=furled` in the hash (applied
inside the selection-settle loop, because the state triggers rebuilds that drain through
swPumpDetail one hull per frame — settled now means "no hull is stale in either detail or
state", or a frozen capture photographs a half-furled fleet), a "Furl sails" toggle in the
Shipwright nav, and the stage-8 card renames itself "Bent on, furled" with the register
August asked for.** Rebuilding the selected hull surfaced a known class a second time: the
fresh object replaced the one the raycast list, shadow flags and stage visibility pointed
at — the consorts-in-dead-code class — so `swAdoptShip` now re-points all per-ship state at
the current build.

**The audit learned the class as five rules, all proven by fault injection by the stranded
session and re-run clean here (29/29, coarse build):** a furled ship wearing set canvas; a
rigged ship whose furled build stows nothing; a furl leaking into the set state; a furl
lying on no spar (yard, stay or bowsprit — deliberately not mast, which is a tall box that
would alibi a drifted square furl); and a junk whose stack failed to drop.

**Ratchet, two full runs to completion. First: 20 movers, every one a Shipwright-view frame
at a near-uniform 0.545%, and the uniformity was the diagnosis — the diffs show ONLY the
swNav strip, arrows shifted left and the new FURL SAILS button, scene pixels untouched.
One outlier read before accepting: ship-steamer's extra 0.03% is the r61 Endurance
fleet-strip cell (1912, sorts between Titanic and Yamato), which only this frame's strip
window reaches — it had ridden UNDER the 0.05% limit unaccepted since r61, and is exactly
the "0.02–0.04%, under tolerance" r62 recorded. A stale baseline can hide inside tolerance
until an unrelated change pushes the frame over; the diff, not the number, says what moved.**
All 20 accepted with the class reason (ship-steamer's names both). Second run: **42/42
green.** New standing baseline `shipwright-furled` — the 74 from the port quarter, stowed —
scored 0.000% against the committed frame in both runs.

**Looked at, per rule 1, three rig families with my own eyes this session:** the 74's yards
carrying scalloped rolls with the bunt swelling at the slings (the baseline frame); Wyoming
showing six bare black topmasts over white lowers, bundles at boom level, the jib bundle
lumping along the bowsprit; the junk close-up showing the batten stack lying above the boom
like a closed blind under a bare pole. Queue corrections from the stranded session stand:
item 8 (anchors, catted, with cable) was already done 2026-08-02 and the entry was stale —
the r58 lesson, check the code before trusting the list — and item 10's camber/waterway
largely exist in `buildDeckGeometry`; what remains there needs a LOOK first, not code.

**Also in this commit: `build/loop-round.sh`'s watchdog now kills the round's whole process
group (`set -m`, `kill -- -$ROUND`) and any escaped `frame_baseline.py check` by name.** The
stranded session's orphaned ratchet had kept writing into the shared `_current` while the
next session's check ran, overwrote its early captures, and crashed its scoring — two
checks must never share `_current`, and the watchdog now enforces the only version of that
this machine can.

**Rule 0, written on shipwright-furled:** it reads as a rendered world — a 74 close on open
water from the port quarter, near enough to read the stow. Three facts a viewer can read off
it: the yards carry rolled canvas pinched by gaskets, fattest at the slings where the bunt
is gathered; the clews are hauled up to the yards' quarters with the sheets led from the
rolls, not from empty air; the stage card reads "Bent on, furled" over the build slider at
frame-first (carvel), with the East Indiaman lying furled astern of her at the same
anchorage.

**Audit 29/29 clean. Frames 41 → 42. Byte budget: first paint 8.15 MB against 8.6.**

### Next, in order
1. **Survey continues.** SHIPWRIGHT-QUEUE remaining true gaps: item 9 mast bands, wooldings
   and cheeks at the hounds; item 10 needs a LOOK at the deck edge close-up before any code
   (camber and the tier waterway already exist in `buildDeckGeometry`).
2. Carried: featureless brown land behind aboard-yamato; Titanic remainder (forecastle/poop
   breaks partly done — check the code first); r43's plate gaps (corbita era plate;
   dugout/dhow/cog plates; globe-era-card frame).
3. Galley action unblocked (Salamis, Lepanto, Myeongnyang are campaign-data tasks); B10
   stunsails if wanted (clipper ~500 m²; applies to Preussen too).

---

## Round 64 — 2026-08-10 — The made mast is bound, and the top stands on its cheeks

**Queue check first: August's second list remains WORKED IN FULL (status written r57), so the
standing survey is the task. SHIPWRIGHT-QUEUE item 9 — mast bands, wooldings and the cheeks at
the hounds — is this round's work, and it is done as a class, not a decoration pass.**

**The model: no single tree yields a lower mast much over half a metre through.** A big ship's
lower mast is MADE — several timbers coaked together — and a made mast must be hooped or it
works apart at sea. So the threshold is the TREE (a drawn diameter past 0.55 m, and the drawn
diameter is `beam × 0.06`) and the binding is a DATED technology: rope wooldings — about a
dozen turns of tarred rope, each pinched between a pair of thin wooden hoops — through the
18th century, shrunk iron hoops from about 1800. The date asked is `S.year`, the depicted
year, which until now only the iron-era ships carried for their plating; it is set on the
four ships in the class (carrack 1500, East Indiaman 1620, ship of the line 1780, clipper
1869), all below the 1890 antifouling switch so the bottom-colour chain is untouched. The
count is a length turned into a count — one binding about every 2.6 m of exposed lower mast,
eight on a 74's main, which is what the contemporary models show. The rings are merged into
one mesh per mast per kind (`ringMesh`, a sibling of `ropeMesh`, built because a fleet of
little cylinders is a fleet of draw calls). Single sticks stay bare — the fluyt, the slaver,
Endurance, and every mast under the threshold.

**The cheeks: the top does not float, and it turned out the old top could not have been
assembled.** `buildTop` drew ONE trestletree and ONE crosstree, both centred, passing THROUGH
the mast. It now draws the real frame: a PAIR of trestletrees along each side of the masthead
(the slot between them is where the topmast heel is fidded), a pair of crosstrees notched
over them, and under it all two cheek knees bolted to the mast's sides — deepest at the
trestletrees, tapering down the mast, which is the shape of the load. Every doubled square
masthead gets two (including the iron-masted steamer and Preussen, in the mast's own livery);
single-tier masts — cog, trireme, corbita — get none, their tops sitting on the hounds of the
pole, so their silhouettes did not move.

**The audit learned the class as six rules, all proven by fault injection:** a made mast left
unbound (disabled the block → 4 ships); binding on a single stick or an iron tube (the r61
copy class, standing guard); rope wooldings depicted past 1820 / iron hoops before 1780
(inverted the era switch → clipper's wooldings and two ships' hoops flagged; the 74 at
exactly 1780 sits on the boundary and rightly does not fire); cheek count per doubled
masthead (disabled cheeks → 9 ships); and every cheek must TOUCH a top from below (dropped
them 6 m → 50 flagged). 29/29 clean before and after, audit synced to web/ and docs/.

**Looked at, rule 1, with my own eyes:** the 74's main masthead close-up — cheek under the
trestletree pair, the doubling between them, woolding groups with their pale hoops down the
made mast; the East Indiaman furled, woolding runs on fore and main; the clipper furled,
thin dark iron hoops and correctly NO pale wooden hoops; the carrack's mainmast. That 74
masthead frame is now the standing baseline **`shipwright-hounds`** (frames 42 → 43). The
three other diagnosis frames were read and deleted, the r57 pattern.

**Ratchet: two full runs to completion, foreground-waited on the PID (the r63 rule).** First
run: 43 frames, 4 movers, every diff copied out and READ — shipwright-furled 0.472% is
dotted ring columns down three masts plus masthead T's and nothing else; shipwright 0.067%
and shipwright-astern 0.136% the same class at line distance; ship-steamer 0.073% is three
masthead T's on her iron masts with NO rings (the ring columns at her frame edge are the
wooden neighbours in the line strip). All four accepted with class reasons. Second run:
**43/43 green, shipwright-hounds 0.000%.** Byte budget: first paint 8.16 MB against 8.6.

**Item 10 got its LOOK, no code, as the queue ordered:** two close-ups of the 74's deck edge
(bow quarter and high-angle broadside, furled). Camber reads — the deck is visibly crowned
with the centreline highlight — and the deck-to-bulwark joint is clean rather than wrong.
What would close the item fully is a stained margin plank at the waterway in the deck
shader: a texture judgement, low priority, not a structural absence.

**Found and NOT fixed this round, recorded so it is not lost: `tag(o, key, extra)` takes
three arguments, and two call sites (crow's nest, tripod crosstrees) pass a FOURTH — a
bespoke `what` text that is silently dropped, so their part cards show the generic mast/top
description.** One-line fix (accept and thread a `what` override) plus the card copy; no
pixels move. Also open: the treasure ship's junk masts at 1.08 m drawn diameter were surely
built up and bound too, but Chinese practice differs — unstayed poles, no hounds, rattan or
iron — and it needs its own research pass, not a copy of the European rule. And the tops the
trireme and corbita wear on single-tier masts predate the evidence; they kept them this
round, unchanged, but a survey round should ask whether they should exist at all.

**Rule 0, written on shipwright-hounds in the final run:** it reads as a rendered world — the
74's main masthead close from the port quarter, sea and consorts behind. Three facts a viewer
can read off it: the lower mast carries banded wooldings at even intervals, each pinched
between two pale wooden hoops; the top stands on a trestletree frame with a cheek knee under
it, the topmast rising through the doubling beside the lower masthead; the fleet list at
right runs from a dugout of 68,000 BC to the ship of the line, with her card giving 57.0 m
and a 59.4 m rig, deck to truck.

**Audit 29/29 clean, twice. Frames 42 → 43, final run 43/43 green.**

**End-of-round deploy note: LIVE, stamp 1786392062 → 1786394381**, verified with a
cache-busted fetch of the data-version meta tag on the third poll (~60 s after push), and
the live hull.js confirmed carrying ringMesh, wooldings and cheeks. Note for the record:
the live stamp BEFORE this push was 1786392062, not the 1786383743 round 63 recorded — a
deploy landed between rounds that no handoff owns. Eighteenth clean push-triggered deploy
in a row.

### Next, in order
1. **Survey continues.** SHIPWRIGHT-QUEUE is now items 1–10 all closed; item 10's remainder
   is one texture judgement (waterway margin plank, low priority). The Round 23 vessel queue
   and the carried items are the work: featureless brown land behind aboard-yamato; Titanic
   remainder (forecastle/poop breaks partly done — check the code first); r43's plate gaps
   (corbita era plate; dugout/dhow/cog plates; globe-era-card frame).
2. Small found faults: the dropped fourth argument to `tag()` (crow's nest and tripod
   crosstrees cards show generic text); treasure-ship mast binding needs a Chinese-practice
   research pass; trireme/corbita tops deserve an existence check.
3. Galley action unblocked (Salamis, Lepanto, Myeongnyang are campaign-data tasks); B10
   stunsails if wanted (clipper ~500 m²; applies to Preussen too).

---

## Round 65 — 2026-08-10 — One hour falls on the whole near field, and the coast stops being paper

**Queue check first: August's second list stands WORKED IN FULL (r57), so the survey's carried
list is the task, and its first entry — the featureless brown land behind aboard-yamato,
carried since 2026-08-04 — is this round's work. It came apart into five classes, every one
measured before it was touched (`Research/probe-land.py`, new, reads the land uniforms and
walks the elevation raster along the sightline inside the live page; `probe-landsea.py`, new,
captures a close-up three ways — as-is, land hidden, sea hidden — to attribute each pixel band
at the waterline to the surface that draws it).**

**Class 1 — three times of day in one frame.** The Ten-ichi-go close-up is night at 132°E:
the local sun is 19° under the horizon (probe: sun.y −0.329, day term 0). The lights already
modelled night — psgStep drops the key to a moonlit level — but the shaders never got the same
model: SKY_FRAG had no hour at all, SEA_FRAG dimmed only its haze TARGET and to 0.10, and
LAND_FRAG multiplied its body to 0.32 AND hazed to 0.10 — so the frame carried a noon sky over
a noon-bodied sea over a near-black coast. **The hour is now one fact: `ATMO.chunk.glsl`
defines the day term and a 0.32 moonlit floor — the light rig's own (hemi 0.55/1.55) — and
sky, sea and ground each apply it once, as the last factor. At day = 1 every factor is
identity, which is why 32 of 43 frames did not move a pixel.**

**Class 2 — bathymetry drove the invented relief.** The detail amplitude differenced raw
raster samples, and at a shoreline texel that measures the land against the SEABED next to
it: 388 m of "variation" on the 121 m headland off Cape Malea, because the Aegean beside it
is 360 m deep (probe, measured). Every sample in the amplitude stencil now clamps to the
beach first — only the land's own movement sets the amplitude.

**Class 3 — the detail faded out exactly where coasts live.** vAmp died over 9–34 km from the
anchor, correctly for GEOMETRY (ring spacing passes 1.2 km near 34 km; displacement past
Nyquist is facet garbage — the low-poly Peloponnese of the first tuning), but the fragment
shaded the same faded number, so every coast past 34 km — Kyushu stands 30–50 km off in the
target frame — shaded the bare 4.9 km raster and rendered as a smooth ramp. The amplitudes
are now split: geometry keeps the 9–34 km fade, shading (`vAmpS`) keeps its ridges to the
60–160 km rim, the sea's own rule — detail the mesh cannot carry arrives as shading. The
hillshade stencil also widens with range (`stepM ≥ dist·0.006`) so the finest octave averages
instead of speckling.

**Class 4 — the detail could redraw the coastline.** `h = e + amp·detail` changes the SIGN of
the ground both ways: seaward it can raise skerries out of open water (the round-12
archipelago, still latent), landward it sank whole foreshores — e of 5–25 m against ±50 m of
detail, clamped flat to the water, which is what cut the drawn coast off above the sea off
Cape Malea. `ldLand()` in LAND_DETAIL.chunk.glsl is now the one place both shaders get their
height: under the sea the detail does nothing, over land the ground keeps at least a quarter
of the raster's own height. The coastline is data; the detail is inference and may not
redraw the data.

**Class 5 — the waterline leaked backdrop paper, and it took three tries to say why.** The
old land discard tested vertex-interpolated height: at 40 km a land triangle spans over a
kilometre, its interpolated zero crosses far from the raster's, and notches of paper opened
at the foot of the Kyushu coast. A per-fragment RESAMPLE (try two) closed those and opened
holes through every steep coastal face instead — a lifted headland's wall hangs over a map
footprint metres wide, so half the wall re-read "sea" and discarded itself. Passing the
pre-clamp height as the varying (try three) cut the bottom 135 m off every coastal ramp —
it interpolates from a deeply negative sea-side vertex and crosses zero far up a wall whose
drawn base the clamp had already put at the water; measured as an unmoving 0.187% band that
survived two shader bundles because none of the tries touched the pixels that mattered.
**The rule that holds: the drawn surface decides what it is, the map decides only where
surfaces exist. The varying is the DRAWN post-clamp height; a fragment is ground if the
geometry drew it above the water OR the raster says the column under it is land; the sea
discards on the same raster from its REST position (`vRest`, new varying — the coastline is
a property of the ground, and sampling at the Gerstner-displaced position dragged it about
with the phase). The two rules partition every pixel; nothing is left to the paper.**

**And one class outside the shaders: the card's land row was a snapshot of a boot race.**
A solo capture of aboard-yamato filled "Kagoshima Ko · 16 nm WNW" while four full-run
captures of identical code left the dash — the row was written once, at card creation, from
whatever state the FINE router happened to be in. `fillLandRow()` now re-asks from the
readout loop whenever the router's key moves (readiness, pyramid level, datum, and her own
position at quarter-degree grain, so a ship under way re-asks about every 25 km) and stops
while the key stands. The dash now means "unknown" about the DATA, never about the schedule.
landward() learned this exact lesson at the raster level in its level-keyed cache; the DOM
row was the same bug one layer up.

**Audit 29/29 clean. No new audit rule: these are frame-level compositing classes the hull
audit cannot see — their standing watch is the baselines themselves (aboard-coast watches
the shore seam and the day-side face, aboard-yamato the night hour and the far-coast
shading, descent-coast the seam from altitude).**

**Ratchet, two full runs to completion, both foreground-held on the PID (r63 rule). First:
43 captured, 4 over limit — aboard-yamato 47.7% (the target frame: hour + coast + land row),
aboard-off 44.4% (night off Sumatra + "Dumai · 24 nm NE"), descent-coast 2.14% (the closed
shore seam is the white ribbon in the diff), aboard-coast 0.19% (the paper band under the
headland, closed) — plus three under-limit frames whose diffs are the deterministic land row
(aboard-cable "none within 486 nm", aboard-titanic, aboard-treasure "Al Mukha · 23 nm W"),
accepted with the movers under the r63 rule that a stale baseline must not ride inside
tolerance. Every diff read as an image before accepting; all seven reasons in FRAME-LOG.
Second run: 43/43 green.** Residue, recorded: ten frames hold identical sub-tolerance
offsets in both runs (largest: ship-preussen 0.047%/0.020, descent 0.043%/0.008, ship-clipper
0.031%) — deterministic precision drift from the recompiled sea/land shaders (a new varying
reallocates registers), not content and not flutter. If descent ever crosses the limit,
its 0.043 base is this offset; read the diff against that.

**Rule 0, written on the new aboard-yamato baseline: it reads as a rendered world — a
moonlit battleship on open water, the coast lying along the horizon. Three facts a viewer
can read off it: the Kyushu coast shows a low shore range in front of higher interior
mountains, two distinct ridge lines; the card and the picture agree the nearest land is
Kagoshima Ko, 16 nm WNW; the frame keeps one hour everywhere — dimmed sea, moonlit coast,
the ship lit at the same floor. And on aboard-coast: the Cape Malea headland now runs
continuously into the water that breaks at its foot, with a lit face and a shadowed flank.**

**Build stamp 1786399633, first paint 8.17 MB against 8.6.**

### Next, in order
1. **Survey continues, carried:** Titanic remainder (forecastle/poop breaks partly done —
   check the code first); r43's plate gaps (corbita era plate; dugout/dhow/cog plates;
   globe-era-card frame).
2. Small found faults: the dropped fourth argument to `tag()` (crow's nest and tripod
   crosstrees cards show generic text); treasure-ship mast binding needs a Chinese-practice
   research pass; trireme/corbita tops deserve an existence check.
3. Galley action unblocked (Salamis, Lepanto, Myeongnyang are campaign-data tasks); B10
   stunsails if wanted (clipper ~500 m²; applies to Preussen too).

**End-of-round deploy note: LIVE, stamp 1786394381 → 1786399633**, verified with a
cache-busted fetch of the data-version meta tag on the second poll (~30 s after push), and
the live shaders.js confirmed carrying atmoBright, ldLand and vRest. Nineteenth clean
push-triggered deploy in a row.

---

## Round 66 — 2026-08-10 — Every era card shows a ship of its own century, and a second stranded round is landed whole

**This round began with ~380 uncommitted lines and ten new files in the tree: a complete
r43-plate-gaps implementation built by the 15:58 session, which was cut off waiting for its
frame ratchet — and a 16:31 session that armed a waiter on the same check and died the same
way. The r63 stranding, repeated exactly, r63's own rule unfollowed: the turn must be HELD
OPEN with foreground waits on the check, never ended to wait for its notification.** This
round landed the work: every piece verified with my own eyes, audit run, both ratchet passes
run to completion foreground-held, built, deployed, verified live.

**The work being landed — the r43 plate gaps, all three, closed as a class:**

- **Five Commons plates with licences**, each looked at against its caption this round: the
  Pesse canoe (`dugout`, CC BY 3.0 — the oldest boat ever recovered, and the caption owns the
  60,000-year gap to the Sahul crossings), the Torlonia relief (`corbita`, PD — no Roman
  merchantman survives whole, and the caption says the type is known from reliefs, mosaics
  and wrecks), Jewel of Muscat (`dhow`, CC BY-SA 3.0), the Bremen cog (`cog`, CC BY-SA 4.0)
  and the Khufu ship (`khufu-ship`, CC BY 3.0). `fetch_images.py` gained an attribution-party
  mechanism: Commons' empty Artist field does not mean unknown author — the Jewel of Muscat
  names its photographer in free-text Credit, the Pesse file is the Drents Museum's own
  collection image — so a third tuple element records the party a human read off the file
  page, and 'unknown' in a credit line is reserved for authorship nobody has.
- **The era-plate table told the truth about time.** `ERA_PLATE` sent Crossing to the
  voyaging canoe (3000 BC in a 70,000–8,000 BP era) and Reed & plank to the corbita — the
  card said "8000–1000 BC" over a Roman ship of AD 200. Now Crossing → the Pesse dugout
  (on the era's own boundary, caption owning the gap) and Reed & plank → the Khufu ship
  (2560 BC, inside the span). Every era plate now lies inside its era.
- **The era card is state: `&card=era` joins the hash grammar** (read-only, the `b=`/`z=`
  pattern — writeHash never emits it), applied after era and year so the card describes the
  era the hash lands on. `showEraCard()` extracted from selectEra's fly branch, which was
  the only path that ever showed the card — which is WHY no frame could watch it. New
  standing baseline **`globe-era-card`** (frames 43 → 44).
- **Four vessel cards had shipped plateless since r43 — dugout, corbita, dhow, cog — and
  looked deliberate**, because the card's onerror removes the figure. A three-prong gate in
  `build_site.py` now fails the build on any vessel without a plates.json entry, any
  ERA_PLATE slug without one, and any entry whose jpg is missing (the stranded session
  proved all three prongs by fault injection; the gate passed clean on this round's build,
  31 plates).

**The carried Titanic remainder is CLOSED — stale entry, the r58 lesson a third time.**
Checked the code before trusting the list: `buildRaisedEnds` (hull.js) draws the
three-island profile — 128 ft forecastle, 550 ft bridge house, 106 ft poop, two well decks,
ends DERIVED from the record so the breaks stand at the record's stations; masts wear the
White Star funnel buff (`mastLivery`); funnels rake the record's 9.46°. The r34
aboard-titanic baseline has been watching all of it.

**Verification, all of it this round:** audit 29/29 clean (`run_audit.py`). Ratchet run 1:
44 frames — `globe-era-card` NEW, read as an image (card, rows, Khufu plate with credit,
prose, no date-card overlap); two movers, both diffs read: ship-dhow 2.401% is the card
gaining the Jewel of Muscat figure with prose reflowed, scene untouched; ship-dugout 0.269%
is one heading strip where the Pesse figure's top edge pushes "History and service" below
the card's clamped fold. All three accepted with class reasons in FRAME-LOG. Run 2:
**44/44 green, globe-default 0.000% — no label flap this round.**

**Rule 0, written on globe-era-card:** it reads as a rendered world — the July Atlantic in
relief with a museum ship on a card standing over it, dark water on chart paper. Three facts
a viewer can read off it: the Uluburun cargo carried 354 copper ingots (10 t) and about a
tonne of tin, c. 1320 BC; the Khufu ship is 43.6 m of cedar in 1,224 pieces with no keel and
no frames, sewn with rope, buried about 2560 BC; Bronze Age hulls were built shell-first,
mortise-and-tenon or sewn, in the era running 8000–1000 BC on the lit strip.

**Audit 29/29 clean. Frames 43 → 44, final run 44/44 green. Byte budget: first paint
8.17 MB against 8.6, docs/ minified 1.76 → 1.21 MB.**

### Next, in order
1. **Survey continues.** The carried list is now: treasure-ship mast binding (needs its own
   Chinese-practice research pass — unstayed poles, no hounds, rattan or iron, NOT a copy of
   the European woolding rule); trireme/corbita tops existence check (they predate the
   evidence); the dropped fourth argument to `tag()` (crow's nest and tripod crosstrees
   cards show generic text — one-line fix plus card copy).
2. Item 10 remainder: waterway margin plank in the deck shader — a texture judgement, low
   priority.
3. Galley action unblocked (Salamis, Lepanto, Myeongnyang are campaign-data tasks); B10
   stunsails if wanted (clipper ~500 m²; applies to Preussen too).
