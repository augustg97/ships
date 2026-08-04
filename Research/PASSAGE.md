# The Passage — a ship at sea, in her own place

Added 2026-08-04. Reached by clicking a hull on the globe.

## What it is

Three views existed and none of them showed a ship at sea. The Sea shows the ocean as a planet
and the fleet as pieces on it. The Shipwright shows one hull as an object on a stage under a
photographer's light. The Action shows a battle as a diagram of intent. The Passage shows the
thing the project is about: a real hull, at her real size, in the water she is actually
crossing, at the position she has actually reached, on the course she is actually steering.

Everything in it is read from the model rather than arranged:

| what | where it comes from |
|---|---|
| position, course | `stepEraFleet` — the same arithmetic that places the piece on the globe |
| sea state | the shipped monthly wind climatology, at her own position and month |
| waves | `SEA_WAVES` in `sea.js` — the same table the Shipwright and the buoyancy use |
| sun | `sunVector(month)`, brought down into the local tangent frame |
| the horizon and any land in sight | the globe itself, rendered as the backdrop |
| the hull | `SHIPS_HULL.buildShip(hull, {fine:true})` — the Shipwright's own model |

## The two-scale problem

The globe is 100 units for 6371 km, so a 72 m hull is 0.0011 units and 0.1 m of planking is
eleven million times smaller than the sphere. float32 in the vertex pipeline cannot hold that.

Two scenes, two cameras, one frame:

1. the globe at planetary scale, camera placed at the equivalent position — supplies horizon,
   distant water, coast within sight;
2. `renderer.clearDepth()`;
3. a metre-scale scene with the sea patch and the ship, near plane 35 cm.

The cameras are locked by `globeCam.matrix = anchor.matrixWorld * psgCam.matrix`. One multiply,
so they cannot drift.

## Faults found building it, each now a rule

- **A throw inside the frame callback kills the loop.** Reaching for a `canvas` identifier that
  is a local const in the setup function threw before `armNext()`. Symptom: black globe with
  working panels — which reads as a broken shader and is not one. The file already carried this
  warning ten lines above where I wrote the bug.
- **`floatShip` RETURNS pitch and roll; it does not apply them.** Reading only `position.y` gave
  a ship that heaved and never leaned.
- **The waterline is not y = 0.** The Shipwright raises the SEA to `keelBottom + draught`; here
  the sea cannot move, so the ship comes down by the same amount, from the same two numbers.
- **A uniform grid is the wrong mesh for water.** 340×340 over 14 km is 41 m per vertex: the
  118 m swell gets three samples and the other three components do not exist. Radial rings
  growing geometrically put ~2 m at the hull and 400 m at the rim.
- **The camera's aspect was never set.** Built at 1, rendered into 1.49 — every frame stretched,
  which reads as "too close" and is not.
- **Fit the bounding SPHERE about her centre, not the box.** A junk's masthead is 13 m nearer
  the eye than her middle, so it projects 11% larger than the height sum predicts. Two framing
  attempts failed on this before the third measured projected NDC instead of trusting algebra.
- **Map labels are labels on a map.** Projected from a camera 40 m above the water they wrote
  NORTH ATLANTIC OCEAN across the sky.

---

# The handedness bug that put ships in orbit  (2026-08-04, round 9)

August: *"some of our ships are literally floating in space."* Screenshots showed consorts
hanging off the limb of the globe and hulls heeled at impossible angles.

## One cross product, three sites

Every object on the globe needs the same frame: Y along the radius, Z along the way it is
pointing. Written by hand it is one line, and it was written three times:

| site | X axis | det |
|---|---|---|
| era fleet | `fwd × up` | **−1** |
| voyage wake | `(up×fwd) × up` | **−1** |
| campaign fleet | `up × fwd` | +1 — correct all along |

A left-handed basis is a **reflection, not a rotation**, and `Quaternion.setFromRotationMatrix`
does not check. It returns a perfectly valid unit quaternion that is not the transform asked
for. Measured: the group's Y came out **100° off the radius**.

A ship at local (0,0,0) still landed in the right place, which is why single hulls looked fine
for eight rounds. But every consort's tangent-plane offset was rotated into the RADIAL
direction:

```
Magellan and Elcano — consort altitudes
  +1250.7 km      (in orbit)
     +1.2 km      (the flagship, correct)
   −645.6 km      (inside the Earth)
```

There is now one `tangentBasis(up, fwd)` in app.js, right-handed **by construction**. The sign
that falls out of X × Y = Z is that **X points to PORT, not starboard** — and naming the
variable `right` is exactly how the wrong sign got written twice.

The Passage's own frame `(east, up, north)` was left-handed for the same reason. It did not
scatter anything, because the backdrop camera is derived from the same anchor and the two stayed
consistent — **a mirrored world that agrees with itself, which is the hardest kind to see.**

## Two more faults in the same class

- **A consort's station is on the sphere, not on the tangent plane.** At token exaggeration one
  ship-length is ~210 km of ocean, so 5 lengths abeam put a consort 1,000 km out along a plane
  the Earth had already curved away from. Stations are now dropped onto the sphere by the
  sagitta, in `stepEraFleet`, because the scale changes with the camera.
