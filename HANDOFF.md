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
