# The Shipwright — quality queue

Working list for the `/loop` raising the Shipwright to the reference bar. Each item gets
**verified by rendering and looking**, not by checking the code says the right thing.

## Errors found by looking (round 1)

| # | Ship | Error | State |
|---|------|-------|-------|
| 1 | Chinese junk | battened lug swung athwartships → sail passed through the hull | **fixed** |
| 2 | all fore-and-aft | `makeSail` applied the square-sail quarter-turn unconditionally | **fixed** |
| 3 | Chinese junk | canvas positioned by its centre at deck level → half below the waterline | **fixed** |
| 4 | voyaging canoe | crab-claw spars converged at the top — an inverted V | **fixed** |
| 5 | carrack | dhow's hull-length-yard rule applied to a lateen **mizzen** → mizzen bigger than the mainsail | **fixed** |
| 6 | every square rig | yards slung at 0.94 of their own segment → two-storey hole between deck and lowest sail | **fixed** |
| 7 | voyaging canoe | card says **double hull**; only one hull is drawn, and no crossbeams or platform | **OPEN** |

## Still to verify by rendering

trireme · Roman merchantman · sewn-plank dhow · treasure ship · cog · caravel · fluyt ·
east indiaman · slave ship · clipper · steamer · container ship

Round 1 verified: junk, voyaging canoe, carrack, ship of the line.

## Detail gaps against the reference bar

Ordered by how much each closes the gap per unit of work.

1. **Guns run out through the ports.** The ports are shader-drawn; there is no barrel. On a
   two-decker this is the single most obvious absence.
2. **Running rigging** — braces, sheets, tacks, halyards, lifts. The model has standing rigging
   only, and the references are a cobweb of running gear. Biggest single visual delta.
3. **Head and beakhead** — headrails, gammoning, the beakhead platform. The bow currently ends
   in a bare stem with a bowsprit stuck through it.
4. **Stern** — transom, quarter galleries, stern lights. Currently the hull simply stops.
5. **Ratlines as ladders.** They are `THREE.Line` segments; at close range they read as wire.
   Thin geometry instead.
6. **Plank seams and fastenings on the hull surface** — the shader draws strakes but no butts,
   no treenails, no caulking line.
7. **Furled sails** as a state, so a ship can be shown under bare poles or with courses handed —
   the references mostly show furled canvas on the yards.
8. **Anchors** catted at the bow, with cable.
9. **Mast bands, wooldings and the cheeks** at the hounds.
10. **Deck camber and a visible waterway** where the deck meets the frames.

## Rules this view is held to

- Every part carries its own `userData.part` — name, function, build stage. **No second list of
  labels**; the geometry is the source.
- Detail is generated from the same vessel spec and the same `surfacePoint()` as the globe token
  and the Yard silhouette. More members and finer tessellation is **detail**; a second set of
  dimensions would be **drift**.
- Capability figures in the panel come off the polar diagram the routing engine uses. If the
  panel is wrong about a ship's sailing, the ocean crossing is wrong too.