- **The horizon is not at 90°.** From distance d the visible cap is `acos(R/d)` — at d = 200
  that is 60°. Ships beyond it were still drawn, at token size, projecting onto the disc as
  though they belonged. Same threshold the chart lettering learned in round 2.

## Verified

| | before | after |
|---|---|---|
| worst hull altitude, 8 eras × 4 zooms, 112 hulls | +1,250 km | **3.1 km** |
| tracks whose Y is not the radius | 14 of 14 | **0 of 14** |
| helper determinant | −1 | **+1** |
| cull fires on an antipodal ship | n/a | **yes** (and passes one underfoot) |
| course 090 / 000 / 180 / 270 in the Passage | — | **east / north / south / west** |
| Passage sun vs globe sun, reprojected | — | **dot = 1.0000** |

---

# The descent: one continuous zoom from orbit to sea level  (2026-08-04, round 10)

August: *"We need a simulated ocean with simulated ships on a global scale."*

There were two views and nothing between them. The globe stopped at 765 km, where a 42 m hull is
0.077 of a pixel and the token has to be about 1,600 times life size. The Passage jumped straight
to 100 m off a hull. The gap was the whole ask.

## What makes it continuous

| | |
|---|---|
| **the wheel zooms ALTITUDE, not radius** | S.dist is measured from the Earth's centre, so an 11 % step near the surface is 11 km — one click went from 765 km through the atmosphere to the seabed. Scaling height above the ground gives ~40 even clicks across four and a half decades. |
| **the exaggeration unwinds** | geometric ramp on log altitude: full token above 300 km, unity at 8 km. Verified 4,437× → 1.0×, monotone, with the steamer's drawn length going 435 km → 98 m. |
| **the near field anchors under the CAMERA** | same scene, same water, same wave table as the Passage. Only the anchor changes. |
| **the aim walks out to a depression angle** | nadir from orbit, 11° near the water, so the horizon sits 6° inside the top of the frame. Aiming at the horizon itself put everything within a few km forty degrees below the bottom of the picture. |
| **the water curves** | each ring of the radial mesh drops by the sagitta, so the surface leaves the eye line at the true horizon and hands off to the globe backdrop there. A flat 260 km disc hides 5.3 km of Earth. |

The handover is at **8 km for both the water and the fleet, and it has to be**: the near pass
clears depth, so anything left in the globe scene is buried behind the water regardless of where
it is. Ships cannot cross at a different altitude from the ocean.

## ⚠ The near plane was a fixed 63.7 kilometres

`camera.near = 1` unit, and a unit is 63.7 km. Invisible for eight rounds, because the camera
could not get within 765 km of the surface. The moment the wheel could descend, the entire planet
fell inside the near plane and the globe rendered **black**.

