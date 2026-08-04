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
