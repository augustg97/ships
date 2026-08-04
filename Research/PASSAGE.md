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