It was found by the `descent-high` baseline **on its first capture** — a frame placed deliberately
on the far side of the handover, on the principle that a boundary cannot be watched from one side
of it. This project has paid twice for green ratchets over unwatched geometry (the trireme's oars,
the container ship's funnel); this is the first time the lesson paid back.

## The camera is URL state now

Four and a half decades of altitude and the whole surface of the Earth could not be addressed by
`v=sea`, so the descent could not be captured at all.

```
#c=<lon>,<lat>    where to stand
#z=<metres>       how high above the water
```

## Verified

- exaggeration ramp monotone across 38,000 km → 500 m, exactly 1.0× at and below the handover
- 17 baselines at **0.000 %** — the descent is entirely additive above 8 km
- both new frames non-blank (variance 2491 and 2723 against a floor)

---

# Driving it, rather than testing the code that drives it  (2026-08-04, round 11)

The descent was verified by assigning `S.dist` in the console. That tests the arithmetic and not
the app. Driving the actual wheel and the actual pointer found three things the arithmetic could
not.

## 1. The measurement was against a stale page

The browser tab was serving a cached `index.html` from an earlier stamp, so `setCameraDepthRange`
was `undefined` and I spent a diagnosis chasing a black band that the current build did not have.
**Cache-bust the PAGE, not just the stamped script query** — the stamp is on the scripts, and it
is the document that goes stale.

## 2. lookAt degenerates when up is parallel to the view

Setting `camera.up` to the local radial while the view is still near-nadir makes up and forward
almost exactly antiparallel, the cross product collapses, and the frame renders black. Screen-up
now blends with the same `tilt` that swings the aim: world Y while the view is a map from above —
which is bit-for-bit the old behaviour, so the four globe baselines do not move — and the local
radial once the view is a horizon. |up · forward| stays under 0.2 at every altitude.

Verified by driving the wheel from the top: **100 % lit from 2,944 km to 670 m**, no gap at the
handover.

## 3. The drag gain has now been wrong three times, each for a new reason

| version | model | why it failed |
|---|---|---|
| 1 | divide by `S.dist` | measured from the Earth's CENTRE, barely changes near the surface |
| 2 | altitude, floored at 0.03 | the floor dominated the last three decades: **930 m of ground per pixel** at 700 m |
| 3 | metres-per-pixel from altitude | right for a NADIR camera; out by 1/sin(depression) once tilted — measured **5× too slow**, and 1/sin(11°) = 5.24 |

Three analytic models, three failures, each correct about the thing it modelled and blind to the
next term. So it stopped being modelled: **grab the ocean and pull it.** Raycast the cursor onto
the sphere at pointer-down, raycast again on every move *through the camera as it was then*, and
rotate by whatever takes one to the other. Exact at every altitude, tilt, latitude and field of
view without knowing about any of them.

Measured against an independent yardstick (two screen points projected onto the sphere):

| altitude | error |
|---|---|
| 700 m | **0 m** |
| 1.5 km / 5 km | 1 m |
| 20 km | 4 m |
| 100 km | 21 m |
| 1,000 km | 2.1 km (0.2 %) |

⚠ **And iterating it to chase the high-altitude residual made it worse** — 700 m went from 0 m to
643 m. `placeCamera()` swings the AIM as well as the position, so the map being solved is not the
near-identity the iteration assumes and it oscillates. The single step stays. The residual it
leaves is at globe zoom, where nothing is aimed at more precisely than a continent.

---

# Four faults, and following a ship instead of leaving the map  (2026-08-04, round 13)

## The ships on land were the CONSORTS, and my verification could not have seen them

I verified 72,768 samples on the great-circle track and 112 hulls at one phase per zoom. Swept
across **200 phases of every track in every era**, the real figure was **11.45 % of drawn hulls
ashore — 641 of 5,600** — and every one was a consort, never the flagship.

A track is a curve; a fleet is an AREA. The search puts the flagship in open water, and a consort
is stationed abeam of it — at token exaggeration one ship-length is about 200 km of ocean, so a
formation that reads correctly in the Pacific puts her wingmen inland in the Yellow Sea.

The fix is what a real fleet does: **when the sea-room narrows, a squadron closes up.** Each
station is tested against the mask and drawn in toward the flagship until it is afloat; with no
room at all she takes station astern in the flagship's own water.

⚠ And it only worked after refreshing `grp.matrixWorld` — three.js updates it at render, so the
first version tested each consort against where the fleet was LAST frame and left 3.1 % ashore.

**0 of 5,600 now.** The formation closes up 641 times where the water requires it — Zheng He's
fleet 161 times through the Indonesian straits.

## Every ship in the model was sailing at six knots

`ves.polar.best` does not exist. The polar is a CURVE — a dict of wind angle to speed — so the
read returned undefined, fell through `ves.speedKn` (also absent) and landed on the literal `6`
for all twenty-five vessels. The comment above it said *a clipper crosses while a cog is still in
the Bight*, and no clipper had been faster than any cog since the line was written.

**A fallback that fires every time is not a fallback; it is the value.**

## And the pace came from the number of waypoints

`period = n * 26 / kn * 34` — proportional to how many POINTS a track happens to have. Survivable
when the router emitted one point per degree; the passage search emits corners, so the counts
changed and every voyage silently re-timed. Measured, implied speeds ran **3,400 to 23,000 knots**
and circuits took 15 minutes to 2 hours, which is why the fleet looked painted on.

Now: distance over speed, compressed by one stated constant. Circuits are 1.7–7 minutes and the
ratios are real — the box boat covers 39,377 km in 2.2 min while the canoe takes 5.0 min for
26,990 km.

⚠ **And ten hours per second is absurd from two kilometres off.** Following a ship, she covered
575 km in four seconds. Time now descends with the camera: 10 h/s at map scale easing to about
sixty times real time alongside, where a treasure ship makes 4.9 knots. Measured after: **15
apparent knots** — visibly under way, and the coast changes without being a blur.

## The washed-out sun, measured

| sun·n | before | after |
|---|---|---|
| > 0.8 | mean 143, **sd 27.9** | mean 131, **sd 31.0** |
| elsewhere | sd 36–38 | sd 39.5–43.5 |

The sub-solar region was 50 % brighter with a quarter LESS contrast — the shoulder compressing
exactly where the light is. Exposure 1.34 → 0.98 so the lit side sits on the steep part, plus an
S-curve about mid-grey. Dimmer and more contrast at once.

## Following is a camera mode, not a separate view

Clicking a hull used to open the Passage — its own scene, camera, card, and a cut. What was
wanted is simpler: **the map goes down to her and stays with her.** The near-field water and the
true-scale fleet already existed for the descent, so following costs one camera mode: the aim
becomes the ship, drag walks round her, the wheel changes how far off you stand, and the terrain
changes underneath because she is genuinely moving across the real globe. Zoom out far enough and
she is released — no button to find.

⚠ `stepFly` reads `fly.ms` and a `performance.now()` epoch. Hand-building the flight with `dur`
and `clockS()` makes `(now - t0)/undefined = NaN`, which propagates into `S.dist`, the camera and
every downstream measure — and presents as a **null altitude, not an error**. Use `flyTo`.
